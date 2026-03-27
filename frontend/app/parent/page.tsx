'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { Loading, InlineEmpty } from '@/components/UIStates'
import TopBarActions from '@/components/TopBarActions'
import WeatherChip from '@/components/WeatherChip'
import ParentSidebar from '@/components/ParentSidebar'
import ProgressCharts from '@/components/ProgressCharts'
import ActivityFeed from '@/components/ActivityFeed'
import {
  getHomework, getMessages, sendMessage, getAISessions, getAttendanceSummary, markAllMessagesRead,
  completeHomework, createMessageStream, getMyProfile, getProgress, getStudentBadges,
  getMessageThreads, getThreadMessages, createMessageThread, sendThreadMessage,
} from '@/lib/api'
import { MODS } from '@/lib/modules'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { BarChart3, Bell, Home, Users, MessageSquare, Download } from 'lucide-react'
import { useToast } from '@/components/Toast'
import PageTransition from '@/components/PageTransition'
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh'

const QUICK_PARENT_REPLIES = [
  'Thanks! We will complete this tonight.',
  'Could you share a simpler version for home practice?',
  'My child found this hard. Any 5-minute tip for us?',
] as const

// SVG ring component for circular progress
function Ring({ pct, color, size = 80, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,120,140,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

function mapThreadMessageToLegacy(msg: any) {
  const raw = String(msg?.body || '')
  const lines = raw.split('\n')
  const subjectLine = lines[0]?.startsWith('Subject: ') ? lines[0].replace('Subject: ', '').trim() : ''
  const cleanBody = subjectLine ? lines.slice(2).join('\n').trim() : raw
  return {
    id: msg.id,
    from: msg.senderUser?.displayName || 'Teacher',
    fromId: msg.senderUserId,
    to: 'parent',
    subject: subjectLine || (msg.kind === 'class_update' ? 'Class Update' : 'Message'),
    body: cleanBody,
    createdAt: msg.sentAt,
    read: !!msg.receipts?.[0]?.seenAt,
  }
}

export default function ParentPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const role = useStore(s => s.role)
  const logout = useStore(s => s.logout)
  const dailyMission = useStore(s => s.dailyMission)
  const trackKpiEvent = useStore(s => s.trackKpiEvent)
  const toast = useToast()

  const [tab, setTab] = useState(0)
  const [student, setStudent] = useState<any>(null)
  const [children, setChildren] = useState<Array<{ id: string; name: string; avatar?: string; classId?: string }>>([])
  const [homework, setHomework] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [threadMode, setThreadMode] = useState<{ enabled: boolean; threadId?: string }>({ enabled: false })
  const [aiSessions, setAiSessions] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReply, setShowReply] = useState<any>(null)
  const [replyBody, setReplyBody] = useState('')
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const [progressData, setProgressData] = useState<any[]>([])
  const [badgesData, setBadgesData] = useState<any[]>([])
  const { permission: notifPermission, subscribe: subscribeNotif } = usePushNotifications(student?.id ?? user?.id)

  // SSE / fallback polling refs
  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    if (role !== 'parent') { router.push('/'); return }
    ;(async () => {
      try {
        const profile = await getMyProfile().catch(() => null)
        const linkedChildren = (profile?.parentProfile?.children || [])
          .map((link: any) => {
            const sp = link.studentProfile
            const activeEnrollment = (sp?.enrollments || [])[0]
            return {
              id: sp?.legacyStudentId || sp?.userId || '',
              name: sp?.user?.displayName || 'Child',
              avatar: sp?.user?.avatar || '🧒',
              classId: activeEnrollment?.classGroup?.legacyClassId || user.classId,
              classGroupId: activeEnrollment?.classGroup?.id || null,
            }
          })
          .filter((c: any) => c.id)
        if (linkedChildren.length > 0) {
          setChildren(linkedChildren)
          setStudent(linkedChildren[0])
          loadData(linkedChildren[0])
        } else {
          setStudent(user)
          loadData(user)
        }
      } catch {
        setStudent(user)
        loadData(user)
      }
    })()
  }, [user, router])

  useEffect(() => {
    if (tab === 2 && student && unreadMsgs > 0) {
      markAllMessagesRead(student.classId, student.id).then(() => setUnreadMsgs(0)).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    if (!student || loading || tab !== 0) return
    const key = `ks_parent_digest_viewed_${student.id}_${new Date().toISOString().slice(0, 10)}`
    if (typeof window !== 'undefined' && localStorage.getItem(key)) return
    trackKpiEvent({ category: 'engagement', name: 'parent_weekly_digest_viewed' })
    if (typeof window !== 'undefined') localStorage.setItem(key, '1')
  }, [student, loading, tab, trackKpiEvent])

  // Real-time messages via SSE (falls back to 10s polling if not supported)
  useEffect(() => {
    if (!student?.classId) return

    // Close any prior connection
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    const classId: string = student.classId
    const studentId: string = student.id

    const es = createMessageStream(classId)
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    if (es) {
      sseRef.current = es

      es.onmessage = (event: MessageEvent) => {
        try {
          const data: Record<string, unknown> = JSON.parse(event.data as string)
          if (data.type === 'heartbeat') return
          // Upsert into messages state
          setMessages(prev => {
            const exists = prev.some(m => m.id === data.id)
            const updated = exists
              ? prev.map(m => (m.id === data.id ? data : m))
              : [data, ...prev]
            return updated.sort(
              (a, b) =>
                new Date(b.createdAt as string).getTime() -
                new Date(a.createdAt as string).getTime()
            )
          })
          // Bump unread badge for messages not sent by this student and not yet on messages tab
          if (tab !== 2 && data.fromId !== studentId && !data.read) {
            setUnreadMsgs(prev => prev + 1)
          }
        } catch {
          // ignore malformed frames
        }
      }

      es.onerror = () => {
        es.close()
        sseRef.current = null
        // Reload messages after 5s
        reconnectTimer = setTimeout(() => {
          getMessages({ classId })
            .then(msgs => {
              setMessages(msgs)
              const unread = msgs.filter((m: Record<string, unknown>) => !m.read && m.fromId !== studentId).length
              setUnreadMsgs(unread)
            })
            .catch(() => {})
        }, 5_000)
      }
    } else {
      // Fall back to 10s polling
      pollRef.current = setInterval(() => {
        getMessages({ classId })
          .then(msgs => {
            setMessages(msgs)
            if (tab !== 2) {
              const unread = msgs.filter((m: Record<string, unknown>) => !m.read && m.fromId !== studentId).length
              setUnreadMsgs(unread)
            }
          })
          .catch(() => {})
      }, 10_000)
    }

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [student])

  const loadData = async (u: any) => {
    try {
      const [hw, sessions, prog] = await Promise.all([
        u.classId ? getHomework(u.classId) : Promise.resolve([]),
        getAISessions(u.id).catch(() => []),
        getProgress(u.id).catch(() => []),
      ])
      let msgs: any[] = []
      if (u.classGroupId) {
        try {
          const threads = await getMessageThreads({ scopeType: 'classGroup', classGroupId: u.classGroupId })
          const thread = Array.isArray(threads) ? threads[0] : null
          if (thread?.id) {
            const rows = await getThreadMessages(thread.id)
            setThreadMode({ enabled: true, threadId: thread.id })
            msgs = rows.map(mapThreadMessageToLegacy)
          } else {
            setThreadMode({ enabled: false, threadId: undefined })
            if (u.classId) msgs = await getMessages({ classId: u.classId }).catch(() => [])
          }
        } catch {
          setThreadMode({ enabled: false, threadId: undefined })
          if (u.classId) msgs = await getMessages({ classId: u.classId }).catch(() => [])
        }
      } else if (u.classId) {
        setThreadMode({ enabled: false, threadId: undefined })
        msgs = await getMessages({ classId: u.classId }).catch(() => [])
      }
      setHomework(hw || [])
      setMessages(msgs)
      setAiSessions(sessions || [])
      setProgressData(prog || [])
      const unread = msgs.filter((m: any) => !m.read && m.fromId !== u.id).length
      setUnreadMsgs(unread)
      if (u.classId) {
        getAttendanceSummary(u.classId, 30).then(summary => {
          const mine = summary?.find((s: any) => s.studentId === u.id)
          setAttendance(mine || null)
        }).catch(() => {})
      }
      getStudentBadges(u.id).then(b => setBadgesData(b || [])).catch(() => {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pendingHW = homework.filter(hw => {
    if (!student) return false
    return !hw.completions?.some((c: any) => c.studentId === student.id && c.done)
  })
  const completedHW = homework.filter(hw => {
    if (!student) return false
    return hw.completions?.some((c: any) => c.studentId === student.id && c.done)
  })
  const hwPct = homework.length ? Math.round((completedHW.length / homework.length) * 100) : 0
  const attPct = attendance?.rate ?? 0
  const totalAccuracy = aiSessions.length
    ? Math.round(aiSessions.reduce((a: number, s: any) => a + (s.accuracy || 0), 0) / aiSessions.length)
    : 0
  const totalAIStars = aiSessions.reduce((a: number, s: any) => a + (s.stars || 0), 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weeklyCompleted = homework.filter((hw: any) =>
    hw.completions?.some((c: any) =>
      c.studentId === student?.id && c.done && c.completedAt && new Date(c.completedAt) >= sevenDaysAgo
    )
  ).length
  const weeklyAISessions = aiSessions.filter((s: any) => s.createdAt && new Date(s.createdAt) >= sevenDaysAgo).length
  const weeklyAvgAccuracy = weeklyAISessions
    ? Math.round(
        aiSessions
          .filter((s: any) => s.createdAt && new Date(s.createdAt) >= sevenDaysAgo)
          .reduce((a: number, s: any) => a + (s.accuracy || 0), 0) / weeklyAISessions
      )
    : totalAccuracy
  const weeklyDigestText = weeklyCompleted >= 3
    ? 'Strong learning momentum this week. Keep the same routine.'
    : weeklyCompleted > 0
      ? 'Good progress this week. A short daily check-in can boost confidence.'
      : 'Light activity this week. Try one 5-minute mission together today.'
  const todayAction = pendingHW[0] || null
  const missionAction = !todayAction && dailyMission ? dailyMission : null
  const insightText = pendingHW.length > 0
    ? `${pendingHW.length} homework item${pendingHW.length > 1 ? 's' : ''} need attention today.`
    : hwPct >= 80
      ? 'Great momentum this week. Keep the routine going.'
      : 'Progress is steady. A short 5-minute practice can help a lot.'

  // ── Computed chart data for ProgressCharts ─────────────────────
  const skillsForChart = useMemo(() => {
    // Group AI sessions by topic → average accuracy per topic
    const topicMap: Record<string, { total: number; count: number }> = {}
    aiSessions.forEach((s: any) => {
      const key = (s.topic || 'unknown').toLowerCase()
      if (!topicMap[key]) topicMap[key] = { total: 0, count: 0 }
      topicMap[key].total += s.accuracy || 0
      topicMap[key].count += 1
    })

    // Also include module progress as skills
    const moduleMap: Record<string, number> = {}
    progressData.forEach((p: any) => {
      const mod = MODS.find(m => m.id === p.moduleId)
      if (mod) {
        moduleMap[p.moduleId] = Math.round((p.cards / mod.items.length) * 100)
      }
    })

    const colors = ['#5E5CE6', '#30D158', '#FF453A', '#FF9F0A', '#BF5AF2', '#64D2FF', '#FF6B6B', '#4CAF6A']
    const emojiMap: Record<string, string> = {
      numbers: '🔢', letters: '🔤', animals: '🐾', colors: '🎨',
      shapes: '🔷', fruits: '🍎', food: '🍔', weather: '⛅',
      vehicles: '🚗', feelings: '😊', habits: '🌟', manners: '💝',
    }

    const skills: { label: string; emoji: string; value: number; color: string }[] = []
    let ci = 0

    // From AI sessions
    Object.entries(topicMap).forEach(([topic, data]) => {
      const avg = Math.round(data.total / data.count)
      skills.push({
        label: topic.charAt(0).toUpperCase() + topic.slice(1),
        emoji: emojiMap[topic] || '📚',
        value: avg,
        color: colors[ci % colors.length],
      })
      ci++
    })

    // From module progress (only add if not already covered by AI sessions)
    Object.entries(moduleMap).forEach(([modId, pct]) => {
      if (!topicMap[modId]) {
        const mod = MODS.find(m => m.id === modId)
        skills.push({
          label: mod?.title || modId,
          emoji: mod?.icon || '📘',
          value: pct,
          color: colors[ci % colors.length],
        })
        ci++
      }
    })

    return skills
  }, [aiSessions, progressData])

  const weeklyForChart = useMemo(() => {
    // Group AI sessions by date (last 7 days)
    const dayMap: Record<string, { accuracy: number[]; sessions: number; stars: number }> = {}
    const now = Date.now()
    const daysBack = 7

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400_000)
      const key = d.toISOString().slice(0, 10)
      dayMap[key] = { accuracy: [], sessions: 0, stars: 0 }
    }

    aiSessions.forEach((s: any) => {
      if (!s.createdAt) return
      const key = new Date(s.createdAt).toISOString().slice(0, 10)
      if (dayMap[key]) {
        dayMap[key].accuracy.push(s.accuracy || 0)
        dayMap[key].sessions += 1
        dayMap[key].stars += s.stars || 0
      }
    })

    return Object.entries(dayMap).map(([dateStr, d]) => ({
      label: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
      accuracy: d.accuracy.length ? Math.round(d.accuracy.reduce((a, v) => a + v, 0) / d.accuracy.length) : 0,
      sessions: d.sessions,
      stars: d.stars,
    }))
  }, [aiSessions])

  const chartBadges = useMemo(() => {
    return (badgesData || []).map((b: any) => ({
      name: b.name || b.badge || '',
      emoji: b.emoji || '🏅',
      earnedAt: b.earnedAt || b.createdAt || '',
    }))
  }, [badgesData])

  const handleMarkDone = async (hwId: string) => {
    if (!student || markingDone) return
    toast.confirm('Are you sure your child has completed this homework? This will notify the teacher.', async () => {
      setMarkingDone(hwId)
      try {
        await completeHomework(hwId, student.id)
        await loadData(user)
      } catch (e: any) { toast.error(e.message) }
      finally { setMarkingDone(null) }
    })
  }

  const handleReply = async () => {
    if (!showReply || !replyBody) return
    try {
      const payloadBody = `Subject: Re: ${showReply.subject}\n\n${replyBody}`
      if (threadMode.enabled && threadMode.threadId) {
        await sendThreadMessage(threadMode.threadId, {
          body: payloadBody,
          kind: 'direct_message',
          priority: 'normal',
        })
      } else if (student?.classGroupId) {
        try {
          const existing = await getMessageThreads({ scopeType: 'classGroup', classGroupId: student.classGroupId })
          let thread = Array.isArray(existing) ? existing[0] : null
          if (!thread) thread = await createMessageThread({ scopeType: 'classGroup', classGroupId: student.classGroupId })
          if (!thread?.id) throw new Error('thread unavailable')
          await sendThreadMessage(thread.id, {
            body: payloadBody,
            kind: 'direct_message',
            priority: 'normal',
          })
          setThreadMode({ enabled: true, threadId: thread.id })
        } catch {
          await sendMessage({
            from: `${student?.name}'s Parent`,
            fromId: student?.id,
            to: showReply.fromId || 'teacher',
            subject: `Re: ${showReply.subject}`,
            body: replyBody,
            classId: student?.classId,
          })
        }
      } else {
        await sendMessage({
          from: `${student?.name}'s Parent`,
          fromId: student?.id,
          to: showReply.fromId || 'teacher',
          subject: `Re: ${showReply.subject}`,
          body: replyBody,
          classId: student?.classId,
        })
      }
      setShowReply(null)
      setReplyBody('')
      loadData(user)
    } catch (e: any) { toast.error(e.message) }
  }

  const openQuickReply = (template: string) => {
    trackKpiEvent({ category: 'communication', name: 'parent_quick_reply_used' })
    const teacherMsg = messages.find((m: any) => m.fromId !== student?.id)
    setShowReply(teacherMsg || { subject: 'Daily Check-in', fromId: 'teacher' })
    setReplyBody(template)
    setTab(2)
  }

  if (loading) return <Loading emoji="✨" text="Loading your child's data…" />

  const TABS = [
    { label: 'Home', idx: 0, icon: <Home size={14} /> },
    { label: 'Progress', idx: 1, icon: <BarChart3 size={14} /> },
    { label: 'Messages', idx: 2, icon: <Users size={14} /> },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      <ParentSidebar
        userName={user?.name || student?.name}
        childName={student?.name}
        activeIndex={tab}
        onItemClick={(idx) => setTab(idx)}
        unreadCount={unreadMsgs}
      />
    <div className="flex-1 min-h-screen flex flex-col app-container">
      {/* Fixed tab bar */}
      <div className="lg:hidden fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[960px] z-50 backdrop-blur border-b rounded-b-xl" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--app-border)' }}>
        <div className="flex">
          {TABS.map(t => (
            <button key={t.idx} onClick={() => setTab(t.idx)}
              className={`flex-1 py-3 text-xs font-black transition-colors relative ${tab === t.idx ? 'border-b-2' : ''}`}
              style={{ color: tab === t.idx ? 'var(--app-accent)' : 'rgba(70, 75, 96, 0.8)', borderColor: tab === t.idx ? 'var(--app-accent)' : 'transparent' }}>
              <span className="inline-flex items-center gap-1.5">{t.icon}<span>{t.label}</span></span>
              {t.idx === 2 && unreadMsgs > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center app-pressable">
                  {unreadMsgs > 9 ? '9+' : unreadMsgs}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-12 lg:pt-4 pb-20">
        {/* ── HOME TAB ──────────────────────────────────────────── */}
        {tab === 0 && (
          <div>
            {/* Hero card */}
            <div className="m-3 rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.08), rgba(67,198,172,0.06))', border: '1px solid rgba(48,209,88,0.2)' }}>
              <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
              <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/3 translate-y-8" />
              <div className="flex justify-between items-start relative">
                <div>
                  <div className="text-xs font-bold app-muted mb-1 inline-flex items-center gap-1"><Users size={12} /> Parent View</div>
                  <div className="text-2xl font-black">{student?.avatar} {student?.name}</div>
                  {children.length > 1 && (
                    <select
                      value={student?.id || ''}
                      onChange={(e) => {
                        const next = children.find((c) => c.id === e.target.value)
                        if (!next) return
                        setStudent(next)
                        loadData(next)
                      }}
                      className="mt-2 app-field text-xs font-black"
                      style={{ minWidth: 170 }}
                    >
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>{c.avatar || '🧒'} {c.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="bg-yellow-400/20 text-yellow-300 rounded-full px-3 py-0.5 text-xs font-black">⭐ {student?.stars} stars</span>
                    {(student?.streak ?? 0) > 0 && (
                      <span className="bg-orange-400/20 text-orange-300 rounded-full px-3 py-0.5 text-xs font-black">🔥 {student?.streak}d streak</span>
                    )}
                    <span className="bg-purple-400/20 text-purple-300 rounded-full px-3 py-0.5 text-xs font-black">🤖 Lv {student?.aiBestLevel}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <WeatherChip variant="light" />
                  <TopBarActions variant="light" />
                </div>
              </div>
            </div>

            {/* Parent co-pilot: today action + plain-language insight */}
            <div className="mx-3 mb-4 rounded-2xl p-4" style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-black text-sm">Today&apos;s 5-minute action</div>
                <div className="text-green-300 text-[11px] font-bold">Parent Co-Pilot</div>
              </div>
              {todayAction ? (
                <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)' }}>
                  <div className="font-black text-sm">{todayAction.title}</div>
                  <div className="text-xs font-bold app-muted mt-0.5">Help your child finish this first.</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-yellow-300 text-xs font-black">⭐ {todayAction.starsReward} stars</div>
                    <button
                      onClick={() => setTab(2)}
                      className="text-xs font-black px-2.5 py-1 rounded-lg app-pressable"
                      style={{ background: 'rgba(48,209,88,0.2)', color: '#9EF0B2' }}
                    >
                      Message Teacher
                    </button>
                  </div>
                </div>
              ) : missionAction ? (
                <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)' }}>
                  <div className="font-black text-sm">{missionAction.title}</div>
                  <div className="text-xs font-bold app-muted mt-0.5">Suggested mission for today ({missionAction.etaMin} min).</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs font-black app-muted capitalize">{missionAction.kind}</div>
                    <button
                      onClick={() => {
                        trackKpiEvent({ category: 'engagement', name: 'parent_mission_open_from_copilot' })
                        router.push(missionAction.route)
                      }}
                      className="text-xs font-black px-2.5 py-1 rounded-lg app-pressable"
                      style={{ background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-xs app-muted font-bold" style={{ background: 'var(--app-surface-soft)' }}>
                  No pending homework today. Great job staying on track.
                </div>
              )}
              <div className="app-muted text-xs font-bold mt-3">
                {insightText}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_PARENT_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => openQuickReply(q)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-black app-pressable"
                    style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly digest card (imported pattern from family learning apps) */}
            <div className="mx-3 mb-4 rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-black text-sm">Weekly Digest</div>
                <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8' }}>Last 7 days</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}>
                  <div className="text-lg font-black text-green-500">{weeklyCompleted}</div>
                  <div className="text-[10px] font-bold app-muted">HW Done</div>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}>
                  <div className="text-lg font-black text-purple-500">{weeklyAISessions}</div>
                  <div className="text-[10px] font-bold app-muted">AI Sessions</div>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}>
                  <div className="text-lg font-black text-blue-500">{weeklyAvgAccuracy}%</div>
                  <div className="text-[10px] font-bold app-muted">Accuracy</div>
                </div>
              </div>
              <div className="text-xs font-bold app-muted">{weeklyDigestText}</div>
              {missionAction && (
                <button
                  onClick={() => {
                    trackKpiEvent({ category: 'engagement', name: 'parent_mission_open_from_digest' })
                    router.push(missionAction.route)
                  }}
                  className="mt-3 px-3 py-2 rounded-xl text-xs font-black app-pressable"
                  style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8', border: '1px solid rgba(91,127,232,0.3)' }}
                >
                  Open 5-min mission
                </button>
              )}
            </div>

            {/* Progress rings */}
            <div className="mx-3 mb-4">
              <div className="text-xs font-bold app-muted mb-3 px-1">PROGRESS OVERVIEW</div>
              <div className="grid grid-cols-3 gap-3">
                {/* Homework ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="relative">
                    <Ring pct={hwPct} color="#4CAF6A" size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-black text-sm">{hwPct}%</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold app-muted mt-2 text-center">Homework</div>
                  <div className="text-green-400 text-xs font-black">{completedHW.length}/{homework.length}</div>
                </div>

                {/* Attendance ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="relative">
                    <Ring pct={attPct} color={attPct >= 80 ? '#4CAF6A' : '#F5A623'} size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-black text-sm">{attendance ? `${attPct}%` : '--'}</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold app-muted mt-2 text-center">Attendance</div>
                  <div className={`text-xs font-black ${attPct >= 80 ? 'text-green-400' : 'text-orange-400'}`}>
                    {attendance ? `${attendance.present}P/${attendance.absent}A` : '30d'}
                  </div>
                </div>

                {/* AI accuracy ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="relative">
                    <Ring pct={totalAccuracy} color="#8B6CC1" size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-black text-sm">{totalAccuracy}%</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold app-muted mt-2 text-center">AI Accuracy</div>
                  <div className="text-purple-400 text-xs font-black">{aiSessions.length} sessions</div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mx-3 mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <div className="text-yellow-400 font-black text-2xl">{totalAIStars}</div>
                <div className="text-xs font-bold app-muted mt-1">Stars from AI Tutor</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <div className="text-orange-400 font-black text-2xl">{pendingHW.length}</div>
                <div className="text-xs font-bold app-muted mt-1">Pending Homework</div>
                {pendingHW.length > 0 && <div className="text-orange-400/60 text-xs font-bold">Needs attention!</div>}
              </div>
            </div>

            {/* Push notification opt-in banner */}
            {notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <div className="mx-3 mb-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.06), rgba(67,198,172,0.04))', border: '1px solid #4CAF6A40' }}>
                <div className="text-2xl shrink-0"><Bell size={20} style={{ color: 'var(--app-success)' }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm">Enable Homework Alerts</div>
                  <div className="text-xs font-bold app-muted">Get notified when homework is due</div>
                </div>
                <button
                  onClick={subscribeNotif}
                  className="px-3 py-2 rounded-xl text-xs font-black shrink-0 active:scale-95 transition-all app-pressable"
                  style={{ background: '#4CAF6A', color: '#fff' }}
                >
                  Enable
                </button>
              </div>
            )}

            {/* Pending HW */}
            {pendingHW.length > 0 && (
              <div className="mx-3 mb-4">
                <div className="text-orange-400 font-black text-sm mb-2">⚠️ Pending ({pendingHW.length})</div>
                <div className="space-y-2">
                  {pendingHW.map(hw => (
                    <div key={hw.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--app-surface)', border: hw.aiGenerated ? '1px solid rgba(94,92,230,0.35)' : '1px solid #F5A62330' }}>
                      <div className="text-2xl">{hw.aiGenerated ? '✨' : '📝'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-black text-sm">{hw.title}</div>
                          {hw.aiGenerated && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI</span>}
                        </div>
                        {hw.description && <div className="text-xs font-bold app-muted mt-0.5 leading-snug">{hw.description}</div>}
                        <div className="text-red-400 text-xs font-bold mt-0.5">Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-yellow-400 text-xs font-bold">⭐{hw.starsReward}</div>
                        <button
                          onClick={() => handleMarkDone(hw.id)}
                          disabled={markingDone === hw.id}
                          className="text-[10px] font-black px-2 py-1 rounded-lg active:scale-95 transition-all app-pressable"
                          style={{ background: '#4CAF6A20', color: '#4CAF6A', opacity: markingDone === hw.id ? 0.5 : 1 }}
                        >
                          {markingDone === hw.id ? '…' : 'Mark Done ✅'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Feed from Teacher */}
            {student?.classId && (
              <div className="mx-3 mb-4">
                <div className="font-black text-sm mb-3">📸 Classroom Moments</div>
                <ActivityFeed classId={student.classId} />
              </div>
            )}

            {/* Recent messages preview */}
            {messages.length > 0 && (
              <div className="mx-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-black text-sm">💬 Messages</div>
                  {unreadMsgs > 0 && <div className="bg-red-500 text-xs font-black rounded-full px-2 py-0.5">{unreadMsgs} new</div>}
                </div>
                {messages.slice(0, 2).map(msg => (
                  <div key={msg.id} className="rounded-xl p-3 mb-2" style={{ background: 'var(--app-surface)', border: !msg.read ? '1px solid #4CAF6A40' : '1px solid var(--app-border)' }}>
                    <div className="flex items-center gap-2">
                      {!msg.read && <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                      <div className="font-black text-sm">{msg.subject}</div>
                    </div>
                    <div className="text-xs font-bold app-muted">From: {msg.from}</div>
                  </div>
                ))}
                <button onClick={() => setTab(2)} className="text-green-400 text-sm font-bold app-pressable">View all →</button>
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS TAB ──────────────────────────────────────── */}
        {tab === 1 && (
          <div className="px-3 pt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg inline-flex items-center gap-2"><BarChart3 size={18} /> Learning Progress</h2>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl text-xs font-black app-pressable inline-flex items-center gap-1.5"
                style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6', border: '1px solid rgba(94,92,230,0.3)' }}
              >
                <Download size={12} /> Save Report
              </button>
            </div>

            {/* Summary bar */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-black text-sm">Overall Homework</div>
                <div className="font-black">{hwPct}%</div>
              </div>
              <div className="rounded-full h-3" style={{ background: 'rgba(120,120,140,0.14)' }}>
                <div className="h-3 rounded-full transition-all" style={{ width: `${hwPct}%`, background: hwPct >= 80 ? '#4CAF6A' : hwPct >= 50 ? '#F5A623' : '#E05252' }} />
              </div>
              <div className="text-xs font-bold app-muted mt-1">{completedHW.length} done · {pendingHW.length} pending</div>
            </div>

            {/* Visual Progress Charts */}
            {(aiSessions.length > 0 || progressData.length > 0) && (
              <ProgressCharts
                skills={skillsForChart}
                weekly={weeklyForChart}
                totalStars={totalAIStars}
                totalSessions={aiSessions.length}
                avgAccuracy={totalAccuracy}
                bestLevel={student?.aiBestLevel || 1}
                badges={chartBadges}
              />
            )}

            {/* AI Tutor Sessions list */}
            {aiSessions.length > 0 && (
              <div className="mt-4 mb-4">
                <div className="text-xs font-bold app-muted mb-2">AI TUTOR SESSION HISTORY</div>
                <div className="space-y-2">
                  {aiSessions.slice(0, 8).map((s: any) => (
                    <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(191,90,242,0.2)' }}>🧠</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate">{s.topic}</div>
                        <div className="rounded-full h-1.5 mt-1" style={{ background: 'rgba(120,120,140,0.14)' }}>
                          <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${s.accuracy}%` }} />
                        </div>
                        <div className="text-xs font-bold app-muted">{s.correct}/{s.total} correct · Lv {s.maxLevel}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-yellow-400 font-black text-sm">⭐{s.stars}</div>
                        <div className="text-xs font-bold app-muted">{s.accuracy}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Homework status */}
            {homework.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold app-muted mb-2">HOMEWORK STATUS</div>
                <div className="space-y-2">
                  {homework.map(hw => {
                    const done = hw.completions?.some((c: any) => c.studentId === student?.id && c.done)
                    return (
                      <div key={hw.id} className="rounded-2xl p-3 flex items-center gap-3"
                        style={{ background: 'var(--app-surface)', border: `1px solid ${done ? '#4CAF6A30' : hw.aiGenerated ? 'rgba(94,92,230,0.3)' : '#F5A62330'}` }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${done ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                          {done ? '✅' : hw.aiGenerated ? '✨' : '⏰'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="font-black text-sm truncate">{hw.title}</div>
                            {hw.aiGenerated && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI</span>}
                          </div>
                          {hw.description && <div className="text-xs font-bold app-muted mt-0.5 leading-snug">{hw.description}</div>}
                          <div className={`text-xs font-bold ${done ? 'text-green-400' : 'text-orange-400'}`}>
                            {done ? 'Completed!' : `Due: ${hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}`}
                          </div>
                        </div>
                        <div className="text-yellow-400 text-xs font-bold shrink-0">⭐{hw.starsReward}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiSessions.length === 0 && homework.length === 0 && progressData.length === 0 && <InlineEmpty emoji="📊" text="No activity yet" />}
          </div>
        )}

        {/* ── MESSAGES TAB ──────────────────────────────────────── */}
        {tab === 2 && (
          <div className="px-3 pt-2">
            <h2 className="font-black text-lg mb-4 inline-flex items-center gap-2"><MessageSquare size={16} /> Messages</h2>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--app-surface)', border: !msg.read ? '1px solid #4CAF6A40' : '1px solid var(--app-border)' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {!msg.read && <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                      <div className="font-black text-sm truncate">{msg.subject}</div>
                    </div>
                    <div className="text-xs font-bold app-muted ml-2 shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs font-bold app-muted mb-2">From: {msg.from}</div>
                  <div className="text-xs app-muted leading-relaxed mb-3">{msg.body}</div>
                  <button onClick={() => setShowReply(msg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 app-pressable"
                    style={{ background: '#4CAF6A20' }}>
                    ↩ Reply
                  </button>
                </div>
              ))}
              {messages.length === 0 && <InlineEmpty emoji="💬" text="No messages yet" />}
            </div>
          </div>
        )}
      </div>

      {/* Reply modal */}
      {showReply && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'var(--app-overlay)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black">Reply</h3>
              <button onClick={() => setShowReply(null)} className="app-muted text-2xl leading-none app-pressable">×</button>
            </div>
            <div className="text-xs font-bold app-muted mb-3">Re: {showReply.subject}</div>
            <textarea placeholder="Your message..." value={replyBody} rows={5}
              onChange={e => setReplyBody(e.target.value)}
              className="app-input mb-3 resize-none" />
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_PARENT_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setReplyBody(q)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-black app-pressable"
                  style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
                >
                  Use: {q}
                </button>
              ))}
            </div>
            <button onClick={handleReply}
              className="w-full py-3 rounded-xl font-black app-pressable"
              style={{ background: 'var(--app-success)', color: '#fff' }}>
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
