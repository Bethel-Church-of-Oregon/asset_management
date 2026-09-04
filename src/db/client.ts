import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Both drivers expose the same query builder, so callers are typed against the
 * production one (Neon HTTP) and the local driver is adapted to it.
 */
export type Database = NeonHttpDatabase<typeof schema>;

let client: Database | null = null;

/** Neon 은 HTTP 드라이버, 그 밖의 Postgres(로컬 도커 등)는 TCP 드라이버를 씁니다. */
export function isNeonUrl(connectionString: string): boolean {
  try {
    return /(^|\.)neon\.(tech|build)$/.test(new URL(connectionString).hostname);
  } catch {
    return false;
  }
}

function connect(): Database {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL 이 설정되지 않았습니다. .env.example 을 .env.local 로 복사한 뒤 Neon 연결 문자열을 넣으세요.',
    );
  }

  if (isNeonUrl(connectionString)) {
    // Vercel 배포용 경로: 쿼리 1건 = HTTP 요청 1건이라 커넥션 풀을 유지하지 않습니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require('@neondatabase/serverless') as typeof import('@neondatabase/serverless');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/neon-http') as typeof import('drizzle-orm/neon-http');
    client = drizzle(neon(connectionString), { schema });
  } else {
    // 로컬 개발용 경로: 일반 Postgres(도커 등)에 TCP 로 붙습니다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
    client = drizzle(
      new Pool({
        connectionString,
        max: 5,
        ssl: /sslmode=(require|verify)/.test(connectionString)
          ? { rejectUnauthorized: false }
          : undefined,
      }),
      { schema },
    ) as unknown as Database;
  }

  return client;
}

/**
 * Drizzle client.
 *
 * Connecting is deferred to the first query so `next build` never needs
 * DATABASE_URL, and a missing variable surfaces as a readable runtime error
 * instead of a build failure. Both drivers expose the same query API, so
 * callers never need to know which one is in use.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = connect();
    const value = Reflect.get(instance as object, property, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };
