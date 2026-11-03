/**
 * 자산번호 자리수 확장 — `npm run db:widen-asset-no`
 *
 * 예전 형식 `YY-BDSSS` (건물 1자리 · 사역원 1자리 · 고유번호 3자리) 로 만든
 * 데이터베이스를 새 형식 `YY-BBDD-SSSS` (2 · 2 · 4자리) 로 올립니다.
 *
 *   1. 칸 폭 넓히기 (varchar(1) → varchar(2), varchar(3) → varchar(4))
 *   2. 값에 0 채우기 ('1' → '01', '001' → '0001')
 *   3. asset_no 다시 만들기 ('26-13001' → '26-0103-0001')
 *
 * 여러 번 실행해도 안전합니다 — 이미 새 형식인 값은 건너뜁니다.
 * `drizzle-kit push` 로는 2단계·3단계를 할 수 없어 별도 스크립트로 둡니다.
 *
 * **이미 출력한 라벨은 번호가 바뀌므로 다시 인쇄해야 합니다.** 끝나면 바뀐
 * 번호를 모두 출력하니 그 목록으로 확인하세요.
 */
import { loadEnv } from '../lib/load-env';

loadEnv();

import { sql } from 'drizzle-orm';
import { db } from './client';
import { ASSET_NO_LENGTH, CODE_DIGITS, SEQ_DIGITS } from '../lib/asset-no';

function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown[] })?.rows;
  return (Array.isArray(rows) ? rows : []) as T[];
}

async function columnLength(table: string, column: string): Promise<number | null> {
  const rows = toRows<{ character_maximum_length: number }>(
    await db.execute(sql`
      select character_maximum_length from information_schema.columns
      where table_schema = 'public' and table_name = ${table} and column_name = ${column}`),
  );
  return rows.length > 0 ? Number(rows[0].character_maximum_length) : null;
}

/** varchar 폭은 넓히는 방향이라 데이터 손실이 없습니다. */
async function widen(table: string, column: string, length: number) {
  const current = await columnLength(table, column);
  if (current === null) throw new Error(`${table}.${column} 칸이 없습니다.`);
  if (current >= length) {
    console.log(`· ${table}.${column} 은 이미 varchar(${current}) — 건너뜁니다.`);
    return;
  }
  await db.execute(sql.raw(`alter table ${table} alter column ${column} type varchar(${length})`));
  console.log(`· ${table}.${column} varchar(${current}) → varchar(${length})`);
}

async function pad(table: string, column: string, length: number) {
  const result = await db.execute(
    sql.raw(
      `update ${table} set ${column} = lpad(${column}, ${length}, '0') ` +
        `where length(${column}) < ${length}`,
    ),
  );
  const count = (result as { rowCount?: number }).rowCount ?? 0;
  console.log(`· ${table}.${column} 0 채움: ${count}건`);
}

async function main() {
  console.log('▶ 칸 폭 넓히기');
  await widen('buildings', 'code', CODE_DIGITS);
  await widen('departments', 'code', CODE_DIGITS);
  await widen('assets', 'building_code', CODE_DIGITS);
  await widen('assets', 'dept_code', CODE_DIGITS);
  await widen('assets', 'seq', SEQ_DIGITS);

  console.log('\n▶ 값에 0 채우기');
  await pad('buildings', 'code', CODE_DIGITS);
  await pad('departments', 'code', CODE_DIGITS);
  await pad('assets', 'building_code', CODE_DIGITS);
  await pad('assets', 'dept_code', CODE_DIGITS);
  await pad('assets', 'seq', SEQ_DIGITS);

  console.log('\n▶ 자산번호 다시 만들기');
  const changed = toRows<{ asset_no: string; next_no: string; name: string }>(
    await db.execute(sql`
      select asset_no,
             year_code || '-' || building_code || dept_code || '-' || seq as next_no,
             name
      from assets
      where asset_no <> year_code || '-' || building_code || dept_code || '-' || seq
      order by year_code, building_code, dept_code, seq`),
  );
  if (changed.length === 0) {
    console.log('· 바꿀 자산번호가 없습니다 — 이미 새 형식입니다.');
  } else {
    await db.execute(sql`
      update assets
      set asset_no = year_code || '-' || building_code || dept_code || '-' || seq
      where asset_no <> year_code || '-' || building_code || dept_code || '-' || seq`);
    console.log(`· ${changed.length}건의 자산번호를 바꿨습니다:\n`);
    for (const row of changed) {
      console.log(`    ${row.asset_no.padEnd(ASSET_NO_LENGTH)} → ${row.next_no}   ${row.name}`);
    }
    console.log(
      '\n  ⚠ 이미 붙여 둔 라벨은 번호가 달라졌습니다 — 위 자산은 라벨을 다시 인쇄하세요.',
    );
  }

  console.log('\n이관 완료. 확인: npm run db:push (No changes detected 여야 정상)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n이관 실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
