import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client'
import type { AuthUser } from '../middleware/auth.middleware'
import { requireAuth } from '../middleware/auth.middleware'
import {
  canParentAccessStudent,
  canTeacherAccessClass,
  canUserAccessClassGroup,
  canUserAccessSchool,
  canUserAccessStudentProfile,
  canUserAccessThread,
  resolveIdentityContext,
} from '../utils/accessControl'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'

async function getRequesterClassId(userId: string): Promise<string | null> {
  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: { classId: true },
  })
  return student?.classId || null
}

async function resolveStudentClassId(studentId: string): Promise<string | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  })
  return student?.classId || null
}

async function requireThreadIdentity(req: Request, res: Response): Promise<string | null> {
  const user = req.user
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  const identity = await resolveIdentityContext(user.id, user.role)
  if (!identity) {
    res.status(403).json({ error: 'User is not mapped to the threaded messaging identity model yet' })
    return null
  }
  return identity.canonicalUserId
}

async function canCreateThreadForScope(req: Request, body: any): Promise<boolean> {
  const user = req.user!
  const scopeType = String(body.scopeType || '')
  if (!scopeType) return false

  if (scopeType === 'school') {
    if (!body.schoolId) return false
    return canUserAccessSchool(user.id, user.role, String(body.schoolId))
  }
  if (scopeType === 'classGroup') {
    if (!body.classGroupId) return false
    return canUserAccessClassGroup(user.id, user.role, String(body.classGroupId))
  }
  if (scopeType === 'student') {
    if (!body.studentProfileId) return false
    return canUserAccessStudentProfile(user.id, user.role, String(body.studentProfileId))
  }
  if (scopeType === 'direct') {
    return true
  }
  return false
}

