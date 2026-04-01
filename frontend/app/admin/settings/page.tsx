'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { logoutApi } from '@/lib/api'
import { AppIcon } from '@/components/icons'
import { LogOut, Monitor, Shield, User } from 'lucide-react'

const ACCESSIBILITY = [
  { key: 'large', label: 'Large Text',    desc: 'Bigger font for readability' },
  { key: 'hc',    label: 'High Contrast', desc: 'Stronger color contrast' },
  { key: 'dys',   label: 'Dyslexia Font', desc: 'Atkinson Hyperlegible typeface' },
] as const

export default function AdminSettingsPage() {
  const router    = useRouter()
  const settings  = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const user      = useAppStore(s => s.user)
  const role      = useAppStore(s => s.role)
  const logout    = useAppStore(s => s.logout)
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isPrincipal = role === 'principal'
  const roleLabel   = isPrincipal ? 'Principal' : 'Admin'
  const dashRoute   = isPrincipal ? '/principal' : '/admin'

  const SCHOOL_LINKS = [
    { icon: 'reports'   as const, label: 'Overview & Analytics', desc: 'School-wide stats and KPIs',          route: dashRoute },
    { icon: 'students'  as const, label: 'Students & Classes',    desc: 'Manage class enrollments',            route: '/admin/classes' },
    { icon: 'teacher'   as const, label: 'Staff & Roles',         desc: 'Teachers, admins, access rights',     route: '/admin' },
  ]

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--app-bg)' }}>

      {/* ── Hero ── */}
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, var(--role-admin), #324A70)' }}>
        <button onClick={() => router.push(dashRoute)}
          className="text-white/80 font-bold mb-4 flex items-center gap-1 app-pressable text-sm">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>
            <AppIcon name="settings" size="md" roleTone="admin" decorative />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">Settings</h1>
            <p className="text-white/75 text-sm font-bold">{roleLabel} account &amp; preferences</p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-2xl mx-auto">

        {/* ── School Management ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-admin)' }}>
            School Management
          </p>
          {SCHOOL_LINKS.map(item => (
            <button key={item.label}
              onClick={() => router.push(item.route)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
              style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <AppIcon name={item.icon} size="sm" roleTone="admin" decorative />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black">{item.label}</div>
                <div className="text-xs font-bold app-muted">{item.desc}</div>
              </div>
              <span className="app-muted font-bold flex-shrink-0">›</span>
            </button>
          ))}
        </div>

        {/* ── Appearance ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-admin)' }}>
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

        {/* ── Privacy ── */}
        <div className="app-card">
          <p className="section-label mb-3" style={{ color: 'var(--role-admin)' }}>
            <Shield size={14} className="inline mr-1" aria-hidden />
            Privacy &amp; Security
          </p>
          <button onClick={() => router.push('/privacy')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <Shield size={18} style={{ color: 'var(--app-text-muted)' }} aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-black">Privacy Policy</div>
              <div className="text-xs font-bold app-muted">GDPR · COPPA · school data rights</div>
            </div>
            <span className="app-muted font-bold">›</span>
          </button>
        </div>

        {/* ── My Account ── */}
        <div className="app-card page-section">
          <p className="section-label" style={{ color: 'var(--role-admin)' }}>
            <User size={14} className="inline mr-1" aria-hidden />
            My Account
          </p>
          <button onClick={() => router.push('/admin/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
              style={{ background: 'var(--role-admin)' }}>
              {user?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black truncate">{user?.name ?? 'My Profile'}</div>
              <div className="text-xs font-bold app-muted">Edit name · email · account details</div>
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
          <div className="text-xs font-bold mt-1 app-muted">AI-powered learning platform</div>
        </div>
      </div>

      {/* ── Logout modal ── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          role="dialog" aria-modal="true" aria-labelledby="admin-logout-title">
          <div className="w-full max-w-sm app-card">
            <h3 id="admin-logout-title" className="text-lg font-black text-center">Sign out?</h3>
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
