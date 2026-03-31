'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { logoutApi } from '@/lib/api'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useTranslation } from '@/hooks/useTranslation'
import DiagnosticsPanel from '@/components/DiagnosticsPanel'
import PrivacyGeofenceCard from '@/components/Settings/Privacy'
import { Bell, Eye, Globe, Monitor, Settings, Timer, User, LogOut, Volume2 } from 'lucide-react'
import { getVoiceProfile, setVoiceEnabled, setVoiceProfile, speak } from '@/lib/speech'
import KidAvatar from '@/components/KidAvatar'

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
]

const SESSION_LIMITS = [10, 15, 20, 30, 45, 60]

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const logout = useAppStore(s => s.logout)
  const student = currentStudent || user
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState(false)

  const acc = settings.large ? 'text-lg' : 'text-sm'
  const { permission, subscribe } = usePushNotifications(student?.id)

  const voiceOn = settings.voiceOn !== false
  const voiceProfile = settings.voiceProfile || 'auto'

  useEffect(() => {
    // Keep speech engine in sync with persisted app settings.
    setVoiceEnabled(voiceOn)
    setVoiceProfile((voiceProfile || getVoiceProfile()) as 'auto' | 'girl' | 'boy')
  }, [voiceOn, voiceProfile])

  const previewVoice = () => {
    setPreviewingVoice(true)
    const profile = voiceProfile
    const text =
      profile === 'girl'
        ? 'Hi! I am your learning voice. Let us learn together!'
        : profile === 'boy'
          ? 'Hey! I am your learning voice. Let us have fun learning!'
          : 'Hi there! I am your helper voice. Ready for learning time?'
    speak(text, { onEnd: () => setPreviewingVoice(false) })
    setTimeout(() => setPreviewingVoice(false), 4000)
  }

  return (
    <div className="min-h-screen pb-10 app-container" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="p-5 pt-10" style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--role-admin))' }}>
        <button onClick={() => router.push('/child')} className="text-white/80 font-bold mb-3 flex items-center gap-1 app-pressable">
          ← Back
        </button>
        <div className="text-2xl font-black text-white flex items-center gap-2"><Settings size={22} /> Settings</div>
        <div className="text-white/80 font-bold text-sm mt-1">Accessibility & Preferences</div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Display */}
        <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base flex items-center gap-2"><Monitor size={16} /> Display</div>

          {/* Large Text */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${acc}`}>Large Text</div>
              <div className="text-xs font-bold app-muted">Bigger letters for easier reading</div>
            </div>
            <button
              onClick={() => updateSettings({ large: !settings.large })}
              className="app-toggle app-pressable"
              role="switch"
              aria-checked={settings.large}
              aria-label="Large Text"
              data-on={settings.large}>
              <div className="app-toggle-knob" data-on={settings.large} />
            </button>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${acc}`}>High Contrast</div>
              <div className="text-xs font-bold app-muted">Stronger color contrast for visibility</div>
            </div>
            <button
              onClick={() => updateSettings({ hc: !settings.hc })}
              className="app-toggle app-pressable"
              role="switch"
              aria-checked={settings.hc}
              aria-label="High Contrast"
              data-on={settings.hc}>
              <div className="app-toggle-knob" data-on={settings.hc} />
            </button>
          </div>

          {/* Dyslexia Font */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${acc}`}>Dyslexia-Friendly Font</div>
              <div className="text-xs font-bold app-muted">Uses Comic Sans for easier letter recognition</div>
            </div>
            <button
              onClick={() => updateSettings({ dys: !settings.dys })}
              className="app-toggle app-pressable"
              role="switch"
              aria-checked={settings.dys}
              aria-label="Dyslexia-Friendly Font"
              data-on={settings.dys}>
              <div className="app-toggle-knob" data-on={settings.dys} />
            </button>
          </div>
        </div>

        {/* Session Limit */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base mb-3 flex items-center gap-2"><Timer size={16} /> Daily Screen Limit</div>
          <div className="text-xs font-bold mb-3 app-muted">Maximum minutes per session</div>
          <div className="flex flex-wrap gap-2">
            {SESSION_LIMITS.map(mins => (
              <button
                key={mins}
                onClick={() => updateSettings({ stLimit: mins })}
                className="px-4 py-2 rounded-xl font-black text-sm transition-all app-pressable"
                style={{
                  background: settings.stLimit === mins ? 'var(--app-accent)' : 'var(--app-surface-soft)',
                  color: settings.stLimit === mins ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border: settings.stLimit === mins ? '2px solid color-mix(in srgb, var(--app-accent) 78%, white 22%)' : '1px solid var(--app-border)',
                }}>
                {mins}m
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs font-bold app-muted">Current limit: </span>
            <span className="font-black text-sm" style={{ color: 'var(--app-accent)' }}>{settings.stLimit} minutes</span>
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base mb-3 flex items-center gap-2"><Globe size={16} /> Language</div>
          <div className="grid grid-cols-3 gap-3">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => updateSettings({ lang: lang.code })}
                className="py-3 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all app-pressable"
                style={{
                  background: settings.lang === lang.code ? 'var(--app-accent)' : 'var(--app-surface-soft)',
                  border: settings.lang === lang.code ? '2px solid color-mix(in srgb, var(--app-accent) 78%, white 22%)' : '1px solid var(--app-border)',
                  color: settings.lang === lang.code ? '#fff' : 'rgb(var(--foreground-rgb))',
                }}>
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base flex items-center gap-2"><Volume2 size={16} /> Voice</div>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${acc}`}>Voice Guide</div>
              <div className="text-xs font-bold app-muted">Use a natural voice while reading questions and stories.</div>
            </div>
            <button
              onClick={() => updateSettings({ voiceOn: !voiceOn })}
              className="app-toggle app-pressable"
              role="switch"
              aria-checked={voiceOn}
              aria-label="Voice Guide"
              data-on={voiceOn}
            >
              <div className="app-toggle-knob" data-on={voiceOn} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'auto', label: 'Auto' },
              { id: 'girl', label: 'Girl' },
              { id: 'boy', label: 'Boy' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({ voiceProfile: opt.id as 'auto' | 'girl' | 'boy' })}
                className="py-2.5 rounded-xl font-black text-xs app-pressable min-h-11"
                style={{
                  background: voiceProfile === opt.id ? 'var(--app-accent)' : 'var(--app-surface-soft)',
                  color: voiceProfile === opt.id ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border: voiceProfile === opt.id ? '2px solid color-mix(in srgb, var(--app-accent) 78%, white 22%)' : '1px solid var(--app-border)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={previewVoice}
            disabled={!voiceOn || previewingVoice}
            className="w-full min-h-11 py-2.5 rounded-xl font-black text-sm app-pressable disabled:opacity-55"
            style={{ background: 'rgba(94,92,230,0.18)', border: '1px solid rgba(94,92,230,0.35)', color: '#5B7FE8' }}
          >
            {previewingVoice ? 'Playing sample...' : 'Play Voice Sample'}
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base mb-3 flex items-center gap-2"><Eye size={16} /> Preview</div>
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: settings.hc ? 'rgba(15,15,18,0.95)' : 'var(--app-surface-soft)',
              border: settings.hc ? '2px solid #fff' : '1px solid var(--app-border)',
              fontFamily: settings.dys ? "'Comic Sans MS', 'Comic Sans', cursive" : 'inherit',
            }}>
            <div className="text-5xl mb-2">🌟</div>
            <div
              className="font-black"
              style={{
                fontSize: settings.large ? 22 : 16,
                color: settings.hc ? '#fff' : 'rgb(var(--foreground-rgb))',
              }}>
              Hello, {student?.name || 'Learner'}!
            </div>
            <div
              className="mt-1 font-bold"
              style={{
                fontSize: settings.large ? 16 : 12,
                color: settings.hc ? '#ffff00' : 'var(--app-text-muted)',
              }}>
              This is how text will look ✨
            </div>
          </div>
        </div>

        <DiagnosticsPanel />

        <PrivacyGeofenceCard />

        {/* Notifications */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base mb-3 flex items-center gap-2"><Bell size={16} /> Notifications</div>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold ${acc}`}>Homework Reminders</div>
              <div className="text-xs font-bold app-muted">
                {permission === 'granted' ? 'Notifications are on' : permission === 'denied' ? 'Blocked in browser settings' : 'Get alerts when homework is due'}
              </div>
            </div>
            {permission === 'granted' ? (
              <div className="w-12 h-6 rounded-full relative" style={{ background: 'var(--app-success)' }}>
                <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            ) : (
              <button
                onClick={subscribe}
                disabled={permission === 'denied'}
                className="px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 app-pressable"
                style={{ background: permission === 'denied' ? 'rgba(120,120,140,0.35)' : 'var(--app-accent)', color: permission === 'denied' ? 'rgba(255,255,255,0.7)' : '#fff' }}
              >
                {permission === 'denied' ? 'Blocked' : 'Enable'}
              </button>
            )}
          </div>
        </div>

        {/* Profile & Logout */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-base flex items-center gap-2"><User size={16} /> Account</div>
          <button
            onClick={() => router.push('/child/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
          >
            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <KidAvatar
                studentId={student?.id}
                ownedItems={(student as any)?.ownedItems}
                fallback={student?.avatar || '🧒'}
                size={28}
              />
            </span>
            <div className="flex-1">
              <div className="text-sm font-black">{student?.name || 'My Profile'}</div>
              <div className="text-xs font-bold app-muted">View & edit profile · Profile ID</div>
            </div>
            <span className="text-sm font-bold app-muted">›</span>
          </button>
          <button
            onClick={() => router.push('/child/avatar-builder')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all app-pressable"
            style={{ background: 'rgba(91,127,232,0.12)', border: '1px solid rgba(91,127,232,0.35)' }}
          >
            <span className="text-xl">🎨</span>
            <div className="flex-1">
              <div className="text-sm font-black">Create My Avatar</div>
              <div className="text-xs font-bold app-muted">Build a custom look like a mini character.</div>
            </div>
            <span className="text-sm font-bold app-muted">›</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all app-pressable min-h-11 disabled:opacity-60"
            style={{
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.2)',
              color: '#E05252',
            }}
          >
            {loggingOut ? (
              <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <LogOut size={17} aria-hidden />
            )}
            Sign Out
          </button>
        </div>

        {showLogoutConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="child-logout-title"
          >
            <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <h3 id="child-logout-title" className="text-lg font-black text-center">
                {t('sign_out_confirm_title')}
              </h3>
              <p className="text-xs font-bold app-muted mt-2 text-center">{t('sign_out_confirm_body')}</p>
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-black app-pressable min-h-11"
                  style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoggingOut(true)
                    try {
                      await logoutApi().catch(() => {})
                    } finally {
                      logout()
                      window.location.href = '/login'
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white app-pressable min-h-11 flex items-center justify-center gap-2"
                  style={{ background: '#E05252' }}
                >
                  <LogOut size={16} aria-hidden />
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-xs font-bold app-muted">KinderSpark Pro • v2.0</div>
          <div className="text-xs font-bold mt-1 app-muted">AI-powered learning for every child</div>
        </div>
      </div>
    </div>
  )
}
