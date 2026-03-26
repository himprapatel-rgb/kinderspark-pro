'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getSyllabuses, getProgress, getRecommendations, getStudentBadges, completeHomework } from '@/lib/api'
import TopBarActions from '@/components/TopBarActions'
import { MODS } from '@/lib/modules'
import { ShoppingBag } from 'lucide-react'

// ── Daily Challenge helper ─────────────────────────────────────────────────────
function getDailyChallenge() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const mod = MODS[dayOfYear % MODS.length]
  const todayKey = `dc_${new Date().toISOString().slice(0, 10)}`
  const done = typeof window !== 'undefined' && localStorage.getItem(todayKey) === 'done'
  return { mod, todayKey, done }
}
function markChallengeComplete(todayKey: string) {
  if (typeof window !== 'undefined') localStorage.setItem(todayKey, 'done')
}

const BADGE_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  first_homework: { emoji: '🏅', label: 'First HW',    color: '#F5A623' },
  first_ai:       { emoji: '🤖', label: 'AI Debut',    color: '#5B7FE8' },
  stars_50:       { emoji: '⭐', label: '50 Stars',    color: '#F5B731' },
  stars_100:      { emoji: '🌟', label: '100 Stars',   color: '#F5B731' },
  stars_500:      { emoji: '💫', label: '500 Stars',   color: '#F5B731' },
  ai_level_3:     { emoji: '🧠', label: 'Lv 3 AI',    color: '#8B6CC1' },
  ai_level_5:     { emoji: '🏆', label: 'Lv 5 AI',    color: '#8B6CC1' },
  perfect_score:  { emoji: '🎯', label: 'Perfect!',   color: '#4CAF6A' },
  streak_3:       { emoji: '🔥', label: '3-Day',       color: '#D4881A' },
  streak_7:       { emoji: '🌈', label: '7-Day',       color: '#8B6CC1' },
}

