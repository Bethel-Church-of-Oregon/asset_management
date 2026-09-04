/**
 * 로그인 아이디(username) 규칙 — 화면·서버 액션·CLI 스크립트가 모두 이 파일을 씁니다.
 *
 * 서버에만 있으면 화면에서 통과한 값이 저장에서 거부되고, 화면에만 있으면
 * 검증을 우회할 수 있습니다. `server-only` 를 붙이지 않는 순수 모듈로 둡니다.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/**
 * 소문자 영문으로 시작하고, 이어서 영문·숫자·`.` `_` `-` 만 허용합니다.
 *
 * 소문자로 제한하는 이유: 대소문자를 섞어 받으면 `Admin` 과 `admin` 이 서로 다른
 * 계정이 되어 로그인 실패의 원인을 알기 어려워집니다. 입력은 `cleanUsername` 이
 * 소문자로 접어서 넘기므로 사용자는 아무렇게나 타이핑해도 됩니다.
 * 숫자로 시작하지 못하게 한 것은 자산번호(`26-11001`)와 눈으로 구분되게 하려는 것입니다.
 */
export const USERNAME_PATTERN = new RegExp(
  `^[a-z][a-z0-9._-]{${USERNAME_MIN - 1},${USERNAME_MAX - 1}}$`,
);

export const USERNAME_RULE_TEXT = `영문 소문자로 시작하는 ${USERNAME_MIN}~${USERNAME_MAX}자 (영문·숫자·. _ - 사용 가능)`;

/** 입력값 정규화 — 앞뒤 공백을 버리고 소문자로 접습니다. 로그인·저장 양쪽에서 씁니다. */
export function cleanUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

/**
 * 이메일에서 아이디 후보를 만듭니다 — 기존 계정 이관과 시드 기본값에 씁니다.
 * 규칙에 맞는 값을 못 만들면 `null` (호출한 쪽이 대체 값을 정합니다).
 */
export function usernameFromEmail(email: string): string | null {
  const local = cleanUsername(email).split('@')[0] ?? '';
  const stripped = local
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[^a-z]+/, '')
    .slice(0, USERNAME_MAX);
  return isUsername(stripped) ? stripped : null;
}
