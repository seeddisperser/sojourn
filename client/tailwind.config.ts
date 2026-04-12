import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sojourn warm palette
        soil: {
          50: '#faf7f2',
          100: '#f2ead8',
          200: '#e4d4b0',
          300: '#d1b882',
          400: '#be995a',
          500: '#a87d3e',
          600: '#8a6130',
          700: '#6d4a27',
          800: '#543924',
          900: '#422d1f',
        },
        moss: {
          50: '#f4f7f0',
          100: '#e6eddc',
          200: '#cddcbc',
          300: '#abc494',
          400: '#87aa6c',
          500: '#6a8f50',
          600: '#52713e',
          700: '#425a33',
          800: '#36492b',
          900: '#2d3d25',
        },
        slate: {
          ink: '#2d3027',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
