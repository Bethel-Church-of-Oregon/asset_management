'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconSearch } from './icons';
import { SORT_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import type { Lookups } from '@/lib/queries';

/**
 * 검색창 안내 문구. 좁은 화면에서는 긴 문구가 잘려 앞부분만 보이므로 짧게 바꿉니다.
 * 기준은 Tailwind 의 `sm` 과 같은 지점 — 아래 필터 줄이 격자에서 flex 로 바뀌는
 * 너비와 맞춰 둡니다. 한쪽만 바꾸면 문구는 짧은데 칸은 넓은 상태가 생깁니다.
 */
const WIDE_QUERY = '(min-width: 640px)';
const SEARCH_HINT_WIDE = '자산번호 · 자산명 · 모델명 · S/N · 장소 · 구입처 검색';
const SEARCH_HINT_NARROW = '자산번호 · 자산명 검색';

function useIsWide(): boolean {
  // 서버에는 window 가 없습니다. 서버가 그린 HTML 과 첫 렌더가 달라지면 하이드레이션
  // 경고가 나므로, 넓은 화면을 기본값으로 두고 붙은 뒤에 실제 값으로 맞춥니다.
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return wide;
}

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
  const wide = useIsWide();

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
            placeholder={wide ? SEARCH_HINT_WIDE : SEARCH_HINT_NARROW}
            // 화면이 좁으면 안내 문구를 줄이지만, 무엇으로 찾을 수 있는지는
            // 스크린리더와 마우스 오버에 그대로 남깁니다.
            title={SEARCH_HINT_WIDE}
            aria-label={SEARCH_HINT_WIDE}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          검색
        </button>
      </form>

      {/* 좁은 화면에서는 2열 격자로 폭을 맞춥니다. `flex-wrap` 만 쓰면 셀렉트마다
          내용 길이가 달라 줄마다 오른쪽 끝이 들쭉날쭉해집니다. 폭이 넉넉해지면
          (sm 이상) 내용에 맞춰 늘어놓는 편이 자연스러워 flex 로 돌아갑니다.
          여기서 너비를 쓰는 것은 배치 문제라서입니다 — 기기 구분(touch/mouse)과
          섞지 않습니다. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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
          label="부서"
          value={params.get('dept') ?? ''}
          onChange={(value) => apply({ dept: value })}
          options={[
            { value: '', label: '전체 부서' },
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
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      {/* 격자 칸을 꽉 채우다가(좁을 때), 넓어지면 내용 길이에 맞춥니다. */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 sm:w-auto"
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
