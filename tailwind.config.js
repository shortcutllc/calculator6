/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        'shortcut': {
          blue: '#003C5E',    // navigation, headings, dark backgrounds
          coral: '#FF5050',   // logo, accents, highlights
          teal: '#9EFAFF',    // buttons, accents, highlights
          'service-yellow': '#FEDC64', // hair services
          pink: '#F7BBFF',    // nails & facial services
        },
        // Secondary Colors
        'accent': {
          yellow: '#FFD166',  // accent cards, highlights
          pink: '#F7BBFF',    // accent cards, highlights
          blue: '#9EFAFF',    // accent cards, highlights
        },
        // Neutral Colors
        'neutral': {
          white: '#FFFFFF',   // backgrounds, cards
          gray: '#F5F5F5',    // secondary backgrounds
          dark: '#333333',    // secondary text
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      borderRadius: {
        'full': '9999px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333333',
            h1: {
              color: '#003C5E',
            },
            h2: {
              color: '#003C5E',
            },
            h3: {
              color: '#003C5E',
            },
            h4: {
              color: '#003C5E',
            },
            strong: {
              color: '#003C5E',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};