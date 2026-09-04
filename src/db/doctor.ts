/**
 * 설정 진단 — `npm run db:doctor`
 *
 * 로그인이 안 되거나 DB 가 붙지 않을 때 원인을 좁히는 도구입니다.
 * `.env.local` 의 값 자체는 절대 출력하지 않고, 설정 여부와 상태만 요약합니다.
 * (이메일은 일부를 가리고, 비밀번호·연결문자열·보안키는 출력하지 않습니다.)
 */
import { loadEnv } from '../lib/load-env';

loadEnv();

import { compare } from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, isNeonUrl } from './client';
import { users } from './schema';
import { CODE_DIGITS } from '../lib/asset-no';
import { cleanUsername, usernameFromEmail } from '../lib/username';

const mark = (pass: boolean) => (pass ? '[32mO[0m' : '[31mX[0m');

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return `${email.slice(0, 2)}***`;
  const head = name.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

/** 드라이버마다 결과 모양이 달라 rows 를 통일해 꺼냅니다. */
function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown[] })?.rows;
  return (Array.isArray(rows) ? rows : []) as T[];
}

async function main() {
  let problems = 0;
  const fail = (message: string) => {
    problems++;
    console.log(`\n[31m→ ${message}[0m`);
  };

  console.log('=== 환경 ===');
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  console.log(
    `  Node ${process.versions.node}` +
      (nodeMajor >= 20 ? '  (권장 버전)' : '  [33m(Neon 드라이버는 Node 19+ 를 요구합니다)[0m'),
  );

  const url = process.env.DATABASE_URL;
  const secret = process.env.AUTH_SECRET;
  console.log(`  ${mark(!!url)} DATABASE_URL 설정됨`);
  console.log(
    `  ${mark(!!secret && secret.length >= 16)} AUTH_SECRET 설정됨` +
      (secret ? ` (${secret.length}자)` : '') +
      (secret && secret.length < 16 ? ' [31m← 16자 미만이면 로그인 시 오류[0m' : ''),
  );

  if (!url) {
    fail('DATABASE_URL 이 없습니다. .env.local 에 Neon 연결 문자열을 넣으세요.');
    return problems;
  }

  let host = '(주소 파싱 실패)';
  try {
    host = new URL(url).hostname;
  } catch {
    fail('DATABASE_URL 형식이 올바르지 않습니다.');
  }
  const neon = isNeonUrl(url);
  console.log(`  호스트: ${host}`);
  console.log(`  드라이버: ${neon ? 'Neon HTTP' : 'pg (TCP)'}`);
  if (neon && !/-pooler\./.test(host)) {
    console.log('  [33m! Neon 은 Pooled connection(-pooler 포함) 주소를 권장합니다[0m');
  }
  if (neon && nodeMajor < 19) {
    console.log('  [33m! Node 18 + Neon HTTP 조합은 연결이 실패할 수 있습니다[0m');
  }

  console.log('\n=== 데이터베이스 ===');
  try {
    await db.execute(sql`select 1`);
    console.log(`  ${mark(true)} 연결 성공`);
  } catch (error) {
    console.log(`  ${mark(false)} 연결 실패`);
    console.log(`     ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`);
    fail('연결이 안 됩니다. 연결 문자열과 Neon 프로젝트 상태를 확인하세요.');
    return problems;
  }

  const tableRows = toRows<{ table_name: string }>(
    await db.execute(sql`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`),
  );
  const tables = new Set(tableRows.map((r) => r.table_name));
  for (const name of ['users', 'assets', 'buildings', 'departments', 'maintenance_logs']) {
    console.log(`  ${mark(tables.has(name))} ${name}`);
  }
  if (!tables.has('users')) {
    fail('테이블이 없습니다. `npm run db:push` 를 먼저 실행하세요.');
    return problems;
  }

  // 아이디 로그인으로 바꾸기 전에 만든 DB 에는 username 칸이 없습니다.
  const columnRows = toRows<{ column_name: string }>(
    await db.execute(sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'users'`),
  );
  const columns = new Set(columnRows.map((r) => r.column_name));
  console.log(`  ${mark(columns.has('username'))} users.username (로그인 아이디)`);
  if (!columns.has('username')) {
    fail('users 테이블에 아이디 칸이 없습니다. `npm run db:add-username` 을 실행하세요.');
    return problems;
  }

  // 자산번호 자리수 이관 여부 — 안 하면 화면의 코드 목록과 저장 형식이 어긋나
  // "건물/위치를 선택하세요" 나 번호 제안 실패로 나타납니다.
  const codeRows = toRows<{ table_name: string; character_maximum_length: number }>(
    await db.execute(sql`
      select table_name, character_maximum_length from information_schema.columns
      where table_schema = 'public'
        and (table_name, column_name) in (('buildings', 'code'), ('departments', 'code'))`),
  );
  const narrow = codeRows.filter((r) => Number(r.character_maximum_length) < CODE_DIGITS);
  console.log(
    `  ${mark(narrow.length === 0)} 자산번호 자리수 (건물·부서 코드 ${CODE_DIGITS}자리)`,
  );
  if (narrow.length > 0) {
    fail('예전 자산번호 형식입니다. `npm run db:widen-asset-no` 를 실행하세요.');
    return problems;
  }

  console.log('\n=== 계정 ===');
  const accounts = await db.select().from(users);
  console.log(`  등록된 사용자: ${accounts.length}명`);
  for (const user of accounts) {
    // 아이디는 로그인 화면에 입력할 값이라 가리지 않고 그대로 보여 줍니다.
    console.log(
      `  · ${user.username}  권한=${user.role}  사용=${mark(user.isActive)}  ` +
        `해시 ${user.passwordHash.length}자` +
        (user.email ? `  (${maskEmail(user.email)})` : ''),
    );
  }
  if (accounts.length === 0) {
    fail('계정이 하나도 없습니다. `npm run db:seed` 를 실행하세요. — 로그인 실패의 원인입니다.');
    return problems;
  }

  console.log('\n=== SEED_ADMIN 자격증명 확인 ===');
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  // 시드와 같은 규칙: SEED_ADMIN_USERNAME 이 없으면 이메일 앞부분을 씁니다.
  const username =
    cleanUsername(process.env.SEED_ADMIN_USERNAME ?? '') || usernameFromEmail(email) || '';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  console.log(`  ${mark(!!username)} SEED_ADMIN_USERNAME${username ? ` (${username})` : ''}`);
  console.log(
    `  ${mark(password.length >= 8)} SEED_ADMIN_PASSWORD (${password.length}자)` +
      (password && password.length < 8
        ? ' [31m← 8자 미만이면 시드가 계정을 만들지 않습니다[0m'
        : ''),
  );
  if (!username || !password) {
    console.log('  (시드용 값이라 로그인 자체에는 필요하지 않습니다)');
    return problems;
  }

  const account = accounts.find((u) => u.username === username);
  if (!account) {
    console.log(`  ${mark(false)} '${username}' 아이디의 계정이 DB 에 없습니다`);
    fail('시드가 실행되지 않았거나 다른 아이디로 만들어졌습니다. `npm run db:seed` 를 실행하세요.');
    return problems;
  }

  const matches = await compare(password, account.passwordHash);
  console.log(`  ${mark(matches)} 비밀번호가 저장된 해시와 일치`);
  console.log(`  ${mark(account.isActive)} 계정 사용 중`);

  if (matches && account.isActive) {
    console.log(`\n[32m→ 아이디 '${account.username}' 과 이 비밀번호로 로그인할 수 있습니다.[0m`);
    console.log('  로그인 화면에서 계속 실패하면 브라우저 자동완성이 다른 값을 채우는지,');
    console.log('  또는 앱이 이 .env.local 과 같은 DATABASE_URL 로 실행 중인지 확인하세요.');
  } else if (!matches) {
    fail('비밀번호가 DB 의 해시와 다릅니다. 다음 명령으로 맞추세요: npm run db:set-password');
    console.log('  (시드는 이미 있는 계정의 비밀번호를 바꾸지 않기 때문입니다.)');
  } else {
    fail('계정이 사용 중지 상태입니다. 설정 화면에서 사용으로 바꾸세요.');
  }

  return problems;
}

main()
  .then((problems) => {
    console.log(problems === 0 ? '\n진단 완료 — 문제 없음' : `\n진단 완료 — 문제 ${problems}건`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n진단 실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
