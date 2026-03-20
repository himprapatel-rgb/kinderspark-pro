import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/ai-sessions/:studentId
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params

    const sessions = await prisma.aISession.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    res.json(sessions)
  } catch (error) {
    console.error('Get AI sessions error:', error)
    res.status(500).json({ error: 'Failed to get AI sessions' })
  }
})

// POST /api/ai-sessions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, topic, correct, total, stars, maxLevel, accuracy } = req.body

    if (!studentId || !topic) {
      return res.status(400).json({ error: 'studentId and topic are required' })
    }

    const session = await prisma.aISession.create({
      data: {
        studentId,
        topic,
        correct: correct || 0,
        total: total || 0,
        stars: stars || 0,
        maxLevel: maxLevel || 1,
        accuracy: accuracy || 0,
      },
    })

    // Update student AI stats
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (student) {
      await prisma.student.update({
        where: { id: studentId },
        data: {
          aiStars: student.aiStars + (stars || 0),
          aiSessions: student.aiSessions + 1,
          aiBestLevel: Math.max(student.aiBestLevel, maxLevel || 1),
        },
      })
    }

    res.status(201).json(session)
  } catch (error) {
    console.error('Create AI session error:', error)
    res.status(500).json({ error: 'Failed to create AI session' })
  }
})

export default router
