import type { FormState } from '@/actions/types';

/**
 * 필드 오류 문구.
 *
 * `<p>` 를 반환하므로 `<span>` 같은 인라인 요소로 감싸면 안 됩니다 — 유효하지 않은
 * 중첩이 되어 하이드레이션 불일치를 일으킵니다. `aria-describedby` 로 연결할 때는
 * 래퍼를 두지 말고 `id` 를 직접 넘기세요.
 */
export function FormError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-red-600">
      {children}
    </p>
  );
}

export function FormBanner({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {state.error}
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      >
        {state.message}
      </div>
    );
  }
  return null;
}
