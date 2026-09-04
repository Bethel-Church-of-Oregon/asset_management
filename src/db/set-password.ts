/**
 * 계정 비밀번호 재설정 — `npm run db:set-password`
 *
 * `npm run db:seed` 는 이미 있는 계정의 비밀번호를 건드리지 않습니다(운영 중 계정이
 * 조용히 바뀌면 위험하므로). 그래서 시드 이후 `.env.local` 의 비밀번호를 바꿨거나
 * 비밀번호를 잊었을 때 이 명령으로 DB 를 맞춥니다.
 *
 *   npm run db:set-password              # SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD 사용
 *   npm run db:set-password -- pastor    # 아이디를 직접 지정
 *
 * 비밀번호는 인자로 받지 않습니다 — 셸 기록에 남지 않도록 `SEED_ADMIN_PASSWORD`
 * (또는 `NEW_PASSWORD`) 환경변수에서만 읽습니다.
 */
import { loadEnv } from '../lib/load-env';

loadEnv();

import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { users } from './schema';
import { cleanUsername, usernameFromEmail } from '../lib/username';

const MIN_LENGTH = 8;

async function main() {
  // 시드와 같은 규칙: 인자 → SEED_ADMIN_USERNAME → SEED_ADMIN_EMAIL 앞부분.
  const target =
    cleanUsername(process.argv[2] ?? process.env.SEED_ADMIN_USERNAME ?? '') ||
    usernameFromEmail(process.env.SEED_ADMIN_EMAIL ?? '') ||
    '';
  const password = process.env.NEW_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? '';

  if (!target) {
    console.error('대상 아이디가 없습니다. SEED_ADMIN_USERNAME 을 설정하거나 인자로 넘기세요:');
    console.error('  npm run db:set-password -- admin');
    process.exit(1);
  }
  if (password.length < MIN_LENGTH) {
    console.error(
      `비밀번호가 ${MIN_LENGTH}자 이상이어야 합니다 (현재 ${password.length}자).\n` +
        '.env.local 의 SEED_ADMIN_PASSWORD 를 채우거나 NEW_PASSWORD 로 넘기세요:\n' +
        "  NEW_PASSWORD='새비밀번호' npm run db:set-password",
    );
    process.exit(1);
  }

  const [account] = await db.select().from(users).where(eq(users.username, target)).limit(1);
  if (!account) {
    console.error(`'${target}' 아이디의 계정이 없습니다.`);
    const all = await db.select({ username: users.username }).from(users);
    console.error(
      all.length
        ? `등록된 아이디: ${all.map((u) => u.username).join(', ')}`
        : '등록된 계정이 없습니다. 먼저 `npm run db:seed` 를 실행하세요.',
    );
    process.exit(1);
  }

  await db
    .update(users)
    .set({ passwordHash: await hash(password, 12) })
    .where(eq(users.id, account.id));

  console.log(`✅ 아이디 '${account.username}' (${account.role}) 의 비밀번호를 변경했습니다.`);
  if (!account.isActive) {
    console.log('⚠ 이 계정은 사용 중지 상태입니다 — 로그인하려면 설정 화면에서 사용으로 바꾸세요.');
  }
  console.log('   확인: npm run db:doctor');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
