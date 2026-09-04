'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; icon: React.ReactNode };

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
            }`}
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
