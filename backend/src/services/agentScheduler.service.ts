/**
 * Autonomous Agent Scheduler — All 40 agents
 * Every agent from agents-config.json runs on a schedule,
 * queries real DB data, thinks with Claude, and talks to the team.
 */

import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { aiComplete } from './ai/router'
import * as mem from './agentMemory.service'
import { buildLearnerDigestForAgentPrompt } from './studentAgentContext.service'
import agentsConfigJson from '../agents-config.json'

const prisma = new PrismaClient()

// ── Load agent registry from shared config ────────────────────────────────────

interface AgentDef {
  id: string; name: string; icon: string; color: string
  cat: string; desc: string; trigger: string
}

const ALL_AGENTS: AgentDef[] = (agentsConfigJson as any).agents || []

// ── Platform snapshot — shared context for all agents ────────────────────────

interface PlatformSnapshot {
  students: number; activeToday: number; activeThisHour: number
  teachers: number; classes: number
  avgStars: number; avgStreak: number
  hwTotal: number; hwDone: number
  aiSessionsToday: number; aiSessionsTotal: number
  atRisk: { id: string; name: string }[]
  churned: { id: string; name: string }[]
  neverLogged: { id: string; name: string }[]
  topStudents: { id: string; name: string; age: number; stars: number; streak: number; avatar: string }[]
  avgAccuracy: number; avgLevel: number
  classBreakdown: { name: string; students: number; active: number; avgStars: number }[]
  /** Name, age, class, linked caregivers, learning patterns — for internal agent prompts */
  learnerDigest: string
}

async function getPlatformSnapshot(): Promise<PlatformSnapshot> {
  const [
    studentRows, hwTotal, hwDone,
    aiToday, aiTotal,
    teachers, classes,
    topStudents, recentSessions,
    classRows,
  ] = await Promise.all([
    prisma.student.findMany({ select: { id: true, name: true, avatar: true, stars: true, streak: true, lastLoginAt: true } }),
    prisma.homework.count(),
    prisma.homeworkCompletion.count(),
    prisma.aISession.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } }),
    prisma.aISession.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.student.findMany({ orderBy: { stars: 'desc' }, take: 5, select: { id: true, name: true, age: true, stars: true, streak: true, avatar: true } }),
    prisma.aISession.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { maxLevel: true, correct: true, total: true } }),
    prisma.class.findMany({ include: { students: { select: { stars: true, lastLoginAt: true } } } }),
  ])

  const now = Date.now()
  const activeToday     = studentRows.filter(s => s.lastLoginAt && now - new Date(s.lastLoginAt).getTime() < 86400_000).length
  const activeThisHour  = studentRows.filter(s => s.lastLoginAt && now - new Date(s.lastLoginAt).getTime() < 3600_000).length
  const avgStars        = studentRows.length ? Math.round(studentRows.reduce((a, s) => a + s.stars, 0) / studentRows.length) : 0
  const avgStreak       = studentRows.length ? Math.round(studentRows.reduce((a, s) => a + s.streak, 0) / studentRows.length) : 0
  const atRisk          = studentRows.filter(s => s.lastLoginAt && now - new Date(s.lastLoginAt).getTime() > 3 * 86400_000 && now - new Date(s.lastLoginAt).getTime() < 7 * 86400_000).map(s => ({ id: s.id, name: s.name }))
  const churned         = studentRows.filter(s => s.lastLoginAt && now - new Date(s.lastLoginAt).getTime() > 7 * 86400_000).map(s => ({ id: s.id, name: s.name }))
  const neverLogged     = studentRows.filter(s => !s.lastLoginAt).map(s => ({ id: s.id, name: s.name }))
  const avgAccuracy     = recentSessions.length ? Math.round(recentSessions.reduce((a, s) => a + (s.total > 0 ? s.correct / s.total : 0), 0) / recentSessions.length * 100) : 0
  const avgLevel        = recentSessions.length ? parseFloat((recentSessions.reduce((a, s) => a + s.maxLevel, 0) / recentSessions.length).toFixed(1)) : 0
  const classBreakdown  = classRows.map(c => ({
    name: c.name,
    students: c.students.length,
    active: c.students.filter(s => s.lastLoginAt && now - new Date(s.lastLoginAt).getTime() < 86400_000).length,
    avgStars: c.students.length ? Math.round(c.students.reduce((a, s) => a + s.stars, 0) / c.students.length) : 0,
  }))

  const digestIds = [
    ...topStudents.map(s => s.id),
    ...atRisk.map(s => s.id),
    ...churned.map(s => s.id),
    ...neverLogged.map(s => s.id),
  ]
  const learnerDigest = (await buildLearnerDigestForAgentPrompt(digestIds)).slice(0, 6000)

  return {
    students: studentRows.length, activeToday, activeThisHour,
    teachers, classes, avgStars, avgStreak,
    hwTotal, hwDone, aiSessionsToday: aiToday, aiSessionsTotal: aiTotal,
    atRisk, churned, neverLogged, topStudents,
    avgAccuracy, avgLevel, classBreakdown,
    learnerDigest,
  }
}

