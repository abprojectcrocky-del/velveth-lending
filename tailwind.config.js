/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          50:  '#fff5f6',
          100: '#fde8eb',
          200: '#fbc5cc',
          300: '#f79baa',
          400: '#f06e84',
          500: '#be5a6a',
          600: '#9e3f4e',
          700: '#7d2d3a',
          800: '#5e1f29',
          900: '#3d1018',
        }
      }
    }
  },
  plugins: []
}
