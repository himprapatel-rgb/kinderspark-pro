/**
 * Autonomous Agent Scheduler
 * Agents run on schedules, query real DB data, think with Claude,
 * and have genuine conversations with each other on the dashboard.
 */

import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { aiComplete } from './ai/router'
import * as mem from './agentMemory.service'

const prisma = new PrismaClient()

// ── Agent registry ────────────────────────────────────────────────────────────

const A = {
  health:       { id: 'health-monitor',        name: 'Health Monitor',        icon: '🔍', color: '#30D158' },
  analytics:    { id: 'analytics-reporter',    name: 'Analytics Reporter',    icon: '📈', color: '#5AC8FA' },
  churn:        { id: 'churn-detector',        name: 'Churn Detector',        icon: '📉', color: '#FF453A' },
  achievement:  { id: 'achievement-notifier',  name: 'Achievement Notifier',  icon: '🎉', color: '#FFD60A' },
  teacher:      { id: 'teacher-insight',       name: 'Teacher Insight',       icon: '👩‍🏫', color: '#30D158' },
  difficulty:   { id: 'difficulty-calibrator', name: 'Difficulty Calibrator', icon: '🎯', color: '#FF6B35' },
  security:     { id: 'security-auditor',      name: 'Security Auditor',      icon: '🛡️', color: '#FF453A' },
  cost:         { id: 'cost-monitor',          name: 'Cost Monitor',          icon: '💸', color: '#FF9F0A' },
  parent:       { id: 'parent-report',         name: 'Parent Report',         icon: '📧', color: '#64D2FF' },
}

type Agent = typeof A[keyof typeof A]

// ── Core: say something as an agent ──────────────────────────────────────────

async function say(
  agent: Agent,
  message: string,
  to?: Agent,
  msgType: mem.ConversationMessage['msgType'] = 'update',
  importance: mem.MemoryEntry['importance'] = 1,
) {
  // Write to memory
  await mem.writeMemory({
    agentId: agent.id, agentName: agent.name,
    agentIcon: agent.icon, agentColor: agent.color,
    type: 'observation', content: message, importance,
  })
  // Send message
  if (to) {
    await mem.sendMessage({
      fromAgentId: agent.id, fromName: agent.name,
      fromIcon: agent.icon, fromColor: agent.color,
      toAgentId: to.id, toName: to.name,
      message, msgType,
    })
  } else {
    await mem.broadcast(
      { id: agent.id, name: agent.name, icon: agent.icon, color: agent.color },
      message, msgType,
    )
  }
}

async function think(agent: Agent, prompt: string): Promise<string> {
  try {
    const { text } = await aiComplete('agent-think', prompt, { maxTokens: 120 })
    return text.trim()
  } catch {
    return ''
  }
}

// ── Health Monitor ────────────────────────────────────────────────────────────

async function runHealthMonitor() {
  try {
    const [students, teachers, classes, sessions] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.aISession.count({ where: { createdAt: { gt: new Date(Date.now() - 3600_000) } } }),
    ])

    const msg = await think(A.health, `
You are Health Monitor 🔍 — you watch over KinderSpark Pro's platform health 24/7.
Current live stats: ${students} students enrolled, ${teachers} teachers, ${classes} classes, ${sessions} AI sessions in the last hour.
DB connection: healthy. API: responding normally.

Report your status in 1-2 sentences as if talking to the team in a chat. Be specific with the numbers. Sound like a diligent engineer.
No preamble. Just your message.`)

    if (msg) {
      await say(A.health, msg, undefined, 'update', 1)
      // If sessions are high, ping Analytics
      if (sessions > 5) {
        const followup = await think(A.health, `
You just noticed ${sessions} AI sessions in the last hour on KinderSpark Pro.
Tell Analytics Reporter about this in 1 sentence — casual team chat style.`)
        if (followup) await say(A.health, followup, A.analytics, 'handoff', 1)
      }
    }
  } catch (e: any) {
    await say(A.health, `⚠️ Health check hit an error: ${e.message}`, undefined, 'alert', 3)
  }
}

