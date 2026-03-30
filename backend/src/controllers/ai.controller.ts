import { Request, Response } from 'express'
import {
  generateLesson,
  generateTutorFeedback,
  generateRecommendations,
  generateHomeworkIdea,
  generateStudentReport,
  generateSyllabusAI,
} from '../services/ai'
import { sanitizeSpark } from '../services/ai/spark'
import { AI_SPARK_TASKS } from '../services/ai/promptTemplates'
import { runUnifiedSparkTask } from '../services/sparkTaskRunner'
import { buildClassReport } from '../services/report.service'
import { sanitizePromptInput } from '../utils/sanitize'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'
import prisma from '../prisma/client'
import { formatStudentAgentContextBlock, getStudentAgentContext } from '../services/studentAgentContext.service'

/** Rich learner prompt context: only for the authenticated child or an explicitly allowed studentId. */
async function resolveSparkLearnerLegacyId(req: Request, bodyStudentId: unknown): Promise<string | undefined> {
  const u = req.user
  if (!u?.id) return undefined
  if (u.role === 'child') return u.id

  const sid = typeof bodyStudentId === 'string' ? bodyStudentId.trim() : ''
  if (!sid) return undefined

  if (u.role === 'parent') {
    return (await canParentAccessStudent(u.id, sid)) ? sid : undefined
  }
  if (['teacher', 'admin', 'principal'].includes(String(u.role))) {
    const row = await prisma.student.findUnique({ where: { id: sid }, select: { id: true, classId: true } })
    if (!row) return undefined
    if (u.role === 'teacher' && !(await canTeacherAccessClass(u.id, row.classId))) return undefined
    return row.id
  }
  return undefined
}

export async function aiGenerateLesson(req: Request, res: Response) {
  const { topic, count = 10 } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  const safeTopic = sanitizePromptInput(topic)
  if (!safeTopic) return res.status(400).json({ error: 'topic required' })
  try {
    const items = await generateLesson(safeTopic, count)
    return res.json({ items })
  } catch (err) {
    return res.status(500).json({ error: 'AI generation failed', items: [] })
  }
}

export async function aiWeeklyReport(req: Request, res: Response) {
  const { classId } = req.body
  if (!classId) return res.status(400).json({ error: 'classId required' })
  try {
    const report = await buildClassReport(classId)
    return res.json({ report })
  } catch (err) {
    return res.status(500).json({ error: 'Report generation failed' })
  }
}

export async function aiTutorFeedback(req: Request, res: Response) {
  const { correct, total, topic, maxLevel, studentId: bodyStudentId } = req.body
  try {
    const safeTopic = sanitizePromptInput(topic)
    const legacyId = await resolveSparkLearnerLegacyId(req, bodyStudentId)
    let learnerCtx: string | undefined
    if (legacyId) {
      const ctx = await getStudentAgentContext(legacyId)
      if (ctx) learnerCtx = formatStudentAgentContextBlock(ctx).slice(0, 2000)
    }
    const feedback = await generateTutorFeedback(correct, total, safeTopic, maxLevel, learnerCtx)
    return res.json({ feedback })
  } catch {
    return res.json({ feedback: 'Amazing effort today! Keep practicing every day and you will be a superstar! 🌟' })
  }
}

