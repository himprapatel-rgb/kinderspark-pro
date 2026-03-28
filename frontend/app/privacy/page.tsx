'use client'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="text-sm font-bold mb-6 flex items-center gap-1 app-pressable"
          style={{ color: 'var(--app-accent)' }}
        >
          ← Back
        </button>

        <h1 className="text-2xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          Privacy Policy
        </h1>
        <p className="text-xs font-bold mb-8 app-muted">Last updated: March 28, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb))' }}>

          <Section title="1. Introduction">
            KinderSpark Pro (&quot;the App&quot;) is an educational platform designed for children aged 4–10,
            their parents, and teachers. We take privacy seriously, especially because our users
            include children. This policy explains what data we collect, why, and how we protect it.
          </Section>

          <Section title="2. COPPA Compliance">
            KinderSpark Pro is designed to be compliant with the Children&apos;s Online Privacy Protection
            Act (COPPA). We do not collect personal information from children under 13 without
            verifiable parental consent. Children access the app through PIN codes set up by their
            parents or teachers — we do not collect children&apos;s email addresses, phone numbers,
            or location data.
          </Section>

          <Section title="3. Data We Collect">
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li><strong>Account data:</strong> Display name, optional email, role (child/parent/teacher/admin), and a hashed PIN (never stored in plaintext)</li>
              <li><strong>Learning data:</strong> Progress scores, stars earned, badges, homework completions, and AI tutoring sessions</li>
              <li><strong>Usage data:</strong> Login timestamps, streak counts, and session durations for educational engagement tracking</li>
              <li><strong>Teacher-created content:</strong> Homework assignments, syllabuses, class photos, and messages</li>
            </ul>
          </Section>

          <Section title="4. Data We Do NOT Collect">
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>We do NOT collect precise location data</li>
              <li>We do NOT use advertising trackers or analytics SDKs</li>
              <li>We do NOT sell or share personal data with third parties for marketing</li>
              <li>We do NOT collect biometric data</li>
              <li>We do NOT use cookies for tracking (only for session authentication)</li>
            </ul>
          </Section>

          <Section title="5. AI Features">
            Our app uses AI services (Google Gemini, OpenAI) for educational content generation,
            tutoring feedback, and learning recommendations. Data sent to AI providers includes
            only the educational context needed (e.g., &quot;generate a math question for age 5&quot;) —
            never personally identifiable information about the child.
          </Section>

          <Section title="6. Data Storage & Security">
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>All data is stored on secure servers hosted by Railway (cloud infrastructure)</li>
              <li>PINs are hashed using bcrypt before storage</li>
              <li>All communication uses HTTPS encryption</li>
              <li>Authentication uses JWT tokens with automatic expiration</li>
              <li>Refresh tokens are stored in HTTP-only secure cookies</li>
            </ul>
          </Section>

          <Section title="7. Account Deletion">
            Users can delete their account and all associated data at any time from the
            Profile section of the app (Settings → Account → Delete Account). Upon deletion,
            all personal data, learning progress, and associated records are permanently removed
            from our servers within 30 days.
          </Section>

          <Section title="8. Parental Rights">
            Parents and guardians have the right to:
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>Review their child&apos;s personal information</li>
              <li>Request deletion of their child&apos;s data</li>
              <li>Refuse further collection of their child&apos;s data</li>
              <li>Contact us with any privacy concerns</li>
            </ul>
          </Section>

          <Section title="9. Third-Party Services">
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li><strong>Google Gemini / OpenAI:</strong> AI-powered educational content (no PII shared)</li>
              <li><strong>Railway:</strong> Cloud hosting infrastructure</li>
              <li><strong>Google Fonts:</strong> Typography (no tracking)</li>
            </ul>
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify users of any
            material changes through the app. Continued use of the app after changes constitutes
            acceptance of the updated policy.
          </Section>

          <Section title="11. Contact Us">
            For privacy questions, data requests, or concerns:
            <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <p className="font-bold">KinderSpark Pro Support</p>
              <p className="app-muted">Email: privacy@kinderspark.com</p>
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
