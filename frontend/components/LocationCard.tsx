'use client'
import { useState, useEffect } from 'react'
import { useLocation } from '@/hooks/useLocation'

export default function LocationCard() {
  const { permission, coords, placeName, source, loading, error, getCurrent, requestPermission } = useLocation()
  const [display, setDisplay] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (coords) setDisplay(coords)
  }, [coords])

  const handleGet = async () => {
    if (permission === 'prompt') await requestPermission()
    const c = await getCurrent()
    if (c) setDisplay(c)
  }

  const label =
    placeName ||
    (display || coords
      ? `Lat ${(display || coords)!.lat.toFixed(3)}, Lon ${(display || coords)!.lon.toFixed(3)}`
      : null)

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="font-black text-sm">Location</div>
        <button
          type="button"
          onClick={handleGet}
          disabled={loading}
          className="min-h-9 px-3 py-2 rounded-xl text-xs font-black app-pressable"
          style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6', border: '1px solid rgba(94,92,230,0.3)' }}
        >
          {loading ? 'Checking…' : 'Update'}
        </button>
      </div>
      {error === 'permission_denied' && (
        <button
          type="button"
          onClick={() => requestPermission().then(() => getCurrent())}
          className="mb-2 w-full min-h-10 px-3 py-2 rounded-xl text-[11px] font-black app-pressable text-left"
          style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}
        >
          Enable location — open permission settings for this site
        </button>
      )}
      {error && error !== 'permission_denied' && (
        <div className="text-[11px] font-bold mb-1" style={{ color: '#E05252' }}>
          {error === 'geolocation_unavailable'
            ? 'Location is not available in this environment.'
            : `Error: ${error}`}
        </div>
      )}
      <div className="text-xs font-bold app-muted">Permission: {permission}</div>
      {source && (
        <div className="text-[10px] font-bold app-muted mt-0.5 capitalize">Source: {source}</div>
      )}
      <div className="text-xs font-bold mt-1" style={{ color: 'rgb(var(--foreground-rgb))' }}>
        {label || 'Tap Update — we use GPS when allowed, or approximate city from your network.'}
      </div>
      <div className="text-[10px] app-muted mt-1">
        Geofenced attendance is optional and separate — see Privacy in Settings.
      </div>
    </div>
  )
}
