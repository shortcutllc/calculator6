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
      keyframes: {
        'logo-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Website hero motion, ported from .pv-h1-w / .pv-pill-drop in
        // src/styles/proposal-refresh.css so pages outside the viewer can
        // reuse it without importing that (heavily .pv-root-scoped) sheet.
        'word-rise': {
          from: { opacity: '0', transform: 'translateY(26px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pill-drop': {
          '0%': { opacity: '0', transform: 'translate3d(0,-560px,0)' },
          '6%': { opacity: '1' },
          '46%': { transform: 'translate3d(0,-150px,0)' },
          '56%': { transform: 'translate3d(0,0,0) scaleY(1)' },
          '60%': { transform: 'translate3d(0,3px,0) scaleY(.94)' },
          '68%': { transform: 'translate3d(0,-18px,0) scaleY(1.01)' },
          '77%': { transform: 'translate3d(0,0,0) scaleY(.99)' },
          '83%': { transform: 'translate3d(0,-5px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
      },
      animation: {
        'logo-marquee': 'logo-marquee 40s linear infinite',
        'word-rise': 'word-rise .82s cubic-bezier(.22,1,.36,1) both',
        'pill-drop': 'pill-drop 2.1s linear both',
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
    /* Breakpoints that are also on when printing: smp, mdp, deskp (981),
       lgp and xlp behave like sm, md, min-[981px], lg and xl on screen, and
       all apply in print and inside `.sp-static` (the sponsor deck's PDF
       mode). Chrome matches print media queries against its default paper
       (about 756px), not the CSS page size, so the conference partner pages
       use these to print their desktop layout, and PDF mode lays out the
       same desktop page on any screen so it can be measured. Registered
       smallest first, so larger wins. */
    function ({ addVariant }) {
      addVariant('smp', ['@media (min-width: 640px)', '@media print', '.sp-static &']);
      addVariant('mdp', ['@media (min-width: 768px)', '@media print', '.sp-static &']);
      addVariant('deskp', ['@media (min-width: 981px)', '@media print', '.sp-static &']);
      addVariant('lgp', ['@media (min-width: 1024px)', '@media print', '.sp-static &']);
      addVariant('xlp', ['@media (min-width: 1280px)', '@media print', '.sp-static &']);
    },
  ],
};