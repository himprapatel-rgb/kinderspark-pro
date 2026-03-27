'use client'
import { useEffect, useState, useCallback } from 'react'

// ── Confetti Celebration System ─────────────────────────────────────────────
// Canvas-based confetti for smooth 60fps particle animation.
// Usage: <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
  duration?: number       // ms, default 3000
  particleCount?: number  // default 80
  spread?: number         // default 360
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; rotation: number
  rotationSpeed: number; color: string
  shape: 'circle' | 'rect' | 'star'
  opacity: number; gravity: number
  drag: number; life: number
}

const COLORS = [
  '#F5B731', '#F5A623', '#5B7FE8', '#4CAF6A',
  '#8B6CC1', '#E05252', '#FF375F', '#0A84FF',
  '#FFD700', '#30D158', '#FF9F0A', '#BF5AF2',
]

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function createParticle(cx: number, cy: number): Particle {
  const angle = randomBetween(0, Math.PI * 2)
  const speed = randomBetween(4, 14)
  return {
    x: cx, y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - randomBetween(2, 8),
    size: randomBetween(4, 10),
    rotation: randomBetween(0, 360),
    rotationSpeed: randomBetween(-12, 12),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: (['circle', 'rect', 'star'] as const)[Math.floor(Math.random() * 3)],
    opacity: 1,
    gravity: randomBetween(0.12, 0.22),
    drag: randomBetween(0.97, 0.99),
    life: 1,
  }
}

export default function Confetti({
  trigger,
  onComplete,
  duration = 3000,
  particleCount = 80,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!trigger) return
    // Create particles from center-top
    const cx = window.innerWidth / 2
    const cy = window.innerHeight * 0.3
    const newParticles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      newParticles.push(createParticle(cx, cy))
    }
    setParticles(newParticles)
    setActive(true)

    const timer = setTimeout(() => {
      setActive(false)
      setParticles([])
      onComplete?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [trigger])

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !active) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let animationFrame: number
    let localParticles = [...particles]

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let aliveCount = 0
      localParticles.forEach(p => {
        p.vy += p.gravity
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.life -= 0.008
        p.opacity = Math.max(0, p.life)

        if (p.opacity <= 0) return
        aliveCount++

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity

        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          // star shape
          drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4)
          ctx.fill()
        }
        ctx.restore()
      })

      if (aliveCount > 0) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animate()
    return () => cancelAnimationFrame(animationFrame)
  }, [active, particles])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
    rot += step
  }
  ctx.lineTo(cx, cy - outerR)
  ctx.closePath()
}

// ── Mini confetti burst (for smaller celebrations like correct answers) ──────
export function ConfettiBurst({ trigger, x, y }: { trigger: boolean; x?: number; y?: number }) {
  const [pieces, setPieces] = useState<{ id: number; style: React.CSSProperties }[]>([])

  useEffect(() => {
    if (!trigger) return
    const newPieces = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      style: {
        position: 'fixed' as const,
        left: (x ?? window.innerWidth / 2) + 'px',
        top: (y ?? window.innerHeight / 2) + 'px',
        width: randomBetween(4, 8) + 'px',
        height: randomBetween(4, 8) + 'px',
        background: COLORS[i % COLORS.length],
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        zIndex: 100,
        pointerEvents: 'none' as const,
        animation: `confetti-burst ${randomBetween(0.6, 1.2)}s cubic-bezier(.2,1,.3,1) forwards`,
        '--cx': `${randomBetween(-80, 80)}px`,
        '--cy': `${randomBetween(-120, -20)}px`,
        '--cr': `${randomBetween(-360, 360)}deg`,
      } as React.CSSProperties,
    }))
    setPieces(newPieces)
    const t = setTimeout(() => setPieces([]), 1500)
    return () => clearTimeout(t)
  }, [trigger])

  return (
    <>
      {pieces.map(p => <div key={p.id} style={p.style} />)}
    </>
  )
}
