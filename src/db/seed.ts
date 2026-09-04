/**
 * 최초 1회 실행: 기준정보(건물/사역원)와 관리자 계정을 만듭니다.
 *
 *   npm run db:push     # 테이블 생성
 *   npm run db:seed     # 기준정보 + 관리자 계정
 *   npm run db:seed -- --sample   # 예시 자산 6건까지 함께 생성
 *
 * 여러 번 실행해도 안전합니다 (이미 있는 값은 건너뜁니다).
 */
import { loadEnv } from '../lib/load-env';

loadEnv();

import { hash } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { db } from './client';
import { assets, buildings, departments, maintenanceLogs, users } from './schema';
import { buildAssetNo } from '../lib/asset-no';
import { USERNAME_RULE_TEXT, cleanUsername, isUsername, usernameFromEmail } from '../lib/username';

const DEFAULT_BUILDINGS = [
  { code: '01', name: '비전', sortOrder: 1 },
  { code: '02', name: '은혜', sortOrder: 2 },
  { code: '03', name: '조이채플', sortOrder: 3 },
  { code: '04', name: '창고', sortOrder: 4 },
];

const DEFAULT_DEPARTMENTS = [
  { code: '01', name: '예배부', sortOrder: 1 },
  { code: '02', name: '선교부', sortOrder: 2 },
  { code: '03', name: '교육부', sortOrder: 3 },
  { code: '04', name: '행정부', sortOrder: 4 },
  { code: '05', name: '관리부', sortOrder: 5 },
];

/**
 * 예시 자산 — 화면을 처음 볼 때 감을 잡기 위한 데이터입니다.
 * 오레곤 현지 기준으로 구입처(Best Buy · Costco · IKEA · Sweetwater)와
 * 미국 판매 모델명·달러 가격을 씁니다.
 */
const SAMPLE_ASSETS = [
  {
    parts: { yearCode: '26', buildingCode: '01', deptCode: '03', seq: '0001' },
    name: '유아방 TV (왼쪽)',
    teamName: '교육부 유아부',
    location: '비전관 2층 유아방',
    acquiredDate: '2026-03-14',
    acquiredPrice: '649.99',
    manufacturer: 'LG',
    modelName: '65UQ7570PUJ',
    serialNo: '303MXNP4K721',
    spec: '65" 4K UHD, 벽걸이 설치',
    vendor: 'Best Buy (Jantzen Beach)',
    status: 'in_use' as const,
    notes: '벽걸이 브라켓 포함',
  },
  {
    parts: { yearCode: '26', buildingCode: '01', deptCode: '03', seq: '0002' },
    name: '유아방 TV (오른쪽)',
    teamName: '교육부 유아부',
    location: '비전관 2층 유아방',
    acquiredDate: '2026-03-14',
    acquiredPrice: '649.99',
    manufacturer: 'LG',
    modelName: '65UQ7570PUJ',
    serialNo: '303MXNP4K722',
    spec: '65" 4K UHD, 벽걸이 설치',
    vendor: 'Best Buy (Jantzen Beach)',
    status: 'in_use' as const,
  },
  {
    parts: { yearCode: '26', buildingCode: '01', deptCode: '01', seq: '0001' },
    name: '본당 무선마이크 세트',
    teamName: '예배부 음향팀',
    location: '비전관 1층 본당 음향실',
    acquiredDate: '2026-01-20',
    acquiredPrice: '599.00',
    manufacturer: 'Shure',
    modelName: 'BLX288/PG58',
    serialNo: 'SHR-882140',
    spec: '2채널 핸드헬드 무선 시스템 (H11 대역)',
    vendor: 'Sweetwater',
    status: 'repair' as const,
    notes: '2번 채널 잡음 발생',
  },
  {
    parts: { yearCode: '25', buildingCode: '03', deptCode: '02', seq: '0004' },
    name: '선교부 노트북',
    teamName: '선교부',
    location: '조이채플 선교부 사무실',
    acquiredDate: '2025-08-02',
    acquiredPrice: '1099.00',
    manufacturer: 'Dell',
    modelName: 'Inspiron 15 3520',
    serialNo: 'DELL-7GQ2XN3',
    spec: '15.6" / i7 / 16GB / 512GB SSD',
    vendor: 'Costco (Tigard)',
    status: 'in_use' as const,
    donor: '이OO 집사',
    warrantyUntil: '2028-08-01',
    notes: '기증품. 선교 보고 영상 편집 전용',
  },
  {
    parts: { yearCode: '25', buildingCode: '02', deptCode: '03', seq: '0012' },
    name: '주일학교 책장',
    teamName: '교육부 초등부',
    location: '은혜관 1층 3번 교실',
    acquiredDate: '2025-09-06',
    acquiredPrice: '129.00',
    manufacturer: 'IKEA',
    modelName: 'BILLY',
    spec: '31 1/2" x 79 1/2" 화이트, 2개 중 1개',
    vendor: 'IKEA (Portland)',
    status: 'in_use' as const,
    quantity: 2,
    notes: '벽 고정 앵커 설치 완료',
  },
  {
    parts: { yearCode: '24', buildingCode: '04', deptCode: '05', seq: '0011' },
    name: '접이식 테이블 (구형)',
    teamName: '관리부',
    location: '창고 B-3 선반',
    acquiredDate: '2024-05-11',
    acquiredPrice: '79.99',
    manufacturer: 'Lifetime',
    modelName: '80387',
    spec: '6 ft (72" x 30") 접이식, 화이트',
    vendor: 'Costco (Tigard)',
    status: 'disposed' as const,
    disposedDate: '2026-06-30',
    disposalReason: '노후/파손',
    disposalNote: '천판 균열로 폐기. Metro 재활용 센터 반납 완료.',
  },
];

