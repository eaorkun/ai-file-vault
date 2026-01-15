/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // This is the key!
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
}