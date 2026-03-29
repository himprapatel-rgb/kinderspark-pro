'use client'

import { useEffect, useState } from 'react'

const EMOJIS = ['⭐', '✨', '🌟', '💫', '🎉', '🎊']

export default function MissionCelebration({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; emoji: string; dur: number }>>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }
    const next = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 8 + Math.random() * 84,
      delay: Math.random() * 0.35,
      emoji: EMOJIS[i % EMOJIS.length],
      dur: 1.8 + Math.random() * 0.8,
    }))
    setParticles(next)
    const t = window.setTimeout(() => onDone?.(), 2400)
    return () => clearTimeout(t)
  }, [active, onDone])

  if (!active || particles.length === 0) return null

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center" aria-hidden>
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative w-full max-w-md h-64">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-2xl sm:text-3xl"
            style={{
              left: `${p.x}%`,
              bottom: '0%',
              animation: `ks-confetti-rise ${p.dur}s ease-out ${p.delay}s forwards`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
