import { ORG_NAME } from './app-info';

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
  /** 이 규격에서 권장하는 바코드 막대 높이 (mm) */
  barcodeHeightMm: number;
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
    barcodeHeightMm: 12,
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
    barcodeHeightMm: 11,
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
    note: '소형 비품용. 세로 17mm 라 바코드·번호·자산명까지만 들어갑니다 (장소·팀명은 넘칩니다).',
    kind: 'roll',
    widthMm: 54,
    heightMm: 17,
    paddingMm: 1.5,
    barcodeHeightMm: 7,
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
    barcodeHeightMm: 9,
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
    barcodeHeightMm: 9,
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
    barcodeHeightMm: 14,
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
    note: '가장 작은 비품용. 바코드와 번호만 들어갑니다.',
    kind: 'roll',
    widthMm: 40,
    heightMm: 20,
    paddingMm: 1.5,
    barcodeHeightMm: 8,
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
    paddingMm: 2,
    barcodeHeightMm: 12,
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
    paddingMm: 2,
    barcodeHeightMm: 14,
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
    barcodeHeightMm: 16,
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

/** 프리셋이 권장하는 바코드 높이·글자 배율. 표시 항목 토글은 사용자 설정을 유지합니다. */
export function presetContentDefaults(preset: LabelPreset): Pick<
  LabelContent,
  'barcodeHeightMm' | 'fontScale'
> {
  return { barcodeHeightMm: preset.barcodeHeightMm, fontScale: preset.fontScale };
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
  /** 바코드 막대 높이 (mm) */
  barcodeHeightMm: number;
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

/** Code 128 규격이 요구하는 최소 여백 — 좌우 각 10 모듈. */
export const BARCODE_QUIET_ZONE_MODULES = 10;

export const DEFAULT_CONTENT: LabelContent = {
  showName: true,
  showLocation: false,
  showTeam: false,
  showAcquiredDate: false,
  showChurchName: false,
  // 표시 토글은 꺼둔 채 이름만 미리 채워, 켤 때 다시 타이핑하지 않게 합니다.
  churchName: ORG_NAME,
  barcodeHeightMm: 12,
  fontScale: 1.15,
  copies: 1,
};

/**
 * Builds the `@page` rule and grid metrics for a layout.
 *
 * Roll printers get one label per page at exactly the label's size; sheets get
 * an A4 page with the label grid positioned by the paper's margins.
 */
export function buildPrintCss(layout: LabelLayout): string {
  if (layout.kind === 'roll') {
    return `
@page { size: ${layout.widthMm}mm ${layout.heightMm}mm; margin: 0; }
.label-root { --label-w: ${layout.widthMm}mm; --label-h: ${layout.heightMm}mm; --label-p: ${layout.paddingMm}mm; }
@media print {
  .label-root { display: block; }
  .label-cell {
    width: ${layout.widthMm}mm;
    height: ${layout.heightMm}mm;
    break-after: page;
    page-break-after: always;
    border: 0 !important;
    border-radius: 0 !important;
  }
  .label-cell:last-child { break-after: auto; page-break-after: auto; }
}`;
  }

  return `
@page { size: A4 portrait; margin: ${layout.pageMarginTopMm}mm ${layout.pageMarginLeftMm}mm; }
.label-root { --label-w: ${layout.widthMm}mm; --label-h: ${layout.heightMm}mm; --label-p: ${layout.paddingMm}mm; }
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
 * 선택한 표시 항목이 라벨 세로 폭에 들어가는지 계산합니다.
 *
 * `LabelCell` 은 `overflow: hidden` 이라 넘치면 조용히 잘립니다. 인쇄물은 되돌릴
 * 수 없으니, 같은 쌓임 순서를 그대로 계산해 미리 경고할 수 있게 합니다.
 * 값을 바꿀 때는 `LabelCell` 의 마진·줄 높이와 반드시 함께 맞추세요.
 */
export function measureContentFit(
  layout: LabelLayout,
  content: LabelContent,
  hasMetaLine: boolean,
): ContentFit {
  const { heightMm: availableMm } = printableArea(layout);
  const line = (basePt: number) => basePt * content.fontScale * LINE_HEIGHT * PT_TO_MM;

  let neededMm = Math.min(content.barcodeHeightMm, availableMm);
  if (content.showChurchName && content.churchName.trim() !== '') {
    neededMm += line(FONT_BASE_PT.churchName);
  }
  neededMm += 0.4 + line(FONT_BASE_PT.assetNo); // 바코드와의 간격 + 자산번호
  if (content.showName) neededMm += 0.3 + line(FONT_BASE_PT.name);
  if (hasMetaLine) neededMm += line(FONT_BASE_PT.meta);

  const slackMm = availableMm - neededMm;
  // 0.05mm 는 브라우저의 mm→px 반올림 여유입니다.
  return { neededMm, availableMm, slackMm, fits: slackMm >= -0.05 };
}

/** 시트 라벨에서 시작 칸을 비워, 쓰다 남은 라벨지를 이어서 쓸 수 있게 합니다. */
export function sheetCapacity(layout: LabelLayout): number {
  return layout.cols * layout.rows;
}
