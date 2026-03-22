'use client'
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  accent?: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, accent = '#5E5CE6', children }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-[430px] animate-slide-up"
        style={{
          background: 'linear-gradient(180deg, #1e1e34 0%, #16162a 100%)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '88vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: `0 -24px 80px rgba(0,0,0,0.5), 0 -2px 0 ${accent}40`,
        }}
      >
        {/* Accent top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-full"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        {/* Drag handle */}
        <div className="flex justify-center pt-3.5 pb-1">
          <div
            className="w-12 h-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-3">
            <h3 className="text-white font-black text-lg">{title}</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all hover:bg-white/10"
              style={{ fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
