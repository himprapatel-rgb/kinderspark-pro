'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { Loading, InlineEmpty } from '@/components/UIStates'
import DashboardSidebar from '@/components/DashboardSidebar'
import TopBarActions from '@/components/TopBarActions'
import WeatherChip from '@/components/WeatherChip'
import { getAdminStats, getAdminLeaderboard, getClasses, getClassAnalytics, getPilotMetrics } from '@/lib/api'
import { BarChart3, BookOpen, GraduationCap, Settings, Sparkles, Trophy, UserRound, Users } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const role = useStore(s => s.role)
  const logout = useStore(s => s.logout)

  const [stats, setStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classAnalytics, setClassAnalytics] = useState<any[]>([])
  const [pilotMetrics, setPilotMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!user || role !== 'admin') { router.push('/'); return }
    loadData()
  }, [user, role, router])

  const loadData = async () => {
    try {
      const [s, lb, cls, analytics] = await Promise.all([
        getAdminStats(),
        getAdminLeaderboard(),
        getClasses(),
        getClassAnalytics(),
      ])
      setStats(s)
      setLeaderboard(lb)
      setClasses(cls)
      setClassAnalytics(Array.isArray(analytics) ? analytics : [])
      getPilotMetrics().then(setPilotMetrics).catch(() => {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading emoji="✨" text="Loading admin panel…" />

  const TABS = [
    { label: 'Overview', icon: <BarChart3 size={14} /> },
    { label: 'Leaderboard', icon: <Trophy size={14} /> },
    { label: 'Classes', icon: <GraduationCap size={14} /> },
    { label: 'AI Stats', icon: <Sparkles size={14} /> },
  ]
  const medals = ['🥇', '🥈', '🥉']
  const needsAttention = classAnalytics
    .map((ca: any) => {
      const reasons: string[] = []
      if ((ca.hwCompletionRate ?? 100) < 60) reasons.push('Low HW completion')
      if ((ca.totalAISessions ?? 0) === 0) reasons.push('No AI activity')
      if ((ca.totalStudents ?? 0) === 0) reasons.push('No students assigned')
      return { ...ca, reasons }
    })
    .filter((ca: any) => ca.reasons.length > 0)
    .slice(0, 4)

  const SIDEBAR_ITEMS = [
    { icon: '📊', label: 'Overview', href: '/admin' },
    { icon: '🏆', label: 'Leaderboard', href: '/admin/leaderboard' },
    { icon: '🏫', label: 'Classes', href: '/admin/classes' },
    { icon: '📈', label: 'AI Stats', href: '/admin/stats' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      <DashboardSidebar role="admin" items={SIDEBAR_ITEMS} userName={user?.name} />
      <div className="flex-1 min-h-screen pb-20 app-container">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--app-accent), #4A6ED0)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
        <div className="relative p-5 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold app-muted mb-1">ADMIN PANEL</div>
              <div className="text-2xl font-black flex items-center gap-2 text-white"><Settings size={20} /> {user?.name}</div>
              <div className="text-sm font-bold app-muted">KinderSpark Pro Dashboard</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <WeatherChip variant="light" />
              <TopBarActions variant="light" />
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3 mt-5">
              {[
                { label: 'Classes', value: stats.totalClasses, icon: <GraduationCap size={16} />, color: '#5B7FE8' },
                { label: 'Students', value: stats.totalStudents, icon: <Users size={16} />, color: '#4CAF6A' },
                { label: 'Stars', value: (stats.totalStars || 0).toLocaleString(), icon: <Sparkles size={16} />, color: '#F5A623' },
                { label: 'Lessons', value: stats.totalSyllabuses, icon: <BookOpen size={16} />, color: '#8B6CC1' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color + '22', border: `1px solid ${s.color}33` }}>
                  <div className="text-xl inline-flex justify-center">{s.icon}</div>
                  <div className="font-black text-lg leading-none mt-1">{s.value}</div>
                  <div className="text-xs font-bold app-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-40 backdrop-blur border-b" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--app-border)' }}>
        <div className="flex">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-xs font-black transition-colors app-pressable ${tab === i ? 'border-b-2' : ''}`}
              style={{ color: tab === i ? 'var(--app-accent)' : 'rgba(70, 75, 96, 0.6)', borderColor: tab === i ? 'var(--app-accent)' : 'transparent' }}>
              <span className="inline-flex items-center gap-1.5">{t.icon}<span>{t.label}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="app-content">
        {tab === 0 && stats && (
          <div className="app-stack">
            {pilotMetrics && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <div className="font-black text-sm mb-3">Pilot Metrics Snapshot</div>
                <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="text-lg font-black">{pilotMetrics.activeChildren7d}</div>
                    <div className="text-xs font-bold app-muted">Active (7d)</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="text-lg font-black">{pilotMetrics.homeworkCompletionRate}%</div>
                    <div className="text-xs font-bold app-muted">HW Completion</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="text-lg font-black">{pilotMetrics.parentReadRate}%</div>
                    <div className="text-xs font-bold app-muted">Parent Read</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="text-lg font-black">{pilotMetrics.avgAccuracy}%</div>
                    <div className="text-xs font-bold app-muted">AI Accuracy</div>
                  </div>
                </div>
              </div>
            )}
            {/* Needs attention (operational priority) */}
            {needsAttention.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-black text-sm">Needs Attention</div>
                  <div className="text-orange-300 text-[11px] font-bold">{needsAttention.length} class{needsAttention.length > 1 ? 'es' : ''}</div>
                </div>
                <div className="space-y-2">
                  {needsAttention.map((ca: any) => (
                    <button
                      key={ca.id}
                      onClick={() => setTab(2)}
                      className="w-full rounded-xl p-3 text-left app-pressable"
                      style={{ background: 'var(--app-surface-soft)', border: '1px solid rgba(255,159,10,0.2)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-black text-sm truncate">{ca.name}</div>
                        <div className="text-xs font-bold app-muted shrink-0">{ca.hwCompletionRate}% HW</div>
                      </div>
                      <div className="text-orange-200/90 text-xs font-bold mt-1 truncate">
                        {ca.reasons.join(' • ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* School health score */}
            {(() => {
              const avgStars = stats.totalStudents ? Math.round(stats.totalStars / stats.totalStudents) : 0
              const healthScore = Math.min(100, Math.round((avgStars / 500) * 40 + (stats.totalSyllabuses / 20) * 30 + (Math.min(stats.totalStudents, 50) / 50) * 30))
              return (
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(94,92,230,0.08), rgba(191,90,242,0.06))', border: '1px solid rgba(94,92,230,0.2)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-black">🏫 School Health Score</div>
                    <div className="text-xs font-bold app-muted">{stats.totalClasses} classes</div>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="font-black" style={{ fontSize: '3rem', lineHeight: 1 }}>{healthScore}</div>
                    <div className="flex-1 pb-2">
                    <div className="rounded-full h-4" style={{ background: 'rgba(120,120,140,0.14)' }}>
                        <div className="h-4 rounded-full transition-all" style={{
                          width: `${healthScore}%`,
                          background: healthScore >= 70 ? '#4CAF6A' : healthScore >= 40 ? '#F5A623' : '#E05252'
                        }} />
                      </div>
                      <div className="text-xs font-bold app-muted mt-1">out of 100</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="text-xs font-bold app-muted">PLATFORM METRICS</div>
            <div className="space-y-3">
              {[
                { label: 'Avg Stars / Student', value: stats.totalStudents ? Math.round(stats.totalStars / stats.totalStudents) : 0, icon: '⭐', max: 500, color: '#F5B731' },
                { label: 'Syllabuses Created', value: stats.totalSyllabuses, icon: '📚', max: 30, color: '#8B6CC1' },
                { label: 'Total Students Enrolled', value: stats.totalStudents, icon: '🧒', max: 100, color: '#4CAF6A' },
                { label: 'Total Classes', value: stats.totalClasses, icon: '🏫', max: 20, color: '#5B7FE8' },
              ].map(m => (
                <div key={m.label} className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-black text-sm">{m.icon} {m.label}</div>
                    <div className="font-black">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</div>
                  </div>
                  <div className="rounded-full h-2.5" style={{ background: 'rgba(120,120,140,0.14)' }}>
                    <div className="h-2.5 rounded-full transition-all"
                      style={{ width: Math.min(100, Math.round(m.value / m.max * 100)) + '%', background: m.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs font-bold app-muted mt-4 inline-flex items-center gap-1.5"><span className="inline-block translate-y-[1px]">🏆</span> TOP 3 PERFORMERS</div>
            {leaderboard.slice(0, 3).map((s, i) => (
              <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: i === 0 ? 'rgba(255,215,10,0.06)' : 'var(--app-surface)', border: i === 0 ? '1px solid rgba(255,215,10,0.2)' : i === 1 ? '1px solid rgba(192,192,192,0.2)' : i === 2 ? '1px solid rgba(205,127,50,0.2)' : '1px solid var(--app-border)' }}>
                <div className="text-2xl">{medals[i] || `#${i+1}`}</div>
                <div className="text-2xl">{s.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate">{s.name}</div>
                  <div className="text-xs font-bold app-muted">{s.class?.name} · {s.aiSessions} AI sessions</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-yellow-400 font-black">⭐ {s.stars}</div>
                  <div className="text-purple-400 text-xs font-bold">Lv {s.aiBestLevel}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            {leaderboard.map((s, i) => (
              <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: i < 3 ? 'var(--app-surface)' : 'var(--app-surface-soft)', border: i === 0 ? '1px solid rgba(255,215,10,0.2)' : i === 1 ? '1px solid rgba(192,192,192,0.2)' : i === 2 ? '1px solid rgba(205,127,50,0.2)' : '1px solid var(--app-border)' }}>
                <div className="w-8 text-center font-black app-muted">{i < 3 ? medals[i] : `#${i+1}`}</div>
                <div className="text-2xl">{s.avatar}</div>
                <div className="flex-1">
                  <div className="font-black text-sm">{s.name}</div>
                  <div className="text-xs font-bold app-muted">{s.class?.name} · {s.class?.grade}</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-black text-sm">⭐ {s.stars}</div>
                  <div className="flex gap-1 justify-end mt-0.5">
                    {s.streak > 0 && <span className="text-orange-400 text-xs font-bold">🔥{s.streak}d</span>}
                    <span className="text-purple-400 text-xs font-bold">Lv{s.aiBestLevel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-3">
            {classes.map(cls => {
              const ca = classAnalytics.find((a: any) => a.id === cls.id)
              return (
                <div key={cls.id} className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-black">{cls.name}</div>
                      <div className="text-xs font-bold app-muted">{cls.grade}</div>
                    </div>
                    <div className="bg-purple-500/20 rounded-full px-3 py-1 text-purple-400 text-xs font-black">
                      {cls._count?.students || 0} students
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-2">
                    <div className="rounded-xl p-2" style={{ background: 'rgba(94,92,230,0.1)' }}>
                      <div className="font-black text-sm">{cls._count?.homework || 0}</div>
                      <div className="text-xs font-bold app-muted">Homework</div>
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'rgba(48,209,88,0.1)' }}>
                      <div className="font-black text-sm">{cls._count?.syllabuses || 0}</div>
                      <div className="text-xs font-bold app-muted">Syllabuses</div>
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'rgba(255,159,10,0.1)' }}>
                      <div className="font-black text-sm">{ca?.totalAISessions ?? '—'}</div>
                      <div className="text-xs font-bold app-muted">AI Sessions</div>
                    </div>
                  </div>
                  {ca && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs font-bold app-muted mb-1">
                        <span>HW completion</span><span>{ca.hwCompletionRate}%</span>
                      </div>
                      <div className="rounded-full h-1.5" style={{ background: 'rgba(120,120,140,0.14)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${ca.hwCompletionRate}%`, background: ca.hwCompletionRate >= 70 ? '#4CAF6A' : '#F5A623' }} />
                      </div>
                      {ca.aiHomeworkCount > 0 && (
                        <div className="text-[10px] text-purple-400 font-bold mt-1">✨ {ca.aiHomeworkCount} AI-generated homework</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {classes.length === 0 && <InlineEmpty emoji="🏫" text="No classes yet" />}
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-4">
            {/* School-wide AI summary */}
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(94,92,230,0.08), rgba(191,90,242,0.06))', border: '1px solid rgba(94,92,230,0.2)' }}>
              <div className="font-black mb-3">🤖 School-Wide AI Usage</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="font-black text-2xl">
                    {classAnalytics.reduce((a, c) => a + c.totalAISessions, 0)}
                  </div>
                  <div className="text-xs font-bold app-muted">Total AI Sessions</div>
                </div>
                <div>
                  <div className="font-black text-2xl">
                    {classAnalytics.reduce((a, c) => a + c.aiHomeworkCount, 0)}
                  </div>
                  <div className="text-xs font-bold app-muted">✨ AI Homework</div>
                </div>
                <div>
                  <div className="font-black text-2xl">
                    {classAnalytics.length ? +(classAnalytics.reduce((a, c) => a + c.avgAILevel, 0) / classAnalytics.length).toFixed(1) : 0}
                  </div>
                  <div className="text-xs font-bold app-muted">Avg AI Level</div>
                </div>
              </div>
            </div>

            {/* Per-class AI breakdown */}
            <div className="text-xs font-bold app-muted">PER-CLASS BREAKDOWN</div>
            {classAnalytics.map(ca => (
              <div key={ca.id} className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-black text-sm">{ca.name}</div>
                    <div className="text-xs font-bold app-muted">{ca.grade} · {ca.totalStudents} students</div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 font-black">{ca.totalAISessions} sessions</div>
                    <div className="text-xs font-bold app-muted">Lv {ca.avgAILevel} avg</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl p-2" style={{ background: 'rgba(255,159,10,0.1)' }}>
                    <div className="text-yellow-400 font-black text-sm">⭐{ca.avgStars}</div>
                    <div className="text-xs font-bold app-muted">Avg Stars</div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(48,209,88,0.1)' }}>
                    <div className="text-green-400 font-black text-sm">{ca.hwCompletionRate}%</div>
                    <div className="text-xs font-bold app-muted">HW Done</div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(94,92,230,0.1)' }}>
                    <div className="text-purple-400 font-black text-sm">{ca.aiHomeworkCount}</div>
                    <div className="text-xs font-bold app-muted">✨ AI HW</div>
                  </div>
                </div>
                {/* HW completion bar */}
                <div className="mt-3">
                  <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.14)' }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${ca.hwCompletionRate}%`, background: ca.hwCompletionRate >= 70 ? '#4CAF6A' : '#F5A623' }} />
                  </div>
                </div>
              </div>
            ))}
            {classAnalytics.length === 0 && <InlineEmpty emoji="📈" text="No analytics data yet" />}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
