import webpush from 'web-push';
import prisma from '../prisma/client';

// VAPID keys - generate once, store in env
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@kinderspark.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured, skipping push notification');
    return;
  }
  try {
    const sub = JSON.parse(subscription);
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    console.error('[Push] Failed to send notification:', err);
  }
}

export async function sendHomeworkReminder(
  pushToken: string,
  studentName: string,
  homeworkTitle: string
): Promise<void> {
  await sendPushNotification(pushToken, {
    title: `📚 Homework reminder for ${studentName}`,
    body: `"${homeworkTitle}" is due soon!`,
    url: '/child'
  });
}

export async function sendGradeNotification(
  pushToken: string,
  studentName: string,
  grade: string
): Promise<void> {
  await sendPushNotification(pushToken, {
    title: `⭐ New grade for ${studentName}`,
    body: `Your teacher gave a grade of ${grade}`,
    url: '/parent'
  });
}

function pushEndpointFromJson(subscriptionJson: string): string | null {
  try {
    const o = JSON.parse(subscriptionJson) as { endpoint?: string }
    return typeof o?.endpoint === 'string' && o.endpoint.length > 0 ? o.endpoint : null
  } catch {
    return null
  }
}

/** Sends one payload to many subscription JSON blobs; dedupes by Push `endpoint`. */
export async function sendPushPayloadFanout(
  subscriptionJsonStrings: string[],
  payload: PushPayload
): Promise<void> {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const json of subscriptionJsonStrings) {
    const ep = pushEndpointFromJson(json)
    if (!ep || seen.has(ep)) continue
    seen.add(ep)
    unique.push(json)
  }
  await Promise.all(unique.map((json) => sendPushNotification(json, payload)))
}

/**
 * Notifies all Web Push targets for a roster student: legacy `Student.pushToken`,
 * all `WebPushSubscription` rows for that student, and all parent devices linked via `StudentProfile` / `ParentChildLink`.
 */
export async function notifyStudentPushSubscribers(
  studentId: string,
  payload: PushPayload
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { pushToken: true },
  })
  const studentSubs = await prisma.webPushSubscription.findMany({
    where: { studentId },
    select: { subscriptionJson: true },
  })

  const profiles = await prisma.studentProfile.findMany({
    where: { legacyStudentId: studentId },
    select: { id: true },
  })
  let parentSubs: { subscriptionJson: string }[] = []
  if (profiles.length > 0) {
    const links = await prisma.parentChildLink.findMany({
      where: { studentProfileId: { in: profiles.map((p) => p.id) } },
      select: { parentProfileId: true },
    })
    const parentIds = [...new Set(links.map((l) => l.parentProfileId))]
    if (parentIds.length > 0) {
      parentSubs = await prisma.webPushSubscription.findMany({
        where: { parentProfileId: { in: parentIds } },
        select: { subscriptionJson: true },
      })
    }
  }

  const jsons: string[] = []
  if (student?.pushToken) jsons.push(student.pushToken)
  studentSubs.forEach((s) => jsons.push(s.subscriptionJson))
  parentSubs.forEach((s) => jsons.push(s.subscriptionJson))

  await sendPushPayloadFanout(jsons, payload)
}
