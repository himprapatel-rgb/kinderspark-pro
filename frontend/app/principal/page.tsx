'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { Loading } from '@/components/UIStates'
import DashboardSidebar from '@/components/DashboardSidebar'
import { getAdminStats, getClasses, getClassAnalytics } from '@/lib/api'
import { TrendingUp, AlertTriangle, CheckCircle2, Crown } from 'lucide-react'
import { AppIcon } from '@/components/icons'

export default function PrincipalPage() {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const role = useAppStore(s => s.role)
  const switchRole = useAppStore(s => s.switchRole)

  const [stats, setStats] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [classAnalytics, setClassAnalytics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    switchRole('principal')
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      const [s, cls, analytics] = await Promise.all([
        getAdminStats().catch(() => null),
        getClasses().catch(() => []),
        getClassAnalytics().catch(() => []),
      ])
      setStats(s)
      setClasses(cls || [])
      setClassAnalytics(Array.isArray(analytics) ? analytics : [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading emoji="👑" text="Loading principal view…" />

  const totalStudents  = stats?.totalStudents  ?? 0
  const totalTeachers  = stats?.totalTeachers  ?? 0
  const totalClasses   = stats?.totalClasses   ?? 0
  const avgCompletion  = stats?.avgHomeworkCompletion ?? 0

  const healthScore = Math.round(
    Math.min(100, ((avgCompletion * 0.5) + (totalStudents > 0 ? 40 : 0) + (totalTeachers > 0 ? 10 : 0)))
  )

  const healthColor  = healthScore >= 70 ? 'var(--app-success)' : healthScore >= 40 ? 'var(--app-warning)' : 'var(--app-danger)'
  const healthLabel  = healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'Needs attention' : 'Urgent'
  const healthEmoji  = healthScore >= 70 ? '✅' : healthScore >= 40 ? '⚠️' : '🚨'

  const attentionClasses = classAnalytics
    .map((ca: any) => {
      const flags: string[] = []
      if ((ca.hwCompletionRate ?? 100) < 60) flags.push('Low HW')
      if ((ca.totalAISessions ?? 0) === 0) flags.push('No AI use')
      if ((ca.totalStudents ?? 0) === 0) flags.push('No students')
      return { ...ca, flags }
    })
    .filter((ca: any) => ca.flags.length > 0)

  const TABS = [
    { label: 'Overview',  icon: <AppIcon name="reports"  size="xs" roleTone="principal" decorative /> },
    { label: 'Classes',   icon: <AppIcon name="school"   size="xs" roleTone="principal" decorative /> },
    { label: 'Teachers',  icon: <AppIcon name="teacher"  size="xs" roleTone="principal" decorative /> },
  ]

  const SIDEBAR_ITEMS = [
    { icon: 'school' as const,   label: 'Overview',    href: '/principal' },
    { icon: 'class' as const,    label: 'Classes',     href: '/principal' },
    { icon: 'teacher' as const,  label: 'Teachers',    href: '/principal' },
    { icon: 'settings' as const, label: 'Admin Panel', href: '/admin' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      {/* Desktop sidebar */}
      <DashboardSidebar
        role="admin"
        items={SIDEBAR_ITEMS}
        userName={user?.name}
        profileHref="/admin/settings"
        onItemClick={(idx) => idx === 3 ? router.push('/admin') : setTab(idx)}
        activeIndex={tab}
      />

      <div className="flex-1 min-h-screen pb-20 app-container">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div
          className="page-hero"
          style={{ background: 'linear-gradient(135deg, #5B4FD6 0%, #8B6CC1 60%, #4A6ED0 100%)' }}
        >
          {/* Decorative orbs */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full bg-white/5 translate-y-6 pointer-events-none" />

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={14} className="text-yellow-300" />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Principal View</span>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">{user?.name}</h1>
              <p className="text-sm font-bold text-white/70 mt-0.5">School leadership dashboard</p>
            </div>
            <button
              onClick={() => router.push("/admin/settings")}
              className="w-10 h-10 rounded-2xl flex items-center justify-center app-pressable app-btn-glass"
              aria-label="Profile"
            >
              <AppIcon name="settings" size="xs" decorative />
            </button>
          </div>

          {/* Health score bar */}
          <div className="mt-5 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-xs font-black uppercase tracking-wide">School Health</span>
              <span className="text-white font-black text-sm">{healthEmoji} {healthLabel}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${healthScore}%`, background: healthColor }}
              />
            </div>
            <p className="text-white/60 text-[10px] font-bold mt-1.5">{healthScore}/100 based on homework completion &amp; enrolment</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {[
              { label: 'Students',  value: totalStudents,  emoji: '🧒' },
              { label: 'Teachers',  value: totalTeachers,  emoji: '👩‍🏫' },
              { label: 'Classes',   value: totalClasses,   emoji: '🏫' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <div className="text-lg leading-none mb-0.5">{s.emoji}</div>
                <div className="text-white font-black text-base leading-none">{s.value}</div>
                <div className="text-white/60 text-[10px] font-bold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile tab bar ────────────────────────────────────────── */}
        <div className="app-tab-bar lg:hidden">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              className="app-tab-btn"
              data-active={tab === i ? 'true' : 'false'}
            >
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────── */}
        <div className="page-body">

          {/* OVERVIEW TAB */}
          {tab === 0 && (
            <>
              {/* Needs attention */}
              {attentionClasses.length > 0 && (
                <div className="page-section">
                  <p className="section-label flex items-center gap-1.5"><AlertTriangle size={11} /> Needs Attention</p>
                  {attentionClasses.slice(0, 3).map((ca: any) => (
                    <div key={ca.id} className="app-card flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.25)' }}>🏫</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{ca.name}</p>
                        <p className="text-xs font-bold app-muted">{ca.flags.join(' · ')}</p>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--app-warning)' }}>
                        {ca.hwCompletionRate ?? 0}% HW
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats grid */}
              <div className="page-section">
                <p className="section-label">Platform Metrics</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Avg HW Completion', value: `${Math.round(avgCompletion)}%`, color: 'var(--app-success)', icon: <CheckCircle2 size={16} /> },
                    { label: 'Total AI Sessions',  value: (stats?.totalAISessions ?? 0).toLocaleString(), color: 'var(--role-admin)', icon: <AppIcon name="aiTutor"  size="xs" roleTone="principal" decorative /> },
                    { label: 'Active Students',    value: (stats?.activeStudents ?? totalStudents).toLocaleString(), color: 'var(--app-accent)', icon: <AppIcon name="students" size="xs" roleTone="principal" decorative /> },
                    { label: 'Avg Accuracy',       value: `${stats?.avgAccuracy ?? 0}%`, color: 'var(--role-teacher)', icon: <TrendingUp size={16} /> },
                  ].map(m => (
                    <div key={m.label} className="app-card">
                      <div className="flex items-center gap-2 mb-2" style={{ color: m.color }}>{m.icon}</div>
                      <div className="font-black text-xl leading-none" style={{ color: m.color }}>{m.value}</div>
                      <div className="section-label mt-1.5">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick admin access */}
              <div className="page-section">
                <p className="section-label">Quick Access</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Full Admin Panel', emoji: '⚙️', href: '/admin', color: 'var(--role-admin)' },
                    { label: 'Leaderboard',      emoji: '🏆', href: '/admin', color: 'var(--app-gold)' },
                  ].map(q => (
                    <button
                      key={q.label}
                      onClick={() => router.push(q.href)}
                      className="app-card-action flex items-center gap-3 text-left"
                    >
                      <span className="text-2xl">{q.emoji}</span>
                      <span className="font-black text-sm">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CLASSES TAB */}
          {tab === 1 && (
            <div className="page-section">
              <p className="section-label">{classes.length} Classes</p>
              {classes.length === 0 ? (
                <div className="app-card empty-state">
                  <span className="empty-state-emoji">🏫</span>
                  <p className="empty-state-title">No classes yet</p>
                  <p className="empty-state-sub">Classes will appear here once teachers create them</p>
                </div>
              ) : (
                classes.map((cls: any) => {
                  const analytics = classAnalytics.find((a: any) => a.id === cls.id)
                  const completion = analytics?.hwCompletionRate ?? 0
                  return (
                    <div key={cls.id} className="app-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(91,127,232,0.12)', border: '1px solid rgba(91,127,232,0.2)' }}>🏫</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate">{cls.name}</p>
                          <p className="text-xs font-bold app-muted">{analytics?.totalStudents ?? cls.students?.length ?? 0} students</p>
                        </div>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{
                          background: completion >= 60 ? 'rgba(76,175,106,0.12)' : 'rgba(245,166,35,0.12)',
                          color: completion >= 60 ? 'var(--app-success)' : 'var(--app-warning)',
                        }}>
                          {completion}% HW
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(70,75,96,0.1)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, background: completion >= 60 ? 'var(--app-success)' : 'var(--app-warning)' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TEACHERS TAB */}
          {tab === 2 && (
            <div className="page-section">
              <p className="section-label">{totalTeachers} Teachers</p>
              {totalTeachers === 0 ? (
                <div className="app-card empty-state">
                  <span className="empty-state-emoji">👩‍🏫</span>
                  <p className="empty-state-title">No teachers yet</p>
                  <p className="empty-state-sub">Teachers appear here once they join your school</p>
                </div>
              ) : (
                <div className="app-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(91,127,232,0.12)', border: '1px solid rgba(91,127,232,0.2)' }}>👩‍🏫</div>
                    <div>
                      <p className="font-black text-sm">{totalTeachers} active teacher{totalTeachers !== 1 ? 's' : ''}</p>
                      <p className="text-xs font-bold app-muted">Managing {totalClasses} class{totalClasses !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/admin')}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-white app-pressable"
                    style={{ background: 'linear-gradient(135deg, var(--role-teacher), var(--role-admin))' }}
                  >
                    Manage Teachers in Admin Panel →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
