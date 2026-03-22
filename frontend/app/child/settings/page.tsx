'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
]

const SESSION_LIMITS = [10, 15, 20, 30, 45, 60]

export default function SettingsPage() {
  const router = useRouter()
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const student = currentStudent || user

  const acc = settings.large ? 'text-lg' : 'text-sm'

  return (
    <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0f1a 100%)' }}>
      {/* Header */}
      <div className="p-5 pt-10" style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' }}>
        <button onClick={() => router.push('/child')} className="text-white/70 font-bold mb-3 flex items-center gap-1">
          ← Back
        </button>
        <div className="text-white text-2xl font-black">⚙️ Settings</div>
        <div className="text-white/60 font-bold text-sm mt-1">Accessibility & Preferences</div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Display */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: '#1a1a2e' }}>
          <div className="text-white font-black text-base">🖥️ Display</div>

          {/* Large Text */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-white font-bold ${acc}`}>Large Text</div>
              <div className="text-white/50 text-xs font-bold">Bigger letters for easier reading</div>
            </div>
            <button
              onClick={() => updateSettings({ large: !settings.large })}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: settings.large ? '#30D158' : '#333' }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow"
                style={{ left: settings.large ? '1.625rem' : '0.125rem' }} />
            </button>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-white font-bold ${acc}`}>High Contrast</div>
              <div className="text-white/50 text-xs font-bold">Stronger color contrast for visibility</div>
            </div>
            <button
              onClick={() => updateSettings({ hc: !settings.hc })}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: settings.hc ? '#30D158' : '#333' }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow"
                style={{ left: settings.hc ? '1.625rem' : '0.125rem' }} />
            </button>
          </div>

          {/* Dyslexia Font */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-white font-bold ${acc}`}>Dyslexia-Friendly Font</div>
              <div className="text-white/50 text-xs font-bold">Uses Comic Sans for easier letter recognition</div>
            </div>
            <button
              onClick={() => updateSettings({ dys: !settings.dys })}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: settings.dys ? '#30D158' : '#333' }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow"
                style={{ left: settings.dys ? '1.625rem' : '0.125rem' }} />
            </button>
          </div>
        </div>

        {/* Session Limit */}
        <div className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
          <div className="text-white font-black text-base mb-3">⏱️ Daily Screen Limit</div>
          <div className="text-white/60 text-xs font-bold mb-3">Maximum minutes per session</div>
          <div className="flex flex-wrap gap-2">
            {SESSION_LIMITS.map(mins => (
              <button
                key={mins}
                onClick={() => updateSettings({ stLimit: mins })}
                className="px-4 py-2 rounded-xl font-black text-sm transition-all"
                style={{
                  background: settings.stLimit === mins ? '#5E5CE6' : '#2a2a4e',
                  color: settings.stLimit === mins ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: settings.stLimit === mins ? '2px solid #7a78f0' : '2px solid transparent',
                }}>
                {mins}m
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-white/50 text-xs font-bold">Current limit: </span>
            <span className="text-purple-400 font-black text-sm">{settings.stLimit} minutes</span>
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
          <div className="text-white font-black text-base mb-3">🌍 Language</div>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => updateSettings({ lang: lang.code })}
                className="py-3 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all"
                style={{
                  background: settings.lang === lang.code ? '#5E5CE6' : '#2a2a4e',
                  border: settings.lang === lang.code ? '2px solid #7a78f0' : '2px solid transparent',
                  color: settings.lang === lang.code ? '#fff' : 'rgba(255,255,255,0.5)',
                }}>
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
          <div className="text-white font-black text-base mb-3">👁️ Preview</div>
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: settings.hc ? '#000' : '#0a0a0a',
              border: settings.hc ? '2px solid #fff' : '2px solid #333',
              fontFamily: settings.dys ? "'Comic Sans MS', 'Comic Sans', cursive" : 'inherit',
            }}>
            <div className="text-5xl mb-2">🌟</div>
            <div
              className="font-black"
              style={{
                fontSize: settings.large ? 22 : 16,
                color: settings.hc ? '#fff' : 'rgba(255,255,255,0.9)',
              }}>
              Hello, {student?.name || 'Learner'}!
            </div>
            <div
              className="mt-1 font-bold"
              style={{
                fontSize: settings.large ? 16 : 12,
                color: settings.hc ? '#ffff00' : 'rgba(255,255,255,0.5)',
              }}>
              This is how text will look ✨
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl p-4 text-center" style={{ background: '#1a1a2e' }}>
          <div className="text-white/40 text-xs font-bold">KinderSpark Pro • v1.1</div>
          <div className="text-white/25 text-xs font-bold mt-1">AI-powered learning for every child 🌍</div>
        </div>
      </div>
    </div>
  )
}
