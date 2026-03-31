'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-3 px-4"
          style={{ background: 'var(--app-bg)' }}
        >
          <p className="font-black text-lg" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            Something went wrong
          </p>
          <button
            type="button"
            className="min-h-11 px-4 rounded-xl font-black text-sm app-pressable active:scale-95"
            style={{ background: 'var(--app-accent)', color: '#fff' }}
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
