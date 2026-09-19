import { ORG_NAME } from './app-info';
import { QR_QUIET_ZONE_MODULES } from './qr';

/**
 * 라벨 규격.
 *
 * `roll` 은 라벨 프린터(브라더 QL, 다이모, 지브라 등)처럼 라벨 1장 = 1페이지로
 * 출력하는 방식, `sheet` 는 A4 라벨지에 여러 칸을 격자로 출력하는 방식입니다.
 *
 * 프린터·라벨지 조합은 교회마다 다르므로 모든 값은 화면에서 직접 조정할 수 있고,
 * 마지막 설정은 브라우저에 저장됩니다.
 */
export type LabelLayout = {
  kind: 'roll' | 'sheet';
  /** 라벨 1칸의 크기 (mm) */
  widthMm: number;
  heightMm: number;
  /** 라벨 내부 여백 (mm) */
  paddingMm: number;
  /** sheet 전용: 칸 배치 */
  cols: number;
  rows: number;
  /** sheet 전용: 용지 상/좌 여백 (mm) */
  pageMarginTopMm: number;
  pageMarginLeftMm: number;
  /** sheet 전용: 칸 사이 간격 (mm) */
  gapXMm: number;
  gapYMm: number;
};

export type LabelPreset = LabelLayout & {
  id: string;
  name: string;
  note?: string;
  /** 이 규격에서 권장하는 QR 한 변의 길이 (mm) */
  qrSizeMm: number;
  /** 이 규격에서 권장하는 글자 크기 배율 (1.0 = 기준) */
  fontScale: number;
};

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: 'roll-62x29',
    name: 'Brother DK-11209 (62 × 29 mm)',
    note: '브라더 QL 소형 주소 라벨. 자산명·장소까지 들어가고 크기가 과하지 않아 기본값으로 씁니다.',
    kind: 'roll',
    widthMm: 62,
    heightMm: 29,
    paddingMm: 2.5,
    qrSizeMm: 21,
    fontScale: 1.15,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-90x29',
    name: 'Brother DK-1201 (90 × 29 mm)',
    note: '브라더 QL 표준 주소 라벨 (1.1" × 3.5"). 가로 90mm 라 큰 장비·가구에 적합합니다.',
    kind: 'roll',
    widthMm: 90,
    heightMm: 29,
    paddingMm: 2.5,
    qrSizeMm: 21,
    fontScale: 1.25,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-54x17',
    name: 'Brother DK-11204 (54 × 17 mm)',
    note: '소형 비품용. QR 12mm 에 번호·자산명이 들어갑니다 (장소·팀명까지 켜면 빠듯합니다).',
    kind: 'roll',
    widthMm: 54,
    heightMm: 17,
    paddingMm: 2,
    qrSizeMm: 12,
    fontScale: 0.85,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-50x25',
    name: '라벨 프린터 50 × 25 mm',
    note: '지브라·TSC 등 범용 다이컷 라벨. 호환 라벨이 저렴합니다.',
    kind: 'roll',
    widthMm: 50,
    heightMm: 25,
    paddingMm: 2,
    qrSizeMm: 18,
    fontScale: 1,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-54x25',
    name: 'Dymo 30336 (54 × 25 mm)',
    note: '다이모 30336 계열 (1" × 2-1/8").',
    kind: 'roll',
    widthMm: 54,
    heightMm: 25,
    paddingMm: 2,
    qrSizeMm: 18,
    fontScale: 1,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-70x38',
    name: '라벨 프린터 70 × 38 mm',
    note: '큰 장비용. 자산명·장소·취득일을 모두 넣기 좋습니다.',
    kind: 'roll',
    widthMm: 70,
    heightMm: 38,
    paddingMm: 3,
    qrSizeMm: 27,
    fontScale: 1.3,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'roll-40x20',
    name: '라벨 프린터 40 × 20 mm',
    note: '가장 작은 비품용. QR 과 번호만 들어갑니다.',
    kind: 'roll',
    widthMm: 40,
    heightMm: 20,
    paddingMm: 1.5,
    qrSizeMm: 14,
    fontScale: 0.85,
    cols: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: 'sheet-a4-24',
    name: 'A4 라벨지 24칸 (3 × 8)',
    note: '칸 크기 64.6 × 33.8 mm. 일반 레이저·잉크젯 프린터용.',
    kind: 'sheet',
    widthMm: 64.6,
    heightMm: 33.8,
    paddingMm: 2.5,
    qrSizeMm: 24,
    fontScale: 1.1,
    cols: 3,
    rows: 8,
    pageMarginTopMm: 12.7,
    pageMarginLeftMm: 7,
    gapXMm: 2.5,
    gapYMm: 0,
  },
  {
    id: 'sheet-a4-21',
    name: 'A4 라벨지 21칸 (3 × 7)',
    note: '칸 크기 63.5 × 38.1 mm.',
    kind: 'sheet',
    widthMm: 63.5,
    heightMm: 38.1,
    paddingMm: 3,
    qrSizeMm: 27,
    fontScale: 1.15,
    cols: 3,
    rows: 7,
    pageMarginTopMm: 15.1,
    pageMarginLeftMm: 7.75,
    gapXMm: 2.5,
    gapYMm: 0,
  },
  {
    id: 'sheet-a4-12',
    name: 'A4 라벨지 12칸 (2 × 6)',
    note: '칸 크기 99.1 × 42.3 mm. 큰 라벨이 필요할 때.',
    kind: 'sheet',
    widthMm: 99.1,
    heightMm: 42.3,
    paddingMm: 3,
    qrSizeMm: 30,
    fontScale: 1.4,
    cols: 2,
    rows: 6,
    pageMarginTopMm: 21.5,
    pageMarginLeftMm: 4.65,
    gapXMm: 2.5,
    gapYMm: 0,
  },
];

