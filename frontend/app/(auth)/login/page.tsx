'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

const ROLES = [
  { id: 'child',   emoji: '🧒', label: "I'm a Kid",      sub: 'Learn & play!',       color: '#FF9F0A', bg: 'linear-gradient(135deg,#FF9F0A,#FF6B35)' },
  { id: 'teacher', emoji: '👩‍🏫', label: "I'm a Teacher",  sub: 'Manage your class',   color: '#5E5CE6', bg: 'linear-gradient(135deg,#5E5CE6,#BF5AF2)' },
  { id: 'parent',  emoji: '👨‍👩‍👧', label: "I'm a Parent",   sub: "Track your child",   color: '#30D158', bg: 'linear-gradient(135deg,#30D158,#43C6AC)' },
  { id: 'admin',   emoji: '⚙️', label: 'Admin',           sub: 'School overview',     color: '#BF5AF2', bg: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)' },
]

export default function LoginPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const role = useAppStore((s) => s.role)

  // Already logged in? redirect immediately
  useEffect(() => {
    if (!user || !role) return
    if (role === 'teacher') router.replace('/teacher')
    else if (role === 'admin')  router.replace('/admin')
    else if (role === 'parent') router.replace('/parent')
    else router.replace('/child')
  }, [user, role, router])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-3" style={{ animation: 'bounce 2s infinite' }}>⭐</div>
        <h1 className="text-3xl font-black text-white tracking-tight">KinderSpark Pro</h1>
        <p className="text-white/50 font-bold mt-1 text-sm">AI-powered kindergarten learning</p>
      </div>

      <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-5">Choose your role</p>

      {/* Role cards */}
      <div className="w-full max-w-[360px] space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/pin?role=${r.id}`)}
            className="w-full rounded-2xl p-4 flex items-center gap-4 text-left active:scale-95 transition-transform"
            style={{ background: r.bg, boxShadow: `0 4px 24px ${r.color}50` }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {r.emoji}
            </div>
            <div className="flex-1">
              <div className="text-white text-lg font-black leading-tight">{r.label}</div>
              <div className="text-white/70 text-sm font-bold">{r.sub}</div>
            </div>
            <div className="text-white/60 text-2xl font-bold">›</div>
          </button>
        ))}
      </div>

      <p className="text-white/15 text-xs font-bold mt-10">© 2025 KinderSpark Pro</p>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)}
        }
      `}</style>
    </div>
  )
}