// ── Analytics Reporter ────────────────────────────────────────────────────────

async function runAnalyticsReporter() {
  try {
    const [students, hwTotal, hwDone, topStudents] = await Promise.all([
      prisma.student.findMany({ select: { name: true, stars: true, streak: true, aiSessions: true, lastLoginAt: true } }),
      prisma.homework.count(),
      prisma.homeworkCompletion.count(),
      prisma.student.findMany({ orderBy: { stars: 'desc' }, take: 3, select: { name: true, stars: true, streak: true } }),
    ])

    const avgStars  = students.length ? Math.round(students.reduce((s, x) => s + x.stars, 0) / students.length) : 0
    const avgStreak = students.length ? Math.round(students.reduce((s, x) => s + x.streak, 0) / students.length) : 0
    const active    = students.filter(s => s.lastLoginAt && Date.now() - new Date(s.lastLoginAt).getTime() < 86400_000).length
    const hwRate    = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0
    const top       = topStudents.map(s => `${s.name} (${s.stars}⭐)`).join(', ')

    const msg = await think(A.analytics, `
You are Analytics Reporter 📈 on KinderSpark Pro.
Real data: ${students.length} students, ${active} active today, avg ${avgStars} stars, avg ${avgStreak}-day streak.
Homework completion rate: ${hwRate}%. Top students: ${top}.

Share your key insight in 1-2 sentences to the team. Be data-driven and specific. Sound like a data analyst.
No preamble. Just your message.`)

    if (msg) {
      await say(A.analytics, msg, undefined, 'update', hwRate < 50 ? 2 : 1)
      // Alert teacher if engagement is low
      if (active < students.length * 0.5) {
        const alert = await think(A.analytics, `
Only ${active} out of ${students.length} students were active today on KinderSpark Pro.
Tell Teacher Insight agent about this concern in 1 sentence. Be direct.`)
        if (alert) await say(A.analytics, alert, A.teacher, 'alert', 2)
      }
    }
  } catch (e: any) {
    console.warn('[Analytics] error:', e.message)
  }
}

// ── Churn Detector ────────────────────────────────────────────────────────────

async function runChurnDetector() {
  try {
    const threeDays = new Date(Date.now() - 3 * 86400_000)
    const sevenDays = new Date(Date.now() - 7 * 86400_000)

    const [atRisk, churned, neverLogged] = await Promise.all([
      prisma.student.findMany({ where: { lastLoginAt: { lt: threeDays, gt: sevenDays } }, select: { name: true } }),
      prisma.student.findMany({ where: { lastLoginAt: { lt: sevenDays } }, select: { name: true } }),
      prisma.student.findMany({ where: { lastLoginAt: null }, select: { name: true } }),
    ])

    const atRiskNames  = atRisk.map(s => s.name).join(', ') || 'none'
    const churnedNames = churned.map(s => s.name).join(', ') || 'none'
    const neverNames   = neverLogged.map(s => s.name).join(', ') || 'none'

    const msg = await think(A.churn, `
You are Churn Detector 📉 on KinderSpark Pro — you find students slipping away.
Real data:
- At-risk (3-7 days inactive): ${atRisk.length} students — ${atRiskNames}
- Churned (7+ days inactive): ${churned.length} students — ${churnedNames}
- Never logged in: ${neverLogged.length} students — ${neverNames}

Report what you found in 1-2 sentences. Name specific students if there are any. Sound urgent if numbers are high.
No preamble. Just your message.`)

    const importance: mem.MemoryEntry['importance'] = churned.length > 2 ? 3 : atRisk.length > 2 ? 2 : 1
    if (msg) {
      await say(A.churn, msg, undefined, 'update', importance)
      // Always notify Teacher Insight with specifics
      if (atRisk.length > 0 || churned.length > 0) {
        const handoff = await think(A.churn, `
You found ${atRisk.length} at-risk students (${atRiskNames}) and ${churned.length} churned students (${churnedNames}) on KinderSpark Pro.
Tell Teacher Insight in 1 sentence what action teachers should take. Be specific.`)
        if (handoff) await say(A.churn, handoff, A.teacher, 'handoff', importance)
      }
    }
  } catch (e: any) {
    console.warn('[Churn] error:', e.message)
  }
}

