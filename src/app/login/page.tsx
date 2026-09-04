import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import { APP_SHORT_NAME, ORG_NAME } from '@/lib/app-info';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* 로고 원본이 흰 배경 JPEG 이라, 그라데이션 위에서 자연스럽게 보이도록
              흰 카드 안에 넣습니다. */}
          <span className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- 위 헤더와 동일한 이유 */}
            <img src="/logo.jpg" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
          </span>
          <h1 className="text-xl font-bold text-slate-900">{ORG_NAME}</h1>
          <p className="text-sm font-semibold text-brand-700">{APP_SHORT_NAME}</p>
          <p className="mt-2 text-sm text-slate-500">등록된 계정으로 로그인하세요.</p>
        </div>

        <div className="card p-6">
          <LoginForm next={safeNext} />
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
          
        </p>
      </div>
    </div>
  );
}
