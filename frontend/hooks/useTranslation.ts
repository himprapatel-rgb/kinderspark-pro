'use client'
import { useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { t as translate, type SupportedLang, LANGUAGES, getLanguageOptions } from '@/lib/i18n'

/**
 * Hook that provides translation utilities using the app's current language setting.
 * 
 * Usage:
 *   const { t, lang, setLang, languages } = useTranslation()
 *   <h1>{t('hi_greeting')}, {user.name}!</h1>
 */
export function useTranslation() {
  const lang = useAppStore((s) => s.settings.lang) as SupportedLang
  const updateSettings = useAppStore((s) => s.updateSettings)

  const t = useCallback(
    (key: Parameters<typeof translate>[0]) => translate(key, lang || 'en'),
    [lang]
  )

  const setLang = useCallback(
    (newLang: SupportedLang) => {
      updateSettings({ lang: newLang })
      // Update the html lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang
      }
    },
    [updateSettings]
  )

  return {
    t,
    lang: (lang || 'en') as SupportedLang,
    setLang,
    languages: getLanguageOptions(),
    currentLanguage: LANGUAGES[(lang || 'en') as SupportedLang],
  }
}
