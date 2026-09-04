# 작업 규칙

## `.env.local` 은 절대 건드리지 않는다

`.env.local` 에는 사용자의 실제 Neon 연결 문자열과 `AUTH_SECRET` 이 들어 있다.
**읽지도, 덮어쓰지도, 지우지도 않는다.**

검증용 데이터베이스를 붙일 때는 파일을 수정하지 말고 **명령줄에 인라인으로** 넘긴다.
Next.js 와 dotenv 모두 이미 `process.env` 에 있는 값을 덮어쓰지 않으므로
(`src/lib/load-env.ts` 가 `override: false` 로 로드한다) 인라인 값이 항상 이긴다.

```bash
# 검증용 일회성 Postgres
docker run -d --name cam-verify \
  -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=asset_dev -p 55440:5432 postgres:16-alpine

TEST_DB="postgresql://postgres:devpass@127.0.0.1:55440/asset_dev"
TEST_SECRET="throwaway-verification-secret-not-for-production-000"

DATABASE_URL="$TEST_DB" npx drizzle-kit push --force
DATABASE_URL="$TEST_DB" AUTH_SECRET="$TEST_SECRET" \
  SEED_ADMIN_EMAIL="admin@church.org" SEED_ADMIN_PASSWORD="devpassword123" \
  npm run db:seed -- --sample

npm run build
DATABASE_URL="$TEST_DB" AUTH_SECRET="$TEST_SECRET" npx next start -p 3400

# 끝나면
docker rm -f cam-verify
```

작업이 끝나면 컨테이너와 **내가 띄운** `next start` 프로세스를 정리한다.
`next dev` 가 살아 있으면 `.next` 를 개발 모드로 계속 덮어써서
`next start` 가 모든 경로에 404 를 준다. 개발 서버를 끄는 대신 출력 폴더를 분리한다:

```bash
NEXT_DIST_DIR=.next-verify npm run build
NEXT_DIST_DIR=.next-verify DATABASE_URL="$TEST_DB" AUTH_SECRET="$TEST_SECRET" \
  npx next start -p 3411
```

사용자의 개발 서버가 켜져 있으면 **검증 빌드뿐 아니라 확인용 `npm run build` 도**
`NEXT_DIST_DIR` 로 분리한다. 그냥 돌리면 dev 가 쓰고 있는 `.next` 를 프로덕션
산출물로 덮어써서 사용자 화면이 이상해진다.

### 사용자의 개발 서버는 끄지 않는다

포트 없는 `next dev` 는 사용자의 `npm run dev` 다. 내가 죽일 수 있는 것은 내가 띄운
`-p 34xx` 프로세스뿐이다. 주의할 함정 두 가지:

- **`next.config.mjs` 를 수정하면 `next dev` 가 스스로 재시작하며 PID 가 바뀐다.**
  새 PID 를 "내가 띄운 것" 으로 착각하기 쉽다. 죽이기 전에 `ss -ltnp` 로 어느 포트를
  잡고 있는지 확인한다 (3000 이면 사용자 것).
- **`pkill -f 'next start -p 3411'` 은 그 명령을 실행하는 셸 자신도 죽인다** (exit 144).
  PID 를 확인해 `kill <pid>` 로 정확히 지정한다.

```bash
ps -eo pid,lstart,args | grep -E 'next dev|next-server|next start' | grep -v grep
ss -ltnp | grep -E ':3000|:34'
```

## 서버 액션은 `src/actions/*` 에만

`'use server'` 는 그 파일의 **모든 export 를 클라이언트에서 호출 가능한 엔드포인트로**
만든다. 특히 `src/lib/auth.ts` 에 붙이면 `createSessionCookie` 가 노출되어 누구든
임의 권한으로 세션을 발급받을 수 있다. 인증 헬퍼는 `import 'server-only'` 로 둔다.

`'use server'` 파일은 async 함수만 export 할 수 있다. 순수 헬퍼는 `src/lib/` 로 옮긴다.

## `server-only` 표시 모듈

`src/db/index.ts` · `src/lib/queries.ts` · `src/lib/auth.ts` 는 클라이언트에서 import 하면
빌드가 실패한다. 타입만 필요하면 `import type` 을 쓴다.
CLI 스크립트(seed)는 `server-only` 가 없는 `src/db/client.ts` 를 쓴다.

## 판정 로직은 한 곳에

같은 규칙을 화면과 서버가 각각 구현하면 화면에서 통과한 값이 저장에서 거부된다.

| 규칙 | 위치 | 쓰는 곳 |
| --- | --- | --- |
| 금액(달러·센트) | `cleanMoneyInput` · `isMoneyAmount` (`src/lib/format.ts`) | `MoneyInput`, `actions/assets.ts` |
| 날짜 유효성 | `isCalendarDate` (`src/lib/format.ts`) | `actions/assets.ts` |
| 자산번호 · 연도 목록 | `src/lib/asset-no.ts` | 폼·스캔·쿼리·라벨·시드·이관 |
| 로그인 아이디 | `src/lib/username.ts` | `LoginForm`, `UserManager`, `actions/auth.ts`, `actions/settings.ts`, `db/seed.ts`, `db/add-username.ts`, `db/doctor.ts`, `db/set-password.ts` |
| unique 위반 판정 | `src/lib/db-errors.ts` | `actions/assets.ts`, `actions/settings.ts` |

