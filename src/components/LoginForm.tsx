'use client';

import { useActionState } from 'react';
import { loginAction } from '@/actions/auth';
import { IDLE } from '@/actions/types';
import { USERNAME_MAX } from '@/lib/username';
import { FormBanner, FormError } from './FormMessage';
import SubmitButton from './SubmitButton';

export default function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, IDLE);

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormBanner state={state} />

      <div>
        <label className="field-label" htmlFor="username">
          아이디
        </label>
        {/* autoCapitalize/autoCorrect: 모바일 키보드가 첫 글자를 대문자로 바꾸거나
            맞춤법을 고치면 아이디가 어긋납니다. */}
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          maxLength={USERNAME_MAX}
          className="field-input"
          placeholder="admin"
          aria-invalid={state.fieldErrors?.username ? true : undefined}
          aria-describedby={state.fieldErrors?.username ? 'username-error' : undefined}
        />
        <FormError id="username-error">{state.fieldErrors?.username}</FormError>
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
          placeholder="••••••••"
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.fieldErrors?.password ? 'password-error' : undefined}
        />
        <FormError id="password-error">{state.fieldErrors?.password}</FormError>
      </div>

      <SubmitButton className="btn-primary w-full !py-2.5" pendingLabel="로그인 중...">
        로그인
      </SubmitButton>
    </form>
  );
}
