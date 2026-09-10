# 오레곤벧엘장로교회 자산관리시스템

교회 비품·자산을 등록하고, 자산번호 바코드 라벨을 출력하고, 스캔·조회로 상세내역을
확인·수정하는 웹 애플리케이션입니다.

- **호스팅** Vercel
- **데이터베이스** Neon (Serverless Postgres)
- **스택** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Drizzle ORM

---

## 1. 자산번호 규칙

```
26-0103-0001
│    │ │  └┴┴┴─ 물품 고유번호 4자리 (0001~9999, 등록 시 자동 부여)
│    │ └─────── 관리부서 번호 2자리 (01 예배사역원, 02 선교팀 …)
│    └───────── 건물/위치 번호 2자리 (01 비전, 02 은혜, 03 은혜성전, 04 창고 …)
└──┴─────────── 취득 연도 2자리 (2026년 → 26)
```

하이픈으로 **연도 / 위치·부서 / 순번** 세 덩어리로 끊어 적습니다. 숫자 10자리가
붙어 있으면 라벨을 보고 불러 주거나 손으로 옮겨 적을 때 자리를 놓치기 쉽습니다.

**모든 자리는 0 으로 채웁니다** (`1` 이 아니라 `01`). 자리수가 고정되어 있으면
목록 정렬이 곧 번호 순서가 되고(`01` < `02` < `10`), 다음 번호를 찾을 때 숫자 변환이
필요 없습니다. 취득연도는 2010년부터 선택할 수 있습니다.

건물/부서 번호는 **설정** 화면에서 자유롭게 추가·수정할 수 있습니다 (01~99).
고유번호는 `연도+건물+부서` 조합별로 다음 번호가 자동 제안되며 직접 바꿀 수도 있습니다.

바코드는 **Code 128** 규격으로, 시중 바코드 스캐너에서 그대로 읽힙니다.
바코드에는 **하이픈을 뺀 숫자 10자리**(`2601030001`)가 들어갑니다 — 숫자만이면 Code 128
이 두 자리를 한 심볼에 담아(Code Set C) 같은 라벨 폭에서 막대가 두 배 가까이 굵어지고,
그만큼 스캔이 잘 됩니다. 하이픈 없이 입력·스캔해도 앱이 같은 자산으로 찾아 줍니다.

## 2. 자산 대장 항목

| 항목 | 비고 |
| --- | --- |
| 자산번호 | 위 규칙에 따라 자동 생성 · 고유값 |
| 자산명 | 필수 |
| 관리부서 / 관리 팀명 | 부서은 번호 체계, 팀명은 자유 입력 |
| 설치 · 보관 장소 | |
| 취득일자 / 취득가액 | **미국 달러(USD)**. 센트까지 저장하며 입력 중 천 단위 구분기호 표시 |
| 제조사 / 모델명 / Serial Number / 규격 | |
| 구입처 | |
| 수리 · 점검 이력 | 건별로 날짜·내용·비용·업체·담당자, 누적 비용 자동 합산 |
| 폐기 기록 | 폐기일자·사유·상세. 폐기해도 대장에서 사라지지 않고 이력 보존 |
| 특이사항 | 기증자, 워런티 만료일, 비고 |
| 수량 / 상태 | 상태: 사용중 · 보관중 · 수리중 · 폐기 |

## 3. 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/login` | 로그인 |
| `/` | 대시보드 — 통계, 건물별 현황, 최근 등록·수리, 워런티 만료 예정, 통합 검색 |
| `/assets` | 자산 목록 — 검색·필터·정렬, 선택 라벨 출력, CSV 내보내기 |
| `/assets/new` | 자산 등록 — 자산번호·바코드 실시간 미리보기, 연속 등록 모드 |
| `/assets/[id]` | 상세 — 전체 항목, 바코드, 수리·점검 이력 추가, 폐기 처리 |
| `/assets/[id]/edit` | 수정 |
| `/scan` | 스캔·조회 — 바코드 스캐너 / 휴대폰 카메라 / 직접 입력 |
| `/labels` | 바코드 라벨 출력 — 규격 프리셋 + 직접 지정 |
| `/settings` | 건물·부서 코드 관리, 사용자 계정 관리 (관리자 전용) |
| `/account` | 내 계정 · 비밀번호 변경 |

