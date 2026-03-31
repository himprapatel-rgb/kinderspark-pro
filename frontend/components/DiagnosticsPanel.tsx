'use client'

import { useCallback, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { getDiagRecent } from '@/lib/api'
import { Activity, ChevronDown, ChevronUp } from 'lucide-react'

type DiagEvent = { ts?: number; location?: string; message?: string; hypothesisId?: string; data?: unknown }

export default function DiagnosticsPanel() {
  const token = useAppStore((s) => s.token)
  const kpiEvents = useAppStore((s) => s.kpiEvents)
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState<DiagEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRemote = useCallback(async () => {
    if (!token) {
      setError('Sign in to load server diagnostics.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await getDiagRecent()
      setRemote(Array.isArray(res?.events) ? res.events : [])
    } catch {
      setError('Could not load diagnostics.')
    } finally {
      setLoading(false)
    }
  }, [token])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          if (!open) loadRemote()
        }}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left app-pressable min-h-[44px]"
        aria-expanded={open}
        aria-controls="diagnostics-panel-body"
      >
        <span className="font-black text-sm flex items-center gap-2">
          <Activity size={16} aria-hidden /> Diagnostics
        </span>
        {open ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
      </button>
      {open && (
        <div id="diagnostics-panel-body" className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--app-border)' }}>
          <p className="text-[11px] font-bold app-muted pt-2">
            Recent server events (no PII). Used for support and QA.
          </p>
          {error && <p className="text-xs font-bold text-red-400">{error}</p>}
          <button
            type="button"
            onClick={loadRemote}
            disabled={loading}
            className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-black app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
          >
            {loading ? 'Loading…' : 'Reload'}
          </button>
          <div className="rounded-xl p-2 max-h-40 overflow-y-auto text-[10px] font-mono" style={{ background: 'var(--app-surface-soft)' }}>
            {remote.length === 0 ? (
              <span className="app-muted">No events yet.</span>
            ) : (
              remote
                .slice(-30)
                .reverse()
                .map((e, i) => (
                  <div key={i} className="py-1 border-b border-white/5">
                    <span className="opacity-60">{e.ts ? new Date(e.ts).toISOString().slice(11, 19) : '—'}</span>{' '}
                    <span className="font-bold">{e.message || e.location || 'event'}</span>
                    {e.hypothesisId ? <span className="text-purple-300"> [{e.hypothesisId}]</span> : null}
                  </div>
                ))
            )}
          </div>
          <div className="text-[11px] font-black app-muted">Local KPI (this device)</div>
          <div className="rounded-xl p-2 max-h-28 overflow-y-auto text-[10px]" style={{ background: 'var(--app-surface-soft)' }}>
            {kpiEvents.length === 0 ? (
              <span className="app-muted">None recorded.</span>
            ) : (
              kpiEvents
                .slice(-15)
                .reverse()
                .map((e) => (
                  <div key={e.id} className="py-0.5">
                    {e.name} <span className="opacity-50">{e.category}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
