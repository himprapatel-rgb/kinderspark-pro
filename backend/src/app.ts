import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimiter } from './middleware/rateLimit.middleware'
import { cache } from './middleware/cache.middleware'
import { authenticate } from './middleware/auth.middleware'
import authRoutes from './routes/auth.routes'
import studentRoutes from './routes/student.routes'
import teacherRoutes from './routes/teacher.routes'
import homeworkRoutes from './routes/homework.routes'
import syllabusRoutes from './routes/syllabus.routes'
import messageRoutes from './routes/message.routes'
import progressRoutes from './routes/progress.routes'
import aiRoutes from './routes/ai.routes'
import adminRoutes from './routes/admin.routes'
import attendanceRoutes from './routes/attendance'
// keep backward-compat routes
import classRoutes from './routes/classes'
import aiSessionRoutes from './routes/aiSessions'
import feedbackRoutes from './routes/feedback'

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(rateLimiter)
app.use(authenticate)

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }))

app.use('/api/auth', authRoutes)
app.use('/api/students', cache(20), studentRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/homework', cache(15), homeworkRoutes)
app.use('/api/syllabuses', cache(60), syllabusRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/admin', cache(30), adminRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/classes', cache(30), classRoutes)
app.use('/api/ai-sessions', aiSessionRoutes)
app.use('/api/feedback', feedbackRoutes)

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`KinderSpark API running on port ${PORT}`))

export default app
