/**
 * Dependency-free Code 128 encoder.
 *
 * Renders to plain SVG so barcodes can be produced on the server and printed
 * without any client-side JavaScript — label printing must never depend on
 * hydration finishing.
 *
 * Uses Code Set B for the whole payload (asset numbers are ASCII digits and
 * hyphens, so the extra density of Code Set C is not worth the switching
 * logic).
 */

// Bar/space width patterns for values 0..106. Each digit is a module count,
// alternating bar, space, bar, ... starting with a bar.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

/** True when every character can be represented in Code Set B (ASCII 32-126). */
export function isEncodable(text: string): boolean {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) return false;
  }
  return text.length > 0;
}

/**
 * Encodes `text` to a string of '1' (bar module) and '0' (space module).
 * Throws when the payload contains characters Code Set B cannot represent.
 */
export function encodeToModules(text: string): string {
  if (!isEncodable(text)) {
    throw new Error(`Code128: cannot encode ${JSON.stringify(text)}`);
  }

  const values: number[] = [START_B];
  for (const ch of text) values.push(ch.charCodeAt(0) - 32);

  // Checksum: start value plus each payload value weighted by its 1-based
  // position, modulo 103.
  let sum = START_B;
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103);
  values.push(STOP);

  let modules = '';
  for (const value of values) {
    const pattern = PATTERNS[value];
    for (let i = 0; i < pattern.length; i++) {
      // Even index = bar, odd index = space.
      modules += (i % 2 === 0 ? '1' : '0').repeat(Number(pattern[i]));
    }
  }
  return modules;
}

export type BarcodeSvgOptions = {
  /** Width of one narrow module, in the SVG's user units. */
  moduleWidth?: number;
  /** Height of the bars, in the SVG's user units. */
  height?: number;
  /** Quiet zone on each side, in modules. Code 128 requires at least 10. */
  quietZone?: number;
  /** Render the payload as text under the bars. */
  showText?: boolean;
  /** Font size for the payload text, in the SVG's user units. */
  fontSize?: number;
  /** Value for the SVG's `class` attribute. */
  className?: string;
};

export type BarcodeSvg = {
  /** `<rect>` runs describing the bars, in user units. */
  bars: { x: number; width: number }[];
  width: number;
  height: number;
  viewBox: string;
  barHeight: number;
  textY: number;
};

/**
 * Lays out a barcode as geometry, leaving the actual markup to the caller so
 * both React components and raw SVG strings can share one implementation.
 */
export function layoutBarcode(text: string, options: BarcodeSvgOptions = {}): BarcodeSvg {
  const moduleWidth = options.moduleWidth ?? 2;
  const barHeight = options.height ?? 60;
  const quietZone = options.quietZone ?? 10;
  const showText = options.showText ?? true;
  const fontSize = options.fontSize ?? 14;

  const modules = encodeToModules(text);
  const textGap = showText ? fontSize * 1.25 : 0;

  // Collapse consecutive '1' modules into single rects — far fewer nodes for
  // the print renderer to deal with.
  const bars: { x: number; width: number }[] = [];
  let run = 0;
  for (let i = 0; i <= modules.length; i++) {
    if (modules[i] === '1') {
      run++;
      continue;
    }
    if (run > 0) {
      bars.push({
        x: (quietZone + i - run) * moduleWidth,
        width: run * moduleWidth,
      });
      run = 0;
    }
  }

  const width = (modules.length + quietZone * 2) * moduleWidth;
  const height = barHeight + textGap;

  return {
    bars,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    barHeight,
    textY: barHeight + fontSize,
  };
}

/** Renders a standalone SVG string — handy for downloads and debugging. */
export function barcodeSvgString(text: string, options: BarcodeSvgOptions = {}): string {
  const layout = layoutBarcode(text, options);
  const showText = options.showText ?? true;
  const fontSize = options.fontSize ?? 14;
  const rects = layout.bars
    .map((b) => `<rect x="${b.x}" y="0" width="${b.width}" height="${layout.barHeight}" />`)
    .join('');
  const label = showText
    ? `<text x="${layout.width / 2}" y="${layout.textY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(text)}</text>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${layout.viewBox}" width="${layout.width}" height="${layout.height}">` +
    `<rect width="100%" height="100%" fill="#fff" /><g fill="#000">${rects}</g>${label}</svg>`
  );
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
}
