'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { normalizeAssetNo } from '@/lib/asset-no';
import { IconScan, IconSearch } from './icons';

/**
 * 대시보드/헤더용 통합 입력창.
 *
 * 바코드 스캐너는 대부분 키보드처럼 값을 입력하고 Enter 를 눌러 주므로,
 * 완전한 자산번호가 들어오면 곧바로 상세 화면으로 보냅니다.
 * 그 외의 검색어는 목록 검색으로 넘깁니다.
 */
export default function QuickLookup({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = value.trim();
    if (!term) return;
    const assetNo = normalizeAssetNo(term);
    router.push(assetNo ? `/scan?q=${encodeURIComponent(assetNo)}` : `/assets?q=${encodeURIComponent(term)}`);
    setValue('');
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          className="field-input !py-2.5 pl-10"
          placeholder="바코드 스캔 또는 자산번호 / 자산명 / S/N 검색"
          aria-label="자산 검색"
        />
      </div>
      <button type="submit" className="btn-primary shrink-0">
        <IconScan />
        <span className="hidden sm:inline">조회</span>
      </button>
    </form>
  );
}
