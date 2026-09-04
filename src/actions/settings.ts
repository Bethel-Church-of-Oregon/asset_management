'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { USER_ROLES, assets, buildings, departments, users } from '@/db/schema';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { isUniqueViolation, uniqueViolationConstraint } from '@/lib/db-errors';
import { USERNAME_RULE_TEXT, cleanUsername, isUsername } from '@/lib/username';
import { type FormState, readField, toErrorMessage, zodToFieldErrors } from './types';

const lookupSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]$/, '코드는 숫자 또는 영문 대문자 1자리입니다.'),
  name: z.string().trim().min(1, '이름을 입력하세요.').max(100),
  sortOrder: z
    .string()
    .trim()
    .transform((v) => (v === '' ? '0' : v))
    .pipe(z.coerce.number().int().min(0).max(999)),
  isActive: z.coerce.boolean().optional(),
});

type LookupTable = typeof buildings | typeof departments;

async function upsertLookup(
  table: LookupTable,
  formData: FormData,
  label: string,
): Promise<FormState> {
  try {
    await requireAdmin();
    const parsed = lookupSchema.safeParse({
      id: formData.get('id') || undefined,
      code: formData.get('code'),
      name: formData.get('name'),
      sortOrder: formData.get('sortOrder'),
      isActive: formData.get('isActive') === 'on' ? true : undefined,
    });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }
    const { id, code, name, sortOrder } = parsed.data;
    const isActive = formData.has('isActive') ? formData.get('isActive') === 'on' : true;

    if (id) {
      await db.update(table).set({ code, name, sortOrder, isActive }).where(eq(table.id, id));
    } else {
      await db.insert(table).values({ code, name, sortOrder, isActive });
    }

    revalidatePath('/settings');
    revalidatePath('/assets');
    return { ok: true, message: `${label} 저장되었습니다.` };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { code: '이미 사용 중인 코드입니다.' } };
    }
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function saveBuildingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return upsertLookup(buildings, formData, '건물/위치가');
}

export async function saveDepartmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return upsertLookup(departments, formData, '사역원이');
}

/**
 * Lookup rows referenced by an asset are deactivated rather than deleted —
 * deleting one would orphan the digit inside every asset number that used it.
 */
async function removeLookup(
  table: LookupTable,
  column: typeof assets.buildingCode | typeof assets.deptCode,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const id = Number(formData.get('id'));
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: '잘못된 항목입니다.' };

    const [row] = await db
      .select({ code: table.code })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    if (!row) return { ok: false, error: '항목을 찾을 수 없습니다.' };

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(eq(column, row.code));

    if (count > 0) {
      await db.update(table).set({ isActive: false }).where(eq(table.id, id));
      revalidatePath('/settings');
      return {
        ok: true,
        message: `자산 ${count}건이 이 코드를 사용 중이라 삭제하지 않고 '사용 안함'으로 변경했습니다.`,
      };
    }

    await db.delete(table).where(eq(table.id, id));
    revalidatePath('/settings');
    return { ok: true, message: '삭제되었습니다.' };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteBuildingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return removeLookup(buildings, assets.buildingCode, formData);
}

export async function deleteDepartmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return removeLookup(departments, assets.deptCode, formData);
}

const userSchema = z.object({
  username: z
    .string()
    .transform(cleanUsername)
    .refine(isUsername, `아이디는 ${USERNAME_RULE_TEXT} 여야 합니다.`),
  // 이메일은 선택 항목입니다. 빈 값은 NULL 로 저장해야 합니다 — 빈 문자열을 넣으면
  // unique 제약 때문에 이메일 없는 두 번째 계정을 만들 수 없습니다.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: '이메일 형식이 올바르지 않습니다.',
    }),
  name: z.string().trim().min(1, '이름을 입력하세요.').max(100),
  role: z.enum(USER_ROLES),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(200),
});

