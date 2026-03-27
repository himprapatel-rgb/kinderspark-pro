'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMyProfile, updateMyProfile, logoutApi } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const TOAST_DURATION = 2500

const ROLE_COLORS: Record<string, { color: string; grad: string }> = {
  child:     { color: '#F5A623', grad: 'linear-gradient(135deg,#F5A623,#D4881A)' },
  teacher:   { color: '#5B7FE8', grad: 'linear-gradient(135deg,#5B7FE8,#8B6CC1)' },
  parent:    { color: '#4CAF6A', grad: 'linear-gradient(135deg,#4CAF6A,#5FBF7F)' },
  admin:     { color: '#8B6CC1', grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)' },
  principal: { color: '#8B6CC1', grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)' },
}

export default function ProfileManager({ roleLabel }: { roleLabel: string }) {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const role = useAppStore(s => s.role)
  const setUser = useAppStore(s => s.setUser)
  const logout = useAppStore(s => s.logout)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', avatar: '' })
  const [roles, setRoles] = useState<string[]>([])
  const [profileId, setProfileId] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  const rc = ROLE_COLORS[role || 'child'] || ROLE_COLORS.child

  useEffect(() => {
    if (!user) { router.push('/'); return }
    ;(async () => {
      try {
        const profile = await getMyProfile()
        setForm({
          displayName: profile?.displayName || user.name || '',
          email: profile?.email || '',
          avatar: profile?.avatar || user.avatar || '',
        })
        setRoles((profile?.roleAssignments || []).map((r: any) => String(r.role)))
        setProfileId(profile?.id || user.profileId || user.id || '')
      } catch {
        setForm({
          displayName: user.name || '',
          email: '',
          avatar: user.avatar || '',
        })
        setRoles([(user as any)?.role || 'user'])
        setProfileId(user.profileId || user.id || '')
      } finally {
        setLoading(false)
      }
    })()
  }, [user, router])

  const save = async () => {
    setBusy(true)
    try {
      const updated = await updateMyProfile(form)
      setUser({ ...user, name: updated.displayName, avatar: updated.avatar })
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d5ccc2e0-20b1-4fcf-845d-ede26b674430',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileManager.tsx:save',message:'Profile save success',data:{updated:!!updated},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      showToast('Profile updated ✓', 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to update profile', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch {
      // Non-fatal
    }
    logout()
    window.location.href = '/login'
  }

  const copyId = () => {
    if (profileId) {
      navigator.clipboard?.writeText(profileId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #FFFCF5 0%, #FFF9EE 40%, #F5FAF0 100%)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${rc.color}30`, borderTopColor: rc.color }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFFCF5 0%, #FFF9EE 40%, #F5FAF0 100%)' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: rc.grad }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 px-5 pt-14 pb-8">
          <button onClick={() => router.back()} className="text-white/80 text-sm font-bold mb-4 flex items-center gap-1 app-pressable">
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)' }}>
              {form.avatar || '👤'}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{form.displayName || 'User'}</h1>
              <p className="text-white/70 text-sm font-bold">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-10 pb-10">
        {/* Profile ID Card */}
        <div
          className="rounded-2xl p-4 mb-4 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(70,75,96,0.45)' }}>Profile ID</div>
              <div className="text-xl font-black tracking-wider" style={{ color: rc.color, letterSpacing: '0.12em' }}>
                {profileId}
              </div>
            </div>
            <button
              onClick={copyId}
              className="px-3 py-2 rounded-xl text-xs font-black app-pressable transition-all active:scale-95"
              style={{ background: copied ? '#4CAF6A15' : `${rc.color}12`, color: copied ? '#4CAF6A' : rc.color, border: `1px solid ${copied ? '#4CAF6A30' : rc.color + '25'}` }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
        >
          <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>Edit Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: rc.color }}>Display Name</label>
              <input
                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all"
                style={{ background: 'rgba(245,245,250,0.8)', border: '2px solid rgba(120,120,140,0.15)', color: '#1f2233' }}
                value={form.displayName}
                onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>Email</label>
              <input
                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all"
                style={{ background: 'rgba(245,245,250,0.8)', border: '2px solid rgba(120,120,140,0.15)', color: '#1f2233' }}
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>Avatar Emoji</label>
              <input
                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all"
                style={{ background: 'rgba(245,245,250,0.8)', border: '2px solid rgba(120,120,140,0.15)', color: '#1f2233' }}
                value={form.avatar}
                onChange={(e) => setForm(p => ({ ...p, avatar: e.target.value }))}
              />
            </div>

            {/* Roles */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(245,245,250,0.6)', border: '1px solid rgba(120,120,140,0.1)' }}>
              <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(70,75,96,0.4)' }}>Roles</div>
              <div className="flex flex-wrap gap-2">
                {(roles.length ? roles : [(user as any)?.role || 'user']).map((r) => {
                  const c = ROLE_COLORS[r] || ROLE_COLORS.child
                  return (
                    <span key={r} className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>
                      {r}
                    </span>
                  )
                })}
              </div>
            </div>

            <button
              onClick={save}
              disabled={busy}
              className="w-full py-3.5 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-60 app-pressable"
              style={{ background: rc.grad, boxShadow: `0 4px 20px ${rc.color}25` }}
            >
              {busy ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-60 app-pressable flex items-center justify-center gap-2"
          style={{
            background: 'rgba(255,69,58,0.08)',
            border: '2px solid rgba(255,69,58,0.2)',
            color: '#E05252',
          }}
        >
          {loggingOut ? (
            <>
              <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
              Signing out…
            </>
          ) : (
            <>🚪 Sign Out</>
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs font-semibold" style={{ color: 'rgba(70,75,96,0.3)' }}>
            KinderSpark Pro · v2.0
          </p>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-black shadow-lg animate-slide-up"
          style={{
            background: toast.type === 'success' ? 'rgba(76,175,106,0.95)' : 'rgba(224,82,82,0.95)',
            color: '#fff',
            border: `1px solid ${toast.type === 'success' ? 'rgba(76,175,106,0.5)' : 'rgba(224,82,82,0.5)'}`,
            boxShadow: `0 8px 32px ${toast.type === 'success' ? 'rgba(76,175,106,0.3)' : 'rgba(224,82,82,0.3)'}`,
          }}
        >
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}
    </div>
  )
}
