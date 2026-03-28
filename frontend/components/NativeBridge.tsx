'use client'
import { useEffect, useState } from 'react'
import { initNative, isNative, onNetworkChange } from '@/lib/capacitor'

/**
 * Initializes native Capacitor plugins when running inside an iOS app.
 * Also monitors network connectivity and shows an offline banner.
 * In web mode, this component gracefully degrades.
 */
export default function NativeBridge() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (isNative()) {
      initNative()
    }

    // Monitor network for both native and web
    let cleanup: (() => void) | undefined
    onNetworkChange((connected) => {
      setOffline(!connected)
    }).then(fn => { cleanup = fn })

    return () => cleanup?.()
  }, [])
  
  // Offline banner — shown on both native and web
  if (offline) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-[9999] text-center py-2 text-xs font-black"
        style={{
          background: 'linear-gradient(135deg, #FF6B6B, #E05252)',
          color: '#fff',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        📡 You&apos;re offline — some features may not work
      </div>
    )
  }

  return null
}
