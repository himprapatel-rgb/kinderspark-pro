'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { getProgress } from '@/lib/api'
import { MODS } from '@/lib/modules'

const CATS = ['All', 'numbers', 'letters', 'words', 'colors', 'items'] as const

export default function LearnPage() {
  const router = useRouter()
  const user = useAppStore(s => s.currentStudent || s.user)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [cat, setCat] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getProgress(user.id)
      .then((data: any[]) => {
        const map: Record<string, number> = {}
        data.forEach((p: any) => { map[p.moduleId] = p.cards })
        setProgress(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const filtered = cat === 'All' ? MODS : MODS.filter(m => m.type === cat)
  const started = MODS.filter(m => (progress[m.id] || 0) > 0).length
  const done    = MODS.filter(m => (progress[m.id] || 0) >= m.items.length).length

  function badge(mod: typeof MODS[0]) {
    const cards = progress[mod.id] || 0
    if (cards >= mod.items.length) return { label: '✅ Done', color: '#30D158' }
    if (cards > 0) return { label: '▶ Continue', color: mod.color }
    return { label: '🚀 Start', color: mod.color }
  }

  return (
    <div className="app-page" style={{ minHeight: '100vh', fontFamily: 'Nunito, sans-serif', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d0824, #0a1228)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button className="app-pressable" onClick={() => router.back()} style={{ background: 'var(--app-surface-soft)', border: 'none', borderRadius: 12, width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>📚 Learn</h1>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Loading...' : `${started} started · ${done} completed · ${MODS.length} total`}
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {CATS.map(c => (
            <button className="app-pressable"
              key={c}
              onClick={() => setCat(c)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900,
                background: cat === c ? 'rgba(94,92,230,0.18)' : 'rgba(70,75,96,0.06)',
                color: cat === c ? '#5E5CE6' : 'rgba(70,75,96,0.7)',
                boxShadow: cat === c ? '0 0 0 1px rgba(94,92,230,0.4)' : '0 0 0 1px rgba(120,120,140,0.22)',
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress strip */}
      {!loading && started > 0 && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: 16, background: 'rgba(94,92,230,0.05)', border: '1px solid rgba(94,92,230,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#5E5CE6' }}>{done} of {MODS.length} modules completed</p>
            <div style={{ marginTop: 4, height: 4, borderRadius: 4, background: 'var(--app-surface-soft)' }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#5E5CE6', width: `${Math.round((done / MODS.length) * 100)}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>{Math.round((done / MODS.length) * 100)}%</span>
        </div>
      )}

      {/* Module grid */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 130, borderRadius: 20, background: 'var(--app-surface-soft)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
          ))
        ) : filtered.map(mod => {
          const cards = progress[mod.id] || 0
          const pct = Math.round((cards / mod.items.length) * 100)
          const isDone = cards >= mod.items.length
          const b = badge(mod)

          return (
            <button className="app-pressable"
              key={mod.id}
              onClick={() => router.push(`/child/lesson/${mod.id}`)}
              style={{
                background: `linear-gradient(135deg, ${mod.color}14, var(--app-surface))`,
                border: `1px solid ${mod.color}${isDone ? '50' : '28'}`,
                borderRadius: 20, padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
                transition: 'transform 0.15s', display: 'flex', flexDirection: 'column', gap: 6,
                boxShadow: isDone ? `0 0 20px ${mod.color}20` : 'none',
              }}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 28 }}>{mod.icon}</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'rgb(var(--foreground-rgb))', lineHeight: 1.2 }}>{mod.title}</p>

              {/* Progress bar */}
              <div style={{ height: 3, borderRadius: 3, background: 'var(--app-surface-soft)' }}>
                <div style={{ height: '100%', borderRadius: 3, background: mod.color, width: `${pct}%`, transition: 'width 0.4s' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: b.color, background: b.color + '20', padding: '2px 6px', borderRadius: 8 }}>{b.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{cards}/{mod.items.length}</span>
              </div>
            </button>
          )
        })}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  )
}
