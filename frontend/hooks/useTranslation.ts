'use client'
import { translations, type Locale } from '@/lib/i18n'
import { useAppStore } from '@/store/appStore'

export function useTranslation() {
  // The store uses `settings.lang` for the language code
  const locale = useAppStore(state => (state.settings?.lang ?? 'en')) as Locale

  function t(key: string): string {
    return translations[locale]?.[key] ?? translations.en?.[key] ?? key
  }

  return { t, locale }
}
