import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#5E5CE6',
        'accent-purple': '#BF5AF2',
        'app-green': '#30D158',
        'app-red': '#FF453A',
        'app-orange': '#FF9F0A',
        'app-yellow': '#FFD60A',
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
export default config
