/** 1299 → "$1,299.00" */
export function formatUsd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** 1299 → "1,299.00" (통화 기호 없이 — 표 셀·입력창용) */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "2026-03-14" → "2026. 03. 14." — accepts date strings and Date objects. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return String(value);
  return `${match[1]}. ${match[2]}. ${match[3]}.`;
}

/** Timestamps rendered in Korea time regardless of where the server runs. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Today's date in Korea time as `YYYY-MM-DD`, for date input defaults. */
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** Current year in Korea time — the default 취득연도 when registering. */
export function currentYearInSeoul(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()),
  );
}

/**
 * 금액 입력 정규화 — `"$1,234.5"` → `"1234.5"`.
 *
 * 달러는 센트가 있으므로 소수점은 남기고 쉼표·통화기호·공백만 제거합니다.
 * 입력 도중 남은 끝점(`"1234."`)도 다듬습니다.
 */
export function cleanMoneyInput(raw: string): string {
  return raw.replace(/[$,\s]/g, '').replace(/\.$/, '');
}

/**
 * 정규화된 문자열이 저장 가능한 금액인지.
 *
 * `numeric(14, 2)` 에 맞춰 정수부 11자리·소수부 2자리까지 허용합니다.
 * 화면(MoneyInput)과 서버 액션이 같은 판정을 쓰도록 여기 한 곳에만 둡니다.
 */
export function isMoneyAmount(value: string): boolean {
  return /^\d{1,11}(\.\d{1,2})?$/.test(value);
}

/** 금액 입력을 저장용 문자열로. 비어 있으면 null, 형식이 틀리면 undefined. */
export function parseMoneyInput(raw: string | null | undefined): string | null | undefined {
  if (raw === null || raw === undefined) return null;
  const cleaned = cleanMoneyInput(String(raw));
  if (cleaned === '') return null;
  return isMoneyAmount(cleaned) ? cleaned : undefined;
}

/**
 * `YYYY-MM-DD` 이면서 달력상 실제로 존재하는 날짜인지 확인합니다.
 *
 * 형식 정규식만으로는 `2026-13-99` 같은 값이 통과해 Postgres 에서 터지므로,
 * 파싱 후 연·월·일을 되돌려 비교합니다.
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
