/**
 * 아이디 로그인 이관 — `npm run db:add-username`
 *
 * 이메일로 로그인하던 DB 를 아이디 로그인으로 옮깁니다. `drizzle-kit push` 로는
 * 할 수 없는 작업입니다 — 이미 행이 있는 테이블에 `not null unique` 칸을 그냥
 * 추가하면 실패하므로, 값을 채우는 단계가 사이에 있어야 합니다.
 *
 *   1. users.username 칸 추가 (우선 nullable)
 *   2. 이메일 앞부분으로 아이디 채우기 (admin@church.org → admin)
 *   3. not null + unique 제약 걸기
 *   4. users.email 을 선택 항목으로 완화 (not null 해제, 빈 문자열은 NULL 로)
 *
 * 여러 번 실행해도 안전합니다. 이미 끝난 단계는 건너뜁니다.
 * 실행 후 `npm run db:push` 로 스키마가 일치하는지 확인하세요.
 */
import { loadEnv } from '../lib/load-env';

loadEnv();

import { sql } from 'drizzle-orm';
import { db } from './client';
import { USERNAME_MAX, isUsername, usernameFromEmail } from '../lib/username';

/** 드라이버마다 결과 모양이 달라 rows 를 통일해 꺼냅니다. */
function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown[] })?.rows;
  return (Array.isArray(rows) ? rows : []) as T[];
}

async function columnsOfUsers(): Promise<Map<string, { nullable: boolean }>> {
  const rows = toRows<{ column_name: string; is_nullable: string }>(
    await db.execute(sql`
      select column_name, is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'users'`),
  );
  return new Map(rows.map((r) => [r.column_name, { nullable: r.is_nullable === 'YES' }]));
}

async function hasConstraint(name: string): Promise<boolean> {
  const rows = toRows<{ conname: string }>(
    await db.execute(sql`select conname from pg_constraint where conname = ${name}`),
  );
  return rows.length > 0;
}

/**
 * 이메일에서 아이디를 만들고, 겹치면 뒤에 숫자를 붙입니다.
 * 이메일로 규칙에 맞는 값을 못 만들면 `user7` 처럼 id 를 씁니다.
 */
function pickUsername(row: { id: number; email: string | null }, taken: Set<string>): string {
  const base = (row.email ? usernameFromEmail(row.email) : null) ?? `user${row.id}`;
  if (!taken.has(base) && isUsername(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base.slice(0, USERNAME_MAX - String(n).length)}${n}`;
    if (!taken.has(candidate) && isUsername(candidate)) return candidate;
  }
  throw new Error(`${row.email ?? row.id} 의 아이디를 만들지 못했습니다. 직접 지정하세요.`);
}

async function main() {
  const before = await columnsOfUsers();
  if (before.size === 0) {
    console.error(
      'users 테이블이 없습니다. 먼저 `npm run db:push` 와 `npm run db:seed` 를 실행하세요.',
    );
    process.exit(1);
  }

  // 1. 칸 추가
  if (before.has('username')) {
    console.log('· username 칸이 이미 있습니다 — 건너뜁니다.');
  } else {
    await db.execute(sql.raw(`alter table users add column username varchar(${USERNAME_MAX})`));
    console.log('· username 칸을 추가했습니다.');
  }

  // 2. 값 채우기
  const rows = toRows<{ id: number; email: string | null; username: string | null }>(
    await db.execute(sql`select id, email, username from users order by id`),
  );
  const taken = new Set(rows.map((r) => r.username).filter((v): v is string => !!v));
  const filled: { id: number; username: string }[] = [];
  for (const row of rows) {
    if (row.username) continue;
    const username = pickUsername(row, taken);
    taken.add(username);
    await db.execute(sql`update users set username = ${username} where id = ${row.id}`);
    filled.push({ id: row.id, username });
  }
  console.log(
    filled.length > 0
      ? `· 아이디를 채웠습니다: ${filled.map((f) => f.username).join(', ')}`
      : '· 채울 계정이 없습니다.',
  );

  // 3. not null + unique
  if (before.get('username')?.nullable !== false) {
    await db.execute(sql`alter table users alter column username set not null`);
  }
  if (!(await hasConstraint('users_username_unique'))) {
    await db.execute(sql`alter table users add constraint users_username_unique unique (username)`);
    console.log('· username 에 unique 제약을 걸었습니다.');
  }

  // 4. 이메일은 선택 항목으로
  if (before.get('email')?.nullable === false) {
    await db.execute(sql`alter table users alter column email drop not null`);
    console.log('· email 을 선택 항목으로 바꿨습니다.');
  }
  // 빈 문자열이 남아 있으면 unique 제약 때문에 이메일 없는 두 번째 계정을 못 만듭니다.
  await db.execute(sql`update users set email = null where email = ''`);

  const final = toRows<{ username: string; name: string; role: string; is_active: boolean }>(
    await db.execute(sql`select username, name, role, is_active from users order by id`),
  );
  console.log('\n이관 완료 — 이제 아래 아이디로 로그인합니다:');
  for (const row of final) {
    console.log(
      `  · ${row.username}  (${row.name} / ${row.role}${row.is_active ? '' : ' / 사용 중지'})`,
    );
  }
  console.log('\n비밀번호는 그대로입니다. 확인: npm run db:doctor');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('이관 실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
