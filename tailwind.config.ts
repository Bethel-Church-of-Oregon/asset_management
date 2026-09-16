import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /**
       * 기기 구분은 **창 너비가 아니라 입력 방식**으로 합니다.
       * 너비로 나누면 아이패드 가로(1024px)가 PC 로 잡히고, PC 창을 좁히면
       * 모바일로 잡힙니다.
       *
       * 두 조건은 서로의 정확한 여집합이라 모든 기기가 둘 중 하나에만 걸립니다.
       * 이 미디어 특성을 모르는 아주 옛 브라우저에서는 둘 다 걸리지 않으므로,
       * 기본값을 PC 쪽 모양으로 두고 `touch:` 로 켜는 방향으로 씁니다.
       */
      screens: {
        touch: { raw: '(hover: none), (pointer: coarse)' },
        mouse: { raw: '(hover: hover) and (pointer: fine)' },
      },
      /**
       * 곡률은 `globals.css` 의 `--radius` 하나에서 파생합니다 — 카드는 그 값,
       * 버튼·입력란은 2px 작게. 화면마다 감으로 고르던 것을 한 곳으로 모읍니다.
       * `rounded` 기본값(4px)은 건드리지 않습니다 — 라벨 셀이 쓰고 있습니다.
       */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bdd2ff',
          300: '#90b4ff',
          400: '#5c8bff',
          500: '#3563e9',
          600: '#254ed1',
          700: '#1e3fa8',
          800: '#1d3785',
          900: '#1d3169',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
