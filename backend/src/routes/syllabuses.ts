import prisma from '../prisma/client'
import { Router, Request, Response } from 'express'


const router = Router()


// GET /api/syllabuses?classId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query

    let syllabuses
    if (classId) {
      syllabuses = await prisma.syllabus.findMany({
        where: {
          classes: {
            some: { classId: String(classId) },
          },
        },
        include: { items: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      syllabuses = await prisma.syllabus.findMany({
        include: { items: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
    }

    res.json(syllabuses)
  } catch (error) {
    console.error('Get syllabuses error:', error)
    res.status(500).json({ error: 'Failed to get syllabuses' })
  }
})

// GET /api/syllabuses/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const syllabus = await prisma.syllabus.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' })
    }

    res.json(syllabus)
  } catch (error) {
    console.error('Get syllabus error:', error)
    res.status(500).json({ error: 'Failed to get syllabus' })
  }
})

// POST /api/syllabuses
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, icon, color, grade, type, description, items, classId } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const syllabusData: any = {
      title,
      icon: icon || '📖',
      color: color || '#5E5CE6',
      grade: grade || 'all',
      type: type || 'custom',
      description: description || null,
    }

    if (classId) {
      syllabusData.classes = {
        create: [{ classId }],
      }
    }

    if (items && Array.isArray(items)) {
      syllabusData.items = {
        create: items.map((item: any, idx: number) => ({
          word: item.w || item.word || '',
          emoji: item.e || item.emoji || '⭐',
          hint: item.hint || null,
          order: idx,
        })),
      }
    }

    const syllabus = await prisma.syllabus.create({
      data: syllabusData,
      include: { items: { orderBy: { order: 'asc' } } },
    })

    res.status(201).json(syllabus)
  } catch (error) {
    console.error('Create syllabus error:', error)
    res.status(500).json({ error: 'Failed to create syllabus' })
  }
})

// PUT /api/syllabuses/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, icon, color, grade, type, description, published, assignedTo, items } = req.body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (grade !== undefined) updateData.grade = grade
    if (type !== undefined) updateData.type = type
    if (description !== undefined) updateData.description = description
    if (published !== undefined) updateData.published = published
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    if (items && Array.isArray(items)) {
      // Delete existing items and recreate
      await prisma.syllabusItem.deleteMany({ where: { syllabusId: id } })
      updateData.items = {
        create: items.map((item: any, idx: number) => ({
          word: item.w || item.word || '',
          emoji: item.e || item.emoji || '⭐',
          hint: item.hint || null,
          order: idx,
        })),
      }
    }

    const syllabus = await prisma.syllabus.update({
      where: { id },
      data: updateData,
      include: { items: { orderBy: { order: 'asc' } } },
    })

    res.json(syllabus)
  } catch (error) {
    console.error('Update syllabus error:', error)
    res.status(500).json({ error: 'Failed to update syllabus' })
  }
})

// DELETE /api/syllabuses/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.syllabus.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete syllabus error:', error)
    res.status(500).json({ error: 'Failed to delete syllabus' })
  }
})

// POST /api/syllabuses/:id/publish
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const syllabus = await prisma.syllabus.update({
      where: { id },
      data: { published: true },
    })

    res.json(syllabus)
  } catch (error) {
    console.error('Publish syllabus error:', error)
    res.status(500).json({ error: 'Failed to publish syllabus' })
  }
})

// POST /api/syllabuses/:id/assign
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { assignedTo, classId } = req.body

    const syllabus = await prisma.syllabus.update({
      where: { id },
      data: { assignedTo: assignedTo || 'all' },
    })

    // If classId is provided, link to class
    if (classId) {
      await prisma.classSyllabus.upsert({
        where: { classId_syllabusId: { classId, syllabusId: id } },
        update: {},
        create: { classId, syllabusId: id },
      })
    }

    res.json(syllabus)
  } catch (error) {
    console.error('Assign syllabus error:', error)
    res.status(500).json({ error: 'Failed to assign syllabus' })
  }
})

export default router
