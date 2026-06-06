/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ah: {
          blue: '#00a0e2',
          'blue-dark': '#006eb8',
          orange: '#f98c1e',
        },
      },
    },
  },
  plugins: [],
};
