/**
 * Rich learner context for AI prompts and internal "platform team" agents.
 * Pulls legacy Student row + optional ecosystem ParentChild links (caregivers).
 */

import prisma from '../prisma/client'
import { sanitizePromptInput } from '../utils/sanitize'

export interface StudentAgentContext {
  legacyStudentId: string
  name: string
  age: number
  grade: string | null
  className: string
  stars: number
  streak: number
  aiSessions: number
  aiBestLevel: number
  guardians: Array<{ displayName: string; relationType: string; isPrimary: boolean }>
  progressSummary: string
  recentSessionsSummary: string
  homeworkCompleted: number
}

function safeLabel(s: string, max: number): string {
  return sanitizePromptInput(s, max) || '—'
}

/** Load one legacy student + class, progress, sessions, homework completions, linked caregiver display names. */
export async function getStudentAgentContext(legacyStudentId: string): Promise<StudentAgentContext | null> {
  if (!legacyStudentId) return null

  const student = await prisma.student.findUnique({
    where: { id: legacyStudentId },
    include: {
      class: { select: { name: true } },
      progress: { orderBy: { updatedAt: 'desc' }, take: 14 },
      aiSessionLogs: { orderBy: { createdAt: 'desc' }, take: 8 },
      _count: { select: { completions: { where: { done: true } } } },
    },
  })
  if (!student) return null

  const profile = await prisma.studentProfile.findFirst({
    where: { legacyStudentId },
    include: {
      parentLinks: {
        include: {
          parentProfile: {
            include: { user: { select: { displayName: true } } },
          },
        },
      },
    },
  })

  const guardians =
    profile?.parentLinks.map((link) => ({
      displayName: link.parentProfile.user.displayName || 'Parent',
      relationType: link.relationType || 'guardian',
      isPrimary: link.isPrimary,
    })) ?? []

  const progressSummary = student.progress.length
    ? student.progress.map((p) => `${p.moduleId}:${p.cards}`).join(', ')
    : 'none yet'

  const recentSessionsSummary = student.aiSessionLogs.length
    ? student.aiSessionLogs
        .map((s) => `${s.topic} ${s.correct}/${s.total} lv${s.maxLevel}`)
        .join('; ')
    : 'none yet'

  return {
    legacyStudentId: student.id,
    name: student.name,
    age: student.age,
    grade: student.grade ?? null,
    className: student.class.name,
    stars: student.stars,
    streak: student.streak,
    aiSessions: student.aiSessions,
    aiBestLevel: student.aiBestLevel,
    guardians,
    progressSummary,
    recentSessionsSummary,
    homeworkCompleted: student._count.completions,
  }
}

/** Multi-line block for LLM system/user prompts (internal use). */
export function formatStudentAgentContextBlock(ctx: StudentAgentContext): string {
  const g = ctx.guardians.length
    ? ctx.guardians
        .map((x) => `${safeLabel(x.displayName, 80)} (${x.relationType}${x.isPrimary ? ', primary' : ''})`)
        .join('; ')
    : 'not linked in app (no caregiver names on file)'

  return [
    `Child: ${safeLabel(ctx.name, 60)} (age ${ctx.age})`,
    `Class: ${safeLabel(ctx.className, 60)}${ctx.grade ? `; grade: ${safeLabel(ctx.grade, 24)}` : ''}`,
    `Engagement: ${ctx.stars} stars, ${ctx.streak}-day streak; AI tutor sessions (lifetime): ${ctx.aiSessions}, best level ${ctx.aiBestLevel}/5`,
    `Caregivers / family linked in app: ${g}`,
    `Module progress (cards): ${sanitizePromptInput(ctx.progressSummary, 500)}`,
    `Recent AI tutor topics: ${sanitizePromptInput(ctx.recentSessionsSummary, 500)}`,
    `Homework items completed (records): ${ctx.homeworkCompleted}`,
  ].join('\n')
}

/** One compact line for scheduler / digest (many students). */
export function formatStudentAgentContextOneLine(ctx: StudentAgentContext): string {
  const g = ctx.guardians.length
    ? ctx.guardians.map((x) => safeLabel(x.displayName, 40)).join(', ')
    : 'no linked caregivers'
  return `${safeLabel(ctx.name, 40)}, age ${ctx.age}, class ${safeLabel(ctx.className, 36)}; caregivers: ${g}; progress: ${sanitizePromptInput(ctx.progressSummary, 200)}; recent AI: ${sanitizePromptInput(ctx.recentSessionsSummary, 200)}`
}

/**
 * Batch digest for autonomous agents (platform team). De-dupes ids and caps count.
 */
export async function buildLearnerDigestForAgentPrompt(studentIds: string[], maxStudents = 14): Promise<string> {
  const unique = [...new Set(studentIds.filter(Boolean))].slice(0, maxStudents)
  if (!unique.length) return ''

  const contexts = await Promise.all(unique.map((id) => getStudentAgentContext(id)))
  const lines = contexts.filter(Boolean).map((c) => formatStudentAgentContextOneLine(c!))

  if (!lines.length) return ''

  return [
    'Per-learner snapshot (names, ages, class, linked caregivers, learning patterns). Internal team context only.',
    ...lines.map((l, i) => `${i + 1}. ${l}`),
  ].join('\n')
}
