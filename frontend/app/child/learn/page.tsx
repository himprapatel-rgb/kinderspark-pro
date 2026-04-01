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
  estimateLessonMinutes,
} from '@/lib/learnPath'
import { Goal, ChevronRight } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { useTranslation } from '@/hooks/useTranslation'

const CATS = ['All', 'numbers', 'letters', 'words', 'colors', 'items'] as const

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
        data.forEach((p: any) => {
          map[p.moduleId] = p.cards
        })
        setProgress(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const filtered = cat === 'All' ? MODS : MODS.filter((m) => m.type === cat)
  const started = MODS.filter((m) => (progress[m.id] || 0) > 0).length
  const done = MODS.filter((m) => (progress[m.id] || 0) >= m.items.length).length
  const nextMod = !loading ? getRecommendedNextModule(path, progress) : null
  const reviewIds = !loading ? getReviewModuleIds(path, progress) : []

  function badge(mod: (typeof MODS)[0]) {
    const cards = progress[mod.id] || 0
    if (cards >= mod.items.length) return { label: '✅ ' + t('learn_path_completed'), color: '#4CAF6A' }
    if (cards > 0) return { label: '▶ Continue', color: mod.color }
    return { label: '🚀 Start', color: mod.color }
  }

  return (
    <div className="app-page" style={{ minHeight: '100vh', fontFamily: 'Nunito, sans-serif', paddingBottom: 100 }}>
      {/* Header */}
      <div
        className="doodle-surface"
        style={{
          background: 'linear-gradient(135deg, var(--app-accent), var(--role-admin))',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          padding: '16px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            className="app-pressable sticker-bubble"
            onClick={() => router.back()}
            style={{
              border: 'none',
              width: 36,
              height: 36,
              color: 'rgb(var(--foreground-rgb))',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'white',
              }}
            >
              <AppIcon name="class" size="sm" roleTone="child" decorative /> Learn
            </h1>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>
              {loading ? t('loading') : `${started} started · ${done} completed · ${MODS.length} total`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {CATS.map((c) => (
            <button
              className="app-pressable"
              key={c}
              onClick={() => setCat(c)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 900,
                background: cat === c ? 'rgba(94,92,230,0.18)' : 'rgba(70,75,96,0.06)',
                color: cat === c ? '#5B7FE8' : 'rgba(70,75,96,0.7)',
                boxShadow: cat === c ? '0 0 0 1px rgba(94,92,230,0.4)' : '0 0 0 1px rgba(120,120,140,0.22)',
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Duolingo-style path strip */}
      {!loading && path.length > 0 && (
        <div
          style={{
            margin: '12px 0 0',
            padding: '12px 0 14px',
            background: 'linear-gradient(180deg, rgba(94,92,230,0.06), transparent)',
            borderBottom: '1px solid var(--app-border)',
          }}
        >
          <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="aiTutor" size="xs" roleTone="child" decorative />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'rgb(var(--foreground-rgb))' }}>
                {t('learn_path_title')}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--app-text-muted)' }}>
                {t('learn_path_sub')}
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              padding: '4px 16px 8px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}
          >
            {path.map((m, idx) => {
              const cards = progress[m.id] || 0
              const isComplete = cards >= m.items.length
              const isNext = nextMod?.id === m.id
              const est = estimateLessonMinutes(m.items.length)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {idx > 0 && (
                    <div
                      style={{
                        width: 10,
                        height: 3,
                        borderRadius: 2,
                        background: isComplete ? 'rgba(76,175,106,0.5)' : 'rgba(120,120,140,0.2)',
                        marginRight: 6,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="app-pressable"
                    onClick={() => router.push(`/child/lesson/${m.id}`)}
                    style={{
                      width: 58,
                      minHeight: 76,
                      borderRadius: 16,
                      border: isNext ? '2px solid #F5B731' : `1.5px solid ${m.color}44`,
                      background: isComplete
                        ? 'rgba(76,175,106,0.12)'
                        : isNext
                          ? 'rgba(245,183,49,0.14)'
                          : 'var(--app-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      padding: '6px 4px',
                      boxShadow: isNext ? '0 4px 14px rgba(245,183,49,0.25)' : 'var(--app-shadow-sm)',
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{isComplete ? '✓' : m.icon}</span>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 900,
                        color: isNext ? '#C79012' : 'var(--app-text-muted)',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        maxWidth: 54,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isNext ? t('learn_path_you_here') : isComplete ? t('learn_path_completed') : `${est}m`}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
          {nextMod && (
            <div style={{ padding: '0 16px' }}>
              <button
                type="button"
                className="app-pressable"
                onClick={() => router.push(`/child/lesson/${nextMod.id}`)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  borderRadius: 14,
                  border: 'none',
                  fontWeight: 900,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, var(--app-gold), var(--app-warning))',
                  color: '#2B1F10',
                }}
              >
                {t('learn_path_next_up')}: {nextMod.icon} {nextMod.title}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && started > 0 && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            borderRadius: 16,
            background: 'rgba(94,92,230,0.05)',
            border: '1px solid rgba(94,92,230,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            className="sticker-bubble"
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-6deg)',
            }}
          >
            <Goal size={18} color="var(--app-accent)" />
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#5B7FE8' }}>
              {done} of {MODS.length} modules completed
            </p>
            <div style={{ marginTop: 4, height: 4, borderRadius: 4, background: 'var(--app-surface-soft)' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: '#5B7FE8',
                  width: `${Math.round((done / MODS.length) * 100)}%`,
                  transition: 'width 0.5s',
                }}
              />
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>
            {Math.round((done / MODS.length) * 100)}%
          </span>
        </div>
      )}

      {/* Review row */}
      {!loading && reviewIds.length > 0 && (
        <div style={{ margin: '14px 16px 0' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: 'rgb(var(--foreground-rgb))' }}>
            {t('learn_review_title')}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--app-text-muted)' }}>
            {t('learn_review_sub')}
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {reviewIds.map((id) => {
              const mod = MODS.find((x) => x.id === id)
              if (!mod) return null
              return (
                <button
                  key={id}
                  type="button"
                  className="app-pressable"
                  onClick={() => router.push(`/child/lesson/${id}`)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: `1px solid ${mod.color}44`,
                    background: `${mod.color}12`,
                    fontWeight: 900,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{mod.icon}</span>
                  <span>{mod.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p
        style={{
          margin: '16px 16px 8px',
          fontSize: 11,
          fontWeight: 900,
          color: 'var(--app-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {t('learn_explore_more')}
      </p>

      <div style={{ padding: '4px 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 130,
                borderRadius: 20,
                background: 'var(--app-surface-soft)',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))
        ) : (
          filtered.map((mod) => {
            const cards = progress[mod.id] || 0
            const pct = Math.round((cards / mod.items.length) * 100)
            const isDone = cards >= mod.items.length
            const b = badge(mod)
            const est = estimateLessonMinutes(mod.items.length)

            return (
              <button
                className="app-pressable"
                key={mod.id}
                onClick={() => router.push(`/child/lesson/${mod.id}`)}
                style={{
                  background: `linear-gradient(135deg, ${mod.color}14, var(--app-surface))`,
                  border: `1px solid ${mod.color}${isDone ? '50' : '28'}`,
                  borderRadius: 20,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  boxShadow: isDone ? `0 0 20px ${mod.color}20` : 'none',
                }}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span
                  className="sticker-bubble"
                  style={{
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: cards > 0 ? 'rotate(-4deg)' : 'rotate(4deg)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{mod.icon}</span>
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'rgb(var(--foreground-rgb))',
                    lineHeight: 1.2,
                  }}
                >
                  {mod.title}
                </p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--app-text-muted)' }}>
                  ~{est} min
                </p>
                <div style={{ height: 3, borderRadius: 3, background: 'var(--app-surface-soft)' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 3,
                      background: mod.color,
                      width: `${pct}%`,
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      color: b.color,
                      background: b.color + '20',
                      padding: '2px 6px',
                      borderRadius: 8,
                    }}
                  >
                    {b.label}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--app-text-muted)' }}>
                    {cards}/{mod.items.length}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  )
}