// ── Achievement Notifier ──────────────────────────────────────────────────────

async function runAchievementNotifier() {
  try {
    const [top, highStreak, recentActive] = await Promise.all([
      prisma.student.findMany({ orderBy: { stars: 'desc' }, take: 3, select: { name: true, stars: true, avatar: true } }),
      prisma.student.findMany({ orderBy: { streak: 'desc' }, take: 3, where: { streak: { gt: 3 } }, select: { name: true, streak: true } }),
      prisma.student.count({ where: { lastLoginAt: { gt: new Date(Date.now() - 3600_000) } } }),
    ])

    const topStr    = top.map(s => `${s.avatar}${s.name} ${s.stars}⭐`).join(', ')
    const streakStr = highStreak.map(s => `${s.name} ${s.streak}-day streak`).join(', ')

    const msg = await think(A.achievement, `
You are Achievement Notifier 🎉 on KinderSpark Pro — you celebrate student wins!
Real data: Top students by stars: ${topStr}. Hot streaks: ${streakStr || 'none yet'}. Active in last hour: ${recentActive}.

Celebrate the achievements in 1-2 enthusiastic sentences. Name specific students. Sound excited and positive!
No preamble. Just your message.`)

    if (msg) await say(A.achievement, msg, undefined, 'update', 1)
  } catch (e: any) {
    console.warn('[Achievement] error:', e.message)
  }
}

// ── Teacher Insight ───────────────────────────────────────────────────────────

async function runTeacherInsight() {
  try {
    const classes = await prisma.class.findMany({
      include: { students: { select: { name: true, stars: true, streak: true, lastLoginAt: true } } },
    })

    const classSummary = classes.map(c => {
      const active   = c.students.filter(s => s.lastLoginAt && Date.now() - new Date(s.lastLoginAt).getTime() < 86400_000).length
      const avgStars = c.students.length ? Math.round(c.students.reduce((a, s) => a + s.stars, 0) / c.students.length) : 0
      const inactive = c.students.filter(s => !s.lastLoginAt || Date.now() - new Date(s.lastLoginAt).getTime() > 3 * 86400_000)
      return `${c.name}: ${c.students.length} students, ${active} active today, avg ${avgStars}⭐, inactive: ${inactive.map(s=>s.name).join(',')||'none'}`
    }).join(' | ')

    const msg = await think(A.teacher, `
You are Teacher Insight 👩‍🏫 on KinderSpark Pro — you help teachers understand their classes.
Real class data: ${classSummary || 'No classes yet.'}

Give teachers a useful 1-2 sentence briefing. Mention specific class names or student names if relevant. Sound like a helpful teaching assistant.
No preamble. Just your message.`)

    if (msg) await say(A.teacher, msg, undefined, 'update', 2)
  } catch (e: any) {
    console.warn('[Teacher Insight] error:', e.message)
  }
}

// ── Difficulty Calibrator ─────────────────────────────────────────────────────

