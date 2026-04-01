'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { generateReport, getClasses } from '@/lib/api'
import { Printer } from 'lucide-react'
import { AppIcon } from '@/components/icons'

function ReportsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classId, setClassId] = useState(searchParams?.get('classId') || '')
  const [classes, setClasses] = useState<any[]>([])
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getClasses().then(setClasses).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!classId.trim()) { setError('Please select a class'); return }
    setLoading(true)
    setError('')
    try {
      const data = await generateReport(classId.trim())
      setReport(data.report)
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-8 app-container" style={{ background: 'var(--app-bg)' }}>
      <div className="p-5 pt-10" style={{ background: 'linear-gradient(135deg, var(--app-accent), #4A6ED0)' }}>
        <button onClick={() => router.back()} className="text-sm font-bold mb-4 flex items-center gap-1 app-pressable">← Back</button>
        <h1 className="font-black text-2xl inline-flex items-center gap-2"><AppIcon name="reports" size="sm" roleTone="teacher" decorative /> Weekly Report</h1>
        <p className="text-sm font-bold mt-1">AI-generated class summary</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: 'rgba(70, 75, 96, 0.75)' }}>Select Class</div>
          {classes.length > 0 ? (
            <div className="space-y-2">
              {classes.map(cls => (
                <button
                    key={cls.id}
                  onClick={() => setClassId(cls.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: classId === cls.id ? 'rgba(94,92,230,0.15)' : 'rgba(70,75,96,0.06)',
                    border: classId === cls.id ? '1.5px solid #5B7FE8' : '1.5px solid transparent',
                    color: classId === cls.id ? '#2d245d' : 'rgb(32,36,52)',
                  }}
                >
                  <span>{cls.name}</span>
                  <span className="text-xs" style={{ color: classId === cls.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                    {cls.grade} · {cls._count?.students ?? 0} students
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <input value={classId} onChange={e => setClassId(e.target.value)} placeholder="Enter class ID..."
              className="w-full px-3 py-2 rounded-xl font-bold text-sm outline-none"
              style={{ background: 'rgba(70,75,96,0.06)', color: 'rgb(32,36,52)' }} />
          )}
        </div>

        <button onClick={handleGenerate} disabled={loading || !classId}
          className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95 disabled:opacity-50 app-pressable"
          style={{ background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)' }}>
          {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating with AI...</span> : '✨ Generate Report'}
        </button>

        {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}

        {report && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="font-black text-base inline-flex items-center gap-1.5" style={{ color: 'rgb(32,36,52)' }}><AppIcon name="homework" size="xs" roleTone="teacher" decorative /> Weekly Report</div>
              <button onClick={() => window.print()} className="px-3 py-1 rounded-xl font-bold text-xs app-pressable inline-flex items-center gap-1.5" style={{ background: 'var(--app-surface-soft)', color: 'rgb(var(--foreground-rgb))', border: '1px solid var(--app-border)' }}><Printer size={14} /> Print</button>
            </div>
            <div className="font-bold text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(32,36,52,0.9)' }}>{report}</div>
            <div className="text-xs font-bold" style={{ color: 'rgba(70, 75, 96, 0.75)' }}>Generated by Claude AI • {new Date().toLocaleDateString()}</div>
          </div>
        )}

        {!report && !loading && (
          <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
            <div className="font-black text-sm mb-2" style={{ color: 'rgba(70, 75, 96, 0.9)' }}>How it works</div>
            <ul className="space-y-1">
              {['Select your class from the list above', 'Claude AI analyzes student progress', 'Receive a warm, parent-friendly report', 'Print and share with families'].map((tip, i) => (
                <li key={i} className="text-xs font-bold flex gap-2" style={{ color: 'rgba(70, 75, 96, 0.78)' }}><span>{i + 1}.</span><span>{tip}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsContent />
    </Suspense>
  )
}

