'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { logoutApi } from '@/lib/api'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useTranslation, type SupportedLang } from '@/hooks/useTranslation'
import DiagnosticsPanel from '@/components/DiagnosticsPanel'
import PrivacyGeofenceCard from '@/components/Settings/Privacy'
import { Bell, LogOut, Volume2 } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { getApiTTSStatus, getVoiceProfile, resetApiTTSCheck, setVoiceEnabled, setVoiceProfile, speak } from '@/lib/speech'
import KidAvatar from '@/components/KidAvatar'

const LANGS = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
  { code: 'ur', label: 'اردو',     flag: '🇵🇰' },
  { code: 'hi', label: 'हिंदी',    flag: '🇮🇳' },
]

const SESSION_LIMITS = [10, 15, 20, 30, 45, 60]

export default function ChildSettingsPage() {
  const router     = useRouter()
  const { t, setLang } = useTranslation()
  const settings   = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const user       = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const logout     = useAppStore(s => s.logout)
  const student    = currentStudent || user
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState(false)
  const { permission, subscribe } = usePushNotifications(
    'student',
    user?.legacyStudentId || student?.id || user?.id
  )
  const voiceOn     = settings.voiceOn !== false
  const voiceProfile = settings.voiceProfile || 'auto'
  const [ttsStatus, setTtsStatus] = useState<'human' | 'device' | 'unknown'>('unknown')

  useEffect(() => {
    setVoiceEnabled(voiceOn)
    setVoiceProfile((voiceProfile || getVoiceProfile()) as 'auto' | 'girl' | 'boy')
  }, [voiceOn, voiceProfile])

  // Probe TTS status on mount (fires a tiny test to see if human voice is available)
  useEffect(() => {
    setTtsStatus(getApiTTSStatus())
    const id = setInterval(() => setTtsStatus(getApiTTSStatus()), 30_000)
    return () => clearInterval(id)
  }, [])

  const previewVoice = () => {
    setPreviewingVoice(true)
    const text = voiceProfile === 'girl'
      ? 'Hi! I am your learning voice. Let us learn together!'
      : voiceProfile === 'boy'
        ? 'Hey! I am your learning voice. Let us have fun learning!'
        : 'Hi there! I am your helper voice. Ready for learning time?'
    speak(text, { onEnd: () => setPreviewingVoice(false) })
    setTimeout(() => setPreviewingVoice(false), 4000)
  }

  return (
    <div className="min-h-screen pb-12 app-container" style={{ background: 'var(--app-bg)' }}>

      {/* ── Hero — "My Space" ── */}
      <div className="relative overflow-hidden px-5 pt-10 pb-6"
        style={{ background: 'linear-gradient(135deg, #F5A623 0%, #E0669A 55%, #8B6CC1 100%)' }}>
        {/* Decorative stars */}
        <div className="absolute right-4 top-6 text-white/20 text-4xl select-none pointer-events-none animate-bounce-subtle">✨</div>
        <div className="absolute left-3 bottom-4 text-white/15 text-2xl select-none pointer-events-none animate-bounce-subtle" style={{ animationDelay: '0.4s' }}>⭐</div>

        <button onClick={() => router.push('/child')}
          className="text-white/80 font-bold mb-4 flex items-center gap-1 app-pressable text-sm">
          ← Back
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.35)' }}>
              <KidAvatar
                studentId={student?.id}
                ownedItems={(student as any)?.ownedItems}
                fallback={student?.avatar || '🧒'}
                size={48}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: 'var(--app-gold)', border: '2px solid white' }}>
              ⚙️
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">
              {student?.name ? `${student.name}'s Space` : 'My Space'}
            </h1>
            <p className="text-white/75 text-sm font-bold mt-0.5">Customise your learning adventure</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── 🎨 My Identity ── */}
        <div className="app-card space-y-3">
          <p className="section-label">🎨 My Identity</p>

          <button onClick={() => router.push('/child/avatar-builder')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(139,108,193,0.12))', border: '1px solid rgba(245,166,35,0.3)' }}>
            <span className="text-2xl">🎭</span>
            <div className="flex-1">
              <div className="text-sm font-black">Build My Avatar</div>
              <div className="text-xs font-bold app-muted">Create a custom character just for you</div>
            </div>
            <span className="font-bold app-muted">›</span>
          </button>

          <button onClick={() => router.push('/child/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <span className="text-2xl">✏️</span>
            <div className="flex-1">
              <div className="text-sm font-black">Edit My Profile</div>
              <div className="text-xs font-bold app-muted">Name, photo, profile details</div>
            </div>
            <span className="font-bold app-muted">›</span>
          </button>
        </div>

        {/* ── 👁️ Look & Feel ── */}
        <div className="app-card space-y-4">
          <p className="section-label">👁️ Look &amp; Feel</p>

          {[
            { key: 'large', emoji: '🔠', label: 'Big Letters',    desc: 'Makes all text bigger and easier to read' },
            { key: 'hc',    emoji: '🌗', label: 'Strong Colours', desc: 'High contrast — great for bright screens' },
            { key: 'dys',   emoji: '📖', label: 'Reading Font',   desc: 'Special font that helps with reading' },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <span className="text-xl w-8 text-center flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black">{item.label}</div>
                <div className="text-xs font-bold app-muted">{item.desc}</div>
              </div>
              <button
                onClick={() => updateSettings({ [item.key]: !settings[item.key as keyof typeof settings] })}
                className="app-toggle app-pressable flex-shrink-0"
                role="switch"
                aria-checked={!!settings[item.key as keyof typeof settings]}
                aria-label={item.label}
                data-on={!!settings[item.key as keyof typeof settings]}>
                <div className="app-toggle-knob" data-on={!!settings[item.key as keyof typeof settings]} />
              </button>
            </div>
          ))}
        </div>

        {/* ── ⏱ Screen Time ── */}
        <div className="app-card">
          <p className="section-label mb-1">⏱ Screen Time</p>
          <div className="text-xs font-bold mb-4 app-muted">Max minutes per learning session</div>
          <div className="flex flex-wrap gap-2">
            {SESSION_LIMITS.map(mins => (
              <button key={mins}
                onClick={() => updateSettings({ stLimit: mins })}
                className="px-4 py-2 rounded-xl font-black text-sm app-pressable"
                style={{
                  background: settings.stLimit === mins ? 'var(--role-child)' : 'var(--app-surface-soft)',
                  color:      settings.stLimit === mins ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border:     settings.stLimit === mins
                    ? '2px solid color-mix(in srgb, var(--role-child) 78%, white 22%)'
                    : '1px solid var(--app-border)',
                }}>
                {mins}m
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs font-bold app-muted">Current: </span>
            <span className="font-black text-sm" style={{ color: 'var(--role-child)' }}>{settings.stLimit} minutes</span>
          </div>
        </div>

        {/* ── 🎤 My Voice ── */}
        <div className="app-card space-y-3">
          <p className="section-label">🎤 My Voice</p>

          <div className="flex items-center gap-3">
            <Volume2 size={20} style={{ color: 'var(--role-child)' }} aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-black">Voice Guide</div>
              <div className="text-xs font-bold app-muted">Read questions and stories out loud</div>
            </div>
            <button
              onClick={() => updateSettings({ voiceOn: !voiceOn })}
              className="app-toggle app-pressable flex-shrink-0"
              role="switch"
              aria-checked={voiceOn}
              aria-label="Voice Guide"
              data-on={voiceOn}>
              <div className="app-toggle-knob" data-on={voiceOn} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'auto', label: '🤖 Auto' },
              { id: 'girl', label: '👧 Girl' },
              { id: 'boy',  label: '👦 Boy' },
            ].map(opt => (
              <button key={opt.id}
                onClick={() => updateSettings({ voiceProfile: opt.id as 'auto' | 'girl' | 'boy' })}
                className="py-2.5 rounded-xl font-black text-xs app-pressable min-h-11"
                style={{
                  background: voiceProfile === opt.id ? 'var(--role-child)' : 'var(--app-surface-soft)',
                  color:      voiceProfile === opt.id ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border:     voiceProfile === opt.id
                    ? '2px solid color-mix(in srgb, var(--role-child) 78%, white 22%)'
                    : '1px solid var(--app-border)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* TTS provider status */}
          {ttsStatus === 'human' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(76,175,106,0.12)', border: '1px solid rgba(76,175,106,0.25)' }}>
              <span className="text-base">🎙️</span>
              <div>
                <div className="text-xs font-black" style={{ color: 'var(--app-success)' }}>Human AI Voice</div>
                <div className="text-[10px] font-bold app-muted">Natural, warm voice — sounds like a real person!</div>
              </div>
            </div>
          )}
          {ttsStatus === 'device' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)' }}>
              <span className="text-base">📢</span>
              <div className="flex-1">
                <div className="text-xs font-black" style={{ color: '#D4881A' }}>Device Voice</div>
                <div className="text-[10px] font-bold app-muted">Using your device's built-in voice</div>
              </div>
              <button onClick={() => { resetApiTTSCheck(); setTtsStatus('unknown') }}
                className="px-2 py-1 rounded-lg text-[10px] font-black app-pressable flex-shrink-0"
                style={{ background: 'rgba(245,166,35,0.2)', color: '#D4881A' }}>
                Retry
              </button>
            </div>
          )}

          <button onClick={previewVoice} disabled={!voiceOn || previewingVoice}
            className="w-full min-h-11 py-2.5 rounded-xl font-black text-sm app-pressable disabled:opacity-50"
            style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)', color: '#D4881A' }}>
            {previewingVoice ? '🔊 Playing…' : '▶ Play Voice Sample'}
          </button>
        </div>

        {/* ── 🌍 Language ── */}
        <div className="app-card">
          <p className="section-label mb-4">🌍 Language</p>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(lang => (
              <button key={lang.code}
                onClick={() => setLang(lang.code as SupportedLang)}
                className="py-3 rounded-xl font-black text-xs flex flex-col items-center gap-1 app-pressable"
                style={{
                  background: settings.lang === lang.code ? 'var(--role-child)' : 'var(--app-surface-soft)',
                  color:      settings.lang === lang.code ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border:     settings.lang === lang.code
                    ? '2px solid color-mix(in srgb, var(--role-child) 78%, white 22%)'
                    : '1px solid var(--app-border)',
                }}>
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 🔔 Notifications ── */}
        <div className="app-card">
          <p className="section-label mb-3">🔔 Reminders</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black">Homework Reminders</div>
              <div className="text-xs font-bold app-muted">
                {permission === 'granted' ? '✅ Reminders are on!' : permission === 'denied' ? 'Blocked in browser settings' : 'Get a nudge when homework is due'}
              </div>
            </div>
            {permission === 'granted' ? (
              <div className="w-12 h-6 rounded-full relative flex-shrink-0" style={{ background: 'var(--app-success)' }}>
                <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            ) : (
              <button onClick={subscribe} disabled={permission === 'denied'}
                className="px-3 py-1.5 rounded-xl text-xs font-black app-pressable flex-shrink-0"
                style={{
                  background: permission === 'denied' ? 'rgba(120,120,140,0.2)' : 'var(--role-child)',
                  color: '#fff',
                  opacity: permission === 'denied' ? 0.5 : 1,
                }}>
                {permission === 'denied' ? 'Blocked' : 'Turn On'}
              </button>
            )}
          </div>
        </div>

        <DiagnosticsPanel />
        <PrivacyGeofenceCard />

        {/* ── Sign Out ── */}
        <div className="app-card space-y-3">
          <p className="section-label">👋 Account</p>
          <button onClick={() => setShowLogout(true)} disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm app-pressable min-h-11 disabled:opacity-60"
            style={{ background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.18)', color: '#E05252' }}>
            <LogOut size={16} aria-hidden />
            Sign Out
          </button>
        </div>

        {/* About */}
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-xs font-bold app-muted">KinderSpark Pro • v2.0 ✨</div>
          <div className="text-xs font-bold mt-1 app-muted">Learning is your superpower!</div>
        </div>
      </div>

      {/* ── Logout modal ── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          role="dialog" aria-modal="true" aria-labelledby="child-logout-title">
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="text-4xl text-center mb-2">👋</div>
            <h3 id="child-logout-title" className="text-lg font-black text-center">{t('sign_out_confirm_title')}</h3>
            <p className="text-xs font-bold app-muted mt-2 text-center">{t('sign_out_confirm_body')}</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-xl text-sm font-black app-pressable min-h-11"
                style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                {t('cancel')}
              </button>
              <button
                onClick={async () => {
                  setLoggingOut(true)
                  try { await logoutApi().catch(() => {}) } finally { logout(); window.location.href = '/login' }
                }}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white app-pressable min-h-11 flex items-center justify-center gap-2"
                style={{ background: '#E05252' }}>
                <LogOut size={16} aria-hidden />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
