import sgMail from '@sendgrid/mail'

const FROM = process.env.FROM_EMAIL || 'noreply@kinderspark.app'

function appBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://kinderspark-pro-production.up.railway.app'
  ).replace(/\/$/, '')
}

function configured(): boolean {
  return !!process.env.SENDGRID_API_KEY
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!configured()) {
    const msg = '[email] SENDGRID_API_KEY not set — outbound email skipped (no SendGrid)'
    if (process.env.NODE_ENV === 'production') {
      console.error(msg, { destinationPresent: Boolean(to && to.includes('@')) })
    } else {
      console.warn(msg)
    }
    return
  }
  if (!to || !to.includes('@')) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY as string)
  try {
    await sgMail.send({ to, from: FROM, subject, html })
  } catch (err) {
    console.error('[email] send failed:', err)
  }
}

export async function notifyParentNewMessage(
  parentEmail: string,
  teacherName: string,
  childName: string,
  preview: string
): Promise<void> {
  const safe = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
  await sendEmail(
    parentEmail,
    `New message about ${childName} from ${teacherName}`,
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#5E5CE6">KinderSpark</h2>
        <p><strong>${teacherName}</strong> sent a message about <strong>${childName}</strong>:</p>
        <blockquote style="background:#f5f5fb;border-left:4px solid #5E5CE6;padding:12px 16px;border-radius:4px">${safe}</blockquote>
        <a href="${appBaseUrl()}/parent"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:#5E5CE6;color:white;border-radius:8px;text-decoration:none">
          Open Parent App
        </a>
      </div>
    `
  )
}

export async function notifyTeacherParentReply(
  teacherEmail: string,
  parentLabel: string,
  childName: string,
  preview: string
): Promise<void> {
  const safe = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
  await sendEmail(
    teacherEmail,
    `${parentLabel} — reply about ${childName}`,
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#5E5CE6">KinderSpark</h2>
        <p><strong>${parentLabel}</strong> replied (re: ${childName}):</p>
        <blockquote style="background:#f5f5fb;border-left:4px solid #5E5CE6;padding:12px 16px;border-radius:4px">${safe}</blockquote>
        <a href="${appBaseUrl()}/teacher"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:#5E5CE6;color:white;border-radius:8px;text-decoration:none">
          Open Teacher App
        </a>
      </div>
    `
  )
}

export async function sendWeeklyReportEmail(
  parentEmail: string,
  childName: string,
  reportText: string
): Promise<void> {
  const safe = reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  await sendEmail(
    parentEmail,
    `${childName}'s weekly report`,
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#5E5CE6">KinderSpark weekly report</h2>
        <h3>${childName}</h3>
        <div style="background:#f9f9fc;padding:16px;border-radius:8px;white-space:pre-wrap">${safe}</div>
        <a href="${appBaseUrl()}/parent"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:#5E5CE6;color:white;border-radius:8px;text-decoration:none">
          See progress
        </a>
      </div>
    `
  )
}

export async function notifyThreadNewMessage(
  recipientEmails: string[],
  senderName: string,
  preview: string
): Promise<void> {
  if (!recipientEmails.length) return
  const safe = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
  await Promise.all(
    recipientEmails.map((to) =>
      sendEmail(
        to,
        `New KinderSpark message from ${senderName}`,
        `<div style="font-family:sans-serif;max-width:480px"><p><strong>${senderName}</strong>:</p>
        <blockquote style="background:#f5f5fb;padding:12px;border-radius:8px">${safe}</blockquote>
        <p><a href="${appBaseUrl()}/parent">Open app</a></p></div>`
      )
    )
  )
}