export const DEFAULT_PRESET_ID = 'roll-62x29';

export function findPreset(id: string): LabelPreset {
  return LABEL_PRESETS.find((p) => p.id === id) ?? LABEL_PRESETS[0];
}

/** 프리셋이 권장하는 QR 크기·글자 배율. 표시 항목 토글은 사용자 설정을 유지합니다. */
export function presetContentDefaults(
  preset: LabelPreset,
): Pick<LabelContent, 'qrSizeMm' | 'fontScale'> {
  return { qrSizeMm: preset.qrSizeMm, fontScale: preset.fontScale };
}

/** 프리셋에서 표시용 메타와 권장값을 떼고 치수만 남깁니다. */
export function presetToLayout(preset: LabelPreset): LabelLayout {
  return {
    kind: preset.kind,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    paddingMm: preset.paddingMm,
    cols: preset.cols,
    rows: preset.rows,
    pageMarginTopMm: preset.pageMarginTopMm,
    pageMarginLeftMm: preset.pageMarginLeftMm,
    gapXMm: preset.gapXMm,
    gapYMm: preset.gapYMm,
  };
}

export type LabelContent = {
  showName: boolean;
  showLocation: boolean;
  showTeam: boolean;
  showAcquiredDate: boolean;
  showChurchName: boolean;
  churchName: string;
  /** QR 한 변의 길이 (mm) */
  qrSizeMm: number;
  /** 글자 크기 배율 (1.0 = 기준) */
  fontScale: number;
  /** 한 자산당 출력할 라벨 장수 */
  copies: number;
};

/**
 * 배율 1.0 기준 글자 크기 (pt).
 *
 * 라벨은 mm 단위로 고정된 물리 매체라, 화면용 상대 단위 대신 pt 로 못박고
 * 규격별 `fontScale` 로 함께 키웁니다.
 */
export const FONT_BASE_PT = {
  churchName: 5,
  assetNo: 8.5,
  name: 6.5,
  meta: 5.5,
} as const;

/**
 * QR 한 변의 모듈 수 (버전 1). 자산번호는 언제나 여기에 들어갑니다 — `qr.ts` 참고.
 */
const QR_MODULES = 21;

