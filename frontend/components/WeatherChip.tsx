'use client'
import { useEffect, useState } from 'react'

type WeatherChipProps = {
  variant?: 'light' | 'dark'
}

type WeatherView = {
  temp: number
  code: number
  isDay: number
  place: string
  source: 'geo' | 'fallback'
}

const CACHE_KEY = 'ks_weather_v1'
const CACHE_MS = 20 * 60 * 1000
const FALLBACK = { lat: 53.3498, lon: -6.2603, place: 'School area' }

function codeToIcon(code: number, isDay: number) {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if ([1, 2].includes(code)) return isDay ? '🌤️' : '☁️'
  if (code === 3) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌈'
}

async function fetchWeather(lat: number, lon: number, place: string, source: 'geo' | 'fallback'): Promise<WeatherView | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,weather_code,is_day&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (!data?.current) return null
  return {
    temp: Math.round(data.current.temperature_2m),
    code: Number(data.current.weather_code ?? 0),
    isDay: Number(data.current.is_day ?? 1),
    place,
    source,
  }
}

function getGeo(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

export default function WeatherChip({ variant = 'light' }: WeatherChipProps) {
  const [weather, setWeather] = useState<WeatherView | null>(null)
  const [loading, setLoading] = useState(true)
  const [locationStatus, setLocationStatus] = useState<'ok' | 'blocked' | 'fallback'>('ok')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        let hadCachedFallback = false
        if (raw) {
          const cached = JSON.parse(raw)
          if (cached?.expiresAt && cached?.value && Date.now() < cached.expiresAt) {
            setWeather(cached.value)
            hadCachedFallback = cached.value?.source === 'fallback'
            if (!hadCachedFallback) {
              setLoading(false)
              return
            }
          }
        }

        let value: WeatherView | null = null
        try {
          if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
            const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
            if (perm.state === 'denied') setLocationStatus('blocked')
          }
          const geo = await getGeo()
          value = await fetchWeather(geo.lat, geo.lon, 'Near you', 'geo')
          setLocationStatus('ok')
        } catch {
          value = await fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.place, 'fallback')
          setLocationStatus((s) => (s === 'blocked' ? 'blocked' : 'fallback'))
        }

        if (!cancelled && value) {
          setWeather(value)
          // Keep fallback cache shorter so we retry live location soon.
          const ttl = value.source === 'geo' ? CACHE_MS : 5 * 60 * 1000
          localStorage.setItem(CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + ttl, value }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black app-pressable'
  const skin = variant === 'light' ? 'app-btn-glass text-white' : 'app-btn-soft'

  return (
    <div className={`${base} ${skin}`} aria-live="polite">
      {loading ? (
        <span>Weather…</span>
      ) : weather ? (
        <>
          <span>{codeToIcon(weather.code, weather.isDay)}</span>
          <span>{weather.temp}°C</span>
          <span className={variant === 'light' ? 'text-white/80' : 'app-muted'}>
            · {locationStatus === 'blocked' ? 'Location blocked' : weather.place}
          </span>
        </>
      ) : (
        <span>Weather unavailable</span>
      )}
    </div>
  )
}

