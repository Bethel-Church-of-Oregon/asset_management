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
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }${item.only ? ONLY_CLASS[item.only] : ''}`}
          >
            <span className="text-slate-400" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
