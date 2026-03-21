'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getStudents, getHomework, getMessages, sendMessage } from '@/lib/api'

export default function ParentPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const logout = useStore(s => s.logout)

  const [tab, setTab] = useState(0)
  const [student, setStudent] = useState<any>(null)
  const [homework, setHomework] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
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
      const [hw, msgs] = await Promise.all([
        getHomework(u.classId),
        getMessages({ classId: u.classId }),
      ])
      setHomework(hw)
      setMessages(msgs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pendingHW = homework.filter(hw => {
    if (!student) return false
    const done = hw.completions?.some((c: any) => c.studentId === student.id && c.done)
    return !done
  })

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1f0f' }}>
        <div className="text-white/60 font-bold">Loading...</div>
      </div>
    )
  }

  const TABS = ['🏠 Home', '💬 Messages']

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1a0f' }}>
      {/* Tab bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="flex">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-xs font-black transition-colors ${tab === i ? 'text-app-green border-t-2 border-app-green' : 'text-white/50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-12 pb-20">
        {tab === 0 && (
          <div>
            {/* Hero */}
            <div className="m-3 rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #1a3a1a, #30D158)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white/70 text-xs font-bold">Parent View</div>
                  <div className="text-white text-2xl font-black">{student?.avatar} {student?.name}</div>
                  <div className="text-white/70 text-sm font-bold mt-1">
                    ⭐ {student?.stars} stars • 🔥 {student?.streak} day streak
                  </div>
                </div>
                <button onClick={() => { logout(); router.push('/') }}
                  className="text-white/50 text-xs font-bold border border-white/30 rounded-full px-3 py-1">
                  Logout
                </button>
              </div>
            </div>

            {/* Daily summary card */}
            <div className="mx-3 mb-4 rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
              <div className="text-white font-black mb-2">📊 Daily Summary</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-green-400 font-black text-lg">{student?.stars}</div>
                  <div className="text-white/50 text-xs font-bold">Stars</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-400 font-black text-lg">{pendingHW.length}</div>
                  <div className="text-white/50 text-xs font-bold">Pending HW</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400 font-black text-lg">{student?.aiSessions}</div>
                  <div className="text-white/50 text-xs font-bold">AI Sessions</div>
                </div>
              </div>
            </div>

            {/* Pending homework */}
            {pendingHW.length > 0 && (
              <div className="mx-3 mb-4">
                <div className="text-white font-black mb-2">📚 Pending Homework</div>
                <div className="space-y-2">
                  {pendingHW.map(hw => (
                    <div key={hw.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#1a2a1a' }}>
                      <div className="text-2xl">📝</div>
                      <div className="flex-1">
                        <div className="text-white font-black text-sm">{hw.title}</div>
                        <div className="text-red-400 text-xs font-bold">Due: {hw.dueDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent messages preview */}
            {messages.length > 0 && (
              <div className="mx-3">
                <div className="text-white font-black mb-2">💬 Recent Messages</div>
                {messages.slice(0, 2).map(msg => (
                  <div key={msg.id} className="rounded-xl p-3 mb-2" style={{ background: '#1a2a1a' }}>
                    <div className="text-white font-black text-sm">{msg.subject}</div>
                    <div className="text-white/50 text-xs font-bold mt-0.5">From: {msg.from}</div>
                  </div>
                ))}
                <button onClick={() => setTab(1)} className="text-green-400 text-sm font-bold">View all →</button>
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="px-3 pt-2">
            <h2 className="text-white font-black text-lg mb-4">Messages</h2>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4" style={{ background: '#1a2a1a' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white font-black text-sm">{msg.subject}</div>
                    <div className="text-white/40 text-xs font-bold">{new Date(msg.createdAt).toLocaleDateString()}</div>
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

      {/* Reply Modal */}
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
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white font-bold text-sm resize-none outline-none mb-3"
              style={{ fontFamily: 'Nunito, sans-serif' }} />
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
