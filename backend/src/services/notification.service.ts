import prisma from '../prisma/client'

const ONESIGNAL_APP_ID  = process.env.ONESIGNAL_APP_ID
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY

export async function sendPushNotification(
  title: string,
  body: string,
  studentId?: string
): Promise<void> {
  // Always log locally (useful in dev / when OneSignal not configured)
  console.log(`[Push] ${title}: ${body}${studentId ? ` → ${studentId}` : ''}`)

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return

  // Resolve optional push token stored on the student record
  let externalId = studentId // default: use studentId as external_user_id
  if (studentId) {
    try {
      const s = await prisma.student.findUnique({
        where: { id: studentId },
        select: { pushToken: true },
      })
      if (s?.pushToken) externalId = s.pushToken
    } catch { /* non-fatal */ }
  }

  const payload: Record<string, any> = {
    app_id:   ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: body },
  }

  if (externalId) {
    payload.include_external_user_ids = [externalId]
  } else {
    payload.included_segments = ['All']
  }

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) console.error('[OneSignal]', await res.text())
  } catch (err) {
    console.error('[OneSignal] network error:', err)
  }
}
