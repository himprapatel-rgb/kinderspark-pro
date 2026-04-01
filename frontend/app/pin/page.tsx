'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPin, API_BASE, getDemoSchoolCode } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { hapticTap, hapticSuccess, hapticError } from '@/lib/capacitor'

const ROLE_META: Record<string, { emoji: string; label: string; grad: string; color: string; glow: string }> = {
  child:     { emoji: '🧒', label: 'Kid',       grad: 'linear-gradient(135deg,#F5A623,#D4881A)', color: '#F5A623', glow: 'rgba(255,159,10,0.45)' },
  teacher:   { emoji: '👩‍🏫', label: 'Teacher',   grad: 'linear-gradient(135deg,#5B7FE8,#8B6CC1)', color: '#5B7FE8', glow: 'rgba(94,92,230,0.45)' },
  parent:    { emoji: '👨‍👩‍👧', label: 'Parent',    grad: 'linear-gradient(135deg,#4CAF6A,#5FBF7F)', color: '#4CAF6A', glow: 'rgba(48,209,88,0.45)' },
  admin:     { emoji: '⚙️', label: 'Admin',     grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)', color: '#8B6CC1', glow: 'rgba(191,90,242,0.45)' },
  principal: { emoji: '👑', label: 'Principal', grad: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)', color: '#8B6CC1', glow: 'rgba(191,90,242,0.45)' },
}

const SCHOOL_STORAGE_KEY = 'kinderspark_school_code'

