'use client'
import { useEffect, useState, useCallback } from 'react'
import { isNative } from '@/lib/capacitor'
import { API_BASE } from '@/lib/api'

type LocationState = {
  permission: 'prompt' | 'granted' | 'denied'
  coords: { lat: number; lon: number } | null
  placeName?: string
  source?: 'capacitor' | 'browser' | 'ip'
  error?: string
  loading: boolean
}

async function fetchIpApproxLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch('https://ipwho.is/')
    const data = await res.json()
    if (!data?.success || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null
    return { lat: data.latitude, lon: data.longitude }
  } catch {
    return null
  }
}

async function reverseGeocode(coords: { lat: number; lon: number }): Promise<string | undefined> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}&zoom=10&addressdetails=1`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'KinderSpark-Pro/1.0 (education app)' },
  })
  if (!res.ok) return undefined
  const data = await res.json().catch(() => null)
  const addr = data?.address || {}
  const city = addr.city || addr.town || addr.village || addr.suburb
  const state = addr.state
  const country = addr.country_code ? String(addr.country_code).toUpperCase() : addr.country
  const parts = [city, state, country].filter(Boolean)
  return parts.length ? parts.join(', ') : data?.display_name
}

function browserGetPosition(opts: PositionOptions): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('geolocation_unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
      opts
    )
  })
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isNative()) {
      import('@capacitor/geolocation')
        .then(({ Geolocation }) =>
          Geolocation.checkPermissions().then((status) => {
            const value =
              status.location === 'granted' ? 'granted' : status.location === 'denied' ? 'denied' : 'prompt'
            setState((s) => ({ ...s, permission: value }))
          })
        )
        .catch(() => {})
      return
    }

    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((p) => {
          const v = p.state === 'granted' ? 'granted' : p.state === 'denied' ? 'denied' : 'prompt'
          setState((s) => ({ ...s, permission: v }))
          p.addEventListener('change', () => {
            const nv = p.state === 'granted' ? 'granted' : p.state === 'denied' ? 'denied' : 'prompt'
            setState((s) => ({ ...s, permission: nv }))
          })
        })
        .catch(() => {})
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<'prompt' | 'granted' | 'denied'> => {
    setState((s) => ({ ...s, loading: true }))
    try {
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation')
        const status = await Geolocation.requestPermissions()
        const value =
          status.location === 'granted' ? 'granted' : status.location === 'denied' ? 'denied' : 'prompt'
        setState((s) => ({ ...s, permission: value }))
        postDiag('PermissionResult', { value, via: 'capacitor' })
        return value
      }
      try {
        await browserGetPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 0 })
        setState((s) => ({ ...s, permission: 'granted' }))
        postDiag('PermissionResult', { value: 'granted', via: 'browser' })
        return 'granted'
      } catch {
        setState((s) => ({ ...s, permission: 'denied' }))
        postDiag('PermissionResult', { value: 'denied', via: 'browser' })
        return 'denied'
      }
    } catch (e: any) {
      setState((s) => ({ ...s, permission: 'denied', error: e?.message || 'permission_error' }))
      postDiag('PermissionError', { error: String(e?.message || e) })
      return 'denied'
    } finally {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [])

  const applyCoords = useCallback(
    async (coords: { lat: number; lon: number }, source: 'capacitor' | 'browser' | 'ip') => {
      const placeName = await reverseGeocode(coords).catch(() => undefined)
      setState((s) => ({ ...s, coords, placeName, source, loading: false, error: undefined }))
      postDiag('LocationOK', { via: source, ...coords })
      return coords
    },
    []
  )

  const getCurrent = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }))
    try {
      // PWA / desktop: never call Capacitor geolocation (unreliable on web builds).
      if (!isNative()) {
        try {
          const coords = await browserGetPosition({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000,
          })
          setState((s) => ({ ...s, permission: 'granted' }))
          return applyCoords(coords, 'browser')
        } catch {
          const ip = await fetchIpApproxLocation()
          if (ip) return applyCoords(ip, 'ip')
          setState((s) => ({
            ...s,
            error: 'permission_denied',
            loading: false,
          }))
          postDiag('LocationError', { error: 'browser_and_ip_failed' })
          return null
        }
      }

      let perm = state.permission
      if (perm === 'prompt') {
        perm = await requestPermission()
      }

      if (perm === 'granted') {
        try {
          const { Geolocation } = await import('@capacitor/geolocation')
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000,
          })
          return applyCoords(
            { lat: pos.coords.latitude, lon: pos.coords.longitude },
            'capacitor'
          )
        } catch (capErr: any) {
          postDiag('LocationFallback', { reason: String(capErr?.message || capErr) })
          try {
            const coords = await browserGetPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            })
            return applyCoords(coords, 'browser')
          } catch {
            const ip = await fetchIpApproxLocation()
            if (ip) return applyCoords(ip, 'ip')
            throw capErr
          }
        }
      }

      try {
        const coords = await browserGetPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        })
        return applyCoords(coords, 'browser')
      } catch {
        const ip = await fetchIpApproxLocation()
        if (ip) return applyCoords(ip, 'ip')
        setState((s) => ({
          ...s,
          error: perm === 'denied' ? 'permission_denied' : 'loc_error',
          loading: false,
        }))
        postDiag('LocationError', { error: 'all_sources_failed' })
        return null
      }
    } catch (e: any) {
      const ip = await fetchIpApproxLocation()
      if (ip) return applyCoords(ip, 'ip')
      setState((s) => ({ ...s, error: e?.message || 'loc_error', loading: false }))
      postDiag('LocationError', { error: String(e?.message || e) })
      return null
    }
  }, [applyCoords, requestPermission, state.permission])

  return { ...state, requestPermission, getCurrent }
}
