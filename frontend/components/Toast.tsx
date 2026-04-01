'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

// ── Toast Notification System ───────────────────────────────────────────────
// Usage:
//   const toast = useToast()
//   toast.success('Homework created!')
//   toast.error('Failed to save')
//   toast.info('AI is thinking...')
//   toast.warning('Are you sure?')
//   toast.confirm('Delete this?', onConfirm, onCancel?)

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ConfirmItem {
  id: string
  message: string
  onConfirm: () => void
  onCancel?: () => void
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void
  error: (msg: string, duration?: number) => void
  info: (msg: string, duration?: number) => void
  warning: (msg: string, duration?: number) => void
  confirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[useToast] Called outside <ToastProvider>. Wrap your component tree in <ToastProvider>.')
    }
    return {
      success: (msg) => console.log('[toast]', msg),
      error: (msg) => console.error('[toast]', msg),
      info: (msg) => console.info('[toast]', msg),
      warning: (msg) => console.warn('[toast]', msg),
      confirm: (_msg, _onConfirm) => console.error('[useToast] confirm() called outside <ToastProvider> — no-op'),
    }
  }
  return ctx
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'linear-gradient(135deg, #E8F8ED, #D4F0DC)',
    border: '1px solid rgba(76,175,106,0.3)',
    icon: '#4CAF6A',
    text: '#2D5F3A',
  },
  error: {
    bg: 'linear-gradient(135deg, #FDF0F0, #FCDEDE)',
    border: '1px solid rgba(224,82,82,0.3)',
    icon: '#E05252',
    text: '#8B2525',
  },
  info: {
    bg: 'linear-gradient(135deg, #E8F4FC, #D4ECFA)',
    border: '1px solid rgba(77,170,223,0.3)',
    icon: '#4DAADF',
    text: '#1E5F8A',
  },
  warning: {
    bg: 'linear-gradient(135deg, #FFF7E6, #FFEFCC)',
    border: '1px solid rgba(245,166,35,0.3)',
    icon: '#F5A623',
    text: '#8A5A0A',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirms, setConfirms] = useState<ConfirmItem[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
    confirm: (msg, onConfirm, onCancel) => {
      const id = `confirm-${Date.now()}`
      setConfirms(prev => [...prev, { id, message: msg, onConfirm, onCancel }])
    },
  }

  const handleConfirmAction = (id: string, confirmed: boolean) => {
    const item = confirms.find(c => c.id === id)
    if (item) {
      if (confirmed) item.onConfirm()
      else item.onCancel?.()
    }
    setConfirms(prev => prev.filter(c => c.id !== id))
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 380, width: '90vw' }}>
        {toasts.map((toast, i) => {
          const style = STYLES[toast.type]
          const Icon = ICONS[toast.type]
          return (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg"
              style={{
                background: style.bg,
                border: style.border,
                animation: 'toast-in 0.35s cubic-bezier(.16,1,.3,1) forwards',
                animationDelay: `${i * 50}ms`,
                opacity: 0,
              }}
            >
              <Icon size={20} color={style.icon} className="shrink-0 mt-0.5" />
              <p className="flex-1 text-sm font-bold leading-snug" style={{ color: style.text }}>
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 p-2 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                style={{ minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} color={style.text} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirm dialogs */}
      {confirms.map(c => (
        <div
          key={c.id}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'var(--app-overlay)', animation: 'fade-in 0.2s ease forwards' }}
          onClick={() => handleConfirmAction(c.id, false)}
          onKeyDown={(e) => e.key === 'Escape' && handleConfirmAction(c.id, false)}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div
            className="rounded-3xl p-6 mx-4 max-w-sm w-full shadow-xl"
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              animation: 'toast-in 0.3s cubic-bezier(.16,1,.3,1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl text-center mb-3">🤔</div>
            <p className="text-center font-bold text-base mb-5" style={{ color: 'rgb(var(--foreground-rgb))' }}>
              {c.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmAction(c.id, false)}
                className="flex-1 py-3 rounded-2xl font-black text-sm app-pressable app-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmAction(c.id, true)}
                className="flex-1 py-3 rounded-2xl font-black text-sm app-pressable text-white"
                style={{ background: 'var(--app-danger)', boxShadow: '0 4px 12px rgba(224,82,82,0.3)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ))}
    </ToastContext.Provider>
  )
}
