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

// GET /api/schools/:schoolId/graph
router.get('/:schoolId/graph', requireRole('admin', 'principal'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId
    const grades = await prisma.gradeLevel.findMany({
      where: { schoolId },
      include: {
        classGroups: {
          include: {
            studentEnrollments: {
              where: { status: 'active' },
              include: { studentProfile: { include: { user: true } } },
            },
            teacherAssignments: {
              include: { teacherProfile: { include: { user: true } } },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    })
    const graph = grades.map((g) => ({
      id: g.id,
      code: g.code,
      label: g.label,
      classGroups: g.classGroups.map((cg) => ({
        id: cg.id,
        name: cg.name,
        section: cg.section,
        teachers: cg.teacherAssignments.map((a) => ({
          id: a.teacherProfile.id,
          name: a.teacherProfile.user.displayName,
        })),
        students: cg.studentEnrollments.map((e) => ({
          id: e.studentProfile.id,
          name: e.studentProfile.user.displayName,
          avatar: e.studentProfile.user.avatar,
        })),
      })),
    }))
    return res.json({ schoolId, grades: graph })
  } catch (err) {
    console.error('schools graph error:', err)
    return res.status(500).json({ error: 'Failed to load school graph' })
  }
})

export default router
