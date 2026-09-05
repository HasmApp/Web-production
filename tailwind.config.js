/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F2446',
          50:  '#F4F1F8',
          100: '#E8E4EE',
          200: '#D1C8DC',
          300: '#A89BB8',
          400: '#6B5A85',
          500: '#2F2446',
          600: '#241B35',
          700: '#1C1529',
          800: '#161020',
          900: '#0F0B16',
        },
        surface: {
          light: '#F9FAFB',
          dark: '#121212',
        },
        card: {
          light: '#FFFFFF',
          dark: '#1E1E1E',
        },
      },
      fontFamily: {
        sans: ['Thmanyah Sans', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Thmanyah Sans', 'Tajawal', 'sans-serif'],
      },
      animation: {
        'price-drop': 'priceDrop 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        priceDrop: {
          '0%': { color: '#EF4444', transform: 'scale(1.05)' },
          '100%': { color: 'inherit', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
