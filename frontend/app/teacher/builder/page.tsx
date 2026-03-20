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
      <div className="min-h-screen flex flex-col" style={{ background: meta.color + '22', backgroundColor: '#0f0f1a' }}>
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => setPreview(false)} className="text-white/70 font-bold">← Back</button>
          <div className="text-white font-black">Preview: {meta.title}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-8xl mb-6">{card?.emoji || '⭐'}</div>
          <div className="text-white text-4xl font-black mb-3">{card?.word || 'Word'}</div>
          {card?.hint && <div className="text-white/60 font-bold text-lg">{card.hint}</div>}
        </div>
        <div className="flex items-center justify-between px-6 pb-10">
          <button onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0}
            className="text-white/60 text-3xl disabled:opacity-30">←</button>
          <div className="text-white/60 font-bold">{previewIdx + 1} / {cards.length}</div>
          <button onClick={() => setPreviewIdx(i => Math.min(cards.length - 1, i + 1))} disabled={previewIdx === cards.length - 1}
            className="text-white/60 text-3xl disabled:opacity-30">→</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0f1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/60 font-bold">← Back</button>
        <div className="text-white font-black">{id ? 'Edit Syllabus' : 'Build Syllabus'}</div>
        <button onClick={() => setPreview(true)} className="text-white/60 font-bold text-sm">Preview</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        {/* Meta section */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#1a1a2e' }}>
          {/* Icon picker */}
          <div className="mb-3">
            <div className="text-white/60 text-xs font-bold mb-2">Icon</div>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setMeta(m => ({...m, icon: ic}))}
                  className={`text-xl p-1.5 rounded-lg ${meta.icon === ic ? 'ring-2 ring-white' : ''}`}
                  style={{ background: meta.icon === ic ? meta.color : 'rgba(255,255,255,0.1)' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <input placeholder="Syllabus name" value={meta.title}
            onChange={e => setMeta(m => ({...m, title: e.target.value}))}
            className="input-field mb-3" />

          {/* Colors */}
          <div className="mb-3">
            <div className="text-white/60 text-xs font-bold mb-2">Color</div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setMeta(m => ({...m, color: c}))}
                  className={`w-8 h-8 rounded-full ${meta.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Grade & Type */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select value={meta.grade} onChange={e => setMeta(m => ({...m, grade: e.target.value}))} className="input-field">
              <option value="all">All Grades</option>
              <option value="KG 1">KG 1</option>
              <option value="KG 2">KG 2</option>
              <option value="Grade 1">Grade 1</option>
            </select>
            <select value={meta.type} onChange={e => setMeta(m => ({...m, type: e.target.value}))} className="input-field">
              <option value="custom">Custom</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="phonics">Phonics</option>
              <option value="math">Math</option>
            </select>
          </div>

          <input placeholder="Description (optional)" value={meta.description}
            onChange={e => setMeta(m => ({...m, description: e.target.value}))}
            className="input-field" />
        </div>

        {/* AI & Template buttons */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowAI(true)}
            className="flex-1 py-2 rounded-xl text-white text-xs font-black"
            style={{ background: '#BF5AF2' }}>
            🤖 AI Generate
          </button>
          <button onClick={() => setShowTemplate(true)}
            className="flex-1 py-2 rounded-xl text-white text-xs font-black"
            style={{ background: '#5E5CE6' }}>
            ✨ Templates
          </button>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div key={idx} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-white/40 font-black text-sm w-6">{idx + 1}</div>
                <input value={card.emoji} onChange={e => updateCard(idx, 'emoji', e.target.value)}
                  className="w-12 text-center text-2xl bg-transparent border border-white/20 rounded-lg p-1" />
                <input placeholder="Word" value={card.word} onChange={e => updateCard(idx, 'word', e.target.value)}
                  className="flex-1 input-field" />
                <button onClick={() => removeCard(idx)} className="text-red-400 text-lg">✕</button>
              </div>
              <input placeholder="Hint (optional)" value={card.hint} onChange={e => updateCard(idx, 'hint', e.target.value)}
                className="input-field text-sm" />
            </div>
          ))}
        </div>

        <button onClick={addCard}
          className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-white/20 text-white/50 font-black text-sm">
          + Add Card
        </button>
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 bg-black/90 border-t border-white/10 flex gap-2">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white font-black"
          style={{ background: '#5E5CE6' }}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving}
          className="flex-1 py-3 rounded-xl text-white font-black"
          style={{ background: '#30D158' }}>
          ✓ Publish
        </button>
      </div>

      {/* AI Generate Modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10" style={{ background: '#1a1a2e' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-black text-lg">🤖 AI Generate</h3>
              <button onClick={() => setShowAI(false)} className="text-white/50 text-2xl">×</button>
            </div>
            <input placeholder="Topic (e.g. Sea Animals, Space)" value={aiTopic}
              onChange={e => setAiTopic(e.target.value)}
              className="input-field mb-3" />
            <div className="mb-3">
              <div className="text-white/60 text-xs font-bold mb-2">Number of cards: {aiCount}</div>
              <input type="range" min={5} max={20} value={aiCount}
                onChange={e => setAiCount(parseInt(e.target.value))}
                className="w-full accent-purple-500" />
            </div>
            <button onClick={handleAIGenerate} disabled={aiLoading || !aiTopic}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#BF5AF2', opacity: !aiTopic ? 0.5 : 1 }}>
              {aiLoading ? 'Generating...' : '✨ Generate Cards'}
            </button>
          </div>
        </div>
      )}

      {/* Template Picker */}
      {showTemplate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10" style={{ background: '#1a1a2e' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-black text-lg">✨ Templates</h3>
              <button onClick={() => setShowTemplate(false)} className="text-white/50 text-2xl">×</button>
            </div>
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
                  style={{ background: t.color + '22', border: `1px solid ${t.color}44` }}>
                  <div className="text-3xl">{t.icon}</div>
                  <div>
                    <div className="text-white font-black text-sm">{t.title}</div>
                    <div className="text-white/50 text-xs font-bold">{t.items.length} cards</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 10px 14px;
          color: white;
          font-weight: 700;
          font-size: 14px;
          outline: none;
          font-family: Nunito, sans-serif;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
        .input-field option { color: black; }
      `}</style>
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
