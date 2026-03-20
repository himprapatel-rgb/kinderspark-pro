import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'

const router = Router()

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

export default router