/**
 * QR 과 오른쪽 글자 칸 사이의 간격 (mm).
 *
 * 보기 좋으라고 두는 값이 아니라 **QR 의 정적여백**입니다. 글자가 이 안으로
 * 들어오면 디코더가 심볼 경계를 못 찾습니다. 그래서 고정값이 아니라 모듈 크기에
 * 비례합니다 — QR 이 커지면 모듈도 커지고, 필요한 여백도 같이 커집니다.
 *
 * 라벨 가장자리 쪽은 인쇄되지 않는 흰 바탕이 이어져서 `paddingMm` 만으로도
 * 충분하지만, 글자 쪽은 실제로 잉크가 찍히므로 규격대로 4모듈을 확보합니다.
 *
 * **`LabelCell` 과 같아야 합니다.**
 */
export function qrGapMm(qrSizeMm: number): number {
  return (QR_QUIET_ZONE_MODULES * qrSizeMm) / QR_MODULES;
}

/** 오른쪽 글자 칸의 줄 사이 간격 (mm). **`LabelCell` 과 같아야 합니다.** */
export const LINE_GAP_MM = 0.3;

export const DEFAULT_CONTENT: LabelContent = {
  showName: true,
  showLocation: false,
  showTeam: false,
  showAcquiredDate: false,
  showChurchName: false,
  // 표시 토글은 꺼둔 채 이름만 미리 채워, 켤 때 다시 타이핑하지 않게 합니다.
  churchName: ORG_NAME,
  qrSizeMm: 21,
  fontScale: 1.15,
  copies: 1,
};

/**
 * Builds the `@page` rule and grid metrics for a layout.
 *
 * Roll printers get one label per page at exactly the label's size; sheets get
 * an A4 page with the label grid positioned by the paper's margins.
 *
 * `rotate` 는 용지를 세로로 두고 **내용만 90도 돌려** 찍습니다. 라벨 프린터
 * 드라이버는 다이컷 라벨을 테이프 폭이 앞에 오는 세로 규격으로만 내놓는 일이
 * 많고(AirPrint 는 늘 그렇습니다 — 62 × 29 는 없고 29 × 62 만 있습니다),
 * `@page` 의 크기가 인쇄 창의 용지 선택을 덮어쓰기 때문에 앱이 맞춰 주지 않으면
 * 사용자가 손쓸 방법이 없습니다. 아이폰·아이패드는 드라이버를 깔 수도 없습니다.
 * 회전은 강체 변환이라 QR 모듈 폭(mm)은 그대로 보존됩니다. QR 자체는 방향을
 * 가리지 않지만 사람이 읽는 글자는 가로로 서야 하므로 회전은 여전히 필요합니다.
 */
export function buildPrintCss(layout: LabelLayout, rotate = false): string {
  if (layout.kind === 'roll') {
    // 회전할 때만 칸마다 용지 크기의 칸막이(`.label-slot`)가 생깁니다. 그 밖에는
    // `display: contents` 라 화면 미리보기도, 회전 없는 인쇄도 예전 그대로입니다.
    const pageWidthMm = rotate ? layout.heightMm : layout.widthMm;
    const pageHeightMm = rotate ? layout.widthMm : layout.heightMm;
    const pagination = rotate
      ? `  .label-slot {
    display: block;
    position: relative;
    width: ${pageWidthMm}mm;
    height: ${pageHeightMm}mm;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
  }
  .label-slot:last-child { break-after: auto; page-break-after: auto; }
  .label-cell {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(90deg);
  }`
      : `  .label-cell { break-after: page; page-break-after: always; }
  .label-slot:last-child .label-cell { break-after: auto; page-break-after: auto; }`;

    return `
@page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
.label-root { --label-w: ${layout.widthMm}mm; --label-h: ${layout.heightMm}mm; --label-p: ${layout.paddingMm}mm; }
.label-slot { display: contents; }
@media print {
  .label-root { display: block; }
  .label-cell {
    width: ${layout.widthMm}mm;
    height: ${layout.heightMm}mm;
    border: 0 !important;
    border-radius: 0 !important;
  }
${pagination}
}`;
  }

  return `
@page { size: A4 portrait; margin: ${layout.pageMarginTopMm}mm ${layout.pageMarginLeftMm}mm; }
.label-root { --label-w: ${layout.widthMm}mm; --label-h: ${layout.heightMm}mm; --label-p: ${layout.paddingMm}mm; }
.label-slot { display: contents; }
@media print {
  .label-root {
    display: grid;
    grid-template-columns: repeat(${layout.cols}, ${layout.widthMm}mm);
    column-gap: ${layout.gapXMm}mm;
    row-gap: ${layout.gapYMm}mm;
    justify-content: start;
  }
  .label-cell {
    width: ${layout.widthMm}mm;
    height: ${layout.heightMm}mm;
    break-inside: avoid;
    page-break-inside: avoid;
    border: 0 !important;
    border-radius: 0 !important;
  }
}`;
}

