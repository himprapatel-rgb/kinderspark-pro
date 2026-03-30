import prisma from '../prisma/client'
import { sanitizePromptInput } from '../utils/sanitize'
import {
  generateHomeworkIdea,
  generatePoemFromSpark,
  generateTutorHintFromSpark,
} from './ai'
import { sanitizeSpark } from './ai/spark'
import {
  AI_SPARK_TASKS,
  PROMPT_TEMPLATE_VERSION,
  type UnifiedSparkTaskId,
  UNIFIED_SPARK_TASK_IDS,
} from './ai/promptTemplates'

const POEM_MINUTES = new Set([3, 4, 5, 6, 7, 8])

function isUnifiedTaskId(id: string): id is UnifiedSparkTaskId {
  return (UNIFIED_SPARK_TASK_IDS as readonly string[]).includes(id)
}

export interface RunUnifiedSparkParams {
  taskId: string
  role: string
  userId: string
  spark: unknown
  targetMinutes?: number
  topic?: unknown
  grade?: unknown
  classId?: string
}

export interface RunUnifiedSparkResult {
  taskId: UnifiedSparkTaskId
  templateVersion: string
  artifactId: string
  payload: Record<string, unknown>
}

/** Allowlisted template+spark tasks; each success is persisted to AiSparkArtifact. */
export async function runUnifiedSparkTask(params: RunUnifiedSparkParams): Promise<RunUnifiedSparkResult> {
  const { role, userId } = params
  const taskIdRaw = String(params.taskId || '').trim()
  if (!isUnifiedTaskId(taskIdRaw)) {
    throw new Error(`Invalid taskId. Allowed: ${UNIFIED_SPARK_TASK_IDS.join(', ')}`)
  }
  const taskId = taskIdRaw

  if (taskId === AI_SPARK_TASKS.POEM_LISTEN) {
    const safeSpark = sanitizeSpark(params.spark, role)
    if (!safeSpark) throw new Error('Add one word or a short line (your idea)')
    const targetMinutes =
      typeof params.targetMinutes === 'number' && POEM_MINUTES.has(params.targetMinutes)
        ? params.targetMinutes
        : 4
    const result = await generatePoemFromSpark(safeSpark, targetMinutes)
    const wordCount = result.poem.trim().split(/\s+/).filter(Boolean).length
    const row = await prisma.aiSparkArtifact.create({
      data: {
        taskId,
        templateVersion: PROMPT_TEMPLATE_VERSION,
        spark: safeSpark,
        sparkRole: role,
        requesterId: userId,
        title: result.title,
        body: result.poem,
        metadata: {
          targetMinutes,
          provider: result.provider,
          wordCount,
        },
      },
    })
    return {
      taskId,
      templateVersion: PROMPT_TEMPLATE_VERSION,
      artifactId: row.id,
      payload: {
        title: result.title,
        poem: result.poem,
        targetMinutes,
      },
    }
  }

  if (taskId === AI_SPARK_TASKS.TUTOR_HINT) {
    const safeSpark = sanitizeSpark(params.spark, role)
    if (!safeSpark) throw new Error('Add one short line about what feels tricky')
    const topicLine = sanitizePromptInput(params.topic ?? '', 100) || 'learning'
    const result = await generateTutorHintFromSpark(safeSpark, topicLine)
    const row = await prisma.aiSparkArtifact.create({
      data: {
        taskId,
        templateVersion: PROMPT_TEMPLATE_VERSION,
        spark: safeSpark,
        sparkRole: role,
        requesterId: userId,
        title: 'Tutor hint',
        body: result.hint,
        metadata: {
          provider: result.provider,
          topic: topicLine,
        },
      },
    })
    return {
      taskId,
      templateVersion: PROMPT_TEMPLATE_VERSION,
      artifactId: row.id,
      payload: { hint: result.hint },
    }
  }

  if (taskId === AI_SPARK_TASKS.HOMEWORK_IDEA) {
    const safeSpark = sanitizeSpark(params.spark, role)
    if (!safeSpark) throw new Error('Add a theme word or short line for homework')
    const safeGrade = sanitizePromptInput(params.grade || 'KG 1', 30)
    let studentCount = 10
    if (params.classId && typeof params.classId === 'string') {
      studentCount = await prisma.student.count({ where: { classId: params.classId } })
      if (studentCount < 1) studentCount = 10
    }
    const idea = await generateHomeworkIdea(safeSpark, safeGrade, studentCount)
    const row = await prisma.aiSparkArtifact.create({
      data: {
        taskId,
        templateVersion: PROMPT_TEMPLATE_VERSION,
        spark: safeSpark,
        sparkRole: role,
        requesterId: userId,
        title: idea.title,
        body: JSON.stringify(idea),
        metadata: {
          grade: safeGrade,
          classId: params.classId || null,
          studentCount,
        },
      },
    })
    return {
      taskId,
      templateVersion: PROMPT_TEMPLATE_VERSION,
      artifactId: row.id,
      payload: { ...idea, artifactId: row.id },
    }
  }

  throw new Error('Task not implemented')
}

export { UNIFIED_SPARK_TASK_IDS }
