import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
