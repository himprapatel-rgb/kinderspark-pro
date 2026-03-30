// ── Multi-provider AI service ─────────────────────────────────────────────
// Drop-in replacement for claude.service.ts — same function signatures,
// now routes through the provider abstraction with automatic fallback.

import { aiComplete } from './router'
import {
  buildGenerateLessonPrompt,
  buildWeeklyReportPrompt,
  buildTutorFeedbackPrompt,
  buildSyllabusPrompt,
  buildStudentReportPrompt,
  buildHomeworkIdeaPrompt,
  buildRecommendationsPrompt,
  buildPoemListenPrompt,
  buildTutorHintSparkPrompt,
} from './promptTemplates'

export { getProviderStatus } from './router'

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Types (re-exported for consumers) ─────────────────────────────────────
export interface HomeworkIdea {
  title: string
  description: string
  moduleId: string
  emoji: string
  starsReward: number
  estimatedMinutes: number
  activities: Array<{ instruction: string; emoji: string }>
}

export interface GeneratedSyllabus {
  title: string
  icon: string
  color: string
  description: string
  items: Array<{ word: string; emoji: string; hint: string }>
}

// ── Functions ──────────────────────────────────────────────────────────────

export async function generateLesson(
  topic: string,
  count: number
): Promise<Array<{ w: string; e: string; hint: string }>> {
  const { text } = await aiComplete('generate-lesson', buildGenerateLessonPrompt(topic, count), { maxTokens: 1024 })
  return parseJSON(text)
}

export async function generateWeeklyReport(classData: string): Promise<string> {
  const { text } = await aiComplete('weekly-report', buildWeeklyReportPrompt(classData), { maxTokens: 300 })
  return text
}

export async function generateTutorFeedback(
  correct: number,
  total: number,
  topic: string,
  maxLevel: number
): Promise<string> {
  const { text } = await aiComplete(
    'tutor-feedback',
    `Give 2 sentences of warm encouraging feedback for a child who got ${correct}/${total} on a ${topic} quiz. Level ${maxLevel}/5. Use simple words for a 5-year-old.`,
    { maxTokens: 100 }
  )
  return text
}

export async function generateSyllabusAI(
  topic: string,
  grade: string,
  count: number
): Promise<GeneratedSyllabus> {
  const { text } = await aiComplete('generate-syllabus', buildSyllabusPrompt(topic, grade, count), { maxTokens: 1200 })
  return parseJSON(text)
}

export async function generateStudentReport(
  studentName: string,
  stars: number,
  hwDone: number,
  hwTotal: number,
  aiSessions: number,
  aiBestLevel: number
): Promise<string> {
  const { text } = await aiComplete(
    'student-report',
    `Write a warm, 2-sentence weekly progress report for parents of ${studentName}.
Stats: ${stars} stars earned, ${hwDone}/${hwTotal} homework completed, ${aiSessions} AI tutor sessions, reached AI level ${aiBestLevel}/5.
Be encouraging, specific, and positive. Start with "Dear Parents,".`,
    { maxTokens: 150 }
  )
  return text
}

export async function generateHomeworkIdea(
  topic: string,
  grade: string,
  studentCount: number
): Promise<HomeworkIdea> {
  const { text } = await aiComplete('generate-homework', buildHomeworkIdeaPrompt(topic, grade, studentCount), {
    maxTokens: 600,
  })
  return parseJSON(text)
}

export async function generateRecommendations(
  name: string,
  stars: number,
  progressSummary: string,
  sessionSummary: string
): Promise<Array<{ title: string; reason: string; moduleId: string }>> {
  const { text } = await aiComplete(
    'recommendations',
    buildRecommendationsPrompt(name, stars, progressSummary, sessionSummary),
    { maxTokens: 400 }
  )
  return parseJSON(text)
}

export interface GeneratedPoemResult {
  title: string
  poem: string
  provider: string
}

export async function generatePoemFromSpark(spark: string, targetMinutes: number): Promise<GeneratedPoemResult> {
  const { text, provider } = await aiComplete('poem-listen-spark', buildPoemListenPrompt(spark, targetMinutes), {
    maxTokens: 4096,
  })
  const parsed = parseJSON<{ title: string; poem: string }>(text)
  if (!parsed?.title || !parsed?.poem) throw new Error('Invalid poem response')
  return { title: parsed.title, poem: parsed.poem, provider }
}

export interface TutorHintSparkResult {
  hint: string
  provider: string
}

export async function generateTutorHintFromSpark(spark: string, topicContext: string): Promise<TutorHintSparkResult> {
  const { text, provider } = await aiComplete('tutor-hint-spark', buildTutorHintSparkPrompt(spark, topicContext), {
    maxTokens: 220,
  })
  const parsed = parseJSON<{ hint: string }>(text)
  if (!parsed?.hint) throw new Error('Invalid hint response')
  return { hint: parsed.hint.trim(), provider }
}
