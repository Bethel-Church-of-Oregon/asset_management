/**
 * Run with: npx tsx src/lib/asset-no.test.ts
 */
import assert from 'node:assert/strict';
import {
  ASSET_NO_LENGTH,
  ASSET_YEAR_MIN,
  EXAMPLE_ASSET_NO,
  assetNoBarcodeValue,
  assetNoFragment,
  assetYearOptions,
  buildAssetNo,
  isValidAssetNo,
  normalizeAssetNo,
  parseAssetNo,
  toCode,
  toSeq,
  toYearCode,
} from './asset-no';
import { PATTERNS, codeSetFor, encodeToModules, layoutBarcode } from './code128';
import { BARCODE_QUIET_ZONE_MODULES } from './labels';
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

test('toCode pads building/department codes to two digits', () => {
  assert.equal(toCode(1), '01');
  assert.equal(toCode('3'), '03');
  assert.equal(toCode(99), '99');
  assert.throws(() => toCode(100));
  assert.throws(() => toCode(-1));
  assert.throws(() => toCode(1.5));
});

test('toSeq pads to four digits', () => {
  assert.equal(toSeq(1), '0001');
  assert.equal(toSeq(42), '0042');
  assert.equal(toSeq(9999), '9999');
  assert.throws(() => toSeq(10000));
  assert.throws(() => toSeq(-1));
  assert.throws(() => toSeq(1.5));
});

test('buildAssetNo composes the documented format', () => {
  assert.equal(
    buildAssetNo({ yearCode: '26', buildingCode: '01', deptCode: '03', seq: '0001' }),
    EXAMPLE_ASSET_NO,
  );
  assert.equal(
    buildAssetNo({ yearCode: '26', buildingCode: '04', deptCode: '02', seq: '0123' }),
    '26-0402-0123',
  );
  assert.equal(
    buildAssetNo({ yearCode: '26', buildingCode: '12', deptCode: '34', seq: '9999' }).length,
    ASSET_NO_LENGTH,
  );
});

test('buildAssetNo rejects malformed parts', () => {
  const parts = { yearCode: '26', buildingCode: '01', deptCode: '03', seq: '0001' };
  assert.throws(() => buildAssetNo({ ...parts, yearCode: '2' }));
  assert.throws(() => buildAssetNo({ ...parts, buildingCode: '1' }), '한 자리 코드는 거부');
  assert.throws(() => buildAssetNo({ ...parts, deptCode: '123' }));
  assert.throws(() => buildAssetNo({ ...parts, seq: '001' }), '세 자리 고유번호는 거부');
});

test('parseAssetNo tolerates scanner and human input', () => {
  const want = { yearCode: '26', buildingCode: '01', deptCode: '03', seq: '0001' };
  for (const input of [
    '26-0103-0001',
    '2601030001', // 스캐너가 하이픈 없이 넘겨 주는 형태 (실제 바코드 값)
    ' 26-0103-0001 ',
    '26 0103 0001',
    '26_01_03_0001',
    '26–0103–0001', // en dash
    '26-01030001', // 하이픈 하나만 쓰던 이전 표기도 같은 자산
  ]) {
    assert.deepEqual(parseAssetNo(input), want, `input: ${input}`);
  }
});

test('parseAssetNo upgrades the old 7-digit format', () => {
  // 예전 형식 라벨이 붙은 물품을 스캔해도 찾을 수 있어야 합니다.
  assert.deepEqual(parseAssetNo('26-13001'), {
    yearCode: '26',
    buildingCode: '01',
    deptCode: '03',
    seq: '0001',
  });
  assert.equal(normalizeAssetNo('2611001'), '26-0101-0001');
  assert.equal(normalizeAssetNo('26-42123'), '26-0402-0123');
});

test('parseAssetNo rejects wrong lengths and shapes', () => {
  for (const input of [
    '',
    '26-010300',
    '26-010300012',
    'abcdefghij',
    '2A-01030001',
    '260103000A',
  ]) {
    assert.equal(parseAssetNo(input), null, `input: ${input}`);
  }
});

test('normalizeAssetNo canonicalises to YY-BBDD-SSSS', () => {
  assert.equal(normalizeAssetNo('2601030001'), EXAMPLE_ASSET_NO);
  assert.equal(normalizeAssetNo('  26 01 03 0001'), EXAMPLE_ASSET_NO);
  assert.equal(normalizeAssetNo('nope'), null);
  assert.equal(isValidAssetNo('26-0402-0007'), true);
  assert.equal(isValidAssetNo('26-0402-000'), false);
});

test('assetNoFragment keeps only digits', () => {
  assert.equal(assetNoFragment(' 26-01 '), '2601');
  assert.equal(assetNoFragment('0001'), '0001');
  assert.equal(assetNoFragment('TV-26'), '26');
});

test('assetNoBarcodeValue strips both hyphens for Code Set C', () => {
  assert.equal(assetNoBarcodeValue(EXAMPLE_ASSET_NO), '2601030001');
  assert.equal(codeSetFor(assetNoBarcodeValue(EXAMPLE_ASSET_NO)), 'C');
  // 하이픈이 남아 있으면 Code Set B 로 떨어져 막대가 얇아집니다.
  assert.equal(codeSetFor(EXAMPLE_ASSET_NO), 'B');
  // 하이픈이 두 개라 String.replace 로는 한 개만 지워집니다 — 헬퍼를 쓰는 이유입니다.
  assert.equal(EXAMPLE_ASSET_NO.replace('-', '').length, ASSET_NO_LENGTH - 1);
});

