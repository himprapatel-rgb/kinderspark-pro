'use client'
import { useState, useEffect, useCallback } from 'react'
import { getStudent, getProgress } from '@/lib/api'
import type { Student, Progress } from '@/types'

interface UseStudentResult {
  student: Student | null
  progress: Progress[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useStudent(studentId?: string): UseStudentResult {
  const [student, setStudent] = useState<Student | null>(null)
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [studentData, progressData] = await Promise.all([
        getStudent(studentId),
        getProgress(studentId),
      ])
      setStudent(studentData)
      setProgress(progressData)
    } catch (err: any) {
      setError(err.message || 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { student, progress, loading, error, refetch: fetchData }
}
