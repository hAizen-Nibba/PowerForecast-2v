/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        pf: {
          50: '#eef0ff',
          100: '#dfe3ff',
          200: '#c5caff',
          300: '#a2a5ff',
          400: '#8183fc',
          500: '#6c7ae0',
          600: '#5a5cc7',
          700: '#4a49a2',
          800: '#1a1072',
          900: '#0d0d5e',
          950: '#090938',
        },
        accent: {
          400: '#ffd54f',
          500: '#ffc107',
        }
      }
    },
  },
  plugins: [],
}
