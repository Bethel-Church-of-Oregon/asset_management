'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createUserAction, deleteUserAction, updateUserAction } from '@/actions/settings';
import { IDLE } from '@/actions/types';
import ConfirmSubmit from './ConfirmSubmit';
import SubmitButton from './SubmitButton';
import { FormBanner, FormError } from './FormMessage';
import { IconPlus, IconTrash } from './icons';
import { ROLE_LABELS } from '@/lib/session';
import type { UserRole } from '@/db/schema';
import { formatDateTime } from '@/lib/format';
import { USERNAME_MAX, USERNAME_RULE_TEXT } from '@/lib/username';

export type UserRowData = {
  id: number;
  username: string;
  email: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | string;
};

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  {
    value: 'admin',
    label: ROLE_LABELS.admin,
    hint: '모든 기능 + 계정·기준정보 관리',
  },
  { value: 'manager', label: ROLE_LABELS.manager, hint: '자산 등록·수정·폐기' },
  { value: 'viewer', label: ROLE_LABELS.viewer, hint: '조회 및 라벨 출력만' },
];

export default function UserManager({
  users,
  currentUserId,
}: {
  users: UserRowData[];
  currentUserId: number;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-900">사용자 계정</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          권한은 3단계입니다 —{' '}
          {ROLE_OPTIONS.map((option, index) => (
            <span key={option.value}>
              {index > 0 ? ' · ' : ''}
              <strong className="text-slate-700">{option.label}</strong>: {option.hint}
            </span>
          ))}
        </p>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-bold text-slate-700">계정 추가</h3>
        <p className="mb-2 text-xs text-slate-500">
          로그인은 아이디로 합니다 — {USERNAME_RULE_TEXT}. 이메일은 연락처용 선택 항목입니다.
        </p>
        <AddUserForm />
      </div>
    </section>
  );
}

function UserRow({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const [state, action] = useActionState(updateUserAction, IDLE);
  const [removeState, removeAction] = useActionState(deleteUserAction, IDLE);

  return (
    <div
      className={`rounded-lg border p-3 ${
        user.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <form action={action} className="space-y-2">
        <input type="hidden" name="id" value={user.id} />

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-800">{user.name}</span>
          {user.email ? <span className="text-xs text-slate-400">{user.email}</span> : null}
          {isSelf ? (
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">본인</span>
          ) : null}
          {!user.isActive ? (
            <span className="badge bg-slate-200 text-slate-600">사용 중지</span>
          ) : null}
          <span className="ml-auto text-xs text-slate-400">
            가입 {formatDateTime(user.createdAt)}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem_5rem_1fr_auto] sm:items-center">
          <div>
            <input
              name="username"
              defaultValue={user.username}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={USERNAME_MAX}
              className="field-input mono !py-1.5"
              aria-label="아이디"
              required
            />
            <FormError>{state.fieldErrors?.username}</FormError>
          </div>

          <div>
            <input
              name="name"
              defaultValue={user.name}
              maxLength={100}
              className="field-input !py-1.5"
              aria-label="이름"
              required
            />
            <FormError>{state.fieldErrors?.name}</FormError>
          </div>

          <select
            name="role"
            defaultValue={user.role}
            className="field-input !py-1.5"
            aria-label="권한"
            disabled={isSelf}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user.isActive}
              disabled={isSelf}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
            />
            사용
          </label>

          <div>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 초기화 (8자 이상)"
              className="field-input !py-1.5"
              aria-label="새 비밀번호"
            />
            <FormError>{state.fieldErrors?.password}</FormError>
          </div>

          <SubmitButton className="btn-secondary !py-1.5 text-xs" pendingLabel="저장 중">
            저장
          </SubmitButton>
        </div>

        <FormBanner state={state} />
      </form>

      {!isSelf ? (
        <form action={removeAction} className="mt-2 flex justify-end">
          <input type="hidden" name="id" value={user.id} />
          <ConfirmSubmit
            className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            message={`'${user.name} (${user.username})' 계정을 삭제할까요? 이 사용자가 등록한 자산 기록은 남습니다.`}
            title="계정 삭제"
            pendingLabel="…"
          >
            <IconTrash />
          </ConfirmSubmit>
        </form>
      ) : null}

      {removeState.error ? <FormError>{removeState.error}</FormError> : null}
    </div>
  );
}

function AddUserForm() {
  const [state, action] = useActionState(createUserAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_7rem_1fr_auto] sm:items-start">
        <div>
          <input
            name="username"
            type="text"
            placeholder="아이디"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            className="field-input mono !py-1.5"
            aria-label="아이디"
            required
          />
          <FormError>{state.fieldErrors?.username}</FormError>
        </div>
        <div>
          <input
            name="email"
            type="email"
            placeholder="이메일 (선택)"
            className="field-input !py-1.5"
            aria-label="이메일 (선택 항목)"
          />
          <FormError>{state.fieldErrors?.email}</FormError>
        </div>
        <div>
          <input
            name="name"
            placeholder="이름"
            maxLength={100}
            className="field-input !py-1.5"
            aria-label="이름"
            required
          />
          <FormError>{state.fieldErrors?.name}</FormError>
        </div>
        <select
          name="role"
          defaultValue="manager"
          className="field-input !py-1.5"
          aria-label="권한"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="초기 비밀번호 (8자 이상)"
            className="field-input !py-1.5"
            aria-label="초기 비밀번호"
            required
          />
          <FormError>{state.fieldErrors?.password}</FormError>
        </div>
        <SubmitButton className="btn-primary !py-1.5 text-xs" pendingLabel="추가 중">
          <IconPlus />
          추가
        </SubmitButton>
      </div>
      <FormBanner state={state} />
    </form>
  );
}
