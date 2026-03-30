'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getMyProfile,
  updateMyProfile,
  logoutApi,
  deleteMyAccount,
  getStudentProfile,
  patchStudentProfile,
  getGuardianProfile,
  patchGuardianProfile,
} from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import SoundSettings from '@/components/SoundSettings'
import LanguageSelector from '@/components/LanguageSelector'
import { useTranslation } from '@/hooks/useTranslation'
import { LogOut } from 'lucide-react'

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
  const { t } = useTranslation()
  const user = useAppStore(s => s.user)
  const role = useAppStore(s => s.role)
  const setUser = useAppStore(s => s.setUser)
  const logout = useAppStore(s => s.logout)
  const currentStudent = useAppStore(s => s.currentStudent)
  const children = useAppStore(s => s.children)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', avatar: '' })
  const [roles, setRoles] = useState<string[]>([])
  const [profileId, setProfileId] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [detailLoading, setDetailLoading] = useState(false)
  const [childSelfForm, setChildSelfForm] = useState({ preferredName: '', avatar: '', photoUrl: '' })
  const [guardianForm, setGuardianForm] = useState({
    phone: '',
    alternatePhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    photoUrl: '',
  })
  const [childLinkedForm, setChildLinkedForm] = useState({
    preferredName: '',
    avatar: '',
    photoUrl: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    parentName: '',
    parentPhone: '',
    emergencyPhone: '',
    notes: '',
  })
  const [selectedChildId, setSelectedChildId] = useState('')
  const [savingChildSelf, setSavingChildSelf] = useState(false)
  const [savingGuardian, setSavingGuardian] = useState(false)
  const [savingChildLinked, setSavingChildLinked] = useState(false)

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

  useEffect(() => {
    if (!user || role !== 'child') return
    let cancelled = false
    setDetailLoading(true)
    ;(async () => {
      try {
        const s = await getStudentProfile(user.id)
        if (cancelled) return
        setChildSelfForm({
          preferredName: s.preferredName ?? '',
          avatar: s.avatar ?? '',
          photoUrl: s.photoUrl ?? '',
        })
      } catch {
        if (!cancelled) showToast(t('profile_load_failed'), 'error')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, role, t])

  useEffect(() => {
    if (!user || role !== 'parent') return
    let cancelled = false
    setDetailLoading(true)
    ;(async () => {
      try {
        const g = await getGuardianProfile()
        if (cancelled) return
        setGuardianForm({
          phone: g.phone ?? '',
          alternatePhone: g.alternatePhone ?? '',
          addressLine1: g.addressLine1 ?? '',
          addressLine2: g.addressLine2 ?? '',
          city: g.city ?? '',
          state: g.state ?? '',
          postalCode: g.postalCode ?? '',
          country: g.country ?? '',
          photoUrl: g.photoUrl ?? '',
        })
      } catch {
        if (!cancelled) showToast(t('profile_load_failed'), 'error')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, role, t])

  useEffect(() => {
    if (!user || role !== 'parent') return
    const sid = selectedChildId || currentStudent?.id || children[0]?.id
    if (!sid) return
    let cancelled = false
    if (!selectedChildId) setSelectedChildId(sid)
    ;(async () => {
      try {
        const s = await getStudentProfile(sid)
        if (cancelled) return
        setChildLinkedForm({
          preferredName: s.preferredName ?? '',
          avatar: s.avatar ?? '',
          photoUrl: s.photoUrl ?? '',
          addressLine1: s.addressLine1 ?? '',
          addressLine2: s.addressLine2 ?? '',
          city: s.city ?? '',
          state: s.state ?? '',
          postalCode: s.postalCode ?? '',
          country: s.country ?? '',
          parentName: s.parentName ?? '',
          parentPhone: s.parentPhone ?? '',
          emergencyPhone: s.emergencyPhone ?? '',
          notes: s.notes ?? '',
        })
      } catch {
        if (!cancelled) showToast(t('profile_load_failed'), 'error')
      }
    })()
    return () => { cancelled = true }
  }, [user, role, selectedChildId, currentStudent?.id, children, t])

  const inputProps = {
    className: 'w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all min-h-11',
    style: { background: 'rgba(245,245,250,0.8)', border: '2px solid rgba(120,120,140,0.15)', color: '#1f2233' },
  }

  const save = async () => {
    setBusy(true)
    try {
      const updated = await updateMyProfile(form)
      setUser({ ...user, name: updated.displayName, avatar: updated.avatar })
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

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteMyAccount()
      await logoutApi().catch(() => {})
      logout()
      window.location.href = '/login'
    } catch (e: any) {
      showToast(e.message || 'Failed to delete account', 'error')
      setDeleting(false)
    }
  }

  const copyId = () => {
    if (profileId) {
      navigator.clipboard?.writeText(profileId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const saveChildLearningProfile = async () => {
    if (role !== 'child' || !user) return
    setSavingLearning(true)
    try {
      await patchStudentProfile(user.id, {
        preferredName: childSelfForm.preferredName || null,
        avatar: childSelfForm.avatar || null,
        photoUrl: childSelfForm.photoUrl || null,
      })
      showToast(t('profile_details_saved'), 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error')
    } finally {
      setSavingLearning(false)
    }
  }

  const saveGuardianDetails = async () => {
    if (role !== 'parent') return
    setSavingLearning(true)
    try {
      await patchGuardianProfile(guardianForm)
      showToast(t('profile_details_saved'), 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error')
    } finally {
      setSavingLearning(false)
    }
  }

  const saveChildLinkedDetails = async () => {
    if (role !== 'parent' || !selectedChildId) return
    setSavingLearning(true)
    try {
      await patchStudentProfile(selectedChildId, { ...childLinkedForm })
      showToast(t('profile_details_saved'), 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error')
    } finally {
      setSavingLearning(false)
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

        {role === 'child' && (
          <div
            className="rounded-2xl p-5 mb-4"
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>
              {t('profile_learning_card_title')}
            </h2>
            {detailLoading ? (
              <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('loading')}</p>
            ) : null}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: rc.color }}>{t('profile_field_preferred_name')}</label>
                <input {...inputProps} value={childSelfForm.preferredName} onChange={(e) => setChildSelfForm((p) => ({ ...p, preferredName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('choose_avatar')}</label>
                <input {...inputProps} value={childSelfForm.avatar} onChange={(e) => setChildSelfForm((p) => ({ ...p, avatar: e.target.value }))} placeholder="Emoji" />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_photo_url')}</label>
                <input {...inputProps} value={childSelfForm.photoUrl} onChange={(e) => setChildSelfForm((p) => ({ ...p, photoUrl: e.target.value }))} placeholder="https://…" />
              </div>
            </div>
            <button
              type="button"
              onClick={saveChildLearningProfile}
              disabled={savingLearning || detailLoading}
              className="w-full mt-4 py-3.5 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-60 app-pressable min-h-11"
              style={{ background: rc.grad, boxShadow: `0 4px 20px ${rc.color}25` }}
            >
              {savingLearning ? t('loading') : t('profile_save_details')}
            </button>
          </div>
        )}

        {role === 'parent' && (
          <>
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
            >
              <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>
                {t('profile_guardian_card_title')}
              </h2>
              {detailLoading ? (
                <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('loading')}</p>
              ) : null}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: rc.color }}>{t('profile_field_phone')}</label>
                  <input {...inputProps} inputMode="tel" value={guardianForm.phone} onChange={(e) => setGuardianForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_alt_phone')}</label>
                  <input {...inputProps} inputMode="tel" value={guardianForm.alternatePhone} onChange={(e) => setGuardianForm((p) => ({ ...p, alternatePhone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_photo_url')}</label>
                  <input {...inputProps} value={guardianForm.photoUrl} onChange={(e) => setGuardianForm((p) => ({ ...p, photoUrl: e.target.value }))} placeholder="https://…" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_address1')}</label>
                  <input {...inputProps} value={guardianForm.addressLine1} onChange={(e) => setGuardianForm((p) => ({ ...p, addressLine1: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_address2')}</label>
                  <input {...inputProps} value={guardianForm.addressLine2} onChange={(e) => setGuardianForm((p) => ({ ...p, addressLine2: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_city')}</label>
                    <input {...inputProps} value={guardianForm.city} onChange={(e) => setGuardianForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_state')}</label>
                    <input {...inputProps} value={guardianForm.state} onChange={(e) => setGuardianForm((p) => ({ ...p, state: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_postal')}</label>
                    <input {...inputProps} value={guardianForm.postalCode} onChange={(e) => setGuardianForm((p) => ({ ...p, postalCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_country')}</label>
                    <input {...inputProps} value={guardianForm.country} onChange={(e) => setGuardianForm((p) => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={saveGuardianDetails}
                disabled={savingGuardian || detailLoading}
                className="w-full mt-4 py-3.5 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-60 app-pressable min-h-11"
                style={{ background: rc.grad, boxShadow: `0 4px 20px ${rc.color}25` }}
              >
                {savingGuardian ? t('loading') : t('profile_save_details')}
              </button>
            </div>

            {children.length > 1 && (
              <div className="mb-4">
                <label className="text-xs font-black uppercase tracking-wider mb-1 block px-1" style={{ color: 'rgba(70,75,96,0.5)' }}>{t('profile_which_child')}</label>
                <select
                  className={inputProps.className}
                  style={inputProps.style}
                  value={selectedChildId || currentStudent?.id || children[0]?.id || ''}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
            >
              <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>
                {t('profile_child_card_title')}
              </h2>
              {!selectedChildId && !currentStudent?.id && children.length === 0 ? (
                <p className="text-xs font-semibold" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('no_data')}</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: rc.color }}>{t('profile_field_preferred_name')}</label>
                      <input {...inputProps} value={childLinkedForm.preferredName} onChange={(e) => setChildLinkedForm((p) => ({ ...p, preferredName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('choose_avatar')}</label>
                      <input {...inputProps} value={childLinkedForm.avatar} onChange={(e) => setChildLinkedForm((p) => ({ ...p, avatar: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_photo_url')}</label>
                      <input {...inputProps} value={childLinkedForm.photoUrl} onChange={(e) => setChildLinkedForm((p) => ({ ...p, photoUrl: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_address1')}</label>
                      <input {...inputProps} value={childLinkedForm.addressLine1} onChange={(e) => setChildLinkedForm((p) => ({ ...p, addressLine1: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_address2')}</label>
                      <input {...inputProps} value={childLinkedForm.addressLine2} onChange={(e) => setChildLinkedForm((p) => ({ ...p, addressLine2: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_city')}</label>
                        <input {...inputProps} value={childLinkedForm.city} onChange={(e) => setChildLinkedForm((p) => ({ ...p, city: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_state')}</label>
                        <input {...inputProps} value={childLinkedForm.state} onChange={(e) => setChildLinkedForm((p) => ({ ...p, state: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_postal')}</label>
                        <input {...inputProps} value={childLinkedForm.postalCode} onChange={(e) => setChildLinkedForm((p) => ({ ...p, postalCode: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_country')}</label>
                        <input {...inputProps} value={childLinkedForm.country} onChange={(e) => setChildLinkedForm((p) => ({ ...p, country: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_parent_name')}</label>
                      <input {...inputProps} value={childLinkedForm.parentName} onChange={(e) => setChildLinkedForm((p) => ({ ...p, parentName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_parent_phone')}</label>
                      <input {...inputProps} inputMode="tel" value={childLinkedForm.parentPhone} onChange={(e) => setChildLinkedForm((p) => ({ ...p, parentPhone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_emergency_phone')}</label>
                      <input {...inputProps} inputMode="tel" value={childLinkedForm.emergencyPhone} onChange={(e) => setChildLinkedForm((p) => ({ ...p, emergencyPhone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: 'rgba(70,75,96,0.45)' }}>{t('profile_field_notes')}</label>
                      <textarea
                        className={`${inputProps.className} min-h-[88px] resize-y`}
                        style={inputProps.style}
                        value={childLinkedForm.notes}
                        onChange={(e) => setChildLinkedForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveChildLinkedDetails}
                    disabled={savingChildLinked || !selectedChildId}
                    className="w-full mt-4 py-3.5 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-60 app-pressable min-h-11"
                    style={{ background: rc.grad, boxShadow: `0 4px 20px ${rc.color}25` }}
                  >
                    {savingChildLinked ? t('loading') : t('profile_save_details')}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Sound & Music Settings ── */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
        >
          <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>🎵 Sound & Music</h2>
          <SoundSettings />
        </div>

        {/* ── Language Settings ── */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(120,120,140,0.15)', boxShadow: '0 4px 20px rgba(30,40,70,0.08)' }}
        >
          <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'rgba(70,75,96,0.5)' }}>🌍 Language</h2>
          <LanguageSelector />
        </div>

        {/* Sign Out — confirmation required */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          disabled={loggingOut}
          className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-60 app-pressable flex items-center justify-center gap-2 min-h-11"
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
            <>
              <LogOut size={17} aria-hidden />
              Sign Out
            </>
          )}
        </button>

        {/* Delete Account — Apple Guideline 5.1.1(v) */}
        <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,59,48,0.03)', border: '1px solid rgba(255,59,48,0.1)' }}>
          <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(255,59,48,0.5)' }}>Danger Zone</div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(70,75,96,0.5)' }}>
            Permanently delete your account and all data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-sm font-black text-red-500 transition-all active:scale-95 app-pressable"
            style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)' }}
          >
            🗑️ Delete My Account
          </button>
        </div>

        {/* Privacy Policy link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/privacy')}
            className="text-xs font-bold underline app-pressable"
            style={{ color: 'rgba(94, 92, 230, 0.5)' }}
          >
            Privacy Policy
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs font-semibold" style={{ color: 'rgba(70,75,96,0.3)' }}>
            KinderSpark Pro · v2.0
          </p>
        </div>
      </div>

      {/* Sign Out confirmation */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 id="logout-confirm-title" className="text-lg font-black text-center" style={{ color: '#1f2233' }}>
              {t('sign_out_confirm_title')}
            </h3>
            <p className="text-xs font-semibold mt-2 text-center" style={{ color: 'rgba(70,75,96,0.65)' }}>
              {t('sign_out_confirm_body')}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-black app-pressable min-h-11"
                style={{ background: '#f2f2f5', color: '#666' }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => { setShowLogoutConfirm(false); handleLogout() }}
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="mx-5 w-full max-w-sm rounded-3xl p-6" style={{ background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-black" style={{ color: '#E05252' }}>Delete Account?</h3>
              <p className="text-xs font-semibold mt-2" style={{ color: 'rgba(70,75,96,0.6)' }}>
                This will permanently delete your account, all learning progress, badges, and associated data. This cannot be undone.
              </p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-black uppercase tracking-wider block mb-1" style={{ color: 'rgba(70,75,96,0.4)' }}>
                Type &quot;DELETE&quot; to confirm
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none"
                style={{ background: '#f8f8fa', border: '2px solid rgba(255,59,48,0.2)', color: '#E05252' }}
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                className="flex-1 py-3 rounded-xl text-sm font-black app-pressable"
                style={{ background: '#f2f2f5', color: '#666' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white app-pressable disabled:opacity-40"
                style={{ background: deleteInput === 'DELETE' ? '#E05252' : '#ccc' }}
              >
                {deleting ? 'Deleting…' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
