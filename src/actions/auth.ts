'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authenticate, clearSessionCookie, createSessionCookie } from '@/lib/auth';
import { cleanUsername } from '@/lib/username';
import { type FormState, readField, zodToFieldErrors } from './types';

const loginSchema = z.object({
  // 형식까지 여기서 따지지 않습니다 — 규칙을 바꿨을 때 기존 아이디로 로그인하는 길이
  // 막히면 안 되므로, 로그인은 "비었는지" 만 보고 조회는 DB 에 맡깁니다.
  username: z.string().transform(cleanUsername).pipe(z.string().min(1, '아이디를 입력하세요.')),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
  // `next` 히든 필드는 없을 수도 있습니다. FormData.get 은 그때 null 을 주므로
  // nullish 로 받아야 합니다 (optional 만 쓰면 null 에서 검증이 실패합니다).
  next: z.string().nullish(),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: readField(formData, 'username'),
    password: readField(formData, 'password'),
    next: readField(formData, 'next'),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const session = await authenticate(parsed.data.username, parsed.data.password);
  if (!session) {
    // Same message for unknown username, wrong password and disabled account.
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  await createSessionCookie(session);

  // Only allow same-origin relative redirects from the `next` param.
  const target = parsed.data.next;
  const safeTarget = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
  redirect(safeTarget);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
