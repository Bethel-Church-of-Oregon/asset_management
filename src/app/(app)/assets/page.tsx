import Link from 'next/link';
import type { Metadata } from 'next';
import AssetFilters from '@/components/AssetFilters';
import AssetTable from '@/components/AssetTable';
import Pagination from '@/components/Pagination';
import { IconPlus } from '@/components/icons';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { getLookups, getYearCodes, listAssets } from '@/lib/queries';

export const metadata: Metadata = { title: '자산 목록' };

type SearchParams = {
  q?: string;
  status?: string;
  building?: string;
  dept?: string;
  year?: string;
  sort?: string;
  page?: string;
  deleted?: string;
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const [lookups, yearCodes, result] = await Promise.all([
    getLookups(),
    getYearCodes(),
    listAssets({
      q: params.q,
      status: params.status,
      building: params.building,
      dept: params.dept,
      year: params.year,
      sort: params.sort,
      page,
    }),
  ]);

  // 라벨 출력 / CSV 로 그대로 넘길 현재 필터.
  const filterQuery = new URLSearchParams();
  for (const key of ['q', 'status', 'building', 'dept', 'year', 'sort'] as const) {
    const value = params[key];
    if (value) filterQuery.set(key, value);
  }
  const queryString = filterQuery.toString();

  const pageQuery = new URLSearchParams(queryString);
  const hasFilters = queryString.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">자산 목록</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            검색·필터 후 라벨을 일괄 출력하거나 CSV 로 내려받을 수 있습니다.
          </p>
        </div>
        {canEdit(session.role) ? (
          <Link href="/assets/new" className="btn-primary ml-auto">
            <IconPlus />
            자산 등록
          </Link>
        ) : null}
      </div>

      {params.deleted === '1' ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
        >
          자산이 삭제되었습니다.
        </div>
      ) : null}

      <AssetFilters lookups={lookups} yearCodes={yearCodes} />

      {result.rows.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="text-sm font-semibold text-slate-800">
            {hasFilters ? '조건에 맞는 자산이 없습니다.' : '아직 등록된 자산이 없습니다.'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {hasFilters
              ? '검색어나 필터를 바꿔 다시 시도해 보세요.'
              : '첫 자산을 등록하면 자산번호와 바코드가 자동으로 만들어집니다.'}
          </p>
          {hasFilters ? (
            <Link href="/assets" className="btn-secondary mt-5">
              필터 초기화
            </Link>
          ) : canEdit(session.role) ? (
            <Link href="/assets/new" className="btn-primary mt-5">
              <IconPlus />
              자산 등록
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <AssetTable rows={result.rows} total={result.total} queryString={queryString} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            queryString={pageQuery.toString()}
          />
        </>
      )}
    </div>
  );
}
