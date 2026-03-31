'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Listens for a new service worker in the waiting state and offers a one-tap refresh.
 */
export default function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false)
  const reloadOnceRef = useRef(false)

  const applyUpdate = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const { serviceWorker } = navigator
    serviceWorker.getRegistration().then((reg) => {
      const w = reg?.waiting
      if (w) {
        w.postMessage({ type: 'SKIP_WAITING' })
      } else {
        window.location.reload()
      }
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      if (reloadOnceRef.current) return
      reloadOnceRef.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const regPromise = navigator.serviceWorker.register('/sw.js')

    regPromise
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          setVisible(true)
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setVisible(true)
            }
          })
        })
      })
      .catch(() => {})

    const interval = window.setInterval(() => {
      regPromise.then((reg) => reg?.update()).catch(() => {})
    }, 60 * 60 * 1000)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      clearInterval(interval)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl px-4 py-3 shadow-lg max-w-lg w-full"
        style={{
          background: 'rgba(13,13,26,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="text-xs sm:text-sm font-bold text-white text-center">
          New version available — Refresh
        </span>
        <button
          type="button"
          onClick={applyUpdate}
          className="min-h-[44px] min-w-[44px] px-4 rounded-xl text-xs font-black app-pressable active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--app-accent), #4A6ED0)', color: '#fff' }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
