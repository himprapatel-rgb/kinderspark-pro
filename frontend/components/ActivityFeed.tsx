'use client'
import { useState, useEffect } from 'react'
import { getActivityFeed, likeActivityPost } from '@/lib/api'
import { Heart } from 'lucide-react'

interface ActivityPost {
  id: string
  classId: string
  caption: string
  aiCaption: boolean
  emoji: string
  imageData: string
  studentTags: string[]
  likes: number
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityFeed({ classId }: { classId: string }) {
  const [posts, setPosts] = useState<ActivityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    getActivityFeed(classId)
      .then((data) => setPosts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [classId])

  const handleLike = async (postId: string) => {
    if (likedPosts.has(postId)) return
    setLikedPosts((prev) => new Set(Array.from(prev).concat(postId)))
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    )
    try {
      await likeActivityPost(postId)
    } catch {
      // Revert on error
      setLikedPosts((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: p.likes - 1 } : p))
      )
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="h-4 rounded bg-gray-300/20 w-1/3 mb-3" />
            <div className="h-40 rounded-xl bg-gray-300/10 mb-3" />
            <div className="h-3 rounded bg-gray-300/15 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        <div className="text-4xl mb-3">📸</div>
        <div className="font-black text-sm">No activity photos yet</div>
        <div className="text-xs font-bold app-muted mt-1">
          Your child&apos;s teacher will share classroom moments here
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                style={{ background: 'rgba(48,209,88,0.15)' }}>
                👩‍🏫
              </div>
              <div>
                <div className="font-black text-xs">Teacher</div>
                <div className="text-[10px] font-bold app-muted">{timeAgo(post.createdAt)}</div>
              </div>
            </div>
            <span className="text-lg">{post.emoji}</span>
          </div>

          {/* Image */}
          <div className="px-3 pb-2">
            <div className="rounded-xl overflow-hidden" style={{ maxHeight: 300 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageData}
                alt={post.caption}
                className="w-full object-cover"
                style={{ maxHeight: 300 }}
                loading="lazy"
              />
            </div>
          </div>

          {/* Caption */}
          <div className="px-4 pb-2">
            <p className="text-sm leading-relaxed">
              {post.caption}
              {post.aiCaption && (
                <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full align-middle"
                  style={{ background: 'rgba(94,92,230,0.2)', color: '#A78BFA' }}>
                  ✨ AI
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex items-center gap-4">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1.5 text-xs font-black app-pressable transition-colors ${
                likedPosts.has(post.id) ? 'text-red-400' : 'app-muted'
              }`}
            >
              <Heart size={14} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
              {post.likes > 0 ? post.likes : 'Like'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
