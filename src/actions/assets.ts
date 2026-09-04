'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { isUniqueViolation } from '@/lib/db-errors';
import { ASSET_STATUSES, MAINTENANCE_KINDS, assets, maintenanceLogs } from '@/db/schema';
import { requireEditor } from '@/lib/auth';
import { buildAssetNo } from '@/lib/asset-no';
import { getNextSeq } from '@/lib/queries';
import { cleanMoneyInput, isCalendarDate, isMoneyAmount, todayInSeoul } from '@/lib/format';
import { type FormState, toErrorMessage, zodToFieldErrors } from './types';

/** Trims, then converts '' to null so empty inputs clear the column. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}자 이내로 입력하세요.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === '' || isCalendarDate(v), '날짜 형식이 올바르지 않습니다.')
  .transform((v) => (v === '' ? null : v))
  .optional()
  .transform((v) => v ?? null);

const requiredDate = (message: string) =>
  z.string().trim().refine(isCalendarDate, message);

/** "$1,234.5" → "1234.5". 판정 규칙은 `@/lib/format` 과 공유합니다. */
const optionalMoney = z
  .string()
  .trim()
  .transform(cleanMoneyInput)
  .refine(
    (v) => v === '' || isMoneyAmount(v),
    '금액은 숫자로, 소수점 둘째 자리까지 입력하세요.',
  )
  .transform((v) => (v === '' ? null : v))
  .optional()
  .transform((v) => v ?? null);

const assetSchema = z.object({
  name: z.string().trim().min(1, '자산명을 입력하세요.').max(200, '200자 이내로 입력하세요.'),
  yearCode: z.string().trim().regex(/^\d{2}$/, '취득연도를 선택하세요.'),
  buildingCode: z.string().trim().regex(/^[0-9A-Z]$/, '건물/위치를 선택하세요.'),
  deptCode: z.string().trim().regex(/^[0-9A-Z]$/, '관리 사역원을 선택하세요.'),
  seq: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, '고유번호는 1~999 사이 숫자입니다.')
    .transform((v) => v.padStart(3, '0'))
    .refine((v) => v !== '000', '고유번호는 001부터 시작합니다.'),
  teamName: optionalText(100),
  location: optionalText(200),
  acquiredDate: optionalDate,
  acquiredPrice: optionalMoney,
  manufacturer: optionalText(120),
  modelName: optionalText(160),
  serialNo: optionalText(160),
  spec: optionalText(2000),
  vendor: optionalText(160),
  quantity: z
    .string()
    .trim()
    .transform((v) => (v === '' ? '1' : v))
    .pipe(z.coerce.number().int('수량은 정수입니다.').min(1, '수량은 1 이상입니다.').max(99999)),
  status: z.enum(ASSET_STATUSES),
  donor: optionalText(120),
  warrantyUntil: optionalDate,
  notes: optionalText(4000),
  disposedDate: optionalDate,
  disposalReason: optionalText(200),
  disposalNote: optionalText(2000),
});

function readAssetForm(formData: FormData) {
  const value = (key: string) => (formData.get(key) ?? '').toString();
  return assetSchema.safeParse({
    name: value('name'),
    yearCode: value('yearCode'),
    buildingCode: value('buildingCode'),
    deptCode: value('deptCode'),
    seq: value('seq'),
    teamName: value('teamName'),
    location: value('location'),
    acquiredDate: value('acquiredDate'),
    acquiredPrice: value('acquiredPrice'),
    manufacturer: value('manufacturer'),
    modelName: value('modelName'),
    serialNo: value('serialNo'),
    spec: value('spec'),
    vendor: value('vendor'),
    quantity: value('quantity'),
    status: value('status'),
    donor: value('donor'),
    warrantyUntil: value('warrantyUntil'),
    notes: value('notes'),
    disposedDate: value('disposedDate'),
    disposalReason: value('disposalReason'),
    disposalNote: value('disposalNote'),
  });
}

