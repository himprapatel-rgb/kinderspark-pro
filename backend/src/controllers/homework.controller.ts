import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { sendPushNotification } from '../services/notification.service'

export async function listHomework(req: Request, res: Response) {
  try {
    const { classId } = req.query
    const where = classId ? { classId: String(classId) } : {}
    const homework = await prisma.homework.findMany({
      where,
      include: {
        completions: { include: { student: true } },
        syllabus: { include: { items: { orderBy: { order: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(homework)
  } catch (err) {
    console.error('listHomework error:', err)
    return res.status(500).json({ error: 'Failed to get homework' })
  }
}

export async function createHomework(req: Request, res: Response) {
  try {
    const { title, moduleId, syllabusId, dueDate, assignedTo, classId } = req.body
    if (!title || !dueDate || !classId) {
      return res.status(400).json({ error: 'title, dueDate, and classId are required' })
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
    return res.status(201).json(hw)
  } catch (err) {
    console.error('createHomework error:', err)
    return res.status(500).json({ error: 'Failed to create homework' })
  }
}

export async function deleteHomework(req: Request, res: Response) {
  try {
    const { id } = req.params
    await prisma.homework.delete({ where: { id } })
    return res.json({ success: true })
  } catch (err) {
    console.error('deleteHomework error:', err)
    return res.status(500).json({ error: 'Failed to delete homework' })
  }
}

export async function completeHomework(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { studentId } = req.body
    if (!studentId) return res.status(400).json({ error: 'studentId required' })

    const hw = await prisma.homework.findUnique({ where: { id } })
    if (!hw) return res.status(404).json({ error: 'Homework not found' })

    const completion = await prisma.homeworkCompletion.upsert({
      where: { homeworkId_studentId: { homeworkId: id, studentId } },
      update: { done: true, completedAt: new Date() },
      create: { homeworkId: id, studentId, done: true },
    })

    // Award stars based on homework title length as proxy
    const stars = Math.max(1, Math.min(5, Math.floor(hw.title.length / 5)))
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (student) {
      await prisma.student.update({
        where: { id: studentId },
        data: { stars: student.stars + stars },
      })
      await sendPushNotification(
        'Homework Complete! 🎉',
        `${student.name} completed "${hw.title}" and earned ${stars} stars!`,
        studentId
      )
    }

    return res.json({ ...completion, starsAwarded: stars })
  } catch (err) {
    console.error('completeHomework error:', err)
    return res.status(500).json({ error: 'Failed to complete homework' })
  }
}

export async function getCompletions(req: Request, res: Response) {
  try {
    const { id } = req.params
    const completions = await prisma.homeworkCompletion.findMany({
      where: { homeworkId: id },
      include: { student: true },
    })
    return res.json(completions)
  } catch (err) {
    console.error('getCompletions error:', err)
    return res.status(500).json({ error: 'Failed to get completions' })
  }
}
