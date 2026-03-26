'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import SyllabusBuilder from '@/components/SyllabusBuilder'

export default function SyllabusBuilderPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)

  const handleSave = (syllabus: any) => {
    // Navigate back to teacher dashboard after save
    router.push('/teacher')
  }

  return (
    <div
      className="min-h-screen pb-8 app-page"
    >
      {/* Header */}
      <div
        className="p-5 pt-10"
        style={{ background: 'linear-gradient(135deg, #30D158, #43C6AC)' }}
      >
        <button className="app-pressable"
          onClick={() => router.back()}
          className="text-sm font-bold mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="font-black text-2xl">Syllabus Builder 📖</h1>
        <p className="text-sm font-bold mt-1">Create custom learning content</p>
      </div>

      <div className="p-5">
        <SyllabusBuilder
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  )
}
