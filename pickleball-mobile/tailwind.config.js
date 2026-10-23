/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#88B04B',
        background: '#F8F9FA',
        card: '#FFFFFF',
        textMain: '#2D3436',
        textSub: '#636E72',
      }
    },
  },
  plugins: [],
};

