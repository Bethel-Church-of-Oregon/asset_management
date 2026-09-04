import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

/** Paths reachable without a session. */
const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    // Preserve where the user was headed so login can bounce them back.
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Pages only — Next internals, the favicon and static files are skipped, and
   * so is `/api`.
   *
   * API routes must answer with a status code, not a redirect: a 307 to
   * `/login` would make a `<a download>` CSV link save the login page instead
   * of reporting failure. Each route handler under `/api` therefore does its
   * own session check and returns 401 (see `app/api/assets/export/route.ts`).
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)'],
};
