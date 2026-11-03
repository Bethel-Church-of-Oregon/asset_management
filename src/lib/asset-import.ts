/**
 * 엑셀 일괄 등록의 해석·검증·번호할당.
 *
 * 여기에는 **엑셀을 읽는 코드가 없습니다**. 시트에서 뽑아낸 "머리글 → 문자열" 표만
 * 받아 처리하는 순수 함수라, 단위테스트가 파일 없이 전 범위를 훑을 수 있습니다.
 * 파일을 여는 것은 `src/actions/import.ts` 가 합니다.
 *
 * 값 판정은 모두 기존 모듈을 그대로 씁니다 — 금액은 `format.ts`, 날짜도 `format.ts`,
 * 번호는 `asset-no.ts`. 여기서 따로 구현하면 화면에서 통과한 값이 저장에서 거부되는
 * 어긋남이 생깁니다 (CLAUDE.md 「판정 로직은 한 곳에」).
 */
// `AssetStatus` 는 타입만 가져옵니다 — `db/schema` 는 server-only 가 아니지만
// 값 import 를 늘리지 않는 편이 클라이언트 번들에 안전합니다.
import { ASSET_STATUSES, type AssetStatus } from '@/db/schema';
import { STATUS_LABELS } from './constants';
import { SEQ_MAX, buildAssetNo, isCode, toCode, toSeq, toYearCode } from './asset-no';
import { cleanMoneyInput, currentYear, isCalendarDate, isMoneyAmount } from './format';

/** 한 번에 올릴 수 있는 최대 행 수. */
export const IMPORT_MAX_ROWS = 500;

/**
 * 템플릿 열 이름.
 *
 * **CSV 내보내기(`/api/assets/export`)의 머리글과 같은 말을 씁니다** — 내보낸 파일을
 * 고쳐서 다시 올리는 길이 자연스럽게 열립니다. 한쪽을 바꾸면 다른 쪽도 맞추세요.
 */
export const IMPORT_COLUMNS = {
  name: '자산명',
  deptName: '사역원',
  buildingName: '건물명',
  teamName: '관리팀명',
  location: '설치/보관 장소',
  acquiredDate: '취득일자',
  acquiredPrice: '취득가액',
  manufacturer: '제조사',
  modelName: '모델명',
  serialNo: 'Serial Number',
  spec: '규격',
  vendor: '구입처',
  quantity: '수량',
  status: '상태',
  donor: '기증자',
  warrantyUntil: '워런티 만료일',
  notes: '특이사항',
} as const;

/**
 * 예전 열 이름 → 지금 열 이름.
 *
 * 이름을 바꾸기 전에 받아 둔 템플릿이나 내보낸 CSV 를 그대로 올려도 읽히도록
 * 머리글을 지금 이름으로 바꿔 읽습니다.
 */
const LEGACY_HEADERS: Record<string, string> = {
  관리부서: IMPORT_COLUMNS.deptName,
  '건물/위치': IMPORT_COLUMNS.buildingName,
};

/** 머리글을 지금 열 이름으로 맞춥니다. 예전 이름이 아니면 그대로 돌려줍니다. */
export function canonicalHeader(header: string): string {
  return LEGACY_HEADERS[header] ?? header;
}

/** 반드시 채워야 하는 열. 나머지는 비어도 됩니다. */
export const REQUIRED_COLUMNS = [
  IMPORT_COLUMNS.name,
  IMPORT_COLUMNS.deptName,
  IMPORT_COLUMNS.buildingName,
] as const;

/**
 * 읽기는 하되 저장하지 않는 열.
 *
 * 자산번호 — 앱이 매깁니다. 적혀 있어도 무시합니다.
 * 폐기 항목 — 일괄로 폐기 자산을 만들 일이 없고, 번호만 영구히 소모합니다.
 * 수리 이력 — 자산이 있어야 붙으므로 등록 후 따로 넣습니다.
 */
export const IGNORED_COLUMNS = [
  '자산번호',
  '수리/점검 이력',
  '폐기일자',
  '폐기 사유',
  '폐기 상세',
] as const;

export type LookupEntry = { code: string; name: string };

export type ImportContext = {
  buildings: LookupEntry[];
  departments: LookupEntry[];
  /** 접두사(연도+건물+사역원)별로 이미 쓰인 가장 큰 고유번호. 없으면 0. */
  maxSeqByPrefix: Map<string, number>;
};

