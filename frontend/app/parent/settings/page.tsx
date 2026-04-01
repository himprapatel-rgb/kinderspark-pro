'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { logoutApi } from '@/lib/api'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { AppIcon } from '@/components/icons'
import { Bell, Globe, LogOut, Shield, User } from 'lucide-react'
import { useTranslation, type SupportedLang } from '@/hooks/useTranslation'

const LANGS = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
  { code: 'ur', label: 'اردو',     flag: '🇵🇰' },
  { code: 'hi', label: 'हिंदी',    flag: '🇮🇳' },
]

const NOTIF_FREQ = [
  { id: 'instant', label: '⚡ Instant', desc: 'As it happens' },
  { id: 'daily',   label: '📋 Daily',   desc: 'Morning digest' },
  { id: 'weekly',  label: '📊 Weekly',  desc: 'Sunday summary' },
] as const

export default function ParentSettingsPage() {
  const router    = useRouter()
  const settings  = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const { setLang } = useTranslation()
  const user      = useAppStore(s => s.user)
  const children  = useAppStore(s => s.children)
  const logout    = useAppStore(s => s.logout)
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { permission, subscribe } = usePushNotifications('parent', user?.id)
  const notifFreq   = settings.notifFreq ?? 'daily'
  const primaryChild = children[0]

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--app-bg)' }}>

      {/* ── Hero ── */}
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, var(--role-parent), #5FBF7F)' }}>
        <button onClick={() => router.push('/parent')}
          className="text-white/80 font-bold mb-4 flex items-center gap-1 app-pressable text-sm">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>
            <AppIcon name="parent" size="md" roleTone="parent" decorative />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">Settings</h1>
            <p className="text-white/75 text-sm font-bold">Family controls &amp; preferences</p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-2xl mx-auto">

        {/* ── Family Controls ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-parent)' }}>
            Family Controls
          </p>

          {primaryChild ? (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: 'rgba(76,175,106,0.08)', border: '1px solid rgba(76,175,106,0.2)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(76,175,106,0.15)' }}>
                {primaryChild.avatar ?? '🧒'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate">{primaryChild.name}</div>
                <div className="text-xs font-bold app-muted">Linked child account</div>
              </div>
              <AppIcon name="progress" size="sm" roleTone="parent" decorative />
            </div>
          ) : (
            <div className="text-sm font-bold app-muted text-center py-3">No linked child found</div>
          )}

          <button onClick={() => router.push('/parent/consent')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <Shield size={18} style={{ color: 'var(--role-parent)' }} aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-black">Consent &amp; Permissions</div>
              <div className="text-xs font-bold app-muted">AI usage · photos · data sharing</div>
            </div>
            <span className="app-muted font-bold">›</span>
          </button>
        </div>

        {/* ── Notifications ── */}
        <div className="app-card page-section">
          <p className="section-label mb-0" style={{ color: 'var(--role-parent)' }}>
            <Bell size={14} className="inline mr-1" aria-hidden />
            Notifications
          </p>

          <div>
            <div className="text-sm font-black mb-1">Update Frequency</div>
            <div className="text-xs font-bold mb-3 app-muted">How often you receive your child's progress updates</div>
            <div className="grid grid-cols-3 gap-2">
              {NOTIF_FREQ.map(opt => (
                <button key={opt.id}
                  onClick={() => updateSettings({ notifFreq: opt.id })}
                  className="py-3 px-2 rounded-xl text-center app-pressable"
                  style={{
                    background: notifFreq === opt.id ? 'var(--role-parent)' : 'var(--app-surface-soft)',
                    color:      notifFreq === opt.id ? '#fff' : 'rgb(var(--foreground-rgb))',
                    border:     notifFreq === opt.id
                      ? '2px solid color-mix(in srgb, var(--role-parent) 78%, white 22%)'
                      : '1px solid var(--app-border)',
                  }}>
                  <div className="font-black text-sm">{opt.label}</div>
                  <div className="text-[10px] font-bold mt-0.5 opacity-75">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black">Push Alerts</div>
              <div className="text-xs font-bold app-muted">
                {permission === 'granted'
                  ? 'Active — homework, reports, messages'
                  : permission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Get notified when your child completes work'}
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
                  background: permission === 'denied' ? 'rgba(120,120,140,0.2)' : 'var(--role-parent)',
                  color: '#fff',
                  opacity: permission === 'denied' ? 0.5 : 1,
                }}>
                {permission === 'denied' ? 'Blocked' : 'Enable'}
              </button>
            )}
          </div>
        </div>

        {/* ── Language ── */}
        <div className="app-card">
          <p className="section-label mb-4" style={{ color: 'var(--role-parent)' }}>
            <Globe size={14} className="inline mr-1" aria-hidden />
            Language
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(lang => (
              <button key={lang.code}
                onClick={() => setLang(lang.code as SupportedLang)}
                className="py-2.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 app-pressable"
                style={{
                  background: settings.lang === lang.code ? 'var(--role-parent)' : 'var(--app-surface-soft)',
                  color:      settings.lang === lang.code ? '#fff' : 'rgb(var(--foreground-rgb))',
                  border:     settings.lang === lang.code
                    ? '2px solid color-mix(in srgb, var(--role-parent) 78%, white 22%)'
                    : '1px solid var(--app-border)',
                }}>
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Account ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-parent)' }}>
            <User size={14} className="inline mr-1" aria-hidden />
            Account
          </p>

          <button onClick={() => router.push('/parent/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
              style={{ background: 'var(--role-parent)' }}>
              {user?.name?.charAt(0).toUpperCase() ?? 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black truncate">{user?.name ?? 'My Profile'}</div>
              <div className="text-xs font-bold app-muted">Edit name · email · address</div>
            </div>
            <span className="app-muted font-bold flex-shrink-0">›</span>
          </button>

          <button onClick={() => router.push('/privacy')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <Shield size={18} style={{ color: 'var(--app-text-muted)' }} aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-black">Privacy Policy</div>
              <div className="text-xs font-bold app-muted">GDPR · COPPA · your data rights</div>
            </div>
            <span className="app-muted font-bold">›</span>
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
          role="dialog" aria-modal="true" aria-labelledby="parent-logout-title">
          <div className="w-full max-w-sm app-card">
            <h3 id="parent-logout-title" className="text-lg font-black text-center">Sign out?</h3>
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
