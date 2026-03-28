'use client'
import { useState } from 'react'
import { useLocation } from '@/hooks/useLocation'

export default function LocationCard() {
  const { permission, coords, loading, error, getCurrent, requestPermission } = useLocation()
  const [display, setDisplay] = useState<{ lat: number; lon: number } | null>(null)

  const handleGet = async () => {
    if (permission === 'prompt') await requestPermission()
    const c = await getCurrent()
    if (c) setDisplay(c)
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-black text-sm">Location</div>
        <button
          onClick={handleGet}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-black app-pressable"
          style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6', border: '1px solid rgba(94,92,230,0.3)' }}
        >
          {loading ? 'Checking…' : 'Update'}
        </button>
      </div>
      {error && <div className="text-[11px] font-bold" style={{ color: '#E05252' }}>Error: {error}</div>}
      <div className="text-xs font-bold app-muted">
        Permission: {permission}
      </div>
      <div className="text-xs font-bold mt-1">
        {display
          ? <>Lat {display.lat.toFixed(4)}, Lon {display.lon.toFixed(4)}</>
          : coords
            ? <>Lat {coords.lat.toFixed(4)}, Lon {coords.lon.toFixed(4)}</>
            : 'No location yet'}
      </div>
      <div className="text-[10px] app-muted mt-1">
        Tip: Set permission to “While Using” (or “Always” for geofenced attendance).
      </div>
    </div>
  )
}

