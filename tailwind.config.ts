import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Yoai 暖色調 — 米白、焦糖、淺咖,像一位親密朋友的色系
        cream: {
          50: '#fdfaf6',
          100: '#f7f1e8',
          200: '#ede1cc',
          300: '#dfc8a8',
          400: '#cba87d',
        },
        cocoa: {
          400: '#a98763',
          500: '#8a6b4d',
          600: '#6f543d',
          700: '#54402e',
        },
        sage: {
          300: '#c4d4be',
          400: '#9bb593',
          500: '#7a9a72',
        },
        rose: {
          300: '#f0c5b3',
          400: '#e6a78b',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'PingFang TC', 'Helvetica Neue', 'sans-serif'],
        serif: ['"Songti TC"', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 4px 20px -8px rgba(143, 109, 77, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
