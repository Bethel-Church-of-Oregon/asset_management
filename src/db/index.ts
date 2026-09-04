import 'server-only';

/**
 * 앱(서버 컴포넌트·서버 액션)에서 쓰는 DB 진입점.
 *
 * 실제 드라이버 선택은 `./client` 에 있습니다. 이 파일은 `server-only` 를 달아
 * 클라이언트 컴포넌트가 실수로 DB 를 import 하면 빌드가 실패하도록 막습니다.
 * CLI 스크립트(seed 등)는 `./client` 를 직접 import 하세요.
 */
export { db, isNeonUrl, schema, type Database } from './client';
