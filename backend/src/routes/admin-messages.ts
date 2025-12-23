import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/admin/messages - Get all support tickets with filters (admin only)
router.get('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const priority = req.query.priority as string || '';
    const category = req.query.category as string || '';
    const transactionStage = req.query.transactionStage as string || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { property: { title: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (transactionStage && transactionStage !== 'all') {
      where.transaction = {
        stage: transactionStage
      };
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        property: {
          select: {
            id: true,
            title: true
          }
        },
        transaction: {
          select: {
            id: true,
            stage: true,
            property: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/messages - Create support ticket as admin (admin only)
router.post('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, title, description, category, priority, propertyId, transactionId } = req.body;

    if (!userId || !title || !description || !category || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        createdBy: req.userId!,
        title,
        description,
        category,
        priority,
        propertyId: propertyId || undefined,
        transactionId: transactionId || undefined,
        messages: {
          create: [{
            content: description,
            userId: req.userId!,
            isFromAdmin: true
          }]
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        property: { select: { id: true, title: true } },
        transaction: { select: { id: true, stage: true, property: { select: { id: true, title: true } } } },
        messages: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({ ticket });
  } catch (error) {
    console.error('Error creating support ticket as admin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/admin/messages/:ticketId/status - Update ticket status (admin only)
router.patch('/:ticketId/status', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: req.params.ticketId },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        property: {
          select: {
            id: true,
            title: true
          }
        },
        transaction: {
          select: {
            id: true,
            stage: true,
            property: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;













