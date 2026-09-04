import Link from 'next/link';
import type { Metadata } from 'next';
import LabelPrinter from '@/components/LabelPrinter';
import { requireSession } from '@/lib/auth';
import { getAssetsByIds, listAssetIds } from '@/lib/queries';

export const metadata: Metadata = { title: '바코드 라벨 출력' };

/** 한 번에 출력할 수 있는 자산 수 상한 — 브라우저 인쇄가 버틸 수 있는 범위. */
const MAX_LABELS = 500;

type SearchParams = {
  ids?: string;
  all?: string;
  q?: string;
  status?: string;
  building?: string;
  dept?: string;
  year?: string;
  sort?: string;
};

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const params = await searchParams;

  let ids: number[];
  let truncated = false;

  if (params.all === '1') {
    // 목록 화면의 필터를 그대로 이어받아 검색 결과 전체를 출력합니다.
    const all = await listAssetIds(
      {
        q: params.q,
        status: params.status,
        building: params.building,
        dept: params.dept,
        year: params.year,
        sort: params.sort,
      },
      MAX_LABELS + 1,
    );
    truncated = all.length > MAX_LABELS;
    ids = all.slice(0, MAX_LABELS);
  } else {
    const parsed = (params.ids ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
    ids = Array.from(new Set(parsed));
    truncated = ids.length > MAX_LABELS;
    ids = ids.slice(0, MAX_LABELS);
  }

  const assets = await getAssetsByIds(ids);

  if (assets.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-slate-900">출력할 자산이 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          자산 목록에서 라벨을 출력할 자산을 선택한 뒤 다시 시도하세요.
        </p>
        <Link href="/assets" className="btn-primary mt-6">
          자산 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
      <h1 className="no-print mb-4 text-xl font-bold text-slate-900">바코드 라벨 출력</h1>
      {truncated ? (
        <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          한 번에 최대 {MAX_LABELS}건까지 출력합니다. 나머지는 필터를 나눠 출력하세요.
        </div>
      ) : null}
      <LabelPrinter assets={assets} />
    </div>
  );
}
