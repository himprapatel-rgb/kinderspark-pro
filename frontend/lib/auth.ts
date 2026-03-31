// Cookie-first auth helpers.

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (!raw) return false
    const state = JSON.parse(raw)
    return !!state?.state?.user && !!state?.state?.role
  } catch {
    return false
  }
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (!raw) return null
    const state = JSON.parse(raw)
    return state?.state?.role || null
  } catch {
    return null
  }
}

export function getAuthHeaders(): Record<string, string> {
  return {}
}
