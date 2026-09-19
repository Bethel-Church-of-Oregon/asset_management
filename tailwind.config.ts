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
        /**
         * 순수한 **레이아웃** 브레이크포인트다 — 위 두 개와 달리 기기를 나누는
         * 용도가 아니다. 라벨 설정의 치수 입력칸 6개가 `lg`(1024px)에서는 한 줄에
         * 안 들어가고 마지막 칸이 밀려서, 1036px 부터 6열로 편다.
         *
         * `min-[1036px]:` 임의 변형을 쓰지 못하는 이유: 위 `raw` 스크린이 있으면
         * Tailwind 가 미디어쿼리 정렬을 못 해 임의 min-width 변형을 **조용히
         * 생성하지 않는다**(3.4.19 확인). 이름 있는 스크린은 정상 동작한다.
         */
        wide: '1036px',
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
