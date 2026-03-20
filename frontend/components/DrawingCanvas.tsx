'use client'
import { useRef, useEffect, useState, useCallback } from 'react'

const COLORS = [
  '#FF6B6B', '#FF9F0A', '#FFD60A', '#30D158',
  '#5AC8FA', '#5E5CE6', '#BF5AF2', '#FF375F',
  '#1c1c1e', '#ffffff', '#43C6AC', '#FA709A',
]

interface DrawingCanvasProps {
  onSave?: (dataUrl: string) => void
}

export default function DrawingCanvas({ onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState('#FF6B6B')
  const [brushSize, setBrushSize] = useState(12)
  const [isEraser, setIsEraser] = useState(false)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'clientX' in e ? e.clientX : (e as Touch).clientX
    const clientY = 'clientY' in e ? e.clientY : (e as Touch).clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const draw = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = isEraser ? '#1a0a2e' : color
    ctx.lineWidth = isEraser ? brushSize * 2 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }, [color, brushSize, isEraser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill dark background
    ctx.fillStyle = '#1a0a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const pos = e instanceof MouseEvent
        ? getPos(e, canvas)
        : getPos(e.touches[0], canvas)
      lastPos.current = pos
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!drawing.current || !lastPos.current) return
      const pos = e instanceof MouseEvent
        ? getPos(e, canvas)
        : getPos(e.touches[0], canvas)
      draw(lastPos.current, pos)
      lastPos.current = pos
    }

    const onEnd = () => {
      drawing.current = false
      lastPos.current = null
    }

    canvas.addEventListener('mousedown', onStart)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('mouseleave', onEnd)
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd)

    return () => {
      canvas.removeEventListener('mousedown', onStart)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onEnd)
      canvas.removeEventListener('mouseleave', onEnd)
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
    }
  }, [draw])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1a0a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    if (onSave) onSave(dataUrl)
    // Also trigger download
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'kinderspark-drawing.png'
    a.click()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={380}
        className="w-full rounded-2xl touch-none"
        style={{ background: '#1a0a2e', cursor: isEraser ? 'cell' : 'crosshair' }}
      />

      {/* Color Palette */}
      <div className="flex flex-wrap gap-2 justify-center">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setIsEraser(false) }}
            className="rounded-full transition-all active:scale-90"
            style={{
              width: 32,
              height: 32,
              background: c,
              border: color === c && !isEraser ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
              boxShadow: color === c && !isEraser ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
            }}
          />
        ))}
        {/* Eraser */}
        <button
          onClick={() => setIsEraser((e) => !e)}
          className="rounded-full transition-all active:scale-90 font-bold text-xs"
          style={{
            width: 32,
            height: 32,
            background: isEraser ? '#5E5CE6' : 'rgba(255,255,255,0.15)',
            border: isEraser ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
            color: 'white',
          }}
        >
          🧹
        </button>
      </div>

      {/* Brush Size */}
      <div className="flex items-center gap-3 px-2">
        <span className="text-white/60 text-xs font-bold w-16">Size: {brushSize}</span>
        <input
          type="range"
          min={4}
          max={40}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 accent-purple-500"
        />
        <div
          className="rounded-full bg-white"
          style={{ width: Math.max(4, brushSize / 2), height: Math.max(4, brushSize / 2) }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleClear}
          className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
          style={{ background: 'rgba(255,69,58,0.3)', border: '1px solid rgba(255,69,58,0.5)' }}
        >
          🗑️ Clear
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' }}
        >
          💾 Save
        </button>
      </div>
    </div>
  )
}
