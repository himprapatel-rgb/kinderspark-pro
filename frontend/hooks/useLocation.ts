'use client'
import { useEffect, useState, useCallback } from 'react'
import { Geolocation, PermissionStatus } from '@capacitor/geolocation'
import { API_BASE } from '@/lib/api'

type LocationState = {
  permission: 'prompt' | 'granted' | 'denied'
  coords: { lat: number; lon: number } | null
  error?: string
  loading: boolean
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    permission: 'prompt',
    coords: null,
    loading: false,
  })

  const postDiag = (message: string, data: Record<string, unknown> = {}) => {
    fetch(`${API_BASE}/diag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hooks/useLocation',
        message,
        data,
        timestamp: Date.now(),
        hypothesisId: 'LOC',
      }),
    }).catch(() => {})
  }

  const requestPermission = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true }))
      const status: PermissionStatus = await Geolocation.requestPermissions()
      const value = status.location === 'granted' ? 'granted' : (status.location === 'denied' ? 'denied' : 'prompt')
      setState(s => ({ ...s, permission: value }))
      postDiag('PermissionResult', { value })
      return value
    } catch (e: any) {
      setState(s => ({ ...s, permission: 'denied', error: e?.message || 'permission_error' }))
      postDiag('PermissionError', { error: String(e?.message || e) })
      return 'denied'
    } finally {
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const getCurrent = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true, error: undefined }))
      const perm = state.permission === 'prompt' ? await requestPermission() : state.permission
      if (perm !== 'granted') {
        setState(s => ({ ...s, error: 'permission_denied', loading: false }))
        return null
      }
      // Try Capacitor Geolocation first (mobile/native). On web, this may proxy to navigator.geolocation.
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        })
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setState(s => ({ ...s, coords, loading: false }))
        postDiag('LocationOK', { via: 'capacitor', ...coords })
        return coords
      } catch (capErr: any) {
        // Fallback: Browser geolocation (PWA/Safari)
        postDiag('LocationFallback', { reason: String(capErr?.message || capErr) })
        const coords = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
          if (typeof window === 'undefined' || !('geolocation' in navigator)) {
            return reject(new Error('geolocation_unavailable'))
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            (e) => reject(e),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          )
        })
        setState(s => ({ ...s, coords, loading: false }))
        postDiag('LocationOK', { via: 'browser', ...coords })
        return coords
      }
    } catch (e: any) {
      setState(s => ({ ...s, error: e?.message || 'loc_error', loading: false }))
      postDiag('LocationError', { error: String(e?.message || e) })
      return null
    }
  }, [requestPermission, state.permission])

  useEffect(() => {
    // passive check current permission on mount
    Geolocation.checkPermissions()
      .then((status) => {
        const value = status.location === 'granted' ? 'granted' : (status.location === 'denied' ? 'denied' : 'prompt')
        setState(s => ({ ...s, permission: value }))
      })
      .catch(() => {})
  }, [])

  return { ...state, requestPermission, getCurrent }
}

