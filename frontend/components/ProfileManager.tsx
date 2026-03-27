'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMyProfile, updateMyProfile } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

export default function ProfileManager({ roleLabel }: { roleLabel: string }) {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const setUser = useAppStore(s => s.setUser)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', avatar: '' })
  const [roles, setRoles] = useState<string[]>([])

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
      alert('Profile updated')
    } catch (e: any) {
      alert(e.message || 'Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen app-container p-6">Loading profile…</div>
  }

  return (
    <div className="min-h-screen app-container app-content">
      <div className="rounded-2xl p-5" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        <h1 className="font-black text-xl mb-1">{roleLabel} Profile</h1>
        <p className="text-xs font-bold app-muted mb-4">Manage your account and role identity.</p>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold app-muted mb-1">Display Name</div>
            <input className="app-field w-full" value={form.displayName} onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs font-bold app-muted mb-1">Email</div>
            <input className="app-field w-full" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs font-bold app-muted mb-1">Avatar Emoji/Icon</div>
            <input className="app-field w-full" value={form.avatar} onChange={(e) => setForm(p => ({ ...p, avatar: e.target.value }))} />
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <div className="text-xs font-bold app-muted mb-1">Available Roles</div>
            <div className="flex flex-wrap gap-2">
              {(roles.length ? roles : [(user as any)?.role || 'user']).map((r) => (
                <span key={r} className="text-xs font-black px-2 py-1 rounded-full" style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8' }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl font-black app-pressable" style={{ background: 'var(--app-accent)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
