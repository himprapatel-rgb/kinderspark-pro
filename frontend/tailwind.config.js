/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#5E5CE6',
        'accent-light': '#BF5AF2',
        'app-green': '#30D158',
        'app-red': '#FF453A',
        'app-orange': '#FF9F0A',
        'app-yellow': '#FFD60A',
        'app-pink': '#FF375F',
        card: {
          light: '#ffffff',
          dark: '#2c2c2e',
        },
        bg: {
          light: '#f2f2f7',
          dark: '#1c1c1e',
        },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
      animation: {
        'bounce-slow': 'bounce 2.5s ease-in-out infinite',
        'spin-fast': 'spin 0.7s linear infinite',
      },
    },
  },
  plugins: [],
}
