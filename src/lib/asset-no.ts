/**
 * 자산번호 (asset number) rules.
 *
 * Format: `YY-BBDD-SSSS`  — 12 characters including the two hyphens.
 *
 *   YY    취득 연도 2자리          예) 2026년 → "26"
 *   BB    건물/위치 번호 2자리     예) 01=비전, 02=은혜, 03=은혜성전, 04=창고
 *   DD    관리부서 번호 2자리   예) 01=예배사역원, 02=선교팀
 *   SSSS  물품 고유번호 4자리      예) 유아부실 왼쪽 TV=0001, 오른쪽 TV=0002
 *
 * 하이픈으로 세 덩어리(연도 / 위치·부서 / 순번)로 끊어 적습니다. 숫자 10자리가
 * 붙어 있으면 사람이 읽고 옮겨 적을 때 자리를 놓치기 쉽기 때문입니다. 하이픈은
 * 표기용이라 바코드에는 들어가지 않고(`assetNoBarcodeValue`), 입력·스캔은
 * 하이픈이 있든 없든 받습니다(`parseAssetNo`).
 *
 * Example: `26-0103-0001`
 *
 * 모든 자리는 0 으로 채웁니다. 자리수를 고정해 두면 문자열 정렬이 곧 번호 순서가
 * 되어(`01` < `02` < `10`), 목록 정렬과 "다음 번호" 조회를 숫자 변환 없이 할 수
 * 있습니다. 예전 형식(`YY-BDSSS`, 7자리)은 스캔 입력에서만 받아 새 형식으로
 * 바꿔 줍니다 — 옛 라벨이 붙은 물품을 조회할 수 있도록 하기 위한 것입니다.
 */

export const ASSET_NO_LENGTH = 12;
export const ASSET_NO_DIGITS = 10;
/** 예전 형식(`YY-BDSSS`)의 자리수. 스캔 입력 호환에만 씁니다. */
const LEGACY_DIGITS = 7;

/** 취득연도 선택 목록의 시작 연도. 이보다 오래된 자산은 목록에서 고를 수 없습니다. */
export const ASSET_YEAR_MIN = 2010;

/** 화면·문서에서 형식을 보여줄 때 쓰는 예시 번호. 한 곳에서만 정의합니다. */
export const EXAMPLE_ASSET_NO = '26-0103-0001';

export const CODE_DIGITS = 2;
export const SEQ_DIGITS = 4;
export const CODE_MAX = 99;
export const SEQ_MAX = 9999;

export type AssetNoParts = {
  yearCode: string;
  buildingCode: string;
  deptCode: string;
  seq: string;
};