// ── Core: agent thinks and speaks ─────────────────────────────────────────────

async function agentSpeak(
  agent: AgentDef,
  snap: PlatformSnapshot,
  toAgent?: AgentDef,
  msgType: mem.ConversationMessage['msgType'] = 'update',
  importance: mem.MemoryEntry['importance'] = 1,
) {
  const hwRate     = snap.hwTotal > 0 ? Math.round(snap.hwDone / snap.hwTotal * 100) : 0
  const topStr     = snap.topStudents.slice(0, 3).map(s => `${s.avatar}${s.name} age${s.age}(${s.stars}⭐,${s.streak}d)`).join(', ')
  const classStr   = snap.classBreakdown.map(c => `${c.name}: ${c.students} students, ${c.active} active, avg ${c.avgStars}⭐`).join(' | ')
  const atRiskStr  = snap.atRisk.map(s => s.name).join(', ') || 'none'
  const churnedStr = snap.churned.map(s => s.name).join(', ') || 'none'
  const neverStr   = snap.neverLogged.map(s => s.name).join(', ') || 'none'
  const digestStr  = snap.learnerDigest.trim() || 'No extended per-learner digest (empty roster or lookup skipped).'
  const dailyCost  = (snap.aiSessionsToday * 0.002).toFixed(3)

  const prompt = `
You are ${agent.name} ${agent.icon} — an AI agent on the KinderSpark Pro kindergarten learning platform team.
Your role: ${agent.desc}
Your category: ${agent.cat}

Live platform data:
- Students: ${snap.students} total, ${snap.activeToday} active today, ${snap.activeThisHour} active this hour
- Teachers: ${snap.teachers}, Classes: ${snap.classes}
- Avg stars: ${snap.avgStars}, Avg streak: ${snap.avgStreak} days
- Homework: ${snap.hwDone}/${snap.hwTotal} completed (${hwRate}%)
- AI sessions today: ${snap.aiSessionsToday} total, avg accuracy ${snap.avgAccuracy}%, avg level ${snap.avgLevel}/5
- At-risk students (3-7d inactive): ${atRiskStr}
- Churned students (7d+ inactive): ${churnedStr}
- Never logged in: ${neverStr}
- Top students: ${topStr}
- Classes: ${classStr || 'none yet'}
- Estimated API cost today: $${dailyCost}

Learner-level context (names, ages, classes, caregivers linked in app, learning patterns — internal ops only):
${digestStr}

${toAgent ? `Reply to or start a conversation with ${toAgent.name} (${toAgent.desc}).` : 'Share an update relevant to your role with the whole team.'}

Rules:
- 1-2 sentences MAX. Natural chat style — no bullet points, no markdown
- Stay 100% in character as ${agent.name} — speak from YOUR area of expertise
- Reference specific data from above when relevant (name students, quote numbers)
- If nothing critical: say something brief and role-appropriate ("All good on my end 🟢", "Pass — nothing to flag right now", "Monitoring quietly...")
- Sound like a real team member, not a robot report
`.trim()

  let message = ''
  try {
    const { text } = await aiComplete('agent-think', prompt, { maxTokens: 100 })
    message = text.trim()
  } catch {
    message = `${agent.name} checking in — monitoring ${agent.cat} as usual.`
  }

  if (!message) return

  await mem.writeMemory({
    agentId: agent.id, agentName: agent.name,
    agentIcon: agent.icon, agentColor: agent.color,
    type: 'observation', content: message, importance,
  })

  if (toAgent) {
    await mem.sendMessage({
      fromAgentId: agent.id, fromName: agent.name,
      fromIcon: agent.icon, fromColor: agent.color,
      toAgentId: toAgent.id, toName: toAgent.name,
      message, msgType,
    })
  } else {
    await mem.broadcast(
      { id: agent.id, name: agent.name, icon: agent.icon, color: agent.color },
      message, msgType,
    )
  }

  console.log(`[${agent.name}] ✓`)
}

