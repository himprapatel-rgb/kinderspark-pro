import prisma from '../prisma/client'

export interface BadgeInfo { type: string; emoji: string; label: string }

const RULES: Array<BadgeInfo & { check: (s: any, ctx: any) => boolean }> = [
  { type: 'first_homework',  emoji: '🏅', label: 'First Homework Done!',  check: (_s, ctx) => ctx?.hwCount === 1 },
  { type: 'first_ai',       emoji: '🤖', label: 'First AI Session!',      check: (s)        => s.aiSessions >= 1 },
  { type: 'stars_50',       emoji: '⭐', label: '50 Stars Earned!',        check: (s)        => s.stars >= 50 },
  { type: 'stars_100',      emoji: '🌟', label: '100 Stars!',              check: (s)        => s.stars >= 100 },
  { type: 'stars_500',      emoji: '💫', label: '500 Stars Superstar!',    check: (s)        => s.stars >= 500 },
  { type: 'ai_level_3',     emoji: '🧠', label: 'AI Level 3 Reached!',    check: (s)        => s.aiBestLevel >= 3 },
  { type: 'ai_level_5',     emoji: '🏆', label: 'AI Level 5 Champion!',   check: (s)        => s.aiBestLevel >= 5 },
  { type: 'perfect_score',  emoji: '🎯', label: 'Perfect Score!',          check: (_s, ctx) => ctx?.accuracy === 100 },
  { type: 'streak_3',       emoji: '🔥', label: '3-Day Streak!',           check: (s)        => s.streak >= 3 },
  { type: 'streak_7',       emoji: '🌈', label: '7-Day Streak!',           check: (s)        => s.streak >= 7 },
]

export async function checkAndAwardBadges(
  studentId: string,
  context: { hwCount?: number; accuracy?: number } = {}
): Promise<BadgeInfo[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { badges: true },
  })
  if (!student) return []

  const earned = new Set(student.badges.map((b: any) => b.type))
  const newBadges: BadgeInfo[] = []

  for (const rule of RULES) {
    if (!earned.has(rule.type) && rule.check(student, context)) {
      try {
        await prisma.badge.create({ data: { studentId, type: rule.type } })
        newBadges.push({ type: rule.type, emoji: rule.emoji, label: rule.label })
      } catch { /* unique constraint — already awarded race condition */ }
    }
  }
  return newBadges
}

export function getBadgeInfo(type: string): BadgeInfo {
  return RULES.find(r => r.type === type) ?? { type, emoji: '🏅', label: type }
}

export const ALL_BADGES = RULES.map(({ type, emoji, label }) => ({ type, emoji, label }))
