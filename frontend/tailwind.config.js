/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          yellow: '#FFD93D',
          blue: '#6C63FF',
          pink: '#FF6B9D',
          green: '#4ECDC4',
        },
      },
      fontFamily: {
        kid: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
