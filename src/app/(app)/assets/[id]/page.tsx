import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Barcode from '@/components/Barcode';
import ConfirmSubmit from '@/components/ConfirmSubmit';
import CopyButton from '@/components/CopyButton';
import DisposeForm from '@/components/DisposeForm';
import MaintenanceForm from '@/components/MaintenanceForm';
import { MaintenanceBadge, StatusBadge } from '@/components/StatusBadge';
import {
  IconBack,
  IconEdit,
  IconPrinter,
  IconTrash,
  IconWarning,
  IconWrench,
} from '@/components/icons';
import {
  deleteAssetAction,
  deleteMaintenanceAction,
  restoreAssetAction,
} from '@/actions/assets';
import { requireSession } from '@/lib/auth';
import { canAdmin, canEdit } from '@/lib/session';
import { getAssetById } from '@/lib/queries';
import { formatDate, formatDateTime, formatUsd } from '@/lib/format';
import { MAINTENANCE_LABELS } from '@/lib/constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const asset = await getAssetById(Number(id)).catch(() => null);
  return { title: asset ? `${asset.assetNo} ${asset.name}` : '자산 상세' };
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, flags] = await Promise.all([params, searchParams]);

  const assetId = Number(id);
  if (!Number.isInteger(assetId) || assetId <= 0) notFound();

  const asset = await getAssetById(assetId);
  if (!asset) notFound();

  const editable = canEdit(session.role);
  const totalRepairCost = asset.logs.reduce((sum, log) => sum + Number(log.cost ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/assets" className="btn-secondary !px-2.5" aria-label="자산 목록으로">
          <IconBack />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-sm font-bold text-brand-700">{asset.assetNo}</span>
            <CopyButton value={asset.assetNo} />
            <StatusBadge status={asset.status} />
          </div>
          <h1 className="mt-0.5 truncate text-xl font-bold text-slate-900">{asset.name}</h1>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`/labels?ids=${asset.id}`} className="btn-secondary">
            <IconPrinter />
            라벨 출력
          </Link>
          {editable ? (
            <Link href={`/assets/${asset.id}/edit`} className="btn-primary">
              <IconEdit />
              수정
            </Link>
          ) : null}
        </div>
      </div>

      {flags.created === '1' ? (
        <Flash>
          등록이 완료되었습니다. <strong>라벨 출력</strong>을 눌러 바코드를 붙여 두세요.
        </Flash>
      ) : flags.updated === '1' ? (
        <Flash>변경사항이 저장되었습니다.</Flash>
      ) : null}

      {asset.status === 'disposed' ? (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span className="mt-0.5 shrink-0 text-red-500">
            <IconWarning />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              폐기된 자산입니다 · {formatDate(asset.disposedDate)}
            </p>
            {asset.disposalReason ? (
              <p className="mt-0.5">사유: {asset.disposalReason}</p>
            ) : null}
            {asset.disposalNote ? (
              <p className="mt-0.5 whitespace-pre-wrap text-red-800">{asset.disposalNote}</p>
            ) : null}
          </div>
          {editable ? (
            <form action={restoreAssetAction} className="shrink-0">
              <input type="hidden" name="id" value={asset.id} />
              <ConfirmSubmit
                className="btn-secondary !py-1.5 text-xs"
                message="폐기 기록을 지우고 상태를 '보관중'으로 되돌릴까요?"
              >
                폐기 취소
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <Panel title="기본 정보">
            <Row label="자산번호">
              <span className="mono font-semibold">{asset.assetNo}</span>
            </Row>
            <Row label="자산명">{asset.name}</Row>
            <Row label="관리 사역원">
              {asset.deptName ? `${asset.deptCode} · ${asset.deptName}` : asset.deptCode}
            </Row>
            <Row label="관리 팀명">{asset.teamName}</Row>
            <Row label="건물 / 위치">
              {asset.buildingName ? `${asset.buildingCode} · ${asset.buildingName}` : asset.buildingCode}
            </Row>
            <Row label="설치 / 보관 장소">{asset.location}</Row>
            <Row label="수량">
              <span className="mono">{asset.quantity}</span>
            </Row>
          </Panel>

          <Panel title="취득 정보">
            <Row label="취득일자">{asset.acquiredDate ? formatDate(asset.acquiredDate) : null}</Row>
            <Row label="취득가액">
              <span className="mono font-semibold">{formatUsd(asset.acquiredPrice)}</span>
            </Row>
            <Row label="구입처">{asset.vendor}</Row>
          </Panel>

          <Panel title="제조사 및 규격">
            <Row label="제조사">{asset.manufacturer}</Row>
            <Row label="모델명">
              {asset.modelName ? <span className="mono">{asset.modelName}</span> : null}
            </Row>
            <Row label="Serial Number">
              {asset.serialNo ? <span className="mono">{asset.serialNo}</span> : null}
            </Row>
            <Row label="규격 / 사양">{asset.spec}</Row>
          </Panel>

          <Panel title="특이사항">
            <Row label="기증자">{asset.donor}</Row>
            <Row label="워런티 만료일">
              {asset.warrantyUntil ? formatDate(asset.warrantyUntil) : null}
            </Row>
            <Row label="비고">
              {asset.notes ? <span className="whitespace-pre-wrap">{asset.notes}</span> : null}
            </Row>
          </Panel>

          {/* ── 수리 및 점검 이력 ─────────────────────────────────────────── */}
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <span className="text-slate-400">
                  <IconWrench />
                </span>
                수리 · 점검 이력
                <span className="mono ml-1 text-xs font-normal text-slate-500">
                  {asset.logs.length}건
                </span>
              </h2>
              {totalRepairCost > 0 ? (
                <span className="text-xs text-slate-500">
                  누적 비용 <span className="mono font-semibold">{formatUsd(totalRepairCost)}</span>
                </span>
              ) : null}
            </div>

            {asset.logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                등록된 수리·점검 이력이 없습니다.
              </p>
            ) : (
              <ol className="mb-5 space-y-3">
                {asset.logs.map((log) => (
                  <li
                    key={log.id}
                    className="relative rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MaintenanceBadge kind={log.kind} />
                      <span className="mono text-xs font-semibold text-slate-700">
                        {formatDate(log.performedOn)}
                      </span>
                      {log.cost ? (
                        <span className="mono text-xs text-slate-600">{formatUsd(log.cost)}</span>
                      ) : null}
                      {editable ? (
                        <form action={deleteMaintenanceAction} className="ml-auto">
                          <input type="hidden" name="logId" value={log.id} />
                          <input type="hidden" name="assetId" value={asset.id} />
                          <ConfirmSubmit
                            className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            message={`${MAINTENANCE_LABELS[log.kind]} 이력을 삭제할까요?`}
                            title="이력 삭제"
                            pendingLabel="…"
                          >
                            <IconTrash />
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">
                      {log.description}
                    </p>
                    {log.vendor || log.performedBy ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {[log.vendor, log.performedBy].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}

            {editable ? (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-bold text-slate-700">이력 추가</h3>
                <MaintenanceForm assetId={asset.id} />
              </div>
            ) : null}
          </section>
        </div>

        {/* ── 사이드바 ───────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="card p-4 text-center">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              바코드
            </h2>
            <Barcode value={asset.assetNo} moduleWidth={2} height={64} fontSize={13} />
            <Link href={`/labels?ids=${asset.id}`} className="btn-secondary mt-3 w-full !py-1.5 text-xs">
              <IconPrinter />
              라벨 출력
            </Link>
          </div>

          <div className="card p-4">
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              기록
            </h2>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-slate-500">등록</dt>
                <dd className="text-slate-800">{formatDateTime(asset.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">최근 수정</dt>
                <dd className="text-slate-800">{formatDateTime(asset.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {editable && asset.status !== 'disposed' ? (
            <div className="card p-4">
              <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                자산 처분
              </h2>
              <DisposeForm assetId={asset.id} />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                폐기 처리해도 대장에서 사라지지 않고 이력이 보존됩니다.
              </p>
            </div>
          ) : null}

          {canAdmin(session.role) ? (
            <div className="card border-red-100 p-4">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">
                완전 삭제
              </h2>
              <p className="mb-2.5 text-xs leading-relaxed text-slate-500">
                수리 이력까지 되돌릴 수 없이 지워집니다. 잘못 등록한 자산일 때만 사용하세요.
              </p>
              <form action={deleteAssetAction}>
                <input type="hidden" name="id" value={asset.id} />
                <ConfirmSubmit
                  className="btn-danger w-full !py-1.5 text-xs"
                  message={`'${asset.assetNo} ${asset.name}' 을 완전히 삭제할까요? 되돌릴 수 없습니다.`}
                >
                  <IconTrash />
                  완전 삭제
                </ConfirmSubmit>
              </form>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Flash({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
    >
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 border-b border-slate-100 pb-2.5 text-sm font-bold text-slate-900">
        {title}
      </h2>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children?: React.ReactNode }) {
  const empty =
    children === null || children === undefined || children === '' || children === false;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={empty ? 'text-slate-400' : 'text-slate-900'}>{empty ? '—' : children}</dd>
    </div>
  );
}
