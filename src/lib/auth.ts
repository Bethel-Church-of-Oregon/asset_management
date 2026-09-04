import 'server-only';

/**
 * 서버 전용 인증 헬퍼.
 *
 * 이 파일에는 절대 `'use server'` 를 붙이지 마세요. 그렇게 하면 여기의 모든
 * 함수가 클라이언트에서 호출 가능한 엔드포인트로 노출되고, 특히
 * `createSessionCookie` 가 열리면 누구든 임의의 권한으로 세션을 발급받을 수
 * 있습니다. 서버 액션은 `src/actions/*` 에만 둡니다.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { cleanUsername } from './username';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
  canAdmin,
  canEdit,
  signSession,
  verifySession,
} from './session';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Server-component/action guard: redirects to the login page when signed out. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireEditor(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canEdit(session.role)) {
    throw new Error('이 작업을 수행할 권한이 없습니다. (담당자 이상 필요)');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canAdmin(session.role)) {
    throw new Error('이 작업을 수행할 권한이 없습니다. (관리자 전용)');
  }
  return session;
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Verifies credentials and returns the session payload, or `null` when the
 * username is unknown, the account is disabled, or the password is wrong.
 * The caller must not distinguish between those cases to the user.
 *
 * 로그인은 아이디로만 합니다. 이메일은 선택 항목이라 비어 있을 수 있어
 * 식별자로 쓸 수 없습니다.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<SessionPayload | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, cleanUsername(username)))
    .limit(1);
  if (!user || !user.isActive) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { userId: user.id, username: user.username, name: user.name, role: user.role };
}
