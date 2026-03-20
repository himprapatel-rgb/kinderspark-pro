import { Request, Response } from 'express'
import prisma from '../prisma/client'

export async function listSyllabuses(req: Request, res: Response) {
  try {
    const { classId } = req.query
    let syllabuses
    if (classId) {
      syllabuses = await prisma.syllabus.findMany({
        where: { classes: { some: { classId: String(classId) } } },
        include: { items: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      syllabuses = await prisma.syllabus.findMany({
        include: { items: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
    }
    return res.json(syllabuses)
  } catch (err) {
    console.error('listSyllabuses error:', err)
    return res.status(500).json({ error: 'Failed to get syllabuses' })
  }
}

export async function getSyllabus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const syllabus = await prisma.syllabus.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    if (!syllabus) return res.status(404).json({ error: 'Syllabus not found' })
    return res.json(syllabus)
  } catch (err) {
    console.error('getSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to get syllabus' })
  }
}

export async function createSyllabus(req: Request, res: Response) {
  try {
    const { title, icon, color, grade, type, description, items, classId } = req.body
    if (!title) return res.status(400).json({ error: 'title required' })

    const data: any = {
      title,
      icon: icon || '📖',
      color: color || '#5E5CE6',
      grade: grade || 'all',
      type: type || 'custom',
      description: description || null,
    }

    if (classId) {
      data.classes = { create: [{ classId }] }
    }

    if (items && Array.isArray(items)) {
      data.items = {
        create: items.map((item: any, idx: number) => ({
          word: item.w || item.word || '',
          emoji: item.e || item.emoji || '⭐',
          hint: item.hint || null,
          order: idx,
        })),
      }
    }

    const syllabus = await prisma.syllabus.create({
      data,
      include: { items: { orderBy: { order: 'asc' } } },
    })
    return res.status(201).json(syllabus)
  } catch (err) {
    console.error('createSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to create syllabus' })
  }
}

export async function updateSyllabus(req: Request, res: Response) {
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
    return res.json(syllabus)
  } catch (err) {
    console.error('updateSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to update syllabus' })
  }
}

export async function deleteSyllabus(req: Request, res: Response) {
  try {
    const { id } = req.params
    await prisma.syllabus.delete({ where: { id } })
    return res.json({ success: true })
  } catch (err) {
    console.error('deleteSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to delete syllabus' })
  }
}

export async function publishSyllabus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const syllabus = await prisma.syllabus.update({
      where: { id },
      data: { published: true },
    })
    return res.json(syllabus)
  } catch (err) {
    console.error('publishSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to publish syllabus' })
  }
}

export async function assignSyllabus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { assignedTo, classId } = req.body

    const syllabus = await prisma.syllabus.update({
      where: { id },
      data: { assignedTo: assignedTo || 'all' },
    })

    if (classId) {
      await prisma.classSyllabus.upsert({
        where: { classId_syllabusId: { classId, syllabusId: id } },
        update: {},
        create: { classId, syllabusId: id },
      })
    }

    return res.json(syllabus)
  } catch (err) {
    console.error('assignSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to assign syllabus' })
  }
}