로그인은 **아이디**(이메일이 아닙니다)와 비밀번호로 합니다. 계정은 관리자가
**설정 → 사용자 계정**에서 추가하며, 아이디는 나중에 바꿀 수 있습니다.

## 4. 권한

| 권한 | 조회 · 라벨 출력 | 자산 등록 · 수정 · 폐기 | 계정 · 기준정보 관리 | 완전 삭제 |
| --- | --- | --- | --- | --- |
| 조회자 `viewer` | ✅ | ❌ | ❌ | ❌ |
| 담당자 `manager` | ✅ | ✅ | ❌ | ❌ |
| 관리자 `admin` | ✅ | ✅ | ✅ | ✅ |

---

## 5. 처음 설치하기

### 5-0. Node 버전

**Node 20 이상이 필요합니다** (권장 22 LTS). Node 18 은 2025년 4월 지원이 종료되었고,
이 프로젝트가 쓰는 `@neondatabase/serverless` 가 Node 19+ 를 요구합니다.

```bash
node -v                      # v20 또는 v22 여야 합니다

# nvm 사용 시 (.nvmrc 가 있으므로)
nvm install && nvm use

# nvm 이 없다면 (Ubuntu / WSL)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
exec $SHELL
nvm install 22 && nvm alias default 22
```

Node 18 에서는 `npm install` 시 `EBADENGINE` 경고가 뜨고,
Neon 에 연결하는 `npm run db:seed` 가 실패할 수 있습니다.


### 5-1. Neon 데이터베이스 만들기