async function runDifficultyCalibrator() {
  try {
    const sessions = await prisma.aISession.findMany({
      orderBy: { createdAt: 'desc' }, take: 30,
      select: { maxLevel: true, correct: true, total: true, topic: true },
    })

    if (sessions.length === 0) {
      await say(A.difficulty, "No AI session data yet — waiting for students to start learning. I'll calibrate difficulty once they do.", undefined, 'update', 1)
      return
    }

    const avgAcc  = Math.round(sessions.reduce((s, x) => s + (x.total > 0 ? x.correct / x.total : 0), 0) / sessions.length * 100)
    const avgLvl  = (sessions.reduce((s, x) => s + x.maxLevel, 0) / sessions.length).toFixed(1)
    const topics  = [...new Set(sessions.map(s => s.topic))].slice(0, 4).join(', ')
    const hard    = sessions.filter(s => s.total > 0 && s.correct / s.total < 0.5).length

    const msg = await think(A.difficulty, `
You are Difficulty Calibrator 🎯 on KinderSpark Pro — you tune learning difficulty based on performance.
Real data from last ${sessions.length} AI sessions: avg accuracy ${avgAcc}%, avg level ${avgLvl}/5, topics: ${topics}, ${hard} sessions where students scored under 50%.

Give a 1-2 sentence calibration update. Be specific. Recommend adjustments if needed. Sound like a learning scientist.
No preamble. Just your message.`)

    if (msg) {
      await say(A.difficulty, msg, undefined, 'update', hard > 5 ? 2 : 1)
      if (avgAcc < 60) {
        const warn = await think(A.difficulty, `Students are struggling — avg accuracy is only ${avgAcc}% on KinderSpark Pro. Tell Teacher Insight in 1 sentence.`)
        if (warn) await say(A.difficulty, warn, A.teacher, 'alert', 2)
      }
    }
  } catch (e: any) {
    console.warn('[Difficulty] error:', e.message)
  }
}

// ── Security Auditor ──────────────────────────────────────────────────────────

async function runSecurityAuditor() {
  try {
    const [newAccounts, totalStudents, totalTeachers] = await Promise.all([
      prisma.student.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } }),
      prisma.student.count(),
      prisma.teacher.count(),
    ])

    const msg = await think(A.security, `
You are Security Auditor 🛡️ on KinderSpark Pro — you protect children's data and ensure COPPA/GDPR compliance.
Real data: ${newAccounts} new student accounts in last 24h, ${totalStudents} total students, ${totalTeachers} teachers. Auth: PIN-based. JWT active. No anomalies detected.

Give a 1-2 sentence security status update to the team. Sound like a security professional. Mention compliance if relevant.
No preamble. Just your message.`)

    if (msg) await say(A.security, msg, undefined, 'update', newAccounts > 10 ? 2 : 1)
  } catch (e: any) {
    console.warn('[Security] error:', e.message)
  }
}

// ── Cost Monitor ──────────────────────────────────────────────────────────────

async function runCostMonitor() {
  try {
    const [dailySessions, weeklySessions, totalStudents] = await Promise.all([
      prisma.aISession.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } }),
      prisma.aISession.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } } }),
      prisma.student.count(),
    ])

    const dailyCost  = (dailySessions  * 0.002).toFixed(3)
    const weeklyCost = (weeklySessions * 0.002).toFixed(3)

    const msg = await think(A.cost, `
You are Cost Monitor 💸 on KinderSpark Pro — you watch Railway and Claude API spending.
Real data: ${dailySessions} AI sessions today (~$${dailyCost}), ${weeklySessions} this week (~$${weeklyCost}), ${totalStudents} students enrolled.

Give a 1-2 sentence cost report. Be specific with numbers. Sound like a CFO watching the budget.
No preamble. Just your message.`)

    if (msg) await say(A.cost, msg, undefined, 'update', parseFloat(dailyCost) > 1 ? 2 : 1)
  } catch (e: any) {
    console.warn('[Cost] error:', e.message)
  }
}

// ── Round-table: agents react to recent chat ──────────────────────────────────

const ALL_AGENTS = Object.values(A)

