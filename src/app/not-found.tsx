import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16 text-center">
      <div>
        <p className="mono text-5xl font-bold text-slate-300">404</p>
        <h1 className="mt-3 text-lg font-bold text-slate-900">
          찾을 수 없는 자산 또는 페이지입니다
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          자산번호를 다시 확인하거나 목록에서 찾아보세요.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/assets" className="btn-primary">
            자산 목록
          </Link>
          <Link href="/scan" className="btn-secondary">
            스캔 · 조회
          </Link>
        </div>
      </div>
    </div>
  );
}
