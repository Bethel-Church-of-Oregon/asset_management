import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import AssetForm from '@/components/AssetForm';
import { IconBack } from '@/components/icons';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { getAssetById, getLookups } from '@/lib/queries';

export const metadata: Metadata = { title: '자산정보 수정' };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const assetId = Number(id);
  if (!Number.isInteger(assetId) || assetId <= 0) notFound();
  if (!canEdit(session.role)) redirect(`/assets/${assetId}`);

  const [asset, lookups] = await Promise.all([getAssetById(assetId), getLookups(true)]);
  if (!asset) notFound();

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
          <h1 className="text-xl font-bold text-slate-900">자산정보 수정</h1>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            <span className="mono">{asset.assetNo}</span> · {asset.name}
          </p>
        </div>
      </div>

      <AssetForm mode="edit" lookups={lookups} asset={asset} />
    </div>
  );
}