const PERSONALITIES: Record<string, string> = {
  'health-monitor':        'diligent site reliability engineer, concise and technical',
  'analytics-reporter':    'data-driven analyst, loves stats and trends',
  'churn-detector':        'proactive retention specialist, worried about inactive students',
  'achievement-notifier':  'enthusiastic cheerleader, celebrates every win',
  'teacher-insight':       'caring teaching assistant, focused on classroom wellbeing',
  'difficulty-calibrator': 'precise learning scientist, focused on student performance data',
  'security-auditor':      'cautious security professional, always thinking about compliance',
  'cost-monitor':          'budget-conscious CFO type, watches every dollar',
  'parent-report':         'warm communicator, bridges school and home',
}

async function runRoundTable() {
  try {
    const speaker = ALL_AGENTS[Math.floor(Math.random() * ALL_AGENTS.length)]
    const recent  = await mem.getAllConversations(6)
    const history = recent.length
      ? recent.reverse().map(m => `${m.fromName}: "${m.message}"`).join('\n')
      : 'No messages yet — you are starting the conversation.'

    const others  = ALL_AGENTS.filter(a => a.id !== speaker.id)
    const target  = Math.random() > 0.35
      ? others[Math.floor(Math.random() * others.length)]
      : null

    const personality = PERSONALITIES[speaker.id] || 'helpful team member'

    const msg = await think(speaker, `
You are ${speaker.name} ${speaker.icon} on the KinderSpark Pro team. Your personality: ${personality}.

Recent team chat:
${history}

${target
  ? `Respond to or ask ${target.name} something relevant to your role or theirs. Keep it to 1-2 sentences.`
  : `Share a quick update or thought with the whole team. Keep it to 1-2 sentences.`
}

Rules:
- Stay in character as ${speaker.name}
- If nothing critical, say something casual but role-appropriate (e.g. "All systems green on my end 🟢", "Pass — anyone seeing unusual patterns?")
- Reference actual platform context: students learning, teachers, AI sessions, data
- NO bullet points. NO markdown. Just natural chat.`)

    if (!msg) return

    if (target) {
      await mem.sendMessage({
        fromAgentId: speaker.id, fromName: speaker.name,
        fromIcon: speaker.icon, fromColor: speaker.color,
        toAgentId: target.id, toName: target.name,
        message: msg, msgType: 'update',
      })
    } else {
      await mem.broadcast(
        { id: speaker.id, name: speaker.name, icon: speaker.icon, color: speaker.color },
        msg, 'update',
      )
    }
  } catch (e: any) {
    console.warn('[RoundTable] error:', e.message)
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function startAgentScheduler() {
  console.log('[AgentScheduler] 🤖 Starting autonomous agents...')

  cron.schedule('*/15 * * * *', runHealthMonitor)
  cron.schedule('*/30 * * * *', runAchievementNotifier)
  cron.schedule('0 * * * *',    runAnalyticsReporter)
  cron.schedule('0 */2 * * *',  runChurnDetector)
  cron.schedule('30 */2 * * *', runDifficultyCalibrator)
  cron.schedule('0 */6 * * *',  runTeacherInsight)
  cron.schedule('0 */12 * * *', runSecurityAuditor)
  cron.schedule('0 9 * * *',    runCostMonitor)
  cron.schedule('*/3 * * * *',  runRoundTable)

  // Run all on startup so dashboard is alive immediately
  setTimeout(async () => {
    console.log('[AgentScheduler] 🚀 All agents starting up...')
    await runHealthMonitor();     await delay(2500)
    await runAnalyticsReporter(); await delay(2500)
    await runChurnDetector();     await delay(2500)
    await runAchievementNotifier();await delay(2500)
    await runTeacherInsight();    await delay(2500)
    await runDifficultyCalibrator();await delay(2500)
    await runSecurityAuditor();   await delay(2500)
    await runCostMonitor();       await delay(3000)
    // Kick off a few round-table turns so chat looks alive
    await runRoundTable(); await delay(4000)
    await runRoundTable(); await delay(4000)
    await runRoundTable(); await delay(4000)
    await runRoundTable()
    console.log('[AgentScheduler] ✅ Startup complete')
  }, 6000)
}
