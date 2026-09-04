import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import Nav, { type NavItem } from '@/components/Nav';
import {
  IconDashboard,
  IconList,
  IconLogout,
  IconPlus,
  IconScan,
  IconSettings,
} from '@/components/icons';
import { APP_SHORT_NAME, ORG_NAME } from '@/lib/app-info';
import { EXAMPLE_ASSET_NO } from '@/lib/asset-no';
import { requireSession } from '@/lib/auth';
import { ROLE_LABELS, canAdmin, canEdit } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const items: NavItem[] = [
    { href: '/', label: '대시보드', icon: <IconDashboard /> },
    { href: '/assets', label: '자산 목록', icon: <IconList /> },
    { href: '/scan', label: '스캔 · 조회', icon: <IconScan /> },
  ];
  if (canEdit(session.role)) {
    items.splice(2, 0, { href: '/assets/new', label: '자산 등록', icon: <IconPlus /> });
  }
  if (canAdmin(session.role)) {
    items.push({ href: '/settings', label: '설정', icon: <IconSettings /> });
  }

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- 11KB 정적 로고라
                이미지 최적화가 필요 없고, next/image 를 쓰면 sharp 의존이 되살아납니다. */}
            <img
              src="/logo.jpg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold text-slate-900">
                {ORG_NAME}
              </span>
              <span className="block truncate text-[11px] text-slate-500">{APP_SHORT_NAME}</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/account"
              className="hidden rounded-lg px-2 py-1 text-right transition hover:bg-slate-100 sm:block"
              title="내 계정"
            >
              <span className="block text-sm font-semibold text-slate-800">{session.name}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABELS[session.role]}</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="btn-secondary !px-2.5"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <IconLogout />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Nav items={items} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-10 text-xs text-slate-400 sm:px-6">
        자산번호 형식: <span className="mono">YY-BBDD-SSSS</span> · 연도(2) · 건물(2) · 사역원(2) ·
        고유번호(4) · 예) <span className="mono">{EXAMPLE_ASSET_NO}</span>
      </footer>
    </div>
  );
}
