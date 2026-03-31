import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { resolveStudentIdForPushToken } from '../utils/webPushTarget';

const router = Router();

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

/**
 * POST /api/push/subscribe
 * body: { scope: 'student' | 'parent', studentId?: string, subscription: object | JSON string }
 * Persists PushManager subscription for student devices and/or parent profile (multi-device).
 */
router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const rawSub = req.body?.subscription;
    const scope = String(req.body?.scope || 'student').toLowerCase();

    if (rawSub == null) {
      return res.status(400).json({ error: 'subscription required' });
    }
    const subObj = typeof rawSub === 'string' ? JSON.parse(rawSub) : rawSub;
    const endpoint = subObj?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint) {
      return res.status(400).json({ error: 'subscription.endpoint required' });
    }
    const json = typeof rawSub === 'string' ? rawSub : JSON.stringify(rawSub);

    if (scope === 'parent') {
      if (req.user?.role !== 'parent') {
        return res.status(403).json({ error: 'Only parents can use parent scope' });
      }
      const pp = await prisma.parentProfile.findFirst({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!pp) {
        return res.status(400).json({ error: 'Parent profile not found' });
      }
      await prisma.webPushSubscription.upsert({
        where: { endpoint },
        create: { endpoint, subscriptionJson: json, parentProfileId: pp.id, studentId: null },
        update: { subscriptionJson: json, parentProfileId: pp.id, studentId: null },
      });
      return res.status(201).json({ success: true });
    }

    if (scope === 'student') {
      const paramId = String(req.body?.studentId || '').trim();
      if (!paramId) {
        return res.status(400).json({ error: 'studentId required for student scope' });
      }
      const resolved = await resolveStudentIdForPushToken(req, paramId);
      if ('error' in resolved) {
        return res.status(resolved.status).json({ error: resolved.error });
      }
      await prisma.webPushSubscription.upsert({
        where: { endpoint },
        create: { endpoint, subscriptionJson: json, studentId: resolved.studentId, parentProfileId: null },
        update: { subscriptionJson: json, studentId: resolved.studentId, parentProfileId: null },
      });
      return res.status(201).json({ success: true });
    }

    return res.status(400).json({ error: 'scope must be student or parent' });
  } catch (e) {
    console.error('[push/subscribe]', e);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
});

export default router;
