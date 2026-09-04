import type { AssetStatus, MaintenanceKind } from '@/db/schema';

export const STATUS_LABELS: Record<AssetStatus, string> = {
  in_use: '사용중',
  idle: '보관중',
  repair: '수리중',
  disposed: '폐기',
};

/** Tailwind classes for the status pill, keyed by status. */
export const STATUS_CLASSES: Record<AssetStatus, string> = {
  in_use: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  idle: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  repair: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  disposed: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'in_use', label: '사용중' },
  { value: 'idle', label: '보관중' },
  { value: 'repair', label: '수리중' },
  { value: 'disposed', label: '폐기' },
];

export const MAINTENANCE_LABELS: Record<MaintenanceKind, string> = {
  inspection: '점검',
  repair: '수리',
};

export const MAINTENANCE_CLASSES: Record<MaintenanceKind, string> = {
  inspection: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  repair: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export const PAGE_SIZE = 25;

/** 자산 목록 정렬 옵션. 값은 `src/lib/queries.ts` 의 SORTS 키와 일치해야 합니다. */
export const SORT_OPTIONS = [
  { value: 'no_desc', label: '자산번호 (최신)' },
  { value: 'no_asc', label: '자산번호 (오름차순)' },
  { value: 'name_asc', label: '자산명' },
  { value: 'recent', label: '등록순' },
  { value: 'acquired_desc', label: '취득일 최신' },
  { value: 'price_desc', label: '취득가액 높은순' },
];
