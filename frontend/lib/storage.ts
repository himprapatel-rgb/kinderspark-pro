// Local storage helpers for settings persistence

export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage might be full or disabled
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function getSettings() {
  return getItem('kinderspark-settings', {
    dark: true,
    large: false,
    hc: false,
    dys: false,
    lang: 'en',
    stLimit: 10,
  })
}

export function saveSettings(settings: Record<string, any>) {
  setItem('kinderspark-settings', settings)
}
