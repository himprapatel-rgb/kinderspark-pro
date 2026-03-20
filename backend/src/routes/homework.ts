import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/homework?classId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query
    const where = classId ? { classId: String(classId) } : {}

    const homework = await prisma.homework.findMany({
      where,
      include: {
        completions: {
          include: { student: true },
        },
        syllabus: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(homework)
  } catch (error) {
    console.error('Get homework error:', error)
    res.status(500).json({ error: 'Failed to get homework' })
  }
})

// POST /api/homework
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, moduleId, syllabusId, dueDate, assignedTo, classId } = req.body

    if (!title || !dueDate || !classId) {
      return res.status(400).json({ error: 'Title, dueDate, and classId are required' })
    }

    const hw = await prisma.homework.create({
      data: {
        title,
        moduleId: moduleId || null,
        syllabusId: syllabusId || null,
        dueDate,
        assignedTo: assignedTo || 'all',
        classId,
      },
    })

    res.status(201).json(hw)
  } catch (error) {
    console.error('Create homework error:', error)
    res.status(500).json({ error: 'Failed to create homework' })
  }
})

// DELETE /api/homework/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.homework.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete homework error:', error)
    res.status(500).json({ error: 'Failed to delete homework' })
  }
})

// POST /api/homework/:id/complete
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { studentId } = req.body

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' })
    }

    const completion = await prisma.homeworkCompletion.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId: id,
          studentId,
        },
      },
      update: { done: true, completedAt: new Date() },
      create: {
        homeworkId: id,
        studentId,
        done: true,
      },
    })

    res.json(completion)
  } catch (error) {
    console.error('Complete homework error:', error)
    res.status(500).json({ error: 'Failed to complete homework' })
  }
})

// GET /api/homework/:id/completions
router.get('/:id/completions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const completions = await prisma.homeworkCompletion.findMany({
      where: { homeworkId: id },
      include: { student: true },
    })

    res.json(completions)
  } catch (error) {
    console.error('Get completions error:', error)
    res.status(500).json({ error: 'Failed to get completions' })
  }
})

export default router
