'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

export default function PrincipalPage() {
  const router = useRouter()
  const switchRole = useAppStore(s => s.switchRole)

  useEffect(() => {
    switchRole('principal')
    router.replace('/admin')
  }, [router, switchRole])

  return null
}
