'use client';
import { useState, useEffect } from 'react';
import { API_BASE, postPushSubscribe } from '@/lib/api';

export function usePushNotifications(scope: 'student' | 'parent', studentId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (scope === 'student' && !studentId) return;

    await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    const reg = await navigator.serviceWorker.ready;

    const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`, { credentials: 'include' });
    const { publicKey } = await vapidRes.json();
    if (!publicKey) return;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const subscription = JSON.stringify(sub);
    await postPushSubscribe({
      scope,
      ...(scope === 'student' ? { studentId } : {}),
      subscription,
    });
  }

  return { permission, subscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}
