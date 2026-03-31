'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppStore } from '@/store/appStore'
import { postPrivacyConsent } from '@/lib/api'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/components/Toast'
import { Loading } from '@/components/UIStates'
import { hapticSuccess } from '@/lib/capacitor'

function ConsentForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const role = useAppStore((s) => s.role)
  const { t } = useTranslation()
  const toast = useToast()
  const studentId = (searchParams.get('studentId') || '').trim()

  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) {
      router.replace('/')
      return
    }
    if (role !== 'parent' && role !== 'admin' && role !== 'principal') {
      router.replace('/parent')
    }
  }, [user, role, router])

  useEffect(() => {
    if (user?.name && !parentName) setParentName(user.name)
  }, [user?.name, parentName])

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!studentId) {
        toast.error('Open this screen from the parent dashboard with a child selected.')
        return
      }
      setBusy(true)
      try {
        await postPrivacyConsent({
          studentId,
          parentName: parentName.trim(),
          parentEmail: parentEmail.trim(),
        })
        setDone(true)
        void hapticSuccess()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      } finally {
        setBusy(false)
      }
    },
    [studentId, parentName, parentEmail, toast]
  )

  if (!user || (role !== 'parent' && role !== 'admin' && role !== 'principal')) {
    return <Loading emoji="📋" text="Loading…" />
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-6 text-center"
          style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
        >
          <div className="text-3xl mb-2">✅</div>
          <h1 className="text-lg font-black mb-4" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            {t('parent_privacy_consent_recorded')}
          </h1>
          <Link
            href="/parent"
            className="inline-flex min-h-11 items-center justify-center px-5 rounded-xl text-sm font-black app-pressable active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--app-accent), rgba(94,92,230,0.85))', color: '#fff' }}
          >
            {t('consent_done_back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-md mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-bold mb-6 flex items-center gap-1 app-pressable"
          style={{ color: 'var(--app-accent)' }}
        >
          ← {t('back')}
        </button>
        <h1 className="text-xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          {t('consent_page_title')}
        </h1>
        <p className="text-xs font-bold app-muted mb-6 leading-relaxed">{t('consent_page_sub')}</p>
        {!studentId && (
          <p className="text-sm font-bold text-amber-400 mb-4">Select a child on the parent home screen and open “Record consent” again.</p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black app-muted mb-1">{t('consent_parent_name_label')}</label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              required
              autoComplete="name"
              className="w-full min-h-11 rounded-xl px-3 text-sm font-bold border"
              style={{ background: 'var(--app-surface-soft)', borderColor: 'var(--app-border)', color: 'rgb(var(--foreground-rgb))' }}
            />
          </div>
          <div>
            <label className="block text-xs font-black app-muted mb-1">{t('consent_parent_email_label')}</label>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full min-h-11 rounded-xl px-3 text-sm font-bold border"
              style={{ background: 'var(--app-surface-soft)', borderColor: 'var(--app-border)', color: 'rgb(var(--foreground-rgb))' }}
            />
          </div>
          <p className="text-[10px] font-bold app-muted">
            See also{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--app-accent)' }}>
              Privacy Policy
            </Link>
            .
          </p>
          <button
            type="submit"
            disabled={busy || !studentId}
            className="w-full min-h-11 rounded-xl text-sm font-black app-pressable active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--app-accent), rgba(94,92,230,0.85))', color: '#fff' }}
          >
            {busy ? t('consent_saving') : t('consent_submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ParentConsentPage() {
  return (
    <Suspense fallback={<Loading emoji="📋" text="Loading…" />}>
      <ConsentForm />
    </Suspense>
  )
}
