import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'

const router = Router()

// GET /api/classes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: { select: { students: true, homework: true, syllabuses: true } },
        school: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(classes)
  } catch (error) {
    console.error('Get classes error:', error)
    res.status(500).json({ error: 'Failed to get classes' })
  }
})

// GET /api/classes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        school: true,
        _count: { select: { students: true, homework: true, syllabuses: true } },
      },
    })

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }

    res.json(cls)
  } catch (error) {
    console.error('Get class error:', error)
    res.status(500).json({ error: 'Failed to get class' })
  }
})

// GET /api/classes/:id/students
router.get('/:id/students', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const students = await prisma.student.findMany({
      where: { classId: id },
      include: {
        progress: true,
        feedback: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(students)
  } catch (error) {
    console.error('Get class students error:', error)
    res.status(500).json({ error: 'Failed to get class students' })
  }
})

// POST /api/classes
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, grade, schoolId } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Class name is required' })
    }

    const cls = await prisma.class.create({
      data: {
        name,
        grade: grade || 'KG 1',
        schoolId: schoolId || null,
      },
    })

    res.status(201).json(cls)
  } catch (error) {
    console.error('Create class error:', error)
    res.status(500).json({ error: 'Failed to create class' })
  }
})

// PUT /api/classes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, grade } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (grade !== undefined) updateData.grade = grade

    const cls = await prisma.class.update({
      where: { id },
      data: updateData,
    })

    res.json(cls)
  } catch (error) {
    console.error('Update class error:', error)
    res.status(500).json({ error: 'Failed to update class' })
  }
})

// DELETE /api/classes/:id — only allowed if class has no students
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const studentCount = await prisma.student.count({ where: { classId: id } })
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Cannot delete a class that still has students' })
    }
    await prisma.class.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete class error:', error)
    res.status(500).json({ error: 'Failed to delete class' })
  }
})

export default router
