import { config } from 'dotenv';

/**
 * Loads env files for CLI scripts (drizzle-kit, seed) in the same precedence
 * order Next.js uses, so `npm run db:push` sees exactly what `next dev` sees.
 */
export function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    config({ path: file, override: false, quiet: true });
  }
}
