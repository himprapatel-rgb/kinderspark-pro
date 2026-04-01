import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import {
  canParentAccessStudent,
  canTeacherAccessClass,
  canUserAccessClassGroup,
  canUserAccessSchool,
  canUserDirectMessageTarget,
  canUserAccessStudentProfile,
  canUserAccessThread,
  resolveIdentityContext,
} from '../utils/accessControl'
import {
  notifyLegacyInboxMessageCreated,
  notifyThreadParticipants,
} from '../services/messageNotifications.service'

const router = Router()

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
    // Participant validation runs in the caller — no early bypass here
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
const MAX_SSE_PER_CLASS = 50

function addClient(classId: string, res: Response): boolean {
  if (!sseClients.has(classId)) {
    sseClients.set(classId, new Set())
  }
  const set = sseClients.get(classId)!
  if (set.size >= MAX_SSE_PER_CLASS) return false
  set.add(res)
  return true
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
// Auth: cookie-only via requireAuth. The ?token= query param is no longer
// supported — tokens in URLs are logged by proxies and browser history (OWASP A02).
router.get('/stream', requireAuth, async (req: Request, res: Response) => {
  const { classId } = req.query

  if (!classId || typeof classId !== 'string') {
    res.status(400).json({ error: 'classId query param is required' })
    return
  }

  if (req.user!.role === 'child') {
    const ownClassId = await getRequesterClassId(req.user.id)
    if (!ownClassId || ownClassId !== classId) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
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

  // Register this client — reject if class already at SSE cap
  if (!addClient(classId, res)) {
    res.status(429).json({ error: 'Too many live connections for this class' })
    return
  }

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
    const role = req.user?.role

    if (role === 'teacher') {
      // Teachers must provide classId — they cannot scan the entire messages table
      if (!classId) return res.status(400).json({ error: 'classId is required' })
      const ok = await enforceTeacherLegacyClassAccess(req, res, String(classId))
      if (!ok) return
    } else if (role === 'child') {
      studentId = req.user!.id
      classId = await getRequesterClassId(req.user!.id)
    } else if (role === 'parent') {
      const requestedStudentId = String(studentId || '')
      if (!requestedStudentId || !(await canParentAccessStudent(req.user!.id, requestedStudentId))) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      studentId = requestedStudentId
      classId = await resolveStudentClassId(requestedStudentId)
    }
    // admin/principal — no forced scope; classId/studentId filters are optional

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
      take: 500,
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
    let { to, subject, body, classId } = req.body
    // Always derive display name from the authenticated JWT — never trust client-supplied 'from'
    const from = req.user!.name || 'User'
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' })
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

    const { notifyLegacyInboxMessageCreated } = await import('../services/messageNotifications.service')
    notifyLegacyInboxMessageCreated(message, String(req.user!.role), req.user!.name || from)

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

// ── PUT /api/messages/read-all — mark all in a class as read ─────────────────
// IMPORTANT: this MUST be registered before /:id/read to avoid Express treating
// "read-all" as the :id param and routing to the wrong handler.
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

// GET /api/messages/recipients/lookup?profileId=KSP...
router.get('/recipients/lookup', requireAuth, async (req: Request, res: Response) => {
  try {
    const profileId = String(req.query.profileId || '').trim()
    if (!profileId) return res.status(400).json({ error: 'profileId is required' })

    const allowed = await canUserDirectMessageTarget(req.user!.id, req.user!.role, profileId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const user = await prisma.user.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        displayName: true,
        avatar: true,
        roleAssignments: { select: { role: true } },
      },
    })
    if (!user) return res.status(404).json({ error: 'Recipient not found' })

    return res.json({
      id: user.id,
      name: user.displayName,
      avatar: user.avatar,
      roles: user.roleAssignments.map((r) => r.role),
      profileId: user.id,
    })
  } catch (err) {
    console.error('lookup recipient error:', err)
    return res.status(500).json({ error: 'Failed to lookup recipient' })
  }
})

// GET /api/messages/recipients
router.get('/recipients', requireAuth, async (req: Request, res: Response) => {
  try {
    const identity = await resolveIdentityContext(req.user!.id, req.user!.role)
    if (!identity) {
      return res.status(403).json({ error: 'User is not mapped to messaging identity model yet' })
    }

    const bucket: Record<string, Map<string, any>> = {
      kids: new Map(),
      teachers: new Map(),
      parents: new Map(),
      school: new Map(),
    }
    const addRecipient = (group: keyof typeof bucket, user: any, roleName: string) => {
      if (!user?.id || user.id === identity.canonicalUserId) return
      bucket[group].set(user.id, {
        id: user.id,
        profileId: user.id,
        name: user.displayName || 'User',
        avatar: user.avatar || null,
        role: roleName,
      })
    }

    if (req.user!.role === 'teacher' && identity.teacherProfileId) {
      const students = await prisma.studentProfile.findMany({
        where: {
          OR: [
            {
              enrollments: {
                some: {
                  status: 'active',
                  classGroup: { teacherAssignments: { some: { teacherProfileId: identity.teacherProfileId } } },
                },
              },
            },
            { teacherOverrides: { some: { teacherProfileId: identity.teacherProfileId, isActive: true } } },
          ],
        },
        include: {
          user: { select: { id: true, displayName: true, avatar: true } },
          parentLinks: {
            include: {
              parentProfile: {
                include: { user: { select: { id: true, displayName: true, avatar: true } } },
              },
            },
          },
        },
      })
      for (const sp of students) {
        addRecipient('kids', sp.user, 'child')
        for (const p of sp.parentLinks) addRecipient('parents', p.parentProfile?.user, 'parent')
      }
    } else if (req.user!.role === 'parent' && identity.parentProfileId) {
      const links = await prisma.parentChildLink.findMany({
        where: { parentProfileId: identity.parentProfileId },
        include: {
          studentProfile: {
            include: {
              user: { select: { id: true, displayName: true, avatar: true } },
              enrollments: {
                where: { status: 'active' },
                include: {
                  classGroup: {
                    include: {
                      teacherAssignments: {
                        include: {
                          teacherProfile: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
      for (const link of links) {
        addRecipient('kids', link.studentProfile.user, 'child')
        for (const enr of link.studentProfile.enrollments) {
          for (const ta of enr.classGroup.teacherAssignments) {
            addRecipient('teachers', ta.teacherProfile?.user, 'teacher')
          }
        }
      }
      if (identity.schoolId) {
        const schoolUsers = await prisma.user.findMany({
          where: {
            roleAssignments: {
              some: {
                schoolId: identity.schoolId,
                role: { in: ['admin', 'principal'] as any },
              },
            },
          },
          select: {
            id: true,
            displayName: true,
            avatar: true,
            roleAssignments: { where: { schoolId: identity.schoolId }, select: { role: true } },
          },
        })
        for (const su of schoolUsers) {
          const role = su.roleAssignments.find((r) => r.role === 'principal')?.role || su.roleAssignments[0]?.role || 'admin'
          addRecipient('school', su, role)
        }
      }
    } else if (req.user!.role === 'child' && identity.studentProfileId) {
      const me = await prisma.studentProfile.findUnique({
        where: { id: identity.studentProfileId },
        include: {
          parentLinks: {
            include: { parentProfile: { include: { user: { select: { id: true, displayName: true, avatar: true } } } } },
          },
          enrollments: {
            where: { status: 'active' },
            include: {
              classGroup: {
                include: {
                  teacherAssignments: {
                    include: {
                      teacherProfile: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      })
      if (me) {
        for (const p of me.parentLinks) addRecipient('parents', p.parentProfile?.user, 'parent')
        const classGroupIds = me.enrollments.map((e) => e.classGroupId)
        for (const enr of me.enrollments) {
          for (const ta of enr.classGroup.teacherAssignments) addRecipient('teachers', ta.teacherProfile?.user, 'teacher')
        }
        if (classGroupIds.length) {
          const classmates = await prisma.studentProfile.findMany({
            where: {
              id: { not: identity.studentProfileId },
              enrollments: { some: { classGroupId: { in: classGroupIds }, status: 'active' } },
            },
            include: { user: { select: { id: true, displayName: true, avatar: true } } },
          })
          for (const mate of classmates) addRecipient('kids', mate.user, 'child')
        }
      }
      if (identity.schoolId) {
        const schoolUsers = await prisma.user.findMany({
          where: {
            roleAssignments: {
              some: {
                schoolId: identity.schoolId,
                role: { in: ['admin', 'principal'] as any },
              },
            },
          },
          select: {
            id: true,
            displayName: true,
            avatar: true,
            roleAssignments: { where: { schoolId: identity.schoolId }, select: { role: true } },
          },
        })
        for (const su of schoolUsers) {
          const role = su.roleAssignments.find((r) => r.role === 'principal')?.role || su.roleAssignments[0]?.role || 'admin'
          addRecipient('school', su, role)
        }
      }
    } else if ((req.user!.role === 'admin' || req.user!.role === 'principal') && identity.schoolId) {
      const schoolUsers = await prisma.user.findMany({
        where: { roleAssignments: { some: { schoolId: identity.schoolId } } },
        select: {
          id: true,
          displayName: true,
          avatar: true,
          roleAssignments: { where: { schoolId: identity.schoolId }, select: { role: true } },
        },
      })
      for (const su of schoolUsers) {
        const role = su.roleAssignments[0]?.role
        if (role === 'child') addRecipient('kids', su, 'child')
        else if (role === 'teacher') addRecipient('teachers', su, 'teacher')
        else if (role === 'parent') addRecipient('parents', su, 'parent')
        else if (role === 'admin' || role === 'principal') addRecipient('school', su, role)
      }
    }

    const toArray = (m: Map<string, any>) => Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
    return res.json({
      kids: toArray(bucket.kids),
      teachers: toArray(bucket.teachers),
      parents: toArray(bucket.parents),
      school: toArray(bucket.school),
    })
  } catch (err) {
    console.error('list recipients error:', err)
    return res.status(500).json({ error: 'Failed to list recipients' })
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
    if (String(scopeType) === 'direct' && participants.length !== 2) {
      return res.status(400).json({ error: 'Direct thread requires exactly 2 participants' })
    }
    if (String(scopeType) === 'direct') {
      const targets = participants.filter((id) => id !== canonicalUserId)
      for (const targetUserId of targets) {
        const ok = await canUserDirectMessageTarget(req.user!.id, req.user!.role, targetUserId)
        if (!ok) return res.status(403).json({ error: 'Insufficient permissions for direct recipient' })
      }

      // Deduplicate: return existing direct thread if one already exists for this pair
      const existingThread = await prisma.messageThread.findFirst({
        where: {
          scopeType: 'direct',
          AND: participants.map((userId) => ({
            participants: { some: { userId } },
          })),
        },
        include: {
          participants: {
            include: { user: { select: { id: true, displayName: true, avatar: true } } },
          },
        },
      })
      if (existingThread) {
        // Verify participant count matches exactly (not a superset)
        if (existingThread.participants.length === participants.length) {
          return res.status(200).json(existingThread)
        }
      }
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
    if (body.length > 10000) {
      return res.status(400).json({ error: 'Message body must not exceed 10000 characters' })
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

    notifyThreadParticipants(
      threadId,
      canonicalUserId,
      message.senderUser.displayName || 'Someone',
      body.slice(0, 500)
    )

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
    const messageIds = messages.map((m) => m.id)
    const now = new Date()

    // Single createMany for new receipts + single updateMany for existing — avoids N+1
    await prisma.$transaction([
      prisma.messageReceipt.createMany({
        data: messageIds.map((messageId) => ({ messageId, userId: canonicalUserId, seenAt: now })),
        skipDuplicates: true,
      }),
      prisma.messageReceipt.updateMany({
        where: { messageId: { in: messageIds }, userId: canonicalUserId },
        data: { seenAt: now },
      }),
    ])
    return res.json({ success: true, count: messages.length })
  } catch (err) {
    console.error('mark thread read error:', err)
    return res.status(500).json({ error: 'Failed to mark thread as read' })
  }
})

export default router
