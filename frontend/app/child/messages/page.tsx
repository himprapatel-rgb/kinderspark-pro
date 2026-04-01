'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/icons'
import { useAppStore } from '@/store/appStore'
import { InlineEmpty } from '@/components/UIStates'
import {
  createMessageThread,
  getMessageRecipients,
  getMessageThreads,
  getThreadMessages,
  sendThreadMessage,
} from '@/lib/api'

export default function ChildMessagesPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const currentStudent = useAppStore((s) => s.currentStudent)
  const role = useAppStore((s) => s.role)
  const student = currentStudent || user

  const [recipients, setRecipients] = useState<{ kids: any[]; teachers: any[]; parents: any[]; school: any[] }>({ kids: [], teachers: [], parents: [], school: [] })
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!student || role !== 'child') {
      router.push('/')
      return
    }
    getMessageRecipients().then((rows) => setRecipients(rows || { kids: [], teachers: [], parents: [], school: [] })).catch(() => {})
    getMessageThreads({ scopeType: 'direct' })
      .then(async (threads: any[]) => {
        const latest = Array.isArray(threads) ? threads[0] : null
        if (!latest?.id) return
        const rows = await getThreadMessages(latest.id)
        setHistory(Array.isArray(rows) ? rows.slice(-30) : [])
      })
      .catch(() => {})
  }, [student, role, router])

  const allRecipients = useMemo(
    () => [...recipients.teachers, ...recipients.parents, ...recipients.kids],
    [recipients]
  )

  const handleSend = async () => {
    const recipientId = selectedRecipientId.trim()
    if (!recipientId || !subject.trim() || !body.trim()) return
    try {
      setBusy(true)
      const existing = await getMessageThreads({ scopeType: 'direct' })
      const directThread = Array.isArray(existing)
        ? existing.find((th: any) =>
            Array.isArray(th.participants) &&
            th.participants.some((p: any) => p?.user?.id === recipientId)
          )
        : null
      let thread = directThread
      if (!thread) {
        thread = await createMessageThread({
          scopeType: 'direct',
          participantUserIds: [recipientId],
        })
      }
      if (!thread?.id) return
      await sendThreadMessage(thread.id, {
        body: `Subject: ${subject.trim()}\n\n${body.trim()}`,
        kind: 'direct_message',
        priority: 'normal',
      })
      const rows = await getThreadMessages(thread.id)
      setHistory(Array.isArray(rows) ? rows.slice(-30) : [])
      setSubject('')
      setBody('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen app-container pb-24" style={{ background: 'var(--app-bg)' }}>
      <div className="px-4 pt-10 pb-3 flex items-center gap-2">
        <button type="button" onClick={() => router.back()} className="w-9 h-9 rounded-xl app-pressable" style={{ background: 'var(--app-surface-soft)' }}>←</button>
        <h1 className="font-black text-lg inline-flex items-center gap-2"><AppIcon name="messages" size="sm" roleTone="child" decorative /> Messages</h1>
      </div>

      <div className="px-3 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-sm mb-2">Message your network</div>
          <select
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="w-full app-input mb-2"
          >
            <option value="">Choose recipient</option>
            {recipients.teachers.length > 0 && <option disabled value="">-- Teachers --</option>}
            {recipients.teachers.map((r: any) => <option key={`teacher-${r.id}`} value={r.id}>{r.name} ({r.profileId})</option>)}
            {recipients.parents.length > 0 && <option disabled value="">-- Parents --</option>}
            {recipients.parents.map((r: any) => <option key={`parent-${r.id}`} value={r.id}>{r.name} ({r.profileId})</option>)}
            {recipients.kids.length > 0 && <option disabled value="">-- Friends/Kids --</option>}
            {recipients.kids.map((r: any) => <option key={`kid-${r.id}`} value={r.id}>{r.name} ({r.profileId})</option>)}
          </select>
          <div className="text-[11px] font-bold app-muted mb-2">
            You can only message connected teachers, parents, and kids listed in your account.
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full app-input mb-2" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your message..." rows={4} className="w-full app-input resize-none mb-2" />
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !selectedRecipientId || !subject.trim() || !body.trim()}
            className="w-full py-3 rounded-xl font-black app-pressable"
            style={{ background: 'var(--app-success)', color: '#fff', opacity: (!selectedRecipientId || !subject.trim() || !body.trim()) ? 0.55 : 1 }}
          >
            {busy ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="font-black text-sm mb-2">Recent direct messages</div>
          {history.length === 0 && <InlineEmpty emoji="💬" text="No direct messages yet" />}
          <div className="space-y-2">
            {history.map((m: any) => (
              <div key={m.id} className="rounded-xl p-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                <div className="text-xs font-black app-muted mb-1">{new Date(m.sentAt || m.createdAt).toLocaleString()}</div>
                <div className="text-xs leading-relaxed whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </div>
        </div>

        {allRecipients.length === 0 && (
          <InlineEmpty emoji="🧩" text="No connected recipients found for this account yet." />
        )}
      </div>
    </div>
  )
}
