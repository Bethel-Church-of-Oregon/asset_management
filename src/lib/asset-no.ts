/**
 * 자산번호 (asset number) rules.
 *
 * Format: `YY-BDSSS`  — 8 characters including the hyphen.
 *
 *   YY   취득 연도 2자리          예) 2026년 → "26"
 *   B    건물/위치 번호 1자리     예) 1=비전, 2=은혜, 3=조이채플, 4=창고
 *   D    관리 사역원 번호 1자리   예) 1=예배부, 2=선교부
 *   SSS  물품 고유번호 3자리      예) 유아방 왼쪽 TV=001, 오른쪽 TV=002
 *
 * Example: `26-11001`
 */

export const ASSET_NO_LENGTH = 8;
export const ASSET_NO_DIGITS = 7;
export const SEQ_MAX = 999;

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

/** Formats a sequence number (1) as the SSS segment ("001"). */
export function toSeq(seq: number | string): string {
  const n = typeof seq === 'string' ? Number(seq) : seq;
  if (!Number.isInteger(n) || n < 0 || n > SEQ_MAX) {
    throw new Error(`Invalid sequence: ${seq} (0-${SEQ_MAX})`);
  }
  return String(n).padStart(3, '0');
}

export function buildAssetNo(parts: AssetNoParts): string {
  const { yearCode, buildingCode, deptCode, seq } = parts;
  if (!/^\d{2}$/.test(yearCode)) throw new Error(`Invalid yearCode: ${yearCode}`);
  if (!/^[0-9A-Z]$/.test(buildingCode)) throw new Error(`Invalid buildingCode: ${buildingCode}`);
  if (!/^[0-9A-Z]$/.test(deptCode)) throw new Error(`Invalid deptCode: ${deptCode}`);
  if (!/^\d{3}$/.test(seq)) throw new Error(`Invalid seq: ${seq}`);
  return `${yearCode}-${buildingCode}${deptCode}${seq}`;
}

/**
 * Parses user or scanner input into its parts.
 *
 * Deliberately forgiving: barcode scanners, phone keypads and hand-typed
 * entries all differ in whitespace and hyphenation, so anything that reduces
 * to 7 alphanumeric characters is accepted.
 *
 * Returns `null` when the input cannot be a valid asset number.
 */
export function parseAssetNo(input: string): AssetNoParts | null {
  const compact = input.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (compact.length !== ASSET_NO_DIGITS) return null;
  if (!/^\d{2}[0-9A-Z]{2}\d{3}$/.test(compact)) return null;
  return {
    yearCode: compact.slice(0, 2),
    buildingCode: compact.slice(2, 3),
    deptCode: compact.slice(3, 4),
    seq: compact.slice(4, 7),
  };
}

/**
 * Canonicalises scanner/keyboard input to `YY-BDSSS`, or returns `null` when
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
 * Strips input down to the characters an asset number can contain, for
 * loose `LIKE` matching when the input is only a fragment.
 */
export function assetNoFragment(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
}