/** 저장 직전의 한 줄. 자산번호까지 확정된 상태입니다. */
export type PreparedRow = {
  /** 엑셀에서의 행 번호 (머리글이 1행이므로 첫 자료는 2행). */
  rowNo: number;
  assetNo: string;
  yearCode: string;
  buildingCode: string;
  deptCode: string;
  seq: string;
  name: string;
  teamName: string | null;
  location: string | null;
  acquiredDate: string | null;
  acquiredPrice: string | null;
  manufacturer: string | null;
  modelName: string | null;
  serialNo: string | null;
  spec: string | null;
  vendor: string | null;
  quantity: number;
  status: AssetStatus;
  donor: string | null;
  warrantyUntil: string | null;
  notes: string | null;
  /** 미리보기에 그대로 보여 줄 이름 (코드가 아니라 사람이 읽는 값). */
  buildingName: string;
  deptName: string;
};

export type RowError = { rowNo: number; column: string; message: string };

export type ImportPlan = {
  rows: PreparedRow[];
  errors: RowError[];
  /** 파일 전체에 해당하는 문제 (열이 없음, 행이 너무 많음 등). */
  fatal: string[];
};

function text(value: string | undefined, max: number): string | null {
  const t = (value ?? '').trim();
  if (t === '') return null;
  return t.slice(0, max);
}

/** 이름으로 찾되 코드로 적어도 받아 줍니다 — 내보낸 파일을 고쳐 올리는 경우가 있습니다. */
function findLookup(entries: LookupEntry[], raw: string): LookupEntry | null {
  const v = raw.trim();
  if (v === '') return null;
  const byName = entries.find((e) => e.name === v);
  if (byName) return byName;
  const padded = /^\d{1,2}$/.test(v) ? toCode(Number(v)) : v;
  return entries.find((e) => e.code === padded) ?? null;
}

/** 상태는 화면에 보이는 한국어로 적습니다. 비우면 사용중. */
function parseStatus(raw: string): AssetStatus | 'invalid' | 'disposed-rejected' {
  const v = raw.trim();
  if (v === '') return 'in_use';
  const found = ASSET_STATUSES.find((code) => STATUS_LABELS[code] === v || code === v);
  if (!found) return 'invalid';
  // 폐기는 번호만 영구히 소모하므로 일괄 등록으로 만들지 않습니다.
  if (found === 'disposed') return 'disposed-rejected';
  return found;
}

/**
 * 취득연도 — 자산번호 앞 두 자리.
 *
 * 취득일자가 있으면 그 연도를, 없으면 올해를 씁니다. 일자가 적혀 있는데 해석이
 * 안 되면 연도를 추측하지 않고 그 행을 실패시킵니다(`acquiredDate` 쪽에서 잡힙니다).
 */
function yearCodeFor(acquiredDate: string | null): string {
  const year = acquiredDate ? Number(acquiredDate.slice(0, 4)) : currentYear();
  return toYearCode(year);
}

/**
 * 시트에서 뽑은 표를 저장 가능한 줄로 바꿉니다.
 *
 * 번호는 접두사별로 메모리에서 이어 붙입니다 — 행마다 DB 를 조회하면 느릴뿐더러
 * 같은 접두사가 여러 줄일 때 같은 번호를 두 번 줍니다.
 */
