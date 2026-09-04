/**
 * Session token handling. Kept free of Node-only imports (no bcrypt, no `pg`)
 * so middleware can verify sessions on the Edge runtime.
 */
import { jwtVerify, SignJWT } from 'jose';
import type { UserRole } from '@/db/schema';

export const SESSION_COOKIE = 'cam_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12시간

export type SessionPayload = {
  userId: number;
  /** 로그인 아이디. 이메일이 아닙니다 — 계정 식별은 이 값으로 합니다. */
  username: string;
  name: string;
  role: UserRole;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.username !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      username: payload.username,
      name: payload.name,
      role: payload.role as UserRole,
    };
  } catch {
    // Expired, tampered with, or signed under a rotated secret.
    return null;
  }
}

/** manager 이상만 등록/수정 가능. */
export function canEdit(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'manager';
}

/** admin 만 사용자/기준정보 관리 가능. */
export function canAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  manager: '담당자',
  viewer: '조회자',
};
