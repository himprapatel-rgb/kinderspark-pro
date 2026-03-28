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
        teacherProfile: {
          include: {
            assignments: { include: { classGroup: true } },
          },
        },
        parentProfile: {
          include: {
            children: {
              include: {
                studentProfile: {
                  include: {
                    user: true,
                    enrollments: {
                      where: { status: 'active' },
                      include: { classGroup: true },
                    },
                  },
                },
              },
            },
          },
        },
        studentProfile: {
          include: {
            enrollments: {
              where: { status: 'active' },
              include: { classGroup: true },
            },
          },
        },
        principalProfile: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'Profile not found' })
    // Never expose the hashed PIN to the client
    const { pin: _pin, ...safeUser } = user as any
    return res.json(safeUser)
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

// DELETE /api/profiles/me — Account Deletion (Apple Guideline 5.1.1v)
// All profile models use onDelete: Cascade from User, so deleting User cascades everything.
// RefreshToken is the only model without a FK relation — must be cleaned up manually.
router.delete('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    // 1. Clean up refresh tokens (no FK cascade since it's a raw userId field)
    await prisma.refreshToken.deleteMany({ where: { userId } })

    // 2. Delete the user — cascades to:
    //    RoleAssignment, PrincipalProfile, TeacherProfile (→ TeacherClassAssignment, TeacherStudentAssignment),
    //    ParentProfile (→ ParentChildLink), StudentProfile (→ StudentClassEnrollment, ParentChildLink)
    await prisma.user.delete({ where: { id: userId } })

    return res.json({ success: true, message: 'Account and all associated data have been deleted' })
  } catch (err) {
    console.error('profiles/me delete error:', err)
    return res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
