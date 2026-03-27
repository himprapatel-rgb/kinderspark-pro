'use client'
import { useEffect } from 'react'
import { initNative, isNative } from '@/lib/capacitor'

/**
 * Initializes native Capacitor plugins when running inside an iOS app.
 * In web mode, this component does nothing.
 */
export default function NativeBridge() {
  useEffect(() => {
    if (isNative()) {
      initNative()
    }
  }, [])
  
  return null
}