export function planImport(table: Record<string, string>[], ctx: ImportContext): ImportPlan {
  const fatal: string[] = [];
  const errors: RowError[] = [];
  const rows: PreparedRow[] = [];

  if (table.length === 0) {
    fatal.push('자료가 없습니다. 머리글 아래에 자산을 적어 주세요.');
    return { rows, errors, fatal };
  }
  if (table.length > IMPORT_MAX_ROWS) {
    fatal.push(
      `한 번에 ${IMPORT_MAX_ROWS}행까지 올릴 수 있습니다 (지금 ${table.length}행). 나눠서 올려 주세요.`,
    );
    return { rows, errors, fatal };
  }

  const headers = Object.keys(table[0]);
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) fatal.push(`‘${required}’ 열이 없습니다.`);
  }
  if (fatal.length > 0) return { rows, errors, fatal };

  // 접두사별로 다음에 줄 번호. DB 의 현재 최대값에서 이어집니다.
  const nextSeq = new Map(ctx.maxSeqByPrefix);

  table.forEach((raw, i) => {
    const rowNo = i + 2; // 1행은 머리글
    const add = (column: string, message: string) => errors.push({ rowNo, column, message });
    const before = errors.length;

    const name = text(raw[IMPORT_COLUMNS.name], 200);
    if (!name) add(IMPORT_COLUMNS.name, '자산명을 적어 주세요.');

    const building = findLookup(ctx.buildings, raw[IMPORT_COLUMNS.buildingName] ?? '');
    if (!building) {
      add(
        IMPORT_COLUMNS.buildingName,
        `‘${(raw[IMPORT_COLUMNS.buildingName] ?? '').trim() || '(비어 있음)'}’ 을(를) 찾을 수 없습니다.`,
      );
    }
    const dept = findLookup(ctx.departments, raw[IMPORT_COLUMNS.deptName] ?? '');
    if (!dept) {
      add(
        IMPORT_COLUMNS.deptName,
        `‘${(raw[IMPORT_COLUMNS.deptName] ?? '').trim() || '(비어 있음)'}’ 을(를) 찾을 수 없습니다.`,
      );
    }

    const acquiredRaw = (raw[IMPORT_COLUMNS.acquiredDate] ?? '').trim();
    let acquiredDate: string | null = null;
    if (acquiredRaw !== '') {
      if (isCalendarDate(acquiredRaw)) acquiredDate = acquiredRaw;
      else add(IMPORT_COLUMNS.acquiredDate, `날짜로 읽을 수 없습니다: ‘${acquiredRaw}’`);
    }

    const warrantyRaw = (raw[IMPORT_COLUMNS.warrantyUntil] ?? '').trim();
    let warrantyUntil: string | null = null;
    if (warrantyRaw !== '') {
      if (isCalendarDate(warrantyRaw)) warrantyUntil = warrantyRaw;
      else add(IMPORT_COLUMNS.warrantyUntil, `날짜로 읽을 수 없습니다: ‘${warrantyRaw}’`);
    }

    const priceRaw = (raw[IMPORT_COLUMNS.acquiredPrice] ?? '').trim();
    let acquiredPrice: string | null = null;
    if (priceRaw !== '') {
      const cleaned = cleanMoneyInput(priceRaw);
      if (isMoneyAmount(cleaned)) acquiredPrice = cleaned;
      else add(IMPORT_COLUMNS.acquiredPrice, `금액으로 읽을 수 없습니다: ‘${priceRaw}’`);
    }

    const qtyRaw = (raw[IMPORT_COLUMNS.quantity] ?? '').trim();
    let quantity = 1;
    if (qtyRaw !== '') {
      const n = Number(qtyRaw);
      if (!Number.isInteger(n) || n < 1 || n > 99999) {
        add(IMPORT_COLUMNS.quantity, `1 이상의 정수여야 합니다: ‘${qtyRaw}’`);
      } else {
        quantity = n;
      }
    }

    const statusParsed = parseStatus(raw[IMPORT_COLUMNS.status] ?? '');
    let status: AssetStatus = 'in_use';
    if (statusParsed === 'invalid') {
      add(
        IMPORT_COLUMNS.status,
        `사용중 · 보관중 · 수리중 중에서 적어 주세요: ‘${(raw[IMPORT_COLUMNS.status] ?? '').trim()}’`,
      );
    } else if (statusParsed === 'disposed-rejected') {
      add(IMPORT_COLUMNS.status, '폐기 자산은 일괄 등록할 수 없습니다. 등록 후 폐기 처리하세요.');
    } else {
      status = statusParsed;
    }

    if (errors.length > before) return; // 이 행은 실패 — 번호를 쓰지 않습니다
    if (!name || !building || !dept) return;

    const yearCode = yearCodeFor(acquiredDate);
    if (!isCode(building.code) || !isCode(dept.code)) {
      add(
        IMPORT_COLUMNS.buildingName,
        '건물·사역원 코드가 두 자리가 아닙니다. 설정에서 확인하세요.',
      );
      return;
    }

    const prefix = `${yearCode}${building.code}${dept.code}`;
    const next = (nextSeq.get(prefix) ?? 0) + 1;
    if (next > SEQ_MAX) {
      add(IMPORT_COLUMNS.name, `${prefix} 의 고유번호가 ${SEQ_MAX} 를 넘었습니다.`);
      return;
    }
    nextSeq.set(prefix, next);
    const seq = toSeq(next);

    rows.push({
      rowNo,
      assetNo: buildAssetNo({ yearCode, buildingCode: building.code, deptCode: dept.code, seq }),
      yearCode,
      buildingCode: building.code,
      deptCode: dept.code,
      seq,
      name,
      teamName: text(raw[IMPORT_COLUMNS.teamName], 100),
      location: text(raw[IMPORT_COLUMNS.location], 200),
      acquiredDate,
      acquiredPrice,
      manufacturer: text(raw[IMPORT_COLUMNS.manufacturer], 120),
      modelName: text(raw[IMPORT_COLUMNS.modelName], 160),
      serialNo: text(raw[IMPORT_COLUMNS.serialNo], 160),
      spec: text(raw[IMPORT_COLUMNS.spec], 2000),
      vendor: text(raw[IMPORT_COLUMNS.vendor], 160),
      quantity,
      status,
      donor: text(raw[IMPORT_COLUMNS.donor], 120),
      warrantyUntil,
      notes: text(raw[IMPORT_COLUMNS.notes], 4000),
      buildingName: building.name,
      deptName: dept.name,
    });
  });

  return { rows, errors, fatal };
}
