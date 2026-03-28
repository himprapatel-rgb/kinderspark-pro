import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import { canParentAccessStudent } from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

/**
 * Ensure a legacy Student record exists for the given ID.
 * New users created via the User model don't have a Student row,
 * but Progress.studentId FK references Student.id.
 * This bridge creates a minimal Student record so progress can be tracked.
 */
async function ensureLegacyStudent(studentId: string): Promise<void> {
  const existing = await prisma.student.findUnique({ where: { id: studentId } })
  if (existing) return

  // Try to find the User record to copy name/avatar
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { displayName: true, avatar: true },
  })

  // If no User record exists with this ID, skip silently
  if (!user) return

  // Student model requires a classId — find or create a default class
  let classRecord = await prisma.class.findFirst({ orderBy: { createdAt: 'desc' } })
  if (!classRecord) {
    classRecord = await prisma.class.create({
      data: { name: 'General', grade: 'KG 1' },
    })
  }

  await prisma.student.create({
    data: {
      id: studentId,
      name: user.displayName || 'Student',
      avatar: user.avatar || '👧',
      pin: '0000', // placeholder — auth is via User model
      classId: classRecord.id,
    },
  }).catch(() => {
    // Race condition: another request may have created it. That's fine.
  })
}

// GET /api/progress/:studentId
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    if (req.user?.role === 'child' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const progress = await prisma.progress.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
    })
    return res.json(progress)
  } catch (err) {
    console.error('getProgress error:', err)
    return res.status(500).json({ error: 'Failed to get progress' })
  }
})

// PUT /api/progress/:studentId/:moduleId
router.put('/:studentId/:moduleId', async (req: Request, res: Response) => {
  try {
    const { studentId, moduleId } = req.params
    if (req.user?.role === 'child' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const { cards } = req.body
    if (cards === undefined) return res.status(400).json({ error: 'cards required' })

    // Bridge: ensure a legacy Student record exists for new User-model users
    await ensureLegacyStudent(studentId)

    const progress = await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId, moduleId } },
      update: { cards },
      create: { studentId, moduleId, cards },
    })
    return res.json(progress)
  } catch (err: any) {
    // P2003 = FK violation — studentId doesn't exist in Student table
    if (err?.code === 'P2003') {
      return res.status(400).json({ error: 'Student record not found. Please re-login.' })
    }
    console.error('updateProgress error:', err)
    return res.status(500).json({ error: 'Failed to update progress' })
  }
})

export default router
