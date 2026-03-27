import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)

// POST /api/relationships/parent-child
router.post('/parent-child', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const { parentProfileId, studentProfileId, relationType, isPrimary } = req.body || {}
    if (!parentProfileId || !studentProfileId) {
      return res.status(400).json({ error: 'parentProfileId and studentProfileId required' })
    }
    const row = await prisma.parentChildLink.create({
      data: {
        parentProfileId,
        studentProfileId,
        relationType: relationType || 'guardian',
        isPrimary: !!isPrimary,
      },
    })
    return res.status(201).json(row)
  } catch (err) {
    console.error('create parent-child link error:', err)
    return res.status(500).json({ error: 'Failed to create parent-child relationship' })
  }
})

// GET /api/relationships/children/:parentProfileId
router.get('/children/:parentProfileId', requireRole('admin', 'principal', 'teacher', 'parent'), async (req: Request, res: Response) => {
  try {
    const links = await prisma.parentChildLink.findMany({
      where: { parentProfileId: req.params.parentProfileId },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return res.json(links)
  } catch (err) {
    console.error('get parent children error:', err)
    return res.status(500).json({ error: 'Failed to load children links' })
  }
})

// GET /api/relationships/parents/:studentProfileId
router.get('/parents/:studentProfileId', requireRole('admin', 'principal', 'teacher', 'parent'), async (req: Request, res: Response) => {
  try {
    const links = await prisma.parentChildLink.findMany({
      where: { studentProfileId: req.params.studentProfileId },
      include: { parentProfile: { include: { user: true } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return res.json(links)
  } catch (err) {
    console.error('get student parents error:', err)
    return res.status(500).json({ error: 'Failed to load parent links' })
  }
})

export default router
