import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/students?classId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query
    const where = classId ? { classId: String(classId) } : {}

    const students = await prisma.student.findMany({
      where,
      include: {
        progress: true,
        feedback: true,
        class: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(students)
  } catch (error) {
    console.error('Get students error:', error)
    res.status(500).json({ error: 'Failed to get students' })
  }
})

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        progress: true,
        feedback: true,
        aiSessionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        class: true,
      },
    })

    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    res.json(student)
  } catch (error) {
    console.error('Get student error:', error)
    res.status(500).json({ error: 'Failed to get student' })
  }
})

// POST /api/students
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, age, avatar, pin, classId, stars, streak } = req.body

    if (!name || !pin || !classId) {
      return res.status(400).json({ error: 'Name, PIN, and classId are required' })
    }

    const student = await prisma.student.create({
      data: {
        name,
        age: age || 5,
        avatar: avatar || '👧',
        pin,
        stars: stars || 0,
        streak: streak || 0,
        classId,
        ownedItems: ['av_def', 'th_def'],
        selectedTheme: 'th_def',
      },
    })

    res.status(201).json(student)
  } catch (error: any) {
    console.error('Create student error:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'PIN already exists' })
    }
    res.status(500).json({ error: 'Failed to create student' })
  }
})

// PUT /api/students/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      name, age, avatar, stars, streak, grade,
      aiStars, aiSessions, aiBestLevel, ownedItems, selectedTheme
    } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (age !== undefined) updateData.age = age
    if (avatar !== undefined) updateData.avatar = avatar
    if (stars !== undefined) updateData.stars = stars
    if (streak !== undefined) updateData.streak = streak
    if (grade !== undefined) updateData.grade = grade
    if (aiStars !== undefined) updateData.aiStars = aiStars
    if (aiSessions !== undefined) updateData.aiSessions = aiSessions
    if (aiBestLevel !== undefined) updateData.aiBestLevel = aiBestLevel
    if (ownedItems !== undefined) updateData.ownedItems = ownedItems
    if (selectedTheme !== undefined) updateData.selectedTheme = selectedTheme

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
    })

    res.json(student)
  } catch (error) {
    console.error('Update student error:', error)
    res.status(500).json({ error: 'Failed to update student' })
  }
})

// DELETE /api/students/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.student.delete({ where: { id } })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete student error:', error)
    res.status(500).json({ error: 'Failed to delete student' })
  }
})

export default router
