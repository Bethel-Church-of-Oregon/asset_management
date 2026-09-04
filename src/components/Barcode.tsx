import { layoutBarcode, type BarcodeSvgOptions } from '@/lib/code128';

type Props = BarcodeSvgOptions & {
  value: string;
  /** CSS width for the rendered <svg>; the viewBox handles scaling. */
  cssWidth?: string;
  cssHeight?: string;
  /**
   * Fill the container in both axes instead of preserving the aspect ratio.
   *
   * Correct for labels: a Code 128 symbol carries information only along the
   * horizontal axis, and horizontal scaling is uniform across every bar, so
   * ratios — and therefore readability — are preserved. Without this the
   * symbol letterboxes to its natural 4.5:1 shape and a wide label wastes the
   * width that would otherwise widen each module and make scanning easier.
   */
  stretch?: boolean;
};

/**
 * Renders a Code 128 barcode as inline SVG on the server.
 *
 * No client JavaScript is involved, so barcodes are present in the very first
 * HTML response — printing a label sheet never races hydration.
 */
export default function Barcode({
  value,
  moduleWidth = 2,
  height = 60,
  quietZone = 10,
  showText = true,
  fontSize = 14,
  className,
  cssWidth = '100%',
  cssHeight,
  stretch = false,
}: Props) {
  let layout;
  try {
    layout = layoutBarcode(value, { moduleWidth, height, quietZone, showText, fontSize });
  } catch {
    return (
      <span className="text-xs text-red-600">바코드로 변환할 수 없는 값입니다: {value}</span>
    );
  }

  return (
    <svg
      className={className}
      viewBox={layout.viewBox}
      width={cssWidth}
      height={cssHeight}
      preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'}
      role="img"
      aria-label={`바코드 ${value}`}
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width={layout.width} height={layout.height} fill="#ffffff" />
      <g fill="#000000">
        {layout.bars.map((bar, i) => (
          <rect key={i} x={bar.x} y={0} width={bar.width} height={layout.barHeight} />
        ))}
      </g>
      {showText ? (
        <text
          x={layout.width / 2}
          y={layout.textY}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          fontSize={fontSize}
          fontWeight="600"
          letterSpacing={fontSize * 0.08}
          fill="#000000"
        >
          {value}
        </text>
      ) : null}
    </svg>
  );
}
