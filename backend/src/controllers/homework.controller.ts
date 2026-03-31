import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { notifyStudentPushSubscribers } from '../services/notification.service'
import { checkAndAwardBadges } from '../services/badge.service'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'

export async function listHomework(req: Request, res: Response) {
  try {
    const { classId } = req.query
    if (req.user?.role === 'teacher' && classId) {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const where = classId ? { classId: String(classId) } : {}
    const homework = await prisma.homework.findMany({
      where,
      include: {
        completions: {
          select: {
            id: true,
            done: true,
            completedAt: true,
            student: { select: { id: true, name: true, avatar: true, stars: true } },
          },
        },
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
    const { title, description, moduleId, syllabusId, dueDate, assignedTo, starsReward, classId, aiGenerated } = req.body
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (!title || !dueDate || !classId) {
      return res.status(400).json({ error: 'title, dueDate, and classId are required' })
    }
    const hw = await prisma.homework.create({
      data: {
        title,
        description: description || null,
        moduleId: moduleId || null,
        syllabusId: syllabusId || null,
        dueDate,
        assignedTo: assignedTo || 'all',
        starsReward: starsReward ?? 5,
        aiGenerated: aiGenerated === true,
        classId,
      },
    })

    // Notify students + linked parent devices (fire-and-forget)
    prisma.student
      .findMany({ where: { classId }, select: { id: true } })
      .then((students) =>
        Promise.all(
          students.map((s) =>
            notifyStudentPushSubscribers(s.id, {
              title: `📚 New Homework${aiGenerated ? ' ✨' : ''}!`,
              body: `"${title}" is due ${dueDate} — earn ⭐${starsReward ?? 5} stars!`,
              url: '/child',
            })
          )
        )
      )
      .catch(() => {})

    return res.status(201).json(hw)
  } catch (err) {
    console.error('createHomework error:', err)
    return res.status(500).json({ error: 'Failed to create homework' })
  }
}

export async function deleteHomework(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (req.user?.role === 'teacher') {
      const target = await prisma.homework.findUnique({ where: { id }, select: { classId: true } })
      if (!target) return res.status(404).json({ error: 'Homework not found' })
      const ok = await canTeacherAccessClass(req.user.id, target.classId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
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
    // Child users can only complete homework for themselves; teachers/admins may supply studentId
    const studentId = req.user?.role === 'child'
      ? req.user.id
      : (req.body.studentId || req.user?.id)
    if (!studentId) return res.status(400).json({ error: 'studentId required' })
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const hw = await prisma.homework.findUnique({ where: { id } })
    if (!hw) return res.status(404).json({ error: 'Homework not found' })

    const completion = await prisma.homeworkCompletion.upsert({
      where: { homeworkId_studentId: { homeworkId: id, studentId } },
      update: { done: true, completedAt: new Date() },
      create: { homeworkId: id, studentId, done: true },
    })

    const stars = hw.starsReward ?? 5
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (student) {
      await prisma.student.update({
        where: { id: studentId },
        data: { stars: student.stars + stars },
      })
      await notifyStudentPushSubscribers(studentId, {
        title: 'Homework Complete! 🎉',
        body: `${student.name} completed "${hw.title}" and earned ${stars} stars!`,
        url: '/parent',
      })
      // Check how many homework this student has completed (for first_homework badge)
      const hwCount = await prisma.homeworkCompletion.count({
        where: { studentId, done: true },
      })
      // Award badges and include in response
      const newBadges = await checkAndAwardBadges(studentId, { hwCount }).catch(() => [])
      return res.json({ ...completion, starsAwarded: stars, newBadges })
    }

    return res.json({ ...completion, starsAwarded: stars, newBadges: [] })
  } catch (err) {
    console.error('completeHomework error:', err)
    return res.status(500).json({ error: 'Failed to complete homework' })
  }
}

export async function sendReminders(req: Request, res: Response) {
  try {
    const { classId } = req.body
    if (req.user?.role === 'teacher' && classId) {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const where: any = { dueDate: tomorrowStr }
    if (classId) where.classId = classId

    const dueHomework = await prisma.homework.findMany({
      where,
      include: { class: { include: { students: true } } },
    })

    let sent = 0
    for (const hw of dueHomework) {
      const completedIds = await prisma.homeworkCompletion.findMany({
        where: { homeworkId: hw.id, done: true },
        select: { studentId: true },
      })
      const completedSet = new Set(completedIds.map((c: any) => c.studentId))
      const pending = hw.class.students.filter((s: any) => !completedSet.has(s.id))
      for (const s of pending) {
        sent++
        await notifyStudentPushSubscribers(s.id, {
          title: '⏰ Homework Due Tomorrow!',
          body: `"${hw.title}" is due tomorrow — earn ⭐${hw.starsReward} stars!`,
          url: '/child',
        })
      }
    }
    return res.json({ sent, homeworkCount: dueHomework.length })
  } catch (err) {
    console.error('sendReminders error:', err)
    return res.status(500).json({ error: 'Failed to send reminders' })
  }
}

export async function getCompletions(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (req.user?.role === 'teacher') {
      const hw = await prisma.homework.findUnique({ where: { id }, select: { classId: true } })
      if (!hw) return res.status(404).json({ error: 'Homework not found' })
      const ok = await canTeacherAccessClass(req.user.id, hw.classId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const completions = await prisma.homeworkCompletion.findMany({
      where: { homeworkId: id },
      select: {
        id: true,
        done: true,
        completedAt: true,
        student: { select: { id: true, name: true, avatar: true, stars: true } },
      },
    })
    return res.json(completions)
  } catch (err) {
    console.error('getCompletions error:', err)
    return res.status(500).json({ error: 'Failed to get completions' })
  }
}
