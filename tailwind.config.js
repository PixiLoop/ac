/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        '10px': '10px',
        '11px': '11px',
        '12px': '12px',
      },
      colors: {
        ink: '#192F5A',    // brand navy
        aqua: '#00B0B3',   // brand teal
        surface: '#F5F7FB' // app background
      },
      boxShadow: {
        card: '0 24px 60px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
