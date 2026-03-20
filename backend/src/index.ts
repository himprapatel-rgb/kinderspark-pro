import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import authRoutes from './routes/auth'
import studentRoutes from './routes/students'
import classRoutes from './routes/classes'
import homeworkRoutes from './routes/homework'
import syllabusRoutes from './routes/syllabuses'
import messageRoutes from './routes/messages'
import progressRoutes from './routes/progress'
import feedbackRoutes from './routes/feedback'
import aiSessionRoutes from './routes/aiSessions'
import aiRoutes from './routes/ai'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/homework', homeworkRoutes)
app.use('/api/syllabuses', syllabusRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/ai-sessions', aiSessionRoutes)
app.use('/api/ai', aiRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 KinderSpark backend running on port ${PORT}`)
})

export default app
