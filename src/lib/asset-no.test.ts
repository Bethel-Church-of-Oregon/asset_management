/**
 * Run with: npx tsx src/lib/asset-no.test.ts
 */
import assert from 'node:assert/strict';
import {
  assetNoFragment,
  buildAssetNo,
  isValidAssetNo,
  normalizeAssetNo,
  parseAssetNo,
  toSeq,
  toYearCode,
} from './asset-no';
import { encodeToModules, layoutBarcode } from './code128';
import { cleanMoneyInput, formatMoney, formatUsd, isMoneyAmount, parseMoneyInput } from './format';
import { cleanUsername, isUsername, usernameFromEmail } from './username';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

test('toYearCode formats full and short years', () => {
  assert.equal(toYearCode(2026), '26');
  assert.equal(toYearCode(2005), '05');
  assert.equal(toYearCode(2100), '00');
  assert.equal(toYearCode('1999'), '99');
});

test('toSeq pads to three digits', () => {
  assert.equal(toSeq(1), '001');
  assert.equal(toSeq(42), '042');
  assert.equal(toSeq(999), '999');
  assert.throws(() => toSeq(1000));
  assert.throws(() => toSeq(-1));
  assert.throws(() => toSeq(1.5));
});

test('buildAssetNo composes the documented format', () => {
  assert.equal(
    buildAssetNo({ yearCode: '26', buildingCode: '1', deptCode: '1', seq: '001' }),
    '26-11001',
  );
  assert.equal(
    buildAssetNo({ yearCode: '26', buildingCode: '4', deptCode: '2', seq: '123' }),
    '26-42123',
  );
});

test('buildAssetNo rejects malformed parts', () => {
  assert.throws(() =>
    buildAssetNo({ yearCode: '2', buildingCode: '1', deptCode: '1', seq: '001' }),
  );
  assert.throws(() =>
    buildAssetNo({ yearCode: '26', buildingCode: '11', deptCode: '1', seq: '001' }),
  );
  assert.throws(() => buildAssetNo({ yearCode: '26', buildingCode: '1', deptCode: '1', seq: '1' }));
});

test('parseAssetNo tolerates scanner and human input', () => {
  const want = { yearCode: '26', buildingCode: '1', deptCode: '1', seq: '001' };
  for (const input of ['26-11001', '2611001', ' 26-11001 ', '26 11001', '26_1_1_001', '26–11001']) {
    assert.deepEqual(parseAssetNo(input), want, `input: ${input}`);
  }
});

test('parseAssetNo rejects wrong lengths and shapes', () => {
  for (const input of ['', '26-1100', '26-110011', 'abcdefg', '2A-11001', '26-11A01']) {
    assert.equal(parseAssetNo(input), null, `input: ${input}`);
  }
});

test('normalizeAssetNo canonicalises to YY-BDSSS', () => {
  assert.equal(normalizeAssetNo('2611001'), '26-11001');
  assert.equal(normalizeAssetNo('  26 1 1 001'), '26-11001');
  assert.equal(normalizeAssetNo('nope'), null);
  assert.equal(isValidAssetNo('26-42007'), true);
  assert.equal(isValidAssetNo('26-4200'), false);
});

test('assetNoFragment keeps only code characters', () => {
  assert.equal(assetNoFragment(' 26-11 '), '2611');
  assert.equal(assetNoFragment('001'), '001');
});

test('every asset number in the scheme is Code128-encodable', () => {
  // Spot-check the whole grid of building/department codes at both seq bounds.
  for (const building of '123456789') {
    for (const dept of '123456789') {
      for (const seq of ['001', '999']) {
        const no = buildAssetNo({ yearCode: '26', buildingCode: building, deptCode: dept, seq });
        const modules = encodeToModules(no);
        assert.equal(modules.length, 123, `unexpected width for ${no}`);
        assert.ok(modules.startsWith('11010010000'), 'must start with Start-B');
        assert.ok(modules.endsWith('1100011101011'), 'must end with Stop');
      }
    }
  }
});

test('layoutBarcode produces sane geometry', () => {
  const layout = layoutBarcode('26-11001', { moduleWidth: 2, height: 60, fontSize: 14 });
  assert.equal(layout.width, (123 + 20) * 2);
  assert.equal(layout.barHeight, 60);
  assert.ok(layout.bars.length > 20);
  // Bars must be inside the drawing area and never overlap.
  let prevEnd = 0;
  for (const bar of layout.bars) {
    assert.ok(bar.x >= prevEnd, 'bars must not overlap');
    assert.ok(bar.x + bar.width <= layout.width, 'bar must fit inside viewBox');
    prevEnd = bar.x + bar.width;
  }
});

