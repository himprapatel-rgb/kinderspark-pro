import webpush from 'web-push';

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
