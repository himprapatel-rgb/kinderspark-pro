'use client'
import { useState } from 'react'
import { createSyllabus, updateSyllabus, publishSyllabus } from '@/lib/api'

interface CardItem {
  w: string
  e: string
  hint: string
}

interface SyllabusBuilderProps {
  initial?: {
    id?: string
    title?: string
    icon?: string
    color?: string
    items?: CardItem[]
  }
  classId?: string
  onSave?: (syllabus: any) => void
  onCancel?: () => void
}

const COLORS = ['#4F6BED', '#2BA55E', '#DC4343', '#E8753A', '#7C5BBF', '#0A84FF', '#FF375F', '#3CC78A']
const ICONS = ['📖', '🔢', '🔤', '🎨', '🐾', '🍎', '🚗', '⭐', '🌟', '🎯', '🎮', '🌈']
const EMOJIS = ['⭐', '🔢', '🔤', '🎨', '🐾', '🍎', '🐱', '🐶', '🌸', '🎯', '🎮', '🌈', '🦁', '🐯', '🐘', '🦒', '✈️', '🚗', '🎂', '🍕']

export default function SyllabusBuilder({ initial, classId, onSave, onCancel }: SyllabusBuilderProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [icon, setIcon] = useState(initial?.icon || '📖')
  const [color, setColor] = useState(initial?.color || '#4F6BED')
  const [items, setItems] = useState<CardItem[]>(
    initial?.items?.map((it: any) => ({
      w: it.word || it.w || '',
      e: it.emoji || it.e || '⭐',
      hint: it.hint || '',
    })) || [{ w: '', e: '⭐', hint: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null)

  const addCard = () => setItems((prev) => [...prev, { w: '', e: '⭐', hint: '' }])

  const removeCard = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const updateItem = (i: number, field: keyof CardItem, value: string) => {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const handleSave = async (andPublish = false) => {
    if (!title.trim()) { setError('Title is required'); return }
    if (items.filter((i) => i.w.trim()).length === 0) { setError('Add at least one card'); return }
    setSaving(true)
    setError('')
    try {
      const validItems = items.filter((i) => i.w.trim())
      let syllabus: any

      if (initial?.id) {
        syllabus = await updateSyllabus(initial.id, { title, icon, color, items: validItems })
      } else {
        syllabus = await createSyllabus({ title, icon, color, items: validItems, classId })
      }

      if (andPublish) {
        syllabus = await publishSyllabus(syllabus.id)
      }

      if (onSave) onSave(syllabus)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Meta */}
      <div className="flex gap-3">
        {/* Icon picker */}
        <div className="flex-shrink-0">
          <div className="text-xs text-white/50 font-bold mb-1">Icon</div>
          <div className="flex flex-wrap gap-1 w-40 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className="text-xl p-1 rounded-lg transition-all"
                style={{ background: icon === ic ? `${color}44` : 'transparent' }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          {/* Title */}
          <div>
            <div className="text-xs text-white/50 font-bold mb-1">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Syllabus title..."
              className="w-full px-3 py-2 rounded-xl font-bold text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
          </div>
          {/* Colors */}
          <div>
            <div className="text-xs text-white/50 font-bold mb-1">Color</div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    border: color === c ? '3px solid white' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: `${color}22`, border: `2px solid ${color}44` }}
      >
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="text-white font-black text-sm">{title || 'Untitled'}</div>
          <div className="text-white/50 text-xs font-bold">{items.filter((i) => i.w).length} cards</div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex items-center justify-between">
        <div className="text-white font-black text-sm">Cards ({items.length})</div>
        <button
          onClick={addCard}
          className="px-3 py-1 rounded-xl font-bold text-xs text-white"
          style={{ background: `${color}44` }}
        >
          + Add Card
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-2 items-center p-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {/* Emoji button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === i ? null : i)}
                className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                {item.e}
              </button>
              {showEmojiPicker === i && (
                <div
                  className="absolute top-11 left-0 z-10 p-2 rounded-xl flex flex-wrap gap-1"
                  style={{ background: '#2c2c3e', width: 200 }}
                >
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => { updateItem(i, 'e', em); setShowEmojiPicker(null) }}
                      className="text-xl p-1 rounded-lg hover:bg-white/10"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <input
                value={item.w}
                onChange={(e) => updateItem(i, 'w', e.target.value)}
                placeholder="Word..."
                className="w-full px-2 py-1 rounded-lg text-xs font-bold text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <input
                value={item.hint}
                onChange={(e) => updateItem(i, 'hint', e.target.value)}
                placeholder="Hint (optional)..."
                className="w-full px-2 py-1 rounded-lg text-xs font-bold text-white/60 outline-none"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
            </div>
            <button
              onClick={() => removeCard(i)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <div className="text-red-400 text-sm font-bold">{error}</div>}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl font-black text-sm text-white/60 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ background: `${color}` }}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2BA55E, #3CC78A)' }}
        >
          {saving ? '...' : 'Publish 🚀'}
        </button>
      </div>
    </div>
  )
}
