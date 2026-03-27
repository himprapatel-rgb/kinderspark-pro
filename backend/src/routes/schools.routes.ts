import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()
router.use(requireAuth)

// GET /api/schools/:schoolId/overview
router.get('/:schoolId/overview', requireRole('admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params
    const [school, classes, teachers, students] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.classGroup.count({ where: { schoolId } }),
      prisma.teacherProfile.count({ where: { schoolId } }),
      prisma.studentProfile.count({ where: { schoolId } }),
    ])
    if (!school) return res.status(404).json({ error: 'School not found' })
    return res.json({
      schoolId,
      schoolName: school.name,
      classGroups: classes,
      teachers,
      students,
    })
  } catch (err) {
    console.error('schools overview error:', err)
    return res.status(500).json({ error: 'Failed to load school overview' })
  }
})

// GET /api/schools/:schoolId/grades
router.get('/:schoolId/grades', requireRole('admin', 'principal', 'teacher'), async (req: Request, res: Response) => {
  try {
    const grades = await prisma.gradeLevel.findMany({
      where: { schoolId: req.params.schoolId },
      include: { classGroups: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    })
    return res.json(grades)
  } catch (err) {
    console.error('schools grades error:', err)
    return res.status(500).json({ error: 'Failed to load grades' })
  }
})

export default router