async function main() {
  const sample = process.argv.includes('--sample');

  console.log('▶ 기준정보 확인 중...');
  for (const b of DEFAULT_BUILDINGS) {
    await db.insert(buildings).values(b).onConflictDoNothing({ target: buildings.code });
  }
  for (const d of DEFAULT_DEPARTMENTS) {
    await db.insert(departments).values(d).onConflictDoNothing({ target: departments.code });
  }
  const [{ count: buildingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(buildings);
  const [{ count: deptCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(departments);
  console.log(`  건물 ${buildingCount}건 / 사역원 ${deptCount}건`);

  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  // 로그인은 아이디로 합니다. SEED_ADMIN_USERNAME 이 없으면 예전 설정 파일도 그대로
  // 동작하도록 SEED_ADMIN_EMAIL 의 앞부분(admin@church.org → admin)을 씁니다.
  const username =
    cleanUsername(process.env.SEED_ADMIN_USERNAME ?? '') || usernameFromEmail(email) || '';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  const name = process.env.SEED_ADMIN_NAME ?? '관리자';

  if (!username || !password) {
    console.log('▶ SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD 가 없어 관리자 계정은 건너뜁니다.');
  } else if (!isUsername(username)) {
    console.log(
      `▶ SEED_ADMIN_USERNAME '${username}' 이 규칙에 맞지 않아 계정을 만들지 않았습니다.`,
    );
    console.log(`  ${USERNAME_RULE_TEXT}`);
  } else if (password.length < 8) {
    console.log('▶ SEED_ADMIN_PASSWORD 가 8자 미만이라 관리자 계정을 만들지 않았습니다.');
  } else {
    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) {
      // 운영 중 계정의 비밀번호가 조용히 바뀌면 위험하므로 시드는 손대지 않습니다.
      console.log(`▶ 관리자 계정이 이미 있습니다: ${username}`);
      console.log('  비밀번호는 그대로 둡니다. SEED_ADMIN_PASSWORD 를 바꿨다면:');
      console.log('    npm run db:set-password');
    } else {
      await db.insert(users).values({
        username,
        email: email || null,
        name,
        passwordHash: await hash(password, 12),
        role: 'admin',
      });
      console.log(`▶ 관리자 계정 생성: 아이디 ${username}`);
    }
  }

  if (sample) {
    console.log('▶ 예시 자산 등록 중...');
    let created = 0;
    for (const item of SAMPLE_ASSETS) {
      const { parts, ...rest } = item;
      const assetNo = buildAssetNo(parts);
      const inserted = await db
        .insert(assets)
        .values({ assetNo, ...parts, ...rest })
        .onConflictDoNothing({ target: assets.assetNo })
        .returning({ id: assets.id, assetNo: assets.assetNo });
      if (inserted.length > 0) {
        created++;
        if (inserted[0].assetNo === '26-0101-0001') {
          await db.insert(maintenanceLogs).values([
            {
              assetId: inserted[0].id,
              kind: 'inspection',
              performedOn: '2026-05-10',
              description: '정기 음향 점검 — 배터리 교체, 주파수 재설정',
              performedBy: '음향팀 박OO',
            },
            {
              assetId: inserted[0].id,
              kind: 'repair',
              performedOn: '2026-07-22',
              description: '2번 채널 리시버 잡음 — 안테나 커넥터 교체',
              cost: '145.00',
              vendor: 'Sweetwater Service',
              performedBy: '외부 업체',
            },
          ]);
        }
      }
    }
    console.log(`  ${created}건 신규 등록`);
  }

  console.log('\n✅ 완료');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 시드 실패:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
