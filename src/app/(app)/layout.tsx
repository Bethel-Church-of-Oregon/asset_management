import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import Nav, { type NavItem } from '@/components/Nav';
import ScanFab from '@/components/ScanFab';
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

  // 스캔만 기기에 따라 다릅니다 — 카메라로 찍는 동작이라 PC 메뉴에서는 감춥니다.
  // 나머지는 PC·모바일 양쪽에 그대로 둡니다. 주소는 어디서든 열립니다
  // (USB 바코드 스캐너를 PC 에 꽂아 쓰는 경우를 막지 않기 위해서입니다).
  //
  // 스캔은 모바일에서 가장 자주 쓰는 메뉴라 대시보드 바로 다음에 둡니다.
  // PC 에서는 이 항목이 숨겨지므로 나머지 순서는 그대로입니다.
  const items: NavItem[] = [
    { href: '/', label: '대시보드', icon: <IconDashboard /> },
    { href: '/scan', label: '스캔 · 조회', icon: <IconScan />, only: 'touch' },
    { href: '/assets', label: '자산목록', icon: <IconList /> },
  ];
  if (canEdit(session.role)) {
    items.push({ href: '/assets/new', label: '자산등록', icon: <IconPlus /> });
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

      <footer className="no-print mx-auto max-w-7xl px-4 pb-10 text-xs text-slate-400 touch:pb-28 sm:px-6">
        자산번호 형식: <span className="mono">YY-BBDD-SSSS</span> · 연도(2) · 건물(2) · 부서(2) ·
        고유번호(4) · 예) <span className="mono">{EXAMPLE_ASSET_NO}</span>
      </footer>

      <ScanFab />
    </div>
  );
}
