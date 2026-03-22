'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getMessages, sendMessage, getAISessions, getAttendanceSummary, markAllMessagesRead } from '@/lib/api'

// SVG ring component for circular progress
function Ring({ pct, color, size = 80, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
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
  const [unreadMsgs, setUnreadMsgs] = useState(0)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1a0a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">👪</div>
          <div className="text-white/60 font-bold">Loading...</div>
        </div>
      </div>
    )
  }

  const TABS = [
    { label: '🏠 Home', idx: 0 },
    { label: '📊 Progress', idx: 1 },
    { label: `💬 Messages${unreadMsgs > 0 ? ` (${unreadMsgs})` : ''}`, idx: 2 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0a1a0a 0%, #060f06 100%)' }}>
      {/* Fixed tab bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="flex">
          {TABS.map(t => (
            <button key={t.idx} onClick={() => setTab(t.idx)}
              className={`flex-1 py-3 text-xs font-black transition-colors relative ${tab === t.idx ? 'text-green-400 border-b-2 border-green-400' : 'text-white/50'}`}>
              {t.label}
              {t.idx === 2 && unreadMsgs > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
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
            <div className="m-3 rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a3a1a, #2a5a2a)' }}>
              <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
              <div className="absolute right-8 bottom-0 w-24 h-24 rounded-full bg-white/3 translate-y-8" />
              <div className="flex justify-between items-start relative">
                <div>
                  <div className="text-white/60 text-xs font-bold mb-1">👪 Parent View</div>
                  <div className="text-white text-2xl font-black">{student?.avatar} {student?.name}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="bg-yellow-400/20 text-yellow-300 rounded-full px-3 py-0.5 text-xs font-black">⭐ {student?.stars} stars</span>
                    {(student?.streak ?? 0) > 0 && (
                      <span className="bg-orange-400/20 text-orange-300 rounded-full px-3 py-0.5 text-xs font-black">🔥 {student?.streak}d streak</span>
                    )}
                    <span className="bg-purple-400/20 text-purple-300 rounded-full px-3 py-0.5 text-xs font-black">🤖 Lv {student?.aiBestLevel}</span>
                  </div>
                </div>
                <button onClick={() => { logout(); router.push('/') }}
                  className="text-white/50 text-xs font-bold border border-white/30 rounded-full px-3 py-1.5 shrink-0">
                  Logout
                </button>
              </div>
            </div>

            {/* Progress rings */}
            <div className="mx-3 mb-4">
              <div className="text-white/50 text-xs font-bold mb-3 px-1">PROGRESS OVERVIEW</div>
              <div className="grid grid-cols-3 gap-3">
                {/* Homework ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: '#1a2a1a' }}>
                  <div className="relative">
                    <Ring pct={hwPct} color="#30D158" size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-sm">{hwPct}%</span>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs font-bold mt-2 text-center">Homework</div>
                  <div className="text-green-400 text-xs font-black">{completedHW.length}/{homework.length}</div>
                </div>

                {/* Attendance ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: '#1a2a1a' }}>
                  <div className="relative">
                    <Ring pct={attPct} color={attPct >= 80 ? '#30D158' : '#FF9F0A'} size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-sm">{attendance ? `${attPct}%` : '--'}</span>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs font-bold mt-2 text-center">Attendance</div>
                  <div className={`text-xs font-black ${attPct >= 80 ? 'text-green-400' : 'text-orange-400'}`}>
                    {attendance ? `${attendance.present}P/${attendance.absent}A` : '30d'}
                  </div>
                </div>

                {/* AI accuracy ring */}
                <div className="rounded-2xl p-3 flex flex-col items-center" style={{ background: '#1a2a1a' }}>
                  <div className="relative">
                    <Ring pct={totalAccuracy} color="#BF5AF2" size={72} stroke={7} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-sm">{totalAccuracy}%</span>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs font-bold mt-2 text-center">AI Accuracy</div>
                  <div className="text-purple-400 text-xs font-black">{aiSessions.length} sessions</div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mx-3 mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                <div className="text-yellow-400 font-black text-2xl">{totalAIStars}</div>
                <div className="text-white/50 text-xs font-bold mt-1">Stars from AI Tutor</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                <div className="text-orange-400 font-black text-2xl">{pendingHW.length}</div>
                <div className="text-white/50 text-xs font-bold mt-1">Pending Homework</div>
                {pendingHW.length > 0 && <div className="text-orange-400/60 text-xs font-bold">Needs attention!</div>}
              </div>
            </div>

            {/* Pending HW */}
            {pendingHW.length > 0 && (
              <div className="mx-3 mb-4">
                <div className="text-orange-400 font-black text-sm mb-2">⚠️ Pending ({pendingHW.length})</div>
                <div className="space-y-2">
                  {pendingHW.map(hw => (
                    <div key={hw.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#1a2a1a', border: hw.aiGenerated ? '1px solid rgba(94,92,230,0.35)' : '1px solid #FF9F0A30' }}>
                      <div className="text-2xl">{hw.aiGenerated ? '✨' : '📝'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="text-white font-black text-sm">{hw.title}</div>
                          {hw.aiGenerated && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI</span>}
                        </div>
                        {hw.description && <div className="text-white/50 text-xs font-bold mt-0.5 leading-snug">{hw.description}</div>}
                        <div className="text-red-400 text-xs font-bold mt-0.5">Due: {hw.dueDate}</div>
                      </div>
                      <div className="text-yellow-400 text-xs font-bold">⭐{hw.starsReward}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent messages preview */}
            {messages.length > 0 && (
              <div className="mx-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-white font-black text-sm">💬 Messages</div>
                  {unreadMsgs > 0 && <div className="bg-red-500 text-white text-xs font-black rounded-full px-2 py-0.5">{unreadMsgs} new</div>}
                </div>
                {messages.slice(0, 2).map(msg => (
                  <div key={msg.id} className="rounded-xl p-3 mb-2" style={{ background: '#1a2a1a', border: !msg.read ? '1px solid #30D15840' : 'none' }}>
                    <div className="flex items-center gap-2">
                      {!msg.read && <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                      <div className="text-white font-black text-sm">{msg.subject}</div>
                    </div>
                    <div className="text-white/50 text-xs font-bold">From: {msg.from}</div>
                  </div>
                ))}
                <button onClick={() => setTab(2)} className="text-green-400 text-sm font-bold">View all →</button>
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS TAB ──────────────────────────────────────── */}
        {tab === 1 && (
          <div className="px-3 pt-2">
            <h2 className="text-white font-black text-lg mb-4">📊 Learning Progress</h2>

            {/* Summary bar */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#1a1a2e' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-white font-black text-sm">Overall Homework</div>
                <div className="text-white font-black">{hwPct}%</div>
              </div>
              <div className="bg-white/10 rounded-full h-3">
                <div className="h-3 rounded-full transition-all" style={{ width: `${hwPct}%`, background: hwPct >= 80 ? '#30D158' : hwPct >= 50 ? '#FF9F0A' : '#FF453A' }} />
              </div>
              <div className="text-white/40 text-xs font-bold mt-1">{completedHW.length} done · {pendingHW.length} pending</div>
            </div>

            {aiSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-white/60 text-xs font-bold mb-2">AI TUTOR SESSIONS</div>
                <div className="space-y-2">
                  {aiSessions.slice(0, 8).map((s: any) => (
                    <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: '#1a1a2e' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(191,90,242,0.2)' }}>🧠</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-black text-sm truncate">{s.topic}</div>
                        <div className="bg-white/10 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${s.accuracy}%` }} />
                        </div>
                        <div className="text-white/40 text-xs font-bold">{s.correct}/{s.total} correct · Lv {s.maxLevel}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-yellow-400 font-black text-sm">⭐{s.stars}</div>
                        <div className="text-white/40 text-xs font-bold">{s.accuracy}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {homework.length > 0 && (
              <div className="mb-4">
                <div className="text-white/60 text-xs font-bold mb-2">HOMEWORK STATUS</div>
                <div className="space-y-2">
                  {homework.map(hw => {
                    const done = hw.completions?.some((c: any) => c.studentId === student?.id && c.done)
                    return (
                      <div key={hw.id} className="rounded-2xl p-3 flex items-center gap-3"
                        style={{ background: '#1a2a1a', border: `1px solid ${done ? '#30D15830' : hw.aiGenerated ? 'rgba(94,92,230,0.3)' : '#FF9F0A30'}` }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${done ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                          {done ? '✅' : hw.aiGenerated ? '✨' : '⏰'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="text-white font-black text-sm truncate">{hw.title}</div>
                            {hw.aiGenerated && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI</span>}
                          </div>
                          {hw.description && <div className="text-white/40 text-xs font-bold mt-0.5 leading-snug">{hw.description}</div>}
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

            {aiSessions.length === 0 && homework.length === 0 && (
              <div className="text-center text-white/30 font-bold py-10">No activity yet.</div>
            )}
          </div>
        )}

        {/* ── MESSAGES TAB ──────────────────────────────────────── */}
        {tab === 2 && (
          <div className="px-3 pt-2">
            <h2 className="text-white font-black text-lg mb-4">💬 Messages</h2>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4"
                  style={{ background: '#1a2a1a', border: !msg.read ? '1px solid #30D15840' : '1px solid transparent' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {!msg.read && <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                      <div className="text-white font-black text-sm truncate">{msg.subject}</div>
                    </div>
                    <div className="text-white/40 text-xs font-bold ml-2 shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-white/60 text-xs font-bold mb-2">From: {msg.from}</div>
                  <div className="text-white/70 text-xs leading-relaxed mb-3">{msg.body}</div>
                  <button onClick={() => setShowReply(msg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400"
                    style={{ background: '#30D15820' }}>
                    ↩ Reply
                  </button>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-white/30 font-bold py-10">No messages yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reply modal */}
      {showReply && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10" style={{ background: '#1a2a1a' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-black">Reply</h3>
              <button onClick={() => setShowReply(null)} className="text-white/50 text-2xl leading-none">×</button>
            </div>
            <div className="text-white/50 text-xs font-bold mb-3">Re: {showReply.subject}</div>
            <textarea placeholder="Your message..." value={replyBody} rows={5}
              onChange={e => setReplyBody(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white font-bold text-sm resize-none outline-none mb-3" />
            <button onClick={handleReply}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#30D158' }}>
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
