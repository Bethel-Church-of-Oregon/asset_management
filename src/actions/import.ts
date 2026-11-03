'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { db } from '@/db';
import { assets, importBatches } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { getLookups, getMaxSeqByPrefix } from '@/lib/queries';
import {
  IGNORED_COLUMNS,
  IMPORT_MAX_ROWS,
  canonicalHeader,
  planImport,
  type ImportPlan,
  type PreparedRow,
} from '@/lib/asset-import';
import { isUniqueViolation } from '@/lib/db-errors';

export type ImportState =
  | { phase: 'idle' }
  | { phase: 'preview'; fileName: string; plan: ImportPlan }
  | { phase: 'done'; fileName: string; batchId: number; count: number; assetIds: number[] }
  | { phase: 'error'; message: string };

/** 엑셀 날짜는 Date 로 옵니다. UTC 부분을 그대로 읽어야 하루가 밀리지 않습니다. */
function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'object') {
    // 수식 셀은 계산된 값을, 서식 있는 글자는 조각을 이어 붙입니다.
    if ('result' in value && value.result !== undefined)
      return cellToText(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  return String(value).trim();
}

/** 첫 시트를 "머리글 → 값" 표로 폅니다. */
async function readSheet(file: File): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('시트를 찾을 수 없습니다.');

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = canonicalHeader(cellToText(cell.value));
  });
  if (headers.filter(Boolean).length === 0) {
    throw new Error('첫 줄에서 머리글을 찾지 못했습니다. 템플릿을 받아 쓰세요.');
  }

  const table: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, col) => {
      if (!header || (IGNORED_COLUMNS as readonly string[]).includes(header)) return;
      const text = cellToText(row.getCell(col).value);
      record[header] = text;
      if (text !== '') hasValue = true;
    });
    // 엑셀은 서식만 남은 빈 줄을 흔히 끌고 옵니다 — 통째로 비면 건너뜁니다.
    if (hasValue) table.push(record);
    if (table.length > IMPORT_MAX_ROWS) break;
  }
  return table;
}

/** 올린 파일을 읽어 저장 계획을 세웁니다. **아무것도 쓰지 않습니다.** */
async function buildPlan(file: File): Promise<ImportPlan> {
  const table = await readSheet(file);
  const [lookups, maxSeqByPrefix] = await Promise.all([getLookups(), getMaxSeqByPrefix()]);
  return planImport(table, {
    buildings: lookups.buildings.map((b) => ({ code: b.code, name: b.name })),
    departments: lookups.departments.map((d) => ({ code: d.code, name: d.name })),
    maxSeqByPrefix,
  });
}

function readFile(formData: FormData): File | null {
  const file = formData.get('file');
  return file instanceof File && file.size > 0 ? file : null;
}

export async function previewImportAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  try {
    await requireAdmin();
    const file = readFile(formData);
    if (!file) return { phase: 'error', message: '엑셀 파일(.xlsx)을 고르세요.' };
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return { phase: 'error', message: '엑셀 파일(.xlsx)만 올릴 수 있습니다.' };
    }
    return { phase: 'preview', fileName: file.name, plan: await buildPlan(file) };
  } catch (error) {
    return {
      phase: 'error',
      message: error instanceof Error ? error.message : '파일을 읽지 못했습니다.',
    };
  }
}

/**
 * 실제로 등록합니다.
 *
 * 미리보기 결과를 믿지 않고 파일을 **다시 읽어** 계획을 새로 세웁니다 — 화면이
 * 보낸 줄을 그대로 저장하면 클라이언트가 고친 값이 그대로 들어갑니다. 번호도 이때
 * 다시 매겨, 미리보기 사이에 누가 수동 등록을 했어도 이어지는 번호가 나옵니다.
 *
 * 저장은 **다중 행 INSERT 한 문장**입니다. 운영 DB(Neon HTTP)는 대화형 트랜잭션을
 * 지원하지 않지만, Postgres 에서 한 문장은 그 자체로 원자적이라 중간에 실패하면
 * 아무것도 들어가지 않습니다.
 */
export async function commitImportAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  let batchId: number | null = null;
  try {
    const session = await requireAdmin();
    const file = readFile(formData);
    if (!file) return { phase: 'error', message: '엑셀 파일(.xlsx)을 다시 고르세요.' };

    const plan = await buildPlan(file);
    if (plan.fatal.length > 0 || plan.errors.length > 0) {
      // 미리보기와 저장 사이에 기준정보가 바뀌면 여기서 걸립니다.
      return { phase: 'preview', fileName: file.name, plan };
    }
    if (plan.rows.length === 0) {
      return { phase: 'error', message: '등록할 자산이 없습니다.' };
    }

    const [batch] = await db
      .insert(importBatches)
      .values({ fileName: file.name, rowCount: plan.rows.length, createdBy: session.userId })
      .returning({ id: importBatches.id });
    batchId = batch.id;

    const inserted = await db
      .insert(assets)
      .values(plan.rows.map((r) => toInsert(r, batch.id, session.userId)))
      .returning({ id: assets.id });

    revalidatePath('/settings');
    revalidatePath('/assets');
    revalidatePath('/');
    return {
      phase: 'done',
      fileName: file.name,
      batchId: batch.id,
      count: inserted.length,
      assetIds: inserted.map((r) => r.id),
    };
  } catch (error) {
    // 자산 저장이 실패하면 방금 만든 빈 묶음도 치웁니다 — 목록에 0건짜리가 남습니다.
    if (batchId !== null) {
      await db
        .delete(importBatches)
        .where(eq(importBatches.id, batchId))
        .catch(() => {});
    }
    if (isUniqueViolation(error)) {
      return {
        phase: 'error',
        message:
          '저장하는 사이에 같은 자산번호가 먼저 등록됐습니다. 아무것도 저장되지 않았으니 파일을 다시 올려 주세요.',
      };
    }
    return {
      phase: 'error',
      message: error instanceof Error ? error.message : '등록하지 못했습니다.',
    };
  }
}

function toInsert(row: PreparedRow, batchId: number, userId: number) {
  return {
    assetNo: row.assetNo,
    yearCode: row.yearCode,
    buildingCode: row.buildingCode,
    deptCode: row.deptCode,
    seq: row.seq,
    name: row.name,
    teamName: row.teamName,
    location: row.location,
    acquiredDate: row.acquiredDate,
    acquiredPrice: row.acquiredPrice,
    manufacturer: row.manufacturer,
    modelName: row.modelName,
    serialNo: row.serialNo,
    spec: row.spec,
    vendor: row.vendor,
    quantity: row.quantity,
    status: row.status,
    donor: row.donor,
    warrantyUntil: row.warrantyUntil,
    notes: row.notes,
    importBatchId: batchId,
    createdBy: userId,
    updatedBy: userId,
  };
}

/**
 * 일괄 등록분 되돌리기.
 *
 * 그 묶음으로 들어온 자산을 통째로 지웁니다. 수리 이력은 `on delete cascade` 라
 * 함께 사라지므로, 등록 후 손댄 자산이 있으면 화면에서 먼저 경고합니다.
 */
export async function undoImportAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const batchId = Number(formData.get('batchId'));
  if (!Number.isInteger(batchId) || batchId <= 0) return;

  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.importBatchId, batchId));
  if (rows.length > 0) {
    await db.delete(assets).where(
      and(
        eq(assets.importBatchId, batchId),
        inArray(
          assets.id,
          rows.map((r) => r.id),
        ),
      ),
    );
  }
  await db.delete(importBatches).where(eq(importBatches.id, batchId));

  revalidatePath('/settings');
  revalidatePath('/assets');
  revalidatePath('/');
}
