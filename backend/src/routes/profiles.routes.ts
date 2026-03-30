import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

const STUDENT_PROFILE_FIELDS = [
  'name',
  'preferredName',
  'age',
  'avatar',
  'photoUrl',
  'grade',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'parentName',
  'parentPhone',
  'emergencyPhone',
  'notes',
] as const

const CHILD_EDITABLE_FIELDS = ['preferredName', 'avatar', 'photoUrl'] as const
const PARENT_EDITABLE_FIELDS = [
  'preferredName',
  'avatar',
  'photoUrl',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'parentName',
  'parentPhone',
  'emergencyPhone',
  'notes',
] as const

const GUARDIAN_EDITABLE_FIELDS = [
  'phone',
  'alternatePhone',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'photoUrl',
] as const

function normalizeText(input: unknown, max = 160): string | null {
  if (input === undefined) return null
  if (typeof input !== 'string') return null
  const v = input.trim().replace(/\s{2,}/g, ' ')
  if (!v) return null
  return v.slice(0, max)
}

function pickAllowed(body: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (key === 'age') {
        const age = Number(body[key])
        if (Number.isFinite(age) && age >= 3 && age <= 12) out[key] = Math.round(age)
      } else {
        out[key] = normalizeText(body[key], key === 'notes' ? 1200 : 160)
      }
    }
  }
  return out
}

async function canAccessStudentProfile(req: Request, studentId: string): Promise<boolean> {
  const role = req.user?.role
  const userId = req.user?.id
  if (!role || !userId) return false
  if (role === 'admin' || role === 'principal') return true
  if (role === 'child') return userId === studentId
  if (role === 'parent') return canParentAccessStudent(userId, studentId)
  if (role === 'teacher') {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } })
    if (!student) return false
    return canTeacherAccessClass(userId, student.classId)
  }
  return false
}

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

// GET /api/profiles/student/:studentId
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    if (!(await canAccessStudentProfile(req, studentId))) {
      return res.status(403).json({ error: 'Not allowed to view this student profile' })
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: Object.fromEntries(STUDENT_PROFILE_FIELDS.map((f) => [f, true])),
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const studentProfile = await prisma.studentProfile.findFirst({
      where: { legacyStudentId: studentId },
      include: {
        parentLinks: {
          include: {
            parentProfile: {
              include: { user: { select: { id: true, displayName: true, email: true } } },
            },
          },
        },
      },
    })

    const guardians = (studentProfile?.parentLinks || []).map((link) => ({
      relationType: link.relationType,
      isPrimary: link.isPrimary,
      parentProfileId: link.parentProfileId,
      name: link.parentProfile.user.displayName,
      email: link.parentProfile.user.email,
      phone: link.parentProfile.phone,
      alternatePhone: link.parentProfile.alternatePhone,
    }))

    return res.json({ ...student, guardians })
  } catch (err) {
    console.error('profiles/student get error:', err)
    return res.status(500).json({ error: 'Failed to load student profile' })
  }
})

// PATCH /api/profiles/student/:studentId
router.patch('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    if (!(await canAccessStudentProfile(req, studentId))) {
      return res.status(403).json({ error: 'Not allowed to edit this student profile' })
    }

    const role = req.user!.role
    const allowedFields =
      role === 'child' ? CHILD_EDITABLE_FIELDS :
      role === 'parent' ? PARENT_EDITABLE_FIELDS :
      STUDENT_PROFILE_FIELDS

    const data = pickAllowed(req.body || {}, allowedFields)
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid profile fields to update' })
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data,
      select: Object.fromEntries(STUDENT_PROFILE_FIELDS.map((f) => [f, true])),
    })
    return res.json(updated)
  } catch (err) {
    console.error('profiles/student patch error:', err)
    return res.status(500).json({ error: 'Failed to update student profile' })
  }
})

// GET /api/profiles/guardian/me
router.get('/guardian/me', requireRole('parent', 'admin', 'principal'), async (req: Request, res: Response) => {
  try {
    let profile
    if (req.user!.role === 'parent') {
      profile = await prisma.parentProfile.findFirst({
        where: { userId: req.user!.id },
        include: { user: { select: { displayName: true, email: true, avatar: true } }, children: true },
      })
    } else {
      const parentProfileId = String(req.query.parentProfileId || '')
      if (!parentProfileId) return res.status(400).json({ error: 'parentProfileId required' })
      profile = await prisma.parentProfile.findUnique({
        where: { id: parentProfileId },
        include: { user: { select: { displayName: true, email: true, avatar: true } }, children: true },
      })
    }
    if (!profile) return res.status(404).json({ error: 'Guardian profile not found' })
    return res.json(profile)
  } catch (err) {
    console.error('profiles/guardian me error:', err)
    return res.status(500).json({ error: 'Failed to load guardian profile' })
  }
})

// PATCH /api/profiles/guardian/me
router.patch('/guardian/me', requireRole('parent', 'admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const data = pickAllowed(req.body || {}, GUARDIAN_EDITABLE_FIELDS)
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid guardian fields to update' })
    }

    let where
    if (req.user!.role === 'parent') {
      where = { userId: req.user!.id }
    } else {
      const parentProfileId = String(req.body?.parentProfileId || '')
      if (!parentProfileId) return res.status(400).json({ error: 'parentProfileId required' })
      where = { id: parentProfileId }
    }

    const existing = await prisma.parentProfile.findFirst({ where })
    if (!existing) return res.status(404).json({ error: 'Guardian profile not found' })

    const updated = await prisma.parentProfile.update({
      where: { id: existing.id },
      data,
      include: { user: { select: { displayName: true, email: true, avatar: true } } },
    })
    return res.json(updated)
  } catch (err) {
    console.error('profiles/guardian patch error:', err)
    return res.status(500).json({ error: 'Failed to update guardian profile' })
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
