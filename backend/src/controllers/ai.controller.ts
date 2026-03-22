import { Request, Response } from 'express'
import { generateLesson, generateTutorFeedback, generateRecommendations, generateHomeworkIdea, generateStudentReport } from '../services/claude.service'
import { buildClassReport } from '../services/report.service'
import prisma from '../prisma/client'

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

export async function aiSendParentReports(req: Request, res: Response) {
  const { classId } = req.body
  if (!classId) return res.status(400).json({ error: 'classId required' })
  try {
    const [students, homework] = await Promise.all([
      prisma.student.findMany({ where: { classId } }),
      prisma.homework.findMany({ where: { classId } }),
    ])
    if (students.length === 0) return res.json({ sent: 0, total: 0 })

    const results = await Promise.allSettled(
      students.map(async (student) => {
        const hwDone = await prisma.homeworkCompletion.count({
          where: { studentId: student.id, done: true },
        })
        const report = await generateStudentReport(
          student.name, student.stars, hwDone, homework.length,
          student.aiSessions, student.aiBestLevel
        )
        await prisma.message.create({
          data: {
            from: '📊 AI Weekly Report',
            fromId: 'system',
            to: student.id,
            subject: `📊 ${student.name}'s Weekly Progress Report`,
            body: report,
            classId,
          },
        })
      })
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    return res.json({ sent, total: students.length })
  } catch (err) {
    console.error('aiSendParentReports error:', err)
    return res.status(500).json({ error: 'Failed to send reports' })
  }
}

export async function aiGenerateHomework(req: Request, res: Response) {
  const { topic, grade = 'KG 1', classId } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  try {
    // Get student count for context if classId is provided
    let studentCount = 10
    if (classId) {
      studentCount = await prisma.student.count({ where: { classId } })
    }
    const idea = await generateHomeworkIdea(topic, grade, studentCount)
    return res.json(idea)
  } catch (err) {
    console.error('AI homework generation failed:', err)
    // Fallback so the UI always gets something usable
    return res.json({
      title: `${topic} Practice ✨`,
      description: 'A fun learning activity for your child!',
      moduleId: 'numbers',
      emoji: '📝',
      starsReward: 10,
      estimatedMinutes: 10,
      activities: [
        { instruction: 'Practice with your child together', emoji: '👨‍👩‍👧' },
        { instruction: 'Say each answer out loud', emoji: '🗣️' },
        { instruction: 'Give a high five when done!', emoji: '🙌' },
      ],
    })
  }
}

export async function aiRecommendations(req: Request, res: Response) {
  const { studentId } = req.body
  if (!studentId) return res.status(400).json({ error: 'studentId required' })
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        progress: true,
        aiSessionLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const progressSummary = student.progress.map(p => `moduleId=${p.moduleId}: ${p.cards} cards done`).join(', ')
    const sessionSummary = student.aiSessionLogs.map(s => `${s.topic}: ${s.correct}/${s.total} (lv ${s.maxLevel})`).join(', ')

    const recs = await generateRecommendations(student.name, student.stars, progressSummary, sessionSummary)
    return res.json({ recommendations: recs })
  } catch {
    return res.json({
      recommendations: [
        { title: 'Practice Numbers', reason: 'Numbers are fun and build math skills!', moduleId: 'numbers' },
        { title: 'Learn the Alphabet', reason: 'Letters are the building blocks of reading!', moduleId: 'alphabet' },
      ]
    })
  }
}
