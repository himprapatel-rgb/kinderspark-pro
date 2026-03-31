import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireRole } from '../middleware/auth.middleware'

const router = Router()
router.use(requireRole('admin', 'principal'))

// GET /api/admin/stats — school-wide stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [classCount, studentCount, syllabusCount, starsAgg] = await Promise.all([
      prisma.class.count(),
      prisma.student.count(),
      prisma.syllabus.count(),
      prisma.student.aggregate({ _sum: { stars: true } }),
    ])
    const totalStars = starsAgg._sum.stars || 0

    return res.json({
      totalClasses: classCount,
      totalStudents: studentCount,
      totalSyllabuses: syllabusCount,
      totalStars,
    })
  } catch (err) {
    console.error('adminStats error:', err)
    return res.status(500).json({ error: 'Failed to get stats' })
  }
})

// GET /api/admin/leaderboard — top 10 students by stars
router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { stars: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        avatar: true,
        stars: true,
        streak: true,
        aiSessions: true,
        aiBestLevel: true,
        class: { select: { name: true, grade: true } },
      },
    })
    return res.json(students)
  } catch (err) {
    console.error('adminLeaderboard error:', err)
    return res.status(500).json({ error: 'Failed to get leaderboard' })
  }
})

// GET /api/admin/class-analytics — per-class breakdown for analytics tab
router.get('/class-analytics', async (_req: Request, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        students: { select: { id: true, stars: true, aiSessions: true, aiBestLevel: true } },
        homework: {
          select: {
            id: true,
            aiGenerated: true,
            completions: { where: { done: true }, select: { id: true } },
          },
        },
      },
    })

    const analytics = classes.map(cls => {
      const totalStudents = cls.students.length
      const avgStars = totalStudents
        ? Math.round(cls.students.reduce((a, s) => a + s.stars, 0) / totalStudents)
        : 0
      const totalAISessions = cls.students.reduce((a, s) => a + s.aiSessions, 0)
      const avgAILevel = totalStudents
        ? +(cls.students.reduce((a, s) => a + s.aiBestLevel, 0) / totalStudents).toFixed(1)
        : 0
      const hwCompletionRate =
        cls.homework.length && totalStudents
          ? Math.round(
              cls.homework.reduce((a, hw) => a + hw.completions.length, 0) /
                (cls.homework.length * Math.max(totalStudents, 1)) * 100
            )
          : 0
      const aiHomeworkCount = cls.homework.filter(hw => hw.aiGenerated).length

      return {
        id: cls.id,
        name: cls.name,
        grade: (cls as any).grade || '',
        totalStudents,
        avgStars,
        totalAISessions,
        avgAILevel,
        hwCompletionRate,
        totalHomework: cls.homework.length,
        aiHomeworkCount,
      }
    })

    return res.json(analytics)
  } catch (err) {
    console.error('classAnalytics error:', err)
    return res.status(500).json({ error: 'Failed to get class analytics' })
  }
})

export default router
