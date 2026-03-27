'use client';
import { useState, useEffect } from 'react';
import { API_BASE, getRawToken } from '@/lib/api';

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d5ccc2e0-20b1-4fcf-845d-ede26b674430',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePushNotifications.ts:subscribe',message:'Push subscribe called',data:{apiBase:API_BASE,studentId},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const vapidRes = await fetch(`${API_BASE}/push/vapid-public-key`);
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
      const token = getRawToken();
      await fetch(`${API_BASE}/students/${studentId}/push-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}
