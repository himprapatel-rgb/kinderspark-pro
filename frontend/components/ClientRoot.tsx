'use client'

import type { ReactNode } from 'react'
import { AppErrorBoundary } from './AppErrorBoundary'

export default function ClientRoot({ children }: { children: ReactNode }) {
  return <AppErrorBoundary>{children}</AppErrorBoundary>
}
