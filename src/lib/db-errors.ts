import 'server-only';

/** Postgres SQLSTATE for a unique-constraint violation. */
const PG_UNIQUE_VIOLATION = '23505';

const DUPLICATE_MESSAGE = /duplicate key value|violates unique constraint/i;

/**
 * Detects a unique-constraint violation from a thrown database error.
 *
 * Drizzle wraps driver errors as `Failed query: ...` and keeps the original on
 * `cause`, so the whole chain is inspected — checking only the top-level
 * `message` misses the SQLSTATE and leaks raw SQL into the UI.
 *
 * Only unique violations match: a foreign-key or check-constraint failure must
 * not be reported to the user as "already in use".
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current !== null && current !== undefined && depth < 6; depth++) {
    if (typeof current === 'object') {
      const candidate = current as { code?: unknown; message?: unknown };
      if (candidate.code === PG_UNIQUE_VIOLATION) return true;
      if (typeof candidate.message === 'string' && DUPLICATE_MESSAGE.test(candidate.message)) {
        return true;
      }
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** The constraint name a unique violation was raised for, when available. */
export function uniqueViolationConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; current !== null && current !== undefined && depth < 6; depth++) {
    if (typeof current === 'object') {
      const candidate = current as { code?: unknown; constraint?: unknown };
      if (candidate.code === PG_UNIQUE_VIOLATION && typeof candidate.constraint === 'string') {
        return candidate.constraint;
      }
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}
