'use client';
import { useState, useEffect } from 'react';

export function usePushNotifications(studentId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const reg = await navigator.serviceWorker.ready;
    const vapidRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/vapid-public-key`);
    const { publicKey } = await vapidRes.json();
    if (!publicKey) return;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    if (studentId) {
      const token = localStorage.getItem('kinderspark-token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/students/${studentId}/push-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: JSON.stringify(sub) })
      });
    }
  }

  return { permission, subscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
