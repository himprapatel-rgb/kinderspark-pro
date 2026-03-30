'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { registerAccount, getDemoSchoolCode } from '@/lib/api'

const ROLES = [
  { id: 'child',   emoji: '🧒', label: "I'm a Kid",     color: '#F5A623', grad: 'linear-gradient(135deg,#F5A623,#D4881A)' },
  { id: 'teacher', emoji: '👩‍🏫', label: "I'm a Teacher", color: '#5B7FE8', grad: 'linear-gradient(135deg,#5B7FE8,#8B6CC1)' },
  { id: 'parent',  emoji: '👨‍👩‍👧', label: "I'm a Parent",  color: '#4CAF6A', grad: 'linear-gradient(135deg,#4CAF6A,#5FBF7F)' },
  { id: 'admin',   emoji: '⚙️', label: 'Admin',          color: '#8B6CC1', grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)' },
]

const AVATARS = ['🧒','👧','👦','👩‍🏫','👨‍🏫','👩','👨','👨‍👩‍👧','👨‍👩‍👦','⚙️','🌟','🦋','🐻','🐱','🦊','🐼']

type Step = 'role' | 'info' | 'pin' | 'done'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAppStore(s => s.setAuth)

  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileId, setProfileId] = useState('')
  const [parentConsent, setParentConsent] = useState(false)
  const [childSchoolCode, setChildSchoolCode] = useState(getDemoSchoolCode)

  const selectedRole = ROLES.find(r => r.id === role)

  function selectRole(roleId: string) {
    setRole(roleId)
    setAvatar(ROLES.find(r => r.id === roleId)?.emoji || '🧒')
    setStep('info')
  }

  function submitInfo() {
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (role === 'child') {
      const code = childSchoolCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (code.length !== 6) {
        setError('School code must be 6 letters or numbers (ask your teacher)')
        return
      }
    }
    setError('')
    setStep('pin')
    setPinStep('create')
  }

  function handlePinDigit(idx: number, val: string, target: 'create' | 'confirm') {
    if (!/^\d?$/.test(val)) return
    const arr = target === 'create' ? [...pin] : [...confirmPin]
    arr[idx] = val
    if (target === 'create') setPin(arr)
    else setConfirmPin(arr)
    setError('')

    // Auto-focus next
    if (val && idx < 3) {
      const next = document.getElementById(`${target}-pin-${idx + 1}`)
      next?.focus()
    }

    // Auto-submit on last digit
    if (val && idx === 3 && arr.every(d => d)) {
      if (target === 'create') {
        // Move to confirm step
        setTimeout(() => {
          setPinStep('confirm')
          setConfirmPin(['', '', '', ''])
          setTimeout(() => document.getElementById('confirm-pin-0')?.focus(), 100)
        }, 200)
      } else {
        // Check match
        const createPin = pin.join('')
        const confirmPinStr = arr.join('')
        if (createPin !== confirmPinStr) {
          setError('PINs do not match — try again')
          setConfirmPin(['', '', '', ''])
          setTimeout(() => document.getElementById('confirm-pin-0')?.focus(), 300)
        } else {
          doRegister(createPin)
        }
      }
    }
  }

  function handlePinKey(idx: number, e: React.KeyboardEvent, target: 'create' | 'confirm') {
    const arr = target === 'create' ? pin : confirmPin
    if (e.key === 'Backspace') {
      if (!arr[idx] && idx > 0) {
        const next = target === 'create' ? [...pin] : [...confirmPin]
        next[idx - 1] = ''
        if (target === 'create') setPin(next)
        else setConfirmPin(next)
        document.getElementById(`${target}-pin-${idx - 1}`)?.focus()
      } else {
        const next = target === 'create' ? [...pin] : [...confirmPin]
        next[idx] = ''
        if (target === 'create') setPin(next)
        else setConfirmPin(next)
      }
    }
  }

  async function doRegister(pinValue: string) {
    setLoading(true)
    setError('')
    try {
      const code =
        role === 'child'
          ? childSchoolCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
          : ''
      const result = await registerAccount({
        displayName: name.trim(),
        pin: pinValue,
        role,
        email: email.trim() || undefined,
        avatar,
        ...(role === 'child' && code ? { schoolCode: code } : {}),
      })
      setProfileId(result.profileId || result.user?.id || '')
      setAuth(result.user, role, result.token)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      setConfirmPin(['', '', '', ''])
      setPinStep('create')
      setPin(['', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    if (role === 'teacher') router.replace('/teacher')
    else if (role === 'admin' || role === 'principal') router.replace('/admin')
    else if (role === 'parent') router.replace('/parent')
    else router.replace('/child')
  }

  const accentColor = selectedRole?.color || '#5B7FE8'
  const accentGrad = selectedRole?.grad || 'linear-gradient(135deg,#5B7FE8,#8B6CC1)'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFFCF5 0%, #FFF9EE 40%, #F5FAF0 100%)' }}
    >
      {/* Background orbs */}
      <div className="absolute w-80 h-80 top-[-80px] left-[-80px] rounded-full opacity-20" style={{ background: accentColor, filter: 'blur(80px)' }} />
      <div className="absolute w-64 h-64 bottom-[-60px] right-[-60px] rounded-full opacity-15" style={{ background: '#4CAF6A', filter: 'blur(70px)' }} />

      {/* Back button */}
      {step !== 'done' && (
        <button
          onClick={() => {
            if (step === 'role') router.push('/login')
            else if (step === 'info') setStep('role')
            else if (step === 'pin') { setStep('info'); setPin(['','','','']); setConfirmPin(['','','','']); setPinStep('create') }
          }}
          className="absolute top-6 left-5 w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold z-20 app-pressable"
          style={{ color: '#464B60', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,120,140,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          ←
        </button>
      )}

      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex gap-2 mb-8 relative z-10">
          {['role', 'info', 'pin'].map((s, i) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 32 : 12,
                background: s === step ? accentColor : ['role','info','pin'].indexOf(step) > i ? accentColor + '60' : 'rgba(120,120,140,0.2)',
              }}
            />
          ))}
        </div>
      )}

      {/* ══════════════ STEP: ROLE ══════════════ */}
      {step === 'role' && (
        <div className="w-full max-w-[380px] relative z-10 animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">✨</div>
            <h1 className="text-2xl font-black" style={{ color: '#1f2233' }}>Create Account</h1>
            <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(70,75,96,0.65)' }}>Choose your role to get started</p>
          </div>
          <div className="space-y-3">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 text-left relative overflow-hidden group transition-all duration-200 active:scale-[0.97] app-pressable"
                style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(120,120,140,0.22)', boxShadow: '0 8px 22px rgba(30,40,70,0.12)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: r.grad }} />
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: r.grad }} />
                <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: r.grad, boxShadow: `0 4px 16px ${r.color}40` }}>
                  {r.emoji}
                </div>
                <div className="flex-1 relative z-10">
                  <div className="text-base font-black" style={{ color: '#1f2233' }}>{r.label}</div>
                </div>
                <div className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all group-hover:translate-x-1" style={{ background: `${r.color}15`, color: `${r.color}90` }}>›</div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => router.push('/login')} className="text-sm font-bold app-pressable" style={{ color: 'rgba(70,75,96,0.6)' }}>
              Already have an account? <span style={{ color: '#5B7FE8', fontWeight: 900 }}>Sign In</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP: INFO ══════════════ */}
      {step === 'info' && selectedRole && (
        <div className="w-full max-w-[380px] relative z-10 animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-3" style={{ background: accentGrad, boxShadow: `0 8px 32px ${accentColor}40` }}>
              {avatar}
            </div>
            <h1 className="text-2xl font-black" style={{ color: '#1f2233' }}>Your Details</h1>
            <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(70,75,96,0.65)' }}>Tell us about yourself</p>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: accentColor }}>Display Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={role === 'child' ? 'Your name' : 'Full name'}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.9)', border: `2px solid ${name.length >= 2 ? accentColor + '60' : 'rgba(120,120,140,0.2)'}`, color: '#1f2233' }}
                autoFocus
              />
            </div>

            {/* Email (optional for kids) */}
            {role !== 'child' && (
              <div>
                <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(70,75,96,0.5)' }}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.9)', border: '2px solid rgba(120,120,140,0.2)', color: '#1f2233' }}
                />
              </div>
            )}

            {/* Avatar picker */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-2 block" style={{ color: 'rgba(70,75,96,0.5)' }}>Choose Avatar</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 app-pressable"
                    style={{
                      background: avatar === a ? accentGrad : 'rgba(255,255,255,0.8)',
                      border: avatar === a ? `2px solid ${accentColor}` : '2px solid rgba(120,120,140,0.15)',
                      transform: avatar === a ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: avatar === a ? `0 4px 16px ${accentColor}30` : 'none',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* COPPA — Parental Consent for Children */}
            {role === 'child' && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)' }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setParentConsent(!parentConsent)}
                    className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 app-pressable transition-all"
                    style={{
                      background: parentConsent ? accentColor : 'rgba(255,255,255,0.9)',
                      border: `2px solid ${parentConsent ? accentColor : 'rgba(120,120,140,0.3)'}`,
                    }}
                  >
                    {parentConsent && <span className="text-white text-sm font-black">✓</span>}
                  </button>
                  <div>
                    <div className="text-xs font-black" style={{ color: '#1f2233' }}>Parental Consent Required</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(70,75,96,0.55)' }}>
                      A parent or guardian confirms they have reviewed our{' '}
                      <span
                        className="underline cursor-pointer"
                        style={{ color: accentColor }}
                        onClick={(e) => { e.stopPropagation(); window.open('/privacy', '_blank') }}
                      >
                        Privacy Policy
                      </span>{' '}
                      and consent to this child&apos;s account creation.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-2.5 rounded-2xl text-sm font-bold" style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: '#E05252' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={submitInfo}
              disabled={
                !name.trim() ||
                name.trim().length < 2 ||
                (role === 'child' &&
                  (childSchoolCode.replace(/[^A-Z0-9]/g, '').length !== 6 || !parentConsent))
              }
              className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-40 app-pressable"
              style={{ background: accentGrad, boxShadow: `0 6px 28px ${accentColor}30` }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP: PIN ══════════════ */}
      {step === 'pin' && selectedRole && (
        <div className="w-full max-w-[380px] relative z-10 animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-3" style={{ background: accentGrad, boxShadow: `0 8px 32px ${accentColor}40` }}>
              🔐
            </div>
            <h1 className="text-2xl font-black" style={{ color: '#1f2233' }}>
              {pinStep === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
            </h1>
            <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(70,75,96,0.65)' }}>
              {pinStep === 'create' ? 'Choose a 4-digit PIN you\'ll remember' : 'Enter the same PIN again'}
            </p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-6">
            {(pinStep === 'create' ? pin : confirmPin).map((d, i) => (
              <input
                key={`${pinStep}-${i}`}
                id={`${pinStep === 'create' ? 'create' : 'confirm'}-pin-${i}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handlePinDigit(i, e.target.value, pinStep)}
                onKeyDown={e => handlePinKey(i, e, pinStep)}
                autoFocus={i === 0}
                className="w-16 h-16 rounded-2xl text-center text-2xl font-black outline-none transition-all"
                style={{
                  background: d ? `${accentColor}15` : 'rgba(255,255,255,0.9)',
                  border: `2px solid ${d ? accentColor : 'rgba(120,120,140,0.25)'}`,
                  color: '#1f2233',
                  boxShadow: d ? `0 4px 16px ${accentColor}20` : 'none',
                  transform: d ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-3 mb-6">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: pinStep === 'create' ? accentColor : `${accentColor}40` }} />
              <span className="text-xs font-bold" style={{ color: pinStep === 'create' ? accentColor : 'rgba(70,75,96,0.4)' }}>Create</span>
            </div>
            <div className="text-xs font-bold" style={{ color: 'rgba(70,75,96,0.3)' }}>→</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: pinStep === 'confirm' ? accentColor : 'rgba(120,120,140,0.2)' }} />
              <span className="text-xs font-bold" style={{ color: pinStep === 'confirm' ? accentColor : 'rgba(70,75,96,0.4)' }}>Confirm</span>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-2xl text-sm font-bold mb-4 text-center" style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: '#E05252' }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }} />
              <span className="text-sm font-bold" style={{ color: accentColor }}>Creating your account…</span>
            </div>
          )}

          {/* On-screen keypad for all roles (touch-friendly) */}
          <div className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      const target = pinStep
                      const arr = target === 'create' ? pin : confirmPin
                      const idx = arr.findIndex(x => !x)
                      if (idx >= 0) handlePinDigit(idx, d, target)
                    }}
                    disabled={loading}
                    className="h-14 rounded-2xl text-2xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,120,140,0.2)', color: '#1f2233' }}
                  >
                    {d}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => {
                    const target = pinStep
                    const arr = target === 'create' ? pin : confirmPin
                    const idx = arr.findIndex(x => !x)
                    if (idx >= 0) handlePinDigit(idx, '0', target)
                  }}
                  disabled={loading}
                  className="h-14 rounded-2xl text-2xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
                  style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,120,140,0.2)', color: '#1f2233' }}
                >
                  0
                </button>
                <button
                  onClick={() => {
                    const target = pinStep
                    const arr = target === 'create' ? [...pin] : [...confirmPin]
                    const lastFilled = arr.map((d, i) => d ? i : -1).filter(i => i >= 0).pop()
                    if (lastFilled !== undefined && lastFilled >= 0) {
                      arr[lastFilled] = ''
                      if (target === 'create') setPin(arr)
                      else setConfirmPin(arr)
                    }
                  }}
                  disabled={loading}
                  className="h-14 rounded-2xl text-xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
                  style={{ background: 'rgba(245,245,250,0.9)', border: '1px solid rgba(120,120,140,0.15)', color: 'rgba(70,75,96,0.6)' }}
                >
                  ⌫
                </button>
              </div>
            </div>
        </div>
      )}

      {/* ══════════════ STEP: DONE ══════════════ */}
      {step === 'done' && (
        <div className="w-full max-w-[380px] relative z-10 animate-slide-up text-center">
          {/* Confetti-ish */}
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1f2233' }}>Account Created!</h1>
          <p className="text-sm font-semibold mb-6" style={{ color: 'rgba(70,75,96,0.65)' }}>
            Welcome to KinderSpark Pro, {name}!
          </p>

          {/* Profile ID card */}
          <div
            className="rounded-3xl p-6 mb-6 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.95)', border: '2px solid rgba(94,92,230,0.2)', boxShadow: '0 12px 40px rgba(30,40,70,0.12)' }}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl" style={{ background: accentGrad }} />

            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(70,75,96,0.5)' }}>
              Your Unique Profile ID
            </div>
            <div
              className="text-3xl font-black tracking-wider mb-3 py-3 px-6 rounded-2xl inline-block"
              style={{
                background: `${accentColor}10`,
                color: accentColor,
                border: `2px dashed ${accentColor}40`,
                letterSpacing: '0.15em',
              }}
            >
              {profileId}
            </div>
            <div className="text-xs font-semibold" style={{ color: 'rgba(70,75,96,0.5)' }}>
              Save this ID! You&apos;ll need it for account recovery.
            </div>

            {/* Copy button */}
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(profileId)
                } else {
                  // Fallback for older browsers / insecure contexts
                  const ta = document.createElement('textarea')
                  ta.value = profileId
                  document.body.appendChild(ta)
                  ta.select()
                  document.execCommand('copy')
                  document.body.removeChild(ta)
                }
                const btn = document.getElementById('copy-id-btn')
                if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy ID' }, 2000) }
              }}
              id="copy-id-btn"
              className="mt-3 px-4 py-2 rounded-xl text-xs font-black app-pressable transition-all active:scale-95"
              style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
            >
              📋 Copy ID
            </button>
          </div>

          {/* User info summary */}
          <div
            className="rounded-2xl p-4 mb-6 text-left"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(120,120,140,0.15)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{avatar}</span>
              <div>
                <div className="text-sm font-black" style={{ color: '#1f2233' }}>{name}</div>
                <div className="text-xs font-bold" style={{ color: 'rgba(70,75,96,0.5)' }}>{selectedRole?.label}</div>
              </div>
            </div>
            {email && (
              <div className="text-xs font-semibold mt-1" style={{ color: 'rgba(70,75,96,0.5)' }}>
                ✉️ {email}
              </div>
            )}
          </div>

          <button
            onClick={goToDashboard}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95 app-pressable"
            style={{ background: accentGrad, boxShadow: `0 6px 28px ${accentColor}30` }}
          >
            🚀 Get Started!
          </button>
        </div>
      )}
    </div>
  )
}
