import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/debug/user-data - Get user data for debugging
router.get('/user-data', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const requestedUserId = req.query.userId as string;
    const requestedRole = req.query.role as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin or requesting data for another user
    if (requestedUserId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Use requestedUserId if provided, otherwise use current user
    const targetUserId = requestedUserId || userId;
    const userRole = requestedRole?.toUpperCase() || req.userRole || 'BUYER';

    console.log('API Debug:', { userId: targetUserId, userRole, requestedUserId, requestedRole });

    let properties: any[] = [];
    let transactions: any[] = [];

    // Fetch properties based on requested role
    if (userRole === 'SELLER') {
      // Seller sees their own properties
      properties = await prisma.property.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          title: true,
          city: true,
          street: true,
          number: true
        }
      });
    } else if (userRole === 'AGENT') {
      // Agent sees properties they're connected to
      const connections = await prisma.buyerAgentConnection.findMany({
        where: { agentId: targetUserId },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              street: true,
              number: true
            }
          }
        }
      });
      properties = connections.map(c => c.property).filter(Boolean);
    } else if (userRole === 'BUYER') {
      // Buyer sees properties they're interested in
      const interestedProperties = await prisma.propertyLead.findMany({
        where: { buyerId: targetUserId },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              street: true,
              number: true
            }
          }
        }
      });
      properties = interestedProperties.map(p => p.property).filter(Boolean);
    }

    // Fetch transactions based on requested role
    if (userRole === 'BUYER') {
      // Buyer transactions
      transactions = await prisma.transaction.findMany({
        where: { buyerId: targetUserId },
        select: {
          id: true,
          status: true,
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } else if (userRole === 'SELLER') {
      // Seller transactions
      transactions = await prisma.transaction.findMany({
        where: { sellerId: targetUserId },
        select: {
          id: true,
          status: true,
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } else if (userRole === 'AGENT') {
      // Agent transactions
      transactions = await prisma.transaction.findMany({
        where: {
          agentId: targetUserId,
          NOT: {
            status: 'CANCELLED'
          }
        },
        select: {
          id: true,
          status: true,
          property: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    const result = {
      properties: properties.map(p => ({
        id: p.id,
        title: p.title,
        address: `${p.city}, ${p.street} ${p.number}`
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        status: t.status,
        property: t.property
      }))
    };

    console.log('API Result:', {
      propertiesCount: result.properties.length,
      transactionsCount: result.transactions.length,
      sampleProperties: result.properties.slice(0, 2),
      sampleTransactions: result.transactions.slice(0, 2)
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/debug/stats - Get platform statistics (admin only)
router.get('/stats', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalProperties,
      totalTransactions,
      totalLeads,
      totalFavorites,
      totalAppointments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.transaction.count(),
      prisma.propertyLead.count(),
      prisma.favorite.count(),
      prisma.viewingRequest.count()
    ]);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const propertiesByStatus = await prisma.property.groupBy({
      by: ['status'],
      _count: true
    });

    const transactionsByStatus = await prisma.transaction.groupBy({
      by: ['status'],
      _count: true
    });

    res.json({
      totals: {
        users: totalUsers,
        properties: totalProperties,
        transactions: totalTransactions,
        leads: totalLeads,
        favorites: totalFavorites,
        appointments: totalAppointments
      },
      usersByRole,
      propertiesByStatus,
      transactionsByStatus
    });
  } catch (error) {
    console.error('Error fetching debug stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;

