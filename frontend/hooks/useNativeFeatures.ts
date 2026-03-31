'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  isNative,
  hapticTap,
  hapticImpact,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection,
  nativeShare,
  getNetworkStatus,
  onNetworkChange,
  scheduleLocalNotification,
  cancelLocalNotification,
} from '@/lib/capacitor'

/**
 * Hook that provides native iOS features with graceful web fallbacks.
 * 
 * Usage:
 *   const { tap, impact, success, share, isOnline, isNativeApp } = useNativeFeatures()
 *   <button onClick={() => { tap(); doSomething() }}>Press Me</button>
 */
export function useNativeFeatures() {
  const [isOnline, setIsOnline] = useState(true)
  const isNativeApp = typeof window !== 'undefined' && isNative()

  useEffect(() => {
    // Get initial network status
    getNetworkStatus().then(s => setIsOnline(s.connected))

    // Listen for changes
    let cleanup: (() => void) | undefined
    onNetworkChange((connected) => setIsOnline(connected)).then(fn => { cleanup = fn })

    return () => cleanup?.()
  }, [])

  const tap = useCallback(() => { hapticTap() }, [])
  const impact = useCallback(() => { hapticImpact() }, [])
  const success = useCallback(() => { hapticSuccess() }, [])
  const warning = useCallback(() => { hapticWarning() }, [])
  const error = useCallback(() => { hapticError() }, [])
  const selection = useCallback(() => { hapticSelection() }, [])

  const share = useCallback(async (opts: { title: string; text?: string; url?: string }) => {
    hapticTap()
    return nativeShare(opts)
  }, [])

  const scheduleNotification = useCallback(async (opts: {
    id: number
    title: string
    body: string
    scheduleAt?: Date
  }) => {
    return scheduleLocalNotification(opts)
  }, [])

  const cancelNotification = useCallback(async (id: number) => {
    return cancelLocalNotification(id)
  }, [])

  return {
    // Haptics
    tap,
    impact,
    success,
    warning,
    error,
    selection,
    // Sharing
    share,
    // Notifications
    scheduleNotification,
    cancelNotification,
    // State
    isOnline,
    isNativeApp,
  }
}
