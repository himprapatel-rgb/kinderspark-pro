import { Router } from 'express'
import { listSyllabuses, getSyllabus, createSyllabus, updateSyllabus, deleteSyllabus, publishSyllabus, assignSyllabus } from '../controllers/syllabus.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.get('/', requireAuth, listSyllabuses)
router.get('/:id', requireAuth, getSyllabus)
router.post('/', requireRole('teacher', 'admin'), createSyllabus)
router.put('/:id', requireRole('teacher', 'admin'), updateSyllabus)
router.delete('/:id', requireRole('teacher', 'admin'), deleteSyllabus)
router.post('/:id/publish', requireRole('teacher', 'admin'), publishSyllabus)
router.post('/:id/assign', requireRole('teacher', 'admin'), assignSyllabus)

export default router
