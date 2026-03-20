import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'

const router = Router()

// GET /api/messages?classId=&studentId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.query
    const where: any = {}
    if (classId) where.classId = String(classId)
    if (studentId) {
      where.OR = [
        { fromId: String(studentId) },
        { to: String(studentId) },
        { to: 'all' },
      ]
    }
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return res.json(messages)
  } catch (err) {
    console.error('getMessages error:', err)
    return res.status(500).json({ error: 'Failed to get messages' })
  }
})

// POST /api/messages
router.post('/', async (req: Request, res: Response) => {
  try {
    const { from, fromId, to, subject, body, classId } = req.body
    if (!from || !to || !subject || !body) {
      return res.status(400).json({ error: 'from, to, subject, and body are required' })
    }
    const message = await prisma.message.create({
      data: {
        from,
        fromId: fromId || null,
        to,
        subject,
        body,
        classId: classId || null,
      },
    })
    return res.status(201).json(message)
  } catch (err) {
    console.error('sendMessage error:', err)
    return res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
