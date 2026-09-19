/**
 * 자산번호용 QR 심볼.
 *
 * 인코딩만 `qrcode-generator` 에 맡기고(Reed-Solomon 오류정정·마스킹은 직접
 * 구현할 만한 것이 아닙니다) 그리는 것은 `QrCode` 컴포넌트가 직접 합니다 —
 * 서버에서 SVG 로 내보내야 첫 HTML 응답에 심볼이 들어가고, 인쇄가 하이드레이션을
 * 기다리지 않습니다.
 *
 * 왜 1D 가 아니라 QR 인가:
 * 작은 다이컷 라벨(DK-11204, 인쇄영역 47.9 × 14mm)에서 Code 128 은 110모듈을
 * 가로로만 늘어놓아야 해서 모듈이 0.46mm 까지 얇아지고, 640×480 카메라로 15cm
 * 거리에서는 모듈당 1.4픽셀뿐이라 디코딩에 실패합니다. 같은 라벨에 들어가는
 * 11mm QR 은 21 × 21 이라 모듈이 0.52mm 이고, 2차원이라 같은 픽셀 수로 훨씬
 * 많은 정보를 담아 같은 조건에서 읽힙니다. 오류정정(H, 30% 복구)까지 있고
 * 방향도 가리지 않습니다. 휴대폰으로만 찍는 환경이라 QR 이 확실히 유리합니다.
 */
import qrcode from 'qrcode-generator';

/**
 * 오류정정 수준. 30% 까지 복구하는 H 를 씁니다.
 *
 * 자산번호는 하이픈을 뺀 숫자 10자리(`assetNoBarcodeValue`)라 숫자 모드로
 * 인코딩되고, 그러면 **가장 작은 버전 1(21 × 21)에 H 를 걸고도** 남습니다
 * (버전 1 + H 의 숫자 용량은 17자리). 라벨이 긁히거나 이물질이 묻어도
 * 읽히므로 창고·예배당에 붙이는 물건에 적합합니다.
 */
const ERROR_CORRECTION = 'H' as const;

/**
 * QR 규격이 요구하는 최소 여백 — 사방 4모듈.
 *
 * 라벨 바탕이 흰색이라 심볼 밖의 흰 여백이 그대로 정적여백 구실을 합니다.
 * 그래도 SVG 안에 넣어 두는 이유는, 옆 칸의 글자가 바싹 붙는 것을 막기
 * 위해서입니다.
 */
export const QR_QUIET_ZONE_MODULES = 4;

export type QrMatrix = {
  /** 한 변의 모듈 수 (정적여백 제외). 버전 1 이면 21. */
  count: number;
  /** `dark[row][col]` — true 면 검은 모듈. */
  dark: boolean[][];
  /** 정적여백을 포함한 한 변의 모듈 수. SVG viewBox 에 씁니다. */
  countWithQuietZone: number;
};

/**
 * 값을 QR 모듈 행렬로 바꿉니다.
 *
 * 버전은 0(자동)으로 두어 내용이 길어져도 실패하지 않게 합니다 — 자산번호만
 * 넣는 한 항상 버전 1 이 나옵니다.
 */
export function qrMatrix(value: string): QrMatrix {
  if (value === '') throw new Error('QR: 빈 값은 인코딩할 수 없습니다');

  const qr = qrcode(0, ERROR_CORRECTION);
  // 숫자만이면 Numeric 모드로 잡혀 같은 용량을 더 작은 심볼에 담습니다.
  qr.addData(value, /^\d+$/.test(value) ? 'Numeric' : 'Byte');
  qr.make();

  const count = qr.getModuleCount();
  const dark: boolean[][] = [];
  for (let row = 0; row < count; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < count; col++) line.push(qr.isDark(row, col));
    dark.push(line);
  }

  return { count, dark, countWithQuietZone: count + QR_QUIET_ZONE_MODULES * 2 };
}

/**
 * 심볼 한 변이 `sizeMm` 인 QR 의 모듈 폭(mm). 정적여백은 빼고 셉니다.
 *
 * 스캔이 되는지는 결국 이 값이 정합니다 — 휴대폰으로 읽으려면 0.4mm 는 넘어야
 * 합니다 (0.43mm 짜리는 640×480 카메라로 15cm 거리에서 실패했습니다).
 */
export function qrModuleMm(matrix: QrMatrix, sizeMm: number): number {
  return sizeMm / matrix.count;
}