/** Formats a full year (2026) or 2-digit year (26) as the YY segment. */
export function toYearCode(year: number | string): string {
  const n = typeof year === 'string' ? Number(year) : year;
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid year: ${year}`);
  }
  return String(n % 100).padStart(2, '0');
}

/** Formats a building/department code (1) as the BB/DD segment ("01"). */
export function toCode(code: number | string): string {
  const n = typeof code === 'string' ? Number(code) : code;
  if (!Number.isInteger(n) || n < 0 || n > CODE_MAX) {
    throw new Error(`Invalid code: ${code} (0-${CODE_MAX})`);
  }
  return String(n).padStart(CODE_DIGITS, '0');
}

/** Formats a sequence number (1) as the SSSS segment ("0001"). */
export function toSeq(seq: number | string): string {
  const n = typeof seq === 'string' ? Number(seq) : seq;
  if (!Number.isInteger(n) || n < 0 || n > SEQ_MAX) {
    throw new Error(`Invalid sequence: ${seq} (0-${SEQ_MAX})`);
  }
  return String(n).padStart(SEQ_DIGITS, '0');
}

/**
 * 각 조각이 저장 형식(0 으로 채운 고정 자리수)에 맞는지 검사합니다.
 *
 * 정규식을 쓰는 곳마다 따로 적으면 자리수를 바꿀 때 한 곳이 빠집니다 —
 * 실제로 자리수를 늘릴 때 `suggestSeqAction` 의 1자리 검사가 남아 있어
 * 번호 제안이 항상 실패했습니다.
 */
export function isYearCode(value: string): boolean {
  return /^\d{2}$/.test(value);
}

export function isCode(value: string): boolean {
  return new RegExp(`^\\d{${CODE_DIGITS}}$`).test(value);
}

export function isSeq(value: string): boolean {
  return new RegExp(`^\\d{${SEQ_DIGITS}}$`).test(value);
}

export function buildAssetNo(parts: AssetNoParts): string {
  const { yearCode, buildingCode, deptCode, seq } = parts;
  if (!isYearCode(yearCode)) throw new Error(`Invalid yearCode: ${yearCode}`);
  if (!isCode(buildingCode)) throw new Error(`Invalid buildingCode: ${buildingCode}`);
  if (!isCode(deptCode)) throw new Error(`Invalid deptCode: ${deptCode}`);
  if (!isSeq(seq)) throw new Error(`Invalid seq: ${seq}`);
  return `${yearCode}-${buildingCode}${deptCode}-${seq}`;
}

/**
 * Parses user or scanner input into its parts.
 *
 * Deliberately forgiving: barcode scanners, phone keypads and hand-typed
 * entries all differ in whitespace and hyphenation, so anything that reduces
 * to 10 digits is accepted. 7자리로 줄어드는 입력은 예전 형식으로 보고
 * 0 을 채워 새 형식으로 올려 줍니다.
 *
 * Returns `null` when the input cannot be a valid asset number.
 */
export function parseAssetNo(input: string): AssetNoParts | null {
  const compact = input.trim().replace(/\D/g, '');
  if (compact.length === ASSET_NO_DIGITS) {
    return {
      yearCode: compact.slice(0, 2),
      buildingCode: compact.slice(2, 4),
      deptCode: compact.slice(4, 6),
      seq: compact.slice(6, 10),
    };
  }
  if (compact.length === LEGACY_DIGITS) {
    // 예전 형식 YY-BDSSS → 각 자리에 0 을 채웁니다 (`26-13001` → `26-0103-0001`).
    return {
      yearCode: compact.slice(0, 2),
      buildingCode: toCode(compact.slice(2, 3)),
      deptCode: toCode(compact.slice(3, 4)),
      seq: toSeq(compact.slice(4, 7)),
    };
  }
  return null;
}

/**
 * Canonicalises scanner/keyboard input to `YY-BBDD-SSSS`, or returns `null` when
 * the input is not a well-formed asset number.
 */
export function normalizeAssetNo(input: string): string | null {
  const parts = parseAssetNo(input);
  return parts ? buildAssetNo(parts) : null;
}

export function isValidAssetNo(input: string): boolean {
  return normalizeAssetNo(input) !== null;
}

/**
 * 바코드에 인코딩할 값 — 하이픈을 뺀 10자리 숫자.
 *
 * 숫자만 남기면 Code 128 Code Set C 로 두 자리씩 묶여, 같은 라벨 폭에서 막대가
 * 두 배 가까이 굵어집니다(`src/lib/code128.ts`). 사람이 읽는 줄에는 하이픈이
 * 들어간 번호를 그대로 보여 주므로 화면 표기는 달라지지 않습니다.
 * 스캐너가 읽어 낸 `2601030001` 은 `parseAssetNo` 가 다시 해석합니다.
 */
export function assetNoBarcodeValue(assetNo: string): string {
  return assetNo.replace(/\D/g, '');
}

/**
 * Strips input down to the characters an asset number can contain, for
 * loose `LIKE` matching when the input is only a fragment.
 */
export function assetNoFragment(input: string): string {
  return input.trim().replace(/\D/g, '');
}

/**
 * 취득연도 선택 목록 (내림차순). 등록·수정 화면이 같은 목록을 써야 하므로
 * 여기 한 곳에서 만듭니다.
 *
 * @param thisYear 오늘이 속한 연도 (`currentYear()` — 교회 지역 시간 기준)
 * @param include  목록에 없어도 반드시 포함할 연도 코드 (예: 수정 중인 자산의 연도)
 */
export function assetYearOptions(
  thisYear: number,
  include?: string,
): { code: string; label: string }[] {
  const codes = new Map<string, string>();
  for (let year = thisYear; year >= ASSET_YEAR_MIN; year--) {
    codes.set(toYearCode(year), `${year}년 (${toYearCode(year)})`);
  }
  if (include && /^\d{2}$/.test(include) && !codes.has(include)) {
    // 규칙을 바꾸기 전에 등록된 자산이라도 수정 화면에서 연도가 비지 않게 합니다.
    const century = Number(include) > thisYear % 100 ? 1900 : 2000;
    codes.set(include, `${century + Number(include)}년 (${include})`);
  }
  return Array.from(codes, ([code, label]) => ({ code, label })).sort((a, b) =>
    b.code.localeCompare(a.code),
  );
}
