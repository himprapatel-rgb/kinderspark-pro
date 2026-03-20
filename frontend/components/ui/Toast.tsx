'use client'
import { useState, useCallback, useEffect, createContext, useContext } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const colors: Record<Toast['type'], string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }

  const icons: Record<Toast['type'], string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${colors[toast.type]} text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold text-sm animate-slide-up`}
          >
            <span>{icons[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

// Standalone toast component (no provider needed) for simple use
export function ToastMessage({ message, type = 'success', onHide }: {
  message: string
  type?: Toast['type']
  onHide: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onHide, 3000)
    return () => clearTimeout(t)
  }, [onHide])

  const colors: Record<Toast['type'], string> = {
    success: '#30D158',
    error: '#FF453A',
    info: '#0A84FF',
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg font-bold text-sm text-white animate-slide-up"
      style={{ background: colors[type], minWidth: 200, textAlign: 'center' }}
    >
      {message}
    </div>
  )
}
