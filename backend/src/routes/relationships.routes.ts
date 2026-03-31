import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canUserAccessParentProfile, canUserAccessStudentProfile, resolveIdentityContext } from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

// POST /api/relationships/parent-child
router.post('/parent-child', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const { parentProfileId, studentProfileId, relationType, isPrimary } = req.body || {}
    if (!parentProfileId || !studentProfileId) {
      return res.status(400).json({ error: 'parentProfileId and studentProfileId required' })
    }
    const [parentProfile, studentProfile] = await Promise.all([
      prisma.parentProfile.findUnique({ where: { id: parentProfileId }, select: { id: true, schoolId: true } }),
      prisma.studentProfile.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true } }),
    ])
    if (!parentProfile || !studentProfile) return res.status(404).json({ error: 'Parent or student profile not found' })
    if (parentProfile.schoolId && parentProfile.schoolId !== studentProfile.schoolId) {
      return res.status(400).json({ error: 'Parent and student school mismatch' })
    }
    if (req.user!.role === 'teacher') {
      const ok = await canUserAccessStudentProfile(req.user!.id, req.user!.role, studentProfileId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    } else {
      const identity = await resolveIdentityContext(req.user!.id, req.user!.role)
      if (identity?.schoolId && identity.schoolId !== studentProfile.schoolId) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
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
    const allowed = await canUserAccessParentProfile(req.user!.id, req.user!.role, req.params.parentProfileId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
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
    const allowed = await canUserAccessStudentProfile(req.user!.id, req.user!.role, req.params.studentProfileId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
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
