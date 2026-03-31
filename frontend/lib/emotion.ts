export type Mood = 'happy' | 'excited' | 'okay' | 'sad' | 'tired'

const MOOD_KEY = (studentId: string, day: string) => `ks_mood_${studentId}_${day}`

export function getTodayMood(studentId?: string): Mood | null {
  if (typeof window === 'undefined' || !studentId) return null
  const today = new Date().toISOString().slice(0, 10)
  const v = localStorage.getItem(MOOD_KEY(studentId, today))
  if (v === 'happy' || v === 'excited' || v === 'okay' || v === 'sad' || v === 'tired') return v
  return null
}

export function setTodayMood(studentId: string, mood: Mood) {
  if (typeof window === 'undefined' || !studentId) return
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(MOOD_KEY(studentId, today), mood)
}

export function gentleMode(mood: Mood | null): boolean {
  return mood === 'sad' || mood === 'tired'
}

