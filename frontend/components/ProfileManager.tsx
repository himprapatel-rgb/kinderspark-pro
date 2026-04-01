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
import { useToast } from '@/components/Toast'
import { LogOut } from 'lucide-react'

const ROLE_COLORS: Record<string, { color: string; grad: string }> = {
  child:     { color: 'var(--role-child)',   grad: 'linear-gradient(135deg,#F5A623,#D4881A)' },
  teacher:   { color: 'var(--role-teacher)', grad: 'linear-gradient(135deg,#5B7FE8,#8B6CC1)' },
  parent:    { color: 'var(--role-parent)',  grad: 'linear-gradient(135deg,#4CAF6A,#5FBF7F)' },
  admin:     { color: 'var(--role-admin)',   grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)' },
  principal: { color: 'var(--role-admin)',   grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)' },
}

// Raw hex for use in box-shadow / rgba expressions where CSS vars don't work
const ROLE_HEX: Record<string, string> = {
  child: '#F5A623', teacher: '#5B7FE8', parent: '#4CAF6A', admin: '#8B6CC1', principal: '#8B6CC1',
}

export default function ProfileManager({ roleLabel }: { roleLabel: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const toast = useToast()
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [detailLoading, setDetailLoading] = useState(false)
  const [childSelfForm, setChildSelfForm] = useState({ preferredName: '', avatar: '', photoUrl: '' })
  const [guardianForm, setGuardianForm] = useState({
    phone: '', alternatePhone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postalCode: '', country: '', photoUrl: '',
  })
  const [childLinkedForm, setChildLinkedForm] = useState({
    preferredName: '', avatar: '', photoUrl: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postalCode: '', country: '',
    parentName: '', parentPhone: '', emergencyPhone: '', notes: '',
  })
  const [selectedChildId, setSelectedChildId] = useState('')
  const [savingChildSelf, setSavingChildSelf] = useState(false)
  const [savingGuardian, setSavingGuardian] = useState(false)
  const [savingChildLinked, setSavingChildLinked] = useState(false)
  const [savingLearning, setSavingLearning] = useState(false)

  const rc = ROLE_COLORS[role || 'child'] || ROLE_COLORS.child
  const hex = ROLE_HEX[role || 'child'] || ROLE_HEX.child

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
        setForm({ displayName: user.name || '', email: '', avatar: user.avatar || '' })
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
        setChildSelfForm({ preferredName: s.preferredName ?? '', avatar: s.avatar ?? '', photoUrl: s.photoUrl ?? '' })
      } catch {
        if (!cancelled) toast.error(t('profile_load_failed'))
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
          phone: g.phone ?? '', alternatePhone: g.alternatePhone ?? '',
          addressLine1: g.addressLine1 ?? '', addressLine2: g.addressLine2 ?? '',
          city: g.city ?? '', state: g.state ?? '',
          postalCode: g.postalCode ?? '', country: g.country ?? '', photoUrl: g.photoUrl ?? '',
        })
      } catch {
        if (!cancelled) toast.error(t('profile_load_failed'))
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
          preferredName: s.preferredName ?? '', avatar: s.avatar ?? '', photoUrl: s.photoUrl ?? '',
          addressLine1: s.addressLine1 ?? '', addressLine2: s.addressLine2 ?? '',
          city: s.city ?? '', state: s.state ?? '', postalCode: s.postalCode ?? '', country: s.country ?? '',
          parentName: s.parentName ?? '', parentPhone: s.parentPhone ?? '',
          emergencyPhone: s.emergencyPhone ?? '', notes: s.notes ?? '',
        })
      } catch {
        if (!cancelled) toast.error(t('profile_load_failed'))
      }
    })()
    return () => { cancelled = true }
  }, [user, role, selectedChildId, currentStudent?.id, children, t])

  const save = async () => {
    setBusy(true)
    try {
      const updated = await updateMyProfile(form)
      setUser({ ...user, name: updated.displayName, avatar: updated.avatar })
      toast.success(t('profile_details_saved'))
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await logoutApi() } catch { /* non-fatal */ }
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
      toast.error(e.message || 'Failed to delete account')
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
      toast.success(t('profile_details_saved'))
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSavingLearning(false)
    }
  }

  const saveGuardianDetails = async () => {
    if (role !== 'parent') return
    setSavingGuardian(true)
    try {
      await patchGuardianProfile(guardianForm)
      toast.success(t('profile_details_saved'))
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSavingGuardian(false)
    }
  }

  const saveChildLinkedDetails = async () => {
    if (role !== 'parent' || !selectedChildId) return
    setSavingChildLinked(true)
    try {
      await patchStudentProfile(selectedChildId, { ...childLinkedForm })
      toast.success(t('profile_details_saved'))
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSavingChildLinked(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${hex}30`, borderTopColor: hex }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--app-bg)' }}>

      {/* ── Hero ── */}
      <div className="page-hero" style={{ background: rc.grad }}>
        <button onClick={() => router.back()} className="text-white/80 text-sm font-bold mb-4 flex items-center gap-1 app-pressable">
          ← {t('back')}
        </button>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)' }}>
            {form.avatar || '👤'}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{form.displayName || 'User'}</h1>
            <p className="text-white/70 text-sm font-bold mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* ── Profile ID ── */}
        <div className="app-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">{t('profile_id')}</p>
              <div className="text-xl font-black tracking-wider" style={{ color: hex, letterSpacing: '0.12em' }}>
                {profileId}
              </div>
            </div>
            <button
              onClick={copyId}
              className="px-3 py-2 rounded-xl text-xs font-black app-pressable"
              style={{
                background: copied ? 'rgba(76,175,106,0.1)' : `${hex}12`,
                color: copied ? 'var(--app-success)' : hex,
                border: `1px solid ${copied ? 'rgba(76,175,106,0.3)' : hex + '25'}`,
              }}
            >
              {copied ? `✓ ${t('copied')}` : `📋 ${t('copy_id')}`}
            </button>
          </div>
        </div>

        {/* ── Edit Profile ── */}
        <div className="app-card space-y-3">
          <p className="section-label">Edit Profile</p>

          <div>
            <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: hex }}>
              Display Name
            </label>
            <input
              className="app-field"
              value={form.displayName}
              onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">Email</label>
            <input
              className="app-field"
              value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">Avatar Emoji</label>
            <input
              className="app-field"
              value={form.avatar}
              onChange={(e) => setForm(p => ({ ...p, avatar: e.target.value }))}
            />
          </div>

          {/* Roles */}
          <div className="app-card-soft rounded-xl p-3">
            <p className="section-label mb-2">Roles</p>
            <div className="flex flex-wrap gap-2">
              {(roles.length ? roles : [(user as any)?.role || 'user']).map((r) => {
                const c = ROLE_HEX[r] || hex
                return (
                  <span key={r} className="text-xs font-black px-3 py-1.5 rounded-full app-chip"
                    style={{ background: `${c}15`, color: c }}>
                    {r}
                  </span>
                )
              })}
            </div>
          </div>

          <button
            onClick={save}
            disabled={busy}
            className="w-full btn-lg app-btn-primary disabled:opacity-60"
            style={{ background: rc.grad, boxShadow: `0 4px 20px ${hex}25` }}
          >
            {busy ? `${t('loading')}` : `✓ ${t('save')}`}
          </button>
        </div>

        {/* ── Child: Learning Profile ── */}
        {role === 'child' && (
          <div className="app-card space-y-3">
            <p className="section-label">{t('profile_learning_card_title')}</p>
            {detailLoading && <p className="text-xs font-semibold app-muted">{t('loading')}</p>}

            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block" style={{ color: hex }}>{t('profile_field_preferred_name')}</label>
              <input className="app-field" value={childSelfForm.preferredName} onChange={(e) => setChildSelfForm(p => ({ ...p, preferredName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{t('choose_avatar')}</label>
              <input className="app-field" value={childSelfForm.avatar} onChange={(e) => setChildSelfForm(p => ({ ...p, avatar: e.target.value }))} placeholder="Emoji" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{t('profile_field_photo_url')}</label>
              <input className="app-field" value={childSelfForm.photoUrl} onChange={(e) => setChildSelfForm(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://…" />
            </div>

            <button
              onClick={saveChildLearningProfile}
              disabled={savingLearning || detailLoading}
              className="w-full btn-lg app-btn-primary disabled:opacity-60"
              style={{ background: rc.grad, boxShadow: `0 4px 20px ${hex}25` }}
            >
              {savingLearning ? t('loading') : t('profile_save_details')}
            </button>
          </div>
        )}

        {/* ── Parent: Guardian + Child details ── */}
        {role === 'parent' && (
          <>
            <div className="app-card space-y-3">
              <p className="section-label">{t('profile_guardian_card_title')}</p>
              {detailLoading && <p className="text-xs font-semibold app-muted">{t('loading')}</p>}

              {[
                { key: 'phone',         label: t('profile_field_phone'),       mode: 'tel' as const },
                { key: 'alternatePhone',label: t('profile_field_alt_phone'),   mode: 'tel' as const },
                { key: 'photoUrl',      label: t('profile_field_photo_url'),   mode: 'url' as const },
                { key: 'addressLine1',  label: t('profile_field_address1'),    mode: 'text' as const },
                { key: 'addressLine2',  label: t('profile_field_address2'),    mode: 'text' as const },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{f.label}</label>
                  <input className="app-field" inputMode={f.mode}
                    value={(guardianForm as any)[f.key]}
                    onChange={(e) => setGuardianForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'city',       label: t('profile_field_city')   },
                  { key: 'state',      label: t('profile_field_state')  },
                  { key: 'postalCode', label: t('profile_field_postal') },
                  { key: 'country',    label: t('profile_field_country') },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{f.label}</label>
                    <input className="app-field"
                      value={(guardianForm as any)[f.key]}
                      onChange={(e) => setGuardianForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <button
                onClick={saveGuardianDetails}
                disabled={savingGuardian || detailLoading}
                className="w-full btn-lg app-btn-primary disabled:opacity-60"
                style={{ background: rc.grad, boxShadow: `0 4px 20px ${hex}25` }}
              >
                {savingGuardian ? t('loading') : t('profile_save_details')}
              </button>
            </div>

            {children.length > 1 && (
              <div>
                <label className="section-label mb-1 px-1">{t('profile_which_child')}</label>
                <select
                  className="app-field"
                  value={selectedChildId || currentStudent?.id || children[0]?.id || ''}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                >
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="app-card space-y-3">
              <p className="section-label">{t('profile_child_card_title')}</p>
              {!selectedChildId && !currentStudent?.id && children.length === 0 ? (
                <p className="text-xs font-semibold app-muted">{t('no_data')}</p>
              ) : (
                <>
                  {[
                    { key: 'preferredName',  label: t('profile_field_preferred_name'), accent: true },
                    { key: 'avatar',         label: t('choose_avatar') },
                    { key: 'photoUrl',       label: t('profile_field_photo_url') },
                    { key: 'addressLine1',   label: t('profile_field_address1') },
                    { key: 'addressLine2',   label: t('profile_field_address2') },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={`text-xs font-black uppercase tracking-wider mb-1 block ${f.accent ? '' : 'app-muted'}`}
                        style={f.accent ? { color: hex } : undefined}>
                        {f.label}
                      </label>
                      <input className="app-field"
                        value={(childLinkedForm as any)[f.key]}
                        onChange={(e) => setChildLinkedForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'city',       label: t('profile_field_city')   },
                      { key: 'state',      label: t('profile_field_state')  },
                      { key: 'postalCode', label: t('profile_field_postal') },
                      { key: 'country',    label: t('profile_field_country') },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{f.label}</label>
                        <input className="app-field"
                          value={(childLinkedForm as any)[f.key]}
                          onChange={(e) => setChildLinkedForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  {[
                    { key: 'parentName',      label: t('profile_field_parent_name'),    mode: 'text' as const },
                    { key: 'parentPhone',     label: t('profile_field_parent_phone'),   mode: 'tel' as const },
                    { key: 'emergencyPhone',  label: t('profile_field_emergency_phone'),mode: 'tel' as const },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{f.label}</label>
                      <input className="app-field" inputMode={f.mode}
                        value={(childLinkedForm as any)[f.key]}
                        onChange={(e) => setChildLinkedForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider mb-1 block app-muted">{t('profile_field_notes')}</label>
                    <textarea
                      className="app-field min-h-[88px] resize-y"
                      value={childLinkedForm.notes}
                      onChange={(e) => setChildLinkedForm(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={saveChildLinkedDetails}
                    disabled={savingChildLinked || !selectedChildId}
                    className="w-full btn-lg app-btn-primary disabled:opacity-60"
                    style={{ background: rc.grad, boxShadow: `0 4px 20px ${hex}25` }}
                  >
                    {savingChildLinked ? t('loading') : t('profile_save_details')}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Sound & Music ── */}
        <div className="app-card">
          <p className="section-label mb-4">🎵 Sound &amp; Music</p>
          <SoundSettings />
        </div>

        {/* ── Language ── */}
        <div className="app-card">
          <p className="section-label mb-4">🌍 {t('language')}</p>
          <LanguageSelector />
        </div>

        {/* ── Sign Out ── */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          disabled={loggingOut}
          className="w-full btn-lg app-btn-danger disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loggingOut
            ? <><span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />Signing out…</>
            : <><LogOut size={17} aria-hidden />{t('logout')}</>
          }
        </button>

        {/* ── Danger Zone ── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,59,48,0.03)', border: '1px solid rgba(255,59,48,0.1)' }}>
          <p className="section-label mb-2" style={{ color: 'rgba(255,59,48,0.5)' }}>{t('delete_account')}</p>
          <p className="text-xs font-semibold mb-3 app-muted">{t('delete_account_confirm')}</p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-sm font-black app-btn-danger app-pressable"
          >
            🗑️ {t('delete_account')}
          </button>
        </div>

        {/* Privacy + Footer */}
        <div className="text-center space-y-1">
          <button onClick={() => router.push('/privacy')} className="text-xs font-bold underline app-pressable app-muted">
            {t('privacy_policy')}
          </button>
          <p className="text-xs font-semibold app-muted">KinderSpark Pro · v2.0</p>
        </div>
      </div>

      {/* ── Sign Out Confirm Modal ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'var(--app-surface)', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 id="logout-confirm-title" className="text-lg font-black text-center">{t('sign_out_confirm_title')}</h3>
            <p className="text-xs font-semibold mt-2 text-center app-muted">{t('sign_out_confirm_body')}</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 btn-md app-btn-secondary">
                {t('cancel')}
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); handleLogout() }}
                className="flex-1 btn-md app-btn-danger flex items-center justify-center gap-2">
                <LogOut size={16} aria-hidden />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Confirm Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'var(--app-surface)', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-black" style={{ color: 'var(--app-danger, #E05252)' }}>
                {t('delete_account')}?
              </h3>
              <p className="text-xs font-semibold mt-2 app-muted">{t('delete_account_confirm')}</p>
            </div>
            <div className="mb-4">
              <label className="section-label mb-1">Type &quot;DELETE&quot; to confirm</label>
              <input
                className="app-field text-center"
                style={{ borderColor: 'rgba(255,59,48,0.3)', color: 'var(--app-danger, #E05252)' }}
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                className="flex-1 btn-md app-btn-secondary">
                {t('cancel')}
              </button>
              <button onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 btn-md app-btn-danger disabled:opacity-40">
                {deleting ? t('loading') : `🗑️ ${t('delete')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
