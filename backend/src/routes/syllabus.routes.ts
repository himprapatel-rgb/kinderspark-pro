import { Router } from 'express'
import { listSyllabuses, getSyllabus, createSyllabus, updateSyllabus, deleteSyllabus, publishSyllabus, assignSyllabus } from '../controllers/syllabus.controller'
const router = Router()
router.get('/', listSyllabuses)
router.get('/:id', getSyllabus)
router.post('/', createSyllabus)
router.put('/:id', updateSyllabus)
router.delete('/:id', deleteSyllabus)
router.post('/:id/publish', publishSyllabus)
router.post('/:id/assign', assignSyllabus)
export default router
