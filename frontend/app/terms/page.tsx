'use client'
import { useRouter } from 'next/navigation'

export default function TermsOfServicePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <button
          onClick={() => router.back()}
          className="text-sm font-bold mb-6 flex items-center gap-1 app-pressable"
          style={{ color: 'var(--app-accent)' }}
        >
          ← Back
        </button>

        <h1 className="text-2xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          Terms of Service
        </h1>
        <p className="text-xs font-bold mb-8 app-muted">Last updated: March 28, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb))' }}>

          <Section title="1. Acceptance of Terms">
            By downloading, installing, or using KinderSpark Pro (&quot;the App&quot;), you agree to
            be bound by these Terms of Service. If you do not agree, please do not use the App.
          </Section>

          <Section title="2. Description of Service">
            KinderSpark Pro is an AI-powered educational platform designed for children aged 4–10,
            their parents, and teachers. The App provides learning activities, progress tracking,
            homework management, parent-teacher communication, and AI-assisted tutoring.
          </Section>

          <Section title="3. User Accounts">
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>Users must create an account with a display name and 4-digit PIN</li>
              <li>Children&apos;s accounts require parental consent</li>
              <li>You are responsible for maintaining the security of your PIN</li>
              <li>Each account is assigned a unique Profile ID for identification</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            You agree to:
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>Use the App only for lawful, educational purposes</li>
              <li>Not share your account credentials with unauthorized persons</li>
              <li>Not attempt to access other users&apos; accounts or data</li>
              <li>Not upload inappropriate content</li>
              <li>Not interfere with or disrupt the App&apos;s services</li>
            </ul>
          </Section>

          <Section title="5. Content & Intellectual Property">
            All content in KinderSpark Pro, including educational materials, AI-generated content,
            icons, animations, and UI design, is the intellectual property of KinderSpark Pro.
            User-generated content (such as photos and messages) remains the property of the user.
          </Section>

          <Section title="6. AI-Generated Content">
            The App uses AI services to generate educational content and provide tutoring feedback.
            While we strive for accuracy, AI-generated content may contain errors. It is provided
            for educational support only and should not replace professional educational guidance.
          </Section>

          <Section title="7. Privacy">
            Your privacy is important to us. Please review our{' '}
            <span
              className="underline cursor-pointer"
              style={{ color: 'var(--app-accent)' }}
              onClick={() => router.push('/privacy')}
            >
              Privacy Policy
            </span>{' '}
            to understand how we collect, use, and protect your data.
          </Section>

          <Section title="8. Account Termination">
            You may delete your account at any time from the Profile section of the App.
            We reserve the right to suspend or terminate accounts that violate these terms.
          </Section>

          <Section title="9. Disclaimer of Warranties">
            The App is provided &quot;as is&quot; without warranties of any kind, either express or
            implied. We do not guarantee uninterrupted, error-free, or secure access to the App.
          </Section>

          <Section title="10. Limitation of Liability">
            To the maximum extent permitted by law, KinderSpark Pro shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of the App.
          </Section>

          <Section title="11. Changes to Terms">
            We may update these Terms from time to time. Continued use of the App after changes
            constitutes acceptance of the updated terms.
          </Section>

          <Section title="12. Contact">
            <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <p className="font-bold">KinderSpark Pro Support</p>
              <p className="app-muted">Email: support@kinderspark.com</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>{title}</h2>
      <div className="app-muted">{children}</div>
    </div>
  )
}
