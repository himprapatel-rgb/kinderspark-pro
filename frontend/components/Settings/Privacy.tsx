'use client'

import { useEffect, useState, useCallback } from 'react'
import { setGeofenceConsent, postGeofenceEvent, getGeofenceEvents } from '@/lib/api'
import { MapPin, Shield } from 'lucide-react'

/**
 * Opt-in geofence scaffold: consent + enter/exit events (no continuous tracking).
 */
export default function PrivacyGeofenceCard() {
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<Array<{ type: string; at: number; regionLabel?: string }>>([])
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await getGeofenceEvents()
      setConsent(!!res?.consent)
      setEvents(Array.isArray(res?.events) ? res.events : [])
    } catch {
      setEvents([])
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = async (enabled: boolean) => {
    setLoading(true)
    setMsg(null)
    try {
      await setGeofenceConsent(enabled)
      setConsent(enabled)
      setMsg(enabled ? 'Geofence events enabled (school region only).' : 'Geofence events off.')
      await refresh()
    } catch (e: any) {
      setMsg(e?.message || 'Could not update consent')
    } finally {
      setLoading(false)
    }
  }

  const sendTest = async (type: 'enter' | 'exit') => {
    setMsg(null)
    try {
      await postGeofenceEvent({ type, regionLabel: 'School (demo)' })
      await refresh()
      setMsg(type === 'enter' ? 'Recorded enter event.' : 'Recorded exit event.')
    } catch (e: any) {
      setMsg(e?.message || 'Event not recorded')
    }
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <div className="font-black text-base flex items-center gap-2">
        <Shield size={16} aria-hidden /> Privacy · Geofence
      </div>
      <p className="text-xs font-bold app-muted">
        Optional scaffold for school arrival/departure signals. No background trail — only enter/exit events when you opt in.
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">Allow geofence events</span>
        <button
          type="button"
          role="switch"
          aria-checked={consent}
          disabled={loading}
          onClick={() => toggle(!consent)}
          className="app-toggle app-pressable min-w-[52px] min-h-[32px]"
          data-on={consent}
        >
          <div className="app-toggle-knob" data-on={consent} />
        </button>
      </div>
      {consent && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sendTest('enter')}
            className="min-h-10 px-3 py-2 rounded-xl text-xs font-black app-pressable flex items-center gap-1.5"
            style={{ background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.35)' }}
          >
            <MapPin size={14} aria-hidden /> Test enter
          </button>
          <button
            type="button"
            onClick={() => sendTest('exit')}
            className="min-h-10 px-3 py-2 rounded-xl text-xs font-black app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
          >
            Test exit
          </button>
        </div>
      )}
      {msg && <p className="text-xs font-bold" style={{ color: 'var(--app-accent)' }}>{msg}</p>}
      <div className="rounded-xl p-3 min-h-[72px]" style={{ background: 'var(--app-surface-soft)', border: '1px dashed var(--app-border)' }}>
        <div className="text-[10px] font-black app-muted uppercase mb-2">Timeline (placeholder)</div>
        {events.length === 0 ? (
          <p className="text-xs font-bold app-muted">No enter/exit events yet.</p>
        ) : (
          <ul className="space-y-1 text-[11px] font-bold">
            {events.slice(-8).reverse().map((e, i) => (
              <li key={i}>
                {e.type === 'enter' ? 'Entered' : 'Exited'}
                {e.regionLabel ? ` · ${e.regionLabel}` : ''}{' '}
                <span className="app-muted font-semibold">{new Date(e.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
