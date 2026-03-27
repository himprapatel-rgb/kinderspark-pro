'use client'
import { useMemo } from 'react'

// ─── Types ──────────────────────────────────────────────────────────
interface SkillPoint {
  label: string
  emoji: string
  value: number   // 0-100
  color: string
}

interface WeeklyPoint {
  label: string   // e.g. "Mon", "Mar 20"
  accuracy: number
  sessions: number
  stars: number
}

interface ProgressChartsProps {
  skills: SkillPoint[]
  weekly: WeeklyPoint[]
  totalStars: number
  totalSessions: number
  avgAccuracy: number
  bestLevel: number
  badges?: { name: string; emoji: string; earnedAt: string }[]
}

// ─── SVG Radar Chart ────────────────────────────────────────────────
function RadarChart({ skills, size = 240 }: { skills: SkillPoint[]; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 32
  const n = skills.length
  if (n < 3) return null

  const angleStep = (2 * Math.PI) / n

  // Grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Compute polygon points for the data
  const dataPoints = skills.map((s, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (s.value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => {
              const angle = i * angleStep - Math.PI / 2
              const rad = r * maxR
              return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`
            }).join(' ')}
            fill="none"
            stroke="rgba(120,120,140,0.12)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(120,120,140,0.1)"
              strokeWidth={1}
            />
          )
        })}

        {/* Data polygon - fill */}
        <path d={polygonPath} fill="rgba(94,92,230,0.15)" stroke="rgba(94,92,230,0.6)" strokeWidth={2} />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={skills[i].color} stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* Labels */}
        {skills.map((s, i) => {
          const angle = i * angleStep - Math.PI / 2
          const labelR = maxR + 20
          const lx = cx + labelR * Math.cos(angle)
          const ly = cy + labelR * Math.sin(angle)
          return (
            <text
              key={i}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={800}
              fill="var(--app-text, #333)"
            >
              {s.emoji}
            </text>
          )
        })}
      </svg>

      {/* Legend below */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {skills.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[10px] font-bold app-muted">{s.label} {s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SVG Line/Area Chart ────────────────────────────────────────────
function WeeklyChart({ data, size = { w: 320, h: 160 } }: { data: WeeklyPoint[]; size?: { w: number; h: number } }) {
  const { w, h } = size
  const padL = 30, padR = 10, padT = 15, padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-2xl p-6" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', height: h }}>
        <span className="text-xs font-bold app-muted">Need at least 2 days of data for chart</span>
      </div>
    )
  }

  const maxAcc = 100
  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.accuracy / maxAcc) * chartH,
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`

  // Star bar heights (normalized to chart)
  const maxStars = Math.max(...data.map((d) => d.stars), 1)

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padT + chartH - (v / maxAcc) * chartH
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(120,120,140,0.1)" strokeWidth={1} />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(120,120,140,0.5)">{v}</text>
          </g>
        )
      })}

      {/* Star bars (background) */}
      {points.map((p, i) => {
        const barH = (data[i].stars / maxStars) * chartH * 0.6
        const barW = Math.max(chartW / data.length * 0.5, 6)
        return (
          <rect
            key={`bar-${i}`}
            x={p.x - barW / 2}
            y={padT + chartH - barH}
            width={barW}
            height={barH}
            rx={3}
            fill="rgba(245,183,49,0.15)"
          />
        )
      })}

      {/* Accuracy area */}
      <path d={areaPath} fill="rgba(94,92,230,0.08)" />

      {/* Accuracy line */}
      <path d={linePath} fill="none" stroke="#5E5CE6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#5E5CE6" stroke="#fff" strokeWidth={2} />
          {/* Star count on top of bar */}
          {data[i].stars > 0 && (
            <text x={p.x} y={padT + chartH + 4} textAnchor="middle" fontSize={8} fontWeight={700} fill="rgba(245,183,49,0.7)">⭐{data[i].stars}</text>
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text key={`lbl-${i}`} x={p.x} y={h - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="rgba(120,120,140,0.6)">
          {data[i].label}
        </text>
      ))}
    </svg>
  )
}