test('assetYearOptions runs from this year back to ASSET_YEAR_MIN', () => {
  const options = assetYearOptions(2026);
  assert.equal(options.length, 2026 - ASSET_YEAR_MIN + 1);
  assert.deepEqual(options[0], { code: '26', label: '2026년 (26)' });
  assert.deepEqual(options[options.length - 1], { code: '10', label: '2010년 (10)' });
  // 목록 밖의 연도를 쓰는 자산도 수정 화면에서 연도가 비지 않아야 합니다.
  const withOld = assetYearOptions(2026, '08');
  assert.equal(withOld.length, options.length + 1);
  assert.equal(withOld[withOld.length - 1].code, '08');
  // 이미 목록에 있는 연도는 중복으로 들어가지 않습니다.
  assert.equal(assetYearOptions(2026, '26').length, options.length);
});

/**
 * Code 128 디코더 — 인코더와 반대 방향으로 짜서 검증에 씁니다.
 * 인코더의 패턴 표·검사문자 계산이 틀리면 여기서 걸립니다.
 */
function decodeCode128(modules: string): string {
  // 모듈 문자열을 굵기(run length) 목록으로 되돌립니다.
  const runs: number[] = [];
  for (let i = 0; i < modules.length;) {
    let n = 1;
    while (modules[i + n] === modules[i]) n++;
    runs.push(n);
    i += n;
  }
  // 6굵기 = 심볼 하나, 마지막 정지 문자만 7굵기입니다.
  const symbols: string[] = [];
  for (let i = 0; i + 6 <= runs.length; i += 6) {
    symbols.push(runs.slice(i, i + (runs.length - i === 7 ? 7 : 6)).join(''));
  }
  const values = symbols.map((s) => {
    const value = PATTERNS.indexOf(s);
    assert.ok(value >= 0, `알 수 없는 심볼: ${s}`);
    return value;
  });

  const stop = values.pop();
  assert.equal(stop, 106, '정지 문자');
  const check = values.pop();
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  assert.equal(check, sum % 103, '검사문자');

  const start = values.shift();
  if (start === 105) {
    return values.map((v) => String(v).padStart(2, '0')).join('');
  }
  assert.equal(start, 104, '시작 문자는 B 또는 C');
  return values.map((v) => String.fromCharCode(v + 32)).join('');
}

test('Code 128 인코딩을 디코더로 되읽어 검증', () => {
  for (const text of ['2601030001', '2604020123', '0000', '9999999999']) {
    assert.equal(codeSetFor(text), 'C', `${text} 는 C 세트여야 합니다`);
    assert.equal(decodeCode128(encodeToModules(text)), text);
  }
  for (const text of ['26-01030001', 'ABC-123', '26010300010']) {
    assert.equal(codeSetFor(text), 'B', `${text} 는 B 세트여야 합니다`);
    assert.equal(decodeCode128(encodeToModules(text)), text);
  }
});

test('Code Set C 가 규격 예시와 일치', () => {
  // '1234' → START_C(105) 12 34 검사문자((105+12+68)%103=82) STOP(106)
  const expected = ['211232', '112232', '131123', '121241', '2331112']
    .map((p) =>
      p
        .split('')
        .map((w, i) => (i % 2 === 0 ? '1' : '0').repeat(Number(w)))
        .join(''),
    )
    .join('');
  assert.equal(encodeToModules('1234'), expected);
});

test('every asset number in the scheme is Code128-encodable', () => {
  // 건물·사역원 코드 격자를 고유번호 양 끝값에서 훑습니다.
  for (const building of ['01', '09', '10', '42', '99']) {
    for (const dept of ['01', '09', '10', '42', '99']) {
      for (const seq of ['0001', '9999']) {
        const no = buildAssetNo({ yearCode: '26', buildingCode: building, deptCode: dept, seq });
        const modules = encodeToModules(assetNoBarcodeValue(no));
        assert.equal(modules.length, 90, `unexpected width for ${no}`);
        assert.ok(modules.startsWith('11010011100'), 'must start with Start-C');
        assert.ok(modules.endsWith('1100011101011'), 'must end with Stop');
        assert.equal(decodeCode128(modules), assetNoBarcodeValue(no));
      }
    }
  }
});

test('라벨 폭에서 막대가 예전보다 굵어진다', () => {
  // 62mm 라벨(인쇄 폭 57mm)에서의 모듈 폭. 스캔 성공률이 여기서 갈립니다.
  const moduleMm = (payload: string) =>
    57 / (encodeToModules(payload).length + BARCODE_QUIET_ZONE_MODULES * 2);
  const before = moduleMm('26-11001'); // 예전 7자리, B 세트
  const after = moduleMm(assetNoBarcodeValue(EXAMPLE_ASSET_NO)); // 새 10자리, C 세트
  assert.ok(after > before, `굵어져야 합니다: ${before.toFixed(3)} → ${after.toFixed(3)}`);
  // Code 128 권장 최소 X 치수(0.25mm) 이상이어야 합니다.
  assert.ok(after >= 0.25, `모듈 폭 ${after.toFixed(3)}mm 는 너무 얇습니다`);
});

test('layoutBarcode produces sane geometry', () => {
  const layout = layoutBarcode('2601030001', { moduleWidth: 2, height: 60, fontSize: 14 });
  assert.equal(layout.width, (90 + 20) * 2);
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
