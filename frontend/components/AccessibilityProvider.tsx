'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export default function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const settings = useAppStore((s) => s.settings)

  useEffect(() => {
    const root = document.documentElement

    // Large text
    root.style.fontSize = settings.large ? '118%' : ''

    // High contrast
    if (settings.hc) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Dyslexia-friendly font
    root.style.fontFamily = settings.dys
      ? "'Comic Sans MS', 'Comic Sans', cursive"
      : ''

    // Dark mode class (used by Tailwind dark: variants if needed)
    if (settings.dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [settings.large, settings.hc, settings.dys, settings.dark])

  return <>{children}</>
}