/** unique 위반이 어느 칸 때문인지 제약 이름으로 가려 해당 입력칸에 표시합니다. */
function userConflictField(error: unknown): 'username' | 'email' {
  return uniqueViolationConstraint(error)?.includes('email') ? 'email' : 'username';
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const parsed = userSchema.safeParse({
      username: readField(formData, 'username') ?? '',
      email: readField(formData, 'email') ?? '',
      name: formData.get('name'),
      role: formData.get('role'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }

    await db.insert(users).values({
      username: parsed.data.username,
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    });

    revalidatePath('/settings');
    return { ok: true, message: `${parsed.data.name} 계정이 추가되었습니다.` };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const field = userConflictField(error);
      return {
        ok: false,
        fieldErrors: {
          [field]: field === 'email' ? '이미 등록된 이메일입니다.' : '이미 사용 중인 아이디입니다.',
        },
      };
    }
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const session = await requireAdmin();
    const parsed = z
      .object({
        id: z.coerce.number().int().positive(),
        username: z
          .string()
          .transform(cleanUsername)
          .refine(isUsername, `아이디는 ${USERNAME_RULE_TEXT} 여야 합니다.`),
        name: z.string().trim().min(1, '이름을 입력하세요.').max(100),
        role: z.enum(USER_ROLES),
        isActive: z.boolean(),
        password: z
          .string()
          .transform((v) => v.trim())
          .refine((v) => v === '' || v.length >= 8, '비밀번호는 8자 이상이어야 합니다.'),
      })
      .safeParse({
        id: formData.get('id'),
        username: readField(formData, 'username') ?? '',
        name: formData.get('name'),
        role: formData.get('role'),
        isActive: formData.get('isActive') === 'on',
        password: (formData.get('password') ?? '').toString(),
      });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }
    const { id, username, name, role, isActive, password } = parsed.data;

    // Guard against an admin locking themselves — and possibly everyone — out.
    if (id === session.userId && (!isActive || role !== 'admin')) {
      return {
        ok: false,
        error: '본인의 관리자 권한이나 사용 여부는 변경할 수 없습니다.',
      };
    }

    await db
      .update(users)
      .set({
        username,
        name,
        role,
        isActive,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      })
      .where(eq(users.id, id));

    revalidatePath('/settings');
    const notes = [
      password ? '비밀번호가 변경되었습니다.' : '',
      // 세션에는 로그인 당시의 아이디가 들어 있어 화면 표기가 잠깐 어긋날 수 있습니다.
      id === session.userId ? '바뀐 아이디는 다시 로그인할 때부터 쓰입니다.' : '',
    ].filter(Boolean);
    return { ok: true, message: ['저장되었습니다.', ...notes].join(' ') };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const field = userConflictField(error);
      return {
        ok: false,
        fieldErrors: {
          [field]: field === 'email' ? '이미 등록된 이메일입니다.' : '이미 사용 중인 아이디입니다.',
        },
      };
    }
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const session = await requireAdmin();
    const id = Number(formData.get('id'));
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: '잘못된 계정입니다.' };
    if (id === session.userId) return { ok: false, error: '본인 계정은 삭제할 수 없습니다.' };

    await db.delete(users).where(eq(users.id, id));
    revalidatePath('/settings');
    return { ok: true, message: '계정이 삭제되었습니다.' };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** 로그인한 사용자가 스스로 비밀번호를 바꿉니다. */
export async function changeOwnPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { getSession, verifyPassword } = await import('@/lib/auth');
    const session = await getSession();
    if (!session) return { ok: false, error: '로그인이 필요합니다.' };

    const parsed = z
      .object({
        current: z.string().min(1, '현재 비밀번호를 입력하세요.'),
        next: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.').max(200),
        confirm: z.string(),
      })
      .refine((v) => v.next === v.confirm, {
        message: '새 비밀번호가 일치하지 않습니다.',
        path: ['confirm'],
      })
      .safeParse({
        current: (formData.get('current') ?? '').toString(),
        next: (formData.get('next') ?? '').toString(),
        confirm: (formData.get('confirm') ?? '').toString(),
      });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) return { ok: false, error: '계정을 찾을 수 없습니다.' };
    if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
      return {
        ok: false,
        fieldErrors: { current: '현재 비밀번호가 올바르지 않습니다.' },
      };
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.next) })
      .where(eq(users.id, session.userId));

    return { ok: true, message: '비밀번호가 변경되었습니다.' };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