export async function aiAutoSyllabus(req: Request, res: Response) {
  const { topic, grade = 'KG 1', count = 10, classId } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  const safeTopic = sanitizePromptInput(topic)
  const safeGrade = sanitizePromptInput(grade, 20)
  if (!safeTopic) return res.status(400).json({ error: 'topic required' })
  try {
    const generated = await generateSyllabusAI(safeTopic, safeGrade, Number(count))
    const syllabus = await prisma.syllabus.create({
      data: {
        title: generated.title,
        icon: generated.icon,
        color: generated.color,
        description: generated.description,
        grade,
        published: true,
        items: {
          create: generated.items.map((item, i) => ({
            word: item.word,
            emoji: item.emoji,
            hint: item.hint,
            order: i,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    // Auto-assign to class if provided
    if (classId) {
      await prisma.classSyllabus.create({ data: { classId, syllabusId: syllabus.id } }).catch(() => {})
    }
    return res.json(syllabus)
  } catch (err) {
    console.error('aiAutoSyllabus error:', err)
    return res.status(500).json({ error: 'Failed to generate syllabus' })
  }
}

export async function aiSendParentReports(req: Request, res: Response) {
  const { classId } = req.body
  if (!classId) return res.status(400).json({ error: 'classId required' })
  try {
    const [students, homework] = await Promise.all([
      prisma.student.findMany({ where: { classId } }),
      prisma.homework.findMany({ where: { classId } }),
    ])
    if (students.length === 0) return res.json({ sent: 0, total: 0 })

    const results = await Promise.allSettled(
      students.map(async (student) => {
        const hwDone = await prisma.homeworkCompletion.count({
          where: { studentId: student.id, done: true },
        })
        const sctx = await getStudentAgentContext(student.id)
        const learnerCtx = sctx ? formatStudentAgentContextBlock(sctx).slice(0, 2000) : undefined
        const report = await generateStudentReport(
          student.name, student.stars, hwDone, homework.length,
          student.aiSessions, student.aiBestLevel,
          learnerCtx,
        )
        await prisma.message.create({
          data: {
            from: '📊 AI Weekly Report',
            fromId: 'system',
            to: student.id,
            subject: `📊 ${student.name}'s Weekly Progress Report`,
            body: report,
            classId,
          },
        })
      })
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    return res.json({ sent, total: students.length })
  } catch (err) {
    console.error('aiSendParentReports error:', err)
    return res.status(500).json({ error: 'Failed to send reports' })
  }
}

export async function aiGenerateHomework(req: Request, res: Response) {
  const { topic, grade = 'KG 1', classId } = req.body
  if (!topic) return res.status(400).json({ error: 'topic required' })
  const safeTopic = sanitizePromptInput(topic)
  const safeGrade = sanitizePromptInput(grade, 20)
  if (!safeTopic) return res.status(400).json({ error: 'topic required' })
  try {
    // Get student count for context if classId is provided
    let studentCount = 10
    if (classId) {
      studentCount = await prisma.student.count({ where: { classId } })
    }
    const idea = await generateHomeworkIdea(safeTopic, safeGrade, studentCount)
    return res.json(idea)
  } catch (err) {
    console.error('AI homework generation failed:', err)
    // Fallback so the UI always gets something usable
    return res.json({
      title: `${topic} Practice ✨`,
      description: 'A fun learning activity for your child!',
      moduleId: 'numbers',
      emoji: '📝',
      starsReward: 10,
      estimatedMinutes: 10,
      activities: [
        { instruction: 'Practice with your child together', emoji: '👨‍👩‍👧' },
        { instruction: 'Say each answer out loud', emoji: '🗣️' },
        { instruction: 'Give a high five when done!', emoji: '🙌' },
      ],
    })
  }
}

const POEM_MINUTES = new Set([3, 4, 5, 6, 7, 8])

export async function aiUnifiedSparkTask(req: Request, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' })
  const { taskId, spark, targetMinutes, topic, grade, classId, studentId: sparkStudentId } = req.body || {}

  if (String(taskId) === AI_SPARK_TASKS.HOMEWORK_IDEA) {
    if (!['teacher', 'admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only teachers and admins can run this task' })
    }
  }

  try {
    const legacyStudentId = await resolveSparkLearnerLegacyId(req, sparkStudentId)
    const out = await runUnifiedSparkTask({
      taskId: String(taskId || ''),
      role: req.user.role || 'child',
      userId: req.user.id,
      spark,
      targetMinutes,
      topic,
      grade,
      classId,
      legacyStudentId,
    })
    return res.status(201).json({
      ...out.payload,
      id: out.artifactId,
      taskId: out.taskId,
      templateVersion: out.templateVersion,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI task failed'
    if (msg.startsWith('Invalid taskId') || msg.startsWith('Add ')) {
      return res.status(400).json({ error: msg })
    }
    console.error('aiUnifiedSparkTask error:', err)
    return res.status(500).json({ error: msg })
  }
}

export async function aiGeneratePoemSpark(req: Request, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' })
  const { spark, targetMinutes: rawMinutes, studentId: poemStudentId } = req.body
  const role = req.user.role || 'child'
  const safeSpark = sanitizeSpark(spark, role)
  const targetMinutes = typeof rawMinutes === 'number' && POEM_MINUTES.has(rawMinutes) ? rawMinutes : 4
  const legacyStudentId = await resolveSparkLearnerLegacyId(req, poemStudentId)

  try {
    const out = await runUnifiedSparkTask({
      taskId: AI_SPARK_TASKS.POEM_LISTEN,
      role,
      userId: req.user.id,
      spark,
      targetMinutes: rawMinutes,
      legacyStudentId,
    })
    return res.status(201).json({
      id: out.artifactId,
      title: out.payload.title,
      poem: out.payload.poem,
      targetMinutes: out.payload.targetMinutes,
      templateVersion: out.templateVersion,
    })
  } catch (err) {
    console.error('aiGeneratePoemSpark error:', err)
    if (!safeSpark) {
      return res.status(400).json({ error: 'Add one word or a short line (your idea)' })
    }
    return res.status(500).json({
      error: 'Could not make your poem right now. Try again in a moment!',
      title: 'Your Spark ✨',
      poem: `Here is a tiny poem while we try again:\n\nStars are bright,\nDay turns to night,\nYou're learning with all your might! ⭐\n\n(Your idea was: ${safeSpark})`,
      targetMinutes,
      fallback: true,
    })
  }
}

export async function aiListSparkArtifacts(req: Request, res: Response) {
  const taskId = String(req.query.taskId || AI_SPARK_TASKS.POEM_LISTEN)
  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' })
  try {
    const rows = await prisma.aiSparkArtifact.findMany({
      where: { taskId, requesterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        taskId: true,
        templateVersion: true,
        spark: true,
        title: true,
        body: true,
        metadata: true,
        createdAt: true,
      },
    })
    return res.json(rows)
  } catch (err) {
    console.error('aiListSparkArtifacts error:', err)
    return res.status(500).json({ error: 'Failed to list saved poems' })
  }
}

export async function aiRecommendations(req: Request, res: Response) {
  const { studentId } = req.body
  if (!studentId) return res.status(400).json({ error: 'studentId required' })
  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' })

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        progress: true,
        aiSessionLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const role = req.user.role
    if (role === 'child' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'You can only get recommendations for your own profile' })
    }
    if (role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Not allowed for this student' })
    }
    if (role === 'teacher' && !(await canTeacherAccessClass(req.user.id, student.classId))) {
      return res.status(403).json({ error: 'Not allowed for this class' })
    }
    if (!['child', 'parent', 'teacher', 'admin', 'principal'].includes(String(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const progressSummary = student.progress.map(p => `moduleId=${p.moduleId}: ${p.cards} cards done`).join(', ')
    const sessionSummary = student.aiSessionLogs.map(s => `${s.topic}: ${s.correct}/${s.total} (lv ${s.maxLevel})`).join(', ')

    const sctx = await getStudentAgentContext(student.id)
    const learnerCtx = sctx ? formatStudentAgentContextBlock(sctx).slice(0, 2000) : undefined
    const recs = await generateRecommendations(student.name, student.stars, progressSummary, sessionSummary, learnerCtx)
    return res.json({ recommendations: recs })
  } catch {
    return res.json({
      recommendations: [
        { title: 'Practice Numbers', reason: 'Numbers are fun and build math skills!', moduleId: 'numbers' },
        { title: 'Learn the Alphabet', reason: 'Letters are the building blocks of reading!', moduleId: 'alphabet' },
      ]
    })
  }
}
