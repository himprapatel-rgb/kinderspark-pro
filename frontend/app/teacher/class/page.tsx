import { redirect } from 'next/navigation'

// Class management is now integrated into the main teacher dashboard (Students tab)
export default function ClassPage() {
  redirect('/teacher')
}
