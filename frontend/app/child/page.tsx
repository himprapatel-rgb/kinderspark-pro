'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getHomework, getSyllabuses, getProgress, getRecommendations } from '@/lib/api'
import { MODS } from '@/lib/modules'

export default function ChildPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)
  const logout = useStore(s => s.logout)

  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const student = currentStudent || user

  useEffect(() => {
    if (!student) { router.push('/'); return }
    loadData()
  }, [student])

  const loadData = async () => {
    if (!student) return
        if (!student.classId || !student.id) return
    try {
      const [hw, syl, prog] = await Promise.all([
        getHomework(student.classId!),
        getSyllabuses(student.classId),
        getProgress(student.id),
      ])
      setHomework(hw)
      setSyllabuses(syl.filter((s: any) => s.published))
      const pm: Record<string, number> = {}
      prog.forEach((p: any) => { pm[p.moduleId] = p.cards })
      setProgressMap(pm)
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0f1a 100%)' }}>
        <div className="text-7xl animate-bounce">⭐</div>
        <div className="text-white/50 font-bold text-sm">Loading your world...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0d1a 100%)' }}>
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4c3aff, #8b1cf7)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative p-5 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-5xl mb-2" style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}>{student?.avatar || '🧒'}</div>
              <div className="text-white text-2xl font-black">Hi, {student?.name}!</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="star-badge">⭐ {(student?.stars ?? 0).toLocaleString()}</div>
                {(student?.streak ?? 0) > 0 && (
                  <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-0.5">
                    <span className="text-sm">🔥</span>
                    <span className="text-white text-xs font-black">{student?.streak}d</span>
                  </div>
                )}
                <div className="bg-white/20 rounded-full px-3 py-0.5 text-white text-xs font-black">
                  Lv {student?.aiBestLevel ?? 1}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button onClick={() => router.push('/child/shop')} className="glass-btn">🛑 Shop</button>
              <button onClick={() => router.push('/child/settings')} className="glass-btn">⚙️ Settings</button>
              <button onClick={() => { logout(); router.push('/') }} className="text-white/40 text-xs font-bold mt-1">Logout</button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-white/70 text-xs font-bold">Overall Progress</span>
              <span className="text-white font-black text-xs">{overallPct}%</span>
            </div>
            <div className="bg-white/20 rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-700" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
      </div>

      <div className="px-4 pt-5 space-y-5">
        {pendingHW.length > 0 && (
          <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', boxShadow: '0 8px 32px rgba(255,107,53,0.3)' }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📚</span>
                <div className="text-white font-black">Homework Due!</div>
                <div className="ml-auto bg-white/30 rounded-full px-2 py-0.5 text-white text-xs font-black">{pendingHW.length}</div>
              </div>
              {pendingHW.slice(0, 2).map(hw => (
                <button key={hw.id} onClick={() => hw.moduleId && router.push(`/child/lesson/${hw.moduleId}`)}
                  className="w-full bg-white/20 rounded-2xl p-3 flex items-center gap-3 active:scale-95 transition-all text-left mb-2">
                  <span className="text-2xl">📝</span>
                  <div className="flex-1">
                    <div className="text-white font-black text-sm">{hw.title}</div>
                    <div className="text-white/80 text-xs font-bold">Due: {hw.dueDate} · ⭐ {hw.starsReward}</div>
                  </div>
                  <span className="text-white/70">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => router.push('/child/tutor')}
          className="w-full rounded-3xl p-5 text-left active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #0d1f3c, #1a1f6e)', border: '1.5px solid #5E5CE660' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(94,92,230,0.3)' }}>🤖</div>
            <div>
              <div className="text-white font-black text-base">AI Tutor Sparkle</div>
              <div className="text-white/60 text-sm font-bold">Practice &amp; earn ⭐ stars!</div>
              {(student?.aiSessions ?? 0) > 0 && (
                <div className="text-purple-400 text-xs font-bold">{student?.aiSessions} sessions · Best Lv {student?.aiBestLevel}</div>
              )}
            </div>
            <div className="ml-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl px-4 py-2 text-white text-sm font-black">Play ▶</div>
          </div>
        </button>

        {recommendations.length > 0 && (
          <div>
            <div className="text-white font-black text-base mb-3 flex items-center gap-2">
              ✨ Just For You
              <span className="text-xs text-purple-400 font-bold bg-purple-500/20 rounded-full px-2 py-0.5 ml-1">AI Pick</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((rec, i) => {
                const mod = MODS.find(m => m.id === rec.moduleId)
                const done = progressMap[rec.moduleId] || 0
                const pct = Math.min(100, Math.round((done / (mod?.items.length || 1)) * 100))
                return (
                  <button key={i} onClick={() => router.push(`/child/lesson/${rec.moduleId}`)}
                    className="flex-shrink-0 w-36 rounded-2xl p-3 text-left active:scale-95 transition-all"
                    style={{ background: (mod?.color || '#5E5CE6') + '22', border: `1.5px solid ${mod?.color || '#5E5CE6'}44` }}>
                    <div className="text-3xl mb-2">{mod?.icon || '📚'}</div>
                    <div className="text-white font-black text-xs mb-0.5">{rec.title}</div>
                    <div className="text-white/50 text-xs font-bold leading-tight">{rec.reason}</div>
                    <div className="mt-2 bg-white/10 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: mod?.color || '#5E5CE6' }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-white font-black text-base mb-3">🎮 Activities</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Draw', icon: '🎨', path: '/child/draw', bg: 'rgba(255,69,58,0.15)', border: '#FF9F0A40' },
              { label: 'Trace', icon: '✍️', path: '/child/trace', bg: 'rgba(48,209,88,0.15)', border: '#30D15840' },
              { label: 'Tutor', icon: '🤖', path: '/child/tutor', bg: 'rgba(191,90,242,0.15)', border: '#BF5AF240' },
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.path)}
                className="rounded-2xl p-3 flex flex-col items-center gap-2 active:scale-95 transition-all"
                style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                <div className="text-3xl">{a.icon}</div>
                <div className="text-white font-black text-xs">{a.label}</div>
              </button>
            ))}
          </div>
        </div>

        {syllabuses.length > 0 && (
          <div>
            <div className="text-white font-black text-base mb-3">📖 My Lessons</div>
            <div className="grid grid-cols-2 gap-3">
              {syllabuses.map(syl => {
                const done = progressMap[`syl_${syl.id}`] || 0
                const pct = Math.min(100, Math.round((done / (syl.items?.length || 1)) * 100))
                return (
                  <button key={syl.id} onClick={() => router.push(`/child/lesson/syl_${syl.id}`)}
                    className="rounded-2xl p-4 text-left active:scale-95 transition-all"
                    style={{ background: syl.color + '22', border: `1.5px solid ${syl.color}44` }}>
                    <div className="text-3xl mb-2">{syl.icon}</div>
                    <div className="text-white font-black text-xs">{syl.title}</div>
                    <div className="text-white/50 text-xs font-bold">{syl.items?.length} cards</div>
                    <div className="mt-2 bg-white/10 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: syl.color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-white font-black text-base mb-3">📚 All Lessons</div>
          <div className="grid grid-cols-2 gap-3">
            {MODS.map(mod => {
              const done = progressMap[mod.id] || 0
              const pct = Math.min(100, Math.round((done / mod.items.length) * 100))
              return (
                <button key={mod.id} onClick={() => router.push(`/child/lesson/${mod.id}`)}
                  className="rounded-2xl p-4 text-left active:scale-95 transition-all"
                  style={{ background: mod.color + '18', border: `1.5px solid ${mod.color}40` }}>
                  <div className="text-3xl mb-2">{mod.icon}</div>
                  <div className="text-white font-black text-xs">{mod.title}</div>
                  <div className="text-white/50 text-xs font-bold">{done}/{mod.items.length}</div>
                  <div className="mt-2 bg-white/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: mod.color }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .star-badge { background: linear-gradient(135deg, #FFD60A, #FF9F0A); border-radius: 20px; padding: 2px 12px; font-weight: 800; font-size: 13px; color: #000; display: inline-block; box-shadow: 0 2px 8px rgba(255,159,10,0.4); }
        .glass-btn { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-weight: 800; font-size: 12px; color: white; }
        .glass-btn:active { transform: scale(0.95); }
      `}</style>
    </div>
  )
}
