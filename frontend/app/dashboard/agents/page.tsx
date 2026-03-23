'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Agent Registry ──────────────────────────────────────────────────────────
const AGENTS = [
  // Already built
  { id: 'health-monitor',       name: 'Health Monitor',       icon: '🔍', color: '#30D158', cat: 'ops',       trigger: 'Every 15 min',    workflow: 'health-monitor.yml' },
  { id: 'claude-agent',         name: 'Auto-Dev',             icon: '🤖', color: '#5E5CE6', cat: 'dev',       trigger: 'Issues / comments', workflow: 'claude-agent.yml' },
  { id: 'agent-frontend',       name: 'Frontend Designer',    icon: '🎨', color: '#BF5AF2', cat: 'dev',       trigger: 'label: frontend', workflow: 'agent-frontend.yml' },
  { id: 'agent-backend',        name: 'Backend Engineer',     icon: '⚙️', color: '#FF9F0A', cat: 'dev',       trigger: 'label: backend',  workflow: 'agent-backend.yml' },
  { id: 'agent-database',       name: 'Database Agent',       icon: '🗄️', color: '#FFD60A', cat: 'dev',       trigger: 'label: database', workflow: 'agent-database.yml' },
  { id: 'agent-marketing',      name: 'Marketing Agent',      icon: '📣', color: '#FF2D55', cat: 'growth',    trigger: 'Every Monday',    workflow: 'agent-marketing.yml' },
  { id: 'agent-localization',   name: 'Localization Agent',   icon: '🌍', color: '#32ADE6', cat: 'content',   trigger: '1st of month',    workflow: 'agent-localization.yml' },
  { id: 'weekly-improvement',   name: 'Weekly Improvement',   icon: '🔁', color: '#64D2FF', cat: 'dev',       trigger: 'Every Sunday',    workflow: 'weekly-improvement.yml' },
  // Security
  { id: 'agent-security-auditor', name: 'Security Auditor',  icon: '🛡️', color: '#FF453A', cat: 'security',  trigger: 'Every Wednesday', workflow: 'agent-security-auditor.yml' },
  { id: 'agent-child-safety',   name: 'Child Safety Monitor', icon: '👶', color: '#FF6B35', cat: 'security',  trigger: 'Every 6 hours',   workflow: 'agent-child-safety.yml' },
  { id: 'agent-dependency-updater', name: 'Dependency Updater', icon: '📦', color: '#30D158', cat: 'security', trigger: 'Every Monday',  workflow: 'agent-dependency-updater.yml' },
  { id: 'agent-secret-scanner', name: 'Secret Scanner',       icon: '🔑', color: '#FF9F0A', cat: 'security',  trigger: 'Every push + daily', workflow: 'agent-secret-scanner.yml' },
  { id: 'agent-gdpr',          name: 'GDPR Compliance',       icon: '📋', color: '#5AC8FA', cat: 'security',  trigger: '1st of month',    workflow: 'agent-gdpr.yml' },
  // Quality
  { id: 'agent-pr-reviewer',   name: 'PR Code Reviewer',      icon: '👁️', color: '#BF5AF2', cat: 'quality',   trigger: 'Every PR',        workflow: 'agent-pr-reviewer.yml' },
  { id: 'agent-test-generator', name: 'Test Generator',       icon: '🧪', color: '#5E5CE6', cat: 'quality',   trigger: 'Push to main',    workflow: 'agent-test-generator.yml' },
  { id: 'agent-performance-auditor', name: 'Performance Auditor', icon: '🔬', color: '#FF9F0A', cat: 'quality', trigger: 'Every Sunday', workflow: 'agent-performance-auditor.yml' },
  { id: 'agent-accessibility',  name: 'Accessibility Auditor', icon: '📐', color: '#34C759', cat: 'quality',   trigger: 'Every Tuesday',   workflow: 'agent-accessibility.yml' },
  // Content
  { id: 'agent-curriculum-builder', name: 'Curriculum Builder', icon: '📖', color: '#FFD60A', cat: 'content', trigger: '1st of month',   workflow: 'agent-curriculum-builder.yml' },
  { id: 'agent-difficulty-calibrator', name: 'Difficulty Calibrator', icon: '🎯', color: '#FF6B35', cat: 'content', trigger: 'Every Monday', workflow: 'agent-difficulty-calibrator.yml' },
  { id: 'agent-badge-designer', name: 'Badge Designer',         icon: '🌟', color: '#FFD60A', cat: 'content',  trigger: '1st of month',    workflow: 'agent-badge-designer.yml' },
  { id: 'agent-mini-game-developer', name: 'Mini-Game Developer', icon: '🧩', color: '#BF5AF2', cat: 'content', trigger: 'label: game',  workflow: 'agent-mini-game-developer.yml' },
  { id: 'agent-seasonal-content', name: 'Seasonal Content',     icon: '📅', color: '#FF2D55', cat: 'content',  trigger: '14th of month',   workflow: 'agent-seasonal-content.yml' },
  // Analytics
  { id: 'agent-analytics-reporter', name: 'Analytics Reporter', icon: '📈', color: '#30D158', cat: 'analytics', trigger: 'Every Monday',   workflow: 'agent-analytics-reporter.yml' },
  { id: 'agent-churn-detector', name: 'Churn Detector',         icon: '📉', color: '#FF453A', cat: 'analytics', trigger: 'Every Wednesday', workflow: 'agent-churn-detector.yml' },
  { id: 'agent-trend-analyser', name: 'Trend Analyser',         icon: '🔮', color: '#5E5CE6', cat: 'analytics', trigger: '1st of month',    workflow: 'agent-trend-analyser.yml' },
  { id: 'agent-ab-testing',    name: 'A/B Testing',             icon: '🧪', color: '#FF9F0A', cat: 'analytics', trigger: 'label: ab-test',  workflow: 'agent-ab-testing.yml' },
  // User Success
  { id: 'agent-parent-report', name: 'Parent Report Generator', icon: '📧', color: '#64D2FF', cat: 'success',  trigger: 'Every Sunday',    workflow: 'agent-parent-report.yml' },
  { id: 'agent-teacher-insight', name: 'Teacher Insight',       icon: '👩‍🏫', color: '#30D158', cat: 'success', trigger: 'Every Monday',    workflow: 'agent-teacher-insight.yml' },
  { id: 'agent-achievement-notifier', name: 'Achievement Notifier', icon: '🎉', color: '#FFD60A', cat: 'success', trigger: 'Every 30 min', workflow: 'agent-achievement-notifier.yml' },
  { id: 'agent-support',       name: 'Support Agent',           icon: '🆘', color: '#FF453A', cat: 'success',  trigger: 'label: support',  workflow: 'agent-support.yml' },
  { id: 'agent-onboarding-watcher', name: 'Onboarding Watcher', icon: '🧭', color: '#32ADE6', cat: 'success', trigger: 'Daily',           workflow: 'agent-onboarding-watcher.yml' },
  // Business
  { id: 'agent-seo',           name: 'SEO Agent',               icon: '🌐', color: '#5AC8FA', cat: 'growth',   trigger: '1st of month',    workflow: 'agent-seo.yml' },
  { id: 'agent-launch',        name: 'Launch Agent',            icon: '🚀', color: '#FF2D55', cat: 'growth',   trigger: 'label: launch',   workflow: 'agent-launch.yml' },
  // DevOps
  { id: 'agent-cost-monitor',  name: 'Cost Monitor',            icon: '💸', color: '#FF9F0A', cat: 'ops',      trigger: 'Every Monday',    workflow: 'agent-cost-monitor.yml' },
  { id: 'agent-backup-verifier', name: 'Backup Verifier',       icon: '💾', color: '#30D158', cat: 'ops',      trigger: 'Daily',           workflow: 'agent-backup-verifier.yml' },
  { id: 'agent-api-latency',   name: 'API Latency Monitor',     icon: '📡', color: '#64D2FF', cat: 'ops',      trigger: 'Every 30 min',    workflow: 'agent-api-latency.yml' },
  { id: 'agent-log-analyser',  name: 'Log Analyser',            icon: '📊', color: '#BF5AF2', cat: 'ops',      trigger: 'Daily',           workflow: 'agent-log-analyser.yml' },
  // Design
  { id: 'agent-theme-designer', name: 'Theme Designer',         icon: '🎨', color: '#FF2D55', cat: 'design',   trigger: '15th of month',   workflow: 'agent-theme-designer.yml' },
  { id: 'agent-pwa',           name: 'PWA Agent',               icon: '📱', color: '#5E5CE6', cat: 'design',   trigger: 'Every Sunday',    workflow: 'agent-pwa.yml' },
  { id: 'agent-colour-accessibility', name: 'Colour Accessibility', icon: '🌈', color: '#34C759', cat: 'design', trigger: 'Every Thursday', workflow: 'agent-colour-accessibility.yml' },
]

