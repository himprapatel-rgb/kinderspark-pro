'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { id: 'teacher', label: 'Teacher', emoji: '👩‍🏫', color: '#5E5CE6', desc: 'Manage class & content' },
  { id: 'parent', label: 'Parent', emoji: '👨‍👩‍👧', color: '#30D158', desc: 'Track child progress' },
  { id: 'child', label: 'Child', emoji: '🧒', color: '#FF9F0A', desc: 'Learn and play!' },
  { id: 'admin', label: 'Admin', emoji: '⚙️', color: '#BF5AF2', desc: 'School management' },
]

export default function HomePage() {
  const [splash, setSplash] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])

  if (splash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 100%)' }}>
        <div className="text-7xl mb-6 animate-bounce">🌟</div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">KinderSpark Pro</h1>
        <p className="text-white/70 font-bold text-sm mb-10">AI-Powered Learning Platform</p>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-5">
        <div className="text-5xl mb-3">🌟</div>
        <h1 className="text-2xl font-black text-white tracking-tight">KinderSpark Pro</h1>
        <p className="text-white/60 font-bold text-sm mt-1">Choose your role to continue</p>
      </div>

      {/* Role Cards */}
      <div className="flex-1 px-5 pb-8">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => router.push(`/pin?role=${role.id}`)}
              className="rounded-2xl p-5 flex flex-col items-center gap-2 card-hover active:scale-95 transition-all"
              style={{ background: `${role.color}22`, border: `2px solid ${role.color}44` }}
            >
              <div className="text-4xl">{role.emoji}</div>
              <div className="text-white font-black text-sm">{role.label}</div>
              <div className="text-white/50 font-bold text-xs text-center">{role.desc}</div>
            </button>
          ))}
        </div>

        {/* Language buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          {['🇺🇸 EN', '🇦🇪 AR', '🇫🇷 FR', '🇪🇸 ES'].map(lang => (
            <button
              key={lang}
              className="px-3 py-1 rounded-full text-xs font-bold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-white/30 text-xs font-bold pb-6">
        KinderSpark Pro v1.0 • Powered by Claude AI
      </div>
    </div>
  )
}
