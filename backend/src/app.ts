import 'dotenv/config'
import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
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
import pushRoutes from './routes/push.routes'
// keep backward-compat routes
import classRoutes from './routes/classes'
import aiSessionRoutes from './routes/aiSessions'
import feedbackRoutes from './routes/feedback'
import agentRoutes from './routes/agents.routes'
import ecosystemRoutes from './routes/ecosystem.routes'
import activityRoutes from './routes/activity.routes'
import privacyRoutes from './routes/privacy.routes'
import drawingRoutes from './routes/drawing.routes'
import profilesRoutes from './routes/profiles.routes'
import schoolsRoutes from './routes/schools.routes'
import assignmentsRoutes from './routes/assignments.routes'
import relationshipsRoutes from './routes/relationships.routes'
import diagRoutes from './routes/diag.routes'
import { startAgentScheduler } from './services/agentScheduler.service'
import { logStartupEnvHints } from './config/startupEnv'
import prisma from './prisma/client'

const app = express()
logStartupEnvHints()
app.set('trust proxy', 1)

/** Broad IP window limit (100 / 15m); skips unauthenticated health probes. */
const ipWindowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
})

app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow SSE without COEP issues
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
  },
}))
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://kinderspark-pro-production.up.railway.app',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json({ limit: '6mb' }))
app.use(cookieParser())
app.use(ipWindowLimiter)
app.use(rateLimiter)
app.use(authenticate)

app.get('/health', async (_req, res) => {
  const start = Date.now()
  let dbStatus = 'connected'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'disconnected'
  }
  const mem = process.memoryUsage()
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    db: dbStatus,
    responseMs: Date.now() - start,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  })
})

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
app.use('/api/push', pushRoutes)
app.use('/api/classes', cache(30), classRoutes)
app.use('/api/ai-sessions', aiSessionRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/ecosystem', cache(20), ecosystemRoutes)
app.use('/api/profiles', profilesRoutes)
app.use('/api/diag', diagRoutes)
app.use('/api/schools', schoolsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/relationships', relationshipsRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/privacy', privacyRoutes)
app.use('/api/drawings', drawingRoutes)

const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err)
  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500
  const rawMessage = err instanceof Error ? err.message : 'Internal server error'
  const message = status === 500 ? 'Internal server error' : rawMessage
  res.status(status).json({ error: message })
}
app.use(globalErrorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`KinderSpark API running on port ${PORT}`)
  startAgentScheduler()
})

export default app
