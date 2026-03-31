import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { saveDrawing, listDrawings, deleteDrawingRecord } from '../controllers/drawing.controller'

const router = Router()

router.use(requireAuth)
router.delete('/item/:drawingId', deleteDrawingRecord)
router.post('/:studentId', saveDrawing)
router.get('/:studentId', listDrawings)

export default router
