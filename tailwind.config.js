/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'om-cream':       '#faf7f0',
        'om-parchment':   '#f0e8d0',
        'om-tan':         '#d4c5a0',
        'om-gold':        '#c9a84c',
        'om-gold-dark':   '#9e7d2c',
        'om-brown':       '#8b6347',
        'om-mahogany':    '#5c3d26',
        'om-forest':      '#2d5a3d',
        'om-forest-dark': '#1a3a26',
        'om-forest-deep': '#0f2218',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['EB Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
