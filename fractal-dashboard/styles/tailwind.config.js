/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        pulseSlow: 'pulse 5s linear infinite'
      }
    }
  },
  plugins: []
};
