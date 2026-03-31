'use client'
import dynamic from 'next/dynamic'
import { Loading } from '@/components/UIStates'

const ProfileManager = dynamic(() => import('@/components/ProfileManager'), {
  ssr: false,
  loading: () => <Loading emoji="👤" text="Loading profile…" />,
})

export default function ParentProfilePage() {
  return <ProfileManager roleLabel="Parent" />
}
