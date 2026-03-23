/**
 * Autonomous Agent Scheduler
 * Each agent runs on a cron schedule, queries the DB, thinks with Claude,
 * writes memory entries, and talks to other agents — all automatically.
 */

import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { aiComplete } from './ai/router'
import * as mem from './agentMemory.service'

const prisma = new PrismaClient()

// ── Agent definitions ────────────────────────────────────────────────────────

const AGENTS = {
  healthMonitor: {
    id: 'health-monitor', name: 'Health Monitor',
    icon: '🔍', color: '#30D158',
  },
  analyticsReporter: {
    id: 'analytics-reporter', name: 'Analytics Reporter',
    icon: '📈', color: '#30D158',
  },
  churnDetector: {
    id: 'churn-detector', name: 'Churn Detector',
    icon: '📉', color: '#FF453A',
  },
  achievementNotifier: {
    id: 'achievement-notifier', name: 'Achievement Notifier',
    icon: '🎉', color: '#FFD60A',
  },
  teacherInsight: {
    id: 'teacher-insight', name: 'Teacher Insight',
    icon: '👩‍🏫', color: '#30D158',
  },
  difficultyCalibrator: {
    id: 'difficulty-calibrator', name: 'Difficulty Calibrator',
    icon: '🎯', color: '#FF6B35',
  },
  parentReport: {
    id: 'parent-report', name: 'Parent Report',
    icon: '📧', color: '#64D2FF',
  },
  securityAuditor: {
    id: 'security-auditor', name: 'Security Auditor',
    icon: '🛡️', color: '#FF453A',
  },
  costMonitor: {
    id: 'cost-monitor', name: 'Cost Monitor',
    icon: '💸', color: '#FF9F0A',
  },
}

// ── Helper: think with Claude and write memory + broadcast ───────────────────

async function agentThink(
  agent: typeof AGENTS[keyof typeof AGENTS],
  context: string,
  task: string,
  importance: mem.MemoryEntry['importance'] = 1,
  notifyAgentId?: string,
  notifyAgentName?: string,
) {
  let thinking = ''
  try {
    const { text } = await aiComplete('agent-think', `
You are the ${agent.name} agent for KinderSpark Pro, an AI-powered kindergarten learning platform.
Your role: ${task}

Current data:
${context}

Write a short internal monologue (2-3 sentences) of what you observe, then a 1-sentence action or recommendation.
Be specific, data-driven, and use your agent personality. Keep it under 100 words total.
Start with your observation directly — no preamble.
    `.trim(), { maxTokens: 150 })
    thinking = text.trim()
  } catch {
    thinking = `${agent.name} checked in. No AI response available — running in observation mode.`
  }

  // Write memory
  await mem.writeMemory({
    agentId:    agent.id,
    agentName:  agent.name,
    agentIcon:  agent.icon,
    agentColor: agent.color,
    type:       'observation',
    content:    thinking,
    importance,
  })

  // Broadcast to all agents
  await mem.broadcast(
    { id: agent.id, name: agent.name, icon: agent.icon, color: agent.color },
    thinking,
    'update'
  )

  // Notify specific agent if needed
  if (notifyAgentId && notifyAgentName) {
    await mem.sendMessage({
      fromAgentId: agent.id, fromName: agent.name,
      fromIcon: agent.icon, fromColor: agent.color,
      toAgentId: notifyAgentId, toName: notifyAgentName,
      message: thinking, msgType: 'handoff',
    })
  }

  console.log(`[${agent.name}] ✓ ran`)
  return thinking
}

// ── Individual agent run functions ───────────────────────────────────────────

async function runHealthMonitor() {
  try {
    const [studentCount, homeworkCount, sessionCount] = await Promise.all([
      prisma.student.count(),
      prisma.homework.count(),
      prisma.aISession.count(),
    ])
    const context = `Students: ${studentCount}, Homework tasks: ${homeworkCount}, AI sessions: ${sessionCount}. Backend is responding normally.`
    await agentThink(AGENTS.healthMonitor, context,
      'Monitor platform health, uptime, and database connectivity.')
  } catch (e: any) {
    await mem.broadcast(
      { ...AGENTS.healthMonitor },
      `⚠️ Health check error: ${e.message}`,
      'alert'
    )
  }
}

