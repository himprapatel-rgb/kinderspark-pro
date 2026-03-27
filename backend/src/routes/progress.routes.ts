import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import { canParentAccessStudent } from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

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

    const progress = await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId, moduleId } },
      update: { cards },
      create: { studentId, moduleId, cards },
    })
    return res.json(progress)
  } catch (err) {
    console.error('updateProgress error:', err)
    return res.status(500).json({ error: 'Failed to update progress' })
  }
})

export default router
