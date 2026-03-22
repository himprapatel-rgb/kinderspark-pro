import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export async function generateLesson(topic: string, count: number): Promise<Array<{w: string, e: string, hint: string}>> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a kindergarten curriculum designer. Generate exactly ${count} learning flashcards for children aged 3-6 about: "${topic}". Each card needs: word/phrase (w), relevant emoji (e), short child-friendly hint (hint, max 8 words). Respond ONLY with valid JSON array, no markdown: [{"w":"Cat","e":"🐱","hint":"Says meow and loves cuddles!"}]`
    }]
  })
  const text = msg.content.map((b: any) => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

export async function generateWeeklyReport(classData: string): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Write a warm, encouraging 3-sentence weekly class report for parents. Class data: ${classData}. Be positive and specific.`
    }]
  })
  return msg.content.map((b: any) => b.text || '').join('').trim()
}

export async function generateTutorFeedback(correct: number, total: number, topic: string, maxLevel: number): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Give 2 sentences of warm encouraging feedback for a child who got ${correct}/${total} on a ${topic} quiz. Level ${maxLevel}/5. Use simple words for a 5-year-old.`
    }]
  })
  return msg.content.map((b: any) => b.text || '').join('').trim()
}

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

export async function generateSyllabusAI(topic: string, grade: string, count: number): Promise<GeneratedSyllabus> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are a kindergarten curriculum designer. Create a complete learning syllabus for ${grade} on topic: "${topic}".
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
}`
    }]
  })
  const text = msg.content.map((b: any) => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

export async function generateStudentReport(
  studentName: string,
  stars: number,
  hwDone: number,
  hwTotal: number,
  aiSessions: number,
  aiBestLevel: number
): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Write a warm, 2-sentence weekly progress report for parents of ${studentName}.
Stats: ${stars} stars earned, ${hwDone}/${hwTotal} homework completed, ${aiSessions} AI tutor sessions, reached AI level ${aiBestLevel}/5.
Be encouraging, specific, and positive. Start with "Dear Parents,".`
    }]
  })
  return msg.content.map((b: any) => b.text || '').join('').trim()
}

export async function generateHomeworkIdea(
  topic: string,
  grade: string,
  studentCount: number
): Promise<HomeworkIdea> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a kindergarten teacher creating homework for ${studentCount} children in ${grade}.
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
}`
    }]
  })
  const text = msg.content.map((b: any) => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

export async function generateRecommendations(
  name: string,
  stars: number,
  progressSummary: string,
  sessionSummary: string
): Promise<Array<{ title: string; reason: string; moduleId: string }>> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a kindergarten learning advisor. Based on this student data:
Name: ${name}, Stars: ${stars}
Progress: ${progressSummary || 'none yet'}
Recent AI sessions: ${sessionSummary || 'none yet'}

Recommend exactly 3 learning activities. Choose from these moduleIds: numbers, numbers2, alphabet, sightwords, colors, shapes, animals.
Respond ONLY with valid JSON array: [{"title":"Learn Colors","reason":"Short encouraging reason (max 10 words)","moduleId":"colors"}]`
    }]
  })
  const text = msg.content.map((b: any) => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}
