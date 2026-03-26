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

const CATS = Object.entries((agentsConfig as any).categories) as [string, { label: string; icon: string; color: string }][]

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 10)   return 'just now'
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function sameGroup(a: Msg, b: Msg) {
  return a.fromAgentId === b.fromAgentId &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 120_000
}

export default function AgentsDashboard() {
  const storeToken = useAppStore(s => s.token)
  const [conversations, setConversations] = useState<Msg[]>([])
  const [memories, setMemories]           = useState<Memory[]>([])
  const [runs, setRuns]                   = useState<Run[]>([])
  const [connected, setConnected]         = useState(false)
  const [tab, setTab]                     = useState<'chat' | 'memory' | 'runs'>('chat')
  const [catFilter, setCatFilter]         = useState('all')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [taskInput, setTaskInput]         = useState('')
  const [dmInput, setDmInput]             = useState('')
  const [sending, setSending]             = useState(false)
  const [dmSending, setDmSending]         = useState(false)
  const [waitingReply, setWaitingReply]   = useState(false)
  const [toast, setToast]                 = useState('')
  const [prevCount, setPrevCount]         = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dmEndRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const headers: Record<string, string> = storeToken
          ? { Authorization: `Bearer ${storeToken}` }
          : { 'x-agent-secret': 'ks-agent-secret' }
        const [c, m, r] = await Promise.all([
          fetch(`${API}/agents/conversations?limit=100`, { headers }),
          fetch(`${API}/agents/memory?limit=80`, { headers }),
          fetch(`${API}/agents/runs`, { headers }),
        ])
        if (c.ok) { const d = await c.json(); setConversations(d.reverse()) }
        if (m.ok) setMemories(await m.json())
        if (r.ok) setRuns(await r.json())
        setConnected(true)
      } catch { setConnected(false) }
    }
    poll()
    const t = setInterval(poll, 6_000)
    return () => clearInterval(t)
  }, [storeToken])

  // Scroll group chat
  useEffect(() => {
    if (conversations.length > prevCount && !selectedAgent) {
      setPrevCount(conversations.length)
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversations.length, selectedAgent])

  // Scroll DM panel + detect reply arrived
  const dmMsgs = selectedAgent
    ? conversations.filter(m =>
        (m.fromAgentId === selectedAgent.id && m.toAgentId === 'commander') ||
        (m.toAgentId === selectedAgent.id && m.fromAgentId === 'commander') ||
        (m.fromAgentId === selectedAgent.id && m.toAgentId === 'all')
      )
    : []

  const lastUserMsgTime = useRef<number>(0)

  useEffect(() => {
    if (!selectedAgent) return
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // Stop typing indicator when agent posts a message after our question
    if (waitingReply) {
      const hasNewReply = dmMsgs.some(m =>
        m.fromAgentId === selectedAgent.id &&
        new Date(m.createdAt).getTime() >= lastUserMsgTime.current - 2000
      )
      if (hasNewReply) setWaitingReply(false)
    }
  }, [dmMsgs.length, selectedAgent?.id])

  const sendTask = async () => {
    if (!taskInput.trim()) return
    setSending(true)
    try {
      const r = await fetch(`${API}/agents/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-secret': 'ks-agent-secret' },
        body: JSON.stringify({ title: taskInput.trim(), body: taskInput.trim(), labels: ['agent-auto'] }),
      })
      if (r.ok) { setTaskInput(''); showToast('✅ Task dispatched to all agents!') }
      else showToast('❌ Could not dispatch — check GitHub token in Railway')
    } catch { showToast('❌ Network error') }
    setSending(false)
  }

  const sendDM = async () => {
    if (!dmInput.trim() || !selectedAgent) return
    setDmSending(true)
    setWaitingReply(true)
    lastUserMsgTime.current = Date.now()
    const msg = dmInput.trim()
    setDmInput('')
    try {
      const r = await fetch(`${API}/agents/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-secret': 'ks-agent-secret' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          agentIcon: selectedAgent.icon,
          agentColor: selectedAgent.color,
          agentDesc: selectedAgent.desc,
          agentTrigger: selectedAgent.trigger,
          agentWorkflow: (selectedAgent as any).workflow,
          message: msg,
        }),
      })
      if (!r.ok) { showToast('❌ Failed to send message'); setWaitingReply(false) }
    } catch { showToast('❌ Network error'); setWaitingReply(false) }
    setDmSending(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const activeIds = new Set(conversations.slice(-15).map(c => c.fromAgentId))
  const filteredAgents = catFilter === 'all' ? agentsConfig.agents : agentsConfig.agents.filter(a => a.cat === catFilter)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0e0c1a', color: 'white', fontFamily: 'Nunito, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce  { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px }
        input::placeholder { color: rgba(255,255,255,0.22) }
        textarea::placeholder { color: rgba(255,255,255,0.22) }
        .agent-row:hover { background: rgba(255,255,255,0.05) !important; cursor: pointer }
        .msg-bubble:hover { filter: brightness(1.08) }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: '10px 16px', background: '#13101f', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}>🛸</span>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14 }}>KinderSpark Agent Room</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {agentsConfig.agents.length} agents ·{' '}
            <span style={{ color: connected ? '#4CAF6A' : '#E05252' }}>{connected ? '● live' : '○ connecting'}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['chat', 'memory', 'runs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === t ? '#5B7FE8' : 'rgba(255,255,255,0.06)', color: tab === t ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: 11, fontFamily: 'Nunito, sans-serif', transition: 'all 0.15s' }}>
              {t === 'chat' ? `💬 Chat${conversations.length ? ` (${conversations.length})` : ''}` : t === 'memory' ? '🧠 Memory' : '⚡ Runs'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 210, background: '#13101f', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {/* Category filter */}
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <button onClick={() => setCatFilter('all')} style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: catFilter === 'all' ? '#5B7FE8' : 'rgba(255,255,255,0.07)', color: catFilter === 'all' ? 'white' : 'rgba(255,255,255,0.4)' }}>ALL</button>
            {CATS.map(([id, cat]) => (
              <button key={id} onClick={() => setCatFilter(id)} style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5, border: 'none', cursor: 'pointer', background: catFilter === id ? cat.color : 'rgba(255,255,255,0.07)', color: catFilter === id ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Agent list — clickable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredAgents.map(agent => {
              const active  = activeIds.has(agent.id)
              const isOpen  = selectedAgent?.id === agent.id
              return (
                <div
                  key={agent.id}
                  className="agent-row"
                  onClick={() => setSelectedAgent(isOpen ? null : agent)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', margin: '1px 4px', borderRadius: 8, background: isOpen ? agent.color + '20' : 'transparent', border: isOpen ? `1px solid ${agent.color}40` : '1px solid transparent', transition: 'all 0.15s' }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: agent.color + '22', border: `1px solid ${agent.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{agent.icon}</div>
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: active ? '#4CAF6A' : '#2a2a3a', border: '1.5px solid #13101f', animation: active ? 'pulse 2.5s infinite' : 'none' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: isOpen ? 'white' : active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                    <div style={{ fontSize: 8, color: isOpen ? agent.color : active ? agent.color + 'cc' : 'rgba(255,255,255,0.2)' }}>{active ? 'active' : agent.trigger}</div>
                  </div>
                  {isOpen && <div style={{ fontSize: 9, color: agent.color }}>→</div>}
                </div>
              )
            })}
          </div>

          {/* Broadcast task input */}
          <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 5, letterSpacing: '0.5px' }}>BROADCAST TO ALL</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTask()}
                placeholder="Dispatch a task..."
                style={{ flex: 1, background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px 8px', color: 'white', fontSize: 10, outline: 'none', fontFamily: 'Nunito, sans-serif' }}
              />
              <button onClick={sendTask} disabled={sending || !taskInput.trim()} style={{ background: sending || !taskInput.trim() ? 'rgba(255,255,255,0.06)' : '#5B7FE8', border: 'none', borderRadius: 7, padding: '6px 9px', color: 'white', fontWeight: 900, fontSize: 11, cursor: sending || !taskInput.trim() ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif', transition: 'background 0.15s' }}>
                {sending ? '…' : '→'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main pane ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* ════ DM PANEL — agent selected ════ */}
          {tab === 'chat' && selectedAgent && (
            <>
              {/* DM header */}
              <div style={{ padding: '10px 16px', background: '#16132a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={() => setSelectedAgent(null)} style={{ background: 'var(--app-surface-soft)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>← Back</button>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: selectedAgent.color + '25', border: `1.5px solid ${selectedAgent.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{selectedAgent.icon}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: 'white' }}>{selectedAgent.name}</div>
                  <div style={{ fontSize: 10, color: selectedAgent.color }}>{selectedAgent.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)', padding: '3px 8px', borderRadius: 6 }}>{selectedAgent.trigger}</div>
              </div>

              {/* DM messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dmMsgs.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.15)', animation: 'fadeIn 0.4s ease' }}>
                    <div style={{ fontSize: 48, marginBottom: 10 }}>{selectedAgent.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Start a conversation with {selectedAgent.name}</div>
                    <div style={{ fontSize: 12, marginTop: 6, color: 'rgba(255,255,255,0.1)' }}>Ask anything — they'll respond shortly</div>
                  </div>
                ) : dmMsgs.map((msg, i) => {
                  const isMe = msg.fromAgentId === 'commander'
                  const prev = dmMsgs[i - 1]
                  const grouped = prev && sameGroup(prev, msg)
                  const color = isMe ? '#5B7FE8' : selectedAgent.color

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginTop: grouped ? 2 : 10, animation: 'slideUp 0.2s ease' }}>
                      {/* Avatar */}
                      <div style={{ width: 32, flexShrink: 0 }}>
                        {!grouped && (
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '25', border: `1.5px solid ${color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMe ? 16 : 17 }}>
                            {isMe ? '🧑‍💻' : selectedAgent.icon}
                          </div>
                        )}
                      </div>
                      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {!grouped && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            <span style={{ fontWeight: 900, fontSize: 12, color }}>{isMe ? 'You' : selectedAgent.name}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(msg.createdAt)}</span>
                          </div>
                        )}
                        <div
                          className="msg-bubble"
                          style={{
                            background: isMe ? '#5B7FE8' : color + '18',
                            border: isMe ? 'none' : `1px solid ${color}30`,
                            borderRadius: isMe
                              ? grouped ? '12px 4px 12px 12px' : '12px 4px 12px 12px'
                              : grouped ? '4px 12px 12px 12px' : '4px 12px 12px 12px',
                            padding: '8px 12px',
                            color: isMe ? 'white' : 'rgba(255,255,255,0.88)',
                            fontSize: 13, lineHeight: 1.55,
                            wordBreak: 'break-word',
                            transition: 'filter 0.15s',
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {waitingReply && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: selectedAgent.color + '25', border: `1.5px solid ${selectedAgent.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{selectedAgent.icon}</div>
                    <div style={{ background: selectedAgent.color + '18', border: `1px solid ${selectedAgent.color}30`, borderRadius: '4px 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: selectedAgent.color, opacity: 0.7, animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={dmEndRef} />
              </div>

              {/* DM input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#13101f', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)', border: `1px solid ${selectedAgent.color}30`, borderRadius: 12, padding: '4px 4px 4px 12px', transition: 'border-color 0.2s' }}>
                  <span style={{ fontSize: 15 }}>🧑‍💻</span>
                  <input
                    value={dmInput}
                    onChange={e => setDmInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendDM()}
                    placeholder={`Ask ${selectedAgent.name} anything...`}
                    disabled={dmSending}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 13, fontFamily: 'Nunito, sans-serif', padding: '7px 0' }}
                  />
                  <button
                    onClick={sendDM}
                    disabled={dmSending || !dmInput.trim()}
                    style={{ background: dmSending || !dmInput.trim() ? 'rgba(255,255,255,0.07)' : selectedAgent.color, border: 'none', borderRadius: 9, padding: '7px 14px', color: 'white', fontWeight: 900, fontSize: 12, cursor: dmSending || !dmInput.trim() ? 'default' : 'pointer', transition: 'background 0.15s', fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}
                  >
                    {dmSending ? '…' : 'Send →'}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 5, paddingLeft: 2 }}>
                  {waitingReply ? `${selectedAgent.name} is thinking...` : `${selectedAgent.name} responds via GitHub Actions · usually under 2 min`}
                </div>
              </div>
            </>
          )}

          {/* ════ GROUP CHAT — no agent selected ════ */}
          {tab === 'chat' && !selectedAgent && (
            <>
              <div style={{ padding: '8px 16px', background: '#13101f', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                💬 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>#agent-room</strong> — all agents · click any agent on the left to DM them
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {conversations.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.12)' }}>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>Agents are waking up...</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Messages appear here once agents start working</div>
                  </div>
                ) : conversations.map((msg, i) => {
                  const prev      = conversations[i - 1]
                  const grouped   = prev && sameGroup(prev, msg)
                  const isMe      = msg.fromAgentId === 'commander'
                  const isDM      = msg.toAgentId !== 'all' && msg.toAgentId !== 'commander'
                  const isAlert   = msg.msgType === 'alert'
                  const isHandoff = msg.msgType === 'handoff'
                  const color     = isMe ? '#5B7FE8' : (msg.fromColor || '#5B7FE8')

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, marginTop: grouped ? 2 : 12, animation: 'slideUp 0.2s ease' }}>
                      <div style={{ width: 36, flexShrink: 0, paddingTop: 1 }}>
                        {!grouped ? (
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '25', border: `1.5px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMe ? 17 : 19 }}>
                            {isMe ? '🧑‍💻' : msg.fromIcon}
                          </div>
                        ) : <div />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {!grouped && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            <span style={{ fontWeight: 900, fontSize: 13, color }}>{isMe ? 'You' : msg.fromName}</span>
                            {isDM && !isMe && (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                → <span style={{ color: 'rgba(255,255,255,0.5)' }}>@{msg.toName}</span>
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(msg.createdAt)}</span>
                            {isAlert   && <span style={{ fontSize: 9, fontWeight: 900, color: '#E05252', background: '#E0525220', padding: '1px 5px', borderRadius: 4 }}>🚨 alert</span>}
                            {isHandoff && <span style={{ fontSize: 9, fontWeight: 900, color: '#F5B731', background: '#F5B73120', padding: '1px 5px', borderRadius: 4 }}>🤝 handoff</span>}
                          </div>
                        )}
                        <div
                          className="msg-bubble"
                          style={{
                            display: 'inline-block', maxWidth: '80%',
                            background: isMe ? '#5B7FE8' : isAlert ? 'rgba(255,69,58,0.1)' : isHandoff ? 'rgba(255,214,10,0.07)' : isDM ? color + '14' : 'rgba(255,255,255,0.05)',
                            border: isMe ? 'none' : isAlert ? '1px solid rgba(255,69,58,0.25)' : isHandoff ? '1px solid rgba(255,214,10,0.18)' : `1px solid ${color}20`,
                            borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                            padding: '7px 12px',
                            color: isMe ? 'white' : 'rgba(255,255,255,0.88)',
                            fontSize: 13, lineHeight: 1.55,
                            wordBreak: 'break-word',
                            transition: 'filter 0.15s',
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
            </>
          )}

          {/* MEMORY TAB */}
          {tab === 'memory' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memories.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: 48 }}>🧠</div>
                  <div style={{ fontWeight: 800, marginTop: 12 }}>No memories yet</div>
                </div>
              ) : memories.map(m => (
                <div key={m.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${m.agentColor || '#5B7FE8'}20`, borderLeft: `3px solid ${m.agentColor || '#5B7FE8'}`, borderRadius: '0 10px 10px 0', animation: 'slideUp 0.2s ease' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{m.agentIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: m.agentColor || '#5B7FE8', fontWeight: 800, fontSize: 12 }}>{m.agentName}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'var(--app-surface-soft)', padding: '1px 5px', borderRadius: 4 }}>{m.type}</span>
                      {m.importance >= 3 && <span style={{ fontSize: 9, color: '#E05252', fontWeight: 900 }}>🔴 critical</span>}
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
                <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: 48 }}>⚡</div>
                  <div style={{ fontWeight: 800, marginTop: 12 }}>No workflow runs</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Set GITHUB_TOKEN in Railway to see runs</div>
                </div>
              ) : runs.map(run => {
                const color = run.status === 'in_progress' ? '#F5B731' : run.conclusion === 'success' ? '#4CAF6A' : run.conclusion === 'failure' ? '#E05252' : '#636366'
                const label = run.status === 'in_progress' ? 'Running' : run.conclusion === 'success' ? 'Success' : run.conclusion === 'failure' ? 'Failed' : 'Idle'
                return (
                  <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s' }}>
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
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1c1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 20px', color: 'white', fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', animation: 'slideUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
