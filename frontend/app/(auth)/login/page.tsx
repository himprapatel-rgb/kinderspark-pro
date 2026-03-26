'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { verifyPin } from '@/lib/api'

const ROLES = [
  {
    id: 'child',
    emoji: '🧒',
    label: "I'm a Kid",
    sub: 'Learn, play & earn stars!',
    color: '#FF9F0A',
    grad: 'linear-gradient(135deg,#FF9F0A 0%,#FF6B35 100%)',
    glow: 'rgba(255,159,10,0.4)',
    icon: '⭐',
  },
  {
    id: 'teacher',
    emoji: '👩‍🏫',
    label: "I'm a Teacher",
    sub: 'Manage your class & lessons',
    color: '#5E5CE6',
    grad: 'linear-gradient(135deg,#5E5CE6 0%,#BF5AF2 100%)',
    glow: 'rgba(94,92,230,0.4)',
    icon: '📚',
  },
  {
    id: 'parent',
    emoji: '👨‍👩‍👧',
    label: "I'm a Parent",
    sub: "Track your child's progress",
    color: '#30D158',
    grad: 'linear-gradient(135deg,#30D158 0%,#43C6AC 100%)',
    glow: 'rgba(48,209,88,0.4)',
    icon: '💚',
  },
  {
    id: 'admin',
    emoji: '⚙️',
    label: 'Admin',
    sub: 'School overview & settings',
    color: '#BF5AF2',
    grad: 'linear-gradient(135deg,#BF5AF2 0%,#5E5CE6 100%)',
    glow: 'rgba(191,90,242,0.4)',
    icon: '🏫',
  },
]

// Scattered star positions (deterministic so no hydration mismatch)
const STARS = [
  { top: '8%',  left: '12%', size: 6,  delay: 0 },
  { top: '15%', left: '85%', size: 4,  delay: 0.8 },
  { top: '25%', left: '5%',  size: 5,  delay: 1.6 },
  { top: '35%', left: '92%', size: 3,  delay: 0.4 },
  { top: '55%', left: '3%',  size: 7,  delay: 1.2 },
  { top: '65%', left: '88%', size: 4,  delay: 2.0 },
  { top: '75%', left: '8%',  size: 5,  delay: 0.6 },
  { top: '85%', left: '80%', size: 6,  delay: 1.4 },
  { top: '90%', left: '20%', size: 3,  delay: 0.2 },
  { top: '48%', left: '95%', size: 4,  delay: 1.8 },
  { top: '5%',  left: '50%', size: 5,  delay: 0.9 },
  { top: '95%', left: '55%', size: 3,  delay: 1.1 },
]

const DEV_LOGINS = [
  { label: 'Admin',   emoji: '⚙️',  role: 'admin',   pin: '9999', color: '#BF5AF2' },
  { label: 'Teacher', emoji: '👩‍🏫', role: 'teacher', pin: '1234', color: '#5E5CE6' },
  { label: 'Parent',  emoji: '👨‍👩‍👧', role: 'parent',  pin: '1111', color: '#30D158' },
  { label: 'Kid',     emoji: '🧒',  role: 'child',   pin: '1111', color: '#FF9F0A' },
]

