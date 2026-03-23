'use client'
import { useEffect, useRef, useState } from 'react'
import agentsConfig from '@/public/agents-config.json'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

type Agent   = typeof agentsConfig.agents[number]
type MsgType = 'update' | 'handoff' | 'broadcast' | 'alert' | 'observation'

interface Conversation {
  id: string
  fromAgentId: string; fromName: string; fromIcon: string; fromColor: string
  toAgentId: string;   toName: string
  message: string;     msgType: MsgType
  createdAt: string
}
interface Memory {
  id: string
  agentId: string; agentName: string; agentIcon: string; agentColor: string
  type: string;    content: string;   importance: number
  createdAt: string
}
interface Run {
  id: number; name: string; status: string; conclusion: string | null
  html_url: string; created_at: string; updated_at: string
  head_branch: string
}

const CATS = Object.entries((agentsConfig as any).categories) as [string, {label:string;icon:string;color:string}][]

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400)return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function statusDot(status: string, conclusion: string | null) {
  if (status === 'in_progress') return { color: '#FFD60A', label: 'Running' }
  if (status === 'queued')      return { color: '#5AC8FA', label: 'Queued' }
  if (conclusion === 'success') return { color: '#30D158', label: 'Success' }
  if (conclusion === 'failure') return { color: '#FF453A', label: 'Failed' }
  return { color: '#636366', label: 'Idle' }
}