test('cleanMoneyInput strips currency formatting', () => {
  assert.equal(cleanMoneyInput('$1,234.56'), '1234.56');
  assert.equal(cleanMoneyInput('1,299'), '1299');
  assert.equal(cleanMoneyInput(' $ 79.00 '), '79.00');
  // 입력 도중 남은 끝점은 다듬습니다.
  assert.equal(cleanMoneyInput('1234.'), '1234');
  assert.equal(cleanMoneyInput(''), '');
});

test('isMoneyAmount matches numeric(14,2)', () => {
  for (const ok of ['0', '79', '79.0', '79.00', '1299.99', '12345678901', '12345678901.99']) {
    assert.equal(isMoneyAmount(ok), true, `should accept ${ok}`);
  }
  for (const bad of ['', '-1', '1.234', '1e5', '1,299', '$79', 'abc', '123456789012', '.5']) {
    assert.equal(isMoneyAmount(bad), false, `should reject ${bad}`);
  }
});

test('parseMoneyInput separates empty from invalid', () => {
  assert.equal(parseMoneyInput('$1,299.99'), '1299.99');
  assert.equal(parseMoneyInput('649'), '649');
  assert.equal(parseMoneyInput(''), null, '빈 값은 null');
  assert.equal(parseMoneyInput(null), null);
  assert.equal(parseMoneyInput('abc'), undefined, '형식 오류는 undefined');
  assert.equal(parseMoneyInput('1.234'), undefined, '센트 3자리는 거부');
});

test('formatUsd / formatMoney render US dollars', () => {
  assert.equal(formatUsd('1249.00'), '$1,249.00');
  assert.equal(formatUsd(649), '$649.00');
  assert.equal(formatUsd('0'), '$0.00');
  assert.equal(formatUsd(null), '—');
  assert.equal(formatUsd('abc'), '—');
  assert.equal(formatMoney('1249.5'), '1,249.50');
  assert.equal(formatMoney(79), '79.00');
  assert.equal(formatMoney(null), '');
});

test('money round-trips through input, storage and display', () => {
  // 사용자가 타이핑한 값 → 저장 문자열 → 화면 표기
  for (const [typed, stored, shown] of [
    ['$1,299.99', '1299.99', '$1,299.99'],
    ['649', '649', '$649.00'],
    ['79.5', '79.5', '$79.50'],
  ] as const) {
    const value = parseMoneyInput(typed);
    assert.equal(value, stored, `stored for ${typed}`);
    assert.equal(formatUsd(value!), shown, `shown for ${typed}`);
  }
});

test('cleanUsername folds case and trims', () => {
  assert.equal(cleanUsername('  Admin '), 'admin');
  assert.equal(cleanUsername('PASTOR.KIM'), 'pastor.kim');
  assert.equal(cleanUsername(''), '');
});

test('isUsername enforces the login id rule', () => {
  for (const ok of ['admin', 'pastor.kim', 'a_b-c', 'abc', 'a'.repeat(30)]) {
    assert.equal(isUsername(ok), true, `should accept ${ok}`);
  }
  for (const bad of [
    'ab', // 3자 미만
    'a'.repeat(31), // 30자 초과
    '1admin', // 숫자로 시작 — 자산번호와 헷갈립니다
    '.admin', // 기호로 시작
    'Admin', // 대문자 (cleanUsername 을 거치지 않은 값)
    'admin kim', // 공백
    'admin@church.org', // 이메일
    '관리자', // 한글
    '',
  ]) {
    assert.equal(isUsername(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('usernameFromEmail derives a login id for migration', () => {
  assert.equal(usernameFromEmail('admin@church.org'), 'admin');
  assert.equal(usernameFromEmail('Pastor.Kim@church.org'), 'pastor.kim');
  assert.equal(usernameFromEmail('john+asset@church.org'), 'johnasset');
  assert.equal(usernameFromEmail('123@church.org'), null); // 숫자만 남으면 못 씁니다
  assert.equal(usernameFromEmail('ab@church.org'), null); // 3자 미만
  assert.equal(usernameFromEmail('관리자@church.org'), null);
});

test('login id typed by the user survives normalisation', () => {
  // 모바일 키보드가 첫 글자를 대문자로 바꿔도 같은 계정으로 찾아야 합니다.
  for (const typed of ['Admin', ' admin ', 'ADMIN']) {
    const normalized = cleanUsername(typed);
    assert.equal(normalized, 'admin');
    assert.equal(isUsername(normalized), true);
  }
});

console.log(`\n${passed} test groups passed`);
