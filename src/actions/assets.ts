'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { isUniqueViolation } from '@/lib/db-errors';
import { ASSET_STATUSES, MAINTENANCE_KINDS, assets, maintenanceLogs } from '@/db/schema';
import { requireEditor } from '@/lib/auth';
import {
  SEQ_DIGITS,
  SEQ_MAX,
  buildAssetNo,
  isCode,
  isSeq,
  isYearCode,
  toSeq,
} from '@/lib/asset-no';
import { findAssetByNo, getNextSeq } from '@/lib/queries';
import { STATUS_LABELS } from '@/lib/constants';
import { cleanMoneyInput, isCalendarDate, isMoneyAmount, today } from '@/lib/format';
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

const requiredDate = (message: string) => z.string().trim().refine(isCalendarDate, message);

/** "$1,234.5" → "1234.5". 판정 규칙은 `@/lib/format` 과 공유합니다. */
const optionalMoney = z
  .string()
  .trim()
  .transform(cleanMoneyInput)
  .refine((v) => v === '' || isMoneyAmount(v), '금액은 숫자로, 소수점 둘째 자리까지 입력하세요.')
  .transform((v) => (v === '' ? null : v))
  .optional()
  .transform((v) => v ?? null);

/**
 * 자산번호를 이루는 항목. **등록할 때만** 받습니다.
 *
 * 한 번 부여한 번호는 바꾸지 않습니다 — 라벨이 이미 물건에 붙어 있고, 번호가
 * 바뀌면 물건과 기록이 어긋납니다. 그래서 수정 액션은 이 스키마를 쓰지 않고,
 * 요청에 번호 값이 들어와도 무시합니다(화면에서 칸을 감추는 것만으로는
 * 요청을 직접 만들어 보내는 경우를 막지 못합니다).
 */
const assetNoSchema = z.object({
  yearCode: z.string().trim().refine(isYearCode, '취득연도를 선택하세요.'),
  buildingCode: z.string().trim().refine(isCode, '건물/위치를 선택하세요.'),
  deptCode: z.string().trim().refine(isCode, '관리부서를 선택하세요.'),
  seq: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{1,${SEQ_DIGITS}}$`), `고유번호는 1~${SEQ_MAX} 사이 숫자입니다.`)
    .transform((v) => v.padStart(SEQ_DIGITS, '0'))
    .refine(isSeq, `고유번호는 ${SEQ_DIGITS}자리 숫자입니다.`)
    .refine((v) => Number(v) > 0, `고유번호는 ${toSeq(1)} 부터 시작합니다.`),
});

/** 자산번호를 뺀 나머지 항목 — 등록·수정이 함께 씁니다. */
const assetFieldsSchema = z.object({
  name: z.string().trim().min(1, '자산명을 입력하세요.').max(200, '200자 이내로 입력하세요.'),
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

const createAssetSchema = assetNoSchema.merge(assetFieldsSchema);

function readFields(formData: FormData) {
  const value = (key: string) => (formData.get(key) ?? '').toString();
  return {
    name: value('name'),
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
  };
}

function readCreateForm(formData: FormData) {
  const value = (key: string) => (formData.get(key) ?? '').toString();
  return createAssetSchema.safeParse({
    ...readFields(formData),
    yearCode: value('yearCode'),
    buildingCode: value('buildingCode'),
    deptCode: value('deptCode'),
    seq: value('seq'),
  });
}

/** 수정은 번호 항목을 아예 파싱하지 않습니다 — 요청에 들어와도 쓰이지 않습니다. */
function readUpdateForm(formData: FormData) {
  return assetFieldsSchema.safeParse(readFields(formData));
}

/** 폐기 상태면 폐기일자를 반드시 남기고, 폐기가 아니면 폐기 기록을 비웁니다. */
function reconcileDisposal(data: z.infer<typeof assetFieldsSchema>) {
  if (data.status === 'disposed') {
    return {
      disposedDate: data.disposedDate ?? today(),
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
    const parsed = readCreateForm(formData);
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
      // 번호를 이미 쓰고 있는 자산이 무엇인지 알려 줍니다. 특히 폐기한 자산은
      // 목록의 기본 화면(폐기 제외)에 안 보여서, 이유를 밝히지 않으면 "빈 번호인데
      // 왜 안 되나" 로 막힙니다. 폐기해도 기록은 남으므로 번호는 재사용하지
      // 않습니다 — 완전 삭제한 번호만 다시 쓸 수 있습니다.
      const yearCode = (formData.get('yearCode') ?? '').toString();
      const buildingCode = (formData.get('buildingCode') ?? '').toString();
      const deptCode = (formData.get('deptCode') ?? '').toString();
      const seq = (formData.get('seq') ?? '').toString();
      const [holder, suggestion] = await Promise.all([
        findAssetByNo(
          `${yearCode}${buildingCode}${deptCode}${seq.padStart(SEQ_DIGITS, '0')}`,
        ).catch(() => null),
        getNextSeq(yearCode, buildingCode, deptCode).catch(() => null),
      ]);
      const holderText = holder
        ? `이미 '${holder.name}' (${STATUS_LABELS[holder.status]}) 이 쓰고 있는 번호입니다.` +
          (holder.status === 'disposed' ? ' 폐기한 자산의 번호는 다시 쓰지 않습니다.' : '')
        : '이미 사용 중인 자산번호입니다.';
      return {
        ok: false,
        fieldErrors: {
          seq: suggestion
            ? `${holderText} 사용 가능한 다음 번호: ${toSeq(suggestion)}`
            : holderText,
        },
      };
    }
    return { ok: false, error: toErrorMessage(error) };
  }

  revalidatePath('/assets');
  revalidatePath('/');

  if (continueRegistering) {
    // 연속 등록: 같은 건물/부서으로 폼을 비우고 다음 번호를 미리 채웁니다.
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
    const parsed = readUpdateForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
    }
    const data = parsed.data;

    // assetNo·yearCode·buildingCode·deptCode·seq 는 일부러 빼 둡니다.
    // 등록할 때 정한 번호를 그대로 유지합니다.
    const updated = await db
      .update(assets)
      .set({
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

/** 등록 폼에서 건물/부서/연도를 바꿀 때 다음 고유번호를 받아옵니다. */
/**
 * 다음 고유번호 제안.
 *
 * `seq` 가 null 일 때 화면이 "번호를 다 썼다" 고 말해도 되는지는 `exhausted`
 * 로만 판단합니다. 예전에는 이 구분이 없어서, 자리수가 늘어난 뒤 입력값 검사가
 * 어긋나 제안이 실패했을 때 한 번도 쓰지 않은 조합에 "모두 사용했습니다" 가
 * 떴습니다. 실패와 소진은 사용자에게 완전히 다른 뜻입니다.
 */
export async function suggestSeqAction(
  yearCode: string,
  buildingCode: string,
  deptCode: string,
): Promise<{ seq: string | null; exhausted: boolean }> {
  await requireEditor();
  if (!isYearCode(yearCode) || !isCode(buildingCode) || !isCode(deptCode)) {
    return { seq: null, exhausted: false };
  }
  const next = await getNextSeq(yearCode, buildingCode, deptCode);
  return next === null ? { seq: null, exhausted: true } : { seq: toSeq(next), exhausted: false };
}
