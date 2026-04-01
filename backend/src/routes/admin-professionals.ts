import { Router, Response } from 'express';
import { VerificationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import { buildAdminProfessionalDetail, listProfessionalsFromJoin } from '../lib/utils/admin-professional-detail';
import { auditLogger } from '../lib/utils/audit-logger';

const router = Router();

const ALLOWED_VERIFICATION: VerificationStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];

/** Επαγγελματίες με ProfessionalProfile (ρόλος LAWYER | NOTARY | ENGINEER | ACCOUNTANT) */
router.get('/from-join', validateJwtToken, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const professionals = await listProfessionalsFromJoin();
    res.json({ professionals });
  } catch (error) {
    console.error('admin-professionals from-join:', error);
    res.status(500).json({ error: 'Failed to list professionals' });
  }
});

router.get('/:userId/detail', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await buildAdminProfessionalDetail(req.params.userId);
    if (!data) {
      return res.status(404).json({ error: 'Χρήστης δεν βρέθηκε ή δεν είναι εγγεγραμμένος από την πύλη επαγγελματιών.' });
    }
    res.json(data);
  } catch (error) {
    console.error('admin-professionals detail:', error);
    res.status(500).json({ error: 'Failed to load professional detail' });
  }
});

/** Admin: αλλαγή verificationStatus του ProfessionalProfile */
router.patch(
  '/:userId/verification',
  validateJwtToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const next = req.body?.verificationStatus as string | undefined;
      if (!next || !ALLOWED_VERIFICATION.includes(next as VerificationStatus)) {
        return res.status(400).json({
          error: 'Άκυρο verificationStatus. Επιτρέπονται: PENDING, VERIFIED, REJECTED.',
        });
      }
      const status = next as VerificationStatus;

      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) {
        return res.status(404).json({ error: 'Δεν βρέθηκε προφίλ επαγγελματία για αυτόν τον χρήστη.' });
      }

      const updated = await prisma.professionalProfile.update({
        where: { userId },
        data: {
          verificationStatus: status,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
        },
        select: {
          id: true,
          verificationStatus: true,
          verifiedAt: true,
        },
      });

      if (status === 'VERIFIED') {
        auditLogger.professionalVerified(req, profile.id);
      } else if (status === 'REJECTED') {
        auditLogger.professionalRejected(req, profile.id);
      } else {
        auditLogger.professionalProfileUpdated(req, profile.id);
      }

      res.json({
        ok: true,
        verificationStatus: updated.verificationStatus,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      });
    } catch (error) {
      console.error('admin-professionals verification patch:', error);
      res.status(500).json({ error: 'Αποτυχία ενημέρωσης κατάστασης επαλήθευσης.' });
    }
  }
);

export default router;
