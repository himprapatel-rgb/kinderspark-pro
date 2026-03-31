import type { Request, Response } from 'express'
import prisma from '../prisma/client'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'
import { deleteStudentAndRelatedData } from '../services/privacy.service'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim(); // left-most = original client (typical)
  }
  const raw = req.socket?.remoteAddress;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return 'unknown';
}

export async function getConsent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { studentId } = req.params
    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' })
      return
    }

    const studentRow = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true },
    })
    if (!studentRow) {
      res.status(404).json({ error: 'Student not found' })
      return
    }

    if (role === 'parent') {
      const ok = await canParentAccessStudent(userId, studentId)
      if (!ok) {
        res.status(403).json({ error: 'You do not have access to this child' })
        return
      }
    } else if (role === 'teacher') {
      const ok = await canTeacherAccessClass(userId, studentRow.classId)
      if (!ok) {
        res.status(403).json({ error: 'Student is not in your class' })
        return
      }
    } else if (role !== 'admin' && role !== 'principal') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const consent = await prisma.parentalConsent.findUnique({
      where: { studentId },
    })
    res.json({
      hasConsent: !!consent,
      consent: consent
        ? {
            id: consent.id,
            studentId: consent.studentId,
            parentName: consent.parentName,
            parentEmail: consent.parentEmail,
            consentedAt: consent.consentedAt.toISOString(),
          }
        : null, // do not expose ipAddress to client unless needed for audit UI later
    });
  } catch (e) {
    console.error('[getConsent]', e);
    res.status(500).json({ error: 'Failed to load consent' });
  }
}

export async function postConsent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (role !== 'parent' && role !== 'admin' && role !== 'principal') {
      res.status(403).json({ error: 'Only a parent, admin, or principal can record consent' });
      return;
    }

    const { studentId, parentName, parentEmail } = (req.body ?? {}) as {
      studentId?: string;
      parentName?: string;
      parentEmail?: string;
    };
    if (!studentId || typeof parentName !== 'string' || typeof parentEmail !== 'string') {
      res.status(400).json({ error: 'studentId, parentName, and parentEmail are required' });
      return;
    }
    const nameTrim = parentName.trim();
    const emailTrim = parentEmail.trim().toLowerCase();
    if (!nameTrim || !emailTrim || !EMAIL_RE.test(emailTrim)) {
      res.status(400).json({ error: 'Invalid parent name or email' });
      return;
    }

    if (role === 'parent') {
      const ok = await canParentAccessStudent(userId, studentId);
      if (!ok) {
        res.status(403).json({ error: 'You do not have access to this child' });
        return;
      }
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const consent = await prisma.parentalConsent.upsert({
      where: { studentId },
      create: {
        studentId,
        parentName: nameTrim,
        parentEmail: emailTrim,
        ipAddress: clientIp(req),
      },
      update: {
        parentName: nameTrim,
        parentEmail: emailTrim,
        ipAddress: clientIp(req),
      },
    });

    res.status(201).json({
      success: true,
      consent: {
        id: consent.id,
        studentId: consent.studentId,
        parentName: consent.parentName,
        parentEmail: consent.parentEmail,
        consentedAt: consent.consentedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[postConsent]', e);
    res.status(500).json({ error: 'Failed to save consent' });
  }
}

export async function deleteChildData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (role === 'child') {
      res.status(403).json({ error: 'Child accounts cannot delete via this endpoint. A parent or admin must request erasure.' })
      return
    }
    if (role !== 'parent' && role !== 'admin' && role !== 'principal') {
      res.status(403).json({ error: 'Only a parent or school admin can delete a child account and related data.' })
      return
    }

    const { studentId } = req.params
    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' })
      return
    }

    if (role === 'parent') {
      const ok = await canParentAccessStudent(userId, studentId)
      if (!ok) {
        res.status(403).json({ error: 'You do not have access to this child' })
        return
      }
    }

    const exists = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!exists) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    await deleteStudentAndRelatedData(studentId);
    res.json({ success: true, deleted: studentId });
  } catch (e) {
    console.error('[deleteChildData]', e);
    res.status(500).json({ error: 'Failed to delete data' });
  }
}
