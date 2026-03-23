'use client'
import { useEffect, useRef, useState } from 'react'
import agentsConfig from '@/public/agents-config.json'
import { useAppStore } from '@/store/appStore'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://kinderspark-backend-production.up.railway.app/api'

type Agent = typeof agentsConfig.agents[number]

interface Msg {
  id: string
  fromAgentId: string; fromName: string; fromIcon: string; fromColor: string
  toAgentId: string;   toName: string
  message: string;     msgType: string
  createdAt: string
}
interface Memory {
  id: string
  agentId: string; agentName: string; agentIcon: string; agentColor: string
  type: string; content: string; importance: number; createdAt: string
}
interface Run {
  id: number; name: string; status: string; conclusion: string | null
  html_url: string; created_at: string; head_branch: string
}

const CATS = Object.entries((agentsConfig as any).categories) as [string,{label:string;icon:string;color:string}][]

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 10)  return 'just now'
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function sameAuthor(a: Msg, b: Msg) {
  return a.fromAgentId === b.fromAgentId &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 120_000
}

const BADGE_COLORS: Record<string, string> = {
  alert: '#FF453A', handoff: '#FFD60A', question: '#5AC8FA',
  broadcast: '#BF5AF2', fix: '#30D158', update: '#636366',
}

export default function AgentsDashboard() {
  const storeToken = useAppStore(s => s.token)
  const [conversations, setConversations] = useState<Msg[]>([])
  const [memories, setMemories]           = useState<Memory[]>([])
  const [runs, setRuns]                   = useState<Run[]>([])
  const [connected, setConnected]         = useState(false)
  const [tab, setTab]                     = useState<'chat'|'memory'|'runs'>('chat')
  const [catFilter, setCatFilter]         = useState('all')
  const [taskInput, setTaskInput]         = useState('')
  const [sending, setSending]             = useState(false)
  const [toast, setToast]                 = useState('')
  const [prevCount, setPrevCount]         = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const headers: Record<string,string> = storeToken
          ? { Authorization: `Bearer ${storeToken}` }
          : { 'x-agent-secret': 'ks-agent-secret' }
        const [c, m, r] = await Promise.all([
          fetch(`${API}/agents/conversations?limit=80`, { headers }),
          fetch(`${API}/agents/memory?limit=80`,        { headers }),
          fetch(`${API}/agents/runs`,                   { headers }),
        ])
        if (c.ok) { const d = await c.json(); setConversations(d.reverse()) }
        if (m.ok) { const d = await m.json(); setMemories(d) }
        if (r.ok) setRuns(await r.json())
        setConnected(true)
      } catch { setConnected(false) }
    }
    poll()
    const t = setInterval(poll, 8_000)
    return () => clearInterval(t)
  }, [storeToken])

  // Auto-scroll only when new messages arrive
  useEffect(() => {
    if (conversations.length > prevCount) {
      setPrevCount(conversations.length)
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversations.length])

  const sendTask = async () => {
    if (!taskInput.trim()) return
    setSending(true)
    try {
      const r = await fetch(`${API}/agents/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-secret': 'ks-agent-secret' },
        body: JSON.stringify({ title: taskInput.trim(), body: taskInput.trim(), labels: ['agent-auto'] }),
      })
      if (r.ok) { setTaskInput(''); showToast('✅ Task dispatched!') }
      else showToast('❌ Could not dispatch — check GitHub token')
    } catch { showToast('❌ Network error') }
    setSending(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const activeIds = new Set(conversations.slice(-15).map(c => c.fromAgentId))
  const filteredAgents = catFilter === 'all' ? agentsConfig.agents : agentsConfig.agents.filter(a => a.cat === catFilter)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0e0c1a', color: 'white', fontFamily: 'Nunito, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px }
        input::placeholder { color: rgba(255,255,255,0.25) }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: '10px 16px', background: '#13101f', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🛸</span>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.3px' }}>KinderSpark Agent Room</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {agentsConfig.agents.length} agents ·{' '}
            <span style={{ color: connected ? '#30D158' : '#FF453A' }}>{connected ? '● live' : '○ connecting'}</span>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          {(['chat','memory','runs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t ? '#5E5CE6' : 'rgba(255,255,255,0.06)',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
              fontWeight: 800, fontSize: 11, fontFamily: 'Nunito, sans-serif',
            }}>
              {t === 'chat' ? `💬 Chat${conversations.length ? ` (${conversations.length})` : ''}` : t === 'memory' ? '🧠 Memory' : '⚡ Runs'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left sidebar — agent list ── */}
        <div style={{ width: 220, background: '#13101f', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {/* Category pills */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button onClick={() => setCatFilter('all')} style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: catFilter === 'all' ? '#5E5CE6' : 'rgba(255,255,255,0.07)', color: catFilter === 'all' ? 'white' : 'rgba(255,255,255,0.4)' }}>ALL</button>
            {CATS.map(([id, cat]) => (
              <button key={id} onClick={() => setCatFilter(id)} style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: catFilter === id ? cat.color : 'rgba(255,255,255,0.07)', color: catFilter === id ? 'white' : 'rgba(255,255,255,0.4)' }}>
                {cat.icon}
              </button>
            ))}
          </div>
          {/* Agent rows */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {filteredAgents.map(agent => {
              const active = activeIds.has(agent.id)
              return (
                <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8, margin: '1px 6px', background: active ? agent.color + '15' : 'transparent', transition: 'background 0.2s' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: agent.color + '25', border: `1px solid ${agent.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{agent.icon}</div>
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: active ? '#30D158' : '#3a3a4a', border: '1.5px solid #13101f', animation: active ? 'pulse 2s infinite' : 'none' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: active ? 'white' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                    <div style={{ fontSize: 8, color: active ? agent.color : 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{active ? 'active' : agent.cat}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* CHAT TAB */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {conversations.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>Agents are waking up...</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Messages will appear here once agents start talking</div>
                  </div>
                ) : conversations.map((msg, i) => {
                  const prev = conversations[i - 1]
                  const isGrouped = prev && sameAuthor(prev, msg)
                  const isDM = msg.toAgentId !== 'all'
                  const isAlert = msg.msgType === 'alert'
                  const isHandoff = msg.msgType === 'handoff'
                  const color = msg.fromColor || '#5E5CE6'

                  return (
                    <div key={msg.id} style={{ display: 'flex', gap: 10, marginTop: isGrouped ? 2 : 12, animation: 'slideUp 0.25s ease' }}>
                      {/* Avatar or spacer */}
                      <div style={{ width: 36, flexShrink: 0, paddingTop: 1 }}>
                        {!isGrouped ? (
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '25', border: `1.5px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: isAlert ? `0 0 10px ${color}60` : 'none' }}>
                            {msg.fromIcon}
                          </div>
                        ) : <div style={{ width: 36 }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name + time (only on first in group) */}
                        {!isGrouped && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontWeight: 900, fontSize: 13, color }}>{msg.fromName}</span>
                            {isDM && (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                → <span style={{ color: 'rgba(255,255,255,0.5)' }}>@{msg.toName}</span>
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 2 }}>{timeAgo(msg.createdAt)}</span>
                            {isAlert && <span style={{ fontSize: 9, fontWeight: 900, color: '#FF453A', background: '#FF453A22', padding: '1px 5px', borderRadius: 4 }}>🚨 ALERT</span>}
                            {isHandoff && <span style={{ fontSize: 9, fontWeight: 900, color: '#FFD60A', background: '#FFD60A22', padding: '1px 5px', borderRadius: 4 }}>🤝 HANDOFF</span>}
                          </div>
                        )}
                        {/* Message bubble */}
                        <div style={{
                          display: 'inline-block', maxWidth: '85%',
                          background: isAlert ? 'rgba(255,69,58,0.12)' : isHandoff ? 'rgba(255,214,10,0.08)' : isDM ? color + '12' : 'rgba(255,255,255,0.05)',
                          border: isAlert ? '1px solid rgba(255,69,58,0.3)' : isHandoff ? '1px solid rgba(255,214,10,0.2)' : isDM ? `1px solid ${color}25` : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: isGrouped ? '4px 12px 12px 4px' : '4px 12px 12px 12px',
                          padding: '7px 12px',
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: 13, lineHeight: 1.55,
                          wordBreak: 'break-word',
                        }}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#13101f', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '4px 4px 4px 14px' }}>
                  <span style={{ fontSize: 16 }}>🛸</span>
                  <input
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendTask()}
                    placeholder="Dispatch a task to all agents..."
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 13, fontFamily: 'Nunito, sans-serif', padding: '6px 0' }}
                  />
                  <button onClick={sendTask} disabled={sending || !taskInput.trim()} style={{
                    background: sending || !taskInput.trim() ? 'rgba(255,255,255,0.08)' : '#5E5CE6',
                    border: 'none', borderRadius: 9, padding: '7px 14px',
                    color: 'white', fontWeight: 900, fontSize: 12,
                    cursor: sending || !taskInput.trim() ? 'default' : 'pointer',
                    transition: 'background 0.2s', fontFamily: 'Nunito, sans-serif',
                  }}>
                    {sending ? '...' : 'Send →'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* MEMORY TAB */}
          {tab === 'memory' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memories.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: 48 }}>🧠</div>
                  <div style={{ fontWeight: 800, marginTop: 12 }}>No memories yet</div>
                </div>
              ) : memories.map(m => (
                <div key={m.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.agentColor || '#5E5CE6'}25`, borderLeft: `3px solid ${m.agentColor || '#5E5CE6'}`, borderRadius: '0 10px 10px 0', animation: 'slideUp 0.2s ease' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{m.agentIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: m.agentColor || '#5E5CE6', fontWeight: 800, fontSize: 12 }}>{m.agentName}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>{m.type}</span>
                      {m.importance >= 3 && <span style={{ fontSize: 9, color: '#FF453A', fontWeight: 900 }}>🔴 critical</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(m.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RUNS TAB */}
          {tab === 'runs' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {runs.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: 48 }}>⚡</div>
                  <div style={{ fontWeight: 800, marginTop: 12 }}>No workflow runs</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>GitHub Actions runs appear here</div>
                </div>
              ) : runs.map(run => {
                const color = run.status === 'in_progress' ? '#FFD60A' : run.conclusion === 'success' ? '#30D158' : run.conclusion === 'failure' ? '#FF453A' : '#636366'
                const label = run.status === 'in_progress' ? 'Running' : run.conclusion === 'success' ? 'Success' : run.conclusion === 'failure' ? 'Failed' : 'Idle'
                return (
                  <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: run.status === 'in_progress' ? `0 0 8px ${color}` : 'none', animation: run.status === 'in_progress' ? 'pulse 1s infinite' : 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{run.head_branch} · {timeAgo(run.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: color + '22', color }}>{label}</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 20px', color: 'white', fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