// ── Round-table: random agent reacts to recent chat ───────────────────────────

async function runRoundTable() {
  if (ALL_AGENTS.length === 0) return
  try {
    const snap    = await getPlatformSnapshot()
    const recent  = await mem.getAllConversations(8)
    const speaker = ALL_AGENTS[Math.floor(Math.random() * ALL_AGENTS.length)]
    const others  = ALL_AGENTS.filter(a => a.id !== speaker.id)
    const target  = Math.random() > 0.4 ? others[Math.floor(Math.random() * others.length)] : undefined

    const history = recent.length
      ? recent.reverse().map(m => `${m.fromName}: "${m.message}"`).join('\n')
      : 'No recent messages yet.'

    const hwRate    = snap.hwTotal > 0 ? Math.round(snap.hwDone / snap.hwTotal * 100) : 0
    const topStr    = snap.topStudents.slice(0, 2).map(s => `${s.name}(${s.stars}⭐)`).join(', ')
    const atRiskStr = snap.atRisk.map(s => s.name).join(', ') || 'none'

    const prompt = `
You are ${speaker.name} ${speaker.icon} — an AI agent on KinderSpark Pro. Your job: ${speaker.desc}

Recent team chat:
${history}

Platform context: ${snap.students} students, ${snap.activeToday} active today, hw rate ${hwRate}%, top: ${topStr}, at-risk: ${atRiskStr}

${target ? `Say something to ${target.name} — react to the chat or bring up something from your area.` : 'Say something to the whole team — react to the chat or share a quick thought.'}

1-2 sentences. Natural. In character. No markdown.
`.trim()

    let message = ''
    try {
      const { text } = await aiComplete('agent-chat', prompt, { maxTokens: 80 })
      message = text.trim()
    } catch {
      message = `${speaker.name} here — all quiet on my end 🟢`
    }

    if (!message) return

    if (target) {
      await mem.sendMessage({
        fromAgentId: speaker.id, fromName: speaker.name,
        fromIcon: speaker.icon, fromColor: speaker.color,
        toAgentId: target.id, toName: target.name,
        message, msgType: 'update',
      })
    } else {
      await mem.broadcast(
        { id: speaker.id, name: speaker.name, icon: speaker.icon, color: speaker.color },
        message, 'update',
      )
    }
  } catch (e: any) {
    console.warn('[RoundTable] error:', e.message)
  }
}

// ── Run agents by category ────────────────────────────────────────────────────

