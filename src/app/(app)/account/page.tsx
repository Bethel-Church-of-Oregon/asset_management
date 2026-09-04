import type { Metadata } from 'next';
import PasswordForm from '@/components/PasswordForm';
import { requireSession } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/session';

export const metadata: Metadata = { title: '내 계정' };

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">내 계정</h1>
        <p className="mt-1 text-sm text-slate-500">로그인 정보와 비밀번호를 관리합니다.</p>
      </div>

      <div className="card p-5">
        <dl className="divide-y divide-slate-100 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-3 pb-2.5">
            <dt className="text-slate-500">이름</dt>
            <dd className="font-semibold text-slate-900">{session.name}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3 py-2.5">
            <dt className="text-slate-500">아이디</dt>
            <dd className="mono text-slate-900">{session.username}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3 pt-2.5">
            <dt className="text-slate-500">권한</dt>
            <dd className="text-slate-900">{ROLE_LABELS[session.role]}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
          비밀번호 변경
        </h2>
        <PasswordForm />
      </div>
    </div>
  );
}