const CATEGORIES: Record<string, { label: string; color: string }> = {
  all:      { label: 'All Agents', color: '#5E5CE6' },
  dev:      { label: '⚙️ Dev', color: '#BF5AF2' },
  security: { label: '🛡️ Security', color: '#FF453A' },
  quality:  { label: '🧪 Quality', color: '#FF9F0A' },
  content:  { label: '📚 Content', color: '#FFD60A' },
  analytics:{ label: '📊 Analytics', color: '#30D158' },
  success:  { label: '👨‍👩‍👧 User Success', color: '#64D2FF' },
  growth:   { label: '📣 Growth', color: '#FF2D55' },
  ops:      { label: '🚀 DevOps', color: '#32ADE6' },
  design:   { label: '🎨 Design', color: '#FF6B35' },
}

interface AgentMessage {
  id: string
  agentName: string
  agentIcon: string
  agentColor: string
  message: string
  type: 'success' | 'failure' | 'running' | 'info' | 'alert'
  ts: number
  url?: string
}

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

export default function MissionControlPage() {
  const router = useRouter()
  const [activeCat, setActiveCat] = useState('all')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [triggerModal, setTriggerModal] = useState<typeof AGENTS[0] | null>(null)
  const [taskInput, setTaskInput] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  // Connect to SSE feed
  useEffect(() => {
    const connect = () => {
      const es = new EventSource('/api/agents/feed')
      esRef.current = es

      es.addEventListener('update', (e) => {
        const data = JSON.parse(e.data)
        setRuns(data.runs || [])
        setIssues(data.issues || [])
        setIsConnected(true)

        // Convert runs to messages
        const newMsgs: AgentMessage[] = (data.runs || []).slice(0, 15).map((run: any) => {
          const agent = AGENTS.find(a => run.name?.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]))
          const type  = statusOf(run)
          return {
            id: String(run.id),
            agentName: agent?.name || run.name || 'Agent',
            agentIcon: agent?.icon || '🤖',
            agentColor: agent?.color || '#5E5CE6',
            message: type === 'running'
              ? `Running...`
              : type === 'success'
              ? `Completed successfully`
              : type === 'failure'
              ? `Failed — needs attention`
              : `Status: ${run.conclusion || run.status}`,
            type,
            ts: new Date(run.created_at).getTime(),
            url: run.html_url,
          }
        })

        // Add issue alerts
        const issueMsgs: AgentMessage[] = (data.issues || []).slice(0, 5).map((issue: any) => ({
          id: `issue-${issue.number}`,
          agentName: 'Health Monitor',
          agentIcon: '🚨',
          agentColor: '#FF453A',
          message: issue.title,
          type: 'alert' as const,
          ts: new Date(issue.created_at).getTime(),
          url: issue.html_url,
        }))

        setMessages(prev => {
          const combined = [...newMsgs, ...issueMsgs]
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
  }, [])

  // Scroll feed to top on new message
  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [messages.length])

  const triggerAgent = async (agent: typeof AGENTS[0], task: string) => {
    setSending(true)
    try {
      await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: agent.workflow, inputs: { task } }),
      })
      setMessages(prev => [{
        id: `trigger-${Date.now()}`,
        agentName: agent.name,
        agentIcon: agent.icon,
        agentColor: agent.color,
        message: `Manually triggered: "${task.slice(0, 60)}"`,
        type: 'running',
        ts: Date.now(),
      }, ...prev])
    } catch {}
    setSending(false)
    setTriggerModal(null)
    setTaskInput('')
  }

  const sendIssue = async (title: string, labels: string[]) => {
    try {
      await fetch('/api/agents/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: `Requested from Mission Control at ${new Date().toISOString()}`, labels }),
      })
    } catch {}
  }

  const filteredAgents = AGENTS.filter(a =>
    (activeCat === 'all' || a.cat === activeCat) &&
    (filter === '' || a.name.toLowerCase().includes(filter.toLowerCase()))
  )

  const runMap = new Map(runs.map(r => [r.name, r]))
  const runningCount = runs.filter(r => r.status === 'in_progress').length
  const failedCount  = runs.filter(r => r.conclusion === 'failure').length

  return (
    <div className="min-h-screen" style={{ background: '#080614', fontFamily: 'Nunito, sans-serif', color: 'white' }}>

      {/* ── TOP HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #0d0824, #0a1228)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white/40 hover:text-white/70 text-lg">←</button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)', boxShadow: '0 4px 20px rgba(94,92,230,0.4)' }}>
              🛸
            </div>
            <div>
              <h1 className="text-white font-black text-lg leading-none">Mission Control</h1>
              <p className="text-white/40 text-xs font-bold">{AGENTS.length} Autonomous Agents · KinderSpark Pro</p>
            </div>
          </div>

          {/* Status pills */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
              style={{ background: isConnected ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                       color: isConnected ? '#30D158' : '#FF453A',
                       border: `1px solid ${isConnected ? '#30D15840' : '#FF453A40'}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? '#30D158' : '#FF453A',
                boxShadow: isConnected ? '0 0 6px #30D158' : 'none' }} />
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* ── LEFT: Agent Grid ── */}
        <div className="flex-1 min-w-0">

          {/* Category tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                style={{
                  background: activeCat === key ? cat.color + '25' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeCat === key ? cat.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  color: activeCat === key ? cat.color : 'rgba(255,255,255,0.4)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="🔍 Search agents..."
            className="w-full mb-4 px-4 py-2 rounded-xl text-sm font-bold outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          />

          {/* Agent cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredAgents.map(agent => {
              const run  = runMap.get(agent.name) || runs.find(r => r.name?.includes(agent.name.split(' ')[0]))
              const type = run ? statusOf(run) : 'info'
              const sc   = msgColor(type)
              const isRunning = type === 'running'

              return (
                <div
                  key={agent.id}
                  className="rounded-2xl p-4 transition-all hover:scale-[1.01] cursor-default"
                  style={{ background: `linear-gradient(135deg, ${agent.color}08, transparent)`, border: `1px solid ${agent.color}18` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: agent.color + '20', border: `1px solid ${agent.color}35`,
                        boxShadow: isRunning ? `0 0 12px ${agent.color}50` : 'none' }}>
                      {isRunning ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</span> : agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-black text-sm truncate">{agent.name}</p>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: sc + '20', color: sc }}>
                          {isRunning ? '⚡ LIVE' : type === 'success' ? '✅' : type === 'failure' ? '❌' : '⏸'}
                        </span>
                      </div>
                      <p className="text-white/30 text-[10px] font-bold">{agent.trigger}</p>
                    </div>
                  </div>

                  {run && (
                    <p className="text-white/25 text-[10px] font-bold truncate mb-2">
                      Last: {new Date(run.created_at).toLocaleString()}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setTriggerModal(agent); setTaskInput('') }}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all hover:opacity-90"
                      style={{ background: agent.color + '22', color: agent.color, border: `1px solid ${agent.color}35` }}
                    >
                      ▶ Run
                    </button>
                    {run?.html_url && (
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Logs →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Live Feed ── */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-4">
            {/* Quick-create issue */}
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.2)' }}>
              <p className="text-white font-black text-sm mb-2">📋 Send Task to Agent</p>
              <div className="flex gap-2 mb-2">
                {['frontend', 'backend', 'claude-build'].map(l => (
                  <button
                    key={l}
                    onClick={() => sendIssue(`Task: ${l} improvement`, [l, 'agent-auto'])}
                    className="flex-1 py-1 rounded-lg text-[10px] font-black"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                placeholder="Type a task for any agent..."
                className="w-full px-3 py-2 rounded-xl text-xs font-bold outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val) { sendIssue(val, ['claude-build', 'agent-auto']); (e.target as HTMLInputElement).value = '' }
                  }
                }}
              />
              <p className="text-white/25 text-[10px] font-bold">Press Enter to create issue → agents auto-pick up</p>
            </div>

            {/* Live message feed */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-white font-black text-sm">🔴 Agent Feed</p>
                <span className="text-white/30 text-[10px] font-bold">{messages.length} events</span>
              </div>

              <div ref={feedRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                {messages.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-4xl mb-2">🛸</p>
                    <p className="text-white/30 text-xs font-bold">Connecting to agent feed...</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={msg.id + i}
                    className="px-3 py-3 transition-all hover:bg-white/02"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5">{msg.agentIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-black truncate" style={{ color: msg.agentColor }}>
                            {msg.agentName}
                          </span>
                          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: msgColor(msg.type) }} />
                        </div>
                        <p className="text-white/60 text-[11px] font-bold leading-tight">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/25 text-[10px] font-bold">
                            {new Date(msg.ts).toLocaleTimeString()}
                          </span>
                          {msg.url && (
                            <a href={msg.url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] font-bold" style={{ color: msg.agentColor + '80' }}>
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open issues */}
            {issues.length > 0 && (
              <div className="rounded-2xl mt-4 overflow-hidden"
                style={{ border: '1px solid rgba(255,69,58,0.2)', background: 'rgba(255,69,58,0.05)' }}>
                <div className="px-4 py-2 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(255,69,58,0.1)' }}>
                  <p className="text-red-400 font-black text-xs">🚨 Open Alerts</p>
                  <span className="text-red-400/60 text-[10px] font-bold">{issues.length}</span>
                </div>
                {issues.slice(0, 5).map(issue => (
                  <a key={issue.number} href={issue.html_url} target="_blank" rel="noopener noreferrer"
                    className="block px-3 py-2 hover:bg-white/03 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-white/70 text-[11px] font-bold truncate">#{issue.number} {issue.title}</p>
                    <p className="text-white/25 text-[10px] font-bold">{new Date(issue.created_at).toLocaleDateString()}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TRIGGER MODAL ── */}
      {triggerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) setTriggerModal(null) }}
        >
          <div className="w-full max-w-md rounded-3xl p-6"
            style={{ background: '#0f0a1e', border: `1px solid ${triggerModal.color}30` }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: triggerModal.color + '20', border: `1px solid ${triggerModal.color}40` }}>
                {triggerModal.icon}
              </div>
              <div>
                <p className="text-white font-black">Run {triggerModal.name}</p>
                <p className="text-white/40 text-xs font-bold">Manually trigger this agent</p>
              </div>
            </div>

            <textarea
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              placeholder={`What should ${triggerModal.name} do?\n\nE.g. "Fix the login page animation" or "Add a new animals word bank"`}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setTriggerModal(null)}
                className="flex-1 py-3 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => triggerAgent(triggerModal, taskInput || 'Run standard check')}
                disabled={sending}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: `linear-gradient(135deg, ${triggerModal.color}, ${triggerModal.color}cc)`,
                  boxShadow: `0 4px 20px ${triggerModal.color}40` }}
              >
                {sending ? '⚡ Launching...' : '▶ Launch Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