## 자산번호 형식

`YY-BBDD-SSSS` — 연도 2 · 건물 2 · 사역원 2 · 고유번호 4자리, 모두 0 으로 채운다.
하이픈은 표기용이다(사람이 옮겨 적기 쉽도록 세 덩어리로 끊음).
자리수를 고정해야 문자열 정렬이 번호 순서가 되고(`01` < `02` < `10`) "다음 번호"
조회에 숫자 변환이 필요 없다. 규칙·예시 번호·연도 목록은 모두 `src/lib/asset-no.ts`
(`EXAMPLE_ASSET_NO`, `ASSET_YEAR_MIN`, `assetYearOptions`) 에서 가져온다 —
화면 문구에 `26-0103-0001` 을 직접 쓰지 않는다. 하이픈이 두 개이므로
`assetNo.replace('-', '')` 는 하나만 지운다 — 숫자만 뽑을 때는 반드시
`assetNoBarcodeValue` 나 `assetNoFragment` 를 쓴다.

**바코드에는 하이픈을 뺀 숫자 10자리만 넣는다** (`assetNoBarcodeValue`). 숫자만이면
Code 128 이 Code Set C 로 두 자리를 한 심볼에 담아 62mm 라벨에서 모듈 폭이
0.32mm → 0.52mm 로 굵어진다. 하이픈을 그대로 인코딩하면 B 세트로 떨어져 예전
7자리(0.399mm)보다 얇아지고 스캔이 잘 안 된다. 사람이 읽는 줄은 `Barcode` 의
`text` prop 으로 따로 넘긴다.

예전 형식(`YY-BDSSS`)에서 올리는 것은 `npm run db:widen-asset-no` 다. `drizzle-kit
push` 는 칸 폭만 넓히고 값에 0 을 채우거나 `asset_no` 를 다시 만들지 못한다.
`parseAssetNo` 는 7자리 입력도 받아 새 형식으로 올려 준다 — 예전 라벨 스캔용이다.

## 시간대

교회는 오레곤에 있다. "오늘"·"올해" 는 `src/lib/format.ts` 의 `APP_TIME_ZONE`
(`America/Los_Angeles`) 기준이며 `today()` · `currentYear()` 로만 구한다.
서버(Vercel)는 UTC 로 돌고, 예전에 쓰던 `Asia/Seoul` 은 오레곤보다 하루 앞서
CSV 파일명·기본 날짜가 내일로 찍혔다.

## 로그인은 아이디로

이메일이 아니라 `users.username` 으로 로그인한다. 이메일은 nullable 선택 항목이다.
세션 토큰(`src/lib/session.ts`)에 담기는 것도 `username` 이다 — `email` 을 다시 넣지 않는다.
입력은 항상 `cleanUsername` 으로 소문자로 접어서 비교한다.

이미 행이 있는 `users` 에 `not null unique` 칸을 추가하는 것이므로 `drizzle-kit push`
만으로는 이관되지 않는다. `npm run db:add-username` (칸 추가 → 이메일 앞부분으로 백필
→ 제약 추가 → email not null 해제) 을 먼저 돌린다. 재실행해도 안전하고, 끝나면
`db:push` 가 `No changes detected` 여야 한다. 제약 이름은 drizzle 이 만드는 것과 같은
`users_username_unique` 로 맞춰 두었다 — 바꾸면 push 가 매번 드리프트를 보고한다.

## 라벨 치수

`measureContentFit()` (`src/lib/labels.ts`) 은 `LabelCell` (`src/components/LabelPrinter.tsx`)
의 쌓임 순서·마진·줄 높이(`leading-tight` = 1.25)를 손으로 재현한 계산이다.
**한쪽을 바꾸면 반드시 다른 쪽도 함께 맞춘다.** 어긋나면 넘침 경고가 거짓이 되고,
라벨은 `overflow: hidden` 이라 조용히 잘린다.

## 기관 이름 · 로고

- 이름: `src/lib/app-info.ts` 한 곳
- 로고: `public/logo.jpg` (헤더·로그인) + `src/app/icon.jpg` (탭 아이콘) — 둘 다 교체

## 통화

미국 달러. 금액 컬럼은 `numeric(14, 2)` — 센트를 담아야 하므로 `scale 0` 으로 바꾸지 않는다.

## 코드 포매팅

`.prettierrc` (printWidth 100 · singleQuote) 가 이 코드베이스의 스타일이다.
설정 없이 `npx prettier --write` 를 돌리면 전부 큰따옴표 80칸으로 바뀌어
관계없는 줄이 통째로 재포맷된다. 설정 파일이 사라졌는지 먼저 확인할 것.

## 검증 없이 완료 보고하지 않는다

타입체크·린트·단위테스트·프로덕션 빌드까지 통과시키고, DB 가 얽힌 변경은
위 일회성 Postgres 로 실제 동작을 확인한 뒤 보고한다.

```bash
npx tsc --noEmit && npx next lint && npm run test:unit && npm run build
```
