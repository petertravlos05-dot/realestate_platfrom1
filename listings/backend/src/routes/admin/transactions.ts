import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isAdmin, isAuthenticated } from '../../middleware/auth';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

const router = Router();
const prisma = new PrismaClient();

// Store connected clients
const clients = new Map<string, { res: any, userId: string }>();

// SSE endpoint for real-time updates
router.get('/stream', isAuthenticated, (req: AuthenticatedRequest, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  const clientId = Date.now().toString();
  const userId = req.user?.id;

  if (!userId) {
    res.end();
    return;
  }

  clients.set(clientId, { res, userId });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Remove client on connection close
  req.on('close', () => {
    clients.delete(clientId);
  });
});

// Helper function to send updates to connected clients
const sendUpdateToClients = (transaction: any) => {
  const { buyer, seller, agent } = transaction;
  const relevantUserIds = [buyer.id, seller.id];
  if (agent) relevantUserIds.push(agent.id);

  clients.forEach((client) => {
    if (relevantUserIds.includes(client.userId)) {
      client.res.write(`data: ${JSON.stringify({
        type: 'transaction_update',
        data: transaction
      })}\n\n`);
    }
  });
};

// Get all transactions
router.get('/', isAdmin, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        property: true,
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
        },
        notifications: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Update transaction stage
router.put('/:id/stage', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;

  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Update the transaction stage
      const transaction = await prisma.transaction.update({
        where: { id },
        data: { 
          stage,
          updatedAt: new Date()
        },
        include: {
          property: true,
          buyer: true,
          seller: true,
          agent: true,
          notifications: true
        }
      });

      // Create automatic notification based on stage
      let notificationMessage = '';
      let category = 'general';
      
      switch(stage) {
        case 'meeting_scheduled':
          notificationMessage = 'Το ραντεβού επιβεβαιώθηκε για την προβολή του ακινήτου.';
          category = 'appointment';
          break;
        case 'deposit_paid':
          notificationMessage = 'Η προκαταβολή έχει καταχωρηθεί επιτυχώς.';
          category = 'payment';
          break;
        case 'final_signing':
          notificationMessage = 'Όλα είναι έτοιμα για την τελική υπογραφή.';
          category = 'contract';
          break;
        case 'completed':
          notificationMessage = 'Η συναλλαγή ολοκληρώθηκε με επιτυχία!';
          category = 'completion';
          break;
        case 'cancelled':
          notificationMessage = 'Η διαδικασία έχει ακυρωθεί.';
          category = 'general';
          break;
      }

      // Create notifications for all parties
      if (notificationMessage) {
        const notifications = await Promise.all([
          prisma.transactionNotification.create({
            data: {
              message: notificationMessage,
              recipient: 'buyer',
              stage,
              category,
              isUnread: true,
              transaction: { connect: { id } }
            }
          }),
          prisma.transactionNotification.create({
            data: {
              message: notificationMessage,
              recipient: 'seller',
              stage,
              category,
              isUnread: true,
              transaction: { connect: { id } }
            }
          })
        ]);

        if (transaction.agent) {
          await prisma.transactionNotification.create({
            data: {
              message: notificationMessage,
              recipient: 'agent',
              stage,
              category,
              isUnread: true,
              transaction: { connect: { id } }
            }
          });
        }

        // Fetch updated transaction with new notifications
        const updatedTransaction = await prisma.transaction.findUnique({
          where: { id },
          include: {
            property: true,
            buyer: true,
            seller: true,
            agent: true,
            notifications: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        return updatedTransaction;
      }

      return transaction;
    });

    // Send real-time update to connected clients
    sendUpdateToClients(result);

    res.json(result);
  } catch (error) {
    console.error('Error updating transaction stage:', error);
    res.status(500).json({ error: 'Failed to update transaction stage' });
  }
});

// Add notification to transaction
router.post('/:id/notifications', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { message, recipient, stage, category } = req.body;

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const notification = await prisma.transactionNotification.create({
        data: {
          message,
          recipient,
          stage,
          category,
          isUnread: true,
          transaction: {
            connect: { id }
          }
        }
      });

      // Fetch updated transaction with new notification
      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          property: true,
          buyer: true,
          seller: true,
          agent: true,
          notifications: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      return updatedTransaction;
    });

    // Send real-time update to connected clients
    sendUpdateToClients(result);

    res.json(result);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', isAuthenticated, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await prisma.transactionNotification.update({
      where: { id: notificationId },
      data: { 
        isUnread: false,
        updatedAt: new Date()
      }
    });

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Get notifications for a transaction
router.get('/:id/notifications', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { recipient } = req.query;

  try {
    const notifications = await prisma.transactionNotification.findMany({
      where: {
        transactionId: id,
        ...(recipient && { recipient: recipient as string })
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router; 