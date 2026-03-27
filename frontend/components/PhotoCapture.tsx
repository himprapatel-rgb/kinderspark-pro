'use client'
import { useState, useRef } from 'react'
import { createActivityPost } from '@/lib/api'
import { Camera, Sparkles, X, Send } from 'lucide-react'

const ACTIVITY_TYPES = [
  { emoji: '🎨', label: 'Art' },
  { emoji: '📖', label: 'Reading' },
  { emoji: '🔢', label: 'Math' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🧩', label: 'Puzzle' },
  { emoji: '🌱', label: 'Nature' },
  { emoji: '🎭', label: 'Play' },
  { emoji: '📸', label: 'General' },
]

interface PhotoCaptureProps {
  classId: string
  students: { id: string; name: string; avatar?: string }[]
  onPosted?: () => void
  onClose?: () => void
}

export default function PhotoCapture({ classId, students, onPosted, onClose }: PhotoCaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📸')
  const [taggedStudents, setTaggedStudents] = useState<string[]>([])
  const [aiCaption, setAiCaption] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      setImageData(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const toggleStudent = (id: string) => {
    setTaggedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handlePost = async () => {
    if (!imageData) return
    setPosting(true)
    setError('')
    try {
      await createActivityPost({
        classId,
        imageData,
        caption: aiCaption ? '' : caption,
        studentTags: taggedStudents,
        emoji: selectedEmoji,
        generateCaption: aiCaption,
      })
      onPosted?.()
    } catch (err: any) {
      setError(err.message || 'Failed to post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'var(--app-overlay)' }}>
      <div className="w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-lg inline-flex items-center gap-2">
            <Camera size={18} /> Share Activity
          </h3>
          <button onClick={onClose} className="app-muted text-2xl leading-none app-pressable">
            <X size={20} />
          </button>
        </div>

        {/* Image area */}
        {!imageData ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 app-pressable transition-colors"
            style={{ borderColor: 'var(--app-border)', background: 'rgba(120,120,140,0.05)' }}
          >
            <Camera size={32} className="app-muted" />
            <div className="font-black text-sm app-muted">Tap to take or upload photo</div>
            <div className="text-[10px] font-bold app-muted">Max 5MB · JPG, PNG</div>
          </button>
        ) : (
          <div className="relative rounded-2xl overflow-hidden mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageData} alt="Preview" className="w-full object-cover rounded-2xl" style={{ maxHeight: 240 }} />
            <button
              onClick={() => { setImageData(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X size={14} color="#fff" />
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {imageData && (
          <>
            {/* Activity type */}
            <div className="mb-3">
              <div className="text-xs font-bold app-muted mb-2">Activity Type</div>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t.emoji}
                    onClick={() => setSelectedEmoji(t.emoji)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black app-pressable transition-all ${
                      selectedEmoji === t.emoji ? 'ring-2 ring-offset-1' : ''
                    }`}
                    style={{
                      background: selectedEmoji === t.emoji ? 'rgba(94,92,230,0.2)' : 'var(--app-surface-soft)',
                      border: '1px solid var(--app-border)',
                      ringColor: '#5E5CE6',
                    }}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag students */}
            {students.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-bold app-muted mb-2">Tag Students (optional)</div>
                <div className="flex flex-wrap gap-1.5">
                  {students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-black app-pressable transition-all ${
                        taggedStudents.includes(s.id) ? 'text-white' : ''
                      }`}
                      style={{
                        background: taggedStudents.includes(s.id) ? '#4CAF6A' : 'var(--app-surface-soft)',
                        border: taggedStudents.includes(s.id) ? '1px solid #4CAF6A' : '1px solid var(--app-border)',
                      }}
                    >
                      {s.avatar || '👧'} {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Caption mode */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold app-muted">Caption</div>
                <button
                  onClick={() => setAiCaption(!aiCaption)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black app-pressable inline-flex items-center gap-1 transition-all`}
                  style={{
                    background: aiCaption ? 'rgba(94,92,230,0.2)' : 'var(--app-surface-soft)',
                    color: aiCaption ? '#A78BFA' : 'inherit',
                    border: `1px solid ${aiCaption ? 'rgba(94,92,230,0.4)' : 'var(--app-border)'}`,
                  }}
                >
                  <Sparkles size={10} /> {aiCaption ? 'AI Caption ON' : 'Write my own'}
                </button>
              </div>
              {!aiCaption ? (
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What are the kids learning today?"
                  rows={2}
                  className="app-input resize-none text-sm"
                />
              ) : (
                <div className="rounded-xl p-3 text-xs font-bold app-muted" style={{ background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.2)' }}>
                  ✨ AI will generate a warm, personalized caption for parents based on the activity type
                  {taggedStudents.length > 0 ? ` and tagged students` : ''}.
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-xs font-black mb-3">{error}</div>
            )}

            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={posting}
              className="w-full py-3 rounded-xl font-black app-pressable inline-flex items-center justify-center gap-2"
              style={{
                background: posting ? 'rgba(48,209,88,0.5)' : 'var(--app-success)',
                color: '#fff',
                opacity: posting ? 0.7 : 1,
              }}
            >
              {posting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {aiCaption ? 'AI writing caption…' : 'Posting…'}
                </>
              ) : (
                <>
                  <Send size={14} /> Share with Parents
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