/** 1pt 를 mm 로. */
const PT_TO_MM = 25.4 / 72;

/** `leading-tight` (Tailwind) 의 줄 높이. LabelCell 의 클래스와 일치해야 합니다. */
const LINE_HEIGHT = 1.25;

/** 라벨 안쪽(여백 제외) 인쇄 영역. */
export function printableArea(layout: LabelLayout) {
  return {
    widthMm: layout.widthMm - layout.paddingMm * 2,
    heightMm: layout.heightMm - layout.paddingMm * 2,
  };
}

export type ContentFit = {
  /** 선택한 항목을 쌓았을 때 필요한 세로 높이 (mm) */
  neededMm: number;
  /** 실제로 쓸 수 있는 세로 높이 (mm) */
  availableMm: number;
  /** 남는 여유. 음수면 잘립니다. */
  slackMm: number;
  fits: boolean;
};

/**
 * 선택한 표시 항목이 라벨 안에 들어가는지 계산합니다.
 *
 * 라벨은 **왼쪽 QR · 오른쪽 글자** 두 칸으로 나뉩니다. 그래서 세로로 필요한
 * 높이는 둘 중 더 큰 쪽이고, 글자는 QR 옆에 쌓입니다.
 *
 * `LabelCell` 은 `overflow: hidden` 이라 넘치면 조용히 잘립니다. 인쇄물은 되돌릴
 * 수 없으니, 같은 쌓임 순서를 그대로 계산해 미리 경고할 수 있게 합니다.
 * 값을 바꿀 때는 `LabelCell` 의 간격·줄 높이와 반드시 함께 맞추세요
 * (`QR_GAP_MM` · `LINE_GAP_MM` · `LINE_HEIGHT`).
 */
export function measureContentFit(
  layout: LabelLayout,
  content: LabelContent,
  hasMetaLine: boolean,
): ContentFit {
  const { heightMm: availableMm } = printableArea(layout);
  const line = (basePt: number) => basePt * content.fontScale * LINE_HEIGHT * PT_TO_MM;

  // 오른쪽 글자 칸에 쌓이는 줄들 — `LabelCell` 의 순서와 같아야 합니다.
  const lines: number[] = [];
  if (content.showChurchName && content.churchName.trim() !== '') {
    lines.push(line(FONT_BASE_PT.churchName));
  }
  lines.push(line(FONT_BASE_PT.assetNo));
  if (content.showName) lines.push(line(FONT_BASE_PT.name));
  if (hasMetaLine) lines.push(line(FONT_BASE_PT.meta));

  const textMm = lines.reduce((sum, h) => sum + h, 0) + Math.max(0, lines.length - 1) * LINE_GAP_MM;

  // QR 은 정사각이라 세로로 자기 크기만큼 차지합니다. 둘 중 큰 쪽이 라벨 높이를
  // 정하고, 넘치면 QR 이 아니라 글자가 잘립니다(QR 은 높이를 고정해 두었습니다).
  const neededMm = Math.max(content.qrSizeMm, textMm);

  const slackMm = availableMm - neededMm;
  // 0.05mm 는 브라우저의 mm→px 반올림 여유입니다.
  return { neededMm, availableMm, slackMm, fits: slackMm >= -0.05 };
}

/** 시트 라벨에서 시작 칸을 비워, 쓰다 남은 라벨지를 이어서 쓸 수 있게 합니다. */
export function sheetCapacity(layout: LabelLayout): number {
  return layout.cols * layout.rows;
}
