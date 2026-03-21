'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { getAdminStats, getAdminLeaderboard, getClasses } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const logout = useStore(s => s.logout)

  const [stats, setStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadData()
  }, [user, router])

  const loadData = async () => {
    try {
      const [statsData, lbData, clsData] = await Promise.all([
        getAdminStats(),
        getAdminLeaderboard(),
        getClasses(),
      ])
      setStats(statsData)
      setLeaderboard(lbData)
      setClasses(clsData)
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-white/60 font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#0a0a0a' }}>
      {/* Hero */}
      <div className="m-3 rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #1a1a3e, #2d1b69)' }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-white/60 text-xs font-bold">Admin Panel</div>
            <div className="text-white text-xl font-black">⚙️ {user?.name || 'Admin'}</div>
            <div className="text-white/50 text-xs font-bold mt-1">School Dashboard</div>
          </div>
          <button onClick={() => { logout(); router.push('/') }}
            className="text-white/50 text-xs font-bold border border-white/20 rounded-full px-3 py-1">
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-3">
            <div className="text-red-400 text-xs font-bold">{error}</div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-4 text-center">
            <div className="text-white text-3xl font-black">{stats?.totalClasses ?? classes.length}</div>
            <div className="text-white/60 text-xs font-bold">Classes</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 text-center">
            <div className="text-white text-3xl font-black">{stats?.totalStudents ?? '—'}</div>
            <div className="text-white/60 text-xs font-bold">Students</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 text-center">
            <div className="text-white text-3xl font-black">{stats?.totalSyllabuses ?? '—'}</div>
            <div className="text-white/60 text-xs font-bold">Syllabuses</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 text-center">
            <div className="text-yellow-400 text-3xl font-black">⭐{stats?.totalStars ?? '—'}</div>
            <div className="text-white/60 text-xs font-bold">Total Stars</div>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-5">
        {/* Classes */}
        <div>
          <div className="text-white font-black text-base mb-3">🏫 All Classes</div>
          <div className="space-y-2">
            {classes.map(cls => (
              <div key={cls.id} className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: '#1a1a2e' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-accent/20">🏫</div>
                <div className="flex-1">
                  <div className="text-white font-black">{cls.name}</div>
                  <div className="text-white/50 text-xs font-bold">{cls.grade} • {cls._count?.students || 0} students</div>
                </div>
                <div className="text-right">
                  <div className="text-purple-400 font-black text-sm">{cls._count?.syllabuses || 0}</div>
                  <div className="text-white/40 text-xs">syllabuses</div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="text-white/30 font-bold text-center py-6">No classes yet.</div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <div className="text-white font-black text-base mb-3">🏆 Top Students</div>
          <div className="space-y-2">
            {leaderboard.map((s, i) => (
              <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: i === 0 ? '#FFD60A20' : '#1a1a2e', border: i === 0 ? '1px solid #FFD60A40' : 'none' }}>
                <div className="text-2xl font-black" style={{ color: i === 0 ? '#FFD60A' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </div>
                <div className="text-3xl">{s.avatar}</div>
                <div className="flex-1">
                  <div className="text-white font-black text-sm">{s.name}</div>
                  <div className="text-white/50 text-xs font-bold">{s.className}</div>
                </div>
                <div className="star-badge">⭐ {s.stars}</div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="text-white/30 font-bold text-center py-6">No students yet.</div>
            )}
          </div>
        </div>

        {/* Platform stats */}
        <div className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
          <div className="text-white font-black mb-3">📊 Platform Stats</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60 font-bold text-sm">Total Classes</span>
              <span className="text-white font-black">{stats?.totalClasses ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 font-bold text-sm">Total Students</span>
              <span className="text-white font-black">{stats?.totalStudents ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 font-bold text-sm">Total Stars Earned</span>
              <span className="text-white font-black">{stats?.totalStars ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 font-bold text-sm">Syllabuses Created</span>
              <span className="text-white font-black">{stats?.totalSyllabuses ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 font-bold text-sm">Avg Stars / Student</span>
              <span className="text-white font-black">
                {stats?.totalStudents > 0 ? Math.round(stats.totalStars / stats.totalStudents) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .star-badge {
          background: linear-gradient(135deg, #FFD60A, #FF9F0A);
          border-radius: 20px;
          padding: 2px 10px;
          font-weight: 800;
          font-size: 12px;
          color: #000;
        }
      `}</style>
    </div>
  )
}
