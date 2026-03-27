import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)

// POST /api/assignments/teacher-class
router.post('/teacher-class', requireRole('admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const { teacherProfileId, classGroupId, subject, isPrimary } = req.body || {}
    if (!teacherProfileId || !classGroupId) {
      return res.status(400).json({ error: 'teacherProfileId and classGroupId required' })
    }
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

export default router
