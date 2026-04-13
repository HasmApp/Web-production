/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D47FF',
          50:  '#F0ECFF',
          100: '#E4DCFF',
          200: '#C9BAFF',
          300: '#A98EFF',
          400: '#8B65FF',
          500: '#6D47FF',
          600: '#5733E0',
          700: '#4525B8',
          800: '#341A90',
          900: '#231068',
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
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
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
