'use client';

import { useState } from 'react';

/** 자산번호를 클립보드로 복사 — 문서나 메신저에 붙여 넣을 때 씁니다. */
export default function CopyButton({ value, label = '복사' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // 클립보드 권한이 없는 환경 — 사용자가 직접 선택해 복사하면 됩니다.
        }
      }}
    >
      {copied ? '복사됨' : label}
    </button>
  );
}