export default function ChildPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)
  const logout = useStore(s => s.logout)

  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [celebrationBadges, setCelebrationBadges] = useState<any[]>([])
  const [dailyDone, setDailyDone] = useState(false)
  const [showAllMods, setShowAllMods] = useState(false)
  const { mod: dailyMod, todayKey } = getDailyChallenge()

  const student = currentStudent || user

  useEffect(() => {
    if (!student) { router.push('/'); return }
    loadData()
    setDailyDone(getDailyChallenge().done)
  }, [student])

  const loadData = async () => {
    if (!student?.classId || !student?.id) return
    try {
      const [hw, syl, prog, bdgs] = await Promise.all([
        getHomework(student.classId!),
        getSyllabuses(student.classId),
        getProgress(student.id),
        getStudentBadges(student.id).catch(() => []),
      ])
      setHomework(hw)
      setSyllabuses(syl.filter((s: any) => s.published))
      const pm: Record<string, number> = {}
      prog.forEach((p: any) => { pm[p.moduleId] = p.cards })
      setProgressMap(pm)
      setBadges(bdgs)
      getRecommendations(student.id).then(res => {
        if (res?.recommendations) setRecommendations(res.recommendations)
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pendingHW = homework.filter(hw => {
    const done = hw.completions?.some((c: any) => c.studentId === student?.id && c.done)
    return !done
  })

  const totalCards = MODS.reduce((a, m) => a + m.items.length, 0)
  const doneCards = MODS.reduce((a, m) => a + Math.min(m.items.length, progressMap[m.id] || 0), 0)
  const overallPct = totalCards ? Math.round((doneCards / totalCards) * 100) : 0
  const startTodayHomework = pendingHW[0] || null
  const startTodayHref = startTodayHomework
    ? (startTodayHomework.aiGenerated
      ? `/child/tutor?topic=${encodeURIComponent(startTodayHomework.moduleId || 'daily-practice')}`
      : `/child/lesson/${startTodayHomework.moduleId || dailyMod.id}`)
    : `/child/lesson/${dailyMod.id}`
  const startTodayTitle = startTodayHomework
    ? `Start with: ${startTodayHomework.title}`
    : `Start today's challenge: ${dailyMod.title}`

  const handleMarkDone = async (hwId: string) => {
    if (!student || markingDone) return
    setMarkingDone(hwId)
    try {
      const res = await completeHomework(hwId, student.id)
      if (res?.newBadges?.length) setCelebrationBadges(res.newBadges)
      await loadData()
    } catch { /* ignore */ }
    setMarkingDone(null)
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-5"
        style={{ background: 'var(--app-bg)' }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl animate-bounce-subtle"
          style={{
            background: 'linear-gradient(135deg, var(--theme-color, #5B7FE8), var(--theme-secondary, #8B6CC1))',
            boxShadow: '0 8px 32px rgba(94,92,230,0.4)',
          }}
        >
          ⭐
        </div>
        <div className="space-y-2 w-48">
          {[80, 60, 90].map((w, i) => (
            <div key={i} className="h-2 rounded-full shimmer" style={{ width: `${w}%`, background: 'rgba(120,120,140,0.06)' }} />
          ))}
        </div>
        <p className="text-sm font-bold" style={{ color: 'rgba(70, 75, 96, 0.85)' }}>Loading your world…</p>
      </div>
    )
  }

  const themeColor = 'var(--theme-color, #5B7FE8)'
  const themeSecondary = 'var(--theme-secondary, #8B6CC1)'
  const streak = student?.streak ?? 0

  return (
    <div
      className="min-h-screen pb-28 app-container"
      style={{ background: 'var(--app-bg)' }}
    >
      {/* ── HERO HEADER ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, var(--theme-color, #5B7FE8) 0%, var(--theme-secondary, #8B6CC1) 100%)`,
          paddingBottom: 28,
        }}
      >
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
        {/* Decorative circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -right-4 top-24 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative p-5 pt-12">
          {/* Top row: avatar + actions */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
                  filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.3))',
                }}
              >
                {student?.avatar || '🧒'}
              </div>
              <div>
                <p className="text-xs app-muted font-bold uppercase tracking-widest">Welcome back</p>
                <h1 className="text-2xl font-black leading-tight">{student?.name}!</h1>
              </div>
            </div>
            <TopBarActions
              variant="light"
              showSettings
              settingsHref="/child/settings"
              extra={
                <button
                  onClick={() => router.push('/child/shop')}
                  className="flex items-center justify-center rounded-xl h-10 px-3 gap-1.5 text-sm font-bold active:scale-95 transition-all app-pressable app-btn-glass"
                >
                  <ShoppingBag size={15} /> <span className="text-xs">Shop</span>
                </button>
              }
            />
          </div>

          {/* ── XP / Stats Row ── */}
          <div className="flex gap-2.5 mb-5">
            {/* Stars */}
            <div
              className="flex-1 rounded-2xl py-2.5 px-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <span className="text-xl">⭐</span>
              <div>
                <p className="text-yellow-200 font-black text-base leading-none">{(student?.stars ?? 0).toLocaleString()}</p>
                <p className="text-[10px] font-bold app-muted">Stars</p>
              </div>
            </div>

            {/* Streak */}
            <div
              className="flex-1 rounded-2xl py-2.5 px-3 flex items-center gap-2"
              style={{
                background: streak > 0 ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.12)',
                border: streak > 0 ? '1px solid rgba(255,107,53,0.4)' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <span className="text-xl">{streak > 0 ? '🔥' : '💤'}</span>
              <div>
                <p className="font-black text-base leading-none">{streak}d</p>
                <p className="text-[10px] font-bold app-muted">Streak</p>
              </div>
            </div>

            {/* Level */}
            <div
              className="flex-1 rounded-2xl py-2.5 px-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <span className="text-xl">🏆</span>
              <div>
                <p className="font-black text-base leading-none">Lv {student?.aiBestLevel ?? 1}</p>
                <p className="text-[10px] font-bold app-muted">Level</p>
              </div>
            </div>
          </div>

          {/* ── Overall XP bar ── */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-xs font-black uppercase tracking-wide">Overall Progress</span>
              <span className="font-black text-xs">{overallPct}%</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,140,0.15)' }}>
              <div
                className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
                style={{
                  width: `${Math.max(overallPct, 4)}%`,
                  background: 'linear-gradient(90deg, #F5B731, #F5A623)',
                }}
              >
                <div className="absolute inset-0 shimmer" />
              </div>
            </div>
            <p className="text-[10px] app-muted font-bold mt-1">{doneCards} of {totalCards} cards completed</p>
          </div>
        </div>

        {/* ── Badge shelf ── */}
        {badges.length > 0 && (
          <div className="px-5 pb-1">
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {badges.map((b: any) => {
                const info = BADGE_INFO[b.type] || { emoji: '🏅', label: b.type, color: '#F5B731' }
                return (
                  <div
                    key={b.id}
                    className="flex-shrink-0 flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2"
                    style={{
                      background: info.color + '22',
                      border: `1px solid ${info.color}44`,
                    }}
                  >
                    <span className="text-xl">{info.emoji}</span>
                    <span className="text-[9px] font-black whitespace-nowrap" style={{ color: info.color }}>{info.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-5 space-y-4">
        {/* ── Start Today (guided primary action) ── */}
        <button
          onClick={() => router.push(startTodayHref)}
          className="w-full rounded-3xl p-4 text-left app-pressable"
          style={{ background: 'linear-gradient(135deg, rgba(94,92,230,0.25), rgba(191,90,242,0.22))', border: '1.5px solid rgba(94,92,230,0.45)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
              🚀
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[11px] font-black uppercase tracking-wider mb-1">Start Today</p>
              <p className="font-black text-sm truncate">{startTodayTitle}</p>
              <p className="text-xs font-bold app-muted mt-0.5">
                {startTodayHomework ? 'Finish your top pending task first' : 'Quick daily learning challenge'}
              </p>
            </div>
            <span className="text-white/70 text-xl">›</span>
          </div>
        </button>

        {/* ── Homework Alert ── */}
        {pendingHW.length > 0 && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,159,10,0.08), rgba(255,107,53,0.06))', border: '1px solid rgba(255,159,10,0.2)',
              border: '1.5px solid rgba(255,159,10,0.35)',
              boxShadow: '0 8px 32px rgba(255,107,53,0.2)',
            }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(255,159,10,0.2)' }}>📚</div>
                <div className="flex-1">
                  <p className="font-black text-sm">Homework Due!</p>
                  <p className="text-xs font-bold app-muted">{pendingHW.length} assignment{pendingHW.length > 1 ? 's' : ''} waiting</p>
                </div>
                <div
                  className="rounded-full px-2.5 py-1 text-xs font-black"
                  style={{ background: 'rgba(255,159,10,0.25)', color: '#F5A623' }}
                >
                  {pendingHW.length}
                </div>
              </div>
              {pendingHW.slice(0, 2).map(hw => (
                <div key={hw.id} className="mb-2 last:mb-0">
                  <button
                    onClick={() => hw.moduleId && router.push(hw.aiGenerated ? `/child/tutor?topic=${encodeURIComponent(hw.moduleId)}` : `/child/lesson/${hw.moduleId}`)}
                    className="w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all text-left app-pressable"
                    style={{
                      background: hw.aiGenerated ? 'rgba(94,92,230,0.25)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${hw.aiGenerated ? 'rgba(94,92,230,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{hw.aiGenerated ? '✨' : '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{hw.title}</p>
                      <p className="text-xs font-bold app-muted">Due {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'} · ⭐ {hw.starsReward} stars</p>
                    </div>
                    <span className="text-white/40 text-lg flex-shrink-0">›</span>
                  </button>
                  <button
                    onClick={() => handleMarkDone(hw.id)}
                    disabled={markingDone === hw.id}
                    className="mt-1.5 w-full py-2.5 rounded-2xl text-sm font-black active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2 app-pressable"
                    style={{
                      background: 'linear-gradient(135deg, #4CAF6A, #27AE7A)',
                      boxShadow: '0 4px 16px rgba(48,209,88,0.3)',
                    }}
                  >
                    {markingDone === hw.id
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Marking…</>
                      : <>✅ Mark as Done</>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Daily Challenge ── */}
        <button
          onClick={() => {
            markChallengeComplete(todayKey)
            setDailyDone(true)
            router.push(`/child/lesson/${dailyMod.id}`)
          }}
          className="w-full rounded-3xl p-4 text-left active:scale-[0.97] transition-all relative overflow-hidden app-pressable"
          style={{
            background: dailyDone
              ? 'linear-gradient(135deg, #0d2e0d, #0a200a)'
              : `linear-gradient(135deg, ${dailyMod.color}18, ${dailyMod.color}30)`,
            border: `1.5px solid ${dailyDone ? '#4CAF6A40' : dailyMod.color + '55'}`,
            boxShadow: dailyDone ? 'none' : `0 6px 24px ${dailyMod.color}20`,
          }}
        >
          {!dailyDone && <div className="absolute inset-0 shimmer opacity-30" />}
          <div className="relative flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: dailyDone ? 'rgba(48,209,88,0.2)' : dailyMod.color + '30',
                border: `1px solid ${dailyDone ? '#4CAF6A40' : dailyMod.color + '40'}`,
              }}
            >
              {dailyDone ? '✅' : dailyMod.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: dailyDone ? '#4CAF6A20' : '#F5B73122', color: dailyDone ? '#4CAF6A' : '#F5B731' }}>
                  {dailyDone ? '✓ Done' : '⚡ Daily'}
                </span>
              </div>
              <p className="font-black text-sm leading-tight">
                {dailyDone ? 'Challenge Complete!' : `Today: ${dailyMod.title}`}
              </p>
              <p className="text-white/45 text-xs font-bold mt-0.5">
                {dailyDone ? 'Come back tomorrow for a new one' : `Earn bonus ⭐ · ${dailyMod.items.length} cards`}
              </p>
            </div>
            {!dailyDone && (
              <span className="text-white/40 text-lg flex-shrink-0">›</span>
            )}
          </div>
        </button>

        {/* ── AI Tutor CTA (Duolingo-style big button) ── */}
        <button className="app-pressable"
          onClick={() => router.push('/child/tutor')}
          className="w-full rounded-3xl p-5 text-left active:scale-[0.97] transition-all relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0a3a 0%, #2d1b69 100%)',
            border: '1.5px solid rgba(94,92,230,0.4)',
            boxShadow: '0 8px 32px rgba(94,92,230,0.25)',
          }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 shimmer opacity-40" />
          <div className="relative flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(94,92,230,0.5), rgba(191,90,242,0.5))',
                boxShadow: '0 4px 20px rgba(94,92,230,0.4)',
                border: '1px solid rgba(94,92,230,0.4)',
              }}
            >
              🤖
            </div>
            <div className="flex-1">
              <p className="font-black text-lg leading-tight">AI Tutor Sparkle</p>
              <p className="text-sm app-muted font-bold">Practice topics &amp; earn stars!</p>
              {(student?.aiSessions ?? 0) > 0 && (
                <p className="text-purple-400 text-xs font-bold mt-0.5">
                  {student?.aiSessions} sessions · Best Level {student?.aiBestLevel}
                </p>
              )}
            </div>
            <div
              className="rounded-2xl px-4 py-3 font-black text-sm flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)',
                boxShadow: '0 4px 16px rgba(94,92,230,0.5)',
              }}
            >
              Start ▶
            </div>
          </div>
        </button>

        {/* ── AI Recommendations ── */}
        {recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-black text-base">✨ Just For You</h2>
              <span
                className="text-xs font-black rounded-full px-2.5 py-0.5"
                style={{ background: 'rgba(191,90,242,0.2)', color: '#8B6CC1', border: '1px solid rgba(191,90,242,0.3)' }}
              >
                AI Pick
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((rec, i) => {
                const mod = MODS.find(m => m.id === rec.moduleId)
                const done = progressMap[rec.moduleId] || 0
                const pct = Math.min(100, Math.round((done / (mod?.items.length || 1)) * 100))
                const color = mod?.color || '#5B7FE8'
                return (
                  <button className="app-pressable"
                    key={i}
                    onClick={() => router.push(`/child/lesson/${rec.moduleId}`)}
                    className="flex-shrink-0 w-36 rounded-2xl p-3.5 text-left active:scale-[0.97] transition-all"
                    style={{
                      background: color + '18',
                      border: `1.5px solid ${color}35`,
                      boxShadow: `0 4px 16px ${color}15`,
                    }}
                  >
                    <div className="text-3xl mb-2">{mod?.icon || '📚'}</div>
                    <p className="font-black text-xs mb-0.5 leading-tight">{rec.title}</p>
                    <p className="text-white/45 text-[10px] font-bold leading-tight line-clamp-2">{rec.reason}</p>
                    {/* Mini progress */}
                    <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,140,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Activities ── */}
        <div>
          <h2 className="font-black text-base mb-3">🎮 Activities</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Draw',  icon: '🎨', path: '/child/draw',        grad: 'linear-gradient(135deg,#E0525222,#F5A62322)', border: '#F5A62340' },
              { label: 'Trace', icon: '✍️', path: '/child/trace',       grad: 'linear-gradient(135deg,#4CAF6A22,#5FBF7F22)', border: '#4CAF6A40' },
              { label: 'Match', icon: '🔤', path: '/child/match',       grad: 'linear-gradient(135deg,#F5A62322,#D4881A22)', border: '#F5A62340' },
              { label: 'Tutor', icon: '🤖', path: '/child/tutor',       grad: 'linear-gradient(135deg,#5B7FE822,#8B6CC122)', border: '#8B6CC140' },
              { label: 'Rank',  icon: '🏆', path: '/child/leaderboard', grad: 'linear-gradient(135deg,#F5B73122,#F5A62322)', border: '#F5B73140' },
              { label: 'Shop',  icon: '🛍️', path: '/child/shop',        grad: 'linear-gradient(135deg,#8B6CC122,#5B7FE822)', border: '#8B6CC140' },
            ].map(a => (
              <button className="app-pressable"
                key={a.label}
                onClick={() => router.push(a.path)}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-[0.94] transition-all"
                style={{ background: a.grad, border: `1.5px solid ${a.border}` }}
              >
                <span className="text-3xl">{a.icon}</span>
                <span className="font-black text-xs">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── My Lessons (syllabus) ── */}
        {syllabuses.length > 0 && (
          <div>
            <h2 className="font-black text-base mb-3">📖 My Lessons</h2>
            <div className="grid grid-cols-2 gap-3">
              {syllabuses.map(syl => {
                const done = progressMap[`syl_${syl.id}`] || 0
                const total = syl.items?.length || 1
                const pct = Math.min(100, Math.round((done / total) * 100))
                return (
                  <button className="app-pressable"
                    key={syl.id}
                    onClick={() => router.push(`/child/lesson/syl_${syl.id}`)}
                    className="rounded-2xl p-4 text-left active:scale-[0.97] transition-all relative overflow-hidden"
                    style={{
                      background: syl.color + '18',
                      border: `1.5px solid ${syl.color}35`,
                    }}
                  >
                    <div className="text-3xl mb-2">{syl.icon}</div>
                    <p className="font-black text-xs leading-tight">{syl.title}</p>
                    <p className="text-white/45 text-[10px] font-bold mt-0.5">{total} cards</p>
                    <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,140,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                        style={{ width: `${pct}%`, background: syl.color }}
                      >
                        {pct > 20 && <div className="absolute inset-0 shimmer" />}
                      </div>
                    </div>
                    {pct === 100 && (
                      <div className="absolute top-2 right-2 text-sm">✅</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── All Lessons grid ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-base">📚 All Lessons</h2>
            <button
              onClick={() => setShowAllMods(v => !v)}
              className="text-xs font-bold app-pressable px-3 py-1 rounded-full"
              style={{ background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}
            >
              {showAllMods ? 'Show Less' : `Show All (${MODS.length})`}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(showAllMods ? MODS : MODS.slice(0, 6)).map(mod => {
              const done = progressMap[mod.id] || 0
              const pct = Math.min(100, Math.round((done / mod.items.length) * 100))
              const complete = pct === 100
              return (
                <button className="app-pressable"
                  key={mod.id}
                  onClick={() => router.push(`/child/lesson/${mod.id}`)}
                  className="rounded-2xl p-4 text-left active:scale-[0.97] transition-all relative"
                  style={{
                    background: complete ? mod.color + '28' : mod.color + '14',
                    border: `1.5px solid ${complete ? mod.color + '60' : mod.color + '30'}`,
                  }}
                >
                  {complete && (
                    <div
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                      style={{ background: '#4CAF6A', boxShadow: '0 2px 8px rgba(48,209,88,0.4)' }}
                    >
                      ✓
                    </div>
                  )}
                  <div className="text-3xl mb-2">{mod.icon}</div>
                  <p className="font-black text-xs leading-tight">{mod.title}</p>
                  <p className="text-[10px] app-muted font-bold mt-0.5">{done}/{mod.items.length}</p>
                  <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,140,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: complete ? '#4CAF6A' : mod.color }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Badge Celebration Modal ── */}
      {celebrationBadges.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'var(--app-overlay)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl p-7 text-center animate-slide-up"
            style={{
              background: 'linear-gradient(180deg, #1e0a40 0%, #140730 100%)',
              border: '1px solid var(--app-border)',
              borderBottom: 'none',
              boxShadow: '0 -24px 80px rgba(94,92,230,0.3)',
            }}
          >
            {/* Confetti-style header */}
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <h2 className="font-black text-2xl mb-1">
              {celebrationBadges.length > 1 ? 'New Badges!' : 'New Badge!'}
            </h2>
            <p className="text-sm font-bold app-muted mb-6">You earned something special!</p>

            <div className="flex flex-wrap justify-center gap-5 mb-7">
              {celebrationBadges.map((b: any, i: number) => {
                const info = BADGE_INFO[b.type] || { emoji: '🏅', label: b.type, color: '#F5B731' }
                return (
                  <div key={b.type} className="flex flex-col items-center gap-2 animate-pop" style={{ animationDelay: `${i * 150}ms` }}>
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                      style={{
                        background: info.color + '22',
                        border: `2px solid ${info.color}55`,
                        boxShadow: `0 8px 32px ${info.color}40`,
                      }}
                    >
                      {info.emoji}
                    </div>
                    <p className="font-black text-sm" style={{ color: info.color }}>{info.label}</p>
                  </div>
                )
              })}
            </div>

            <button className="app-pressable"
              onClick={() => setCelebrationBadges([])}
              className="w-full py-4 rounded-2xl text-black font-black text-base"
              style={{
                background: 'linear-gradient(135deg, #F5B731, #F5A623)',
                boxShadow: '0 6px 24px rgba(255,159,10,0.5)',
              }}
            >
              Awesome! ⭐
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
