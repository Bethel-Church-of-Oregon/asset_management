'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconScan } from './icons';

/**
 * 손으로 쓰는 기기에서만 뜨는 스캔 버튼.
 *
 * 창고나 예배당에서 한 손으로 쓰는 동작이라 상단 메뉴 탭보다 엄지에 닿는 자리가
 * 낫습니다. PC 에서는 `mouse:`/`touch:` 조건으로 아예 나타나지 않습니다
 * (`tailwind.config.ts` 참고).
 */

/** 화면 아래를 이미 다른 것이 차지하고 있는 경로 — 버튼이 그 위를 덮습니다. */
const HIDDEN_ON = [
  /^\/scan$/, // 이미 스캔 화면
  /^\/assets\/new$/, // 등록 폼의 고정 푸터(등록 버튼)
  /^\/assets\/\d+\/edit$/, // 수정 폼의 고정 푸터(저장 버튼)
];

export default function ScanFab() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((pattern) => pattern.test(pathname))) return null;

  return (
    <Link
      href="/scan"
      title="스캔 · 조회"
      aria-label="스캔 · 조회"
      // 아이폰 홈 인디케이터에 가리지 않도록 안전영역만큼 더 띄웁니다.
      className="no-print fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40
        hidden h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white
        shadow-lg shadow-brand-900/25 transition active:scale-95 touch:flex
        [&>svg]:h-6 [&>svg]:w-6"
    >
      <IconScan />
    </Link>
  );
}
