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

// GET /api/admin/transactions - Get all transactions (admin only)
router.get('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const cancelled = req.query.cancelled === 'true';

    const transactions = await prisma.transaction.findMany({
      where: {
        interestCancelled: cancelled
      },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true,
        seller: true,
        agent: true,
        progress: {
          include: {
            createdBy: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Πρώτα παίρνουμε όλα τα PropertyLeads
    const leads = await prisma.propertyLead.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'pending' },
          { status: 'MEETING_SCHEDULED' },
          { status: 'meeting_scheduled' },
          { status: 'VIEWING_SCHEDULED' },
          { status: 'viewing_scheduled' },
          { status: 'NEGOTIATING' },
          { status: 'negotiating' },
          { status: 'CLOSED' },
          { status: 'closed' },
          { status: 'COMPLETED' },
          { status: 'completed' },
          { status: 'CANCELLED' },
          { status: 'cancelled' }
        ],
        interestCancelled: cancelled
      },
      include: {
        buyer: {
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
        },
        property: {
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format leads and transactions
    const formattedTransactions = [
      ...leads.map((lead: any) => ({
        id: lead.id,
        buyer: {
          name: lead.buyer.name,
          email: lead.buyer.email,
          phone: lead.buyer.phone ?? ""
        },
        seller: {
          name: lead.property.user.name,
          email: lead.property.user.email,
          phone: lead.property.user.phone ?? ""
        },
        agent: lead.agent ? {
          name: lead.agent.name,
          email: lead.agent.email,
          phone: lead.agent.phone ?? ""
        } : undefined,
        property: {
          id: lead.property.id,
          title: lead.property.title,
          status: lead.property.status,
          price: lead.property.price,
          images: lead.property.images
        },
        status: lead.status ?? "",
        createdAt: lead.createdAt.toISOString(),
        progress: {
          stage: lead.status ?? "",
          updatedAt: lead.updatedAt.toISOString(),
          notifications: []
        }
      })),
      ...transactions.map((transaction: any) => ({
        id: transaction.id,
        buyer: {
          name: transaction.buyer.name,
          email: transaction.buyer.email,
          phone: transaction.buyer.phone ?? ""
        },
        seller: {
          name: transaction.property.user.name,
          email: transaction.property.user.email,
          phone: transaction.property.user.phone ?? ""
        },
        agent: transaction.agent ? {
          name: transaction.agent.name,
          email: transaction.agent.email,
          phone: transaction.agent.phone ?? ""
        } : undefined,
        property: {
          id: transaction.property.id,
          title: transaction.property.title,
          status: transaction.property.status,
          price: transaction.property.price,
          images: transaction.property.images
        },
        status: transaction.status ?? "",
        createdAt: transaction.createdAt.toISOString(),
        progress: {
          stage: transaction.progress[0]?.stage ?? transaction.status ?? "",
          updatedAt: transaction.progress[0]?.createdAt?.toISOString() || transaction.updatedAt?.toISOString() || transaction.createdAt.toISOString(),
          notifications: transaction.progress.map((p: any) => ({
            id: p.id,
            message: p.notes ?? "",
            recipient: p.createdBy.email === transaction.buyer.email ? 'buyer' :
              p.createdBy.email === transaction.property.user.email ? 'seller' :
                p.createdBy.email === transaction.agent?.email ? 'agent' : '',
            createdAt: p.createdAt.toISOString()
          }))
        }
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: 'An unexpected error occurred'
    });
  }
});

// PUT /api/admin/transactions - Update transaction (admin only)
router.put('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, stage, message, recipient } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        buyer: true,
        agent: true,
        property: {
          include: {
            user: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Ενημέρωση του σταδίου της συναλλαγής
    const progress = await prisma.transactionProgress.create({
      data: {
        transactionId,
        stage,
        notes: message,
        createdById: req.userId!
      }
    });

    // Δημιουργία ειδοποίησης για τον παραλήπτη
    let recipientId;
    if (recipient === 'buyer') {
      recipientId = transaction.buyerId;
    } else if (recipient === 'seller') {
      recipientId = transaction.property.userId;
    } else if (recipient === 'agent' && transaction.agentId) {
      recipientId = transaction.agentId;
    }

    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          title: 'Ενημέρωση Συναλλαγής',
          message,
          type: 'TRANSACTION_UPDATE',
          propertyId: transaction.propertyId
        }
      });
    }

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/transactions/:id - Get transaction by ID (admin only)
router.get('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            licenseNumber: true,
          }
        },
        progress: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            }
          }
        },
        notifications: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
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