function MsgBubble({ msg, agents }: { msg: Conversation; agents: Agent[] }) {
  const color = msg.fromColor || '#5E5CE6'
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: color + '22',
        border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 15, flexShrink: 0,
      }}>{msg.fromIcon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ color, fontWeight: 800, fontSize: 11 }}>{msg.fromName}</span>
          {msg.toAgentId !== 'all' && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>→</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{msg.toName}</span>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {timeAgo(msg.createdAt)}
          </span>
        </div>
        <div style={{
          background: color + '14', border: `1px solid ${color}33`,
          borderRadius: '4px 12px 12px 12px', padding: '6px 10px',
          color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {msg.message}
        </div>
        <div style={{ marginTop: 3 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            background: msg.msgType === 'alert' ? '#FF453A22' : msg.msgType === 'handoff' ? '#FFD60A22' : color + '22',
            color: msg.msgType === 'alert' ? '#FF453A' : msg.msgType === 'handoff' ? '#FFD60A' : color,
          }}>{msg.msgType.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}

function AgentCard({ agent, runs, isActive }: { agent: Agent; runs: Run[]; isActive: boolean }) {
  const agentRuns = runs.filter(r => r.name?.toLowerCase().includes(agent.name.toLowerCase().split(' ')[0]))
  const latest = agentRuns[0]
  const dot = latest ? statusDot(latest.status, latest.conclusion) : { color: '#636366', label: 'Idle' }
  const isPulsing = latest?.status === 'in_progress'

  return (
    <div style={{
      background: isActive ? agent.color + '18' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isActive ? agent.color + '55' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: '10px 12px',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: agent.color + '22', border: `1.5px solid ${agent.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          boxShadow: isActive ? `0 0 12px ${agent.color}55` : 'none',
        }}>{agent.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {agent.name}
            </span>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: dot.color,
              boxShadow: isPulsing ? `0 0 6px ${dot.color}` : 'none',
              animation: isPulsing ? 'pulse 1s infinite' : 'none',
              flexShrink: 0,
            }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.desc}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: agent.color, fontWeight: 700, background: agent.color + '22', padding: '1px 5px', borderRadius: 4 }}>
              {agent.trigger}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AgentsDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [memories, setMemories]           = useState<Memory[]>([])
  const [runs, setRuns]                   = useState<Run[]>([])
  const [stats, setStats]                 = useState<any>(null)
  const [connected, setConnected]         = useState(false)
  const [tab, setTab]                     = useState<'chat'|'memory'|'runs'>('chat')
  const [catFilter, setCatFilter]         = useState<string>('all')
  const [taskInput, setTaskInput]         = useState('')
  const [sending, setSending]             = useState(false)
  const [toast, setToast]                 = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const esRef      = useRef<EventSource | null>(null)

  // SSE feed
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    const connect = () => {
      const es = new EventSource(`${API}/agents/feed`, {})
      esRef.current = es

      // EventSource doesn't support headers natively — use fetch SSE instead
      es.close()

      // Fallback: poll every 10s
      const poll = async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` }
          const [convRes, memRes, statsRes, runsRes] = await Promise.all([
            fetch(`${API}/agents/conversations?limit=60`, { headers }),
            fetch(`${API}/agents/memory?limit=60`,        { headers }),
            fetch(`${API}/agents/stats`,                  { headers }),
            fetch(`${API}/agents/runs`,                   { headers }),
          ])
          if (convRes.ok)   setConversations(await convRes.json())
          if (memRes.ok)    setMemories(await memRes.json())
          if (statsRes.ok)  setStats(await statsRes.json())
          if (runsRes.ok)   setRuns(await runsRes.json())
          setConnected(true)
        } catch { setConnected(false) }
      }

      poll()
      const interval = setInterval(poll, 10_000)
      return () => clearInterval(interval)
    }

    const cleanup = connect()
    return cleanup
  }, [])

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, tab])

  const sendTask = async () => {
    if (!taskInput.trim()) return
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API}/agents/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: taskInput.trim(), body: taskInput.trim(), labels: ['agent-auto'] }),
      })
      if (r.ok) {
        setTaskInput('')
        showToast('✅ Task sent to agents!')
      } else {
        showToast('❌ Failed — check GitHub token in Railway')
      }
    } catch { showToast('❌ Network error') }
    setSending(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const activeAgentIds = new Set(conversations.slice(0, 10).map(c => c.fromAgentId))
  const filteredAgents = catFilter === 'all'
    ? agentsConfig.agents
    : agentsConfig.agents.filter(a => a.cat === catFilter)

  const runningCount = runs.filter(r => r.status === 'in_progress').length
  const failedCount  = runs.filter(r => r.conclusion === 'failure').length

  return (
    <div style={{
      minHeight: '100vh', background: '#080614', color: 'white',
      fontFamily: 'Nunito, sans-serif', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 8px #5E5CE655} 50%{box-shadow:0 0 20px #5E5CE6aa} }
        ::-webkit-scrollbar{ width:4px }
        ::-webkit-scrollbar-track{ background:transparent }
        ::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.1); border-radius:2px }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,8,20,0.97)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 24 }}>🛸</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Agent Command Center</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
            {agentsConfig.agents.length} agents · {' '}
            <span style={{ color: connected ? '#30D158' : '#FF453A' }}>
              {connected ? '● Live' : '○ Connecting...'}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {runningCount > 0 && (
            <span style={{ fontSize: 11, color: '#FFD60A', fontWeight: 800, background: '#FFD60A22', padding: '3px 8px', borderRadius: 6 }}>
              ⚡ {runningCount} running
            </span>
          )}
          {failedCount > 0 && (
            <span style={{ fontSize: 11, color: '#FF453A', fontWeight: 800, background: '#FF453A22', padding: '3px 8px', borderRadius: 6 }}>
              ⚠️ {failedCount} failed
            </span>
          )}
          {stats && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {stats.totalMemories || 0} memories · {stats.totalConversations || 0} messages
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 64px)' }}>

        {/* Left — Agent Grid */}
        <div style={{
          width: 340, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Category filter */}
          <div style={{
            padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setCatFilter('all')}
              style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, border: 'none',
                background: catFilter === 'all' ? '#5E5CE6' : 'rgba(255,255,255,0.06)',
                color: catFilter === 'all' ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}>ALL</button>
            {CATS.map(([id, cat]) => (
              <button key={id} onClick={() => setCatFilter(id)} style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, border: 'none',
                background: catFilter === id ? cat.color : 'rgba(255,255,255,0.06)',
                color: catFilter === id ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}>{cat.icon} {cat.label}</button>
            ))}
          </div>
          {/* Agent list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                runs={runs}
                isActive={activeAgentIds.has(agent.id)}
              />
            ))}
          </div>
          {/* Task input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              DISPATCH TASK TO AGENTS
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTask()}
                placeholder="e.g. Add dark mode toggle..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '7px 10px', color: 'white', fontSize: 11,
                  outline: 'none', fontFamily: 'Nunito, sans-serif',
                }}
              />
              <button
                onClick={sendTask}
                disabled={sending || !taskInput.trim()}
                style={{
                  background: sending ? '#636366' : '#5E5CE6', border: 'none', borderRadius: 8,
                  padding: '7px 12px', color: 'white', fontWeight: 900, fontSize: 11,
                  cursor: sending ? 'default' : 'pointer',
                }}>{sending ? '...' : '→'}</button>
            </div>
          </div>
        </div>

        {/* Right — Live Feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 20px',
          }}>
            {(['chat','memory','runs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid #5E5CE6' : '2px solid transparent',
                color: tab === t ? 'white' : 'rgba(255,255,255,0.35)',
                fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                textTransform: 'capitalize',
              }}>
                {t === 'chat' ? `💬 Agent Chat (${conversations.length})` : t === 'memory' ? `🧠 Memory (${memories.length})` : `⚡ Runs (${runs.length})`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

            {tab === 'chat' && (
              <div>
                {conversations.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 700 }}>No agent messages yet</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Messages appear here as agents work</div>
                  </div>
                ) : (
                  conversations.map(msg => (
                    <MsgBubble key={msg.id} msg={msg} agents={agentsConfig.agents} />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {tab === 'memory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memories.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                    <div style={{ fontWeight: 700 }}>No memories stored yet</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Agent memories appear here as they run</div>
                  </div>
                ) : memories.map(m => (
                  <div key={m.id} style={{
                    background: (m.agentColor || '#5E5CE6') + '10',
                    border: `1px solid ${m.agentColor || '#5E5CE6'}30`,
                    borderRadius: 10, padding: '10px 12px',
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{m.agentIcon}</span>
                      <span style={{ color: m.agentColor || '#5E5CE6', fontWeight: 800, fontSize: 11 }}>{m.agentName}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>{m.type}</span>
                      {m.importance >= 3 && <span style={{ fontSize: 9, color: '#FF453A', fontWeight: 900 }}>🔴 CRITICAL</span>}
                      <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{timeAgo(m.createdAt)}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'runs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {runs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                    <div style={{ fontWeight: 700 }}>No workflow runs yet</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Set GITHUB_TOKEN in Railway backend to see runs</div>
                  </div>
                ) : runs.map(run => {
                  const dot = statusDot(run.status, run.conclusion)
                  return (
                    <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" style={{
                      background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`,
                      borderRadius: 10, padding: '10px 14px', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 0.2s',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: dot.color,
                        boxShadow: run.status === 'in_progress' ? `0 0 8px ${dot.color}` : 'none',
                        animation: run.status === 'in_progress' ? 'pulse 1s infinite' : 'none',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {run.name}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                          {run.head_branch} · {timeAgo(run.created_at)}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                        background: dot.color + '22', color: dot.color,
                      }}>{dot.label}</span>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 18px', color: 'white',
          fontWeight: 700, fontSize: 13, zIndex: 9999,
          animation: 'fadeIn 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>{toast}</div>
      )}
    </div>
  )
}
