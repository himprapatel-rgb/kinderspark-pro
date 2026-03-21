'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPin } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const ROLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  teacher: { emoji: '👩‍🏫', label: 'Teacher Login', color: '#5E5CE6' },
  parent: { emoji: '👨‍👩‍👧', label: 'Parent Login', color: '#30D158' },
  child: { emoji: '🧒', label: 'Child Login', color: '#FF9F0A' },
  admin: { emoji: '⚙️', label: 'Admin Login', color: '#BF5AF2' },
}

function PinEntry() {
  const params = useSearchParams()
  const role = params.get('role') || 'child'
  const meta = ROLE_META[role] || ROLE_META.child
  const router = useRouter()
  const setAuth = useAppStore((s) => s.setAuth)
  const setCurrentStudent = useAppStore((s) => s.setCurrentStudent)

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleKey = async (key: string) => {
    if (loading) return
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      setError('')
      return
    }
    if (pin.length >= 4) return

    const newPin = pin + key
    setPin(newPin)
    setError('')

    if (newPin.length === 4) {
      setLoading(true)
      try {
        const data = await verifyPin(newPin, role)
        if (data.success) {
          setAuth(data.user, data.role, data.token || '')
          if (role === 'child' || role === 'parent') {
            setCurrentStudent(data.user)
          }
          if (data.role === 'teacher') router.push('/teacher')
          else if (data.role === 'admin') router.push('/admin')
          else if (data.role === 'parent') router.push('/parent')
          else router.push('/child')
        } else {
          setError('Wrong PIN. Try again.')
          setShake(true)
          setTimeout(() => { setShake(false); setPin('') }, 600)
        }
      } catch {
        setError('Wrong PIN. Try again.')
        setShake(true)
        setTimeout(() => { setShake(false); setPin('') }, 600)
      } finally {
        setLoading(false)
      }
    }
  }

  const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 relative"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-5 text-white/60 text-sm font-bold flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Icon */}
      <div className="text-6xl mb-4">{meta.emoji}</div>
      <h2 className="text-xl font-black text-white mb-1">{meta.label}</h2>
      <p className="text-white/50 text-sm font-bold mb-8">Enter your 4-digit PIN</p>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-6 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border-2 transition-all"
            style={{
              borderColor: meta.color,
              background: i < pin.length ? meta.color : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-red-400 text-sm font-bold mb-4">{error}</p>}

      {/* Keypad */}
      <div className="w-full max-w-[260px]">
        {KEYS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-3 mb-3">
            {row.map((key, ki) => (
              <button
                key={ki}
                onClick={() => key && handleKey(key)}
                disabled={loading || !key}
                className={`h-16 rounded-2xl text-xl font-black transition-all active:scale-95 ${key ? 'text-white active:opacity-70' : 'invisible'}`}
                style={{
                  background:
                    key === 'del'
                      ? 'rgba(255,69,58,0.3)'
                      : key
                      ? 'rgba(255,255,255,0.1)'
                      : 'transparent',
                }}
              >
                {key === 'del' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {loading && (
        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  )
}

export default function PinPage() {
  return (
    <Suspense>
      <PinEntry />
    </Suspense>
  )
}
