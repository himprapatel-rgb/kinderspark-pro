import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

export async function generateLesson(topic: string, count: number): Promise<Array<{w: string, e: string, hint: string}>> {
  const msg = await anthropic.messages.create({
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
  const msg = await anthropic.messages.create({
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
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Give 2 sentences of warm encouraging feedback for a child who got ${correct}/${total} on a ${topic} quiz. Level ${maxLevel}/5. Use simple words for a 5-year-old.`
    }]
  })
  return msg.content.map((b: any) => b.text || '').join('').trim()
}
