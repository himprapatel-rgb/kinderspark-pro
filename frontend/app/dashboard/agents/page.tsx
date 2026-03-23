'use client'
import { useState, useEffect, useCallback } from 'react'

const AGENTS = [
  {
    id: 'health',
    name: 'Health Monitor',
    icon: '🔍',
    color: '#30D158',
    role: 'Checks backend + frontend every 15 min',
    workflow: 'health-monitor.yml',
    trigger: 'schedule',
  },
  {
    id: 'claude-agent',
    name: 'Auto-Dev Agent',
    icon: '🤖',
    color: '#5E5CE6',
    role: 'Fixes issues & implements features on demand',
    workflow: 'claude-agent.yml',
    trigger: 'issues / comments',
  },
  {
    id: 'frontend',
    name: 'Frontend Designer',
    icon: '🎨',
    color: '#BF5AF2',
    role: 'UI/UX design, React components, animations',
    workflow: 'agent-frontend.yml',
    trigger: 'label: frontend, design, ui',
  },
  {
    id: 'backend',
    name: 'Backend Engineer',
    icon: '⚙️',
    color: '#FF9F0A',
    role: 'API routes, auth, security, performance',
    workflow: 'agent-backend.yml',
    trigger: 'label: backend, api, critical',
  },
  {
    id: 'database',
    name: 'Database Agent',
    icon: '🗄️',
    color: '#FFD60A',
    role: 'Schema design, migrations, query optimization',
    workflow: 'agent-database.yml',
    trigger: 'label: database, schema, migration',
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    icon: '📣',
    color: '#FF2D55',
    role: 'Growth, copy, onboarding, feature announcements',
    workflow: 'agent-marketing.yml',
    trigger: 'Every Monday + label: marketing',
  },
  {
    id: 'localization',
    name: 'Localization Agent',
    icon: '🌍',
    color: '#32ADE6',
    role: 'i18n, cultural themes, holidays, regional content',
    workflow: 'agent-localization.yml',
    trigger: '1st of month + label: i18n',
  },
  {
    id: 'weekly',
    name: 'Weekly Improvement',
    icon: '🔁',
    color: '#64D2FF',
    role: 'Full codebase review & auto-improvement every Sunday',
    workflow: 'weekly-improvement.yml',
    trigger: 'Every Sunday 02:00 UTC',
  },
]

const REPO = 'himprapatel-rgb/kinderspark-pro'
const GH_API = `https://api.github.com/repos/${REPO}`

interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  created_at: string
  html_url: string
}

interface GHIssue {
  number: number
  title: string
  labels: { name: string }[]
  created_at: string
  html_url: string
  state: string
}

