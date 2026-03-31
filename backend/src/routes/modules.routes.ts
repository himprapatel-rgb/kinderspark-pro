import { Router } from 'express'
import { listModules, getModule, getModuleQuestions } from '../controllers/modules.controller'

const router = Router()

router.get('/',                     listModules)
router.get('/:moduleId',            getModule)
router.get('/:moduleId/questions',  getModuleQuestions)

export default router
