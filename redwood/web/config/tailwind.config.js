/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode
        light: {
          primary: '#FAFAF9',
          secondary: '#F5F5F4',
          100: '#FFFFFF',
          200: '#E7E5E4',
          300: '#D6D3D1',
        },
        // Dark mode
        dark: {
          primary: '#0C0A09',
          secondary: '#1C1917',
          100: '#292524',
          200: '#44403C',
          300: '#57534E',
        },
        accent: {
          DEFAULT: '#0891B2',
          light: '#22D3EE',
        },
      },
      fontFamily: {
        sans: ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
