'use client';

import { useFormStatus } from 'react-dom';

/**
 * Submit button that asks for confirmation first. Used for destructive or
 * hard-to-undo actions (완전 삭제, 폐기 취소, 이력 삭제).
 */
export default function ConfirmSubmit({
  message,
  children,
  className = 'btn-danger',
  pendingLabel = '처리 중...',
  title,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      title={title}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
