import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/test-notification - Create a test notification
router.post('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, message, type, propertyId } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        type: type || 'INFO',
        isRead: false,
        propertyId: propertyId || null,
        metadata: JSON.stringify({
          test: true,
          createdAt: new Date().toISOString()
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        property: propertyId ? {
          select: {
            id: true,
            title: true
          }
        } : false
      }
    });

    res.json({
      success: true,
      message: 'Test notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      error: 'Failed to create test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/test-notification - Get test notifications for user
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        metadata: {
          path: ['test'],
          equals: true
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error fetching test notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch test notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/test-notification - Delete all test notifications for user
router.delete('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        userId: userId,
        metadata: {
          path: ['test'],
          equals: true
        }
      }
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} test notifications`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error deleting test notifications:', error);
    res.status(500).json({
      error: 'Failed to delete test notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;





