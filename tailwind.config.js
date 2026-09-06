/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          // LEGACY purple: DEFAULT '#2F2446', 50 '#F4F1F8', 500 '#2F2446', 600 '#241B35'
          DEFAULT: '#000000',
          50:  '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          300: '#A3A3A3',
          400: '#737373',
          500: '#000000',
          600: '#171717',
          700: '#0A0A0A',
          800: '#000000',
          900: '#000000',
        },
        /* Full gray scale. Darker steps are true grey so dark mode is not blue-black. */
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#121212',
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
