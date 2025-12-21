import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/viewing-requests - Create viewing request
router.post('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, buyerId, date, time, endTime } = req.body;

    if (!propertyId || !buyerId || !date || !time) {
      return res.status(400).json({ error: 'Missing fields: propertyId, buyerId, date, and time are required' });
    }

    const viewingRequest = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId,
        date: new Date(date),
        time,
        endTime: endTime || time,
        status: 'PENDING',
      },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true,
      },
    });

    // Δημιουργία ειδοποίησης στον seller
    if (viewingRequest.property?.user?.id) {
      const formattedDate = new Date(date).toLocaleDateString('el-GR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await prisma.notification.create({
        data: {
          userId: viewingRequest.property.user.id,
          title: 'Νέο Αίτημα Ραντεβού',
          message: `Ο χρήστης ${viewingRequest.buyer.name} ζητά να προγραμματίσει ραντεβού για το ακίνητό σας "${viewingRequest.property.title}" στις ${formattedDate}.`,
          type: 'APPOINTMENT_REQUEST',
          propertyId: propertyId,
          metadata: JSON.stringify({
            viewingRequestId: viewingRequest.id,
            buyerId: buyerId,
            buyerName: viewingRequest.buyer.name,
            date: date,
            time: time,
            recipient: 'seller'
          })
        },
      });
    }

    res.json({ success: true, viewingRequest });
  } catch (error) {
    console.error('Error creating viewing request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/viewing-requests - Get viewing requests (with filters)
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { propertyId, buyerId, sellerId, status } = req.query;

    // Build where clause based on user role
    const where: any = {};

    if (userRole === 'SELLER') {
      // Seller sees only requests for their properties
      const properties = await prisma.property.findMany({
        where: { userId: userId },
        select: { id: true }
      });
      where.propertyId = { in: properties.map(p => p.id) };
    } else if (userRole === 'BUYER') {
      // Buyer sees only their own requests
      where.buyerId = userId;
    } else if (userRole === 'ADMIN') {
      // Admin sees all, can filter
      if (sellerId) {
        const properties = await prisma.property.findMany({
          where: { userId: sellerId as string },
          select: { id: true }
        });
        where.propertyId = { in: properties.map(p => p.id) };
      }
    }

    if (propertyId) {
      where.propertyId = propertyId as string;
    }

    if (buyerId) {
      where.buyerId = buyerId as string;
    }

    if (status) {
      where.status = status as string;
    }

    const viewingRequests = await prisma.viewingRequest.findMany({
      where,
      include: {
        property: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json({ viewingRequests });
  } catch (error) {
    console.error('Error fetching viewing requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/viewing-requests/:id - Get specific viewing request
router.get('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }

    // Authorization check
    if (userRole !== 'ADMIN') {
      if (userRole === 'BUYER' && viewingRequest.buyerId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (userRole === 'SELLER' && viewingRequest.property.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.json({ viewingRequest });
  } catch (error) {
    console.error('Error fetching viewing request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/viewing-requests/:id - Update viewing request
router.put('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }

    // Authorization check
    if (userRole !== 'ADMIN') {
      if (userRole === 'BUYER' && viewingRequest.buyerId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (userRole === 'SELLER' && viewingRequest.property.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { date, time, endTime, status } = req.body;

    const updatedRequest = await prisma.viewingRequest.update({
      where: { id: req.params.id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(time && { time }),
        ...(endTime && { endTime }),
        ...(status && { status })
      },
      include: {
        property: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({ success: true, viewingRequest: updatedRequest });
  } catch (error) {
    console.error('Error updating viewing request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/viewing-requests/:id/status - Update viewing request status
router.patch('/:id/status', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true
      }
    });

    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }

    // Authorization check
    if (userRole !== 'ADMIN') {
      if (userRole === 'BUYER' && viewingRequest.buyerId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (userRole === 'SELLER' && viewingRequest.property.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedRequest = await prisma.viewingRequest.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        property: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create notification based on status change
    if (status === 'ACCEPTED' && viewingRequest.buyerId) {
      await prisma.notification.create({
        data: {
          userId: viewingRequest.buyerId,
          title: 'Αίτημα Ραντεβού Εγκεκριμένο',
          message: `Το αίτημα ραντεβού σας για το ακίνητο "${viewingRequest.property.title}" έχει εγκριθεί.`,
          type: 'APPOINTMENT_ACCEPTED',
          propertyId: viewingRequest.propertyId,
          metadata: JSON.stringify({
            viewingRequestId: viewingRequest.id,
            date: viewingRequest.date,
            time: viewingRequest.time,
            recipient: 'buyer'
          })
        },
      });
    } else if (status === 'REJECTED' && viewingRequest.buyerId) {
      await prisma.notification.create({
        data: {
          userId: viewingRequest.buyerId,
          title: 'Αίτημα Ραντεβού Απορρίφθηκε',
          message: `Το αίτημα ραντεβού σας για το ακίνητο "${viewingRequest.property.title}" έχει απορριφθεί.`,
          type: 'APPOINTMENT_REJECTED',
          propertyId: viewingRequest.propertyId,
          metadata: JSON.stringify({
            viewingRequestId: viewingRequest.id,
            recipient: 'buyer'
          })
        },
      });
    }

    res.json({ success: true, viewingRequest: updatedRequest });
  } catch (error) {
    console.error('Error updating viewing request status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/viewing-requests/:id - Delete viewing request
router.delete('/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }

    // Authorization check
    if (userRole !== 'ADMIN') {
      if (userRole === 'BUYER' && viewingRequest.buyerId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (userRole === 'SELLER' && viewingRequest.property.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    await prisma.viewingRequest.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Viewing request deleted successfully' });
  } catch (error) {
    console.error('Error deleting viewing request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