// ─── Skill Breakdown Bar ────────────────────────────────────────────
function SkillBar({ label, emoji, value, color }: SkillPoint) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-6 text-center shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[11px] font-black truncate">{label}</span>
          <span className="text-[11px] font-black" style={{ color }}>{value}%</span>
        </div>
        <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.1)' }}>
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(value, 100)}%`, background: color }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Growth Indicator ───────────────────────────────────────────────
function GrowthBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous
  const isUp = diff > 0
  const isDown = diff < 0
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <div className={`font-black text-xl ${isUp ? 'text-green-500' : isDown ? 'text-red-400' : 'app-muted'}`}>
        {isUp ? '📈' : isDown ? '📉' : '➡️'} {current}%
      </div>
      <div className="text-[10px] font-bold app-muted mt-0.5">{label}</div>
      {diff !== 0 && (
        <div className={`text-[10px] font-black mt-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{diff}% from last week
        </div>
      )}
    </div>
  )
}

// ─── Main Export ────────────────────────────────────────────────────
export default function ProgressCharts({
  skills,
  weekly,
  totalStars,
  totalSessions,
  avgAccuracy,
  bestLevel,
  badges = [],
}: ProgressChartsProps) {

  // Compute growth (compare last 3 sessions vs prior 3)
  const growth = useMemo(() => {
    if (weekly.length < 4) return null
    const mid = Math.floor(weekly.length / 2)
    const recent = weekly.slice(mid)
    const older = weekly.slice(0, mid)
    const avgRecent = Math.round(recent.reduce((a, d) => a + d.accuracy, 0) / recent.length)
    const avgOlder = Math.round(older.reduce((a, d) => a + d.accuracy, 0) / older.length)
    return { current: avgRecent, previous: avgOlder }
  }, [weekly])

  return (
    <div className="space-y-4">
      {/* ── Headline Stats ─────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-yellow-400 font-black text-lg">⭐</div>
          <div className="font-black text-base">{totalStars}</div>
          <div className="text-[9px] font-bold app-muted">Stars</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-purple-400 font-black text-lg">🧠</div>
          <div className="font-black text-base">{totalSessions}</div>
          <div className="text-[9px] font-bold app-muted">Sessions</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-blue-400 font-black text-lg">🎯</div>
          <div className="font-black text-base">{avgAccuracy}%</div>
          <div className="text-[9px] font-bold app-muted">Accuracy</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="text-green-400 font-black text-lg">🏆</div>
          <div className="font-black text-base">Lv {bestLevel}</div>
          <div className="text-[9px] font-bold app-muted">Best Level</div>
        </div>
      </div>

      {/* ── Skill Radar ────────────────── */}
      {skills.length >= 3 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-sm mb-3">🎯 Skill Radar</div>
          <div className="flex justify-center">
            <RadarChart skills={skills} />
          </div>
        </div>
      )}

      {/* ── Skill Breakdown Bars ────────── */}
      {skills.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-sm mb-3">📊 Skill Breakdown</div>
          <div className="space-y-2.5">
            {skills.map((s) => <SkillBar key={s.label} {...s} />)}
          </div>
        </div>
      )}

      {/* ── Weekly Trend ───────────────── */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-black text-sm">📈 Weekly Accuracy Trend</div>
          <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(94,92,230,0.15)', color: '#5E5CE6' }}>
            Accuracy + Stars
          </span>
        </div>
        <WeeklyChart data={weekly} />
      </div>

      {/* ── Growth Indicator ──────────── */}
      {growth && (
        <div className="grid grid-cols-2 gap-3">
          <GrowthBadge current={growth.current} previous={growth.previous} label="Accuracy Growth" />
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="font-black text-xl">
              {weekly.length > 0 && weekly[weekly.length - 1].sessions > 0 ? '🔥' : '💤'}
            </div>
            <div className="font-black text-base">
              {weekly.reduce((a, d) => a + d.sessions, 0)}
            </div>
            <div className="text-[10px] font-bold app-muted">Sessions This Period</div>
          </div>
        </div>
      )}

      {/* ── Badges ────────────────────── */}
      {badges.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-sm mb-3">🏅 Earned Badges</div>
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => (
              <div key={i} className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.2)' }}>
                <span className="text-lg">{b.emoji}</span>
                <div>
                  <div className="text-[11px] font-black">{b.name}</div>
                  <div className="text-[9px] font-bold app-muted">{new Date(b.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
