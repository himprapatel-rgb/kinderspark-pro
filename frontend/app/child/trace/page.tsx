'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { updateStudent } from '@/lib/api'
import { speak } from '@/lib/speech'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function TracePage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user

  const [currentLetter, setCurrentLetter] = useState('A')
  const [drawing, setDrawing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [awarded, setAwarded] = useState(false)
  const [drawCount, setDrawCount] = useState(0)

  useEffect(() => {
    if (!student) { router.push('/'); return }
    drawLetterGuide(currentLetter)
  }, [currentLetter, student])

  const drawLetterGuide = (letter: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#FFF9EE'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw faint letter guide
    ctx.font = 'bold 220px Nunito'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(94, 92, 230, 0.15)'
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2)

    // Draw dashed border guide
    ctx.setLineDash([10, 5])
    ctx.strokeStyle = 'rgba(94, 92, 230, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)
    ctx.setLineDash([])

    setProgress(0)
    setDrawCount(0)
    setAwarded(false)
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#5B7FE8'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    setDrawCount(c => {
      const newCount = c + 1
      const newProgress = Math.min(100, Math.round((newCount / 200) * 100))
      setProgress(newProgress)

      if (newProgress >= 100 && !completed.has(currentLetter)) {
        handleComplete()
      }
      return newCount
    })
  }

  const handleComplete = async () => {
    if (completed.has(currentLetter) || awarded) return
    setAwarded(true)
    setCompleted(prev => { const s = new Set(Array.from(prev)); s.add(currentLetter); return s })
    speak(`Great job! You traced the letter ${currentLetter}!`)

    if (student) {
      try {
        await updateStudent(student.id, { stars: (student.stars || 0) + 3 })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const clearCanvas = () => {
    drawLetterGuide(currentLetter)
  }

  const nextLetter = () => {
    const idx = LETTERS.indexOf(currentLetter)
    if (idx < LETTERS.length - 1) {
      const next = LETTERS[idx + 1]
      setCurrentLetter(next)
      speak(next)
    }
  }

  const endDraw = () => setDrawing(false)

  return (
    <div className="min-h-screen flex flex-col app-page app-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => router.push('/child')} className="app-muted font-bold app-pressable">← Back</button>
        <div className="app-title">✍️ Trace Letters</div>
        <div className="app-muted text-sm font-bold">{completed.size}/26</div>
      </div>

      {/* Letter selector */}
      <div className="overflow-x-auto px-3 pb-3">
        <div className="flex gap-2 w-max">
          {LETTERS.map(l => (
            <button className="app-pressable" key={l}
              onClick={() => { setCurrentLetter(l); speak(l) }}
              className="w-10 h-10 rounded-xl font-black text-sm flex-shrink-0 transition-all active:scale-90"
              style={{
                background: currentLetter === l ? '#5B7FE8' : completed.has(l) ? '#4CAF6A40' : 'var(--app-surface)',
                color: currentLetter === l ? 'white' : completed.has(l) ? '#4CAF6A' : 'rgba(70,75,96,0.75)',
                border: currentLetter === l ? '2px solid #5B7FE8' : '1px solid var(--app-border)',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-3">
        <div className="flex justify-between text-xs font-bold app-muted mb-1">
          <span>Tracing {currentLetter}</span>
          <span>{progress}%</span>
        </div>
        <div className="rounded-full h-3" style={{ background: 'rgba(120,120,140,0.18)' }}>
          <div className="h-3 rounded-full transition-all"
            style={{ width: `${progress}%`, background: progress >= 100 ? '#4CAF6A' : '#5B7FE8' }} />
        </div>
        {progress >= 100 && (
          <div className="text-green-400 text-xs font-black text-center mt-1">+3 ⭐ Earned!</div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 px-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={370}
          height={320}
          className="rounded-2xl w-full touch-none"
          style={{ maxHeight: '50vh', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Bottom controls */}
      <div className="p-4 flex gap-3">
        <button onClick={clearCanvas}
          className="flex-1 py-3 rounded-2xl font-black text-white app-pressable"
          style={{ background: '#E0525240', border: '1px solid #E0525280' }}>
          Clear
        </button>
        <button onClick={nextLetter} disabled={LETTERS.indexOf(currentLetter) === LETTERS.length - 1}
          className="flex-1 py-3 rounded-2xl font-black text-white disabled:opacity-40 app-pressable"
          style={{ background: '#5B7FE8' }}>
          Next Letter →
        </button>
      </div>
    </div>
  )
}
