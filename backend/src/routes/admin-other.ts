import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// GET /api/admin/companies - Get all companies (admin only)
router.get('/companies', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const companies = await prisma.user.findMany({
      where: {
        userType: 'COMPANY'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        createdAt: true
      }
    });

    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/register - Register admin user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, adminKey } = req.body;

    if (!name || !email || !password || !adminKey) {
      return res.status(400).json({
        message: 'Όλα τα πεδία είναι υποχρεωτικά'
      });
    }

    // Έλεγχος του admin key
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== process.env.NEXT_PUBLIC_ADMIN_KEY) {
      return res.status(401).json({
        message: 'Μη έγκυρο κλειδί διαχειριστή'
      });
    }

    // Έλεγχος αν υπάρχει ήδη χρήστης με το ίδιο email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Υπάρχει ήδη χρήστης με αυτό το email'
      });
    }

    // Κρυπτογράφηση κωδικού
    const hashedPassword = await bcrypt.hash(password, 12);

    // Δημιουργία admin χρήστη
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      }
    });

    // Αφαίρεση του κωδικού από την απάντηση
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'Επιτυχής εγγραφή διαχειριστή',
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Error in admin registration:', error);
    res.status(500).json({
      message: 'Σφάλμα κατά την εγγραφή'
    });
  }
});

// POST /api/admin/logs - Log data (admin only)
router.post('/logs', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    // Format the log entry
    const logEntry = `[${data.timestamp}] ${data.component} - ${data.type}\n${JSON.stringify(data.data, null, 2)}\n\n`;

    // Get the logs directory path
    const logsDir = path.join(process.cwd(), 'logs');

    // Create logs directory if it doesn't exist
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Write to a file named with today's date
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}.log`);

    // Append the log entry to the file
    await fs.appendFile(logFile, logEntry);

    // Also output to console for immediate viewing
    console.log(logEntry);

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging data:', error);
    res.status(500).json({ error: 'Failed to log data' });
  }
});

// POST /api/admin/send-message - Send message to user (admin only)
router.post('/send-message', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, propertyId, content, isMultipleChoice, options } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        error: 'User ID and content are required'
      });
    }

    // Επιβεβαίωση ότι ο χρήστης υπάρχει
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Επιβεβαίωση ότι το ακίνητο υπάρχει (αν δόθηκε)
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }

    // Δημιουργία ή εύρεση υπάρχοντος ticket
    let ticket = await prisma.supportTicket.findFirst({
      where: {
        userId,
        propertyId: propertyId || null,
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Αν δεν υπάρχει ανοιχτό ticket, δημιουργούμε νέο
    if (!ticket) {
      ticket = await prisma.supportTicket.create({
        data: {
          userId: userId,
          createdBy: req.userId!,
          propertyId: propertyId || null,
          title: `Μήνυμα από Admin${propertyId ? ' για συγκεκριμένο ακίνητο' : ''}`,
          description: 'Μήνυμα που ξεκίνησε ο Admin',
          category: propertyId ? 'PROPERTY_INQUIRY' : 'GENERAL',
          priority: 'MEDIUM',
          status: 'OPEN'
        }
      });
    }

    // Δημιουργία του μηνύματος
    const messageData: any = {
      content,
      ticketId: ticket.id,
      userId: req.userId!,
      isFromAdmin: true
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

    // Ενημέρωση του ticket
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        status: 'IN_PROGRESS'
      }
    });

    res.json({
      message,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status
      }
    });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/update-subscription - Update subscription (admin only)
router.put('/update-subscription', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, planName, status, amount, interval, currentPeriodStart, currentPeriodEnd } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Έλεγχος αν υπάρχει ο χρήστης
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Έλεγχος αν υπάρχει ήδη συνδρομή
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    let subscription;

    // Βρίσκουμε ή δημιουργούμε το plan
    let plan = await prisma.subscriptionPlan.findFirst({
      where: { name: planName || 'Free' }
    });

    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: planName || 'Free',
          description: `Plan for ${planName || 'Free'}`,
          price: amount || 0,
          priceQuarterly: Math.round((amount || 0) * 2.7), // 10% discount
          maxProperties: planName === 'Free' ? 5 : planName === 'Basic' ? 50 : planName === 'Pro' ? 200 : 1000,
          benefits: planName === 'Free' ? ['Βασικά χαρακτηριστικά'] :
            planName === 'Basic' ? ['Προηγμένα χαρακτηριστικά', 'Email υποστήριξη'] :
              planName === 'Pro' ? ['Όλα τα χαρακτηριστικά', 'Προτεραιότητα υποστήριξη', 'Analytics'] :
                ['Όλα τα χαρακτηριστικά', 'Dedicated support', 'Custom features']
        }
      });
    }

    if (existingSubscription) {
      // Ενημέρωση υπάρχουσας συνδρομής
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: plan.id,
          status: status || existingSubscription.status,
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : existingSubscription.currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : existingSubscription.currentPeriodEnd,
          updatedAt: new Date()
        }
      });
    } else {
      // Δημιουργία νέας συνδρομής
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: status || 'ACTIVE',
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 μέρες από τώρα
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/notifications/send-stage-completion - Send stage completion notification (admin only)
router.post('/notifications/send-stage-completion', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, stage, sellerId, message } = req.body;

    if (!propertyId || !stage || !sellerId || !message) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Βρίσκουμε τον seller με βάση το email ή ID
    let seller;
    if (sellerId.includes('@')) {
      seller = await prisma.user.findUnique({
        where: { email: sellerId }
      });
    } else {
      seller = await prisma.user.findUnique({
        where: { id: sellerId }
      });
    }

    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    // Δημιουργία ειδοποίησης για τον seller
    const notification = await prisma.notification.create({
      data: {
        title: 'Ολοκλήρωση Σταδίου',
        message: message,
        type: 'STAGE_UPDATE',
        userId: seller.id,
        propertyId: propertyId,
        metadata: JSON.stringify({
          stage: stage,
          shouldOpenModal: true,
          modalType: 'propertyProgress'
        })
      }
    });

    res.json({
      success: true,
      notificationId: notification.id
    });
  } catch (error) {
    console.error('Error sending stage completion notification:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;

