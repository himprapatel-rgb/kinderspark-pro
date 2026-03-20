'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSyllabuses } from '@/lib/api'
import type { Syllabus } from '@/types'

interface UseSyllabusesResult {
  syllabuses: Syllabus[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSyllabuses(classId?: string): UseSyllabusesResult {
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSyllabuses(classId)
      setSyllabuses(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load syllabuses')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { syllabuses, loading, error, refetch: fetchData }
}
