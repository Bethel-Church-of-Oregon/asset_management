'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconSearch } from './icons';
import { SORT_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import type { Lookups } from '@/lib/queries';

export default function AssetFilters({
  lookups,
  yearCodes,
}: {
  lookups: Lookups;
  yearCodes: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  // 브라우저 뒤로/앞으로 이동했을 때 입력창을 URL 과 맞춥니다.
  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    // 필터가 바뀌면 항상 1페이지부터.
    next.delete('page');
    const query = next.toString();
    router.push(query ? `/assets?${query}` : '/assets');
  }

  const status = params.get('status') ?? '';
  const hasFilters = ['q', 'status', 'building', 'dept', 'year'].some((key) => params.get(key));

  return (
    <div className="card space-y-3 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field-input pl-10"
            placeholder="자산번호 · 자산명 · 모델명 · S/N · 장소 · 구입처 검색"
            aria-label="검색어"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          검색
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          label="상태"
          value={status}
          onChange={(value) => apply({ status: value })}
          options={[
            { value: '', label: '전체 상태' },
            { value: 'active', label: '폐기 제외' },
            ...STATUS_OPTIONS.map((o) => ({ value: o.value as string, label: o.label })),
          ]}
        />
        <Select
          label="건물"
          value={params.get('building') ?? ''}
          onChange={(value) => apply({ building: value })}
          options={[
            { value: '', label: '전체 건물' },
            ...lookups.buildings.map((b) => ({ value: b.code, label: `${b.code} · ${b.name}` })),
          ]}
        />
        <Select
          label="사역원"
          value={params.get('dept') ?? ''}
          onChange={(value) => apply({ dept: value })}
          options={[
            { value: '', label: '전체 사역원' },
            ...lookups.departments.map((d) => ({ value: d.code, label: `${d.code} · ${d.name}` })),
          ]}
        />
        <Select
          label="취득연도"
          value={params.get('year') ?? ''}
          onChange={(value) => apply({ year: value })}
          options={[
            { value: '', label: '전체 연도' },
            ...yearCodes.map((code) => ({ value: code, label: `20${code}년` })),
          ]}
        />
        <Select
          label="정렬"
          value={params.get('sort') ?? 'no_desc'}
          onChange={(value) => apply({ sort: value })}
          options={SORT_OPTIONS}
        />

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              router.push('/assets');
            }}
            className="btn-secondary !py-1.5 text-xs"
          >
            필터 초기화
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
