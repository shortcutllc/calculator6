/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary Colors (per Style Guide)
        'shortcut': {
          blue: '#003756',    // Main brand color (CORRECTED from #003C5E)
          'dark-blue': '#003C5E',    // Headers, sections
          'navy-blue': '#00456D',    // Navigation active states
          'light-blue': '#013D5E',   // Section backgrounds
          'teal-blue': '#018EA2',    // Accent sections
          'cyan-blue': '#054469',    // Badges, highlights
          coral: '#FF5050',   // logo, accents, highlights, CTAs
          teal: '#9EFAFF',    // buttons, accents, highlights (Light Cyan)
          'light-cyan': '#9EFAFF',  // Button backgrounds, highlights
          'service-yellow': '#FEDC64', // hair services, button hover
          pink: '#F7BBFF',    // nails & facial services, accent sections
          'light-teal': '#92f1f6',   // Button backgrounds
        },
        // Secondary Colors
        'accent': {
          yellow: '#FEDC64',  // Button hover overlay, accent cards
          pink: '#F7BBFF',    // accent cards, highlights
          blue: '#9EFAFF',    // accent cards, highlights
        },
        // Neutral Colors
        'neutral': {
          white: '#FFFFFF',   // backgrounds, cards
          gray: '#F5F5F5',    // secondary backgrounds
          'light-gray': '#F1F6F5',  // Background sections, FAQ cards
          dark: '#333333',    // secondary text
        },
        // Text Colors (per Style Guide)
        'text': {
          dark: '#032232',    // Primary text color
          'dark-60': '#03223299', // Secondary text (60% opacity)
          'button-blue': '#09364f', // Button text color
        },
        // Background Colors
        'bg': {
          'light-red': '#ffeb69',  // Section backgrounds
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        thin: 100,
        extralight: 200,
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
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