import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#4F6BED',
        'accent-hover': '#3E5AD9',
        'accent-purple': '#7C5BBF',
        'app-green': '#2BA55E',
        'app-red': '#DC4343',
        'app-orange': '#E8753A',
        'app-yellow': '#E5982A',
        'app-blue': '#3A8BDE',
        brand: {
          dark: '#1E1B2E',
          primary: '#4F6BED',
          light: '#ECF0FF',
          spark: '#E5982A',
          surface: '#F8F7F4',
          muted: '#64607A',
        },
        spark: {
          amber: '#E5982A',
          teal: '#2BA55E',
          rose: '#DC4343',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Nunito', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
        kid: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        'kinder': '16px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 4px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
        'hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s cubic-bezier(.16,1,.3,1) forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'pop': 'pop 0.4s cubic-bezier(.16,1,.3,1) forwards',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
export default config