export default function AgentDashboardPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [issues, setIssues] = useState<GHIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [ghToken] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('gh_token') || '' : ''
  )
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenPrompt, setShowTokenPrompt] = useState(false)

  const fetchData = useCallback(async (token: string) => {
    if (!token) { setShowTokenPrompt(true); setLoading(false); return }
    const headers = { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    try {
      const [runsRes, issuesRes] = await Promise.all([
        fetch(`${GH_API}/actions/runs?per_page=30`, { headers }),
        fetch(`${GH_API}/issues?state=all&per_page=20&labels=agent-auto,critical,weekly-report`, { headers }),
      ])
      if (runsRes.ok) setRuns((await runsRes.json()).workflow_runs || [])
      if (issuesRes.ok) setIssues(await issuesRes.json())
      setLastRefresh(new Date())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('gh_token') || ''
    fetchData(token)
    const interval = setInterval(() => fetchData(token), 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const saveToken = () => {
    localStorage.setItem('gh_token', tokenInput)
    setShowTokenPrompt(false)
    fetchData(tokenInput)
  }

  const getAgentRun = (workflow: string) =>
    runs.find(r => r.name && workflow && r.name.toLowerCase().includes(
      workflow.replace('.yml', '').replace(/-/g, ' ').toLowerCase().split(' ')[0]
    ))

  const getStatusColor = (run?: WorkflowRun) => {
    if (!run) return '#444'
    if (run.status === 'in_progress') return '#FFD60A'
    if (run.conclusion === 'success') return '#30D158'
    if (run.conclusion === 'failure') return '#FF453A'
    return '#8E8E93'
  }

  const getStatusLabel = (run?: WorkflowRun) => {
    if (!run) return 'No runs yet'
    if (run.status === 'in_progress') return '⚡ Running'
    if (run.conclusion === 'success') return '✅ Passed'
    if (run.conclusion === 'failure') return '❌ Failed'
    return '⏸ ' + run.status
  }

  return (
    <div
      className="min-h-screen pb-10"
      style={{ background: 'linear-gradient(180deg, #0d0518 0%, #0a0a1a 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      {/* Header */}
      <div
        className="px-6 pt-12 pb-8"
        style={{ background: 'linear-gradient(135deg, #1a0a2e, #0a1a2e)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)', boxShadow: '0 8px 32px rgba(94,92,230,0.4)' }}
            >
              🤖
            </div>
            <div>
              <h1 className="text-white text-3xl font-black">Agent Control Room</h1>
              <p className="text-white/40 text-sm font-bold">KinderSpark Pro · Autonomous AI Workforce</p>
            </div>
            <button
              onClick={() => fetchData(localStorage.getItem('gh_token') || '')}
              className="ml-auto text-white/40 hover:text-white/70 text-sm font-bold transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          <p className="text-white/30 text-xs font-bold mt-3">
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">

        {/* Token Prompt */}
        {showTokenPrompt && (
          <div
            className="rounded-3xl p-5"
            style={{ background: 'rgba(255,215,10,0.08)', border: '1px solid rgba(255,215,10,0.2)' }}
          >
            <p className="text-yellow-300 font-black mb-1">🔑 GitHub Token Required</p>
            <p className="text-white/50 text-sm mb-3">Enter a GitHub PAT (read:repo, read:actions) to see live agent status.</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 rounded-2xl px-4 py-2 text-sm font-bold bg-white/10 text-white border border-white/20 outline-none"
              />
              <button
                onClick={saveToken}
                className="px-5 py-2 rounded-2xl font-black text-sm text-white"
                style={{ background: '#FFD60A', color: '#000' }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Agent Grid */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">Active Agents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AGENTS.map(agent => {
              const run = getAgentRun(agent.workflow)
              const statusColor = getStatusColor(run)
              const statusLabel = getStatusLabel(run)
              const isRunning = run?.status === 'in_progress'
              return (
                <div
                  key={agent.id}
                  className="rounded-3xl p-4"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}04)`,
                    border: `1px solid ${agent.color}22`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: agent.color + '20', border: `1.5px solid ${agent.color}40` }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-black text-sm">{agent.name}</p>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: statusColor + '22', color: statusColor }}
                        >
                          {isRunning ? '⚡ LIVE' : statusLabel}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs font-bold mb-1">{agent.role}</p>
                      <p className="text-white/25 text-[10px] font-bold">Trigger: {agent.trigger}</p>
                    </div>
                  </div>
                  {run && (
                    <a
                      href={run.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-[10px] font-bold block truncate"
                      style={{ color: agent.color + '99' }}
                    >
                      Last run: {new Date(run.created_at).toLocaleString()} →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Agent Activity (Issues) */}
        {issues.length > 0 && (
          <div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">Agent Activity Feed</p>
            <div className="space-y-2">
              {issues.map(issue => {
                const isOpen = issue.state === 'open'
                const isCritical = issue.labels.some(l => l.name === 'critical')
                return (
                  <a
                    key={issue.number}
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all hover:scale-[1.01]"
                    style={{
                      background: isCritical ? 'rgba(255,69,58,0.08)' : 'rgba(255,255,255,0.04)',
                      border: isCritical ? '1px solid rgba(255,69,58,0.25)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span className="text-lg flex-shrink-0">{isCritical ? '🚨' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-black truncate">{issue.title}</p>
                      <p className="text-white/30 text-[10px] font-bold">
                        #{issue.number} · {new Date(issue.created_at).toLocaleDateString()}
                        {issue.labels.map(l => ` · ${l.name}`)}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-black px-2 py-1 rounded-full flex-shrink-0"
                      style={{
                        background: isOpen ? 'rgba(48,209,88,0.15)' : 'rgba(142,142,147,0.15)',
                        color: isOpen ? '#30D158' : '#8E8E93',
                      }}
                    >
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* How to trigger agents */}
        <div
          className="rounded-3xl p-5"
          style={{ background: 'rgba(94,92,230,0.06)', border: '1px solid rgba(94,92,230,0.15)' }}
        >
          <p className="text-white font-black mb-3">💬 How to Talk to the Agents</p>
          <div className="space-y-2 text-sm">
            {[
              { cmd: 'Label issue "frontend"', desc: '→ Frontend Designer Agent handles it' },
              { cmd: 'Label issue "backend"', desc: '→ Backend Engineer Agent handles it' },
              { cmd: 'Label issue "database"', desc: '→ Database Agent handles it' },
              { cmd: 'Label issue "marketing"', desc: '→ Marketing Agent handles it' },
              { cmd: 'Label issue "i18n"', desc: '→ Localization Agent handles it' },
              { cmd: 'Comment "/claude fix this"', desc: '→ Auto-Dev Agent reads & fixes' },
              { cmd: 'Label issue "claude-build"', desc: '→ Auto-Dev Agent implements feature' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <code className="text-yellow-300 font-bold text-xs bg-white/05 px-2 py-1 rounded-lg flex-shrink-0">
                  {item.cmd}
                </code>
                <span className="text-white/40 text-xs font-bold my-auto">{item.desc}</span>
              </div>
            ))}
          </div>
          <a
            href={`https://github.com/${REPO}/issues/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block px-4 py-2 rounded-2xl text-xs font-black text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)', boxShadow: '0 4px 16px rgba(94,92,230,0.35)' }}
          >
            + Create New Issue →
          </a>
        </div>
      </div>
    </div>
  )
}
