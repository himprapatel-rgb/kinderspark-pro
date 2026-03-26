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
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        kid: ['Nunito', 'sans-serif'],
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