/** 폐기 상태면 폐기일자를 반드시 남기고, 폐기가 아니면 폐기 기록을 비웁니다. */
function reconcileDisposal(data: z.infer<typeof assetSchema>) {
  if (data.status === 'disposed') {
    return {
      disposedDate: data.disposedDate ?? todayInSeoul(),
      disposalReason: data.disposalReason,
      disposalNote: data.disposalNote,
    };
  }
  return { disposedDate: null, disposalReason: null, disposalNote: null };
}

export async function createAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let createdId: number;
  let createdNo: string;
  const continueRegistering = formData.get('_continue') === '1';

  try {
    const session = await requireEditor();
    const parsed = readAssetForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }
    const data = parsed.data;
    const assetNo = buildAssetNo(data);

    const [row] = await db
      .insert(assets)
      .values({
        assetNo,
        yearCode: data.yearCode,
        buildingCode: data.buildingCode,
        deptCode: data.deptCode,
        seq: data.seq,
        name: data.name,
        teamName: data.teamName,
        location: data.location,
        acquiredDate: data.acquiredDate,
        acquiredPrice: data.acquiredPrice,
        manufacturer: data.manufacturer,
        modelName: data.modelName,
        serialNo: data.serialNo,
        spec: data.spec,
        vendor: data.vendor,
        quantity: data.quantity,
        status: data.status,
        donor: data.donor,
        warrantyUntil: data.warrantyUntil,
        notes: data.notes,
        ...reconcileDisposal(data),
        createdBy: session.userId,
        updatedBy: session.userId,
      })
      .returning({ id: assets.id, assetNo: assets.assetNo });

    createdId = row.id;
    createdNo = row.assetNo;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const yearCode = (formData.get('yearCode') ?? '').toString();
      const buildingCode = (formData.get('buildingCode') ?? '').toString();
      const deptCode = (formData.get('deptCode') ?? '').toString();
      const suggestion = await getNextSeq(yearCode, buildingCode, deptCode).catch(() => null);
      return {
        ok: false,
        fieldErrors: {
          seq: suggestion
            ? `이미 사용 중인 자산번호입니다. 사용 가능한 다음 번호: ${String(suggestion).padStart(3, '0')}`
            : '이미 사용 중인 자산번호입니다.',
        },
      };
    }
    return { ok: false, error: toErrorMessage(error) };
  }

  revalidatePath('/assets');
  revalidatePath('/');

  if (continueRegistering) {
    // 연속 등록: 같은 건물/사역원으로 폼을 비우고 다음 번호를 미리 채웁니다.
    const params = new URLSearchParams({
      year: (formData.get('yearCode') ?? '').toString(),
      building: (formData.get('buildingCode') ?? '').toString(),
      dept: (formData.get('deptCode') ?? '').toString(),
      saved: createdNo,
    });
    const team = (formData.get('teamName') ?? '').toString();
    const location = (formData.get('location') ?? '').toString();
    if (team) params.set('team', team);
    if (location) params.set('location', location);
    redirect(`/assets/new?${params.toString()}`);
  }

  redirect(`/assets/${createdId}?created=1`);
}

export async function updateAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: '잘못된 자산입니다.' };

  try {
    const session = await requireEditor();
    const parsed = readAssetForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }
    const data = parsed.data;
    const assetNo = buildAssetNo(data);

    const updated = await db
      .update(assets)
      .set({
        assetNo,
        yearCode: data.yearCode,
        buildingCode: data.buildingCode,
        deptCode: data.deptCode,
        seq: data.seq,
        name: data.name,
        teamName: data.teamName,
        location: data.location,
        acquiredDate: data.acquiredDate,
        acquiredPrice: data.acquiredPrice,
        manufacturer: data.manufacturer,
        modelName: data.modelName,
        serialNo: data.serialNo,
        spec: data.spec,
        vendor: data.vendor,
        quantity: data.quantity,
        status: data.status,
        donor: data.donor,
        warrantyUntil: data.warrantyUntil,
        notes: data.notes,
        ...reconcileDisposal(data),
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning({ id: assets.id });

    if (updated.length === 0) return { ok: false, error: '자산을 찾을 수 없습니다.' };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { seq: '이미 사용 중인 자산번호입니다.' } };
    }
    return { ok: false, error: toErrorMessage(error) };
  }

  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
  revalidatePath('/');
  redirect(`/assets/${id}?updated=1`);
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('잘못된 자산입니다.');

  // 폐기는 이력이 남아야 하므로 기본은 '폐기 처리'. 완전 삭제는 관리자만.
  if (session.role !== 'admin') {
    throw new Error('완전 삭제는 관리자만 가능합니다. 폐기 처리를 사용하세요.');
  }

  await db.delete(assets).where(eq(assets.id, id));
  revalidatePath('/assets');
  revalidatePath('/');
  redirect('/assets?deleted=1');
}

