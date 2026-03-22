'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getMessages, sendMessage, getAISessions, getAttendanceSummary } from '@/lib/api'

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

  useEffect(() => {
    if (!user) { router.push('/'); return }
    setStudent(user)
    loadData(user)
  }, [user, router])

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
        <div className="text-white/60 font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  const TABS = ['🏠 Home', '📊 Progress', '💬 Messages']

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0a1a0a 0%, #060f06 100%)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="flex">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-xs font-black transition-colors ${tab === i ? 'text-green-400 border-b-2 border-green-400' : 'text-white/50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-12 pb-20">
        {tab === 0 && (
          <div>
            <div className="m-3 rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a3a1a, #2a5a2a)' }}>
              <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
              <div className="flex justify-between items-start relative">
                <div>
                  <div className="text-white/60 text-xs font-bold mb-1">👪 Parent View</div>
                  <div className="text-white text-2xl font-black">{student?.avatar} {student?.name}</div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <div className="bg-white/20 rounded-full px-3 py-0.5 text-white text-xs font-black">⭐ {student?.stars} stars</div>
                    {(student?.streak ?? 0) > 0 && (
                      <div className="bg-white/20 rounded-full px-3 py-0.5 text-white text-xs font-black">🔥 {student?.streak}d streak</div>
                    )}
                    <div className="bg-white/20 rounded-full px-3 py-0.5 text-white text-xs font-black">Lv {student?.aiBestLevel}</div>
                  </div>
                </div>
                <button onClick={() => { logout(); router.push('/') }}
                  className="text-white/50 text-xs font-bold border border-white/30 rounded-full px-3 py-1">
                  Logout
                </button>
              </div>
            </div>

            <div className="mx-3 mb-4">
              <div className="text-white/60 text-xs font-bold mb-2 px-1">TODAY'S SNAPSHOT</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                  <div className="text-green-400 font-black text-2xl">{completedHW.length}<span className="text-white/30 text-sm">/{homework.length}</span></div>
                  <div className="text-white/50 text-xs font-bold mt-1">Homework Done</div>
                  <div className="mt-2 bg-white/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-400" style={{ width: homework.length ? (completedHW.length / homework.length * 100) + '%' : '0%' }} />
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                  <div className="text-purple-400 font-black text-2xl">{aiSessions.length}</div>
                  <div className="text-white/50 text-xs font-bold mt-1">AI Sessions</div>
                  <div className="text-purple-300 text-xs font-bold mt-1">{totalAccuracy}% avg accuracy</div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                  <div className="text-yellow-400 font-black text-2xl">{totalAIStars}</div>
                  <div className="text-white/50 text-xs font-bold mt-1">Stars from Tutor</div>
                </div>
                {attendance && (
                  <div className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                    <div className={`font-black text-2xl ${(attendance.rate ?? 0) >= 80 ? 'text-green-400' : 'text-orange-400'}`}>{attendance.rate ?? '--'}%</div>
                    <div className="text-white/50 text-xs font-bold mt-1">Attendance (30d)</div>
                    <div className="text-white/30 text-xs font-bold">{attendance.present}P / {attendance.absent}A</div>
                  </div>
                )}
              </div>
            </div>

            {pendingHW.length > 0 && (
              <div className="mx-3 mb-4">
                <div className="text-orange-400 font-black text-sm mb-2">⚠️ Pending Homework ({pendingHW.length})</div>
                <div className="space-y-2">
                  {pendingHW.map(hw => (
                    <div key={hw.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#1a2a1a', border: '1px solid #FF9F0A30' }}>
                      <div className="text-2xl">📝</div>
                      <div className="flex-1">
                        <div className="text-white font-black text-sm">{hw.title}</div>
                        <div className="text-red-400 text-xs font-bold">Due: {hw.dueDate}</div>
                      </div>
                      <div className="text-yellow-400 text-xs font-bold">⭐{hw.starsReward}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="mx-3">
                <div className="text-white font-black text-sm mb-2">💬 Recent Messages</div>
                {messages.slice(0, 2).map(msg => (
                  <div key={msg.id} className="rounded-xl p-3 mb-2" style={{ background: '#1a2a1a' }}>
                    <div className="text-white font-black text-sm">{msg.subject}</div>
                    <div className="text-white/50 text-xs font-bold">From: {msg.from}</div>
                  </div>
                ))}
                <button onClick={() => setTab(2)} className="text-green-400 text-sm font-bold">View all →</button>
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="px-3 pt-2">
            <h2 className="text-white font-black text-lg mb-4">📊 Learning Progress</h2>

            {aiSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-white/60 text-xs font-bold mb-2">AI TUTOR SESSIONS</div>
                <div className="space-y-2">
                  {aiSessions.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: '#1a1a2e' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(191,90,242,0.2)' }}>🧠</div>
                      <div className="flex-1">
                        <div className="text-white font-black text-sm">{s.topic}</div>
                        <div className="text-white/50 text-xs font-bold">{s.correct}/{s.total} correct · Lv {s.maxLevel}</div>
                      </div>
                      <div className="text-right">
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
                      <div key={hw.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: '#1a2a1a' }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${done ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                          {done ? '✓' : '⏰'}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-black text-sm">{hw.title}</div>
                          <div className={`text-xs font-bold ${done ? 'text-green-400' : 'text-orange-400'}`}>
                            {done ? 'Completed!' : `Due: ${hw.dueDate}`}
                          </div>
                        </div>
                        <div className="text-yellow-400 text-xs font-bold">⭐{hw.starsReward}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiSessions.length === 0 && homework.length === 0 && (
              <div className="text-center text-white/30 font-bold py-10">No activity yet this week.</div>
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="px-3 pt-2">
            <h2 className="text-white font-black text-lg mb-4">💬 Messages</h2>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white font-black text-sm flex-1">{msg.subject}</div>
                    <div className="text-white/40 text-xs font-bold ml-2">{new Date(msg.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-white/60 text-xs font-bold mb-2">From: {msg.from}</div>
                  <div className="text-white/70 text-xs leading-relaxed mb-3">{msg.body}</div>
                  <button onClick={() => setShowReply(msg)}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-green-400"
                    style={{ background: '#30D15820' }}>
                    Reply
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

      {showReply && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10" style={{ background: '#1a2a1a' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-black">Reply</h3>
              <button onClick={() => setShowReply(null)} className="text-white/50 text-2xl">×</button>
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
