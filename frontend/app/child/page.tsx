'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getSyllabuses, getProgress, completeHomework, updateStudent } from '@/lib/api'
import { MODS } from '@/lib/modules'

export default function ChildPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)
  const logout = useStore(s => s.logout)
  const setCurrentStudent = useStore(s => s.setCurrentStudent)

  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const student = currentStudent || user

  useEffect(() => {
    if (!student) { router.push('/'); return }
    loadData()
  }, [student, router])

  const loadData = async () => {
    if (!student) return
    try {
      const [hw, syl, prog] = await Promise.all([
        getHomework(student.classId),
        getSyllabuses(student.classId),
        getProgress(student.id),
      ])
      setHomework(hw)
      setSyllabuses(syl.filter((s: any) => s.published))
      const pm: Record<string, number> = {}
      prog.forEach((p: any) => { pm[p.moduleId] = p.cards })
      setProgressMap(pm)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a2e' }}>
        <div className="text-7xl animate-bounce">⭐</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0f1a 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' }}>
        <div className="p-5 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-5xl mb-2">{student?.avatar || '🧒'}</div>
              <div className="text-white text-2xl font-black">{student?.name}</div>
              <div className="flex items-center gap-3 mt-1">
                <div className="star-badge">⭐ {student?.stars}</div>
                {student?.streak > 0 && <div className="text-white/80 text-sm font-bold">🔥 {student?.streak}d streak</div>}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button onClick={() => router.push('/child/shop')}
                className="bg-white/20 rounded-full px-3 py-1 text-white text-xs font-bold">
                🛍️ Shop
              </button>
              <button onClick={() => router.push('/child/settings')}
                className="bg-white/20 rounded-full px-3 py-1 text-white text-xs font-bold">
                ⚙️ Settings
              </button>
              <button onClick={() => { logout(); router.push('/') }}
                className="text-white/50 text-xs font-bold">
                Logout
              </button>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-5 top-10 w-20 h-20 rounded-full bg-white/5" />
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Homework section */}
        {pendingHW.length > 0 && (
          <div>
            <div className="text-white font-black text-base mb-3">📚 Today's Homework</div>
            <div className="space-y-2">
              {pendingHW.map(hw => {
                const mod = MODS.find(m => m.id === hw.moduleId)
                return (
                  <button key={hw.id}
                    onClick={() => hw.moduleId && router.push(`/child/lesson/${hw.moduleId}`)}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 text-left active:scale-95 transition-all"
                    style={{ background: '#1a1a2e', border: '2px solid #5E5CE620' }}>
                    <div className="text-3xl">{mod?.icon || '📝'}</div>
                    <div className="flex-1">
                      <div className="text-white font-black text-sm">{hw.title}</div>
                      <div className="text-orange-400 text-xs font-bold">Due: {hw.dueDate}</div>
                    </div>
                    <div className="text-white/40 text-xl">→</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Tutor Banner */}
        <button
          onClick={() => router.push('/child/tutor')}
          className="w-full rounded-3xl p-5 text-left active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #1a1a3e, #2a1a4e)', border: '2px solid #5E5CE640' }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-float">🤖</div>
            <div>
              <div className="text-white font-black">AI Tutor Sparkle</div>
              <div className="text-white/60 text-sm font-bold">Practice & earn stars!</div>
            </div>
            <div className="ml-auto bg-accent rounded-xl px-3 py-1 text-white text-xs font-black">Play</div>
          </div>
        </button>

        {/* Activities */}
        <div>
          <div className="text-white font-black text-base mb-3">✨ Activities</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push('/child/draw')}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF453A33, #FF9F0A33)', border: '1px solid #FF9F0A40' }}>
              <div className="text-4xl">🎨</div>
              <div className="text-white font-black text-sm">Draw</div>
            </button>
            <button onClick={() => router.push('/child/trace')}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #30D15833, #0A84FF33)', border: '1px solid #30D15840' }}>
              <div className="text-4xl">✍️</div>
              <div className="text-white font-black text-sm">Trace Letters</div>
            </button>
          </div>
        </div>

        {/* Custom Lessons */}
        {syllabuses.length > 0 && (
          <div>
            <div className="text-white font-black text-base mb-3">📖 Custom Lessons</div>
            <div className="grid grid-cols-2 gap-3">
              {syllabuses.map(syl => {
                const done = progressMap[`syl_${syl.id}`] || 0
                const total = syl.items?.length || 1
                const pct = Math.min(100, Math.round((done / total) * 100))
                return (
                  <button key={syl.id}
                    onClick={() => router.push(`/child/lesson/syl_${syl.id}`)}
                    className="rounded-2xl p-4 text-left active:scale-95 transition-all"
                    style={{ background: syl.color + '22', border: `1px solid ${syl.color}44` }}>
                    <div className="text-3xl mb-2">{syl.icon}</div>
                    <div className="text-white font-black text-xs">{syl.title}</div>
                    <div className="text-white/50 text-xs font-bold">{syl.items?.length} cards</div>
                    <div className="mt-2 bg-white/10 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: syl.color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* All Lessons */}
        <div>
          <div className="text-white font-black text-base mb-3">📚 All Lessons</div>
          <div className="grid grid-cols-2 gap-3">
            {MODS.map(mod => {
              const done = progressMap[mod.id] || 0
              const total = mod.items.length
              const pct = Math.min(100, Math.round((done / total) * 100))
              return (
                <button key={mod.id}
                  onClick={() => router.push(`/child/lesson/${mod.id}`)}
                  className="rounded-2xl p-4 text-left active:scale-95 transition-all"
                  style={{ background: mod.color + '22', border: `1px solid ${mod.color}44` }}>
                  <div className="text-3xl mb-2">{mod.icon}</div>
                  <div className="text-white font-black text-xs">{mod.title}</div>
                  <div className="text-white/50 text-xs font-bold">{done}/{total} done</div>
                  <div className="mt-2 bg-white/10 rounded-full h-1">
                    <div className="h-1 rounded-full progress-bar" style={{ width: `${pct}%`, background: mod.color }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .star-badge {
          background: linear-gradient(135deg, #FFD60A, #FF9F0A);
          border-radius: 20px;
          padding: 2px 10px;
          font-weight: 800;
          font-size: 13px;
          color: #000;
          display: inline-block;
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
