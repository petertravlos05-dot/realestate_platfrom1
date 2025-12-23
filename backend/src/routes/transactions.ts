import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import { generateId } from '../lib/utils/id';

const router = Router();

const VALID_STAGES = [
  'PENDING',
  'MEETING_SCHEDULED',
  'DEPOSIT_PAID',
  'FINAL_SIGNING',
  'COMPLETED',
  'CANCELLED'
] as const;

type Stage = typeof VALID_STAGES[number];

// Regex για έλεγχο UUID και CUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^[a-z0-9]+$/i;

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        property: true,
        progress: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        notifications: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const { stage, ...updateData } = req.body;

    const transaction = await prisma.transaction.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...updateData,
        ...(stage && {
          progress: {
            create: {
              stage,
              notes: `Stage updated to ${stage}`,
              createdById: req.userId!
            }
          }
        })
      },
      include: {
        property: true,
        progress: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        notifications: true,
      },
    });

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id - Delete transaction (buyer only)
router.delete('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'BUYER') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.buyerId !== req.userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await prisma.transaction.delete({ where: { id: req.params.id } });
    console.log(`[DELETE] Transaction ${req.params.id} deleted by buyer ${req.userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;















