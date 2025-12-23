import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/favorites - Get all favorites
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: userId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            shortDescription: true,
            fullDescription: true,
            price: true,
            city: true,
            street: true,
            number: true,
            propertyType: true,
            status: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
            images: true,
          },
        },
      },
    });

    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// POST /api/favorites - Add to favorites
router.post('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    if (!propertyId) {
      return res.status(400).json({
        error: 'Missing propertyId'
      });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found'
      });
    }

    // Check if property is already in favorites
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId: userId,
          propertyId,
        },
      },
    });

    if (existingFavorite) {
      return res.status(400).json({
        error: 'Property already in favorites'
      });
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        userId: userId,
        propertyId,
      },
    });

    res.json(favorite);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// DELETE /api/favorites - Remove from favorites
router.delete('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    if (!propertyId) {
      return res.status(400).json({
        error: 'Missing propertyId'
      });
    }

    // Remove from favorites
    await prisma.favorite.delete({
      where: {
        userId_propertyId: {
          userId: userId,
          propertyId,
        },
      },
    });

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;













