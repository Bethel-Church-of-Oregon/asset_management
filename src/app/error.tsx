'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel 로그에서 원인을 찾을 수 있도록 남깁니다.
    console.error(error);
  }, [error]);

  const isDbConfig = /DATABASE_URL|AUTH_SECRET/.test(error.message);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-lg font-bold text-slate-900">문제가 발생했습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isDbConfig
            ? '데이터베이스 또는 보안키 설정이 완료되지 않았습니다. 환경 변수(DATABASE_URL, AUTH_SECRET)를 확인하세요.'
            : '잠시 후 다시 시도해 주세요. 계속 반복되면 관리자에게 알려 주세요.'}
        </p>
        {error.digest ? (
          <p className="mono mt-3 text-xs text-slate-400">오류 코드: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="btn-primary">
            다시 시도
          </button>
          <Link href="/" className="btn-secondary">
            대시보드로
          </Link>
        </div>
      </div>
    </div>
  );
}
