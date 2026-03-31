import type { Module } from './modules'
import { MODS } from './modules'

/** Curated order: easier → broader skills (Duolingo-style path, KinderSpark themes). */
export const LEARN_PATH_ORDER: string[] = [
  'numbers',
  'letters',
  'colors',
  'shapes',
  'animals',
  'fruits',
  'numbers2',
  'words',
  'words2',
  'words3',
  'body',
  'family',
  'feelings',
  'habits',
  'manners',
  'food',
  'vehicles',
  'weather',
]

export function orderedPathMods(): Module[] {
  const byId = new Map(MODS.map((m) => [m.id, m]))
  const out: Module[] = []
  for (const id of LEARN_PATH_ORDER) {
    const m = byId.get(id)
    if (m) out.push(m)
  }
  for (const m of MODS) {
    if (!out.some((x) => x.id === m.id)) out.push(m)
  }
  return out
}

function isModuleComplete(
  m: Module,
  progress: Record<string, number>,
  forceCompleteIds?: Set<string>
): boolean {
  if (forceCompleteIds?.has(m.id)) return true
  return (progress[m.id] || 0) >= m.items.length
}

/** First path module that is not fully complete. */
export function getRecommendedNextModule(
  path: Module[],
  progress: Record<string, number>
): Module | null {
  for (const m of path) {
    if (!isModuleComplete(m, progress)) return m
  }
  return null
}

/** Next incomplete module after `currentId`, or wrap to any incomplete. */
export function getNextModuleAfter(
  path: Module[],
  currentId: string,
  progress: Record<string, number>,
  treatCurrentComplete?: boolean
): Module | null {
  const force = treatCurrentComplete ? new Set([currentId]) : undefined
  const i = path.findIndex((m) => m.id === currentId)
  for (let j = i + 1; j < path.length; j++) {
    const m = path[j]
    if (!isModuleComplete(m, progress, force)) return m
  }
  for (let j = 0; j < path.length; j++) {
    const m = path[j]
    if (m.id === currentId && !treatCurrentComplete) continue
    if (!isModuleComplete(m, progress, force)) return m
  }
  return null
}

const PRACTICE_KEY = (id: string) => `ks_practice_${id}`
const STALE_REVIEW_MS = 3 * 24 * 60 * 60 * 1000

/** Modules completed a while ago — good candidates for light review. */
export function getReviewModuleIds(
  path: Module[],
  progress: Record<string, number>,
  now: number = Date.now()
): string[] {
  if (typeof window === 'undefined') return []
  const out: string[] = []
  for (const m of path) {
    const c = progress[m.id] || 0
    if (c < m.items.length) continue
    const last = parseInt(localStorage.getItem(PRACTICE_KEY(m.id)) || '0', 10)
    if (last && now - last > STALE_REVIEW_MS) out.push(m.id)
  }
  if (out.length > 0) return out.slice(0, 4)
  const done = path.filter((m) => (progress[m.id] || 0) >= m.items.length)
  return done.slice(0, 2).map((m) => m.id)
}

export function touchPracticeTimestamp(moduleId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRACTICE_KEY(moduleId), String(Date.now()))
}

/** Rough kid-friendly session length from card count. */
export function estimateLessonMinutes(cardCount: number): number {
  if (cardCount <= 0) return 2
  return Math.max(2, Math.min(12, Math.round(cardCount * 0.35)))
}
