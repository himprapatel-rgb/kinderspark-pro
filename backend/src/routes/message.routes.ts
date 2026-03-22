import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client'
import type { AuthUser } from '../middleware/auth.middleware'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'

// ── SSE client store ──────────────────────────────────────────────────────────
// Map<classId, Set<Response>>
const sseClients = new Map<string, Set<Response>>()

function addClient(classId: string, res: Response): void {
  if (!sseClients.has(classId)) {
    sseClients.set(classId, new Set())
  }
  sseClients.get(classId)!.add(res)
}

function removeClient(classId: string, res: Response): void {
  const set = sseClients.get(classId)
  if (!set) return
  set.delete(res)
  if (set.size === 0) sseClients.delete(classId)
}

export function broadcastToClass(classId: string, message: object): void {
  const clients = sseClients.get(classId)
  if (!clients || clients.size === 0) return
  const payload = `data: ${JSON.stringify(message)}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      // client already gone; will be cleaned up on 'close'
    }
  }
}

// ── GET /api/messages/stream — SSE endpoint ───────────────────────────────────
// Auth: Bearer token passed via ?token= query param (EventSource can't set headers)
router.get('/stream', async (req: Request, res: Response) => {
  const { classId, token } = req.query

  if (!classId || typeof classId !== 'string') {
    res.status(400).json({ error: 'classId query param is required' })
    return
  }

  // Verify token from query param
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'token query param is required' })
    return
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    // Attach so downstream code could use it if needed
    req.user = decoded
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Send existing messages immediately
  try {
    const existing = await prisma.message.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    })
    for (const msg of existing) {
      res.write(`data: ${JSON.stringify(msg)}\n\n`)
    }
  } catch (err) {
    console.error('SSE initial load error:', err)
  }

  // Register this client
  addClient(classId, res)

  // 30s heartbeat to keep the connection alive through proxies / load balancers
  const heartbeat = setInterval(() => {
    try {
      res.write('data: {"type":"heartbeat"}\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 30_000)

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    removeClient(classId, res)
  })
})

// ── GET /api/messages?classId=&studentId= ────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.query
    const where: Record<string, unknown> = {}
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

// ── GET /api/messages/unread-count?classId=&studentId= ───────────────────────
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.query
    const where: Record<string, unknown> = { read: false }
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

// ── POST /api/messages ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { from, to, subject, body, classId } = req.body
    if (!from || !to || !subject || !body) {
      return res.status(400).json({ error: 'from, to, subject, and body are required' })
    }
    // Always use the authenticated user's id — never trust client-supplied fromId
    const message = await prisma.message.create({
      data: {
        from,
        fromId: req.user!.id,
        to,
        subject,
        body,
        classId: classId || null,
      },
    })

    // Broadcast to all SSE clients watching this class in real time
    if (classId) {
      broadcastToClass(String(classId), message)
    }

    return res.status(201).json(message)
  } catch (err) {
    console.error('sendMessage error:', err)
    return res.status(500).json({ error: 'Failed to send message' })
  }
})

// ── PUT /api/messages/:id/read ────────────────────────────────────────────────
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

// ── PUT /api/messages/read-all — mark all in a class as read ─────────────────
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.body
    const where: Record<string, unknown> = { read: false }
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
