import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MemoryEntry {
  agentId:    string
  agentName:  string
  agentIcon:  string
  agentColor: string
  type:       'observation' | 'decision' | 'finding' | 'action' | 'summary' | 'error'
  content:    string
  metadata?:  Record<string, unknown>
  runId?:     string
  importance: 1 | 2 | 3 | 4   // 1=info 2=medium 3=high 4=critical
}

export interface ConversationMessage {
  fromAgentId: string
  fromName:    string
  fromIcon:    string
  fromColor:   string
  toAgentId:   string          // specific agent ID or "all"
  toName:      string
  message:     string
  msgType:     'alert' | 'handoff' | 'question' | 'update' | 'broadcast' | 'fix'
}

// ── Write a memory entry ────────────────────────────────────────────────────
export async function writeMemory(entry: MemoryEntry) {
  return prisma.agentMemory.create({
    data: {
      agentId:    entry.agentId,
      agentName:  entry.agentName,
      agentIcon:  entry.agentIcon,
      agentColor: entry.agentColor,
      type:       entry.type,
      content:    entry.content,
      metadata:   (entry.metadata ?? {}) as any,
      runId:      entry.runId,
      importance: entry.importance,
    },
  })
}

// ── Read an agent's memory (most recent N entries) ─────────────────────────
export async function readMemory(agentId: string, limit = 20) {
  return prisma.agentMemory.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Read high-importance memories across all agents (for context) ──────────
export async function readCriticalMemories(minImportance = 3, limit = 10) {
  return prisma.agentMemory.findMany({
    where: { importance: { gte: minImportance } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Send a message to another agent ───────────────────────────────────────
export async function sendMessage(msg: ConversationMessage) {
  return prisma.agentConversation.create({
    data: {
      fromAgentId: msg.fromAgentId,
      fromName:    msg.fromName,
      fromIcon:    msg.fromIcon,
      fromColor:   msg.fromColor,
      toAgentId:   msg.toAgentId,
      toName:      msg.toName,
      message:     msg.message,
      msgType:     msg.msgType,
    },
  })
}

// ── Broadcast to all agents ────────────────────────────────────────────────
export async function broadcast(
  from: { id: string; name: string; icon: string; color: string },
  message: string,
  msgType: ConversationMessage['msgType'] = 'broadcast'
) {
  return prisma.agentConversation.create({
    data: {
      fromAgentId: from.id,
      fromName:    from.name,
      fromIcon:    from.icon,
      fromColor:   from.color,
      toAgentId:   'all',
      toName:      'All Agents',
      message,
      msgType,
    },
  })
}

// ── Get messages for an agent (inbox) ─────────────────────────────────────
export async function getInbox(agentId: string, limit = 20) {
  return prisma.agentConversation.findMany({
    where: {
      OR: [{ toAgentId: agentId }, { toAgentId: 'all' }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Get all conversations (for Mission Control feed) ───────────────────────
export async function getAllConversations(limit = 50) {
  return prisma.agentConversation.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Get all recent memories (Mission Control overview) ────────────────────
export async function getAllMemories(limit = 100) {
  return prisma.agentMemory.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Mark conversation as resolved ─────────────────────────────────────────
export async function resolveConversation(id: string, resolvedBy: string) {
  return prisma.agentConversation.update({
    where: { id },
    data: { resolved: true, resolvedBy },
  })
}

// ── Get agent stats (how active is each agent) ────────────────────────────
export async function getAgentStats() {
  const stats = await prisma.agentMemory.groupBy({
    by: ['agentId', 'agentName', 'agentIcon', 'agentColor'],
    _count: { id: true },
    _max:   { createdAt: true, importance: true },
    orderBy: { _max: { createdAt: 'desc' } },
  })
  return stats.map(s => ({
    agentId:     s.agentId,
    agentName:   s.agentName,
    agentIcon:   s.agentIcon,
    agentColor:  s.agentColor,
    totalMemories: s._count.id,
    lastActive:  s._max.createdAt,
    maxImportance: s._max.importance,
  }))
}

// ── Prune old low-importance memories (keep DB clean) ─────────────────────
export async function pruneOldMemories(daysToKeep = 30) {
  const cutoff = new Date(Date.now() - daysToKeep * 86400_000)
  const { count } = await prisma.agentMemory.deleteMany({
    where: {
      importance: { lte: 1 },
      createdAt:  { lt: cutoff },
    },
  })
  return count
}
