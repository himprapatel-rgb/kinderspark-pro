import { Router } from 'express'
import { listHomework, createHomework, deleteHomework, completeHomework, getCompletions } from '../controllers/homework.controller'
const router = Router()
router.get('/', listHomework)
router.post('/', createHomework)
router.delete('/:id', deleteHomework)
router.post('/:id/complete', completeHomework)
router.get('/:id/completions', getCompletions)
export default router
