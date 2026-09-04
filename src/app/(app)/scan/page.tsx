import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ScanBox from '@/components/ScanBox';
import { StatusBadge } from '@/components/StatusBadge';
import { IconPlus, IconWarning } from '@/components/icons';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { findAssetByNo, searchAssetsLoose } from '@/lib/queries';
import { normalizeAssetNo, parseAssetNo } from '@/lib/asset-no';

export const metadata: Metadata = { title: '스캔 · 조회' };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const term = (q ?? '').trim();
  const editable = canEdit(session.role);

  // 완전한 자산번호이고 존재하면 곧바로 상세 화면으로 보냅니다.
  const assetNo = term ? normalizeAssetNo(term) : null;
  if (assetNo) {
    const hit = await findAssetByNo(assetNo);
    if (hit) redirect(`/assets/${hit.id}`);
  }

  const loose = term && !assetNo ? await searchAssetsLoose(term) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">스캔 · 조회</h1>
        <p className="mt-1 text-sm text-slate-500">
          바코드를 스캔하거나 자산번호를 입력하면 상세내역으로 바로 이동합니다.
        </p>
      </div>

      <div className="card p-5">
        <ScanBox initialValue={term} />
      </div>

      {assetNo ? (
        <div className="card border-amber-200 bg-amber-50/50 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-amber-500">
              <IconWarning />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-amber-900">
                <span className="mono">{assetNo}</span> — 등록되지 않은 자산번호입니다.
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                번호를 다시 확인하거나, 아직 대장에 없는 자산이라면 새로 등록하세요.
              </p>
              {editable ? (
                <NewAssetLink assetNo={assetNo} />
              ) : (
                <p className="mt-2 text-xs text-amber-800">
                  등록은 담당자 이상만 가능합니다.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {term && !assetNo ? (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">
            &lsquo;{term}&rsquo; 검색 결과
            <span className="mono ml-1.5 text-xs font-normal text-slate-500">
              {loose.length}건
            </span>
          </h2>

          {loose.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-600">일치하는 자산이 없습니다.</p>
              <Link
                href={`/assets?q=${encodeURIComponent(term)}`}
                className="btn-secondary mt-4 !py-1.5 text-xs"
              >
                전체 목록에서 다시 검색
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {loose.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/assets/${row.id}`}
                      className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
                    >
                      <span className="mono shrink-0 text-xs font-bold text-brand-700">
                        {row.assetNo}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-900">{row.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {[row.location, row.teamName].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </span>
                      <StatusBadge status={row.status} />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/assets?q=${encodeURIComponent(term)}`}
                className="mt-3 block text-center text-xs font-semibold text-brand-700"
              >
                전체 목록에서 보기
              </Link>
            </>
          )}
        </div>
      ) : null}

      {!term ? (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-900">사용 방법</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li>
              <strong className="text-slate-800">USB / 블루투스 바코드 스캐너</strong> — 입력창을
              한 번 클릭해 두면, 스캔할 때마다 자동으로 조회됩니다. 별도 설치나 설정이
              필요하지 않습니다.
            </li>
            <li>
              <strong className="text-slate-800">휴대폰 카메라</strong> —
              &lsquo;카메라로 스캔&rsquo;을 누르고 바코드를 비추세요.
            </li>
            <li>
              <strong className="text-slate-800">직접 입력</strong> — 하이픈은 넣지 않아도 됩니다.
              <span className="mono ml-1 text-slate-700">2611001</span> 로 입력해도
              <span className="mono ml-1 text-slate-700">26-11001</span> 로 인식합니다.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** 스캔했는데 없는 번호일 때, 그 번호 조합을 그대로 등록 폼에 넘겨 줍니다. */
function NewAssetLink({ assetNo }: { assetNo: string }) {
  const parts = parseAssetNo(assetNo);
  const query = parts
    ? `?year=${parts.yearCode}&building=${parts.buildingCode}&dept=${parts.deptCode}`
    : '';
  return (
    <Link href={`/assets/new${query}`} className="btn-primary mt-3 !py-1.5 text-xs">
      <IconPlus />이 번호로 자산 등록
    </Link>
  );
}