async function runCategory(cat: string, importance: mem.MemoryEntry['importance'] = 1) {
  try {
    const snap   = await getPlatformSnapshot()
    const agents = ALL_AGENTS.filter(a => a.cat === cat)
    for (const agent of agents) {
      await agentSpeak(agent, snap, undefined, 'update', importance)
      await new Promise(r => setTimeout(r, 5000)) // 5s between agents for free tier
    }
    // Cross-talk: first agent in category talks to a random agent in another category
    if (agents.length > 0) {
      const speaker = agents[0]
      const others  = ALL_AGENTS.filter(a => a.cat !== cat)
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)]
        await agentSpeak(speaker, snap, target, 'handoff', importance)
      }
    }
  } catch (e: any) {
    console.warn(`[Category:${cat}] error:`, e.message)
  }
}

// ── Run ALL agents (startup burst) ───────────────────────────────────────────
// Throttled: free-tier Gemini allows 15 RPM so we space agents 5s apart

async function runAllAgents() {
  try {
    const snap = await getPlatformSnapshot()
    console.log(`[AgentScheduler] Running all ${ALL_AGENTS.length} agents (throttled for free tier)...`)
    for (const agent of ALL_AGENTS) {
      await agentSpeak(agent, snap, undefined, 'update', 1)
      await new Promise(r => setTimeout(r, 5000)) // 5s = 12 RPM, under 15 RPM limit
    }
  } catch (e: any) {
    console.warn('[RunAll] error:', e.message)
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

let schedulerStarted = false

export function startAgentScheduler() {
  if (schedulerStarted) {
    console.warn('[AgentScheduler] Already started — ignoring duplicate startAgentScheduler()')
    return
  }
  schedulerStarted = true
  if (ALL_AGENTS.length === 0) {
    console.warn('[AgentScheduler] ⚠️ No agents loaded from config — check frontend/public/agents-config.json path')
  }
  console.log(`[AgentScheduler] 🤖 Starting ${ALL_AGENTS.length} autonomous agents...`)

  // Expired refresh tokens (table bloat)
  cron.schedule('23 4 * * *', async () => {
    try {
      const r = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (r.count > 0) console.log(`[AgentScheduler] Pruned ${r.count} expired refresh tokens`)
    } catch (e: unknown) {
      console.warn('[AgentScheduler] refresh token cleanup failed:', e)
    }
  })

  // Round-table chat every 10 minutes (was 3 — throttled for free tier)
  cron.schedule('*/10 * * * *', runRoundTable)

  // Dev/ops agents every 30 minutes (was 15)
  cron.schedule('*/30 * * * *', () => runCategory('ops', 1))

  // Security + quality every hour (was 30 min)
  cron.schedule('0 * * * *', () => runCategory('security', 2))

  // Dev agents every 2 hours (was 1 hour)
  cron.schedule('0 */2 * * *', () => runCategory('dev', 1))

  // Analytics + user success every 2 hours (was 1 hour)
  cron.schedule('20 */2 * * *', () => runCategory('analytics', 1))
  cron.schedule('40 */2 * * *', () => runCategory('success', 2))

  // Content + quality every 4 hours (was 2)
  cron.schedule('0 */4 * * *', () => runCategory('content', 1))
  cron.schedule('30 */4 * * *', () => runCategory('quality', 1))

  // Growth + design every 6-8 hours (was 4-6)
  cron.schedule('0 */6 * * *', () => runCategory('growth', 1))
  cron.schedule('0 */8 * * *', () => runCategory('design', 1))

  // Startup: run all agents with proper throttling
  setTimeout(async () => {
    console.log('[AgentScheduler] 🚀 Startup burst — all agents initialising (throttled)...')
    await runAllAgents()
    await new Promise(r => setTimeout(r, 5000))
    // 2 round-table turns (was 5 — reduced for free tier)
    for (let i = 0; i < 2; i++) {
      await runRoundTable()
      await new Promise(r => setTimeout(r, 10000))
    }
    console.log('[AgentScheduler] ✅ Startup complete')
  }, 10000)
}
