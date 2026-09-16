'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /**
   * 어느 기기에서만 메뉴에 보일지. 없으면 항상 보입니다.
   * `tailwind.config.ts` 의 `touch` / `mouse` 커스텀 스크린과 같은 기준입니다.
   * **감추는 것은 메뉴뿐이고 주소는 어디서든 그대로 열립니다.**
   */
  only?: 'touch' | 'mouse';
};

const ONLY_CLASS: Record<'touch' | 'mouse', string> = {
  touch: ' mouse:hidden',
  mouse: ' touch:hidden',
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  // `/assets/new` should not also light up `/assets`.
  if (href === '/assets') return pathname === '/assets' || /^\/assets\/\d+/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // 가로 스크롤도, 줄바꿈도 쓰지 않습니다.
  //   스크롤 — 스크롤바까지 숨겨 두면 화면 밖에 메뉴가 더 있다는 신호가 없습니다.
  //   줄바꿈 — 두 줄이 되면 sticky 헤더가 그만큼 높아져 본문을 계속 잡아먹습니다.
  // 좁은 화면에서는 아이콘 위·글자 아래로 쌓아 한 줄에 전부 담습니다. 높이는
  // 가로 배치와 같고, 폭이 넉넉해지면(sm 이상) 예전처럼 옆으로 눕힙니다.
  return (
    <nav className="-mx-1 flex gap-1 px-1 pb-px">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-auto flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-t-lg border-b-2 px-1 py-1.5 text-[11px] font-semibold leading-tight transition sm:flex-none sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-sm ${
              active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }${item.only ? ONLY_CLASS[item.only] : ''}`}
          >
            <span className="text-slate-400" aria-hidden="true">
              {item.icon}
            </span>
            {/* 글자가 칸보다 길면 잘라 냅니다 — 탭 하나가 밀려 다른 탭을 찌그러뜨리는
                것보다 낫습니다. 지금 메뉴 길이로는 잘릴 일이 없습니다. */}
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
