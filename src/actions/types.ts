export type FormState = {
  ok: boolean;
  /** Top-of-form message. */
  error?: string;
  /** Keyed by form field name. */
  fieldErrors?: Record<string, string>;
  /** Success message for actions that stay on the page. */
  message?: string;
};

export const IDLE: FormState = { ok: false };

/** Turns a ZodError into the flat shape the forms render. */
export function zodToFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Normalises thrown errors into a user-facing message. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * Reads one form field as a string.
 *
 * `FormData.get` returns `null` for a field the form did not render (a hidden
 * input that is only conditionally present, an unchecked control), and zod's
 * `.optional()` rejects `null` — so every read goes through here to normalise
 * the missing case to `undefined`.
 */
export function readField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return value === null ? undefined : value.toString();
}
