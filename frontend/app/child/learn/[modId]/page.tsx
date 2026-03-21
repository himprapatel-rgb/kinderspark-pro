'use client'
import { useParams } from 'next/navigation'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LearnModPage() {
  const params = useParams()
  const router = useRouter()
  const modId = params?.modId as string

  useEffect(() => {
    router.replace(`/child/lesson/${modId}`)
  }, [modId, router])

  return null
}
