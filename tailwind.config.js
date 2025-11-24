/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        'primary-light': '#FFE5E5',
        secondary: '#4ECDC4',
        'secondary-light': '#E8F8F6',
        accent: '#FFE66D',
        success: '#95E1D3',
        warning: '#F38181',
        danger: '#AA96DA',
        dark: '#2D3436',
        light: '#F5F6FA',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
