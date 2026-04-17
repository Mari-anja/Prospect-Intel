import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f7f7f6',
          100: '#eeeeed',
          200: '#d9d9d6',
          300: '#b8b8b4',
          400: '#8b8b86',
          500: '#64645f',
          600: '#454541',
          700: '#2e2e2b',
          800: '#1c1c1a',
          900: '#111110',
        },
        accent: {
          DEFAULT: '#d97706',
          soft: '#fef3c7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
