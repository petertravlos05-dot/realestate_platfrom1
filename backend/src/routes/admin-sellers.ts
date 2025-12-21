import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/admin/sellers - Get all sellers (admin only)
router.get('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const sellers = await prisma.user.findMany({
      where: {
        properties: {
          some: {} // Has at least one property
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        properties: {
          select: {
            id: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    const formattedSellers = sellers.map((seller: any) => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      propertyCount: seller.properties.length,
      lastPropertyDate: seller.properties[0]?.createdAt || null,
      lastPropertyStatus: seller.properties[0]?.status || null
    }));

    res.json(formattedSellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/sellers/:id/properties - Get seller's properties (admin only)
router.get('/:id/properties', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        userId: req.params.id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;





