import { Request, Response } from 'express'
import { generateLesson, generateTutorFeedback } from '../services/claude.service'
import { buildClassReport } from '../services/report.service'

export async function aiGenerateLesson(req: Request, res: Response) {
  const { topic, count = 10 } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  try {
    const items = await generateLesson(topic, count)
    return res.json({ items })
  } catch (err) {
    return res.status(500).json({ error: 'AI generation failed', items: [] })
  }
}

export async function aiWeeklyReport(req: Request, res: Response) {
  const { classId } = req.body
  if (!classId) return res.status(400).json({ error: 'classId required' })
  try {
    const report = await buildClassReport(classId)
    return res.json({ report })
  } catch (err) {
    return res.status(500).json({ error: 'Report generation failed' })
  }
}

export async function aiTutorFeedback(req: Request, res: Response) {
  const { correct, total, topic, maxLevel } = req.body
  try {
    const feedback = await generateTutorFeedback(correct, total, topic, maxLevel)
    return res.json({ feedback })
  } catch {
    return res.json({ feedback: 'Amazing effort today! Keep practicing every day and you will be a superstar! 🌟' })
  }
}
