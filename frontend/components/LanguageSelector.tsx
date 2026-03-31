'use client'
import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { API_BASE } from '@/lib/api'
import { playTap } from '@/lib/sounds'
import { hapticTap } from '@/lib/capacitor'
import { Globe, Check } from 'lucide-react'
import type { SupportedLang } from '@/lib/i18n'

/**
 * Language selector dropdown/list.
 * Can be rendered inline inside any settings/profile page.
 */
export default function LanguageSelector() {
  const { t, lang, setLang, languages, currentLanguage } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleSelect = (code: SupportedLang) => {
    hapticTap()
    playTap()
    // #region agent log
    fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/LanguageSelector.tsx:select',message:'Language changed',data:{from:lang,to:code},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    setLang(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      {/* Label */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(120,120,140,0.08)' }}>
        <div className="flex items-center gap-3">
          <Globe size={20} />
          <span className="font-semibold text-sm">{t('language')}</span>
        </div>
        <button
          onClick={() => { hapticTap(); playTap(); setOpen(!open) }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm app-pressable"
          style={{ background: 'rgba(120,120,140,0.1)' }}
        >
          {currentLanguage.flag} {currentLanguage.nativeName}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="mt-2 rounded-2xl overflow-hidden shadow-xl"
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid rgba(120,120,140,0.15)',
          }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-black/5 app-pressable"
              style={{
                background: lang === l.code ? 'rgba(94,92,230,0.1)' : 'transparent',
              }}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1">{l.nativeName}</span>
              <span className="text-xs" style={{ color: 'rgba(120,120,140,0.5)' }}>{l.name}</span>
              {lang === l.code && <Check size={16} style={{ color: '#5E5CE6' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
