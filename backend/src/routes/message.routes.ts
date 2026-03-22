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

// GET /api/messages/unread-count?classId=&studentId=
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.query
    const where: any = { read: false }
    if (classId) where.classId = String(classId)
    if (studentId) {
      where.OR = [
        { fromId: String(studentId) },
        { to: String(studentId) },
        { to: 'all' },
      ]
      // don't count messages the user sent themselves
      where.fromId = { not: String(studentId) }
    }
    const count = await prisma.message.count({ where })
    return res.json({ count })
  } catch (err) {
    console.error('unreadCount error:', err)
    return res.status(500).json({ error: 'Failed to get unread count' })
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

// PUT /api/messages/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const msg = await prisma.message.update({
      where: { id: req.params.id },
      data: { read: true },
    })
    return res.json(msg)
  } catch (err) {
    console.error('markRead error:', err)
    return res.status(500).json({ error: 'Failed to mark message as read' })
  }
})

// PUT /api/messages/read-all — mark all in a class as read
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.body
    const where: any = { read: false }
    if (classId) where.classId = String(classId)
    if (studentId) where.fromId = { not: String(studentId) }
    await prisma.message.updateMany({ where, data: { read: true } })
    return res.json({ success: true })
  } catch (err) {
    console.error('readAll error:', err)
    return res.status(500).json({ error: 'Failed to mark messages as read' })
  }
})

export default router