// PATCH /api/admin/transactions/:id - Update transaction (admin only)
router.patch('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { interestCancelled } = req.body;

    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { interestCancelled }
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/transactions/:id/stage - Update transaction stage (admin only)
router.put('/:id/stage', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const normalizedStage = stage.toUpperCase();

    // Έλεγχος εγκυρότητας του ID
    if (!id || (UUID_REGEX.test(id) === false && CUID_REGEX.test(id) === false)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Έλεγχος εγκυρότητας του stage
    if (!VALID_STAGES.includes(normalizedStage as Stage)) {
      return res.status(400).json({
        error: `Invalid transaction stage. Must be one of: ${VALID_STAGES.join(', ')}`
      });
    }

    let transaction;

    // Αν το ID είναι UUID, είναι propertyLead ή connectionId
    if (UUID_REGEX.test(id)) {
      const propertyLead = await prisma.propertyLead.findUnique({
        where: { id },
        include: {
          buyer: true,
          property: {
            include: {
              user: true
            }
          },
          transaction: true
        }
      });

      if (propertyLead) {
        if (propertyLead.transaction) {
          transaction = propertyLead.transaction;
        } else {
          transaction = await prisma.transaction.create({
            data: {
              propertyId: propertyLead.propertyId,
              buyerId: propertyLead.buyerId,
              sellerId: propertyLead.property.userId,
              agentId: propertyLead.agentId,
              stage: normalizedStage,
              leadId: propertyLead.id
            }
          });

          await prisma.propertyLead.update({
            where: { id: propertyLead.id },
            data: { transactionId: transaction.id }
          });
        }
      } else {
        const connection = await prisma.buyerAgentConnection.findUnique({
          where: { id },
          include: {
            buyer: true,
            property: {
              include: {
                user: true
              }
            }
          }
        });

        if (!connection) {
          return res.status(404).json({ error: 'PropertyLead or Connection not found' });
        }

        transaction = await prisma.transaction.create({
          data: {
            propertyId: connection.propertyId,
            buyerId: connection.buyerId,
            sellerId: connection.property.userId,
            agentId: connection.agentId,
            stage: normalizedStage,
            leadId: connection.id
          }
        });
      }
    } else {
      transaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (!transaction) {
        const lead = await prisma.propertyLead.findUnique({
          where: { id },
          include: {
            transaction: true,
            property: {
              include: {
                user: true
              }
            }
          }
        });

        if (lead) {
          if (lead.transaction) {
            transaction = lead.transaction;
          } else {
            transaction = await prisma.transaction.create({
              data: {
                propertyId: lead.propertyId,
                buyerId: lead.buyerId,
                sellerId: lead.property.userId,
                agentId: lead.agentId,
                stage: normalizedStage,
                leadId: lead.id
              }
            });

            await prisma.propertyLead.update({
              where: { id: lead.id },
              data: { transactionId: transaction.id }
            });
          }
        } else {
          return res.status(404).json({ error: 'Transaction not found' });
        }
      }
    }

    // Ενημερώνουμε το stage της συναλλαγής
    transaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        stage: normalizedStage,
        progress: {
          create: {
            stage: normalizedStage,
            notes: `Stage updated to ${normalizedStage}`,
            createdById: req.userId!
          }
        }
      }
    });

    // Δημιουργούμε ειδοποίηση για τον buyer
    await prisma.notification.create({
      data: {
        id: generateId(),
        title: 'Transaction Stage Updated',
        message: `Transaction stage updated to ${normalizedStage}`,
        type: 'STAGE_UPDATE',
        isRead: false,
        userId: transaction.buyerId,
        propertyId: transaction.propertyId,
        metadata: JSON.stringify({
          leadId: transaction.leadId,
          transactionId: transaction.id,
          stage: normalizedStage,
          shouldOpenModal: true
        })
      }
    });

    // Δημιουργούμε ειδοποίηση για τον agent αν υπάρχει
    if (transaction.agentId) {
      const buyer = await prisma.user.findUnique({
        where: { id: transaction.buyerId },
        select: { name: true, email: true }
      });

      const property = await prisma.property.findUnique({
        where: { id: transaction.propertyId },
        select: { title: true }
      });

      const stageTranslations: { [key: string]: string } = {
        'PENDING': 'Αναμονή για ραντεβού',
        'MEETING_SCHEDULED': 'Έγινε ραντεβού',
        'DEPOSIT_PAID': 'Έγινε προκαταβολή',
        'FINAL_SIGNING': 'Τελική υπογραφή',
        'COMPLETED': 'Ολοκληρώθηκε',
        'CANCELLED': 'Ακυρώθηκε'
      };

      const stageInGreek = stageTranslations[normalizedStage] || normalizedStage;
      const buyerName = buyer?.name || 'Άγνωστος ενδιαφερόμενος';
      const propertyTitle = property?.title || 'Άγνωστο ακίνητο';

      await prisma.notification.create({
        data: {
          id: generateId(),
          title: 'Ενημέρωση Στάδιου Συναλλαγής',
          message: `Η συναλλαγή με τον ${buyerName} για το ακίνητο "${propertyTitle}" ενημερώθηκε σε: ${stageInGreek}`,
          type: 'AGENT_STAGE_UPDATE',
          isRead: false,
          userId: transaction.agentId,
          propertyId: transaction.propertyId,
          metadata: JSON.stringify({
            leadId: transaction.leadId,
            transactionId: transaction.id,
            stage: normalizedStage,
            stageInGreek: stageInGreek,
            buyerId: transaction.buyerId,
            buyerName: buyerName,
            propertyTitle: propertyTitle,
            recipient: 'agent',
            shouldOpenModal: true
          })
        }
      });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction stage:', error);
    res.status(500).json({ error: 'Failed to update transaction stage' });
  }
});

// GET /api/admin/transactions/:id/progress - Get transaction progress (admin only)
router.get('/:id/progress', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const progress = await prisma.transactionProgress.findFirst({
      where: {
        transactionId: req.params.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json(progress || { currentStage: 'INQUIRY', comment: '' });
  } catch (error) {
    console.error('Error fetching transaction progress:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/transactions/:id/progress - Create transaction progress (admin only)
router.post('/:id/progress', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { stage, notes } = req.body;

    const progress = await prisma.transactionProgress.create({
      data: {
        id: generateId(),
        transactionId: req.params.id,
        stage,
        notes,
        createdById: req.userId!
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Error creating progress:', error);
    res.status(500).json({ error: 'Failed to create progress' });
  }
});

// POST /api/admin/transactions/:id/notifications - Create transaction notification (admin only)
router.post('/:id/notifications', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;

    // Check if TransactionNotification model exists, otherwise use Notification
    const notification = await prisma.notification.create({
      data: {
        id: generateId(),
        userId: req.userId!,
        title: 'Transaction Notification',
        message,
        type: 'TRANSACTION_NOTIFICATION',
        isRead: false,
        metadata: {
          transactionId: req.params.id
        }
      }
    });

    res.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;





