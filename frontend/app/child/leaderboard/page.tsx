'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { getStudents } from '@/lib/api'
import { Bot, Flame, Star, Trophy } from 'lucide-react'

type SortBy = 'stars' | 'streak' | 'aiSessions'

const SORT_OPTIONS: { key: SortBy; label: string; icon: string }[] = [
  { key: 'stars',      label: 'Stars',    icon: '⭐' },
  { key: 'streak',     label: 'Streak',   icon: '🔥' },
  { key: 'aiSessions', label: 'Sessions', icon: '🤖' },
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_COLORS = [
  { bg: 'linear-gradient(135deg, #F5B731, #F5A623)', shadow: 'rgba(255,214,10,0.5)', height: 90 },
  { bg: 'linear-gradient(135deg, #8E8E93, #636366)', shadow: 'rgba(142,142,147,0.4)', height: 70 },
  { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', shadow: 'rgba(205,127,50,0.4)', height: 55 },
]

export default function LeaderboardPage() {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const student = currentStudent || user

  const [students, setStudents] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('stars')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student?.classId) { router.push('/'); return }
    getStudents(student.classId)
      .then(s => setStudents(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [student])

  const sorted = [...students].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  const myRank = sorted.findIndex(s => s.id === student?.id) + 1
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  // Podium order: 2nd, 1st, 3rd for visual pyramid
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumIndices = [1, 0, 2] // visual position → rank index

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, var(--theme-bg-tint, #EDF2FF), var(--app-bg))' }}
      >
        <div className="text-5xl animate-bounce-subtle">🏆</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-28 app-container"
      style={{ background: 'linear-gradient(180deg, var(--theme-bg-tint, #EDF2FF), var(--app-bg))' }}
    >
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, var(--theme-color, #5B7FE8), var(--theme-secondary, #8B6CC1))',
        }}
      >
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }} />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white/60 hover:bg-white/15 transition-all text-lg font-bold app-pressable sticker-bubble"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-black">Class Ranking</h1>
            <p className="text-xs font-bold app-muted">{students.length} students competing</p>
          </div>
          {myRank > 0 && (
            <div
              className="ml-auto rounded-2xl px-3 py-2 text-center"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <p className="font-black text-lg leading-none">#{myRank}</p>
              <p className="text-white/60 text-[10px] font-bold">Your rank</p>
            </div>
          )}
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2">
          {SORT_OPTIONS.map(opt => (
            <button className="app-pressable"
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className="flex-1 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
              style={{
                background: sortBy === opt.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                border: `1.5px solid ${sortBy === opt.key ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                color: sortBy === opt.key ? 'white' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span className="sticker-bubble w-6 h-6 flex items-center justify-center text-xs" style={{ transform: 'rotate(-6deg)' }}>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Podium */}
        {top3.length >= 2 && (
          <div>
            <p className="text-xs app-muted font-black uppercase tracking-widest mb-4 text-center">Top 3</p>
            <div className="flex items-end justify-center gap-3 mb-2">
              {podiumOrder.map((s, vi) => {
                if (!s) return <div key={vi} className="w-24" />
                const rankIdx = podiumIndices[vi]
                const cfg = PODIUM_COLORS[rankIdx]
                const val = s[sortBy] ?? 0
                const isMe = s.id === student?.id
                return (
                  <div key={s.id} className="flex flex-col items-center gap-2" style={{ width: 88 }}>
                    {/* Avatar */}
                    <div className="relative">
                      {isMe && (
                        <div
                          className="absolute -inset-1.5 rounded-3xl opacity-70"
                          style={{ background: cfg.bg, filter: 'blur(8px)' }}
                        />
                      )}
                      <div
                        className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                        style={{
                          background: isMe ? cfg.bg : 'rgba(255,255,255,0.1)',
                          border: isMe ? `2px solid rgba(255,255,255,0.4)` : `2px solid rgba(255,255,255,0.1)`,
                        }}
                      >
                        {s.avatar}
                      </div>
                      <div className="absolute -top-2 -right-2 text-xl">{RANK_MEDALS[rankIdx]}</div>
                    </div>
                    {/* Name */}
                    <p className="text-xs font-black truncate w-full text-center" style={{ color: isMe ? 'white' : 'rgba(255,255,255,0.85)' }}>
                      {isMe ? 'You' : s.name}
                    </p>
                    {/* Value */}
                    <p className="text-[10px] font-bold app-muted">
                      {sortBy === 'stars' ? `⭐ ${val}` : sortBy === 'streak' ? `🔥 ${val}d` : `🤖 ${val}`}
                    </p>
                    {/* Podium block */}
                    <div
                      className="w-full rounded-t-2xl flex items-center justify-center font-black text-white text-lg"
                      style={{
                        height: cfg.height,
                        background: cfg.bg,
                        boxShadow: `0 4px 20px ${cfg.shadow}`,
                      }}
                    >
                      {rankIdx + 1}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ranked list (4th onwards) */}
        {rest.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs app-muted font-black uppercase tracking-widest mb-3">Rankings</p>
            {rest.map((s, i) => {
              const rank = i + 4
              const val = s[sortBy] ?? 0
              const isMe = s.id === student?.id
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, rgba(94,92,230,0.1), rgba(191,90,242,0.08))'
                      : 'var(--app-surface)',
                    border: isMe
                      ? '1.5px solid rgba(94,92,230,0.35)'
                      : '1px solid var(--app-border)',
                  }}
                >
                  <span className="app-muted font-black text-sm w-6 text-center">#{rank}</span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'var(--app-surface-soft)' }}
                  >
                    {s.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate ${isMe ? '' : ''}`}>
                      {isMe ? `${s.name} (You)` : s.name}
                    </p>
                    <p className="text-[10px] app-muted font-bold inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Star size={11} /> {s.stars}</span>
                      <span className="inline-flex items-center gap-1"><Flame size={11} /> {s.streak}d</span>
                      <span className="inline-flex items-center gap-1"><Bot size={11} /> {s.aiSessions}</span>
                    </p>
                  </div>
                  <span className="font-black text-sm" style={{ color: isMe ? 'var(--theme-color, #5B7FE8)' : 'var(--app-text-muted)' }}>
                    {sortBy === 'stars' ? `⭐ ${val}` : sortBy === 'streak' ? `🔥 ${val}d` : `🤖 ${val}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {students.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3 inline-flex items-center justify-center sticker-bubble w-16 h-16"><Trophy size={30} color="var(--app-accent)" /></div>
            <p className="app-muted font-bold">No students yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