export default function LoginPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const role = useAppStore((s) => s.role)
  const setAuth = useAppStore((s) => s.setAuth)
  const [devLoading, setDevLoading] = useState<string | null>(null)

  async function quickLogin(item: typeof DEV_LOGINS[number]) {
    setDevLoading(item.role)
    try {
      const data = await verifyPin(item.pin, item.role)
      setAuth(data.user, item.role, data.accessToken || data.token)
      if (item.role === 'teacher') router.replace('/teacher')
      else if (item.role === 'admin')  router.replace('/admin')
      else if (item.role === 'parent') router.replace('/parent')
      else router.replace('/child')
    } catch { setDevLoading(null) }
  }

  useEffect(() => {
    if (!user || !role) return
    if (role === 'teacher') router.replace('/teacher')
    else if (role === 'admin')  router.replace('/admin')
    else if (role === 'parent') router.replace('/parent')
    else router.replace('/child')
  }, [user, role, router])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #eef3ff 0%, #f6f8ff 45%, #eefaf2 100%)' }}
    >
      {/* ── Background orbs ── */}
      <div className="orb w-80 h-80 top-[-80px] left-[-80px] opacity-30"
        style={{ background: '#5E5CE6', animationDelay: '0s' }} />
      <div className="orb w-72 h-72 bottom-[-60px] right-[-60px] opacity-25"
        style={{ background: '#30D158', animationDelay: '2s', filter: 'blur(70px)' }} />
      <div className="orb w-48 h-48 top-[40%] right-[5%] opacity-20"
        style={{ background: '#BF5AF2', filter: 'blur(50px)' }} />

      {/* ── Twinkling stars ── */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute text-yellow-300 pointer-events-none select-none"
          style={{
            top: s.top, left: s.left,
            fontSize: s.size + 10,
            animation: `star-twinkle ${2.5 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        >
          ✦
        </div>
      ))}

      {/* ── Logo ── */}
      <div className="text-center mb-10 animate-slide-up relative z-10">
        <div
          className="mx-auto mb-4 flex items-center justify-center relative"
          style={{ width: 88, height: 88 }}
        >
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-3xl opacity-60"
            style={{
              background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)',
              filter: 'blur(14px)',
              animation: 'glow-pulse 2.5s ease-in-out infinite',
            }}
          />
          <div
            className="relative z-10 w-full h-full rounded-3xl flex items-center justify-center text-5xl"
            style={{
              background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)',
              boxShadow: '0 8px 32px rgba(94,92,230,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            ⭐
          </div>
        </div>
        <h1
          className="text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          KinderSpark
          <span
            style={{
              display: 'block',
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #BF5AF2, #5E5CE6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 900,
              letterSpacing: '0.3em',
              marginTop: 2,
            }}
          >
            PRO
          </span>
        </h1>
        <p className="text-white/40 text-sm font-bold mt-1 tracking-wide">
          AI-powered kindergarten learning
        </p>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 mb-6 w-full max-w-[360px] animate-slide-up delay-100">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(70,75,96,0.25))' }} />
        <span className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'rgba(70, 75, 96, 0.7)' }}>Who are you?</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(70,75,96,0.25), transparent)' }} />
      </div>

      {/* ── Role cards ── */}
      <div className="w-full max-w-[360px] space-y-3 relative z-10">
        {ROLES.map((r, i) => (
          <button
            key={r.id}
            onClick={() => router.push(`/pin?role=${r.id}`)}
            className="w-full rounded-2xl p-4 flex items-center gap-4 text-left relative overflow-hidden group transition-all duration-200 active:scale-[0.97] app-pressable"
            style={{
              animationDelay: `${(i + 2) * 100}ms`,
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(120,120,140,0.22)',
              boxShadow: `0 8px 22px rgba(30,40,70,0.12)`,
            }}
          >
            {/* Hover gradient fill */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: r.grad }}
            />
            {/* Left color accent bar */}
            <div
              className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
              style={{ background: r.grad }}
            />

            {/* Icon circle */}
            <div
              className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{
                background: r.grad,
                boxShadow: `0 4px 16px ${r.glow}`,
              }}
            >
              {r.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 relative z-10">
              <div className="text-base font-black leading-tight" style={{ color: 'rgb(32,36,52)' }}>{r.label}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(70, 75, 96, 0.8)' }}>{r.sub}</div>
            </div>

            {/* Arrow */}
            <div
              className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-200 group-hover:translate-x-1"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              ›
            </div>
          </button>
        ))}
      </div>

      {/* ── Dev Links ── */}
      <div className="w-full max-w-[360px] mt-6 relative z-10">
        <div style={{ background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,200,0,0.6)', letterSpacing: '0.15em', marginBottom: 8 }}>🔗 DEV LINKS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              { label: '🛸 Agent Dashboard', path: '/dashboard/agents' },
              { label: '⚙️ Admin',            path: '/admin' },
              { label: '👩‍🏫 Teacher',         path: '/teacher' },
              { label: '👨‍👩‍👧 Parent',          path: '/parent' },
              { label: '🧒 Child',            path: '/child' },
              { label: '🔧 Dev Panel',        path: '/dashboard/agents' },
            ].map(link => (
              <button key={link.path} onClick={() => router.push(link.path)} className="app-pressable" style={{
                fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{link.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dev Quick Login ── */}
      <div className="w-full max-w-[360px] relative z-10">
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: 10 }}>
            ⚡ DEV QUICK LOGIN
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {DEV_LOGINS.map(item => (
              <button
                key={item.role}
                onClick={() => quickLogin(item)}
                disabled={devLoading === item.role}
                className="app-pressable"
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                  background: devLoading === item.role ? 'rgba(255,255,255,0.05)' : item.color + '22',
                  color: item.color, fontWeight: 900, fontSize: 10, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  border: `1px solid ${item.color}33`,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 18 }}>{devLoading === item.role ? '⏳' : item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-12 text-center relative z-10 animate-fade-in">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {['🔒', '🤖', '⭐'].map((icon, i) => (
            <span key={i} className="text-sm opacity-40">{icon}</span>
          ))}
        </div>
        <p className="text-white/20 text-xs font-semibold">Safe & AI-powered learning · © 2025 KinderSpark Pro</p>
      </div>

      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8) rotate(0deg); }
          50%       { opacity: 0.9; transform: scale(1.3) rotate(15deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50%       { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
