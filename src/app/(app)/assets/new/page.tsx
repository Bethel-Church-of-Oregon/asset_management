import Link from 'next/link';
import type { Metadata } from 'next';
import AssetForm from '@/components/AssetForm';
import { IconBack } from '@/components/icons';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { getLookups } from '@/lib/queries';
import { currentYearInSeoul } from '@/lib/format';
import { toYearCode } from '@/lib/asset-no';

export const metadata: Metadata = { title: '자산 등록' };

type SearchParams = {
  year?: string;
  building?: string;
  dept?: string;
  team?: string;
  location?: string;
  /** 연속 등록에서 바로 앞서 저장한 자산번호. */
  saved?: string;
};

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!canEdit(session.role)) {
    return (
      <div className="card px-6 py-16 text-center">
        <h1 className="text-lg font-bold text-slate-900">등록 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          자산 등록은 담당자 이상만 가능합니다. 교회 관리자에게 권한을 요청하세요.
        </p>
        <Link href="/assets" className="btn-secondary mt-6">
          자산 목록으로
        </Link>
      </div>
    );
  }

  const lookups = await getLookups();
  const thisYear = currentYearInSeoul();
  const yearOptions = Array.from({ length: 12 }, (_, index) => {
    const year = thisYear - index;
    return { code: toYearCode(year), label: `${year}년 (${toYearCode(year)})` };
  });

  const noLookups = lookups.buildings.length === 0 || lookups.departments.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/assets" className="btn-secondary !px-2.5" aria-label="자산 목록으로">
          <IconBack />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">자산 등록</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            자산번호는 선택한 항목에 따라 자동으로 만들어집니다.
          </p>
        </div>
      </div>

      {params.saved ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
        >
          <span>
            <span className="mono font-bold">{params.saved}</span> 등록 완료. 이어서 다음 자산을
            입력하세요.
          </span>
          <Link
            href={`/assets?q=${encodeURIComponent(params.saved)}`}
            className="ml-auto text-xs font-semibold underline"
          >
            방금 등록한 자산 보기
          </Link>
        </div>
      ) : null}

      {noLookups ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          건물/위치 또는 사역원 기준정보가 없습니다. 먼저{' '}
          <Link href="/settings" className="font-semibold underline">
            설정
          </Link>
          에서 등록하세요.
        </div>
      ) : (
        <AssetForm
          mode="create"
          lookups={lookups}
          yearOptions={yearOptions}
          defaults={{
            yearCode: params.year,
            buildingCode: params.building,
            deptCode: params.dept,
            teamName: params.team,
            location: params.location,
          }}
        />
      )}
    </div>
  );
}
