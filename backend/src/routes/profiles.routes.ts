import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)

// GET /api/profiles/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        roleAssignments: true,
        teacherProfile: true,
        parentProfile: true,
        studentProfile: true,
        principalProfile: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'Profile not found' })
    return res.json(user)
  } catch (err) {
    console.error('profiles/me error:', err)
    return res.status(500).json({ error: 'Failed to load profile' })
  }
})

// PATCH /api/profiles/me
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const { displayName, avatar, email } = req.body || {}
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(email !== undefined ? { email } : {}),
      },
      select: { id: true, displayName: true, avatar: true, email: true, schoolId: true },
    })
    return res.json(updated)
  } catch (err) {
    console.error('profiles/me patch error:', err)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /api/profiles/school/:schoolId/users
router.get('/school/:schoolId/users', requireRole('admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params
    const users = await prisma.user.findMany({
      where: { schoolId },
      include: { roleAssignments: true },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(users)
  } catch (err) {
    console.error('profiles/school users error:', err)
    return res.status(500).json({ error: 'Failed to load school users' })
  }
})

export default router
