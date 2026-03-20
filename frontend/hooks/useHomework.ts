'use client'
import { useState, useEffect, useCallback } from 'react'
import { getHomework } from '@/lib/api'
import type { Homework } from '@/types'

interface UseHomeworkResult {
  homework: Homework[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useHomework(classId?: string): UseHomeworkResult {
  const [homework, setHomework] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getHomework(classId)
      setHomework(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load homework')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { homework, loading, error, refetch: fetchData }
}
