import Link from 'next/link';

export default function Pagination({
  page,
  pageCount,
  queryString,
}: {
  page: number;
  pageCount: number;
  queryString: string;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(queryString);
    if (target <= 1) params.delete('page');
    else params.set('page', String(target));
    const query = params.toString();
    return query ? `/assets?${query}` : '/assets';
  };

  // 현재 페이지 주변만 노출 — 수백 페이지가 되어도 줄이 넘치지 않습니다.
  const window = 2;
  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= window) pages.push(p);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-2" aria-label="페이지 이동">
      <PageLink href={href(page - 1)} disabled={page <= 1}>
        이전
      </PageLink>
      {pages.map((p, index) =>
        p === 'gap' ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-slate-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`mono min-w-9 rounded-lg px-2.5 py-1.5 text-center text-sm font-semibold transition ${
              p === page
                ? 'bg-brand-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p}
          </Link>
        ),
      )}
      <PageLink href={href(page + 1)} disabled={page >= pageCount}>
        다음
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
