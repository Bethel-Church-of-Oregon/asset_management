'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changeOwnPasswordAction } from '@/actions/settings';
import { IDLE } from '@/actions/types';
import { FormBanner, FormError } from './FormMessage';
import SubmitButton from './SubmitButton';

export default function PasswordForm() {
  const [state, action] = useActionState(changeOwnPasswordAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="max-w-sm space-y-3">
      <FormBanner state={state} />

      <div>
        <label className="field-label" htmlFor="current">
          현재 비밀번호
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className="field-input"
          required
        />
        <FormError>{state.fieldErrors?.current}</FormError>
      </div>

      <div>
        <label className="field-label" htmlFor="next">
          새 비밀번호
        </label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          className="field-input"
          minLength={8}
          required
        />
        <FormError>{state.fieldErrors?.next}</FormError>
      </div>

      <div>
        <label className="field-label" htmlFor="confirm">
          새 비밀번호 확인
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          className="field-input"
          minLength={8}
          required
        />
        <FormError>{state.fieldErrors?.confirm}</FormError>
      </div>

      <SubmitButton pendingLabel="변경 중...">비밀번호 변경</SubmitButton>
    </form>
  );
}
