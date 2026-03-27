'use client'
import { ReactNode } from 'react'

// ── Page Transition Wrapper ─────────────────────────────────────────────────
// Wraps page content with a smooth fade+slide entrance animation.
// Uses CSS-only animation for performance (no extra dependencies).
//
// Usage: <PageTransition> ...page content... </PageTransition>

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: 'slide-up' | 'fade' | 'scale'
}

export default function PageTransition({
  children,
  className = '',
  variant = 'slide-up',
}: PageTransitionProps) {
  const animClass =
    variant === 'slide-up' ? 'animate-page-enter' :
    variant === 'fade' ? 'animate-page-fade' :
    'animate-page-scale'

  return (
    <div className={`${animClass} ${className}`}>
      {children}
    </div>
  )
}

// ── Staggered children (for lists/grids) ────────────────────────────────────
// Wraps each child with a staggered animation delay
export function StaggerChildren({
  children,
  delay = 50,
  className = '',
}: {
  children: ReactNode[]
  delay?: number
  className?: string
}) {
  return (
    <>
      {children.map((child, i) => (
        <div
          key={i}
          className={`animate-page-enter ${className}`}
          style={{ animationDelay: `${i * delay}ms`, opacity: 0 }}
        >
          {child}
        </div>
      ))}
    </>
  )
}
