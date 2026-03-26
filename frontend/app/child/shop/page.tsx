'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { updateStudent } from '@/lib/api'
import { SHOP_AVS, SHOP_THS } from '@/lib/modules'
import { Palette, ShoppingBag, Smile } from 'lucide-react'

export default function ShopPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)
  const setUser = useStore(s => s.setUser)
  const setCurrentStudent = useStore(s => s.setCurrentStudent)

  const student = currentStudent || user

  const [buying, setBuying] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const ownedItems: string[] = student?.ownedItems || ['av_def', 'th_def']
  const selectedTheme = student?.selectedTheme || 'th_def'
  const stars = student?.stars || 0

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleBuy = async (itemId: string, price: number, type: 'avatar' | 'theme') => {
    if (!student) return
    if (ownedItems.includes(itemId)) {
      // Equip
      if (type === 'theme') {
        try {
          const updated = await updateStudent(student.id, { selectedTheme: itemId })
          setCurrentStudent({ ...student, selectedTheme: itemId } as any)
          setUser({ ...user, selectedTheme: itemId })
          showToast('Theme equipped!')
        } catch {}
      }
      return
    }
    if (stars < price) {
      showToast(`Need ${price} ⭐ to buy this!`)
      return
    }
    setBuying(itemId)
    try {
      const newStars = stars - price
      const newOwned = [...ownedItems, itemId]
      const updateData: any = { stars: newStars, ownedItems: newOwned }
      if (type === 'theme') updateData.selectedTheme = itemId
      await updateStudent(student.id, updateData)
      setCurrentStudent({ ...student, stars: newStars, ownedItems: newOwned, ...(type === 'theme' ? { selectedTheme: itemId } : {}) } as any)
      setUser({ ...user, stars: newStars, ownedItems: newOwned, ...(type === 'theme' ? { selectedTheme: itemId } : {}) })
      showToast('Purchased! 🎉')
    } catch (e: any) {
      showToast('Failed to buy. Try again.')
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="min-h-screen pb-8 app-page app-container">
      {/* Header */}
      <div className="m-3 rounded-3xl p-5 doodle-surface" style={{ background: 'linear-gradient(135deg, #F5A623, #E05252)' }}>
        <button onClick={() => router.push('/child')} className="text-white/85 font-bold text-sm mb-3 app-pressable">← Back</button>
        <div className="text-2xl font-black inline-flex items-center gap-2"><ShoppingBag size={22} /> Star Shop</div>
        <div className="text-white/80 font-bold">You have <span className="font-black text-yellow-300">⭐ {stars}</span> stars</div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white text-black font-black text-sm px-5 py-3 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="px-3 space-y-6">
        {/* Avatars */}
        <div>
          <div className="app-title text-base mb-3 inline-flex items-center gap-2"><Smile size={16} /> Avatars</div>
          <div className="grid grid-cols-3 gap-3">
            {SHOP_AVS.map(item => {
              const owned = ownedItems.includes(item.id)
              return (
                <button className="app-pressable" key={item.id}
                  onClick={() => handleBuy(item.id, item.price, 'avatar')}
                  disabled={buying === item.id}
                  className="rounded-2xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
                  style={{
                    background: owned ? '#4CAF6A20' : 'var(--app-surface)',
                    border: `2px solid ${owned ? '#4CAF6A' : stars >= item.price ? 'var(--app-border)' : 'rgba(255,69,58,0.3)'}`,
                  }}>
                  <div className="text-4xl sticker-bubble w-14 h-14 flex items-center justify-center" style={{ transform: 'rotate(-4deg)' }}>{item.emoji}</div>
                  <div className="font-black text-xs" style={{ color: 'rgb(var(--foreground-rgb))' }}>{item.label}</div>
                  {owned ? (
                    <div className="text-green-400 text-xs font-bold">✓ Owned</div>
                  ) : (
                    <div className="text-yellow-400 text-xs font-black">⭐ {item.price}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Themes */}
        <div>
          <div className="app-title text-base mb-3 inline-flex items-center gap-2"><Palette size={16} /> Themes</div>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_THS.map(item => {
              const owned = ownedItems.includes(item.id)
              const active = selectedTheme === item.id
              return (
                <button className="app-pressable" key={item.id}
                  onClick={() => handleBuy(item.id, item.price, 'theme')}
                  disabled={buying === item.id}
                  className="rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all"
                  style={{
                    background: active ? item.color + '30' : owned ? 'rgba(48,209,88,0.06)' : 'var(--app-surface)',
                    border: `2px solid ${active ? item.color : owned ? '#4CAF6A' : 'var(--app-border)'}`,
                  }}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <div className="flex-1 text-left">
                    <div className="font-black text-xs" style={{ color: 'rgb(var(--foreground-rgb))' }}>{item.label}</div>
                    {active ? (
                      <div className="text-xs font-bold" style={{ color: item.color }}>Active</div>
                    ) : owned ? (
                      <div className="text-green-400 text-xs font-bold">Tap to equip</div>
                    ) : (
                      <div className="text-yellow-400 text-xs font-black">⭐ {item.price}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
