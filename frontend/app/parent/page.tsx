'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { Loading, InlineEmpty } from '@/components/UIStates'
import { getHomework, getMessages, sendMessage, getAISessions, getAttendanceSummary, markAllMessagesRead, completeHomework, createMessageStream } from '@/lib/api'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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

export default function ParentPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const logout = useStore(s => s.logout)

  const [tab, setTab] = useState(0)
  const [student, setStudent] = useState<any>(null)
  const [homework, setHomework] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [aiSessions, setAiSessions] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReply, setShowReply] = useState<any>(null)
  const [replyBody, setReplyBody] = useState('')
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const { permission: notifPermission, subscribe: subscribeNotif } = usePushNotifications(student?.id ?? user?.id)

  // SSE / fallback polling refs
  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    setStudent(user)
    loadData(user)
  }, [user, router])

  useEffect(() => {
    if (tab === 2 && student && unreadMsgs > 0) {
      markAllMessagesRead(student.classId, student.id).then(() => setUnreadMsgs(0)).catch(() => {})
    }
  }, [tab])

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
      const [hw, msgs, sessions] = await Promise.all([
        getHomework(u.classId),
        getMessages({ classId: u.classId }),
        getAISessions(u.id),
      ])
      setHomework(hw)
      setMessages(msgs)
      setAiSessions(sessions || [])
      const unread = msgs.filter((m: any) => !m.read && m.fromId !== u.id).length
      setUnreadMsgs(unread)
      getAttendanceSummary(u.classId, 30).then(summary => {
        const mine = summary?.find((s: any) => s.studentId === u.id)
        setAttendance(mine || null)
      }).catch(() => {})
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
  const todayAction = pendingHW[0] || null
  const insightText = pendingHW.length > 0
    ? `${pendingHW.length} homework item${pendingHW.length > 1 ? 's' : ''} need attention today.`
    : hwPct >= 80
      ? 'Great momentum this week. Keep the routine going.'
      : 'Progress is steady. A short 5-minute practice can help a lot.'

  const handleMarkDone = async (hwId: string) => {
    if (!student || markingDone) return
    setMarkingDone(hwId)
    try {
      await completeHomework(hwId, student.id)
      await loadData(user)
    } catch (e: any) { alert(e.message) }
    finally { setMarkingDone(null) }
  }

  const handleReply = async () => {
    if (!showReply || !replyBody) return
    try {
      await sendMessage({
        from: `${student?.name}'s Parent`,
        fromId: student?.id,
        to: showReply.fromId || 'teacher',
        subject: `Re: ${showReply.subject}`,
        body: replyBody,
        classId: student?.classId,
      })
      setShowReply(null)
      setReplyBody('')
      loadData(user)
    } catch (e: any) { alert(e.message) }
  }

  if (loading) return <Loading emoji="👪" text="Loading your child's data…" />

  const TABS = [
    { label: '🏠 Home', idx: 0 },
    { label: '📊 Progress', idx: 1 },
    { label: '💬 Messages', idx: 2 },
  ]

  return (
    <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
      {/* Fixed tab bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[960px] z-50 backdrop-blur border-b rounded-b-xl" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--app-border)' }}>
        <div className="flex">
          {TABS.map(t => (
            <button key={t.idx} onClick={() => setTab(t.idx)}
              className={`flex-1 py-3 text-xs font-black transition-colors relative ${tab === t.idx ? 'border-b-2' : ''}`}
              style={{ color: tab === t.idx ? 'var(--app-accent)' : 'rgba(70, 75, 96, 0.8)', borderColor: tab === t.idx ? 'var(--app-accent)' : 'transparent' }}>
              {t.label}
              {t.idx === 2 && unreadMsgs > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center app-pressable">
                  {unreadMsgs > 9 ? '9+' : unreadMsgs}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-12 pb-20">
        {/* ── HOME TAB ──────────────────────────────────────────── */}
        {tab === 0 && (
          <div>
            {/* Hero card */}
            <div className="m-3 rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.08), rgba(67,198,172,0.06))', border: '1px solid rgba(48,209,88,0.2)' }}>
              <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
              <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/3 translate-y-8" />
              <div className="flex justify-between items-start relative">
                <div>
                  <div className="text-xs font-bold app-muted mb-1">👪 Parent View</div>
                  <div className="text-2xl font-black">{student?.avatar} {student?.name}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="bg-yellow-400/20 text-yellow-300 rounded-full px-3 py-0.5 text-xs font-black">⭐ {student?.stars} stars</span>
                    {(student?.streak ?? 0) > 0 && (
                      <span className="bg-orange-400/20 text-orange-300 rounded-full px-3 py-0.5 text-xs font-black">🔥 {student?.streak}d streak</span>
                    )}
                    <span className="bg-purple-400/20 text-purple-300 rounded-full px-3 py-0.5 text-xs font-black">🤖 Lv {student?.aiBestLevel}</span>
                  </div>
                </div>
                <button onClick={() => { logout(); router.push('/') }}
                  className="text-xs font-bold app-muted border border-white/30 rounded-full px-3 py-1.5 shrink-0 app-pressable">
                  Logout
                </button>
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
              ) : (
                <div className="rounded-xl p-3 text-xs app-muted font-bold" style={{ background: 'var(--app-surface-soft)' }}>
                  No pending homework today. Great job staying on track.
                </div>
              )}
              <div className="text-white/75 text-xs font-bold mt-3">
                {insightText}
              </div>
            </div>

            {/* Progress rings */}
            <div className="mx-3 mb-4">
              <div className="text-xs font-bold app-muted mb-3 px-1">PROGRESS OVERVIEW</div>
              <div className="grid grid-cols-3 gap-3">
                {/* Homework ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="relative">
                    <Ring pct={hwPct} color="#2BA55E" size={72} stroke={7} />
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
                    <Ring pct={attPct} color={attPct >= 80 ? '#2BA55E' : '#E8753A'} size={72} stroke={7} />
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
                    <Ring pct={totalAccuracy} color="#7C5BBF" size={72} stroke={7} />
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
              <div className="mx-3 mb-4 rounded-2xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.06), rgba(67,198,172,0.04))', border: '1px solid #2BA55E40' }}>
                <div className="text-2xl shrink-0">🔔</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm">Enable Homework Alerts</div>
                  <div className="text-xs font-bold app-muted">Get notified when homework is due</div>
                </div>
                <button
                  onClick={subscribeNotif}
                  className="px-3 py-2 rounded-xl text-xs font-black shrink-0 active:scale-95 transition-all app-pressable"
                  style={{ background: '#2BA55E', color: '#fff' }}
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
                    <div key={hw.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', border: hw.aiGenerated ? '1px solid rgba(94,92,230,0.35)' : '1px solid #E8753A30' }}>
                      <div className="text-2xl">{hw.aiGenerated ? '✨' : '📝'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-black text-sm">{hw.title}</div>
                          {hw.aiGenerated && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI</span>}
                        </div>
                        {hw.description && <div className="text-xs font-bold app-muted mt-0.5 leading-snug">{hw.description}</div>}
                        <div className="text-red-400 text-xs font-bold mt-0.5">Due: {hw.dueDate}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-yellow-400 text-xs font-bold">⭐{hw.starsReward}</div>
                        <button
                          onClick={() => handleMarkDone(hw.id)}
                          disabled={markingDone === hw.id}
                          className="text-[10px] font-black px-2 py-1 rounded-lg active:scale-95 transition-all app-pressable"
                          style={{ background: '#2BA55E20', color: '#2BA55E', opacity: markingDone === hw.id ? 0.5 : 1 }}
                        >
                          {markingDone === hw.id ? '…' : 'Mark Done ✅'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div key={msg.id} className="rounded-xl p-3 mb-2" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', border: !msg.read ? '1px solid #2BA55E40' : 'none' }}>
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
            <h2 className="font-black text-lg mb-4">📊 Learning Progress</h2>

            {/* Summary bar */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-black text-sm">Overall Homework</div>
                <div className="font-black">{hwPct}%</div>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div className="h-3 rounded-full transition-all" style={{ width: `${hwPct}%`, background: hwPct >= 80 ? '#2BA55E' : hwPct >= 50 ? '#E8753A' : '#DC4343' }} />
              </div>
              <div className="text-xs font-bold app-muted mt-1">{completedHW.length} done · {pendingHW.length} pending</div>
            </div>

            {aiSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold app-muted mb-2">AI TUTOR SESSIONS</div>
                <div className="space-y-2">
                  {aiSessions.slice(0, 8).map((s: any) => (
                    <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(191,90,242,0.2)' }}>🧠</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate">{s.topic}</div>
                        <div className="bg-gray-200 rounded-full h-1.5 mt-1">
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

            {homework.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold app-muted mb-2">HOMEWORK STATUS</div>
                <div className="space-y-2">
                  {homework.map(hw => {
                    const done = hw.completions?.some((c: any) => c.studentId === student?.id && c.done)
                    return (
                      <div key={hw.id} className="rounded-2xl p-3 flex items-center gap-3"
                        style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', border: `1px solid ${done ? '#2BA55E30' : hw.aiGenerated ? 'rgba(94,92,230,0.3)' : '#E8753A30'}` }}>
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
                            {done ? 'Completed!' : `Due: ${hw.dueDate}`}
                          </div>
                        </div>
                        <div className="text-yellow-400 text-xs font-bold shrink-0">⭐{hw.starsReward}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiSessions.length === 0 && homework.length === 0 && <InlineEmpty emoji="📊" text="No activity yet" />}
          </div>
        )}

        {/* ── MESSAGES TAB ──────────────────────────────────────── */}
        {tab === 2 && (
          <div className="px-3 pt-2">
            <h2 className="font-black text-lg mb-4">💬 Messages</h2>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', border: !msg.read ? '1px solid #2BA55E40' : '1px solid transparent' }}>
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
                    style={{ background: '#2BA55E20' }}>
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
              <button onClick={() => setShowReply(null)} className="text-white/50 text-2xl leading-none app-pressable">×</button>
            </div>
            <div className="text-xs font-bold app-muted mb-3">Re: {showReply.subject}</div>
            <textarea placeholder="Your message..." value={replyBody} rows={5}
              onChange={e => setReplyBody(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-sm resize-none outline-none mb-3" />
            <button onClick={handleReply}
              className="w-full py-3 rounded-xl font-black app-pressable"
              style={{ background: '#2BA55E' }}>
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
