'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getAdminStats, getAdminLeaderboard, getClasses } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const role = useStore(s => s.role)
  const logout = useStore(s => s.logout)

  const [stats, setStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!user || role !== 'admin') { router.push('/'); return }
    loadData()
  }, [user, role, router])

  const loadData = async () => {
    try {
      const [s, lb, cls] = await Promise.all([
        getAdminStats(),
        getAdminLeaderboard(),
        getClasses(),
      ])
      setStats(s)
      setLeaderboard(lb)
      setClasses(cls)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-white/60 font-bold animate-pulse">Loading admin panel...</div>
      </div>
    )
  }

  const TABS = ['📊 Overview', '🏆 Leaderboard', '🏫 Classes']
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #06060f 100%)' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a3a, #2d1b69)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
        <div className="relative p-5 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-white/60 text-xs font-bold mb-1">ADMIN PANEL</div>
              <div className="text-white text-2xl font-black">⚙️ {user?.name}</div>
              <div className="text-white/50 text-sm font-bold">KinderSpark Pro Dashboard</div>
            </div>
            <button onClick={() => { logout(); router.push('/') }}
              className="text-white/50 text-xs font-bold border border-white/20 rounded-full px-3 py-1">
              Logout
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2 mt-5">
              {[
                { label: 'Classes', value: stats.totalClasses, icon: '🏫', color: '#5E5CE6' },
                { label: 'Students', value: stats.totalStudents, icon: '🧒', color: '#30D158' },
                { label: 'Stars', value: (stats.totalStars || 0).toLocaleString(), icon: '⭐', color: '#FF9F0A' },
                { label: 'Lessons', value: stats.totalSyllabuses, icon: '📚', color: '#BF5AF2' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color + '22', border: `1px solid ${s.color}33` }}>
                  <div className="text-xl">{s.icon}</div>
                  <div className="text-white font-black text-lg leading-none mt-1">{s.value}</div>
                  <div className="text-white/50 text-xs font-bold mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="flex">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-xs font-black transition-colors ${tab === i ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {tab === 0 && (
          <div className="space-y-4">
            <div className="text-white/60 text-xs font-bold">PLATFORM HEALTH</div>

            {stats && (
              <div className="space-y-3">
                {[
                  { label: 'Avg Stars / Student', value: stats.totalStudents ? Math.round(stats.totalStars / stats.totalStudents) : 0, icon: '⭐', max: 1000 },
                  { label: 'Syllabuses Created', value: stats.totalSyllabuses, icon: '📚', max: 50 },
                  { label: 'Total Students', value: stats.totalStudents, icon: '🧒', max: 200 },
                ].map(m => (
                  <div key={m.label} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-white font-black text-sm">{m.icon} {m.label}</div>
                      <div className="text-white font-black">{m.value}</div>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        style={{ width: Math.min(100, Math.round(m.value / m.max * 100)) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-white/60 text-xs font-bold mt-4">TOP 3 PERFORMERS</div>
            {leaderboard.slice(0, 3).map((s, i) => (
              <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#1a1a2e', border: i === 0 ? '1px solid #FFD60A40' : 'none' }}>
                <div className="text-2xl">{medals[i] || `#${i+1}`}</div>
                <div className="text-2xl">{s.avatar}</div>
                <div className="flex-1">
                  <div className="text-white font-black text-sm">{s.name}</div>
                  <div className="text-white/50 text-xs font-bold">{s.class?.name} · {s.aiSessions} sessions</div>
                </div>
                <div className="text-right">
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
                style={{ background: i < 3 ? '#1a1a2e' : '#111', border: i === 0 ? '1px solid #FFD60A40' : i === 1 ? '1px solid #C0C0C040' : i === 2 ? '1px solid #CD7F3240' : 'none' }}>
                <div className="w-8 text-center font-black text-white/60">{i < 3 ? medals[i] : `#${i+1}`}</div>
                <div className="text-2xl">{s.avatar}</div>
                <div className="flex-1">
                  <div className="text-white font-black text-sm">{s.name}</div>
                  <div className="text-white/40 text-xs font-bold">{s.class?.name} · {s.class?.grade}</div>
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
            {classes.map(cls => (
              <div key={cls.id} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-white font-black">{cls.name}</div>
                    <div className="text-white/50 text-xs font-bold">{cls.grade}</div>
                  </div>
                  <div className="bg-purple-500/20 rounded-full px-3 py-1 text-purple-400 text-xs font-black">
                    {cls._count?.students || 0} students
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl p-2" style={{ background: 'rgba(94,92,230,0.1)' }}>
                    <div className="text-white font-black text-sm">{cls._count?.homework || 0}</div>
                    <div className="text-white/40 text-xs font-bold">Homework</div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(48,209,88,0.1)' }}>
                    <div className="text-white font-black text-sm">{cls._count?.syllabuses || 0}</div>
                    <div className="text-white/40 text-xs font-bold">Syllabuses</div>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(255,159,10,0.1)' }}>
                    <div className="text-white font-black text-sm">{cls._count?.students || 0}</div>
                    <div className="text-white/40 text-xs font-bold">Students</div>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="text-center text-white/30 font-bold py-10">No classes yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
