import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import {
  canTeacherAccessStudent,
  canUserAccessClassGroup,
  canUserAccessSchool,
  canUserAccessStudentProfile,
  resolveIdentityContext,
} from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

// POST /api/assignments/teacher-class
router.post('/teacher-class', requireRole('admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const { teacherProfileId, classGroupId, subject, isPrimary } = req.body || {}
    if (!teacherProfileId || !classGroupId) {
      return res.status(400).json({ error: 'teacherProfileId and classGroupId required' })
    }
    const [teacher, classGroup] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { id: teacherProfileId }, select: { id: true, schoolId: true } }),
      prisma.classGroup.findUnique({ where: { id: classGroupId }, select: { id: true, schoolId: true } }),
    ])
    if (!teacher || !classGroup) return res.status(404).json({ error: 'Teacher or class group not found' })
    if (teacher.schoolId !== classGroup.schoolId) {
      return res.status(400).json({ error: 'Teacher and class group must belong to the same school' })
    }
    const allowed = await canUserAccessSchool(req.user!.id, req.user!.role, classGroup.schoolId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
    const row = await prisma.teacherClassAssignment.create({
      data: { teacherProfileId, classGroupId, subject: subject || null, isPrimary: !!isPrimary },
    })
    return res.status(201).json(row)
  } catch (err) {
    console.error('assign teacher-class error:', err)
    return res.status(500).json({ error: 'Failed to assign teacher to class' })
  }
})

// POST /api/assignments/student-enrollment
router.post('/student-enrollment', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const { studentProfileId, classGroupId, startDate } = req.body || {}
    if (!studentProfileId || !classGroupId) {
      return res.status(400).json({ error: 'studentProfileId and classGroupId required' })
    }
    const [student, classGroup] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true } }),
      prisma.classGroup.findUnique({ where: { id: classGroupId }, select: { id: true, schoolId: true } }),
    ])
    if (!student || !classGroup) return res.status(404).json({ error: 'Student or class group not found' })
    if (student.schoolId !== classGroup.schoolId) {
      return res.status(400).json({ error: 'Student and class group must belong to the same school' })
    }
    if (req.user!.role === 'teacher') {
      const ok = await canUserAccessClassGroup(req.user!.id, req.user!.role, classGroupId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    } else {
      const ok = await canUserAccessSchool(req.user!.id, req.user!.role, classGroup.schoolId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const row = await prisma.studentClassEnrollment.create({
      data: {
        studentProfileId,
        classGroupId,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
      },
    })
    return res.status(201).json(row)
  } catch (err) {
    console.error('assign student enrollment error:', err)
    return res.status(500).json({ error: 'Failed to enroll student' })
  }
})

// GET /api/assignments/class-group/:classGroupId
router.get('/class-group/:classGroupId', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const classGroupId = req.params.classGroupId
    const allowed = await canUserAccessClassGroup(req.user!.id, req.user!.role, classGroupId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
    const [teachers, students] = await Promise.all([
      prisma.teacherClassAssignment.findMany({
        where: { classGroupId },
        include: { teacherProfile: { include: { user: true } } },
      }),
      prisma.studentClassEnrollment.findMany({
        where: { classGroupId, status: 'active' },
        include: { studentProfile: { include: { user: true } } },
      }),
    ])
    return res.json({ teachers, students })
  } catch (err) {
    console.error('get class-group assignments error:', err)
    return res.status(500).json({ error: 'Failed to load assignments' })
  }
})

// POST /api/assignments/teacher-student-override
router.post('/teacher-student-override', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const { teacherProfileId, studentProfileId, subject, reason, startDate, endDate, isActive } = req.body || {}
    if (!teacherProfileId || !studentProfileId) {
      return res.status(400).json({ error: 'teacherProfileId and studentProfileId required' })
    }

    const [teacher, student] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { id: teacherProfileId }, select: { id: true, schoolId: true, userId: true } }),
      prisma.studentProfile.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true } }),
    ])
    if (!teacher || !student) return res.status(404).json({ error: 'Teacher or student profile not found' })
    if (teacher.schoolId !== student.schoolId) {
      return res.status(400).json({ error: 'Teacher and student must belong to the same school' })
    }

    if (req.user!.role === 'teacher') {
      const identity = await resolveIdentityContext(req.user!.id, req.user!.role)
      if (!identity?.teacherProfileId || identity.teacherProfileId !== teacherProfileId) {
        return res.status(403).json({ error: 'Teachers can only create overrides for their own profile' })
      }
      const canAccess = await canTeacherAccessStudent(req.user!.id, studentProfileId)
      if (!canAccess) return res.status(403).json({ error: 'Insufficient permissions' })
    } else {
      const allowed = await canUserAccessSchool(req.user!.id, req.user!.role, teacher.schoolId)
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const row = await prisma.teacherStudentAssignment.create({
      data: {
        teacherProfileId,
        studentProfileId,
        subject: subject || null,
        reason: reason || null,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })
    return res.status(201).json(row)
  } catch (err) {
    console.error('assign teacher-student override error:', err)
    return res.status(500).json({ error: 'Failed to assign teacher-student override' })
  }
})

// GET /api/assignments/student/:studentProfileId/teacher-overrides
router.get('/student/:studentProfileId/teacher-overrides', requireRole('admin', 'principal', 'teacher', 'parent', 'child'), async (req: Request, res: Response) => {
  try {
    const studentProfileId = req.params.studentProfileId
    const allowed = await canUserAccessStudentProfile(req.user!.id, req.user!.role, studentProfileId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const rows = await prisma.teacherStudentAssignment.findMany({
      where: { studentProfileId },
      include: {
        teacherProfile: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
        studentProfile: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
    return res.json(rows)
  } catch (err) {
    console.error('get teacher overrides error:', err)
    return res.status(500).json({ error: 'Failed to load teacher overrides' })
  }
})

// DELETE /api/assignments/teacher-student-override/:id
router.delete('/teacher-student-override/:id', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const row = await prisma.teacherStudentAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        teacherProfile: { select: { id: true, schoolId: true, userId: true } },
        studentProfile: { select: { id: true } },
      },
    })
    if (!row) return res.status(404).json({ error: 'Override assignment not found' })

    if (req.user!.role === 'teacher') {
      const identity = await resolveIdentityContext(req.user!.id, req.user!.role)
      if (!identity?.teacherProfileId || identity.teacherProfileId !== row.teacherProfile.id) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
    } else {
      const allowed = await canUserAccessSchool(req.user!.id, req.user!.role, row.teacherProfile.schoolId)
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    await prisma.teacherStudentAssignment.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (err) {
    console.error('delete teacher override error:', err)
    return res.status(500).json({ error: 'Failed to delete teacher override' })
  }
})

export default router
