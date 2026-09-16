'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { IconDownload, IconPrinter } from './icons';
import { StatusBadge } from './StatusBadge';
import type { AssetListRow } from '@/lib/queries';
import { formatDate, formatMoney } from '@/lib/format';

export default function AssetTable({
  rows,
  total,
  queryString,
}: {
  rows: AssetListRow[];
  total: number;
  /** 현재 필터 (라벨 일괄 출력 / CSV 내보내기에 그대로 전달). */
  queryString: string;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) rows.forEach((row) => next.delete(row.id));
      else rows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  const labelHref =
    selectedIds.length > 0
      ? `/labels?ids=${selectedIds.join(',')}`
      : `/labels?all=1${queryString ? `&${queryString}` : ''}`;

  const exportHref = `/api/assets/export${queryString ? `?${queryString}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-600">
          검색 결과{' '}
          <span className="mono font-semibold text-slate-900">{total.toLocaleString('ko-KR')}</span>
          건
          {selectedIds.length > 0 ? (
            <>
              {' · '}
              <span className="font-semibold text-brand-700">{selectedIds.length}건 선택</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-1.5 text-xs text-slate-500 underline hover:text-slate-700"
              >
                선택 해제
              </button>
            </>
          ) : null}
        </p>

        <div className="ml-auto flex flex-wrap gap-2">
          <a href={exportHref} className="btn-secondary !py-1.5 text-xs" download>
            <IconDownload />
            CSV 내보내기
          </a>
          <Link href={labelHref} className="btn-primary !py-1.5 text-xs">
            <IconPrinter />
            {selectedIds.length > 0
              ? `선택 ${selectedIds.length}건 라벨 출력`
              : '검색 결과 전체 라벨 출력'}
          </Link>
        </div>
      </div>

      {/* ── 데스크톱: 표 ─────────────────────────────────────────────────── */}
      <div className="card hidden overflow-x-auto md:block">
        {/* 768~1023px 에서는 모델·취득일 칸을 감추므로 최소 너비도 함께 줄입니다.
            860px 을 그대로 두면 이 구간에서 가로 스크롤이 생깁니다. */}
        <table className="w-full min-w-[640px] text-sm lg:min-w-[860px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  aria-label="이 페이지 전체 선택"
                />
              </th>
              <th className="px-3 py-2.5">자산번호</th>
              <th className="px-3 py-2.5">자산명</th>
              <th className="px-3 py-2.5">관리팀 / 부서</th>
              <th className="px-3 py-2.5">장소</th>
              <th className="hidden px-3 py-2.5 lg:table-cell">모델 / S/N</th>
              <th className="px-3 py-2.5 text-right">취득가액</th>
              <th className="hidden px-3 py-2.5 lg:table-cell">취득일</th>
              <th className="whitespace-nowrap px-3 py-2.5">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`transition hover:bg-brand-50/40 ${
                  selected.has(row.id) ? 'bg-brand-50/60' : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`${row.assetNo} 선택`}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Link
                    href={`/assets/${row.id}`}
                    className="mono font-semibold text-brand-700 hover:underline"
                  >
                    {row.assetNo}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-3 py-2.5">
                  <Link
                    href={`/assets/${row.id}`}
                    className="block truncate text-slate-900 hover:underline"
                  >
                    {row.name}
                  </Link>
                  {row.quantity > 1 ? (
                    <span className="mono text-xs text-slate-500">수량 {row.quantity}</span>
                  ) : null}
                </td>
                {/* truncate 는 white-space: nowrap 을 포함해서, 표가 이 글자의 전체
                    폭을 요구하게 만듭니다. 말줄임이 되는 게 아니라 표가 밀려
                    768~875px 에서 가로 스크롤이 생겼습니다. 줄을 바꾸게 둡니다. */}
                <td className="max-w-[12rem] px-3 py-2.5 text-slate-600">
                  {row.teamName ?? row.deptName ?? '—'}
                </td>
                <td className="max-w-[12rem] px-3 py-2.5 text-slate-600">
                  {row.location ?? row.buildingName ?? '—'}
                </td>
                <td className="hidden max-w-[12rem] px-3 py-2.5 text-xs text-slate-600 lg:table-cell">
                  <div className="truncate">{row.modelName ?? '—'}</div>
                  {row.serialNo ? (
                    <div className="mono truncate text-slate-400">{row.serialNo}</div>
                  ) : null}
                </td>
                <td className="mono whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                  {formatMoney(row.acquiredPrice) || '—'}
                </td>
                <td className="mono hidden px-3 py-2.5 text-xs text-slate-600 lg:table-cell">
                  {row.acquiredDate ? formatDate(row.acquiredDate) : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 모바일: 카드 ─────────────────────────────────────────────────── */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`card p-3 ${selected.has(row.id) ? 'ring-1 ring-brand-300' : ''}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                aria-label={`${row.assetNo} 선택`}
              />
              <Link href={`/assets/${row.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="mono text-xs font-bold text-brand-700">{row.assetNo}</span>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-1 truncate font-semibold text-slate-900">{row.name}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {[row.location ?? row.buildingName, row.teamName ?? row.deptName]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
                {row.acquiredPrice ? (
                  <div className="mono mt-0.5 text-xs text-slate-500">
                    ${formatMoney(row.acquiredPrice)}
                  </div>
                ) : null}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
