// Helper to get token and check auth state
// Uses localStorage directly to avoid SSR issues

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (!raw) return null
    const state = JSON.parse(raw)
    return state?.state?.token || null
  } catch {
    return null
  }
}

export function isLoggedIn(): boolean {
  return !!getToken()
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
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}
