import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import AssetForm from '@/components/AssetForm';
import { IconBack } from '@/components/icons';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { getAssetById, getLookups } from '@/lib/queries';
import { currentYear } from '@/lib/format';
import { assetYearOptions } from '@/lib/asset-no';

export const metadata: Metadata = { title: '자산 수정' };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const assetId = Number(id);
  if (!Number.isInteger(assetId) || assetId <= 0) notFound();
  if (!canEdit(session.role)) redirect(`/assets/${assetId}`);

  const [asset, lookups] = await Promise.all([getAssetById(assetId), getLookups(true)]);
  if (!asset) notFound();

  const yearOptions = assetYearOptions(currentYear(), asset.yearCode);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/assets/${asset.id}`}
          className="btn-secondary !px-2.5"
          aria-label="상세로 돌아가기"
        >
          <IconBack />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">자산 수정</h1>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            <span className="mono">{asset.assetNo}</span> · {asset.name}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
        자산번호를 바꾸면 이미 붙여 둔 바코드 라벨과 달라집니다. 번호를 변경했다면 라벨을 다시
        출력해 교체하세요.
      </div>

      <AssetForm mode="edit" lookups={lookups} yearOptions={yearOptions} asset={asset} />
    </div>
  );
}