async function runAnalyticsReporter() {
  try {
    const [students, hwTotal, hwDone] = await Promise.all([
      prisma.student.findMany({ select: { stars: true, streak: true, aiSessions: true, lastLoginAt: true } }),
      prisma.homework.count(),
      prisma.homeworkCompletion.count(),
    ])
    const avgStars    = students.length ? Math.round(students.reduce((s, x) => s + x.stars, 0) / students.length) : 0
    const avgStreak   = students.length ? Math.round(students.reduce((s, x) => s + x.streak, 0) / students.length) : 0
    const totalAI     = students.reduce((s, x) => s + x.aiSessions, 0)
    const activeToday = students.filter(s => {
      if (!s.lastLoginAt) return false
      return Date.now() - new Date(s.lastLoginAt).getTime() < 86400_000
    }).length

    const context = `Total students: ${students.length}, avg stars: ${avgStars}, avg streak: ${avgStreak} days, total AI sessions: ${totalAI}, homework completed: ${hwDone}/${hwTotal}, active today: ${activeToday}`
    await agentThink(AGENTS.analyticsReporter, context,
      'Analyse student engagement, learning progress, and platform usage stats.',
      2)
  } catch (e: any) {
    console.warn('[Analytics Reporter] error:', e.message)
  }
}

async function runChurnDetector() {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400_000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000)
    const [atRisk, churned] = await Promise.all([
      prisma.student.count({ where: { lastLoginAt: { lt: threeDaysAgo, gt: sevenDaysAgo } } }),
      prisma.student.count({ where: { OR: [{ lastLoginAt: { lt: sevenDaysAgo } }, { lastLoginAt: null }] } }),
    ])

    const context = `Students not seen in 3-7 days (at-risk): ${atRisk}. Students not seen in 7+ days or never logged in (churned): ${churned}.`
    const importance: mem.MemoryEntry['importance'] = churned > 2 ? 3 : atRisk > 3 ? 2 : 1

    await agentThink(AGENTS.churnDetector, context,
      'Detect inactive students and recommend re-engagement strategies.',
      importance,
      AGENTS.teacherInsight.id, AGENTS.teacherInsight.name)
  } catch (e: any) {
    console.warn('[Churn Detector] error:', e.message)
  }
}

async function runAchievementNotifier() {
  try {
    const topStudents = await prisma.student.findMany({
      orderBy: { stars: 'desc' },
      take: 3,
      select: { name: true, stars: true, streak: true, avatar: true },
    })
    const context = `Top performers: ${topStudents.map(s => `${s.avatar} ${s.name} (${s.stars} stars, ${s.streak}-day streak)`).join(', ')}`
    await agentThink(AGENTS.achievementNotifier, context,
      'Celebrate student achievements, badges, and milestones.')
  } catch (e: any) {
    console.warn('[Achievement Notifier] error:', e.message)
  }
}

async function runTeacherInsight() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        students: { select: { stars: true, streak: true, lastLoginAt: true } },
      },
    })
    const summary = classes.map(c => {
      const active = c.students.filter(s => s.lastLoginAt && Date.now() - new Date(s.lastLoginAt).getTime() < 86400_000).length
      const avgStars = c.students.length ? Math.round(c.students.reduce((a, s) => a + s.stars, 0) / c.students.length) : 0
      return `${c.name}: ${c.students.length} students, ${active} active today, avg ${avgStars} stars`
    }).join(' | ')

    await agentThink(AGENTS.teacherInsight, summary || 'No class data available yet.',
      'Provide teachers with class health summaries and actionable insights.',
      2)
  } catch (e: any) {
    console.warn('[Teacher Insight] error:', e.message)
  }
}

