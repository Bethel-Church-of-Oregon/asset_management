import { QR_QUIET_ZONE_MODULES, qrMatrix } from '@/lib/qr';

type Props = {
  /** QR 에 넣을 값. 자산번호는 하이픈을 뺀 숫자만 넣습니다. */
  value: string;
  /** 접근성 라벨에 쓸 사람이 읽는 문자열. 기본값은 `value` 입니다. */
  text?: string;
  className?: string;
  /** 렌더된 `<svg>` 의 CSS 크기. viewBox 가 배율을 맡습니다. */
  cssSize?: string;
};

/**
 * QR 을 서버에서 인라인 SVG 로 그립니다.
 *
 * 클라이언트 자바스크립트가 전혀 관여하지 않으므로 첫 HTML 응답에 심볼이 들어
 * 있습니다 — 라벨 인쇄가 하이드레이션을 기다리다 빈 칸을 찍는 일이 없습니다.
 * (`Barcode` 컴포넌트와 같은 방침입니다.)
 */
export default function QrCode({ value, text, className, cssSize = '100%' }: Props) {
  let matrix;
  try {
    matrix = qrMatrix(value);
  } catch {
    return <span className="text-xs text-red-600">QR 로 변환할 수 없는 값입니다: {value}</span>;
  }

  const span = matrix.countWithQuietZone;
  const offset = QR_QUIET_ZONE_MODULES;

  // 같은 행에서 이어지는 검은 모듈은 사각형 하나로 합칩니다 — 노드 수가 줄어
  // 인쇄 렌더러가 가볍고, 모듈 사이에 미세한 틈이 생기지 않습니다.
  const rects: { x: number; y: number; width: number }[] = [];
  for (let row = 0; row < matrix.count; row++) {
    let run = 0;
    for (let col = 0; col <= matrix.count; col++) {
      if (col < matrix.count && matrix.dark[row][col]) {
        run++;
        continue;
      }
      if (run > 0) {
        rects.push({ x: offset + col - run, y: offset + row, width: run });
        run = 0;
      }
    }
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${span} ${span}`}
      width={cssSize}
      height={cssSize}
      role="img"
      aria-label={`QR ${text ?? value}`}
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width={span} height={span} fill="#ffffff" />
      <g fill="#000000">
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.width} height={1} />
        ))}
      </g>
    </svg>
  );
}
