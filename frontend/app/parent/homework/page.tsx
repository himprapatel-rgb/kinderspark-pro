'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { getHomework, completeHomework } from '@/lib/api'

type Filter = 'all' | 'pending' | 'done'

export default function ParentHomeworkPage() {
  const router = useRouter()
  const user = useAppStore(s => s.currentStudent || s.user)
  const [homework, setHomework] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [completing, setCompleting] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const classId = (user as any)?.classId
    if (classId) {
      getHomework(classId)
        .then((data: any[]) => setHomework(data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const studentId = (user as any)?.id

  function isDone(hw: any) {
    if (!hw.completions) return hw.done === true
    return hw.completions.some((c: any) => c.studentId === studentId && c.done)
  }

  function isOverdue(hw: any) {
    if (!hw.dueDate) return false
    return new Date(hw.dueDate) < new Date() && !isDone(hw)
  }

  function isToday(hw: any) {
    if (!hw.dueDate) return false
    const d = new Date(hw.dueDate)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }

  function dueDateColor(hw: any) {
    if (isDone(hw)) return 'rgba(255,255,255,0.2)'
    if (isOverdue(hw)) return '#E05252'
    if (isToday(hw)) return '#F5A623'
    return 'rgba(255,255,255,0.4)'
  }

  const filtered = homework.filter(hw => {
    if (filter === 'done') return isDone(hw)
    if (filter === 'pending') return !isDone(hw)
    return true
  })

  const pendingCount = homework.filter(hw => !isDone(hw)).length

  async function markDone(hw: any) {
    if (!studentId) return
    setCompleting(hw.id)
    try {
      await completeHomework(hw.id, studentId)
      setHomework(prev => prev.map(h => h.id === hw.id
        ? { ...h, completions: [{ studentId, done: true }] }
        : h
      ))
      setToast('✅ Marked done!')
      setTimeout(() => setToast(''), 2000)
    } catch {
      setToast('Failed to update')
      setTimeout(() => setToast(''), 2000)
    }
    setCompleting(null)
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: `⏳ Pending (${pendingCount})` },
    { key: 'done', label: '✅ Done' },
  ]

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', fontFamily: 'Nunito, sans-serif', color: 'rgb(32,36,52)', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--app-accent), #4A6ED0)', borderBottom: '1px solid rgba(120,120,140,0.2)', padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="app-pressable" onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 12, width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>📋 Homework</h1>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Loading...' : `${homework.length} assignments · ${pendingCount} pending`}
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {FILTERS.map(f => (
            <button className="app-pressable"
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900,
                background: filter === f.key ? 'rgba(94,92,230,0.25)' : 'rgba(255,255,255,0.06)',
                color: filter === f.key ? '#5B7FE8' : 'rgba(255,255,255,0.4)',
                boxShadow: filter === f.key ? '0 0 0 1px rgba(94,92,230,0.4)' : '0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 20, background: 'var(--app-surface-soft)', border: '1px solid rgba(255,255,255,0.06)' }} />
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, margin: 0 }}>🎉</p>
            <p style={{ fontWeight: 900, fontSize: 18, marginTop: 12, color: 'rgb(32,36,52)' }}>
              {filter === 'done' ? 'No completed homework yet' : 'All homework done!'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700 }}>
              {filter === 'done' ? 'Completed homework will appear here' : 'Nothing pending right now'}
            </p>
          </div>
        )}

        {!loading && filtered.map(hw => {
          const done = isDone(hw)
          const overdue = isOverdue(hw)

          return (
            <div
              key={hw.id}
              style={{
                borderRadius: 20, padding: '14px 16px',
                background: done ? 'rgba(70,75,96,0.04)' : 'var(--app-surface)',
                border: `1px solid ${done ? 'rgba(120,120,140,0.2)' : overdue ? 'rgba(255,69,58,0.25)' : 'rgba(94,92,230,0.2)'}`,
                opacity: done ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ fontSize: 28, flexShrink: 0 }}>{done ? '✅' : overdue ? '🚨' : '📝'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'rgb(32,36,52)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hw.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {hw.dueDate && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: dueDateColor(hw) }}>
                      {overdue ? '⚠️ Overdue · ' : isToday(hw) ? '🔥 Due today · ' : '📅 '}
                      {new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {hw.starsReward && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#F5B731', background: 'rgba(255,214,10,0.12)', padding: '1px 6px', borderRadius: 8 }}>
                      ⭐ {hw.starsReward}
                    </span>
                  )}
                </div>
              </div>
              {!done && (
                <button className="app-pressable"
                  onClick={() => markDone(hw)}
                  disabled={completing === hw.id}
                  style={{
                    flexShrink: 0, padding: '7px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(48,209,88,0.15)', color: '#4CAF6A', fontSize: 11, fontWeight: 900,
                    boxShadow: '0 0 0 1px rgba(48,209,88,0.3)', opacity: completing === hw.id ? 0.5 : 1,
                  }}
                >
                  {completing === hw.id ? '...' : '✓ Done'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)', borderRadius: 14,
          padding: '10px 20px', fontSize: 13, fontWeight: 900, color: 'rgb(32,36,52)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
