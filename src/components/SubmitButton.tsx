'use client';

import { useFormStatus } from 'react-dom';

type Props = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
};

/**
 * Submit button that disables itself while the surrounding form action is in
 * flight — the main defence against double-submitting a registration.
 */
export default function SubmitButton({
  children,
  className = 'btn-primary',
  pendingLabel,
  name,
  value,
  formNoValidate,
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      formNoValidate={formNoValidate}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? '처리 중...'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
