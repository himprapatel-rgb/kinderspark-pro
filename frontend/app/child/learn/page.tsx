'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { getProgress } from '@/lib/api'
import { MODS } from '@/lib/modules'
import {
  orderedPathMods,
  getRecommendedNextModule,
  getReviewModuleIds,
} from '@/lib/learnPath'
import { ChevronRight } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { useTranslation } from '@/hooks/useTranslation'

const CATS = [
  { key: 'All', label: '⭐ All' },
  { key: 'numbers', label: '🔢 Numbers' },
  { key: 'letters', label: '🔤 Letters' },
  { key: 'words', label: '💬 Words' },
  { key: 'colors', label: '🎨 Colors' },
  { key: 'items', label: '🌍 World' },
] as const

export default function LearnPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const user = useAppStore((s) => s.currentStudent || s.user)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [cat, setCat] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  const path = useMemo(() => orderedPathMods(), [])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    getProgress(user.id)
      .then((data: any[]) => {
        const map: Record<string, number> = {}
        data.forEach((p: any) => { map[p.moduleId] = p.cards })
        setProgress(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const done = useMemo(
    () => MODS.filter((m) => (progress[m.id] || 0) >= m.items.length).length,
    [progress]
  )
  const allDone = !loading && done === MODS.length

  const nextMod = useMemo(
    () => (!loading ? getRecommendedNextModule(path, progress) : null),
    [loading, path, progress]
  )
  const reviewIds = useMemo(
    () => (!loading ? getReviewModuleIds(path, progress) : []),
    [loading, path, progress]
  )
  const filtered = useMemo(
    () => (cat === 'All' ? MODS : MODS.filter((m) => m.type === cat)),
    [cat]
  )

  // In-progress = next recommended module has been started but not finished
  const inProgressMod = !loading && nextMod && (progress[nextMod.id] || 0) > 0 ? nextMod : null
  // Fresh start = next recommended module hasn't been touched yet
  const startNextMod = !loading && nextMod && (progress[nextMod.id] || 0) === 0 ? nextMod : null

  // 2 upcoming modules after the current one
  const upcomingMods = useMemo(() => {
    if (!nextMod) return []
    const idx = path.findIndex((m) => m.id === nextMod.id)
    return path.slice(idx + 1, idx + 3).filter((m) => (progress[m.id] || 0) < m.items.length)
  }, [path, nextMod, progress])

  const childName = (user as any)?.preferredName || (user as any)?.displayName || user?.name || 'Explorer'
  const avatar = (user as any)?.avatar || '🌟'
  const stars = (user as any)?.stars || 0

  const subtitle = allDone
    ? '🏆 You completed every adventure!'
    : done > 0
    ? `${done} adventure${done === 1 ? '' : 's'} complete! ⭐`
    : 'Pick your first adventure!'

  function badge(mod: (typeof MODS)[0]) {
    const cards = progress[mod.id] || 0
    if (cards >= mod.items.length) return { label: '✅ Done!', color: '#4CAF6A' }
    if (cards > 0) return { label: '▶ Continue', color: mod.color }
    return { label: '🚀 Start', color: mod.color }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', paddingBottom: 100, fontFamily: 'var(--font-nunito), Nunito, sans-serif' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #F5A623, #E8832A)', padding: '14px 16px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            className="app-pressable"
            onClick={() => router.back()}
            aria-label="Go back"
            style={{ minHeight: 44, minWidth: 44, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >←</button>

          <span style={{ fontSize: 30, lineHeight: 1 }}>{avatar}</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.18)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? 'Learn & Explore' : allDone ? 'All Done! 🏆' : `Keep going, ${childName.split(' ')[0]}! 🌟`}
            </h1>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
              {loading ? '...' : subtitle}
            </p>
          </div>

          {stars > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>⭐</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>{stars}</span>
            </div>
          )}
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              className="app-pressable"
              onClick={() => setCat(c.key)}
              aria-pressed={cat === c.key}
              style={{
                flexShrink: 0,
                minHeight: 36,
                padding: '6px 12px',
                borderRadius: 20,
                border: cat === c.key ? '1.5px solid rgba(255,255,255,0.65)' : '1.5px solid rgba(255,255,255,0.28)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 900,
                background: cat === c.key ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.12)',
                color: 'white',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── All Adventures Done Celebration ──────────────────── */}
      {allDone && (
        <div style={{ margin: '16px 16px 0', borderRadius: 20, background: 'linear-gradient(135deg, #F5B731, #F5A623)', padding: '24px 16px', textAlign: 'center', boxShadow: '0 4px 28px rgba(245,167,35,0.4)' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#2B1F10' }}>All Adventures Complete!</p>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'rgba(43,31,16,0.7)' }}>You've mastered every lesson. Amazing work!</p>
          <button
            type="button"
            className="app-pressable"
            onClick={() => router.push(`/child/lesson/${MODS[0].id}`)}
            style={{ background: 'rgba(43,31,16,0.15)', border: '1.5px solid rgba(43,31,16,0.25)', borderRadius: 14, padding: '10px 22px', fontSize: 14, fontWeight: 900, color: '#2B1F10', cursor: 'pointer' }}
          >
            Revisit a favourite ↗
          </button>
        </div>
      )}

      {/* ── Continue Card (in-progress module) ───────────────── */}
      {!loading && inProgressMod && !allDone && (
        <div style={{ margin: '16px 16px 0' }}>
          <button
            type="button"
            className="app-pressable"
            onClick={() => router.push(`/child/lesson/${inProgressMod.id}`)}
            style={{ width: '100%', borderRadius: 20, background: 'linear-gradient(135deg, #F5B731, #E8832A)', border: 'none', padding: '16px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 6px 28px rgba(245,167,35,0.38)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))', flexShrink: 0 }}>{inProgressMod.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 900, color: 'rgba(43,31,16,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Continue Adventure</p>
                <p style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 900, color: '#2B1F10', lineHeight: 1.1 }}>{inProgressMod.title}</p>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(((progress[inProgressMod.id] || 0) / inProgressMod.items.length) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${inProgressMod.title} progress`}
                  style={{ height: 6, borderRadius: 6, background: 'rgba(43,31,16,0.15)' }}
                >
                  <div style={{ height: '100%', borderRadius: 6, background: 'rgba(43,31,16,0.55)', width: `${Math.round(((progress[inProgressMod.id] || 0) / inProgressMod.items.length) * 100)}%`, transition: 'width 0.4s' }} />
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 700, color: 'rgba(43,31,16,0.6)' }}>
                  {progress[inProgressMod.id] || 0} of {inProgressMod.items.length} done
                </p>
              </div>
              <div style={{ background: 'rgba(43,31,16,0.15)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#2B1F10' }}>Go!</span>
                <ChevronRight size={16} color="#2B1F10" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── Start First Adventure Card ────────────────────────── */}
      {!loading && startNextMod && !allDone && (
        <div style={{ margin: '16px 16px 0' }}>
          <button
            type="button"
            className="app-pressable"
            onClick={() => router.push(`/child/lesson/${startNextMod.id}`)}
            style={{ width: '100%', borderRadius: 20, background: 'linear-gradient(135deg, #5B7FE8, #4DAADF)', border: 'none', padding: '16px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 6px 24px rgba(77,170,223,0.32)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 38, lineHeight: 1, flexShrink: 0 }}>{startNextMod.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start here</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{startNextMod.title}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>Start!</span>
                <ChevronRight size={16} color="white" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── Next Up ──────────────────────────────────────────── */}
      {!loading && !allDone && upcomingMods.length > 0 && (
        <div style={{ margin: '16px 0 0' }}>
          <p style={{ margin: '0 16px 10px', fontSize: 12, fontWeight: 900, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Next Up
          </p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 16px 8px', scrollbarWidth: 'none' }}>
            {upcomingMods.map((m) => (
              <button
                key={m.id}
                type="button"
                className="app-pressable"
                onClick={() => router.push(`/child/lesson/${m.id}`)}
                aria-label={m.title}
                style={{ flexShrink: 0, minHeight: 84, width: 116, borderRadius: 18, border: `1.5px solid ${m.color}40`, background: `${m.color}0D`, padding: '12px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 30 }}>{m.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 900, textAlign: 'center', color: 'rgb(var(--foreground-rgb))', lineHeight: 1.2 }}>{m.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Journey Path Strip ───────────────────────────────── */}
      {!loading && path.length > 0 && (
        <div style={{ margin: '16px 0 0', padding: '12px 0 14px', background: 'linear-gradient(180deg, rgba(94,92,230,0.05), transparent)', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="aiTutor" size="xs" roleTone="child" decorative />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'rgb(var(--foreground-rgb))' }}>⚡ Your Journey</p>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 16px 4px', scrollbarWidth: 'none' }}>
            {path.map((m, idx) => {
              const cards = progress[m.id] || 0
              const isComplete = cards >= m.items.length
              const isNext = nextMod?.id === m.id
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {idx > 0 && (
                    <div style={{ width: 10, height: 3, borderRadius: 2, background: isComplete ? 'rgba(76,175,106,0.55)' : 'rgba(120,120,140,0.2)', marginRight: 6 }} />
                  )}
                  <button
                    type="button"
                    className="app-pressable"
                    onClick={() => router.push(`/child/lesson/${m.id}`)}
                    aria-label={`${m.title}${isComplete ? ', complete' : isNext ? ', your current adventure' : ''}`}
                    style={{
                      width: isNext ? 68 : 58,
                      minHeight: 44,
                      borderRadius: 16,
                      border: isNext ? '2.5px solid #F5B731' : `1.5px solid ${m.color}44`,
                      background: isComplete ? 'rgba(76,175,106,0.13)' : isNext ? 'rgba(245,183,49,0.18)' : 'var(--app-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '6px 4px',
                      boxShadow: isNext ? '0 4px 16px rgba(245,183,49,0.32)' : 'var(--app-shadow-sm)',
                    }}
                  >
                    <span style={{ fontSize: isNext ? 24 : 20, lineHeight: 1 }}>{isComplete ? '✓' : m.icon}</span>
                    {isNext && (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#C79012', textAlign: 'center', lineHeight: 1 }}>YOU ★</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Overall progress bar ─────────────────────────────── */}
      {!loading && done > 0 && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: 16, background: 'rgba(94,92,230,0.05)', border: '1px solid rgba(94,92,230,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AppIcon name="progress" size="sm" roleTone="child" decorative />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#5B7FE8' }}>
              {done} of {MODS.length} adventures complete
            </p>
            <div
              role="progressbar"
              aria-valuenow={Math.round((done / MODS.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall learning progress"
              style={{ height: 6, borderRadius: 6, background: 'var(--app-surface-soft)' }}
            >
              <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #5B7FE8, #4DAADF)', width: `${Math.round((done / MODS.length) * 100)}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#5B7FE8', flexShrink: 0 }}>
            {Math.round((done / MODS.length) * 100)}%
          </span>
        </div>
      )}

      {/* ── Review row ───────────────────────────────────────── */}
      {!loading && reviewIds.length > 0 && (
        <div style={{ margin: '14px 16px 0' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 900, color: 'rgb(var(--foreground-rgb))' }}>
            Time to review! 🔁
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--app-text-muted)' }}>
            Revisit these to remember them better
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {reviewIds.map((id) => {
              const mod = MODS.find((x) => x.id === id)
              if (!mod) return null
              return (
                <button
                  key={id}
                  type="button"
                  className="app-pressable"
                  onClick={() => router.push(`/child/lesson/${id}`)}
                  style={{ flexShrink: 0, minHeight: 44, padding: '10px 14px', borderRadius: 14, border: `1px solid ${mod.color}44`, background: `${mod.color}12`, fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <span>{mod.icon}</span>
                  <span style={{ color: 'rgb(var(--foreground-rgb))' }}>{mod.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All Adventures grid ──────────────────────────────── */}
      <p style={{ margin: '18px 16px 10px', fontSize: 12, fontWeight: 900, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        🗺️ All Adventures
      </p>

      <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 20, background: 'var(--app-surface-soft)', animation: 'pulse 1.5s infinite' }} />
            ))
          : filtered.map((mod) => {
              const cards = progress[mod.id] || 0
              const pct = Math.round((cards / mod.items.length) * 100)
              const isDone = cards >= mod.items.length
              const b = badge(mod)

              return (
                <button
                  key={mod.id}
                  type="button"
                  className="app-pressable"
                  onClick={() => router.push(`/child/lesson/${mod.id}`)}
                  aria-label={`${mod.title}${isDone ? ', complete' : cards > 0 ? `, ${pct}% done` : ', not started'}`}
                  style={{
                    background: isDone ? `${mod.color}18` : `linear-gradient(135deg, ${mod.color}12, var(--app-surface))`,
                    border: `1.5px solid ${mod.color}${isDone ? '55' : '28'}`,
                    borderRadius: 20,
                    padding: '14px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: isDone ? `0 0 18px ${mod.color}22` : undefined,
                  }}
                >
                  <span style={{ fontSize: 32, lineHeight: 1 }}>{mod.icon}</span>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'rgb(var(--foreground-rgb))', lineHeight: 1.2 }}>
                    {mod.title}
                  </p>
                  {cards > 0 && (
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${mod.title} progress`}
                      style={{ height: 4, borderRadius: 4, background: 'var(--app-surface-soft)' }}
                    >
                      <div style={{ height: '100%', borderRadius: 4, background: mod.color, width: `${pct}%`, transition: 'width 0.4s' }} />
                    </div>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 900, color: b.color, background: b.color + '20', padding: '3px 8px', borderRadius: 8, alignSelf: 'flex-start' }}>
                    {b.label}
                  </span>
                </button>
              )
            })}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  )
}
