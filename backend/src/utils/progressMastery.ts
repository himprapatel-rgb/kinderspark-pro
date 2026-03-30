export type MasteryLevel = 'not_started' | 'in_progress' | 'mastered'

export function computeMasteryLevel(
  score: number,
  attempts: number,
  cards: number,
  totalQuestions: number
): MasteryLevel {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
  if (s >= 80) return 'mastered'
  if (attempts > 0 || cards > 0 || s > 0 || totalQuestions > 0) return 'in_progress'
  return 'not_started'
}