async function enforceTeacherLegacyClassAccess(req: Request, res: Response, classId?: string | null): Promise<boolean> {
  if (req.user?.role !== 'teacher') return true
  if (!classId) return false
  const ok = await canTeacherAccessClass(req.user.id, String(classId))
  if (!ok) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return false
  }
  return true
}

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
    if (decoded.role === 'child') {
      const ownClassId = await getRequesterClassId(decoded.id)
      if (!ownClassId || ownClassId !== classId) {
        res.status(403).json({ error: 'Insufficient permissions' })
        return
      }
    }
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
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    let { classId, studentId } = req.query
    if (req.user?.role === 'teacher' && classId) {
      const ok = await enforceTeacherLegacyClassAccess(req, res, String(classId))
      if (!ok) return
    }
    if (req.user?.role === 'child') {
      studentId = req.user.id
      classId = await getRequesterClassId(req.user.id)
    }
    if (req.user?.role === 'parent') {
      const requestedStudentId = String(studentId || '')
      if (!requestedStudentId || !(await canParentAccessStudent(req.user.id, requestedStudentId))) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      studentId = requestedStudentId
      classId = await resolveStudentClassId(requestedStudentId)
    }
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
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    let { classId, studentId } = req.query
    if (req.user?.role === 'teacher' && classId) {
      const ok = await enforceTeacherLegacyClassAccess(req, res, String(classId))
      if (!ok) return
    }
    if (req.user?.role === 'child') {
      studentId = req.user.id
      classId = await getRequesterClassId(req.user.id)
    }
    if (req.user?.role === 'parent') {
      const requestedStudentId = String(studentId || '')
      if (!requestedStudentId || !(await canParentAccessStudent(req.user.id, requestedStudentId))) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      studentId = requestedStudentId
      classId = await resolveStudentClassId(requestedStudentId)
    }
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
    let { from, to, subject, body, classId } = req.body
    if (!from || !to || !subject || !body) {
      return res.status(400).json({ error: 'from, to, subject, and body are required' })
    }
    if (req.user?.role === 'teacher') {
      const ok = await enforceTeacherLegacyClassAccess(req, res, classId ? String(classId) : null)
      if (!ok) return
    }
    if (req.user?.role === 'child') {
      const ownClassId = await getRequesterClassId(req.user.id)
      if (!ownClassId) return res.status(403).json({ error: 'Insufficient permissions' })
      classId = ownClassId
    }
    if (req.user?.role === 'parent') {
      const targetStudentId = String(to || '')
      if (!targetStudentId || !(await canParentAccessStudent(req.user.id, targetStudentId))) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      classId = await resolveStudentClassId(targetStudentId)
      if (!classId) return res.status(403).json({ error: 'Insufficient permissions' })
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
router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role === 'child' || req.user?.role === 'parent') {
      const ownClassId = await getRequesterClassId(req.user.id)
      const target = await prisma.message.findUnique({
        where: { id: req.params.id },
        select: { classId: true, to: true, fromId: true },
      })
      if (req.user.role === 'child' && (!target || target.classId !== ownClassId)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      if (req.user.role === 'parent') {
        const linked = target?.to ? await canParentAccessStudent(req.user.id, String(target.to)) : false
        if (!target || !linked) return res.status(403).json({ error: 'Insufficient permissions' })
      }
      if (!target) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
    }
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
router.put('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    let { classId, studentId } = req.body
    if (req.user?.role === 'teacher' && classId) {
      const ok = await enforceTeacherLegacyClassAccess(req, res, String(classId))
      if (!ok) return
    }
    if (req.user?.role === 'child') {
      classId = await getRequesterClassId(req.user.id)
      studentId = req.user.id
    }
    if (req.user?.role === 'parent') {
      const requestedStudentId = String(studentId || '')
      if (!requestedStudentId || !(await canParentAccessStudent(req.user.id, requestedStudentId))) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      studentId = requestedStudentId
      classId = await resolveStudentClassId(requestedStudentId)
    }
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

// ── Phase 2 threaded messaging APIs (additive, legacy-safe) ───────────────────

// GET /api/messages/threads
router.get('/threads', requireAuth, async (req: Request, res: Response) => {
  try {
    const canonicalUserId = await requireThreadIdentity(req, res)
    if (!canonicalUserId) return

    const { scopeType, schoolId, classGroupId, studentProfileId } = req.query
    if (schoolId && !(await canUserAccessSchool(req.user!.id, req.user!.role, String(schoolId)))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (classGroupId && !(await canUserAccessClassGroup(req.user!.id, req.user!.role, String(classGroupId)))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (studentProfileId && !(await canUserAccessStudentProfile(req.user!.id, req.user!.role, String(studentProfileId)))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const where: any = {
      participants: {
        some: { userId: canonicalUserId },
      },
    }
    if (scopeType) where.scopeType = String(scopeType)
    if (schoolId) where.schoolId = String(schoolId)
    if (classGroupId) where.classGroupId = String(classGroupId)
    if (studentProfileId) where.studentProfileId = String(studentProfileId)

    const threads = await prisma.messageThread.findMany({
      where,
      include: {
        participants: {
          include: { user: { select: { id: true, displayName: true, avatar: true } } },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            senderUser: { select: { id: true, displayName: true, avatar: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return res.json(threads)
  } catch (err) {
    console.error('list threaded messages error:', err)
    return res.status(500).json({ error: 'Failed to list message threads' })
  }
})

// POST /api/messages/threads
router.post('/threads', requireAuth, async (req: Request, res: Response) => {
  try {
    const canonicalUserId = await requireThreadIdentity(req, res)
    if (!canonicalUserId) return

    const { scopeType, schoolId, classGroupId, studentProfileId } = req.body || {}
    if (!scopeType) return res.status(400).json({ error: 'scopeType is required' })

    if (req.user!.role === 'parent' && !['direct', 'student'].includes(String(scopeType))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user!.role === 'child' && String(scopeType) !== 'direct') {
      return res.status(403).json({ error: 'Children can only create direct threads' })
    }

    const canCreate = await canCreateThreadForScope(req, req.body || {})
    if (!canCreate) return res.status(403).json({ error: 'Insufficient permissions' })

    const requestedParticipantIds = Array.isArray(req.body?.participantUserIds)
      ? req.body.participantUserIds.filter((id: unknown) => typeof id === 'string')
      : []

    if (String(scopeType) !== 'direct' && requestedParticipantIds.length > 0 && !['admin', 'principal'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only admin/principal can set explicit participants for non-direct threads' })
    }

    const participants = Array.from(new Set([canonicalUserId, ...requestedParticipantIds]))
    if (String(scopeType) === 'direct' && participants.length < 2) {
      return res.status(400).json({ error: 'Direct thread requires at least 2 participants' })
    }

    const existingUsers = participants.length
      ? await prisma.user.findMany({
          where: { id: { in: participants } },
          select: { id: true },
        })
      : []
    if (existingUsers.length !== participants.length) {
      return res.status(400).json({ error: 'One or more participantUserIds are invalid' })
    }

    const thread = await prisma.messageThread.create({
      data: {
        scopeType,
        schoolId: schoolId || null,
        classGroupId: classGroupId || null,
        studentProfileId: studentProfileId || null,
        createdByUserId: canonicalUserId,
        participants: participants.length
          ? {
              createMany: {
                data: participants.map((userId) => ({ userId })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: {
        participants: {
          include: { user: { select: { id: true, displayName: true, avatar: true } } },
        },
      },
    })

    return res.status(201).json(thread)
  } catch (err) {
    console.error('create message thread error:', err)
    return res.status(500).json({ error: 'Failed to create message thread' })
  }
})

// GET /api/messages/threads/:threadId/messages
router.get('/threads/:threadId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const canonicalUserId = await requireThreadIdentity(req, res)
    if (!canonicalUserId) return

    const { threadId } = req.params
    const allowed = await canUserAccessThread(req.user!.id, req.user!.role, threadId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const messages = await prisma.threadMessage.findMany({
      where: { threadId },
      include: {
        senderUser: { select: { id: true, displayName: true, avatar: true } },
        receipts: {
          where: { userId: canonicalUserId },
          select: { seenAt: true, ackAt: true },
          take: 1,
        },
      },
      orderBy: { sentAt: 'asc' },
      take: 500,
    })

    return res.json(messages)
  } catch (err) {
    console.error('get thread messages error:', err)
    return res.status(500).json({ error: 'Failed to load thread messages' })
  }
})

// POST /api/messages/threads/:threadId/messages
router.post('/threads/:threadId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const canonicalUserId = await requireThreadIdentity(req, res)
    if (!canonicalUserId) return

    const { threadId } = req.params
    const allowed = await canUserAccessThread(req.user!.id, req.user!.role, threadId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { body, kind, priority, expiresAt } = req.body || {}
    if (!body || typeof body !== 'string') {
      return res.status(400).json({ error: 'Message body is required' })
    }
    if (!kind || !['school_announcement', 'class_update', 'direct_message'].includes(String(kind))) {
      return res.status(400).json({ error: 'Invalid message kind' })
    }
    const safePriority = ['normal', 'important', 'urgent'].includes(String(priority)) ? String(priority) : 'normal'

    const message = await prisma.threadMessage.create({
      data: {
        threadId,
        senderUserId: canonicalUserId,
        body,
        kind,
        priority: safePriority as any,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        senderUser: { select: { id: true, displayName: true, avatar: true } },
      },
    })

    await prisma.messageReceipt.upsert({
      where: {
        messageId_userId: {
          messageId: message.id,
          userId: canonicalUserId,
        },
      },
      update: { seenAt: new Date(), ackAt: new Date() },
      create: {
        messageId: message.id,
        userId: canonicalUserId,
        seenAt: new Date(),
        ackAt: new Date(),
      },
    })

    return res.status(201).json(message)
  } catch (err) {
    console.error('send thread message error:', err)
    return res.status(500).json({ error: 'Failed to send thread message' })
  }
})

// POST /api/messages/threads/:threadId/read
router.post('/threads/:threadId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const canonicalUserId = await requireThreadIdentity(req, res)
    if (!canonicalUserId) return

    const { threadId } = req.params
    const allowed = await canUserAccessThread(req.user!.id, req.user!.role, threadId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const messages = await prisma.threadMessage.findMany({
      where: { threadId },
      select: { id: true },
      take: 500,
    })
    const now = new Date()
    await Promise.all(
      messages.map((m) =>
        prisma.messageReceipt.upsert({
          where: { messageId_userId: { messageId: m.id, userId: canonicalUserId } },
          update: { seenAt: now },
          create: { messageId: m.id, userId: canonicalUserId, seenAt: now },
        })
      )
    )
    return res.json({ success: true, count: messages.length })
  } catch (err) {
    console.error('mark thread read error:', err)
    return res.status(500).json({ error: 'Failed to mark thread as read' })
  }
})

export default router
