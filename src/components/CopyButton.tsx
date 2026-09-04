'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconCopy } from './icons';

/**
 * 자산번호를 클립보드로 복사 — 문서나 메신저에 붙여 넣을 때 씁니다.
 *
 * 아이콘만 두는 이유: 자산번호 옆에 '복사' 글자가 있으면 번호·상태 같은 정보와
 * 동작이 한 줄에 섞여 읽기 어려워집니다. 복사는 자주 쓰는 기능이 아니라
 * 필요할 때 찾을 수 있으면 충분합니다. 눌렀을 때는 체크 표시로 바뀌어
 * 글자 없이도 결과가 보입니다.
 *
 * 표시는 `md`(768px) 이상에서만 합니다 — 휴대폰에서는 감춥니다.
 */
export default function CopyButton({
  value,
  label = '자산번호 복사',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 복사 직후 다른 자산으로 이동하면 타이머가 사라진 버튼을 건드립니다.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      // 데스크톱 전용: 좁은 화면에서는 감춥니다(md = 768px 이상에서만 표시).
      // 휴대폰에서는 화면이 좁아 번호·상태 옆에 버튼이 하나 더 붙으면 줄이 밀리고,
      // 복사는 책상에서 문서에 붙여 넣을 때 쓰는 기능입니다.
      className={`hidden rounded-md border p-1 transition md:inline-flex ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
      }`}
      title={label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        } catch {
          // 클립보드 권한이 없는 환경 — 사용자가 직접 선택해 복사하면 됩니다.
        }
      }}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      <span className="sr-only">{copied ? '복사됨' : label}</span>
    </button>
  );
}
