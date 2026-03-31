// ── Multi-provider AI service ─────────────────────────────────────────────
// Drop-in replacement for claude.service.ts — same function signatures,
// now routes through the provider abstraction with automatic fallback.
//
// ██████████████████████████████████████████████████████████████████████████
// HARDCORE RULE: Every AI response MUST be cached before returning.
// Check cache before calling AI. Save to cache after getting AI response.
// See .claude/rules/ai-cache.md for the full rule.
// ██████████████████████████████████████████████████████████████████████████

import { aiComplete } from './router'
import { makeCacheKey, getCachedResponse, setCachedResponse } from '../cache.service'
import { buildPoemListenPrompt, buildTutorHintSparkPrompt } from './promptTemplates'

export { getProviderStatus } from './router'

const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

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
  const cacheKey = makeCacheKey('lesson', { topic, count })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return parseJSON(cached)

  const { text } = await aiComplete(
    'generate-lesson',
    `You are a kindergarten curriculum designer. Generate exactly ${count} learning flashcards for children aged 3-6 about: "${topic}". Each card needs: word/phrase (w), relevant emoji (e), short child-friendly hint (hint, max 8 words). Respond ONLY with valid JSON array, no markdown: [{"w":"Cat","e":"🐱","hint":"Says meow and loves cuddles!"}]`,
    { maxTokens: 1024 }
  )
  await setCachedResponse(cacheKey, 'lesson', text, AI_MODEL)
  return parseJSON(text)
}

export async function generateWeeklyReport(classData: string): Promise<string> {
  const cacheKey = makeCacheKey('report', { classData })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return cached

  const { text } = await aiComplete(
    'weekly-report',
    `Write a warm, encouraging 3-sentence weekly class report for parents. Class data: ${classData}. Be positive and specific.`,
    { maxTokens: 300 }
  )
  await setCachedResponse(cacheKey, 'report', text, AI_MODEL)
  return text
}

export async function generateTutorFeedback(
  correct: number,
  total: number,
  topic: string,
  maxLevel: number,
  learnerContext?: string,
  memoryBlock?: string,
): Promise<string> {
  const cacheKey = makeCacheKey('feedback', { correct, total, topic, maxLevel, learnerContext, memoryBlock })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return cached

  const { text } = await aiComplete(
    'tutor-feedback',
    `Give 2 sentences of warm encouraging feedback for a child who got ${correct}/${total} on a ${topic} quiz. Level ${maxLevel}/5. Use simple words for a 5-year-old.`,
    { maxTokens: 100 }
  )
  await setCachedResponse(cacheKey, 'feedback', text, AI_MODEL)
  return text
}

export async function generateSyllabusAI(
  topic: string,
  grade: string,
  count: number
): Promise<GeneratedSyllabus> {
  const cacheKey = makeCacheKey('syllabus', { topic, grade, count })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return parseJSON(cached)

  const { text } = await aiComplete(
    'generate-syllabus',
    `You are a kindergarten curriculum designer. Create a complete learning syllabus for ${grade} on topic: "${topic}".
Respond ONLY with valid JSON (no markdown):
{
  "title": "short catchy title (max 5 words)",
  "icon": "single most relevant emoji",
  "color": "a bright hex color e.g. #FF9F0A or #5E5CE6 or #30D158 or #BF5AF2 or #FF6B35",
  "description": "one sentence description for teachers",
  "items": [
    {"word": "item name", "emoji": "relevant emoji", "hint": "child-friendly hint max 8 words"},
    ... exactly ${count} items
  ]
}`,
    { maxTokens: 1200 }
  )
  await setCachedResponse(cacheKey, 'syllabus', text, AI_MODEL)
  return parseJSON(text)
}

export async function generateStudentReport(
  studentName: string,
  stars: number,
  hwDone: number,
  hwTotal: number,
  aiSessions: number,
  aiBestLevel: number,
  learnerContext?: string,
): Promise<string> {
  const cacheKey = makeCacheKey('report', { studentName, stars, hwDone, hwTotal, aiSessions, aiBestLevel, learnerContext })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return cached

  const { text } = await aiComplete(
    'student-report',
    `Write a warm, 2-sentence weekly progress report for parents of ${studentName}.
Stats: ${stars} stars earned, ${hwDone}/${hwTotal} homework completed, ${aiSessions} AI tutor sessions, reached AI level ${aiBestLevel}/5.
Be encouraging, specific, and positive. Start with "Dear Parents,".`,
    { maxTokens: 150 }
  )
  await setCachedResponse(cacheKey, 'report', text, AI_MODEL)
  return text
}

