'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getSyllabuses, getProgress, getRecommendations, getStudentBadges, completeHomework, getDailyMission, completeDailyMission } from '@/lib/api'
import { MODS } from '@/lib/modules'
import { selectAdaptiveMission } from '@/lib/missionEngine'
import { ArrowRight, Feather, Hash, Palette, PencilLine, PlayCircle, Share2, Shapes, ShoppingBag, UserRound } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import PageTransition from '@/components/PageTransition'
import MissionCelebration from '@/components/MissionCelebration'
import EmotionalBuddyCard from '@/components/EmotionalBuddyCard'
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh'
import { playTap, playCorrect, playComplete, playBadge, playSwipe, playLevelUp, playNotification, startBackgroundMusic, stopBackgroundMusic } from '@/lib/sounds'
import { API_BASE } from '@/lib/api'
import { hapticTap, hapticSuccess, hapticImpact, nativeShare } from '@/lib/capacitor'
import { useTranslation } from '@/hooks/useTranslation'
import { getTodayMood, gentleMode } from '@/lib/emotion'
import KidAvatar from '@/components/KidAvatar'
import { StoryIcon } from '@/components/icons'

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
  const setDailyMission = useStore(s => s.setDailyMission)
  const trackKpiEvent = useStore(s => s.trackKpiEvent)
  const { t } = useTranslation()

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
  const [remoteMission, setRemoteMission] = useState<any>(null)
  const [missionDoneLocal, setMissionDoneLocal] = useState(false)
  const [celebrateMission, setCelebrateMission] = useState(false)
  const { mod: dailyMod, todayKey } = getDailyChallenge()

  const student = currentStudent || user
  const todayMood = getTodayMood(student?.id)
  const isGentleMood = gentleMode(todayMood)

  const missionDayKey = useMemo(() => {
    if (!student?.id) return ''
    return `ks_daily_mission_done_${student.id}_${new Date().toISOString().slice(0, 10)}`
  }, [student?.id])

  useEffect(() => {
    if (missionDayKey && typeof window !== 'undefined') {
      setMissionDoneLocal(localStorage.getItem(missionDayKey) === '1')
    }
  }, [missionDayKey])
  const { pullRef, refreshing, pullProgress, pullDistance } = usePullToRefresh(() => loadData())

  // Start background music on mount (may be blocked on iOS until a gesture), stop on unmount
  useEffect(() => {
    startBackgroundMusic()
    return () => { stopBackgroundMusic() }
  }, [])

  // iOS: ensure audio context unlocks on first user interaction
  const [audioPrimed, setAudioPrimed] = useState(false)
  const primeAudio = () => {
    if (audioPrimed) return
    startBackgroundMusic()
    setAudioPrimed(true)
  }

  useEffect(() => {
    if (!student) { router.push('/'); return }
    loadData()
    setDailyDone(getDailyChallenge().done)
  }, [student])

  const loadData = async () => {
    if (!student?.id) { setLoading(false); return }
    try {
      // Load progress and badges (these work without classId)
      const [prog, bdgs] = await Promise.all([
        getProgress(student.id).catch(() => []),
        getStudentBadges(student.id).catch(() => []),
      ])
      const pm: Record<string, number> = {}
      ;(prog || []).forEach((p: any) => { pm[p.moduleId] = p.cards })
      setProgressMap(pm)
      setBadges(bdgs || [])

      // Class-dependent features (homework, syllabuses, missions)
      if (student.classId) {
        const [hw, syl] = await Promise.all([
          getHomework(student.classId).catch(() => []),
          getSyllabuses(student.classId).catch(() => []),
        ])
        setHomework(hw || [])
        setSyllabuses((syl || []).filter((s: any) => s.published))
        getRecommendations(student.id).then(res => {
          if (res?.recommendations) setRecommendations(res.recommendations)
        }).catch(() => {})
        getDailyMission({ studentId: student.id, classId: student.classId }).then((mission) => {
          setRemoteMission(mission)
          setDailyMission(mission)
        }).catch(() => {})
      }
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
  const adaptiveMission = selectAdaptiveMission({ pendingHomework: pendingHW, recommendations, progressMap })
  const defaultStartHref = remoteMission?.route || (startTodayHomework
    ? (startTodayHomework.aiGenerated
      ? `/child/tutor?topic=${encodeURIComponent(startTodayHomework.moduleId || 'daily-practice')}`
      : `/child/lesson/${startTodayHomework.moduleId || dailyMod.id}`)
    : adaptiveMission
      ? adaptiveMission.route
      : `/child/lesson/${dailyMod.id}`)
  const startTodayHref = isGentleMood && !startTodayHomework
    ? '/child/story'
    : defaultStartHref
  const startTodayTitle = startTodayHomework
    ? `Start with: ${startTodayHomework.title}`
    : remoteMission?.title
      ? remoteMission.title
      : adaptiveMission
        ? adaptiveMission.title
        : isGentleMood
          ? t('child_gentle_title')
          : `Start today's challenge: ${dailyMod.title}`
  const nextTaskMeta = isGentleMood && !startTodayHomework
    ? t('child_gentle_meta')
    : remoteMission
    ? `${remoteMission.kind} · ${remoteMission.etaMin} min`
    : startTodayHomework
    ? `Homework · ${startTodayHomework.dueDate ? new Date(startTodayHomework.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Due soon'}`
    : adaptiveMission
    ? adaptiveMission.meta
    : `Daily Challenge · ${dailyMod.items.length} cards`

  const missionCardTitle =
    remoteMission?.title ||
    (adaptiveMission?.title?.replace(/^Start with: /, '') ?? '') ||
    dailyMod.title

  const onDailyMissionCelebrate = async () => {
    if (!student?.classId || missionDoneLocal || !missionDayKey) return
    hapticSuccess()
    playComplete()
    setCelebrateMission(true)
    localStorage.setItem(missionDayKey, '1')
    setMissionDoneLocal(true)
    trackKpiEvent({ category: 'learning', name: 'child_daily_mission_complete' })
    await completeDailyMission({ studentId: student.id, classId: student.classId }).catch(() => {})
    fetch(`${API_BASE}/diag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/child/page.tsx',
        message: 'daily_mission_complete',
        data: { studentId: student.id },
        timestamp: Date.now(),
        hypothesisId: 'DAILY_MISSION',
      }),
    }).catch(() => {})
  }

  const handleMarkDone = async (hwId: string) => {
    if (!student || markingDone) return
    hapticImpact()
    playTap()
    // #region agent log
    fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/child/page.tsx:markDone:start',message:'Mark Done tap',data:{studentId:student.id,hwId},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    setMarkingDone(hwId)
    try {
      trackKpiEvent({ category: 'learning', name: 'child_homework_mark_done' })
      const res = await completeHomework(hwId, student.id)
      // #region agent log
      fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/child/page.tsx:markDone:success',message:'Homework marked done',data:{hwId,newBadges:(res?.newBadges||[]).length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      hapticSuccess()
      playComplete()
      if (res?.newBadges?.length) {
        playBadge()
        setCelebrationBadges(res.newBadges)
      }
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
        <p className="text-sm font-bold" style={{ color: 'rgba(70, 75, 96, 0.85)' }}>{t('loading_world')}</p>
      </div>
    )
  }

  const themeColor = 'var(--theme-color, #5B7FE8)'
  const themeSecondary = 'var(--theme-secondary, #8B6CC1)'
  const streak = student?.streak ?? 0
  const ACTIVITY_ITEMS: { label: string; icon?: React.ElementType | null; iconName?: import('@/components/icons').IconName; path: string; bg: string; border: string; iconColor: string }[] = [
    { label: 'Draw', icon: Palette, path: '/child/draw', bg: 'rgba(245,166,35,0.18)', border: 'rgba(245,166,35,0.35)', iconColor: '#D4881A' },
    { label: 'Trace', icon: PencilLine, path: '/child/trace', bg: 'rgba(76,175,106,0.18)', border: 'rgba(76,175,106,0.35)', iconColor: '#2F9E52' },
    { label: 'Match', icon: Shapes, path: '/child/match', bg: 'rgba(91,127,232,0.16)', border: 'rgba(91,127,232,0.35)', iconColor: '#4A6ED0' },
    { label: 'Count', icon: Hash, path: '/child/count', bg: 'rgba(76,175,106,0.16)', border: 'rgba(76,175,106,0.35)', iconColor: '#2F9E52' },
    { label: 'Story', iconName: 'class', path: '/child/story', bg: 'rgba(139,108,193,0.16)', border: 'rgba(139,108,193,0.35)', iconColor: '#7C5AB6' },
    { label: 'Poem', icon: Feather, path: '/child/poem', bg: 'rgba(245,183,49,0.16)', border: 'rgba(245,183,49,0.35)', iconColor: '#C79012' },
    { label: 'Tutor', iconName: 'aiTutor', path: '/child/tutor', bg: 'rgba(139,108,193,0.16)', border: 'rgba(139,108,193,0.35)', iconColor: '#7C5AB6' },
    { label: 'Chat', iconName: 'messages', path: '/child/messages', bg: 'rgba(76,170,223,0.18)', border: 'rgba(76,170,223,0.35)', iconColor: '#2E8FC2' },
    { label: 'Rank', iconName: 'rewards', path: '/child/leaderboard', bg: 'rgba(245,183,49,0.18)', border: 'rgba(245,183,49,0.35)', iconColor: '#C79012' },
    { label: 'Shop', icon: ShoppingBag, path: '/child/shop', bg: 'rgba(77,170,223,0.16)', border: 'rgba(77,170,223,0.35)', iconColor: '#2E8FC2' },
  ]

  return (
    <div
      ref={pullRef}
      className="min-h-screen pb-28 app-container"
      style={{ background: 'var(--app-bg)', overflowY: 'auto' }}
      onTouchStart={primeAudio}
      onMouseDown={primeAudio}
    >
      <PullIndicator progress={pullProgress} refreshing={refreshing} pullDistance={pullDistance} />
      <PageTransition>
      {/* ── HERO HEADER ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, var(--theme-color, #5B7FE8) 0%, var(--theme-secondary, #8B6CC1) 100%)`, paddingBottom: 28 }}
      >
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
        {/* Floating depth blobs */}
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-white/10 animate-float pointer-events-none" />
        <div className="absolute -right-2 top-32 w-24 h-24 rounded-full bg-white/5 animate-float2 pointer-events-none" />
        <div className="absolute left-16 -top-6 w-14 h-14 rounded-full bg-white/6 pointer-events-none" />
        {/* Sparkle particles */}
        <div className="absolute top-10 right-28 text-yellow-200/60 text-xs animate-bounce-subtle select-none pointer-events-none">✦</div>
        <div className="absolute top-24 right-16 text-white/30 text-[10px] animate-float select-none pointer-events-none">✧</div>
        <div className="absolute top-6 left-[45%] text-white/25 text-xs animate-float2 select-none pointer-events-none">✦</div>
        <div className="absolute bottom-16 left-8 text-yellow-200/30 text-[10px] animate-bounce-subtle delay-200 select-none pointer-events-none">⭐</div>

        <div className="relative p-5 pt-12">

          {/* ── Row 1: Big avatar + greeting + actions ── */}
          <div className="flex items-start gap-4 mb-5">
            {/* Avatar with SVG level ring */}
            <button
              type="button"
              onClick={() => router.push('/child/profile')}
              aria-label="View profile"
              className="relative flex-shrink-0 app-pressable"
              style={{ width: 84, height: 84 }}
            >
              {/* Level progress ring */}
              <svg width="84" height="84" viewBox="0 0 84 84" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
                <circle cx="42" cy="42" r="36" fill="none" stroke="var(--app-gold)" strokeWidth="5"
                  strokeDasharray={`${Math.min((student?.aiBestLevel ?? 1) / 10, 1) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(245,183,49,0.8))', transition: 'stroke-dasharray 1s ease' }} />
              </svg>
              <div
                className="absolute inset-[6px] rounded-3xl flex items-center justify-center sticker-bubble animate-float2"
                style={{ background: 'rgba(255,255,255,0.22)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 28px rgba(255,215,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)' }}
              >
                <KidAvatar studentId={student?.id} ownedItems={(student as any)?.ownedItems} fallback={student?.avatar || '🧒'} size={62} />
              </div>
              {/* Level badge */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 font-black"
                style={{ background: 'var(--app-gold)', color: '#2B1F10', fontSize: 10, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 1 }}>
                Lv {student?.aiBestLevel ?? 1}
              </div>
            </button>

            {/* Name + greeting + streak badge */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Welcome back</p>
              <h1 className="font-black text-white leading-tight truncate" style={{ fontSize: 24 }}>{student?.name}! 👋</h1>
              <p className="font-bold mt-0.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>Ready for your next adventure?</p>
              {streak > 0 ? (
                <div className="inline-flex items-center gap-1.5 mt-2 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(255,107,53,0.32)', border: '1px solid rgba(255,107,53,0.48)' }}>
                  <AppIcon name="streak" size={11} roleTone="child" decorative />
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#FFBB99' }}>{streak} day streak 🔥</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 mt-2 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)' }}>Start a streak today! 💪</span>
                </div>
              )}
            </div>

            {/* Top-right action buttons */}
            <div className="flex flex-col gap-1.5 flex-shrink-0 pt-1">
              <button onClick={() => router.push('/child/shop')}
                className="flex items-center justify-center rounded-xl h-9 px-2.5 gap-1.5 app-pressable app-btn-glass"
                style={{ fontSize: 11, fontWeight: 900 }}>
                <ShoppingBag size={13} /> Shop
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    hapticTap()
                    fetch(`${API_BASE}/diag`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/child/page.tsx:share:tap',message:'Share Progress tap',data:{studentId:student?.id,totalStars:Object.values(progressMap).reduce((a,b)=>a+b,0),badgeCount:badges.length},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{})
                    const totalStars = Object.values(progressMap).reduce((a, b) => a + b, 0)
                    nativeShare({ title: `${student?.name}'s KinderSpark Progress`, text: `🌟 ${student?.name} earned ${totalStars} stars and ${badges.length} badges on KinderSpark Pro!`, url: 'https://kinderspark.com' })
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl app-pressable app-btn-glass" title="Share Progress">
                  <Share2 size={14} />
                </button>
                <button type="button" onClick={() => router.push('/child/settings')}
                  className="w-9 h-9 flex items-center justify-center rounded-xl app-pressable app-btn-glass" title="Settings" aria-label="Settings">
                  <AppIcon name="settings" size="sm" roleTone="child" decorative />
                </button>
              </div>
            </div>
          </div>

          {/* ── Row 2: Collectible reward stat tiles ── */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {/* ⭐ Stars — golden achievement */}
            <div className="rounded-2xl p-3 flex flex-col items-center gap-1.5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(245,183,49,0.38), rgba(245,162,35,0.22))', border: '1px solid rgba(245,183,49,0.52)' }}>
              <div className="absolute -right-2 -top-2 opacity-20 select-none pointer-events-none" style={{ fontSize: 28, transform: 'rotate(15deg)' }}>⭐</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,183,49,0.28)' }}>
                <AppIcon name="rewards" size={20} roleTone="child" decorative />
              </div>
              <p className="font-black text-white leading-none" style={{ fontSize: 20 }}>{(student?.stars ?? 0).toLocaleString()}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,230,150,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stars</p>
            </div>

            {/* 🔥 Streak — fire energy */}
            <div className="rounded-2xl p-3 flex flex-col items-center gap-1.5 relative overflow-hidden"
              style={{ background: streak > 0 ? 'linear-gradient(135deg, rgba(255,107,53,0.38), rgba(224,82,82,0.22))' : 'rgba(255,255,255,0.12)', border: streak > 0 ? '1px solid rgba(255,107,53,0.52)' : '1px solid rgba(255,255,255,0.18)' }}>
              <div className="absolute -right-2 -top-2 opacity-20 select-none pointer-events-none" style={{ fontSize: 28, transform: 'rotate(15deg)' }}>{streak > 0 ? '🔥' : '💧'}</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: streak > 0 ? 'rgba(255,107,53,0.28)' : 'rgba(120,120,140,0.18)' }}>
                <AppIcon name="streak" size={20} roleTone="child" decorative />
              </div>
              <p className="font-black text-white leading-none" style={{ fontSize: 20 }}>{streak}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: streak > 0 ? 'rgba(255,200,160,0.85)' : 'rgba(200,210,230,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day{streak !== 1 ? 's' : ''}</p>
            </div>

            {/* 🏅 Level — badge achievement */}
            <div className="rounded-2xl p-3 flex flex-col items-center gap-1.5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(139,108,193,0.38), rgba(94,92,230,0.22))', border: '1px solid rgba(139,108,193,0.52)' }}>
              <div className="absolute -right-2 -top-2 opacity-20 select-none pointer-events-none" style={{ fontSize: 28, transform: 'rotate(15deg)' }}>🏅</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,108,193,0.28)' }}>
                <AppIcon name="badge" size={20} roleTone="child" decorative />
              </div>
              <p className="font-black text-white leading-none" style={{ fontSize: 20 }}>Lv {student?.aiBestLevel ?? 1}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(200,180,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</p>
            </div>
          </div>

          {/* ── Row 3: Adventure Progress card with milestones ── */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-black" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.88)' }}>🗺️ Adventure Progress</span>
              <span className="font-black text-white" style={{ fontSize: 13 }}>{overallPct}%</span>
            </div>
            {/* Progress bar with milestone dots */}
            <div className="relative h-3.5 rounded-full" style={{ background: 'rgba(120,120,140,0.22)' }}>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-full rounded-full overflow-hidden relative transition-all duration-1000"
                  style={{ width: `${Math.max(overallPct, 3)}%`, background: 'linear-gradient(90deg, #F5B731, #F5A623)' }}>
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
              {[25, 50, 75].map(m => (
                <div key={m} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
                  style={{ left: `calc(${m}% - 6px)`, background: overallPct >= m ? 'var(--app-gold)' : 'rgba(255,255,255,0.25)', borderColor: overallPct >= m ? 'rgba(245,183,49,0.6)' : 'rgba(255,255,255,0.2)', boxShadow: overallPct >= m ? '0 0 8px rgba(245,183,49,0.7)' : 'none', zIndex: 1 }} />
              ))}
            </div>
            <div className="flex justify-between items-center mt-2">
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>{doneCards} cards done</p>
              <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(245,215,100,0.88)' }}>
                {overallPct < 25 ? '⭐ Next reward at 25%' : overallPct < 50 ? '⭐ Next reward at 50%' : overallPct < 75 ? '⭐ Next reward at 75%' : '🏆 Almost complete!'}
              </p>
            </div>
          </div>

          {/* ── Row 4: Continue Learning — main mission card ── */}
          <button
            onClick={() => { trackKpiEvent({ category: 'engagement', name: 'child_continue_learning_click' }); router.push(startTodayHref) }}
            className="w-full mb-3 rounded-2xl p-4 flex items-center gap-3.5 text-left app-pressable animate-sparkle-on-hover relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--app-gold) 0%, var(--app-warning) 100%)', boxShadow: '0 8px 24px rgba(245,183,49,0.45)', color: '#2B1F10' }}
          >
            <div className="absolute inset-0 shimmer opacity-25 pointer-events-none" />
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.32)', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', flexShrink: 0 }}>
              {dailyMod.icon || '🚀'}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.65 }}>▶ Continue Learning</p>
              <p className="font-black leading-tight truncate" style={{ fontSize: 16 }}>{missionCardTitle}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.65 }}>⏱ {remoteMission?.etaMin ?? 5} min</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>•</span>
                <span style={{ fontSize: 10, fontWeight: 900, opacity: 0.8 }}>⭐ Earn stars</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>•</span>
                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.65 }}>{doneCards} done</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.32)' }}>
              <PlayCircle size={20} className="animate-bob" />
            </div>
          </button>

          {/* ── Row 5: Next Quest mini card ── */}
          <button
            onClick={() => { trackKpiEvent({ category: 'engagement', name: 'child_next_task_click' }); router.push(startTodayHref) }}
            className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left app-pressable"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.16)' }}>
              {startTodayHomework ? '📚' : remoteMission ? '⚡' : '🎯'}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)' }}>
                {startTodayHomework ? '📚 Homework' : remoteMission ? '⚡ Mission' : '🎯 Next Quest'}
              </p>
              <p className="font-black text-white truncate leading-tight" style={{ fontSize: 14 }}>{startTodayTitle.replace('Start with: ', '')}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>{nextTaskMeta}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(245,215,100,0.9)' }}>+⭐</span>
              <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.65)' }} />
            </div>
          </button>

        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 pt-5 space-y-6">
        <MissionCelebration active={celebrateMission} onDone={() => setCelebrateMission(false)} />

        {/* Daily 5-Minute Mission — per-student adaptive pick */}
        <section aria-labelledby="daily-mission-heading">
          <div
            className="rounded-3xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(94,92,230,0.2), rgba(191,90,242,0.14))',
              border: '1.5px solid rgba(94,92,230,0.35)',
              boxShadow: 'var(--app-shadow-md)',
            }}
          >
            <div className="absolute inset-0 shimmer opacity-25 pointer-events-none" aria-hidden />
            <div className="relative flex gap-3 items-start">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                aria-hidden
              >
                ⏱️
              </div>
              <div className="flex-1 min-w-0">
                <p id="daily-mission-heading" className="font-black text-base leading-tight">
                  {t('child_daily_mission_title')}
                </p>
                <p className="text-[11px] font-bold app-muted mt-1">{t('child_daily_mission_sub')}</p>
                <p className="text-sm font-black mt-2 truncate">{missionCardTitle}</p>
                <p className="text-[10px] font-black app-muted mt-0.5">
                  ~{remoteMission?.etaMin ?? 5} min · {nextTaskMeta}
                </p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  trackKpiEvent({ category: 'engagement', name: 'child_daily_mission_start' })
                  router.push(startTodayHref)
                }}
                className="w-full min-h-11 rounded-xl py-3 font-black text-sm app-pressable active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--role-admin))', color: '#fff' }}
              >
                {t('child_daily_mission_start')}
              </button>
              <button
                type="button"
                disabled={missionDoneLocal}
                onClick={onDailyMissionCelebrate}
                className="w-full min-h-11 rounded-xl py-3 font-black text-sm app-pressable active:scale-[0.98] transition-transform disabled:opacity-55"
                style={{
                  background: missionDoneLocal ? 'rgba(76,175,106,0.2)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${missionDoneLocal ? 'rgba(76,175,106,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  color: missionDoneLocal ? '#4CAF6A' : 'inherit',
                }}
              >
                {missionDoneLocal ? t('child_daily_mission_done') : t('child_daily_mission_celebrate')}
              </button>
            </div>
          </div>
        </section>

        <EmotionalBuddyCard />

        {/* Imported "learning path" pattern: clear 3-step journey */}
        <div className="rounded-2xl p-3.5" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-sm inline-flex items-center gap-2"><AppIcon name="aiTutor" size={14} roleTone="child" decorative /> SparkPath Today</h2>
            <span className="text-[10px] font-black app-muted">10-10-5 loop</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(91,127,232,0.1)' }}>
              <p className="text-[10px] font-black app-muted uppercase">Now</p>
              <p className="text-xs font-black truncate">{startTodayTitle.replace('Start with: ', '')}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(245,166,35,0.14)' }}>
              <p className="text-[10px] font-black app-muted uppercase">Next</p>
              <p className="text-xs font-black">{adaptiveMission?.title || 'Quick activity'}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(76,175,106,0.12)' }}>
              <p className="text-[10px] font-black app-muted uppercase">Reward</p>
              <p className="text-xs font-black">Earn stars + badge</p>
            </div>
          </div>
        </div>

        {/* ── Today zone ── */}
        <div className="space-y-4">
          <h2 className="font-black text-base mb-3 inline-flex items-center gap-2"><AppIcon name="aiTutor" size="sm" roleTone="child" decorative /> Today&apos;s Next Task</h2>

        {/* ── Homework Alert ── */}
        {pendingHW.length > 0 && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,159,10,0.08), rgba(255,107,53,0.06))',
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
              <div className="space-y-3">
              {pendingHW.slice(0, 2).map(hw => (
                <div key={hw.id} className="rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.45)' }}>
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
                    <span className="app-muted text-lg flex-shrink-0">›</span>
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
          </div>
        )}

        {/* ── Daily challenge ── */}
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
              <p className="app-muted text-xs font-bold mt-0.5">
                {dailyDone ? 'Come back tomorrow for a new one' : `Earn bonus ⭐ · ${dailyMod.items.length} cards`}
              </p>
            </div>
            {!dailyDone && (
              <span className="app-muted text-lg flex-shrink-0">›</span>
            )}
          </div>
        </button>

        {/* ── AI tutor ── */}
        <button
          onClick={() => router.push('/child/tutor')}
          className="w-full rounded-3xl p-5 text-left active:scale-[0.97] transition-all relative overflow-hidden app-pressable"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 22%, white 78%), color-mix(in srgb, var(--role-admin) 20%, white 80%))',
            border: '1.5px solid color-mix(in srgb, var(--app-accent) 44%, white 56%)',
            boxShadow: 'var(--app-shadow-md)',
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
              <p className="font-black text-lg leading-tight inline-flex items-center gap-2"><AppIcon name="aiTutor" size={18} roleTone="child" decorative /> AI Tutor Sparkle</p>
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

        </div>

        {/* ── Explore zone ── */}
        <div className="space-y-6">
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
                  <button
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
          <h2 className="font-black text-base mb-3 inline-flex items-center gap-2"><PlayCircle size={16} /> Quick Activities</h2>
          <div className="grid grid-cols-3 tablet:grid-cols-6 gap-3">
            {ACTIVITY_ITEMS.map(a => (
              <button
                    key={a.label}
                onClick={() => router.push(a.path)}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-[0.94] transition-all"
                style={{ background: a.bg, border: `1.5px solid ${a.border}` }}
              >
                <span className="w-12 h-12 flex items-center justify-center sticker-bubble animate-wiggle-slow" style={{ background: 'rgba(255,255,255,0.74)', transform: a.label.length % 2 ? 'rotate(-5deg)' : 'rotate(4deg)' }}>
                  {a.iconName ? <AppIcon name={a.iconName} size={22} roleTone="child" decorative /> : a.icon ? <a.icon size={22} style={{ color: a.iconColor }} /> : null}
                </span>
                <span className="font-black text-xs">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── My Lessons (syllabus) ── */}
        {syllabuses.length > 0 && (
          <div>
            <h2 className="font-black text-base mb-3 inline-flex items-center gap-2"><AppIcon name="class" size="sm" roleTone="child" decorative /> My Lessons</h2>
            <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3 gap-3">
              {syllabuses.map(syl => {
                const done = progressMap[`syl_${syl.id}`] || 0
                const total = syl.items?.length || 1
                const pct = Math.min(100, Math.round((done / total) * 100))
                return (
                  <button
                    key={syl.id}
                    onClick={() => router.push(`/child/lesson/syl_${syl.id}`)}
                    className="rounded-2xl p-4 text-left active:scale-[0.97] transition-all relative overflow-hidden"
                    style={{
                      background: syl.color + '18',
                      border: `1.5px solid ${syl.color}35`,
                    }}
                  >
                    <div className="text-3xl mb-2">{syl.icon}</div>
                    <p className="font-black text-sm leading-tight">{syl.title}</p>
                    <p className="text-[10px] app-muted font-bold mt-0.5">Syllabus pack · {total} cards</p>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/child/lesson/syl_${syl.id}`) }}
                      className="mt-3 w-full rounded-lg py-2 text-[11px] font-black app-pressable"
                      style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)', color: 'rgb(var(--foreground-rgb))' }}
                    >
                      {pct === 100 ? 'Review Again' : 'Continue'}
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── All Lessons grid ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-base inline-flex items-center gap-2"><AppIcon name="class" size="sm" roleTone="child" decorative /> Lessons Library</h2>
            <button
              onClick={() => setShowAllMods(v => !v)}
              className="text-xs font-bold app-pressable px-3 py-1 rounded-full"
              style={{ background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}
            >
              {showAllMods ? 'Show Less' : `Show All (${MODS.length})`}
            </button>
          </div>
          <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3 gap-3">
            {(showAllMods ? MODS : MODS.slice(0, 6)).map(mod => {
              const done = progressMap[mod.id] || 0
              const pct = Math.min(100, Math.round((done / mod.items.length) * 100))
              const complete = pct === 100
              return (
                <button
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
                  <p className="font-black text-sm leading-tight">{mod.title}</p>
                  <p className="text-[10px] app-muted font-bold mt-0.5">Core lesson · {done}/{mod.items.length}</p>
                  <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(120,120,140,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: complete ? '#4CAF6A' : mod.color }}
                    />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/child/lesson/${mod.id}`) }}
                    className="mt-3 w-full rounded-lg py-2 text-[11px] font-black app-pressable"
                    style={{
                      background: complete ? 'var(--app-success-soft)' : 'var(--app-surface-soft)',
                      border: `1px solid ${complete ? 'rgba(76,175,106,0.35)' : 'var(--app-border)'}`,
                      color: complete ? 'var(--app-success)' : 'rgb(var(--foreground-rgb))',
                    }}
                  >
                    {complete ? 'Replay' : 'Start'}
                  </button>
                </button>
              )
            })}
          </div>
        </div>
        </div>

        {/* ── Rewards zone ── */}
        {badges.length > 0 && (
          <div>
            <h2 className="font-black text-base mb-3 inline-flex items-center gap-2"><StoryIcon name="rewards" size={18} state="idle" /> Achievements</h2>
            <div className="rounded-2xl p-3.5" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-bold app-muted mb-2">You have earned {badges.length} badge{badges.length > 1 ? 's' : ''}. Keep going!</p>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {badges.map((b: any) => {
                  const info = BADGE_INFO[b.type] || { emoji: '🏅', label: b.type, color: '#F5B731' }
                  return (
                    <div key={b.id} className="flex-shrink-0 rounded-xl px-2.5 py-2 text-center" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                      <div className="text-lg leading-none">{info.emoji}</div>
                      <div className="text-[10px] font-black mt-1" style={{ color: info.color }}>{info.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
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

            <button
              onClick={() => setCelebrationBadges([])}
              className="w-full py-4 rounded-2xl text-black font-black text-base app-pressable"
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
      </PageTransition>
    </div>
  )
}


