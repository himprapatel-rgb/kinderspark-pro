'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { RTL_LANGS, type SupportedLang } from '@/lib/i18n'

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

    // Dyslexia-friendly font — Atkinson Hyperlegible is research-backed; Comic Sans is not
    root.style.fontFamily = settings.dys
      ? "var(--font-atkinson), 'Atkinson Hyperlegible', sans-serif"
      : ''

    // Dark mode class (used by Tailwind dark: variants if needed)
    if (settings.dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [settings.large, settings.hc, settings.dys, settings.dark])

  useEffect(() => {
    const root = document.documentElement
    const lang = (settings.lang || 'en') as SupportedLang
    // Set HTML lang attribute for screen readers and browser behaviour
    root.lang = lang
    // Apply RTL direction for Arabic and Urdu
    root.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
  }, [settings.lang])

  return <>{children}</>
}
