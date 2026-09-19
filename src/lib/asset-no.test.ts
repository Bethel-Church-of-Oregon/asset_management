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
  SEQ_MAX,
  buildAssetNo,
  isCode,
  isSeq,
  isValidAssetNo,
  isYearCode,
  normalizeAssetNo,
  parseAssetNo,
  toCode,
  toSeq,
  toYearCode,
} from './asset-no';
import * as zx from '@zxing/library';
import { QR_QUIET_ZONE_MODULES, qrMatrix, qrModuleMm } from './qr';
import {
  DEFAULT_CONTENT,
  LABEL_PRESETS,
  qrGapMm,
  measureContentFit,
  presetContentDefaults,
  presetToLayout,
} from './labels';
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

test('isYearCode / isCode / isSeq 는 저장 형식만 통과시킨다', () => {
  // 이 검사가 자리수와 어긋나면 번호 제안이 조용히 실패합니다 (실제로 겪은 버그).
  assert.equal(isYearCode('26'), true);
  for (const bad of ['2', '260', '2a', '']) assert.equal(isYearCode(bad), false, `year ${bad}`);

  for (const ok of ['01', '09', '10', '99']) assert.equal(isCode(ok), true, `code ${ok}`);
  for (const bad of ['1', '001', '0a', '', ' 01']) assert.equal(isCode(bad), false, `code ${bad}`);

  for (const ok of ['0001', '0999', '9999']) assert.equal(isSeq(ok), true, `seq ${ok}`);
  for (const bad of ['1', '001', '00001', '000a', ''])
    assert.equal(isSeq(bad), false, `seq ${bad}`);

  // 폼이 만들어 넘기는 값은 그대로 통과해야 합니다.
  assert.equal(isCode(toCode(1)), true);
  assert.equal(isSeq(toSeq(1)), true);
  assert.equal(isSeq(toSeq(SEQ_MAX)), true);
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
    '2601030001', // 스캐너가 하이픈 없이 넘겨 주는 형태 (실제 QR 값)
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

test('assetNoBarcodeValue 는 하이픈을 모두 지워 숫자 모드로 만든다', () => {
  assert.equal(assetNoBarcodeValue(EXAMPLE_ASSET_NO), '2601030001');
  // 숫자만이면 QR 이 Numeric 모드로 인코딩해 같은 내용이 더 작은 심볼에 들어갑니다.
  assert.match(assetNoBarcodeValue(EXAMPLE_ASSET_NO), /^\d+$/);
  assert.doesNotMatch(EXAMPLE_ASSET_NO, /^\d+$/);
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
 * QR 을 실제 디코더로 되읽어 검증합니다.
 *
 * 인코딩 라이브러리를 그대로 믿지 않고, 화면·라벨에 나가는 것과 같은 모듈 행렬을
 * 비트맵으로 펴서 zxing 으로 읽습니다. 마스킹이나 오류정정이 틀어지면 여기서
 * 걸립니다.
 */
function decodeQr(value: string): string {
  const m = qrMatrix(value);
  const scale = 8;
  const span = m.countWithQuietZone;
  const px = span * scale;
  const lum = new Uint8ClampedArray(px * px).fill(255);
  for (let r = 0; r < m.count; r++) {
    for (let c = 0; c < m.count; c++) {
      if (!m.dark[r][c]) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          lum[
            ((QR_QUIET_ZONE_MODULES + r) * scale + y) * px + (QR_QUIET_ZONE_MODULES + c) * scale + x
          ] = 0;
        }
      }
    }
  }
  const bitmap = new zx.BinaryBitmap(
    new zx.HybridBinarizer(new zx.RGBLuminanceSource(lum, px, px)),
  );
  // PURE_BARCODE: 사진이 아니라 딱 맞게 그린 비트맵이므로 검출 단계를 건너뜁니다.
  // 이 힌트가 없으면 zxing 의 파인더 패턴 탐색이 이런 작은 합성 이미지에서
  // 가끔 헛돕니다 (실제 촬영 경로에서는 같은 값이 문제없이 읽힙니다).
  const hints = new Map();
  hints.set(zx.DecodeHintType.PURE_BARCODE, true);
  return new zx.QRCodeReader().decode(bitmap, hints).getText();
}

test('QR 인코딩을 디코더로 되읽어 검증', () => {
  for (const text of ['2601030001', '2604020123', '0000000000', '9999999999']) {
    assert.equal(decodeQr(text), text);
  }
});

test('자산번호 전체가 가장 작은 QR(버전 1)에 들어간다', () => {
  // 버전이 커지면 같은 라벨에서 모듈이 얇아져 스캔이 어려워집니다.
  for (const building of ['01', '09', '10', '42', '99']) {
    for (const dept of ['01', '09', '10', '42', '99']) {
      for (const seq of ['0001', '9999']) {
        const no = buildAssetNo({ yearCode: '26', buildingCode: building, deptCode: dept, seq });
        const m = qrMatrix(assetNoBarcodeValue(no));
        assert.equal(m.count, 21, `${no} 가 버전 1 을 넘었습니다`);
        assert.equal(decodeQr(assetNoBarcodeValue(no)), assetNoBarcodeValue(no));
      }
    }
  }
});

test('가장 작은 프리셋에서도 QR 모듈이 스캔 가능한 굵기다', () => {
  // 휴대폰으로 읽으려면 0.4mm 는 넘어야 합니다 (실측: 0.43mm 에서 640x480 이 실패).
  const m = qrMatrix(assetNoBarcodeValue(EXAMPLE_ASSET_NO));
  for (const preset of LABEL_PRESETS) {
    const mm = qrModuleMm(m, preset.qrSizeMm);
    assert.ok(mm >= 0.4, `${preset.name}: 모듈 ${mm.toFixed(3)}mm 는 너무 얇습니다`);
  }
});

test('QR 정적여백이 사방으로 확보된다', () => {
  // QR 은 심볼 둘레에 4모듈의 빈 여백이 있어야 디코더가 경계를 찾습니다.
  //  - 글자 쪽: 실제로 잉크가 찍히므로 규격대로 4모듈.
  //  - 라벨 가장자리 쪽: 인쇄되지 않는 흰 바탕이 이어지므로 라벨 높이로 잽니다.
  const m = qrMatrix(assetNoBarcodeValue(EXAMPLE_ASSET_NO));
  for (const preset of LABEL_PRESETS) {
    const moduleMm = qrModuleMm(m, preset.qrSizeMm);

    const toText = qrGapMm(preset.qrSizeMm) / moduleMm;
    assert.ok(toText >= QR_QUIET_ZONE_MODULES, `${preset.name}: 글자 쪽 ${toText.toFixed(1)}모듈`);

    const vertical = (preset.heightMm - preset.qrSizeMm) / 2 / moduleMm;
    assert.ok(vertical >= QR_QUIET_ZONE_MODULES, `${preset.name}: 상하 ${vertical.toFixed(1)}모듈`);

    // 왼쪽은 라벨 끝이라 그 너머를 여백으로 칠 수 없습니다. 2모듈이면 휴대폰
    // 디코더가 충분히 읽습니다 (규격 4모듈은 레이저 스캐너 기준의 보수적인 값).
    const left = preset.paddingMm / moduleMm;
    assert.ok(left >= 2, `${preset.name}: 왼쪽 ${left.toFixed(1)}모듈`);
  }
});

test('모든 프리셋이 기본 표시 항목을 담을 수 있다', () => {
  // 화면 경고(`measureContentFit`)와 실제 라벨(`LabelCell`)이 어긋나면
  // 통과했다고 나온 설정이 인쇄에서 잘립니다.
  for (const preset of LABEL_PRESETS) {
    const content = { ...DEFAULT_CONTENT, ...presetContentDefaults(preset) };
    const fit = measureContentFit(presetToLayout(preset), content, false);
    assert.ok(fit.fits, `${preset.name}: 기본 설정이 넘칩니다 (${fit.neededMm.toFixed(1)}mm)`);
  }
});

test('QR 크기가 라벨 안쪽 높이를 넘지 않는다', () => {
  for (const preset of LABEL_PRESETS) {
    const inner = preset.heightMm - preset.paddingMm * 2;
    assert.ok(preset.qrSizeMm <= inner, `${preset.name}: QR ${preset.qrSizeMm}mm > ${inner}mm`);
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
