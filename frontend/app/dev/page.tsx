'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────
interface Agent {
  id: string; name: string; icon: string; color: string
  cat: string; trigger: string; workflow: string; desc?: string
}
interface AgentConfig {
  agents: Agent[]
  categories: Record<string, { label: string; icon: string; color: string }>
}
interface FeedMsg {
  id: string; agentName: string; agentIcon: string; agentColor: string
  message: string; type: 'success' | 'failure' | 'running' | 'info' | 'alert'
  ts: number; url?: string
}
interface Conversation {
  id: string; fromAgentId: string; fromName: string; fromIcon: string; fromColor: string
  toAgentId: string; toName?: string; message: string; msgType: string
  resolved: boolean; createdAt: string
}
interface Memory {
  id: string; agentId: string; agentName: string; agentIcon: string; agentColor: string
  type: string; content: string; importance: number; createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusOf(run: any): 'running' | 'success' | 'failure' | 'info' {
  if (run.status === 'in_progress' || run.status === 'queued') return 'running'
  if (run.conclusion === 'success') return 'success'
  if (run.conclusion === 'failure') return 'failure'
  return 'info'
}
function msgColor(type: string) {
  if (type === 'success') return '#30D158'
  if (type === 'failure') return '#FF453A'
  if (type === 'running') return '#FFD60A'
  if (type === 'alert')   return '#FF9F0A'
  return '#8E8E93'
}
function importanceColor(n: number) {
  if (n >= 4) return '#FF453A'
  if (n >= 3) return '#FF9F0A'
  if (n >= 2) return '#FFD60A'
  return '#8E8E93'
}
function importanceLabel(n: number) {
  if (n >= 4) return 'CRITICAL'
  if (n >= 3) return 'HIGH'
  if (n >= 2) return 'MED'
  return 'INFO'
}

// ── Key gate ─────────────────────────────────────────────────────────────────
function KeyGate({ children }: { children: React.ReactNode }) {
  const params = useSearchParams()
  const key = params.get('key') || ''
  const devKey = process.env.NEXT_PUBLIC_DEVELOPER_KEY || 'ks-dev-2026'

  if (!key || key !== devKey) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--app-bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 48, margin: 0 }}>404</p>
            <p style={{ color: 'rgba(70,75,96,0.6)', fontSize: 13, fontWeight: 700, marginTop: 8 }}>
            Page not found
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ── Mission Control ───────────────────────────────────────────────────────────
function MissionControl() {
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [activeCat, setActiveCat] = useState('all')
  const [activeTab, setActiveTab] = useState<'agents' | 'conversations' | 'memory'>('agents')
  const [feedMsgs, setFeedMsgs] = useState<FeedMsg[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [triggerModal, setTriggerModal] = useState<Agent | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch('/agents-config.json')
      .then(r => r.json())
      .then((cfg: AgentConfig) => setConfig(cfg))
      .catch(() => setConfig({ agents: [], categories: {} }))
  }, [])

  const fetchTabData = async () => {
    try {
      const [convRes, memRes] = await Promise.all([
        fetch('/api/agents/conversations'),
        fetch('/api/agents/memory'),
      ])
      if (convRes.ok) setConversations(await convRes.json())
      if (memRes.ok) setMemories(await memRes.json())
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'conversations' || activeTab === 'memory') {
      fetchTabData()
      const interval = setInterval(fetchTabData, 15000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  useEffect(() => {
    const connect = () => {
      const es = new EventSource('/api/agents/feed')
      esRef.current = es
      es.addEventListener('update', (e) => {
        const data = JSON.parse(e.data)
        setRuns(data.runs || [])
        setIssues(data.issues || [])
        setIsConnected(true)
        const agents = config?.agents || []
        const newMsgs: FeedMsg[] = (data.runs || []).slice(0, 15).map((run: any) => {
          const agent = agents.find(a => run.name?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]))
          const type = statusOf(run)
          return {
            id: String(run.id),
            agentName: agent?.name || run.name || 'Agent',
            agentIcon: agent?.icon || '🤖',
            agentColor: agent?.color || '#5E5CE6',
            message: type === 'running' ? 'Running...' : type === 'success' ? 'Completed successfully' : type === 'failure' ? 'Failed — needs attention' : `Status: ${run.conclusion || run.status}`,
            type, ts: new Date(run.created_at).getTime(), url: run.html_url,
          }
        })
        const issueMsgs: FeedMsg[] = (data.issues || []).slice(0, 5).map((issue: any) => ({
          id: `issue-${issue.number}`, agentName: 'Health Monitor', agentIcon: '🚨', agentColor: '#FF453A',
          message: issue.title, type: 'alert' as const, ts: new Date(issue.created_at).getTime(), url: issue.html_url,
        }))
        const memMsgs: FeedMsg[] = (data.memories || []).slice(0, 10).map((m: Memory) => ({
          id: `mem-${m.id}`, agentName: m.agentName, agentIcon: m.agentIcon, agentColor: m.agentColor,
          message: `[${m.type}] ${m.content.slice(0, 80)}`,
          type: m.importance >= 4 ? 'alert' as const : 'info' as const,
          ts: new Date(m.createdAt).getTime(),
        }))
        const convMsgs: FeedMsg[] = (data.conversations || []).slice(0, 5).map((c: Conversation) => ({
          id: `conv-${c.id}`, agentName: c.fromName, agentIcon: c.fromIcon, agentColor: c.fromColor,
          message: `→ ${c.toAgentId === 'all' ? 'all agents' : c.toName || c.toAgentId}: ${c.message.slice(0, 60)}`,
          type: 'info' as const, ts: new Date(c.createdAt).getTime(),
        }))
        setFeedMsgs(prev => {
          const combined = [...newMsgs, ...issueMsgs, ...memMsgs, ...convMsgs]
          const merged = [...prev, ...combined]
          const unique = merged.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
          return unique.sort((a, b) => b.ts - a.ts).slice(0, 100)
        })
      })
      es.addEventListener('ping', () => setIsConnected(true))
      es.onerror = () => { setIsConnected(false); setTimeout(connect, 5000) }
    }
    connect()
    return () => esRef.current?.close()
  }, [config])

  useEffect(() => { feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [feedMsgs.length])

  const triggerAgent = async (agent: Agent, task: string) => {
    setSending(true)
    try {
      await fetch('/api/agents/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: agent.workflow, inputs: { task } }),
      })
      setFeedMsgs(prev => [{
        id: `trigger-${Date.now()}`, agentName: agent.name, agentIcon: agent.icon, agentColor: agent.color,
        message: `Manually triggered: "${task.slice(0, 60)}"`, type: 'running', ts: Date.now(),
      }, ...prev])
    } catch {}
    setSending(false); setTriggerModal(null); setTaskInput('')
  }

  const sendIssue = async (title: string, labels: string[]) => {
    try {
      await fetch('/api/agents/issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: `Requested from Mission Control at ${new Date().toISOString()}`, labels }),
      })
    } catch {}
  }

  const resolveConv = async (id: string) => {
    try {
      await fetch(`/api/agents/conversations/${id}/resolve`, { method: 'PATCH' })
      setConversations(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c))
    } catch {}
  }

  const agents = config?.agents || []
  const categories = config?.categories || {}
  const filteredAgents = agents.filter(a =>
    (activeCat === 'all' || a.cat === activeCat) &&
    (filter === '' || a.name.toLowerCase().includes(filter.toLowerCase()) || a.desc?.toLowerCase().includes(filter.toLowerCase()))
  )
  const runMap = new Map(runs.map(r => [r.name, r]))
  const runningCount = runs.filter(r => r.status === 'in_progress').length
  const failedCount  = runs.filter(r => r.conclusion === 'failure').length

  const TABS = [
    { key: 'agents', label: `🛸 Agents (${agents.length})` },
    { key: 'conversations', label: `💬 Conversations` },
    { key: 'memory', label: `🧠 Memory` },
  ]

  return (
    <div className="min-h-screen app-page" style={{ fontFamily: 'Nunito, sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--app-accent), #7B59FF)', borderBottom: '1px solid rgba(120,120,140,0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)', boxShadow: '0 4px 20px rgba(94,92,230,0.4)' }}>
              🛸
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">Mission Control</h1>
              <p className="text-white/80 text-xs font-bold">{agents.length} Autonomous Agents · Developer View · KinderSpark Pro</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg text-[10px] font-black" style={{ background: 'rgba(255,69,58,0.15)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.3)' }}>
              🔒 DEV ONLY
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
              style={{ background: isConnected ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                       color: isConnected ? '#30D158' : '#FF453A',
                       border: `1px solid ${isConnected ? '#30D15840' : '#FF453A40'}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? '#30D158' : '#FF453A', boxShadow: isConnected ? '0 0 6px #30D158' : 'none' }} />
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </div>
            {runningCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: 'rgba(255,214,10,0.15)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.25)' }}>
                ⚡ {runningCount} running
              </div>
            )}
            {failedCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: 'rgba(255,69,58,0.15)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.25)' }}>
                ❌ {failedCount} failed
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className="px-4 py-2 text-xs font-black rounded-t-xl transition-all"
              style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : 'rgba(255,255,255,0.65)',
                borderBottom: activeTab === tab.key ? '2px solid #5E5CE6' : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <div className="flex-1 min-w-0">

          {/* Agents tab */}
          {activeTab === 'agents' && (
            <>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button onClick={() => setActiveCat('all')}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                  style={{ background: activeCat === 'all' ? '#5E5CE625' : 'rgba(255,255,255,0.05)', border: `1px solid ${activeCat === 'all' ? '#5E5CE650' : 'rgba(255,255,255,0.08)'}`, color: activeCat === 'all' ? '#5E5CE6' : 'rgba(255,255,255,0.4)' }}>
                  All Agents
                </button>
                {Object.entries(categories).map(([key, cat]) => (
                  <button key={key} onClick={() => setActiveCat(key)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                    style={{ background: activeCat === key ? cat.color + '25' : 'rgba(255,255,255,0.05)', border: `1px solid ${activeCat === key ? cat.color + '50' : 'rgba(255,255,255,0.08)'}`, color: activeCat === key ? cat.color : 'rgba(255,255,255,0.4)' }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 Search agents..."
                className="w-full mb-4 px-4 py-2 rounded-xl text-sm font-bold outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              {config === null ? (
                <div className="text-center py-20 font-bold app-muted">Loading agents...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredAgents.map(agent => {
                    const run = runMap.get(agent.name) || runs.find(r => r.name?.includes(agent.name.split(' ')[0]))
                    const type = run ? statusOf(run) : 'info'
                    const sc = msgColor(type)
                    const isRunning = type === 'running'
                    return (
                      <div key={agent.id} className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                        style={{ background: `linear-gradient(135deg, ${agent.color}08, transparent)`, border: `1px solid ${agent.color}18` }}>
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: agent.color + '20', border: `1px solid ${agent.color}35`, boxShadow: isRunning ? `0 0 12px ${agent.color}50` : 'none' }}>
                            {isRunning ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</span> : agent.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm truncate">{agent.name}</p>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: sc + '20', color: sc }}>
                                {isRunning ? '⚡ LIVE' : type === 'success' ? '✅' : type === 'failure' ? '❌' : '⏸'}
                              </span>
                            </div>
                            <p className="text-white/30 text-[10px] font-bold">{agent.trigger}</p>
                          </div>
                        </div>
                        {agent.desc && <p className="text-white/35 text-[10px] font-bold mb-2 leading-tight">{agent.desc}</p>}
                        {run && <p className="text-white/25 text-[10px] font-bold truncate mb-2">Last: {new Date(run.created_at).toLocaleString()}</p>}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { setTriggerModal(agent); setTaskInput('') }}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:opacity-90"
                            style={{ background: agent.color + '22', color: agent.color, border: `1px solid ${agent.color}35` }}>
                            ▶ Run
                          </button>
                          {run?.html_url && (
                            <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-[11px] font-black"
                              style={{ background: 'var(--app-surface-soft)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              Logs →
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Conversations tab */}
          {activeTab === 'conversations' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold app-muted">Agent-to-agent messages, handoffs and broadcasts</p>
                <button onClick={fetchTabData} className="text-xs font-black px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6', border: '1px solid rgba(94,92,230,0.3)' }}>↻ Refresh</button>
              </div>
              {conversations.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="font-bold app-muted text-sm">No agent conversations yet</p>
                  <p className="text-white/20 text-xs mt-1 font-bold">Agents will message each other when they have dependent work</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <div key={conv.id} className="rounded-2xl p-4"
                      style={{ background: conv.resolved ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${conv.fromColor}08, transparent)`, border: `1px solid ${conv.resolved ? 'rgba(255,255,255,0.06)' : conv.fromColor + '25'}`, opacity: conv.resolved ? 0.5 : 1 }}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{conv.fromIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-black" style={{ color: conv.fromColor }}>{conv.fromName}</span>
                            <span className="text-white/30 text-[10px] font-bold">→</span>
                            <span className="text-xs app-muted font-black">{conv.toAgentId === 'all' ? '📢 All Agents' : conv.toName || conv.toAgentId}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'var(--app-surface-soft)', color: 'rgba(255,255,255,0.4)' }}>{conv.msgType}</span>
                            {conv.resolved && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(48,209,88,0.15)', color: '#30D158' }}>✓ resolved</span>}
                          </div>
                          <p className="text-sm font-bold leading-snug">{conv.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-white/25 text-[10px] font-bold">{new Date(conv.createdAt).toLocaleString()}</span>
                            {!conv.resolved && (
                              <button onClick={() => resolveConv(conv.id)} className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                                style={{ background: 'rgba(48,209,88,0.1)', color: '#30D158', border: '1px solid rgba(48,209,88,0.2)' }}>
                                ✓ Mark resolved
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Memory tab */}
          {activeTab === 'memory' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold app-muted">What every agent has learned and decided</p>
                <button onClick={fetchTabData} className="text-xs font-black px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6', border: '1px solid rgba(94,92,230,0.3)' }}>↻ Refresh</button>
              </div>
              {memories.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">🧠</p>
                  <p className="font-bold app-muted text-sm">No agent memories yet</p>
                  <p className="text-white/20 text-xs mt-1 font-bold">Agents write memories after each run to share context</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map(mem => (
                    <div key={mem.id} className="rounded-2xl p-4"
                      style={{ background: `linear-gradient(135deg, ${mem.agentColor}06, transparent)`, border: `1px solid ${mem.agentColor}18` }}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{mem.agentIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-black" style={{ color: mem.agentColor }}>{mem.agentName}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--app-surface-soft)', color: 'rgba(255,255,255,0.4)' }}>{mem.type}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto" style={{ background: importanceColor(mem.importance) + '20', color: importanceColor(mem.importance) }}>{importanceLabel(mem.importance)}</span>
                          </div>
                          <p className="text-sm font-bold leading-snug">{mem.content}</p>
                          <span className="text-white/25 text-[10px] font-bold mt-1 block">{new Date(mem.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Feed */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-4">
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(94,92,230,0.05)', border: '1px solid rgba(94,92,230,0.2)' }}>
              <p className="font-black text-sm mb-2">📋 Send Task to Agent</p>
              <div className="flex gap-2 mb-2">
                {['frontend', 'backend', 'claude-build'].map(l => (
                  <button key={l} onClick={() => sendIssue(`Task: ${l} improvement`, [l, 'agent-auto'])}
                    className="flex-1 py-1 rounded-lg text-[10px] font-black"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {l}
                  </button>
                ))}
              </div>
              <input placeholder="Type a task for any agent..."
                className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val) { sendIssue(val, ['claude-build', 'agent-auto']); (e.target as HTMLInputElement).value = '' }
                  }
                }} />
              <p className="text-white/25 text-[10px] font-bold">Press Enter → creates issue → agents auto-pick up</p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--app-surface-soft)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-black text-sm">🔴 Live Feed</p>
                <span className="text-white/30 text-[10px] font-bold">{feedMsgs.length} events</span>
              </div>
              <div ref={feedRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {feedMsgs.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-4xl mb-2">🛸</p>
                    <p className="text-xs font-bold app-muted">Connecting to agent feed...</p>
                  </div>
                )}
                {feedMsgs.map((msg, i) => (
                  <div key={msg.id + i} className="px-3 py-3 hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5">{msg.agentIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-black truncate" style={{ color: msg.agentColor }}>{msg.agentName}</span>
                          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: msgColor(msg.type) }} />
                        </div>
                        <p className="text-white/60 text-[11px] font-bold leading-tight">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/25 text-[10px] font-bold">{new Date(msg.ts).toLocaleTimeString()}</span>
                          {msg.url && <a href={msg.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold" style={{ color: msg.agentColor + '80' }}>View →</a>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {issues.length > 0 && (
              <div className="rounded-2xl mt-4 overflow-hidden" style={{ border: '1px solid rgba(255,69,58,0.2)', background: 'rgba(255,69,58,0.05)' }}>
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,69,58,0.1)' }}>
                  <p className="text-red-400 font-black text-xs">🚨 Open Alerts</p>
                  <span className="text-red-400/60 text-[10px] font-bold">{issues.length}</span>
                </div>
                {issues.slice(0, 5).map(issue => (
                  <a key={issue.number} href={issue.html_url} target="_blank" rel="noopener noreferrer"
                    className="block px-3 py-2 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-white/70 text-[11px] font-bold truncate">#{issue.number} {issue.title}</p>
                    <p className="text-white/25 text-[10px] font-bold">{new Date(issue.created_at).toLocaleDateString()}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trigger modal */}
      {triggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) setTriggerModal(null) }}>
          <div className="w-full max-w-md rounded-3xl p-6" style={{ background: '#0f0a1e', border: `1px solid ${triggerModal.color}30` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: triggerModal.color + '20', border: `1px solid ${triggerModal.color}40` }}>{triggerModal.icon}</div>
              <div>
                <p className="font-black">Run {triggerModal.name}</p>
                <p className="text-xs font-bold app-muted">{triggerModal.desc || 'Manually trigger this agent'}</p>
              </div>
            </div>
            <textarea value={taskInput} onChange={e => setTaskInput(e.target.value)}
              placeholder={`What should ${triggerModal.name} do?\n\nLeave blank to run standard check`}
              rows={4} className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
            <div className="flex gap-3">
              <button onClick={() => setTriggerModal(null)} className="flex-1 py-3 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={() => triggerAgent(triggerModal, taskInput || 'Run standard check')} disabled={sending}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: `linear-gradient(135deg, ${triggerModal.color}, ${triggerModal.color}cc)`, boxShadow: `0 4px 20px ${triggerModal.color}40` }}>
                {sending ? '⚡ Launching...' : '▶ Launch Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Export with gate ──────────────────────────────────────────────────────────
export default function DevPage() {
  return (
    <Suspense fallback={<div style={{ background: '#080614', minHeight: '100vh' }} />}>
      <KeyGate>
        <MissionControl />
      </KeyGate>
    </Suspense>
  )
}
