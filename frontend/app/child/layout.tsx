'use client'
import { useAppStore } from '@/store/appStore'
import { useRouter, usePathname } from 'next/navigation'
import { SHOP_THS } from '@/lib/modules'
import { useState, useEffect, useRef } from 'react'

const THEME_SECONDARY: Record<string, string> = {
  th_def:    '#8b1cf7',
  th_ocean:  '#5856D6',
  th_forest: '#27AE7A',
  th_sunset: '#FF6B35',
  th_rose:   '#FF2D55',
  th_galaxy: '#7B2FBE',
}

const THEME_BG_TINT: Record<string, string> = {
  th_def:    '#1a0a2e',
  th_ocean:  '#0a1a2e',
  th_forest: '#0a1e12',
  th_sunset: '#1e100a',
  th_rose:   '#1e0a12',
  th_galaxy: '#120a1e',
}

const NAV_TABS = [
  { icon: '🏠', label: 'Home',   path: '/child' },
  { icon: '📚', label: 'Learn',  path: '/child/learn' },
  { icon: '🔤', label: 'Match',  path: '/child/match' },
  { icon: '🏆', label: 'Rank',   path: '/child/leaderboard' },
  { icon: '👤', label: 'Me',     path: '/child/settings' },
]

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const currentStudent = useAppStore(s => s.currentStudent)
  const user = useAppStore(s => s.user)
  const settings = useAppStore(s => s.settings)
  const student = currentStudent || user
  const router = useRouter()
  const pathname = usePathname()

  // ── Screen time enforcement ──────────────────────────────────────────────
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  const limitMin: number = isDev ? 0 : ((settings as any)?.stLimit || 0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [timeUp, setTimeUp] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!limitMin || limitMin <= 0) return
    const studentId = (student as any)?.id || 'guest'
    const today = new Date().toISOString().slice(0, 10)
    const key = `ks_session_${studentId}_${today}`
    const stored = (() => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } })()
    const usedMs: number = stored?.usedMs || 0
    const limitMs = limitMin * 60 * 1000
    if (usedMs >= limitMs) { setElapsedSec(Math.floor(usedMs / 1000)); setTimeUp(true); return }

    setElapsedSec(Math.floor(usedMs / 1000))
    const startMs = Date.now()

    intervalRef.current = setInterval(() => {
      const newUsed = usedMs + (Date.now() - startMs)
      setElapsedSec(Math.floor(newUsed / 1000))
      localStorage.setItem(key, JSON.stringify({ usedMs: newUsed }))
      if (newUsed >= limitMs) { setTimeUp(true); clearInterval(intervalRef.current!) }
    }, 1000)

    return () => { clearInterval(intervalRef.current!) }
  }, [limitMin, (student as any)?.id])

  const remainingSec = limitMin > 0 ? Math.max(0, limitMin * 60 - elapsedSec) : 0
  const remainingMin = Math.ceil(remainingSec / 60)

  const themeId = (student as any)?.selectedTheme || 'th_def'
  const theme = SHOP_THS.find(t => t.id === themeId) || SHOP_THS[0]
  const secondary = THEME_SECONDARY[themeId] || '#8b1cf7'
  const bgTint = THEME_BG_TINT[themeId] || '#1a0a2e'

  // Determine active tab (exact match for /child, prefix match otherwise)
  const activeIdx = NAV_TABS.findIndex(t =>
    t.path === '/child' ? pathname === '/child' : pathname.startsWith(t.path)
  )

  return (
    <div
      style={{
        '--theme-color': theme.color,
        '--theme-secondary': secondary,
        '--theme-bg-tint': bgTint,
        '--theme-glow': theme.color + '40',
        '--theme-soft': theme.color + '22',
        '--theme-border': theme.color + '44',
      } as React.CSSProperties}
    >
      {/* ── Time's up overlay ── */}
      {timeUp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32,
          background: 'linear-gradient(135deg, #0d0824, #080614)',
          fontFamily: 'Nunito, sans-serif',
        }}>
          <div style={{ fontSize: 72, marginBottom: 16, animation: 'bounce 1s infinite' }}>🌟</div>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: 28, margin: '0 0 12px' }}>Great learning today!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
            You've used your {limitMin} minutes for today.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 14, margin: 0 }}>
            Come back tomorrow for more fun! 🎉
          </p>
          <div style={{ marginTop: 40, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['⭐','🏆','🎯','🌈','🦄','🚀'].map((e, i) => (
              <span key={i} style={{ fontSize: 32, animation: `bounce ${0.8 + i * 0.15}s infinite` }}>{e}</span>
            ))}
          </div>
          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
        </div>
      )}

      {children}

      {/* Bottom Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex items-center justify-around z-40"
        style={{ position: 'relative' }}
      >
        {/* Timer badge */}
        {limitMin > 0 && !timeUp && remainingSec <= 300 && (
          <div style={{
            position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
            background: remainingSec <= 60 ? 'rgba(255,69,58,0.9)' : 'rgba(255,159,10,0.9)',
            borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 900, color: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
          }}>
            ⏱ {remainingMin} min left
          </div>
        )}
      </div>
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex items-center justify-around z-40"
        style={{
          background: 'rgba(10,8,20,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          paddingTop: 10,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {NAV_TABS.map((tab, i) => {
          const active = i === activeIdx
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-1 transition-all duration-200"
              style={{ minWidth: 52 }}
            >
              <div
                className="flex items-center justify-center rounded-2xl transition-all duration-200"
                style={{
                  width: 44,
                  height: 30,
                  background: active ? theme.color + '28' : 'transparent',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span
                  className="text-lg leading-none transition-all duration-200"
                  style={{ filter: active ? `drop-shadow(0 0 5px ${theme.color}99)` : 'none' }}
                >
                  {tab.icon}
                </span>
              </div>
              <span
                className="text-[9px] font-black transition-colors duration-200"
                style={{ color: active ? theme.color : 'rgba(255,255,255,0.3)' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
