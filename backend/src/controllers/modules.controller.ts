import { Request, Response } from 'express'
import prisma from '../prisma/client'

/** GET /api/modules — list all active curriculum modules */
export async function listModules(_req: Request, res: Response) {
  try {
    const modules = await prisma.curriculumModule.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: {
        moduleId: true,
        title: true,
        icon: true,
        color: true,
        type: true,
        items: true,
      },
    })
    return res.json(modules)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch modules' })
  }
}

/** GET /api/modules/:moduleId — single module with items */
export async function getModule(req: Request, res: Response) {
  const { moduleId } = req.params
  try {
    const mod = await prisma.curriculumModule.findUnique({
      where: { moduleId },
      select: {
        moduleId: true,
        title: true,
        icon: true,
        color: true,
        type: true,
        items: true,
      },
    })
    if (!mod) return res.status(404).json({ error: 'Module not found' })
    return res.json(mod)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch module' })
  }
}

/** GET /api/modules/:moduleId/questions?difficulty=1&language=en */
export async function getModuleQuestions(req: Request, res: Response) {
  const { moduleId } = req.params
  const difficulty = Number(req.query.difficulty) || 1
  const language = (req.query.language as string) || 'en'
  try {
    const questions = await prisma.quizQuestion.findMany({
      where: { moduleId, difficulty, language },
      select: {
        id: true,
        question: true,
        options: true,
        correctIdx: true,
        emoji: true,
        difficulty: true,
      },
    })
    return res.json(questions)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch questions' })
  }
}
