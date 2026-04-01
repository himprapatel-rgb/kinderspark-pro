'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { logoutApi } from '@/lib/api'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { AppIcon } from '@/components/icons'
import { Bell, LogOut, Monitor, User } from 'lucide-react'

const LANGS = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
  { code: 'ur', label: 'اردو',     flag: '🇵🇰' },
  { code: 'hi', label: 'हिंदी',    flag: '🇮🇳' },
]

const DIFFICULTIES = [
  { id: 'easy',   label: '🌱 Easy',   desc: 'Simpler tasks, more guidance' },
  { id: 'medium', label: '⚡ Medium', desc: 'Balanced challenge' },
  { id: 'hard',   label: '🚀 Hard',   desc: 'Stretch activities' },
] as const

const ACCESSIBILITY = [
  { key: 'large', label: 'Large Text',    desc: 'Bigger font — useful for classroom projection' },
  { key: 'hc',    label: 'High Contrast', desc: 'Stronger colors for readability' },
  { key: 'dys',   label: 'Dyslexia Font', desc: 'Atkinson Hyperlegible typeface' },
] as const

export default function TeacherSettingsPage() {
  const router = useRouter()
  const settings   = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const user       = useAppStore(s => s.user)
  const logout     = useAppStore(s => s.logout)
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { permission, subscribe } = usePushNotifications('teacher', user?.id)
  const difficulty = settings.teachDifficulty ?? 'medium'

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--app-bg)' }}>

      {/* ── Hero ── */}
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, var(--role-teacher), #8F8DFF)' }}>
        <button onClick={() => router.push('/teacher')}
          className="text-white/80 font-bold mb-4 flex items-center gap-1 app-pressable text-sm">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>
            <AppIcon name="settings" size="md" roleTone="teacher" decorative />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">Settings</h1>
            <p className="text-white/75 text-sm font-bold">Teaching preferences &amp; account</p>
          </div>
        </div>
        {user?.name && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{ background: 'rgba(255,255,255,0.3)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white text-xs font-black">{user.name}</span>
          </div>
        )}
      </div>

      <div className="page-body max-w-2xl mx-auto">

        {/* ── Teaching Preferences ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-teacher)' }}>
            Teaching Preferences
          </p>

          <div>
            <div className="text-sm font-black mb-1">Default Content Difficulty</div>
            <div className="text-xs font-bold mb-3 app-muted">Applied when generating AI lessons and homework</div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d.id}
                  onClick={() => updateSettings({ teachDifficulty: d.id })}
                  className="py-3 px-2 rounded-xl text-center app-pressable"
                  style={{
                    background: difficulty === d.id ? 'var(--role-teacher)' : 'var(--app-surface-soft)',
                    color:      difficulty === d.id ? '#fff' : 'rgb(var(--foreground-rgb))',
                    border:     difficulty === d.id
                      ? '2px solid color-mix(in srgb, var(--role-teacher) 78%, white 22%)'
                      : '1px solid var(--app-border)',
                  }}>
                  <div className="font-black text-sm">{d.label}</div>
                  <div className="text-[10px] font-bold mt-0.5 opacity-75">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-black mb-1">Language of Instruction</div>
            <div className="text-xs font-bold mb-3 app-muted">Primary language used in the classroom</div>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map(lang => (
                <button key={lang.code}
                  onClick={() => updateSettings({ lang: lang.code })}
                  className="py-2.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 app-pressable"
                  style={{
                    background: settings.lang === lang.code ? 'var(--role-teacher)' : 'var(--app-surface-soft)',
                    color:      settings.lang === lang.code ? '#fff' : 'rgb(var(--foreground-rgb))',
                    border:     settings.lang === lang.code
                      ? '2px solid color-mix(in srgb, var(--role-teacher) 78%, white 22%)'
                      : '1px solid var(--app-border)',
                  }}>
                  <span className="text-xl">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="app-card">
          <p className="section-label mb-3" style={{ color: 'var(--role-teacher)' }}>
            <Bell size={14} className="inline mr-1" aria-hidden />
            Notifications
          </p>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black">Push Alerts</div>
              <div className="text-xs font-bold app-muted">
                {permission === 'granted'
                  ? 'Active — parent messages, homework, reports'
                  : permission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Get alerts for parent messages and student activity'}
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
                  background: permission === 'denied' ? 'rgba(120,120,140,0.2)' : 'var(--role-teacher)',
                  color: '#fff',
                  opacity: permission === 'denied' ? 0.5 : 1,
                }}>
                {permission === 'denied' ? 'Blocked' : 'Enable'}
              </button>
            )}
          </div>
        </div>

        {/* ── Appearance ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-teacher)' }}>
            <Monitor size={14} className="inline mr-1" aria-hidden />
            Appearance &amp; Accessibility
          </p>
          {ACCESSIBILITY.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black">{item.label}</div>
                <div className="text-xs font-bold app-muted">{item.desc}</div>
              </div>
              <button
                onClick={() => updateSettings({ [item.key]: !settings[item.key] })}
                className="app-toggle app-pressable flex-shrink-0"
                role="switch"
                aria-checked={!!settings[item.key]}
                aria-label={item.label}
                data-on={!!settings[item.key]}>
                <div className="app-toggle-knob" data-on={!!settings[item.key]} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Account ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-teacher)' }}>
            <User size={14} className="inline mr-1" aria-hidden />
            Account
          </p>
          <button onClick={() => router.push('/teacher/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
              style={{ background: 'var(--role-teacher)' }}>
              {user?.name?.charAt(0).toUpperCase() ?? 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black truncate">{user?.name ?? 'My Profile'}</div>
              <div className="text-xs font-bold app-muted">Edit name · email · profile photo</div>
            </div>
            <span className="app-muted font-bold flex-shrink-0">›</span>
          </button>
          <button onClick={() => setShowLogout(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm app-pressable min-h-11"
            style={{ background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.18)', color: '#E05252' }}>
            <LogOut size={16} aria-hidden />
            Sign Out
          </button>
        </div>

        <div className="app-card text-center">
          <div className="text-xs font-bold app-muted">KinderSpark Pro • v2.0</div>
          <div className="text-xs font-bold mt-1 app-muted">AI-powered learning for every child</div>
        </div>
      </div>

      {/* ── Logout modal ── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          role="dialog" aria-modal="true" aria-labelledby="teacher-logout-title">
          <div className="w-full max-w-sm app-card">
            <h3 id="teacher-logout-title" className="text-lg font-black text-center">Sign out?</h3>
            <p className="text-xs font-bold app-muted mt-2 text-center">You'll need your PIN to sign back in.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-xl text-sm font-black app-pressable min-h-11"
                style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                Cancel
              </button>
              <button disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true)
                  try { await logoutApi().catch(() => {}) } finally { logout(); window.location.href = '/login' }
                }}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white app-pressable min-h-11 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#E05252' }}>
                <LogOut size={16} aria-hidden />
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