1. [neon.com](https://neon.com) 에 가입하고 프로젝트를 생성합니다.
2. **Connection string** 에서 **Pooled connection** 값을 복사합니다.
   `...-pooler...` 가 포함된 주소여야 합니다.

#### 리전은 서버 함수가 도는 곳과 맞추세요

**기준은 교회 위치가 아니라 서버리스 함수가 도는 리전입니다.**
사용자 ↔ 서버 왕복은 페이지당 1회지만, 서버 ↔ DB 왕복은 페이지당 여러 번 일어나기
때문에 이쪽 지연이 훨씬 크게 증폭됩니다. 두 리전이 갈리면 조회가 눈에 띄게 느려집니다.

**Netlify 에 올리는 경우** — 무료 플랜은 함수 리전을 고를 수 없습니다. 기본값이
미국 동부(AWS `us-east-2` 오하이오)이므로 Neon 도 **`us-east-2`**, 없으면
`us-east-1` (N. Virginia) 로 만드세요. 함수 리전 지정은 유료 플랜 기능입니다
(현재 기본 리전은 Netlify 문서에서 한 번 확인하세요 — 바뀔 수 있습니다).

**Vercel 에 올리는 경우** — **Project Settings → Functions → Function Region** 에서
고를 수 있습니다.

| Vercel 함수 리전 | 맞춰야 할 Neon 리전 |
| --- | --- |
| `pdx1` 오리건 (미국 서부) | `AWS us-west-2` (Oregon) |
| `sfo1` 샌프란시스코 | `AWS us-west-2` (Oregon) |
| `iad1` 워싱턴 D.C. — **Vercel 기본값** | `AWS us-east-1` (N. Virginia) |
| `icn1` 서울 / `hnd1` 도쿄 | `AWS ap-northeast-1` (Tokyo) |

- **미국 서부(오리건)에서 쓴다면** — Vercel `pdx1` + Neon `us-west-2` 조합이 가장
  빠릅니다. 사용자·서버·DB 가 모두 같은 지역에 모입니다.
- **절대 피해야 할 조합** — 함수는 동부, DB 는 서부처럼 갈라놓는 것.
  DB 왕복마다 대륙을 건너므로 가장 느립니다.

> **이미 Neon 프로젝트를 만든 뒤에 호스팅을 옮긴다면** 리전 조합이 어긋날 수 있습니다.
> Neon 은 생성 후 리전을 못 바꾸므로, 서부(`us-west-2`) DB 를 Netlify(동부 함수)에
> 붙이면 쿼리마다 대륙을 건넙니다. 페이지당 서너 번 왕복이면 0.2~0.3초 정도가
> 붙습니다 — 내부 업무용으로는 견딜 수 있지만, 신경 쓰인다면 Neon 프로젝트를 동부에
> 새로 만들고 데이터를 옮기는 편이 낫습니다.

> 리전 목록은 Neon 콘솔에서 실제로 제공되는 것 중에 고르세요 (제공 리전은 바뀝니다).
> 프로젝트를 만든 뒤에는 리전을 변경할 수 없으니, 생성 시점에 정해야 합니다.

### 5-2. 환경 변수 설정

`.env.example` 을 `.env.local` 로 복사한 뒤 값을 채웁니다.

```bash
cp .env.example .env.local
```

```ini
DATABASE_URL="postgresql://...-pooler...neon.tech/neondb?sslmode=require"
AUTH_SECRET="여기에-랜덤-문자열"          # openssl rand -base64 32
SEED_ADMIN_USERNAME="admin"              # 로그인 아이디
SEED_ADMIN_NAME="관리자"
SEED_ADMIN_PASSWORD="8자-이상-비밀번호"
SEED_ADMIN_EMAIL="admin@church.org"      # 선택 — 연락처용
```

> **로그인은 이메일이 아니라 아이디로 합니다.**
> 아이디 규칙: 영문 소문자로 시작하는 3~30자, 영문·숫자와 `.` `_` `-` 사용 가능
> (`admin`, `pastor.kim`). 대소문자는 구분하지 않습니다 — `Admin` 으로 입력해도
> `admin` 으로 찾습니다. 이메일은 연락처용 선택 항목이라 비워 두어도 됩니다.

> `AUTH_SECRET` 은 로그인 세션을 서명하는 키입니다. 외부에 노출하지 말고,
> 값을 바꾸면 기존 로그인 세션이 모두 만료됩니다.

### 5-3. 테이블 생성과 초기 데이터

```bash
npm install
npm run db:push        # 테이블 생성
npm run db:seed        # 기준정보(건물·부서) + 관리자 계정
```

예시 자산까지 넣어 화면을 미리 보려면:

```bash
npm run db:seed -- --sample
```

예시 자산이 이미 있는데 내용(구입처·모델명 등)을 최신 예시로 맞추고 싶다면:

```bash
npm run db:seed -- --sample --refresh
```

`--refresh` 는 **자산명이 예시와 같은 행만** 덮어씁니다. 예시와 같은 번호를 실제
자산이 쓰고 있으면 건드리지 않고 건너뛰며, 어떤 행도 삭제하지 않습니다.
수리·점검 이력은 날짜와 내용이 같은 것만 갱신하고 없는 것은 추가합니다.

### 5-4. 로컬 실행

```bash
npm run dev            # http://localhost:3000
```

`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` 로 로그인한 뒤,
**설정** 화면에서 실제 건물·부서 코드와 사용자 계정을 정리하세요.
로그인 후 **내 계정**에서 초기 비밀번호를 바꾸는 것을 권장합니다.

---

## 6. 배포

무료로 쓸 수 있는 곳은 Netlify 와 Vercel 둘 다입니다. 이 저장소에는
**Netlify 설정(`netlify.toml`)이 들어 있습니다.** 어느 쪽이든 빌드에는
데이터베이스 연결이 필요하지 않습니다.

> **Cloudflare Pages / Workers 무료 플랜은 쓸 수 없습니다.** 비밀번호 해싱
> (`src/lib/auth.ts` 의 bcrypt cost 12)에 요청당 0.7초 가까운 CPU 가 드는데, 무료
> 플랜의 한도는 요청당 10ms 입니다 — 로그인이 리소스 초과(`Error 1102`)로 실패합니다.
> Netlify Functions 는 CPU 시간이 아니라 실행 시간(10초)을 세므로 문제가 없습니다.
> Cloudflare 로 가려면 유료 Workers 플랜을 쓰거나 해싱 방식을 바꿔야 하고, 후자는
> 저장된 해시 형식이 달라져 전 사용자 비밀번호를 초기화해야 합니다.

### 6-1. Netlify (이 저장소의 기본 설정)

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Netlify 에서 **Add new site → Import an existing project** 로 저장소를 선택합니다.
   빌드 명령과 배포 폴더는 `netlify.toml` 에 있으므로 화면에서 고칠 것이 없습니다.
3. **Site configuration → Environment variables** 에 아래 두 개를 등록합니다.

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **Pooled** connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` 결과 |

   `SEED_*` 변수는 배포에 필요하지 않습니다 (시드 스크립트 전용).
   `NEXT_DIST_DIR` 은 **절대 등록하지 마세요** — 빌드 산출물 위치가 어긋나 모든
   경로가 404 가 됩니다.
4. **Deploy site** 를 누릅니다.

배포되는 모양은 이렇습니다.

| 이 앱의 구성 | Netlify 에서 |
| --- | --- |
| 서버 컴포넌트 · 서버 액션 | Netlify Functions (Node 런타임) |
| `src/middleware.ts` 로그인 검사 | Edge Function |
| `/api/assets/export` CSV | Netlify Functions |
| CSS · 이미지 · 라벨 화면의 정적 자원 | CDN |

Node 버전은 `.nvmrc` (22) 를 Netlify 가 그대로 읽습니다.

### 6-2. Vercel

1. **New Project → Import** 로 저장소를 선택합니다.
2. **Environment Variables** 에 위와 같은 두 개를 등록합니다 (Production / Preview 모두).
3. **Settings → Functions → Function Region** 이 Neon 리전과 같은 곳인지 확인합니다
   (5-1 의 표 참고). 기본값은 `iad1` 워싱턴 D.C. 입니다.
4. **Deploy** 를 누릅니다.

`netlify.toml` 이 있어도 Vercel 배포에는 아무 영향이 없습니다 (서로 다른 파일을 읽습니다).

> Vercel Marketplace 의 Neon 연동을 쓰면 `DATABASE_URL` 이 자동으로 주입되므로
> 2번의 `DATABASE_URL` 등록을 생략할 수 있습니다.

### 배포 후 스키마 변경

스키마를 수정했다면 로컬에서 프로덕션 `DATABASE_URL` 을 향해 한 번 실행합니다.

```bash
DATABASE_URL="<프로덕션 URL>" npm run db:push
```

---

## 7. 바코드 라벨 출력

`/labels` 화면에서 규격을 고르고 **인쇄** 를 누릅니다.
기본 규격은 **Brother DK-11209 (62 × 29 mm)** 입니다.

규격을 바꾸면 **바코드 높이와 글자 크기가 그 규격의 권장값으로 자동 조정**됩니다
(표시 항목 토글은 그대로 유지). 필요하면 `바코드 높이`·`글자 크기 배율`로 직접 미세조정할 수
있고, 마지막 설정은 브라우저에 저장됩니다.

| 규격 | 바코드 높이 | 글자 배율 | 모듈 폭 | 300dpi 점수 |
| --- | --- | --- | --- | --- |
| **Brother DK-11209** 62 × 29 (기본) | 12 mm | 1.15 | 0.399 mm | 4.7점 |
| Brother DK-1201 90 × 29 | 12 mm | 1.25 | 0.594 mm | 7.0점 |
| Brother DK-11204 54 × 17 | 7 mm | 0.85 | 0.357 mm | 4.2점 |
| 범용 50 × 25 | 9 mm | 1.0 | 0.322 mm | 3.8점 |
| A4 24칸 64.6 × 33.8 | 12 mm | 1.1 | 0.424 mm | 5.0점 |

`300dpi 점수` = 가장 얇은 막대 하나를 프린터 점 몇 개로 찍는지. 프린터는 점을 쪼갤 수 없어
최대 반올림 오차가 0.5점이므로, 점수가 클수록 막대 폭 오차(= 0.5 ÷ 점수)가 작아집니다.
**3점 이상이면 실용상 안전**하고, 정수에 가까울수록 좋습니다.

바코드는 라벨 안쪽 폭을 **가득 채우도록 늘어납니다**. Code 128 은 정보를 가로 방향으로만
담고 늘어남이 모든 막대에 균일하게 적용되므로 판독에 문제가 없고, 모듈이 넓어질수록
스캔이 쉬워집니다. 좌우 여백은 규격이 요구하는 **10 모듈**을 항상 확보합니다.

### 규격 고르기

`docs/label-size-comparison.pdf` 를 **레터 용지에 배율 100%(실제 크기)로 인쇄**하면
DK-11209 (62 × 29 mm) 와 DK-11204 (54 × 17 mm) 가 실물 크기로 나옵니다.
오려서 TV·음향장비·테이블 등 실제 물건에 대보고 정하세요.
1쪽 위쪽에 **100 mm 배율 확인 자**가 있으니 인쇄 후 먼저 재어 보시면 됩니다.

**라벨 프린터 (브라더 QL · 다이모 · 지브라 등)**
- 프린터 드라이버에서 **용지 종류를 실제 라벨 규격(DK-1201 등)으로 먼저 지정**하세요.
- 브라우저 인쇄 창: 배율 **100%**, 여백 **없음**, 머리글·바닥글 **해제**.
- 라벨 1장 = 1페이지로 출력됩니다.
- DK 라벨은 모두 가로가 긴 형태(62 × 29, 90 × 29 등)입니다. 잘리거나 돌아서 나오면
  드라이버의 **용지 방향(가로/세로)** 을 앱의 가로·세로 값과 맞추세요.
- 감열 방식(QL 시리즈)은 시간이 지나면 변색됩니다. 창고 자산이나 손을 자주 타는 물건에는
  투명 라미네이트 오버레이를 덧붙이거나, 열전사 프린터 + PET 라벨을 쓰세요.

**A4 라벨지 (레이저 · 잉크젯)**
- 24칸(3×8) / 21칸(3×7) / 12칸(2×6) 프리셋이 있습니다.
- 칸 크기·용지 여백·칸 간격을 mm 단위로 직접 조정할 수 있습니다.
- **시작 칸 건너뛰기** 로 쓰다 남은 라벨지를 이어서 쓸 수 있습니다.

라벨 설정은 브라우저에 저장되므로 프린터가 바뀌지 않는 한 매번 다시 맞출 필요가 없습니다.
**첫 출력은 1~2장만 시험 인쇄해 스캐너로 읽히는지 확인하세요.**

## 8. 자산 스캔

- **USB / 블루투스 바코드 스캐너** — `/scan` 입력창을 한 번 클릭해 두면 스캔할 때마다
  자동으로 조회됩니다. 대부분의 스캐너가 키보드처럼 값을 입력하고 Enter 를 보내므로
  별도 설치나 설정이 필요하지 않습니다.
- **휴대폰 카메라** — `/scan` 에서 **카메라로 스캔**. 카메라는 **https 또는 localhost**
  에서만 동작합니다 (Vercel 배포 주소는 https 이므로 그대로 사용 가능).
- **직접 입력** — 하이픈은 없어도 됩니다. `2611001` → `26-11001` 로 인식합니다.

---

## 9. 로그인이 안 될 때

먼저 진단부터 돌리세요. `.env.local` 의 값은 출력하지 않고 상태만 보여줍니다.

```bash
npm run db:doctor
```

로그인 화면의 오류 문구는 **원인을 구분하지 않습니다**(계정이 있는지 없는지가 새지
않도록 일부러 그렇게 만들었습니다). 그래서 화면만 보고는 원인을 알 수 없고, 위 명령이
어디가 문제인지 알려 줍니다.

| 진단 결과 | 해결 |
| --- | --- |
| 테이블이 없음 | `npm run db:push` |
| **`users.username` 칸이 없음** | `npm run db:add-username` (10장 참고) |
| 등록된 사용자 0명 | `npm run db:seed` |
| **비밀번호가 DB 의 해시와 다름** | `npm run db:set-password` |
| 아이디를 모름 | `npm run db:doctor` 가 등록된 아이디를 그대로 보여 줍니다 |
| 계정이 사용 중지 | 다른 관리자로 로그인해 설정 화면에서 사용으로 변경 |
| `AUTH_SECRET` 16자 미만 | `openssl rand -base64 32` 로 다시 생성 |
| 연결 실패 | Neon 콘솔에서 프로젝트 상태와 **Pooled** 연결 문자열 확인 |

> **왜 비밀번호가 어긋나는가** — `npm run db:seed` 는 이미 있는 계정의 비밀번호를
> 바꾸지 않습니다. 운영 중 계정이 시드 한 번에 조용히 바뀌면 위험하기 때문입니다.
> 그래서 시드한 뒤 `.env.local` 의 `SEED_ADMIN_PASSWORD` 를 수정해도 DB 는 예전 값을
> 그대로 갖고 있습니다. `npm run db:set-password` 가 이 둘을 맞춰 줍니다.

### Netlify 에서 모든 경로가 404

`NEXT_DIST_DIR` 이 사이트 환경 변수에 들어가 있으면 빌드 산출물이 `.next` 가 아닌
곳에 생겨서 Next.js 런타임이 아무것도 찾지 못합니다. 이 변수는 로컬에서 개발 서버를
켜 둔 채로 프로덕션 빌드를 확인할 때만 쓰는 것입니다 — 배포 환경에서는 지우세요.

### Netlify 빌드가 "Secrets scanning" 에서 실패

`DATABASE_URL` 이나 `AUTH_SECRET` 의 값이 빌드 산출물에서 발견되면 Netlify 가 배포를
막습니다. 이 앱은 두 값을 서버에서만 읽으므로 정상이라면 걸리지 않지만, 걸렸다면
값이 실제로 클라이언트 번들에 새고 있다는 뜻이니 **먼저 원인을 찾으세요.**
검사를 끄는 `SECRETS_SCAN_ENABLED=false` 는 문제를 감추는 것입니다.

### 브라우저 확장 프로그램 때문에 나는 하이드레이션 오류

개발 모드에서 `Hydration failed because the server rendered HTML didn't match the client`
가 뜨고 오류 안에 `data-lastpass-icon-root` 같은 흔적이 보이면, **비밀번호 관리자
확장 프로그램**이 React 로딩 전에 DOM 을 건드린 것입니다. `Recoverable Error` 라
앱은 정상 동작하고 프로덕션 빌드에서는 보이지 않습니다. 확장을 끄면 사라집니다.

## 10. 예전 데이터 이관

규칙이 바뀌기 전에 만든 데이터베이스를 올리는 작업입니다. **각각 한 번만** 실행하면
되고, 여러 번 실행해도 안전합니다. 새로 설치하는 경우에는 해당 없습니다.

### 이메일 로그인에서 아이디 로그인으로 옮기기

이메일로 로그인하던 시절에 만든 데이터베이스라면 한 번만 실행하면 됩니다.

```bash
npm run db:add-username
npm run db:push          # 스키마 일치 확인 — "No changes detected" 가 나와야 정상
npm run db:doctor
```

`db:add-username` 은 `users.username` 칸을 추가하고 **이메일 앞부분으로 아이디를
채웁니다** (`admin@church.org` → `admin`). 여러 번 실행해도 안전하고, 끝나면 계정별
아이디를 출력하므로 그 값으로 로그인하면 됩니다. **비밀번호는 그대로입니다.**

`drizzle-kit push` 만으로는 할 수 없는 작업입니다 — 이미 행이 있는 테이블에
`not null unique` 칸을 그냥 추가하면 채울 값이 없어 실패하기 때문입니다.

이메일 앞부분이 규칙에 맞지 않으면(3자 미만, 숫자로 시작 등) `user3` 처럼 id 를 붙인
아이디가 만들어지고, 이미 쓰는 아이디와 겹치면 `admin2` 가 됩니다. 마음에 들지 않으면
**설정 → 사용자 계정**에서 아이디 칸을 고쳐 저장하세요.

### 자산번호를 새 형식으로 옮기기

`YY-BDSSS` (건물 1자리 · 부서 1자리 · 고유번호 3자리) 로 쓰던 데이터베이스라면
한 번만 실행하면 됩니다.

```bash
npm run db:widen-asset-no
npm run db:push          # "No changes detected" 가 나와야 정상
```

칸 폭을 넓히고, 값에 0 을 채우고(`1` → `01`, `001` → `0001`), 자산번호를 다시
만듭니다(`26-13001` → `26-0103-0001`). 여러 번 실행해도 안전합니다.

> **이미 붙여 둔 라벨은 번호가 달라집니다.** 스크립트가 바뀐 번호를 전부 출력하니,
> 그 자산들의 라벨은 다시 인쇄해 붙이세요. 예전 번호로 스캔·검색해도 앱이 새 번호의
> 자산을 찾아 주므로(`parseAssetNo` 가 7자리 입력을 올려 줍니다) 당장 업무가 막히지는
> 않습니다.

---

## 11. 개발자 참고

### 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run db:push` | 스키마를 데이터베이스에 반영 |
| `npm run db:generate` | 마이그레이션 SQL 생성 |
| `npm run db:studio` | Drizzle Studio (데이터 조회·편집) |
| `npm run db:seed` | 기준정보 + 관리자 계정 (`-- --sample` 로 예시 자산, `--refresh` 로 예시 갱신) |
| `npm run db:add-username` | 이메일 로그인 시절 DB 에 아이디 칸 추가 · 값 채우기 (한 번만) |
| `npm run db:widen-asset-no` | 예전 자산번호(`YY-BDSSS`)를 새 형식(`YY-BBDD-SSSS`)으로 변환 (한 번만) |
| `npm run db:doctor` | 설정 진단 — 연결·테이블·계정·비밀번호를 확인 (값은 출력하지 않음) |
| `npm run db:set-password` | 계정 비밀번호를 `.env.local` 의 값으로 재설정 |
| `npm run test:unit` | 자산번호·바코드 단위 테스트 |

### 폴더 구조

```
src/
├─ actions/          서버 액션 (쓰기 경로). 'use server' 는 이 폴더에만 둡니다.
├─ app/
│  ├─ (app)/         로그인이 필요한 화면 (공통 헤더·네비게이션)
│  ├─ api/           CSV 내보내기 라우트 핸들러
│  ├─ labels/        라벨 출력 (인쇄 전용 레이아웃, 헤더 없음)
│  └─ login/
├─ components/       화면 구성 요소
├─ db/
│  ├─ client.ts      드라이버 선택 (Neon HTTP / 로컬 Postgres)
│  ├─ index.ts       앱에서 쓰는 진입점 (server-only)
│  ├─ schema.ts      Drizzle 스키마
│  └─ seed.ts        초기 데이터
├─ lib/
│  ├─ asset-no.ts    자산번호 생성·파싱 (단위 테스트 있음)
│  ├─ code128.ts     Code 128 인코더 → SVG (의존성 없음)
│  ├─ labels.ts      라벨 규격 프리셋 · 인쇄 CSS
│  ├─ queries.ts     읽기 쿼리 (server-only)
│  ├─ auth.ts        인증 헬퍼 (server-only)
│  └─ session.ts     세션 JWT (Edge 런타임 호환)
└─ middleware.ts     로그인 여부 확인 후 리다이렉트
```

### 로고 바꾸기

`public/logo.jpg` 를 교체하면 헤더와 로그인 화면에 함께 반영됩니다.
브라우저 탭 아이콘은 `src/app/icon.jpg` 이므로 같이 바꿔 주세요.

```bash
cp 새로고.jpg public/logo.jpg
cp 새로고.jpg src/app/icon.jpg
```

정사각형 이미지를 권장합니다(현재 447 × 447). 배경이 투명한 PNG 를 쓰면
로그인 화면의 흰 카드 없이도 자연스럽게 보입니다.

### 이름 바꾸기

기관·앱 이름은 [`src/lib/app-info.ts`](src/lib/app-info.ts) 한 곳에만 있습니다.

```ts
export const ORG_NAME = '오레곤벧엘장로교회';
export const APP_SHORT_NAME = '자산관리시스템';
```

헤더·로그인 화면·브라우저 탭 제목·라벨의 교회명 기본값이 모두 이 값을 씁니다.

### 의존성 보안

```bash
npm audit          # 남은 4건은 아래 사유로 수용한 것입니다
```

`drizzle-kit` → `@esbuild-kit/*` → `esbuild@0.18` 경로의 **moderate 4건**이 남아 있습니다.

- 해당 취약점(GHSA-67mh-4wv8-2f99)은 **`esbuild --serve` 개발 서버**가 실행 중일 때만
  성립합니다. `drizzle-kit` 은 esbuild 를 `drizzle.config.ts` 를 읽는 용도로만 쓰고
  개발 서버를 띄우지 않으므로 이 앱에는 해당하지 않습니다.
- `drizzle-kit@0.31.10` 이 최신이라 올려서 해결할 수 없고, `npm audit fix --force` 는
  `drizzle-kit@0.18` 로 **다운그레이드**를 제안하는데 그러면 설정 파일 형식이 깨집니다.
- `esbuild` 를 `overrides` 로 올려 보았으나 `@esbuild-kit/core-utils` 가 구버전 API 에
  묶여 있어 설치가 `invalid` 상태로 남습니다. 그래서 되돌렸습니다.
- 이 의존성은 **devDependency** 이므로 배포된 앱에는 포함되지 않습니다.

`package.json` 의 `overrides` 로 처리한 것:

| 패키지 | 이유 |
| --- | --- |
| `postcss ^8.5.28` | Next 가 핀으로 물고 있던 8.4.31 의 XSS·경로탐색 권고 해소 |
| `sharp ^0.35.4` | libvips 취약점 권고 해소. 이 앱은 `next/image` 를 쓰지 않아 실제로 설치되지 않습니다 |

### 설계상 유의점

- **로그인 아이디 규칙은 `src/lib/username.ts` 한 곳에만** 있습니다. 로그인 화면,
  서버 액션, 시드·이관 스크립트가 모두 이 파일을 import 합니다. 규칙을 두 군데 쓰면
  화면에서 통과한 아이디가 저장에서 거부됩니다. 입력은 항상 `cleanUsername` 으로
  소문자로 접어서 비교합니다 — 그래야 `Admin` 과 `admin` 이 다른 계정이 되지 않습니다.
- **세션 토큰에는 `username` 이 들어갑니다** (`src/lib/session.ts`). 이메일이 담긴
  예전 토큰은 `verifySession` 이 무효로 판정해 자동으로 로그인 화면으로 보냅니다.
- **`src/lib/auth.ts` 에 `'use server'` 를 붙이지 마세요.** 그러면 `createSessionCookie`
  같은 함수가 클라이언트에서 호출 가능한 엔드포인트로 노출되어, 누구든 임의 권한으로
  세션을 발급받을 수 있습니다. 서버 액션은 `src/actions/*` 에만 둡니다.
- **바코드는 서버에서 SVG 로 렌더링**됩니다 (`src/lib/code128.ts`). 클라이언트
  JavaScript 없이 첫 HTML 응답에 포함되므로, 라벨 인쇄가 하이드레이션을 기다리지 않습니다.
- **`server-only` 표시**가 붙은 모듈(`db/index.ts`, `lib/queries.ts`, `lib/auth.ts`)을
  클라이언트 컴포넌트에서 import 하면 빌드가 실패합니다. 타입만 필요하면
  `import type` 을 쓰세요.
- **로컬 Postgres 지원** — `DATABASE_URL` 호스트가 `*.neon.tech` 가 아니면 자동으로
  `pg` (TCP) 드라이버를 씁니다. 도커로 로컬 개발할 때 유용합니다.

  ```bash
  docker run -d --name church-pg -e POSTGRES_PASSWORD=devpass \
    -e POSTGRES_DB=asset_dev -p 55432:5432 postgres:16-alpine
  # DATABASE_URL="postgresql://postgres:devpass@127.0.0.1:55432/asset_dev"
  ```

- **개발 서버를 켜 둔 채 프로덕션 빌드를 확인할 때는 출력 폴더를 따로 지정하세요.**
  `next dev` 는 `.next` 를 개발 모드로 계속 덮어써서, 그 상태로 `next start` 를 띄우면
  모든 경로가 404 가 됩니다 (원인을 알기 어려운 증상입니다).

  ```bash
  NEXT_DIST_DIR=.next-verify npm run build
  NEXT_DIST_DIR=.next-verify npx next start -p 3411
  ```

- **폐기는 삭제가 아닙니다.** 폐기 처리는 상태 변경 + 기록이고, 자산과 수리 이력은
  그대로 남습니다. 되돌릴 수 없는 완전 삭제는 관리자만 할 수 있습니다.
- **기준정보 코드 삭제** — 해당 코드를 쓰는 자산이 있으면 삭제하지 않고 `사용 안함`
  으로 바꿉니다. 이미 부여된 자산번호가 깨지지 않도록 하기 위함입니다.
