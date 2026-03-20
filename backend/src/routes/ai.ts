import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import Anthropic from 'anthropic'

const router = Router()
const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/ai/generate-lesson
router.post('/generate-lesson', async (req: Request, res: Response) => {
  try {
    const { topic, count } = req.body
    const cardCount = Math.min(count || 10, 20)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate ${cardCount} flashcard items for kindergarten children learning about: "${topic}".
Return ONLY a JSON array (no markdown, no explanation) with this exact format:
[{"w":"word","e":"emoji","hint":"simple hint"}]

Rules:
- Words should be simple and appropriate for ages 4-6
- Each emoji should match the word
- Hints should be very short (3-6 words)
- Return exactly ${cardCount} items`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'

    // Parse JSON from response
    let items = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0])
      }
    } catch {
      items = []
    }

    res.json({ items })
  } catch (error) {
    console.error('AI generate lesson error:', error)
    // Return fallback items
    res.json({
      items: [
        { w: 'Apple', e: '🍎', hint: 'A red fruit' },
        { w: 'Ball', e: '⚽', hint: 'You kick it' },
        { w: 'Cat', e: '🐱', hint: 'Says meow' },
        { w: 'Dog', e: '🐶', hint: 'Man\'s best friend' },
        { w: 'Elephant', e: '🐘', hint: 'Has a trunk' },
      ],
    })
  }
})

// POST /api/ai/weekly-report
router.post('/weekly-report', async (req: Request, res: Response) => {
  try {
    const { classId } = req.body

    const students = await prisma.student.findMany({
      where: { classId },
      include: { progress: true, aiSessionLogs: { take: 5, orderBy: { createdAt: 'desc' } } },
    })

    const summary = students.map(s => (
      `${s.name}: ${s.stars} stars, streak ${s.streak} days, ${s.aiSessions} AI sessions`
    )).join('; ')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Write a warm, encouraging 3-sentence weekly progress report for a kindergarten class.
Student data: ${summary}
The report should be addressed to parents, be positive and specific, and mention highlights. Keep it under 80 words.`,
        },
      ],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''
    res.json({ report })
  } catch (error) {
    console.error('AI weekly report error:', error)
    res.json({
      report: 'Your children have had a wonderful week of learning! They are showing great progress with letters, numbers, and creative activities. Keep encouraging their curiosity and enthusiasm for learning at home!',
    })
  }
})

// POST /api/ai/tutor-feedback
router.post('/tutor-feedback', async (req: Request, res: Response) => {
  try {
    const { correct, total, topic, maxLevel } = req.body

    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `Write exactly 2 short encouraging sentences of feedback for a kindergarten student who just completed an AI quiz.
Topic: ${topic}
Score: ${correct}/${total} (${accuracy}% accuracy)
Highest level reached: ${maxLevel}
Make it warm, fun, and age-appropriate. Use 1-2 emojis. Keep it under 40 words total.`,
        },
      ],
    })

    const feedback = message.content[0].type === 'text' ? message.content[0].text : ''
    res.json({ feedback })
  } catch (error) {
    console.error('AI tutor feedback error:', error)
    res.json({
      feedback: 'Amazing job completing your quiz today! 🌟 You are a superstar learner and should be so proud of yourself! 🎉',
    })
  }
})

export default router
