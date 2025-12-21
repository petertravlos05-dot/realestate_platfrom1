import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/support/user-data - Get user data for support (properties, transactions)
router.get('/user-data', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Έλεγχος αν ο χρήστης είναι admin ή αν ζητάει δεδομένα για άλλον χρήστη
    const requestedUserId = req.query.userId as string | undefined;
    const requestedRole = req.query.role as string | undefined;

    if (requestedUserId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Για admin, χρησιμοποιούμε το requestedUserId αν δίνεται
    const targetUserId = requestedUserId || userId;
    const userRole = requestedRole?.toUpperCase() || req.userRole;

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

    res.json(result);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/support/tickets - Get all tickets (filtered by user role)
router.get('/tickets', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    // Build where clause
    const where: any = {};

    // Admin sees all tickets, users see only their own
    if (req.userRole !== 'ADMIN') {
      where.userId = userId;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
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
            title: true,
            city: true,
            street: true,
            number: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true
          }
        },
        messages: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/support/tickets - Create new ticket
router.post('/tickets', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, category, priority, propertyId, transactionId, selectedRole } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        category: category || 'GENERAL',
        priority: priority || 'MEDIUM',
        selectedRole: selectedRole || req.userRole,
        userId: userId,
        createdBy: userId,
        propertyId: propertyId || null,
        transactionId: transactionId || null
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
            title: true,
            city: true,
            street: true,
            number: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    res.json({ ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/support/tickets - Update ticket status (admin only)
router.patch('/tickets', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId, status } = req.body;

    if (!ticketId || !status) {
      return res.status(400).json({ error: 'Ticket ID and status are required' });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: {
        user: {
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
            title: true,
            city: true,
            street: true,
            number: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    res.json({ ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/support/tickets/:id - Get specific ticket
router.get('/tickets/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
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
            title: true,
            state: true,
            city: true,
            street: true,
            number: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true
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
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Admin μπορεί να δει όλα τα tickets, άλλοι χρήστες μόνο τα δικά τους
    if (req.userRole !== 'ADMIN' && ticket.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/support/tickets/:id - Update ticket (admin only)
router.patch('/tickets/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        status,
        priority: priority || undefined,
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
        property: {
          select: {
            id: true,
            title: true,
            state: true,
            city: true,
            street: true,
            number: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    res.json({ ticket });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/support/messages - Get messages for a ticket
router.get('/messages', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ticketId = req.query.ticketId as string;

    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    // Verify user has access to this ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Admin can see all messages, users can only see their own tickets
    if (req.userRole !== 'ADMIN' && ticket.userId !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await prisma.supportMessage.findMany({
      where: { ticketId },
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
    });

    // Parse metadata for each message
    const messagesWithMetadata = messages.map(message => ({
      ...message,
      metadata: (message as any).metadata ? JSON.parse((message as any).metadata as string) : null
    }));

    res.json({ messages: messagesWithMetadata });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/support/messages - Create new message
router.post('/messages', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticketId, content, isMultipleChoice, options } = req.body;

    if (!ticketId || !content) {
      return res.status(400).json({ error: 'Ticket ID and content are required' });
    }

    // Verify user has access to this ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        userId: true,
        title: true,
        category: true,
        propertyId: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Admin can reply to any ticket, users can only reply to their own tickets
    if (req.userRole !== 'ADMIN' && ticket.userId !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Προετοιμασία δεδομένων μηνύματος
    const messageData: any = {
      content,
      ticketId,
      userId: userId,
      isFromAdmin: req.userRole === 'ADMIN'
    };

    // Προσθήκη δεδομένων πολλαπλής επιλογής αν υπάρχουν
    if (isMultipleChoice && options && options.length >= 2) {
      const validOptions = options.filter((option: string) => option.trim() !== '');
      if (validOptions.length >= 2) {
        messageData.metadata = JSON.stringify({
          isMultipleChoice: true,
          options: validOptions
        });
      }
    }

    const message = await prisma.supportMessage.create({
      data: messageData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    // Δημιουργία ειδοποίησης για τον buyer όταν ο admin στέλνει μήνυμα
    if (req.userRole === 'ADMIN') {
      try {
        // Βρίσκουμε το όνομα του ακινήτου αν υπάρχει
        let propertyTitle = '';
        if (ticket.propertyId) {
          const property = await prisma.property.findUnique({
            where: { id: ticket.propertyId },
            select: { title: true }
          });
          propertyTitle = property?.title || '';
        }

        // Δημιουργούμε το μήνυμα της ειδοποίησης
        let notificationMessage = '';
        if (propertyTitle) {
          notificationMessage = `Λάβατε νέο μήνυμα από τον διαχειριστή σχετικά με το ακίνητο '${propertyTitle}'`;
        } else {
          notificationMessage = `Λάβατε νέο μήνυμα από τον διαχειριστή`;
        }

        // Προσθέτουμε το περιεχόμενο του μηνύματος (κομμένο αν είναι μεγάλο)
        const messagePreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        notificationMessage += `\n\n${messagePreview}`;

        await prisma.notification.create({
          data: {
            userId: ticket.userId,
            type: 'SUPPORT_MESSAGE',
            title: 'Νέο Μήνυμα Υποστήριξης',
            message: notificationMessage,
            isRead: false,
            metadata: JSON.stringify({
              ticketId: ticketId,
              ticketTitle: ticket.title,
              ticketCategory: ticket.category,
              messageId: message.id,
              isFromAdmin: true,
              propertyTitle: propertyTitle,
              fullMessage: content
            })
          }
        });
      } catch (notificationError) {
        console.error('Error creating support message notification:', notificationError);
        // Δεν σταματάμε την εκτέλεση αν αποτύχει η ειδοποίηση
      }
    }

    res.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;





