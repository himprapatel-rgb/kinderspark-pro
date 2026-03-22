'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPin } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const ROLE_META: Record<string, { emoji: string; label: string; bg: string }> = {
  child:   { emoji: '🧒', label: "Kid",     bg: 'linear-gradient(135deg,#FF9F0A,#FF6B35)' },
  teacher: { emoji: '👩‍🏫', label: "Teacher", bg: 'linear-gradient(135deg,#5E5CE6,#BF5AF2)' },
  parent:  { emoji: '👨‍👩‍👧', label: "Parent",  bg: 'linear-gradient(135deg,#30D158,#43C6AC)' },
  admin:   { emoji: '⚙️', label: "Admin",   bg: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)' },
}

export default function PinPage() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role') || 'child'
  const meta = ROLE_META[role] || ROLE_META.child

  const [pin, setPin] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const setAuth = useAppStore(s => s.setAuth)

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
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  async function submit(pinValue: string) {
    setLoading(true)
    setError('')
    try {
      const data = await verifyPin(pinValue, role)
      setAuth(data.user, role, data.accessToken || data.token)
      if (role === 'teacher') router.replace('/teacher')
      else if (role === 'admin') router.replace('/admin')
      else if (role === 'parent') router.replace('/parent')
      else router.replace('/child')
    } catch {
      setError('Wrong PIN — try again')
      setPin(['', '', '', ''])
      setTimeout(() => refs[0].current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const pinStr = pin.join('')

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
    >
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-5 text-white/40 hover:text-white text-2xl transition-colors"
      >
        ←
      </button>

      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-4"
        style={{ background: meta.bg, boxShadow: `0 8px 32px rgba(0,0,0,0.4)` }}
      >
        {meta.emoji}
      </div>
      <h2 className="text-white text-2xl font-black mb-1">{meta.label} Login</h2>
      <p className="text-white/40 text-sm font-bold mb-10">Enter your PIN</p>

      {/* PIN boxes */}
      <div className="flex gap-3 mb-6">
        {pin.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            className="w-14 h-14 rounded-2xl text-center text-2xl font-black text-white border-2 transition-all outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: d ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm font-bold mb-4">{error}</p>
      )}

      <button
        onClick={() => submit(pinStr)}
        disabled={pinStr.length < 4 || loading}
        className="w-full max-w-[240px] py-4 rounded-2xl text-white font-black text-lg transition-all active:scale-95 disabled:opacity-40"
        style={{ background: meta.bg }}
      >
        {loading ? 'Checking…' : 'Enter →'}
      </button>
    </div>
  )
}
