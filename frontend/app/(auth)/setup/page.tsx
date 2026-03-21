import { redirect } from 'next/navigation'

// First-time setup redirects to login (role selection)
export default function SetupPage() {
  redirect('/login')
}
