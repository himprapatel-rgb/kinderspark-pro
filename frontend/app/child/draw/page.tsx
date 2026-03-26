'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { updateStudent } from '@/lib/api'

const COLORS = [
  '#DC4343', '#E8753A', '#E5982A', '#2BA55E', '#34C759', '#4F6BED',
  '#0A84FF', '#7C5BBF', '#FF375F', '#A2845E', '#1C1C1E', '#FFFFFF',
]

export default function DrawPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user

  const [color, setColor] = useState('#4F6BED')
  const [size, setSize] = useState(8)
  const [drawing, setDrawing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    if (!student) { router.push('/'); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#F4F3F0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [student, router])

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
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const endDraw = () => setDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#F4F3F0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSave = async () => {
    if (!student || !hasDrawn) return
    try {
      const newStars = (student.stars || 0) + 5
      await updateStudent(student.id, { stars: newStars })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen flex flex-col app-page app-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button className="app-pressable" onClick={() => router.push('/child')} className="app-muted font-bold">← Back</button>
        <div className="app-title">🎨 Drawing Canvas</div>
        <button onClick={clearCanvas} className="text-orange-400 font-bold text-sm app-pressable">Clear</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 px-3 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={380}
          height={420}
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

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Color palette */}
        <div>
          <div className="text-xs font-bold app-muted mb-2">Color</div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button className="app-pressable" key={c} onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-all active:scale-90"
                style={{
                  background: c,
                  border: color === c ? '3px solid var(--app-accent)' : '2px solid var(--app-border)',
                  boxShadow: color === c ? '0 0 8px rgba(94,92,230,0.4)' : 'none',
                }} />
            ))}
          </div>
        </div>

        {/* Brush size */}
        <div>
          <div className="text-xs font-bold app-muted mb-2">Brush Size: {size}px</div>
          <input type="range" min={2} max={30} value={size}
            onChange={e => setSize(parseInt(e.target.value))}
            className="w-full accent-purple-500" />
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={!hasDrawn}
          className="w-full py-4 rounded-2xl font-black text-white transition-all active:scale-95 disabled:opacity-40 app-pressable"
          style={{ background: saved ? '#2BA55E' : 'linear-gradient(135deg, #4F6BED, #7C5BBF)' }}>
          {saved ? '✅ Saved! +5 ⭐' : '💾 Save Drawing (+5 ⭐)'}
        </button>
      </div>
    </div>
  )
}
