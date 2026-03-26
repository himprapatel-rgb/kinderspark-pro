import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#6C63FF',
        'accent-hover': '#5B52EE',
        'accent-purple': '#8B5CF6',
        'app-green': '#2DB854',
        'app-red': '#EF4444',
        'app-orange': '#F97316',
        'app-yellow': '#F59E0B',
        'app-blue': '#3B82F6',
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
