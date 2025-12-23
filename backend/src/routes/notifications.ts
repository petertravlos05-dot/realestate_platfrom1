import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications - Get all notifications
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/notifications - Create notification
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { message, type, metadata, title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If notification is for all admins
    if (type === 'ADMIN') {
      // Find all admins
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
        },
        select: {
          id: true,
        },
      });

      // Create notification for each admin
      const notifications = await Promise.all(
        adminUsers.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: title || 'Νέα Ειδοποίηση',
              message,
              type,
              metadata: metadata ? metadata : undefined,
            },
          })
        )
      );

      return res.json(notifications);
    }

    // If notification is for specific user
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        title: title || 'Νέα Ειδοποίηση',
        message,
        type,
        metadata: metadata ? metadata : undefined,
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/notifications - Mark notification as read
router.put('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId,
      },
      data: {
        isRead: true,
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/notifications - Delete notification(s)
router.delete('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const notificationId = req.query.id as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (notificationId) {
      // Delete specific notification
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId,
        },
      });
    } else {
      // Delete all user notifications
      await prisma.notification.deleteMany({
        where: {
          userId: userId,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification(s):', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/notifications/seller - Get seller notifications
router.get('/seller', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Filter notifications relevant to sellers
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        OR: [
          { type: 'SELLER_INTEREST' },
          { type: 'SELLER_APPOINTMENT' },
          { type: 'SELLER_OFFER' },
          { type: 'SELLER_TRANSACTION' },
          { type: 'SELLER_GENERAL' },
          {
            metadata: {
              path: ['recipient'],
              equals: 'seller'
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching seller notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/notifications/seller - Create seller notification
router.post('/seller', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { message, type, metadata, title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        title: title || 'Νέα Ειδοποίηση Πωλητή',
        message,
        type: type || 'SELLER_GENERAL',
        metadata: metadata ? metadata : undefined,
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Error creating seller notification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;













