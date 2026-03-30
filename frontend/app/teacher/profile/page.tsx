'use client'
import dynamic from 'next/dynamic'
import { Loading } from '@/components/UIStates'

const ProfileManager = dynamic(() => import('@/components/ProfileManager'), {
  ssr: false,
  loading: () => <Loading emoji="👤" text="Loading profile…" />,
})

export default function TeacherProfilePage() {
  return <ProfileManager roleLabel="Teacher" />
}
