'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ── Pull-to-Refresh Hook ────────────────────────────────────────────────────
// Provides mobile-native pull-to-refresh behaviour for any scrollable page.
//
// Usage:
//   const { pullRef, refreshing, pullProgress } = usePullToRefresh(loadData)
//   <div ref={pullRef}> ... </div>
//   {pullProgress > 0 && <PullIndicator progress={pullProgress} refreshing={refreshing} />}

interface UsePullToRefreshOptions {
  threshold?: number    // px to pull before triggering (default 80)
  resistance?: number   // how much to resist pulling (default 2.5)
}

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  options: UsePullToRefreshOptions = {}
) {
  const { threshold = 80, resistance = 2.5 } = options
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = pullRef.current
    if (!el || refreshing) return
    // Only enable pull-to-refresh when scrolled to top
    if (el.scrollTop > 5) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return
    const deltaY = e.touches[0].clientY - startY.current
    if (deltaY < 0) {
      pulling.current = false
      setPullDistance(0)
      return
    }
    // Apply resistance
    const distance = Math.min(deltaY / resistance, threshold * 1.5)
    setPullDistance(distance)
    if (distance > 10) {
      e.preventDefault()
    }
  }, [refreshing, resistance, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true)
      try {
        await onRefresh()
      } catch { /* ignore */ }
      setRefreshing(false)
    }
    setPullDistance(0)
  }, [pullDistance, threshold, refreshing, onRefresh])

  useEffect(() => {
    const el = pullRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return { pullRef, refreshing, pullProgress, pullDistance }
}

// ── Pull-to-Refresh Visual Indicator ────────────────────────────────────────
export function PullIndicator({
  progress,
  refreshing,
  pullDistance,
}: {
  progress: number
  refreshing: boolean
  pullDistance: number
}) {
  if (progress <= 0 && !refreshing) return null

  return (
    <div
      className="flex items-center justify-center transition-all duration-150"
      style={{
        height: refreshing ? 48 : Math.max(0, pullDistance),
        overflow: 'hidden',
      }}
    >
      <div
        className={`w-8 h-8 rounded-full border-3 flex items-center justify-center ${refreshing ? 'animate-spin' : ''}`}
        style={{
          borderWidth: 3,
          borderColor: `rgba(77,170,223,${progress * 0.5})`,
          borderTopColor: progress >= 1 || refreshing ? 'var(--app-accent)' : `rgba(77,170,223,${progress})`,
          transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
          transition: refreshing ? 'none' : 'transform 0.1s ease',
        }}
      >
        {progress >= 1 && !refreshing && (
          <span className="text-xs">↓</span>
        )}
      </div>
    </div>
  )
}
