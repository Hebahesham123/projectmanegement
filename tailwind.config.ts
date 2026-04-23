import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Sans Arabic"', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          50: '#faf5f0',
          100: '#f3e7d9',
          200: '#e6cdb2',
          300: '#d4ab86',
          400: '#b97f4e',
          500: '#8f5a31',
          600: '#6b3e26',
          700: '#553020',
          800: '#3f241a',
          900: '#2a1a14',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(16,24,40,0.04), 0 1px 3px 0 rgba(16,24,40,0.08)',
        card: '0 4px 16px -2px rgba(16,24,40,0.06), 0 2px 6px -1px rgba(16,24,40,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 240ms ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
