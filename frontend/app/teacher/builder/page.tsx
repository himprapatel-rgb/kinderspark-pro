'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { createSyllabus, updateSyllabus, getSyllabus } from '@/lib/api'
import { TEMPLATES } from '@/lib/modules'
import { generateLesson } from '@/lib/api'

const ICONS = ['📖','🌟','🔢','🔤','🎨','🐾','🍎','🚗','⛅','🔷','👁️','👨‍👩‍👧','🏠','🎵','🌍','🧩','💡','🎯']
const COLORS = ['#5E5CE6','#BF5AF2','#30D158','#FF453A','#FF9F0A','#0A84FF','#FF375F','#32D74B']

function BuilderContent() {
  const params = useSearchParams()
  const id = params.get('id')
  const useTemplate = params.get('template')
  const router = useRouter()
  const user = useStore(s => s.user)

  const [meta, setMeta] = useState({
    title: '',
    icon: '📖',
    color: '#5E5CE6',
    grade: 'all',
    type: 'custom',
    description: '',
  })
  const [cards, setCards] = useState<{ word: string; emoji: string; hint: string }[]>([
    { word: '', emoji: '⭐', hint: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiCount, setAiCount] = useState(10)
  const [aiLoading, setAiLoading] = useState(false)
  const [showTemplate, setShowTemplate] = useState(useTemplate === '1')
  const [preview, setPreview] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    if (id) {
      getSyllabus(id).then(syl => {
        setMeta({ title: syl.title, icon: syl.icon, color: syl.color, grade: syl.grade, type: syl.type, description: syl.description || '' })
        setCards(syl.items.map((item: any) => ({ word: item.word, emoji: item.emoji, hint: item.hint || '' })))
      })
    }
  }, [id, user, router])

  const addCard = () => setCards(c => [...c, { word: '', emoji: '⭐', hint: '' }])

  const updateCard = (idx: number, field: string, value: string) => {
    setCards(c => c.map((card, i) => i === idx ? { ...card, [field]: value } : card))
  }

  const removeCard = (idx: number) => {
    if (cards.length > 1) setCards(c => c.filter((_, i) => i !== idx))
  }

  const handleSave = async (publish = false) => {
    if (!meta.title) { alert('Please enter a title'); return }
    setSaving(true)
    try {
      const data = {
        ...meta,
        items: cards.map((c, i) => ({ w: c.word, e: c.emoji, hint: c.hint, order: i })),
        published: publish,
      }
      if (id) {
        await updateSyllabus(id, data)
      } else {
        await createSyllabus(data)
      }
      router.push('/teacher')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiTopic) return
    setAiLoading(true)
    try {
      const { items } = await generateLesson(aiTopic, aiCount)
      setCards(items.map((item: any) => ({ word: item.w, emoji: item.e, hint: item.hint || '' })))
      if (!meta.title) setMeta(m => ({ ...m, title: aiTopic }))
      setShowAI(false)
    } catch {
      alert('AI generation failed. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const applyTemplate = (t: any) => {
    setMeta(m => ({ ...m, title: t.title, icon: t.icon, color: t.color }))
    setCards(t.items.map((item: any) => ({ word: item.w, emoji: item.e, hint: item.hint || '' })))
    setShowTemplate(false)
  }

  if (preview) {
    const card = cards[previewIdx]
    return (
      <div className="min-h-screen flex flex-col app-page" style={{ background: `linear-gradient(180deg, ${meta.color}22, var(--app-bg))` }}>
        <div className="flex items-center gap-3 p-4">
          <button className="app-pressable" onClick={() => setPreview(false)} className="app-muted font-bold">← Back</button>
          <div className="font-black" style={{ color: 'rgb(var(--foreground-rgb))' }}>Preview: {meta.title}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-8xl mb-6">{card?.emoji || '⭐'}</div>
          <div className="text-4xl font-black mb-3" style={{ color: 'rgb(var(--foreground-rgb))' }}>{card?.word || 'Word'}</div>
          {card?.hint && <div className="app-muted font-bold text-lg">{card.hint}</div>}
        </div>
        <div className="flex items-center justify-between px-6 pb-10">
          <button className="app-pressable" onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0}
            className="text-white/60 text-3xl disabled:opacity-30">←</button>
          <div className="app-muted font-bold">{previewIdx + 1} / {cards.length}</div>
          <button className="app-pressable" onClick={() => setPreviewIdx(i => Math.min(cards.length - 1, i + 1))} disabled={previewIdx === cards.length - 1}
            className="text-white/60 text-3xl disabled:opacity-30">→</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col app-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--app-border)', background: 'rgba(255,255,255,0.82)' }}>
        <button className="app-pressable" onClick={() => router.back()} className="app-muted font-bold">← Back</button>
        <div className="app-title">{id ? 'Edit Syllabus' : 'Build Syllabus'}</div>
        <button className="app-pressable" onClick={() => setPreview(true)} className="app-muted font-bold text-sm">Preview</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        {/* Meta section */}
        <div className="rounded-2xl p-4 mb-4 app-surface">
          {/* Icon picker */}
          <div className="mb-3">
            <div className="app-muted text-xs font-bold mb-2">Icon</div>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button className="app-pressable" key={ic} onClick={() => setMeta(m => ({...m, icon: ic}))}
                  className={`text-xl p-1.5 rounded-lg ${meta.icon === ic ? 'ring-2 ring-white' : ''}`}
                  style={{ background: meta.icon === ic ? meta.color : 'rgba(70,75,96,0.08)' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <input placeholder="Syllabus name" value={meta.title}
            onChange={e => setMeta(m => ({...m, title: e.target.value}))}
            className="app-input mb-3" />

          {/* Colors */}
          <div className="mb-3">
            <div className="app-muted text-xs font-bold mb-2">Color</div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button className="app-pressable" key={c} onClick={() => setMeta(m => ({...m, color: c}))}
                  className={`w-8 h-8 rounded-full ${meta.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Grade & Type */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select value={meta.grade} onChange={e => setMeta(m => ({...m, grade: e.target.value}))} className="app-input">
              <option value="all">All Grades</option>
              <option value="KG 1">KG 1</option>
              <option value="KG 2">KG 2</option>
              <option value="Grade 1">Grade 1</option>
            </select>
            <select value={meta.type} onChange={e => setMeta(m => ({...m, type: e.target.value}))} className="app-input">
              <option value="custom">Custom</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="phonics">Phonics</option>
              <option value="math">Math</option>
            </select>
          </div>

          <input placeholder="Description (optional)" value={meta.description}
            onChange={e => setMeta(m => ({...m, description: e.target.value}))}
            className="app-input" />
        </div>

        {/* AI & Template buttons */}
        <div className="flex gap-2 mb-4">
          <button className="app-pressable" onClick={() => setShowAI(true)}
            className="flex-1 py-2 rounded-xl text-white text-xs font-black"
            style={{ background: '#BF5AF2' }}>
            🤖 AI Generate
          </button>
          <button className="app-pressable" onClick={() => setShowTemplate(true)}
            className="flex-1 py-2 rounded-xl text-white text-xs font-black"
            style={{ background: '#5E5CE6' }}>
            ✨ Templates
          </button>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div key={idx} className="rounded-2xl p-4 app-surface">
              <div className="flex items-center gap-2 mb-2">
                <div className="app-muted font-black text-sm w-6">{idx + 1}</div>
                <input value={card.emoji} onChange={e => updateCard(idx, 'emoji', e.target.value)}
                  className="w-12 text-center text-2xl bg-transparent border rounded-lg p-1" style={{ borderColor: 'var(--app-border)' }} />
                <input placeholder="Word" value={card.word} onChange={e => updateCard(idx, 'word', e.target.value)}
                  className="flex-1 app-input" />
                <button className="app-pressable" onClick={() => removeCard(idx)} className="text-red-400 text-lg">✕</button>
              </div>
              <input placeholder="Hint (optional)" value={card.hint} onChange={e => updateCard(idx, 'hint', e.target.value)}
                className="app-input text-sm" />
            </div>
          ))}
        </div>

        <button onClick={addCard}
          className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-white/20 text-white/50 font-black text-sm app-pressable">
          + Add Card
        </button>
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 border-t flex gap-2" style={{ background: 'rgba(255,255,255,0.94)', borderColor: 'var(--app-border)' }}>
        <button className="app-pressable" onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white font-black"
          style={{ background: '#5E5CE6' }}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
        <button className="app-pressable" onClick={() => handleSave(true)} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white font-black"
          style={{ background: '#30D158' }}>
          ✓ Publish
        </button>
      </div>

      {/* AI Generate Modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10 app-surface">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-lg" style={{ color: 'rgb(var(--foreground-rgb))' }}>🤖 AI Generate</h3>
              <button className="app-pressable" onClick={() => setShowAI(false)} className="app-muted text-2xl">×</button>
            </div>
            <input placeholder="Topic (e.g. Sea Animals, Space)" value={aiTopic}
              onChange={e => setAiTopic(e.target.value)}
              className="app-input mb-3" />
            <div className="mb-3">
              <div className="app-muted text-xs font-bold mb-2">Number of cards: {aiCount}</div>
              <input type="range" min={5} max={20} value={aiCount}
                onChange={e => setAiCount(parseInt(e.target.value))}
                className="w-full accent-purple-500" />
            </div>
            <button onClick={handleAIGenerate} disabled={aiLoading || !aiTopic}
              className="w-full py-3 rounded-xl text-white font-black app-pressable"
              style={{ background: '#BF5AF2', opacity: !aiTopic ? 0.5 : 1 }}>
              {aiLoading ? 'Generating...' : '✨ Generate Cards'}
            </button>
          </div>
        </div>
      )}

      {/* Template Picker */}
      {showTemplate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10 app-surface">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-lg" style={{ color: 'rgb(var(--foreground-rgb))' }}>✨ Templates</h3>
              <button className="app-pressable" onClick={() => setShowTemplate(false)} className="app-muted text-2xl">×</button>
            </div>
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button className="app-pressable" key={t.id} onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
                  style={{ background: t.color + '22', border: `1px solid ${t.color}44` }}>
                  <div className="text-3xl">{t.icon}</div>
                  <div>
                    <div className="font-black text-sm" style={{ color: 'rgb(var(--foreground-rgb))' }}>{t.title}</div>
                    <div className="app-muted text-xs font-bold">{t.items.length} cards</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderContent />
    </Suspense>
  )
}