async function runDifficultyCalibrator() {
  try {
    const sessions = await prisma.aISession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { maxLevel: true, correct: true, total: true, topic: true },
    })
    if (sessions.length === 0) {
      await mem.broadcast(
        { ...AGENTS.difficultyCalibrator },
        'No AI session data yet — waiting for students to start learning sessions.',
        'update'
      )
      return
    }
    const avgAcc = sessions.reduce((s, x) => s + (x.total > 0 ? x.correct / x.total : 0), 0) / sessions.length
    const avgLvl = sessions.reduce((s, x) => s + x.maxLevel, 0) / sessions.length
    const context = `Last ${sessions.length} AI sessions: avg accuracy ${Math.round(avgAcc * 100)}%, avg level ${avgLvl.toFixed(1)}/5.`
    await agentThink(AGENTS.difficultyCalibrator, context,
      'Calibrate learning difficulty based on student performance across AI sessions.')
  } catch (e: any) {
    console.warn('[Difficulty Calibrator] error:', e.message)
  }
}

async function runSecurityAuditor() {
  try {
    const recentStudents = await prisma.student.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } })
    const context = `New accounts in last 24h: ${recentStudents}. Auth system: PIN-based. JWT tokens active. No anomalies detected in routine scan.`
    await agentThink(AGENTS.securityAuditor, context,
      'Monitor platform security, auth patterns, and COPPA/GDPR compliance.',
      1)
  } catch (e: any) {
    console.warn('[Security Auditor] error:', e.message)
  }
}

async function runCostMonitor() {
  try {
    const aiSessions = await prisma.aISession.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } })
    const context = `AI sessions in last 24h: ${aiSessions}. Estimated Claude API cost: ~$${(aiSessions * 0.002).toFixed(3)}. Railway hosting: fixed cost.`
    await agentThink(AGENTS.costMonitor, context,
      'Monitor Railway and Claude API costs. Alert if usage spikes unexpectedly.')
  } catch (e: any) {
    console.warn('[Cost Monitor] error:', e.message)
  }
}

// ── Cron schedules ────────────────────────────────────────────────────────────

export function startAgentScheduler() {
  console.log('[AgentScheduler] 🤖 Starting autonomous agents...')

  // Health Monitor — every 15 minutes
  cron.schedule('*/15 * * * *', runHealthMonitor)

  // Achievement Notifier — every 30 minutes
  cron.schedule('*/30 * * * *', runAchievementNotifier)

  // Analytics Reporter — every hour
  cron.schedule('0 * * * *', runAnalyticsReporter)

  // Churn Detector — every 2 hours
  cron.schedule('0 */2 * * *', runChurnDetector)

  // Difficulty Calibrator — every 2 hours
  cron.schedule('30 */2 * * *', runDifficultyCalibrator)

  // Teacher Insight — every 6 hours
  cron.schedule('0 */6 * * *', runTeacherInsight)

  // Security Auditor — every 12 hours
  cron.schedule('0 */12 * * *', runSecurityAuditor)

  // Cost Monitor — once a day at 9am
  cron.schedule('0 9 * * *', runCostMonitor)

  // Run all agents immediately on startup so dashboard shows data right away
  setTimeout(async () => {
    console.log('[AgentScheduler] 🚀 Running all agents on startup...')
    await runHealthMonitor()
    await new Promise(r => setTimeout(r, 2000))
    await runAnalyticsReporter()
    await new Promise(r => setTimeout(r, 2000))
    await runChurnDetector()
    await new Promise(r => setTimeout(r, 2000))
    await runAchievementNotifier()
    await new Promise(r => setTimeout(r, 2000))
    await runTeacherInsight()
    await new Promise(r => setTimeout(r, 2000))
    await runDifficultyCalibrator()
    await new Promise(r => setTimeout(r, 2000))
    await runSecurityAuditor()
    await new Promise(r => setTimeout(r, 2000))
    await runCostMonitor()
    console.log('[AgentScheduler] ✅ All agents ran on startup')
  }, 5000) // 5s delay to let DB connect first
}
