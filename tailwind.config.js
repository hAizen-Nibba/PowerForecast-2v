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
          50: '#e6fffa',
          100: '#b2f5ea',
          200: '#81e6d9',
          300: '#4fd1c5',
          400: '#26c6da',
          500: '#00e5c9',
          600: '#00c4aa',
          700: '#009e88',
          800: '#202328',
          900: '#17191d',
          950: '#141619',
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
