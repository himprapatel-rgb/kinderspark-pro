'use client'

/**
 * Shared UI state components for consistent loading, empty, and error states across all roles.
 */

// ── Loading ─────────────────────────────────────────────────────────────────
export function Loading({ emoji = '⏳', text = 'Loading...' }: { emoji?: string; text?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--app-bg)' }}>
      <div className="text-5xl animate-bounce">{emoji}</div>
      <p className="font-bold text-sm" style={{ color: 'var(--app-text-muted)' }}>{text}</p>
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({
  emoji = '📭',
  title = 'Nothing here yet',
  subtitle,
  actionLabel,
  onAction,
}: {
  emoji?: string
  title?: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <p className="font-black text-base mb-1" style={{ color: 'rgb(var(--foreground-rgb))' }}>{title}</p>
      {subtitle && <p className="text-xs font-bold mb-4" style={{ color: 'var(--app-text-muted)' }}>{subtitle}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="app-btn-primary px-5 py-2.5 text-sm app-pressable"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ── Error State ─────────────────────────────────────────────────────────────
export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="font-black text-base mb-1" style={{ color: 'rgb(var(--foreground-rgb))' }}>Oops!</p>
      <p className="text-xs font-bold mb-4" style={{ color: 'var(--app-text-muted)' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="app-btn-primary px-5 py-2.5 text-sm app-pressable"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

// ── Inline empty (for sections inside pages, not full-screen) ───────────────
export function InlineEmpty({ emoji = '📭', text = 'Nothing here yet' }: { emoji?: string; text?: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="text-sm font-bold" style={{ color: 'var(--app-text-muted)' }}>{text}</p>
    </div>
  )
}