/** 상세 화면의 '폐기 처리' 버튼 — 전체 폼 제출 없이 상태만 바꿉니다. */
export async function disposeAssetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const session = await requireEditor();
    const parsed = z
      .object({
        id: z.coerce.number().int().positive(),
        disposedDate: requiredDate('폐기일자를 올바르게 입력하세요.'),
        disposalReason: z.string().trim().min(1, '폐기 사유를 입력하세요.').max(200),
        disposalNote: optionalText(2000),
      })
      .safeParse({
        id: formData.get('id'),
        disposedDate: formData.get('disposedDate'),
        disposalReason: formData.get('disposalReason'),
        disposalNote: formData.get('disposalNote'),
      });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }

    await db
      .update(assets)
      .set({
        status: 'disposed',
        disposedDate: parsed.data.disposedDate,
        disposalReason: parsed.data.disposalReason,
        disposalNote: parsed.data.disposalNote,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, parsed.data.id));

    revalidatePath(`/assets/${parsed.data.id}`);
    revalidatePath('/assets');
    revalidatePath('/');
    return { ok: true, message: '폐기 처리되었습니다.' };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** 폐기 취소 — 상태를 보관중으로 되돌리고 폐기 기록을 지웁니다. */
export async function restoreAssetAction(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('잘못된 자산입니다.');

  await db
    .update(assets)
    .set({
      status: 'idle',
      disposedDate: null,
      disposalReason: null,
      disposalNote: null,
      updatedBy: session.userId,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.status, 'disposed')));

  revalidatePath(`/assets/${id}`);
  revalidatePath('/assets');
  revalidatePath('/');
}

const maintenanceSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  kind: z.enum(MAINTENANCE_KINDS),
  performedOn: requiredDate('날짜를 올바르게 입력하세요.'),
  description: z.string().trim().min(1, '내용을 입력하세요.').max(2000),
  cost: optionalMoney,
  vendor: optionalText(160),
  performedBy: optionalText(120),
});

export async function addMaintenanceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const session = await requireEditor();
    const parsed = maintenanceSchema.safeParse({
      assetId: formData.get('assetId'),
      kind: formData.get('kind'),
      performedOn: formData.get('performedOn'),
      description: formData.get('description'),
      cost: formData.get('cost'),
      vendor: formData.get('vendor'),
      performedBy: formData.get('performedBy'),
    });

    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }

    await db.insert(maintenanceLogs).values({ ...parsed.data, createdBy: session.userId });

    revalidatePath(`/assets/${parsed.data.assetId}`);
    revalidatePath('/');
    return { ok: true, message: '이력이 추가되었습니다.' };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteMaintenanceAction(formData: FormData): Promise<void> {
  await requireEditor();
  const id = Number(formData.get('logId'));
  const assetId = Number(formData.get('assetId'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('잘못된 이력입니다.');

  await db.delete(maintenanceLogs).where(eq(maintenanceLogs.id, id));
  revalidatePath(`/assets/${assetId}`);
}

/** 등록 폼에서 건물/사역원/연도를 바꿀 때 다음 고유번호를 받아옵니다. */
export async function suggestSeqAction(
  yearCode: string,
  buildingCode: string,
  deptCode: string,
): Promise<{ seq: string | null }> {
  await requireEditor();
  if (!/^\d{2}$/.test(yearCode) || !/^[0-9A-Z]$/.test(buildingCode) || !/^[0-9A-Z]$/.test(deptCode)) {
    return { seq: null };
  }
  const next = await getNextSeq(yearCode, buildingCode, deptCode);
  return { seq: next === null ? null : String(next).padStart(3, '0') };
}
