import Link from 'next/link';
import type { Metadata } from 'next';
import { MaintenanceBadge, StatusBadge } from '@/components/StatusBadge';
import { IconWarning } from '@/components/icons';
import { getDashboardStats } from '@/lib/queries';
import { requireSession } from '@/lib/auth';
import { canEdit } from '@/lib/session';
import { formatDate, formatUsd } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/constants';

export const metadata: Metadata = { title: '대시보드' };

export default async function DashboardPage() {
  const session = await requireSession();
  const stats = await getDashboardStats();
  const editable = canEdit(session.role);

  const cards = [
    { label: '전체 자산', value: stats.total.toLocaleString('ko-KR'), unit: '건', href: '/assets' },
    {
      label: STATUS_LABELS.in_use,
      value: (stats.statusCounts.in_use ?? 0).toLocaleString('ko-KR'),
      unit: '건',
      href: '/assets?status=in_use',
    },
    {
      label: STATUS_LABELS.repair,
      value: (stats.statusCounts.repair ?? 0).toLocaleString('ko-KR'),
      unit: '건',
      href: '/assets?status=repair',
      accent: (stats.statusCounts.repair ?? 0) > 0,
    },
    {
      label: STATUS_LABELS.disposed,
      value: (stats.statusCounts.disposed ?? 0).toLocaleString('ko-KR'),
      unit: '건',
      href: '/assets?status=disposed',
    },
  ];

  const maxBuilding = Math.max(1, ...stats.byBuilding.map((b) => b.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          자산 현황을 한눈에 봅니다. 바코드 스캔과 번호 조회는 상단 메뉴의{' '}
          <Link href="/scan" className="font-semibold text-brand-700">
            스캔 · 조회
          </Link>
          에서 할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card p-4 transition hover:border-brand-300 hover:shadow ${
              card.accent ? 'ring-1 ring-amber-200' : ''
            }`}
          >
            <div className="text-xs font-semibold text-slate-500">{card.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="mono text-2xl font-bold text-slate-900">{card.value}</span>
              <span className="text-xs text-slate-500">{card.unit}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-slate-900">건물별 보유 현황</h2>
            <span className="text-xs text-slate-500">폐기 제외</span>
          </div>
          {stats.byBuilding.length === 0 ? (
            <EmptyHint>아직 등록된 자산이 없습니다.</EmptyHint>
          ) : (
            <ul className="space-y-2.5">
              {stats.byBuilding.map((row) => (
                <li key={row.code}>
                  <Link
                    href={`/assets?building=${row.code}&status=active`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-28 shrink-0 truncate text-sm text-slate-700 group-hover:text-brand-700">
                      <span className="mono mr-1.5 text-xs text-slate-400">{row.code}</span>
                      {row.name ?? '미지정'}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.round((row.count / maxBuilding) * 100)}%` }}
                      />
                    </span>
                    <span className="mono w-12 shrink-0 text-right text-sm font-semibold text-slate-700">
                      {row.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">자산 총액</h2>
          <p className="mono text-2xl font-bold text-slate-900">{formatUsd(stats.totalValue)}</p>
          <p className="mt-1 text-xs text-slate-500">등록된 취득가액 합계</p>

          <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">올해 등록</dt>
              <dd className="mono font-semibold text-slate-800">{stats.thisYear}건</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{STATUS_LABELS.idle}</dt>
              <dd className="mono font-semibold text-slate-800">
                {stats.statusCounts.idle ?? 0}건
              </dd>
            </div>
          </dl>

          {stats.upcomingWarranty.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="text-amber-500">
                  <IconWarning />
                </span>
                워런티 만료 예정
              </h3>
              <ul className="space-y-1.5">
                {stats.upcomingWarranty.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/assets/${item.id}`}
                      className="flex items-baseline justify-between gap-2 text-xs hover:text-brand-700"
                    >
                      <span className="truncate text-slate-700">{item.name}</span>
                      <span className="mono shrink-0 text-slate-500">
                        {formatDate(item.warrantyUntil)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-slate-900">최근 등록</h2>
            <Link href="/assets?sort=recent" className="text-xs font-semibold text-brand-700">
              전체 보기
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyHint>
              {editable ? (
                <>
                  <Link href="/assets/new" className="font-semibold text-brand-700">
                    자산 등록
                  </Link>
                  으로 첫 자산을 추가해 보세요.
                </>
              ) : (
                '아직 등록된 자산이 없습니다.'
              )}
            </EmptyHint>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/assets/${item.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className="mono shrink-0 text-xs font-semibold text-brand-700">
                      {item.assetNo}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {item.name}
                    </span>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">최근 수리 · 점검</h2>
          {stats.recentLogs.length === 0 ? (
            <EmptyHint>기록된 수리·점검 이력이 없습니다.</EmptyHint>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentLogs.map((log) => (
                <li key={log.id}>
                  <Link href={`/assets/${log.assetId}`} className="block py-2.5 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <MaintenanceBadge kind={log.kind} />
                      <span className="mono text-xs text-slate-500">{log.assetNo}</span>
                      <span className="mono ml-auto shrink-0 text-xs text-slate-500">
                        {formatDate(log.performedOn)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-800">{log.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}