export async function generateHomeworkIdea(
  topic: string,
  grade: string,
  studentCount: number
): Promise<HomeworkIdea> {
  const cacheKey = makeCacheKey('homework', { topic, grade, studentCount })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return parseJSON(cached)

  const { text } = await aiComplete(
    'generate-homework',
    `You are a kindergarten teacher creating homework for ${studentCount} children in ${grade}.
Topic: "${topic}"

Generate a fun, age-appropriate homework assignment. Respond ONLY with valid JSON (no markdown):
{
  "title": "fun emoji-rich title (max 8 words)",
  "description": "one encouraging sentence for parents (max 15 words)",
  "moduleId": "best matching moduleId from: numbers, numbers2, alphabet, sightwords, colors, shapes, animals, fruits, vehicles, feelings, habits, food, weather",
  "emoji": "single most relevant emoji",
  "starsReward": <number 5-15 based on difficulty>,
  "estimatedMinutes": <number 5-15>,
  "activities": [
    {"instruction": "short child-friendly activity (max 10 words)", "emoji": "relevant emoji"},
    {"instruction": "short child-friendly activity (max 10 words)", "emoji": "relevant emoji"},
    {"instruction": "short child-friendly activity (max 10 words)", "emoji": "relevant emoji"}
  ]
}`,
    { maxTokens: 600 }
  )
  await setCachedResponse(cacheKey, 'homework', text, AI_MODEL)
  return parseJSON(text)
}

export async function generateRecommendations(
  name: string,
  stars: number,
  progressSummary: string,
  sessionSummary: string,
  learnerContext?: string,
): Promise<Array<{ title: string; reason: string; moduleId: string }>> {
  const cacheKey = makeCacheKey('recommendations', { name, stars, progressSummary, sessionSummary, learnerContext })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return parseJSON(cached)

  const { text } = await aiComplete(
    'recommendations',
    `You are a kindergarten learning advisor. Based on this student data:
Name: ${name}, Stars: ${stars}
Progress: ${progressSummary || 'none yet'}
Recent AI sessions: ${sessionSummary || 'none yet'}

Recommend exactly 3 learning activities. Choose from these moduleIds: numbers, numbers2, alphabet, sightwords, colors, shapes, animals.
Respond ONLY with valid JSON array: [{"title":"Learn Colors","reason":"Short encouraging reason (max 10 words)","moduleId":"colors"}]`,
    { maxTokens: 400 }
  )
  await setCachedResponse(cacheKey, 'recommendations', text, AI_MODEL)
  return parseJSON(text)
}

export interface GeneratedPoemResult {
  title: string
  poem: string
  provider: string
}

export async function generatePoemFromSpark(
  spark: string,
  targetMinutes: number,
  learnerContext?: string,
): Promise<GeneratedPoemResult> {
  const cacheKey = makeCacheKey('poem', { spark, targetMinutes, learnerContext })
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    const parsed = parseJSON<{ title: string; poem: string; provider: string }>(cached)
    return parsed
  }

  const { text, provider } = await aiComplete(
    'poem-listen-spark',
    buildPoemListenPrompt(spark, targetMinutes, learnerContext),
    { maxTokens: 4096 }
  )
  const parsed = parseJSON<{ title: string; poem: string }>(text)
  if (!parsed?.title || !parsed?.poem) throw new Error('Invalid poem response')
  const result: GeneratedPoemResult = { title: parsed.title, poem: parsed.poem, provider }
  await setCachedResponse(cacheKey, 'poem', JSON.stringify(result), AI_MODEL)
  return result
}

export interface TutorHintSparkResult {
  hint: string
  provider: string
}

export async function generateTutorHintFromSpark(
  spark: string,
  topicContext: string,
  learnerContext?: string,
): Promise<TutorHintSparkResult> {
  const cacheKey = makeCacheKey('tutor-hint', { spark, topicContext, learnerContext })
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    const parsed = parseJSON<{ hint: string; provider: string }>(cached)
    return parsed
  }

  const { text, provider } = await aiComplete(
    'tutor-hint-spark',
    buildTutorHintSparkPrompt(spark, topicContext, learnerContext),
    { maxTokens: 220 }
  )
  const parsed = parseJSON<{ hint: string }>(text)
  if (!parsed?.hint) throw new Error('Invalid hint response')
  const result: TutorHintSparkResult = { hint: parsed.hint.trim(), provider }
  await setCachedResponse(cacheKey, 'tutor-hint', JSON.stringify(result), AI_MODEL)
  return result
}
