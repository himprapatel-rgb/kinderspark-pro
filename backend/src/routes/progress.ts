import prisma from '../prisma/client'
import { Router, Request, Response } from 'express'


const router = Router()


// GET /api/progress/:studentId
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params

    const progress = await prisma.progress.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
    })

    res.json(progress)
  } catch (error) {
    console.error('Get progress error:', error)
    res.status(500).json({ error: 'Failed to get progress' })
  }
})

// PUT /api/progress/:studentId/:moduleId
router.put('/:studentId/:moduleId', async (req: Request, res: Response) => {
  try {
    const { studentId, moduleId } = req.params
    const { cards } = req.body

    if (cards === undefined) {
      return res.status(400).json({ error: 'cards is required' })
    }

    const progress = await prisma.progress.upsert({
      where: {
        studentId_moduleId: { studentId, moduleId },
      },
      update: { cards },
      create: { studentId, moduleId, cards },
    })

    res.json(progress)
  } catch (error) {
    console.error('Update progress error:', error)
    res.status(500).json({ error: 'Failed to update progress' })
  }
})

export default router