function PinContent() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role') || 'child'
  const meta = ROLE_META[role] || ROLE_META.child

  const [schoolCode, setSchoolCode] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const setAuth = useAppStore(s => s.setAuth)

  useEffect(() => {
    try {
      const fromStore = sessionStorage.getItem(SCHOOL_STORAGE_KEY)
      const fromQuery = params.get('school')?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? ''
      const initial =
        (fromQuery.length === 6 ? fromQuery : null) ||
        fromStore ||
        getDemoSchoolCode()
      setSchoolCode(initial.slice(0, 6).toUpperCase())
    } catch {
      setSchoolCode(getDemoSchoolCode())
    }
  }, [params])

  useEffect(() => { refs[0].current?.focus() }, [])

  function handleDigit(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...pin]
    next[idx] = val
    setPin(next)
    setError('')
    if (val && idx < 3) refs[idx + 1].current?.focus()
    if (next.every(d => d)) submit(next.join(''))
  }

  function handleKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!pin[idx] && idx > 0) {
        const next = [...pin]
        next[idx - 1] = ''
        setPin(next)
        refs[idx - 1].current?.focus()
      } else {
        const next = [...pin]
        next[idx] = ''
        setPin(next)
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const next = pasted.split('')
      setPin(next)
      setError('')
      refs[3].current?.focus()
      submit(pasted)
    }
  }

  // On-screen keypad tap (for child role on touch devices)
  function tapDigit(digit: string) {
    const emptyIdx = pin.findIndex(d => !d)
    if (emptyIdx === -1) return
    hapticTap()
    handleDigit(emptyIdx, digit)
  }

  function tapBackspace() {
    const lastFilled = pin.map((d, i) => d ? i : -1).filter(i => i >= 0).pop()
    if (lastFilled !== undefined && lastFilled >= 0) {
      hapticTap()
      const next = [...pin]
      next[lastFilled] = ''
      setPin(next)
      refs[lastFilled].current?.focus()
    }
  }

  function persistSchoolCode(code: string) {
    try {
      sessionStorage.setItem(SCHOOL_STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }

  async function submit(pinValue: string) {
    const code = schoolCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code.length !== 6) {
      setError('Enter your 6-character school code first')
      hapticError()
      return
    }
    persistSchoolCode(code)
    setLoading(true)
    setError('')
    try {
      // #region agent log
      fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pin/page.tsx:submit:start',message:'PIN submit start',data:{role,pinLen:pinValue.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      const data = await verifyPin(pinValue, role, code)
      // #region agent log
      fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pin/page.tsx:submit:success',message:'PIN submit success',data:{role,hasToken:false},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      hapticSuccess()
      setSuccess(true)
      setAuth(data.user, role)
      setTimeout(() => {
        // #region agent log
        fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pin/page.tsx:submit:redirect',message:'Redirect after PIN',data:{role},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        const resume = (() => {
          try {
            const raw = sessionStorage.getItem('ks_after_login') || ''
            sessionStorage.removeItem('ks_after_login')
            // Only resume to real app pages — never back to /pin or /login
            if (raw && raw.startsWith('/') && !raw.startsWith('/pin') && !raw.startsWith('/login')) {
              return raw
            }
          } catch {
            // ignore
          }
          return ''
        })()
        if (resume) {
          router.replace(resume)
          return
        }
        if (role === 'teacher') router.replace('/teacher')
        else if (role === 'admin' || role === 'principal') router.replace('/admin')
        else if (role === 'parent') router.replace('/parent')
        else router.replace('/child')
      }, 600)
    } catch (err: any) {
      // #region agent log
      fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pin/page.tsx:submit:error',message:'PIN submit error',data:{role,err:String(err?.message)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      hapticError()
      const msg = err?.message || ''
      // Show specific errors to help diagnose; fall back to generic for wrong PIN
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setError('Cannot reach server — check your connection')
      } else if (msg.includes('school') || msg.includes('School')) {
        setError(msg)
      } else if (msg.includes('locked') || msg.includes('Too many')) {
        setError(msg)
      } else {
        setError('Wrong PIN — try again')
      }
      setPin(['', '', '', ''])
      setShake(true)
      setTimeout(() => { setShake(false); refs[0].current?.focus() }, 500)
    } finally {
      if (!success) setLoading(false)
    }
  }

  const pinStr = pin.join('')
  const filled = pin.filter(d => d).length

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFFCF5 0%, #FFF9EE 60%, #F8FBF5 100%)' }}
    >
      {/* Background orb matching role color */}
      <div
        className="orb w-96 h-96 top-[-100px] left-[50%] -translate-x-1/2 opacity-20"
        style={{ background: meta.color, filter: 'blur(80px)' }}
      />

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-5 w-11 h-11 rounded-2xl flex items-center justify-center transition-all text-lg font-bold z-10 app-pressable"
        style={{ color: 'rgb(var(--foreground-rgb))', background: 'var(--app-surface)', border: '1px solid var(--app-border)', boxShadow: 'var(--app-shadow-sm)' }}
      >
        ←
      </button>

      {/* Avatar + role */}
      <div className="flex flex-col items-center mb-10 relative z-10 animate-slide-up">
        <div className="relative mb-5">
          {/* Glow ring */}
          <div
            className="absolute inset-[-6px] rounded-[28px] opacity-50"
            style={{ background: meta.grad, filter: 'blur(16px)' }}
          />
          <div
            className="relative w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{
              background: meta.grad,
              boxShadow: `0 12px 40px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}
          >
            {success ? '✓' : meta.emoji}
          </div>
        </div>
        <h2
          className="text-3xl font-black mb-1"
          style={{ color: meta.color }}
        >
          {meta.label} Login
        </h2>
        <p className="text-sm font-semibold" style={{ color: 'rgba(70, 75, 96, 0.85)' }}>School code, then your 4-digit PIN</p>
      </div>

      {/* School code (multi-school PIN scope) */}
      <div className="w-full max-w-[280px] mb-8 relative z-10">
        <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'rgba(70, 75, 96, 0.65)' }}>
          School code
        </label>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={6}
          value={schoolCode}
          onChange={e => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
            setSchoolCode(v)
            setError('')
          }}
          placeholder="SUN001"
          className="w-full h-14 px-4 rounded-2xl text-center text-lg font-black tracking-[0.25em] outline-none app-pressable"
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: `2px solid ${schoolCode.length === 6 ? meta.color : 'rgba(120,120,140,0.28)'}`,
            color: '#1f2233',
            boxShadow: schoolCode.length === 6 ? `0 4px 16px ${meta.glow}` : 'none',
          }}
        />
        <p className="text-[10px] font-semibold mt-2 text-center" style={{ color: 'rgba(70, 75, 96, 0.5)' }}>
          From your teacher or school admin · 6 letters or numbers
        </p>
      </div>

      {/* PIN boxes */}
      <div className={`flex gap-4 mb-8 relative z-10 ${shake ? 'animate-shake' : ''}`}>
        {pin.map((d, i) => (
          <div key={i} className="relative">
            {/* Active glow */}
            {!d && i === filled && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `0 0 0 2px ${meta.color}`,
                  animation: 'glow-pulse 1.5s ease-in-out infinite',
                }}
              />
            )}
            <input
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              onPaste={handlePaste}
              className="w-16 h-16 rounded-2xl text-center text-2xl font-black transition-all outline-none app-pressable"
              style={{
                background: d
                  ? `linear-gradient(135deg, ${meta.color}22, ${meta.color}44)`
                  : 'rgba(255,255,255,0.9)',
                color: d ? '#1f2233' : '#1f2233',
                border: `2px solid ${d ? meta.color : 'rgba(120,120,140,0.28)'}`,
                boxShadow: d ? `0 4px 20px ${meta.glow}` : 'none',
                transform: d ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 px-5 py-2.5 rounded-2xl text-sm font-bold relative z-10 animate-pop"
          style={{ background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)', color: '#E05252' }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => submit(pinStr)}
        disabled={
          pinStr.length < 4 ||
          schoolCode.replace(/[^A-Z0-9]/gi, '').length !== 6 ||
          loading ||
          success
        }
        className="w-full max-w-[280px] py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-40 relative z-10 overflow-hidden app-pressable"
        style={{
          background: meta.grad,
          color: '#fff',
          boxShadow: pinStr.length >= 4 ? `0 6px 28px ${meta.glow}` : 'none',
        }}
      >
        {/* Shimmer on ready */}
        {pinStr.length >= 4 && !loading && !success && (
          <div className="absolute inset-0 shimmer" />
        )}
        <span className="relative z-10">
          {success ? '✓ Welcome!' : loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking…
            </span>
          ) : 'Enter →'}
        </span>
      </button>

      {/* Dot progress indicator */}
      <div className="flex gap-2 mt-6 relative z-10">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-200"
            style={{
              background: i < filled ? meta.color : 'rgba(120,120,140,0.2)',
              transform: i < filled ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* On-screen numeric keypad (touch-friendly for all roles) */}
      <div className="mt-8 w-full max-w-[280px] relative z-10">
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => tapDigit(d)}
                disabled={loading || success || filled >= 4}
                className="h-14 rounded-2xl text-2xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
                style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'rgb(var(--foreground-rgb))' }}
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => tapDigit('0')}
              disabled={loading || success || filled >= 4}
              className="h-14 rounded-2xl text-2xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'rgb(var(--foreground-rgb))' }}
            >
              0
            </button>
            <button
              onClick={tapBackspace}
              disabled={loading || success || filled === 0}
              className="h-14 rounded-2xl text-xl font-black active:scale-90 transition-all disabled:opacity-30 app-pressable"
              style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)', color: 'var(--app-text-muted)' }}
            >
              ⌫
            </button>
          </div>
        </div>

      {/* Create Account link */}
      <div className="mt-6 text-center relative z-10">
        <button
          onClick={() => router.push('/register')}
          className="text-sm font-bold app-pressable"
          style={{ color: 'rgba(70,75,96,0.6)' }}
        >
          New here? <span style={{ color: meta.color, fontWeight: 900 }}>Create Account</span>
        </button>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes animate-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

export default function PinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(120,120,140,0.3)', borderTopColor: 'var(--app-accent)' }} />
      </div>
    }>
      <PinContent />
    </Suspense>
  )
}
