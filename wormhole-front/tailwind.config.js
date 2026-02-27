/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bornebit: {
          bg: '#000000',       // Pure Black
          surface: '#111111',  // Dark Grey
          primary: '#FF5722',  // Bornebit Orange
          accent: '#FF9100',   // Lighter Orange
          text: '#FFFFFF',     // White
          muted: '#9E9E9E',    // Grey
        }
      },
      fontFamily: {
        sans: ['"Outfit"', 'sans-serif'],
      },
      backgroundImage: {
        'bornebit-gradient': 'linear-gradient(to bottom right, #000000 0%, #1a0a00 100%)',
      }
    },
  },
  plugins: [],
}
