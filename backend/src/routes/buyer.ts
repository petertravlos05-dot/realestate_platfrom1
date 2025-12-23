import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/buyer/interested-properties - Get all interested properties
router.get('/interested-properties', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Find all active leads for the user
    const propertyLeads = await prisma.propertyLead.findMany({
      where: {
        buyerId: userId,
        interestCancelled: false
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
            },
            stats: true,
            transactions: {
              where: {
                buyerId: userId,
                OR: [
                  { NOT: { status: 'CANCELLED' } },
                  { AND: [{ status: 'CANCELLED' }, { interestCancelled: false }] }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                buyer: { select: { name: true, email: true, phone: true } },
                agent: { select: { name: true, email: true, phone: true } },
                progress: { orderBy: { createdAt: 'desc' } }
              }
            }
          }
        }
      }
    });

    const properties = propertyLeads.map(l => {
      const property = l.property as any;
      if (property.transactions && property.transactions.length > 0) {
        const transaction = property.transactions[0];
        // Find the most recent progress
        const lastProgress = transaction.progress && transaction.progress.length > 0
          ? transaction.progress[0]
          : null;

        // If transaction is active but last progress is CANCELLED, show PENDING
        const effectiveStage = (lastProgress?.stage === 'CANCELLED' && transaction.status === 'INTERESTED')
          ? 'PENDING'
          : (lastProgress?.stage || 'PENDING');

        transaction.progress = lastProgress
          ? {
              stage: effectiveStage,
              updatedAt: lastProgress.updatedAt,
              notifications: transaction.progress.map((p: any) => ({
                id: p.id,
                message: p.message,
                recipient: p.recipient,
                stage: p.stage,
                category: p.category,
                createdAt: p.createdAt,
                isUnread: p.isUnread
              }))
            }
          : {
              stage: 'PENDING',
              updatedAt: transaction.updatedAt,
              notifications: []
            };
        property.transaction = transaction;
        property.agent = transaction.agent;
      }
      return property;
    });

    res.json({ properties });
  } catch (error) {
    console.error('Error fetching interested properties:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ακινήτων'
    });
  }
});

// POST /api/buyer/interested-properties - Express interest
router.post('/interested-properties', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Find property to get title
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Check if lead already exists
    let lead = await prisma.propertyLead.findFirst({
      where: {
        propertyId,
        buyerId: userId,
        interestCancelled: false
      }
    });

    // If no active lead, check if there's a cancelled one
    if (!lead) {
      const cancelledLead = await prisma.propertyLead.findFirst({
        where: {
          propertyId,
          buyerId: userId,
          interestCancelled: true
        }
      });

      if (cancelledLead) {
        // Restore cancelled lead
        lead = await prisma.propertyLead.update({
          where: { id: cancelledLead.id },
          data: {
            interestCancelled: false,
            status: 'PENDING'
          }
        });
      } else {
        // Create new lead
        lead = await prisma.propertyLead.create({
          data: {
            propertyId,
            buyerId: userId,
            status: 'PENDING'
          }
        });
      }
    }

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: `✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!`,
        propertyId: propertyId,
        metadata: {
          leadId: lead.id,
          shouldOpenModal: false
        }
      }
    });

    // Check if active transaction exists
    let transaction = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    // If no active transaction, check if there's a cancelled one
    if (!transaction) {
      const cancelledTransaction = await prisma.transaction.findFirst({
        where: {
          propertyId,
          buyerId: userId,
          status: 'CANCELLED',
          interestCancelled: true
        }
      });

      if (cancelledTransaction) {
        // Restore cancelled transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }

        transaction = await prisma.transaction.update({
          where: { id: cancelledTransaction.id },
          data: {
            status: 'INTERESTED',
            stage: 'PENDING',
            interestCancelled: false,
            agentId: agentId ?? null,
            leadId: lead.id
          }
        });

        // Update lead with transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });

        // Create progress entry for restoration
        await prisma.transactionProgress.create({
          data: {
            transactionId: transaction.id,
            stage: 'PENDING',
            notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή',
            createdById: userId
          }
        });

        // Update last progress entry
        const lastProgress = await prisma.transactionProgress.findFirst({
          where: { transactionId: transaction.id },
          orderBy: { createdAt: 'desc' }
        });

        if (lastProgress && lastProgress.stage === 'CANCELLED') {
          await prisma.transactionProgress.update({
            where: { id: lastProgress.id },
            data: {
              stage: 'PENDING',
              notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή'
            }
          });
        }
      } else {
        // Create new transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }

        transaction = await prisma.transaction.create({
          data: {
            propertyId,
            buyerId: userId,
            agentId: agentId ?? null,
            status: 'INTERESTED',
            stage: 'PENDING',
            leadId: lead.id
          }
        });

        // Update lead with transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
      }
    }

    // Create notification for agent if exists
    if (transaction?.agentId) {
      const buyer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      await prisma.notification.create({
        data: {
          userId: transaction.agentId,
          type: 'INTERESTED',
          title: 'Νέο Ενδιαφέρον',
          message: `Ο χρήστης ${buyer?.name || 'Unknown'} εκδήλωσε ενδιαφέρον για το ακίνητο "${property.title}"`,
          propertyId: propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            shouldOpenModal: false
          }
        }
      });
    }

    res.json({ success: true, lead, transaction });
  } catch (error) {
    console.error('Error expressing interest:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος'
    });
  }
});

// DELETE /api/buyer/interested-properties/:id - Cancel interest
router.delete('/interested-properties/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id: propertyId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Find property lead
    const propertyLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId,
        buyerId: userId,
        interestCancelled: false
      },
      include: {
        property: {
          select: {
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!propertyLead) {
      return res.status(404).json({
        error: 'Δεν βρέθηκε ενεργό ενδιαφέρον για αυτό το ακίνητο'
      });
    }

    // Update property lead as cancelled
    await prisma.propertyLead.update({
      where: { id: propertyLead.id },
      data: {
        interestCancelled: true,
        status: 'CANCELLED'
      }
    });

    // Update buyer-agent connections
    await prisma.buyerAgentConnection.updateMany({
      where: {
        propertyId,
        buyerId: userId,
        interestCancelled: false
      },
      data: {
        interestCancelled: true
      }
    });

    // Find and cancel transaction if exists
    const transaction = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    if (transaction) {
      // Update transaction as cancelled
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CANCELLED',
          stage: 'CANCELLED',
          interestCancelled: true
        }
      });

      // Create progress entry for cancellation
      await prisma.transactionProgress.create({
        data: {
          transactionId: transaction.id,
          stage: 'CANCELLED',
          notes: 'Η συναλλαγή ακυρώθηκε από τον αγοραστή',
          createdById: userId
        }
      });

      // Create transaction notification
      await prisma.transactionNotification.create({
        data: {
          transactionId: transaction.id,
          type: 'SYSTEM',
          message: 'Η συναλλαγή ακυρώθηκε από τον αγοραστή',
          status: 'SENT'
        }
      });

      // Create notification for agent if exists
      if (transaction.agentId) {
        const buyer = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        });

        await prisma.notification.create({
          data: {
            userId: transaction.agentId,
            type: 'CANCELLED',
            title: 'Ακύρωση Ενδιαφέροντος',
            message: `Ο αγοραστής ${buyer?.name || 'Unknown'} ακύρωσε το ενδιαφέρον του για το ακίνητο "${propertyLead.property.title}"`,
            propertyId: propertyId,
            metadata: {
              leadId: propertyLead.id,
              transactionId: transaction.id,
              shouldOpenModal: false
            }
          }
        });
      }
    }

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'CANCELLED',
        title: 'Ακύρωση Ενδιαφέροντος',
        message: `Το ενδιαφέρον σας για το ακίνητο "${propertyLead.property.title}" ακυρώθηκε επιτυχώς.`,
        propertyId: propertyId,
        metadata: {
          leadId: propertyLead.id,
          transactionId: transaction?.id,
          shouldOpenModal: false
        }
      }
    });

    res.json({
      success: true,
      message: 'Το ενδιαφέρον ακυρώθηκε επιτυχώς'
    });
  } catch (error) {
    console.error('Error cancelling interest:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ακύρωση του ενδιαφέροντος'
    });
  }
});

// POST /api/buyer/properties/:property_id/express-interest - Express interest (alternative)
router.post('/properties/:property_id/express-interest', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: property_id },
      include: { user: true }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Check if user has already expressed interest
    const existingLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        interestCancelled: false
      }
    });

    if (existingLead) {
      return res.status(400).json({
        error: 'Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο'
      });
    }

    // Create new lead
    const lead = await prisma.propertyLead.create({
      data: {
        propertyId: property_id,
        buyerId: userId,
        status: 'PENDING'
      },
      include: {
        property: true,
        buyer: true
      }
    });

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: `✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          shouldOpenModal: false
        }
      }
    });

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: property.userId,
        type: 'SELLER_INTEREST',
        title: 'Νέο Ενδιαφέρον',
        message: `Ο χρήστης ${lead.buyer.name} ενδιαφέρθηκε για το ακίνητό σας "${property.title}"`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          propertyId: property_id,
          buyerId: userId,
          buyerName: lead.buyer.name,
          propertyTitle: property.title,
          recipient: 'seller'
        }
      }
    });

    // Check if transaction already exists
    let transaction = await prisma.transaction.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    if (!transaction) {
      // Check if there's a cancelled transaction
      const cancelledTransaction = await prisma.transaction.findFirst({
        where: {
          propertyId: property_id,
          buyerId: userId,
          status: 'CANCELLED',
          interestCancelled: true
        }
      });

      if (cancelledTransaction) {
        // Restore cancelled transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }

        transaction = await prisma.transaction.update({
          where: { id: cancelledTransaction.id },
          data: {
            status: 'INTERESTED',
            stage: 'PENDING',
            interestCancelled: false,
            agentId: agentId ?? null,
            leadId: lead.id
          }
        });

        // Update lead with transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });

        // Create progress entry for restoration
        await prisma.transactionProgress.create({
          data: {
            transactionId: transaction.id,
            stage: 'PENDING',
            notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή',
            createdById: userId
          }
        });

        // Update last progress entry
        const lastProgress = await prisma.transactionProgress.findFirst({
          where: { transactionId: transaction.id },
          orderBy: { createdAt: 'desc' }
        });

        if (lastProgress && lastProgress.stage === 'CANCELLED') {
          await prisma.transactionProgress.update({
            where: { id: lastProgress.id },
            data: {
              stage: 'PENDING',
              notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή'
            }
          });
        }
      } else {
        // Create new transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }

        transaction = await prisma.transaction.create({
          data: {
            propertyId: property_id,
            buyerId: userId,
            agentId: agentId ?? null,
            status: 'INTERESTED',
            stage: 'PENDING',
            leadId: lead.id
          }
        });

        // Update lead with transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
      }
    }

    res.json({
      message: 'Το ενδιαφέρον σας καταγράφηκε με επιτυχία',
      lead,
      transaction
    });
  } catch (error) {
    console.error('Error expressing interest:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος'
    });
  }
});

// GET /api/buyer/properties/:property_id/interest-status - Check interest status
router.get('/properties/:property_id/interest-status', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Check if interest already exists
    const existingLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId
      }
    });

    res.json({
      hasExpressedInterest: !!existingLead,
      interestCancelled: existingLead?.interestCancelled ?? false
    });
  } catch (error) {
    console.error('Error checking interest status:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά τον έλεγχο της κατάστασης ενδιαφέροντος'
    });
  }
});

// POST /api/buyer/properties/:property_id/favorite - Toggle favorite
router.post('/properties/:property_id/favorite', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: property_id },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Check if property is already in favorites
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId: userId,
        propertyId: property_id,
      },
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });

      // Update interested count
      await prisma.propertyStats.update({
        where: { propertyId: property_id },
        data: { interestedCount: { decrement: 1 } },
      });

      res.json({ isFavorite: false });
    } else {
      // Add to favorites
      await prisma.favorite.create({
        data: {
          userId: userId,
          propertyId: property_id,
        },
      });

      // Update interested count
      await prisma.propertyStats.update({
        where: { propertyId: property_id },
        data: { interestedCount: { increment: 1 } },
      });

      res.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ενημέρωση των αγαπημένων'
    });
  }
});

// GET /api/buyer/favorite-properties - Get favorite properties
router.get('/favorite-properties', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: userId,
      },
      include: {
        property: true,
      },
    });

    res.json({
      properties: favorites.map(favorite => favorite.property)
    });
  } catch (error) {
    console.error('Error fetching favorite properties:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των αγαπημένων ακινήτων'
    });
  }
});

// GET /api/buyer/properties/:property_id - Get property details
router.get('/properties/:property_id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: property_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        stats: true,
      },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Check if property is in user's favorites
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: userId,
        propertyId: property_id,
      },
    });

    // Increment views
    await prisma.propertyStats.upsert({
      where: { propertyId: property_id },
      update: { views: { increment: 1 } },
      create: {
        propertyId: property_id,
        views: 1,
        interestedCount: 0,
        viewingCount: 0,
      },
    });

    // Calculate favorites and inquiries count
    const favoritesCount = await prisma.favorite.count({
      where: { propertyId: property_id },
    });

    const inquiriesCount = await prisma.inquiry.count({
      where: { propertyId: property_id },
    });

    // Add additional fields to property
    const propertyWithStats = {
      ...property,
      isFavorite: !!favorite,
      stats: {
        ...property.stats,
        favorites: favoritesCount,
        inquiries: inquiriesCount,
      },
    };

    res.json(propertyWithStats);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση του ακινήτου'
    });
  }
});

// PATCH /api/buyer/properties/:property_id - Restore interest
router.patch('/properties/:property_id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    // Update interestCancelled to false
    const updatedLead = await prisma.propertyLead.updateMany({
      where: {
        propertyId: property_id,
        buyerId: userId,
        interestCancelled: true
      },
      data: {
        interestCancelled: false
      }
    });

    // Update transaction
    const updatedTransaction = await prisma.transaction.updateMany({
      where: {
        propertyId: property_id,
        buyerId: userId,
        interestCancelled: true
      },
      data: {
        interestCancelled: false
      }
    });

    if (updatedLead.count === 0) {
      return res.status(404).json({
        error: 'Δεν βρέθηκε ακυρωμένο ενδιαφέρον για επαναφορά'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring interest:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την επαναφορά ενδιαφέροντος'
    });
  }
});

// POST /api/buyer/properties/:property_id/inquiry - Send inquiry
router.post('/properties/:property_id/inquiry', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Μη εξουσιοδοτημένη πρόσβαση'
      });
    }

    if (!message) {
      return res.status(400).json({
        error: 'Το μήνυμα είναι υποχρεωτικό'
      });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: property_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    // Create inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        message,
        propertyId: property_id,
        userId: userId,
      },
    });

    // Update interested count
    await prisma.propertyStats.update({
      where: { propertyId: property_id },
      data: { interestedCount: { increment: 1 } },
    });

    // Create notification for seller
    await prisma.notification.create({
      data: {
        title: 'Νέο Ερώτημα',
        type: 'INQUIRY',
        message: `Νέο ερώτημα για το ακίνητο ${property.title}`,
        userId: property.user.id,
        propertyId: property_id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending inquiry:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την αποστολή του ερωτήματος'
    });
  }
});

// POST /api/buyer/schedule-viewing/:id - Schedule viewing
router.post('/schedule-viewing/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id: propertyId } = req.params;
    const {
      availabilityId,
      customDate,
      customStartTime,
      customEndTime,
      isCustomRequest,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found'
      });
    }

    if (isCustomRequest) {
      // Create viewing request with proposed date
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: userId,
          date: new Date(customDate),
          time: customStartTime,
          endTime: customEndTime,
          status: 'PENDING_SELLER_APPROVAL',
        },
      });

      // Notify seller
      const buyer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέο Αίτημα Προβολής',
          message: `Ο χρήστης ${buyer?.name || 'Unknown'} ζητά να προγραμματίσει προβολή του ακινήτου ${property.title} στις ${new Date(customDate).toLocaleDateString('el-GR')} ${customStartTime}-${customEndTime}`,
          type: 'VIEWING_REQUEST',
        },
      });

      res.json(viewingRequest);
    } else {
      // Check if availability exists and is available
      const availability = await prisma.propertyAvailability.findUnique({
        where: { id: availabilityId },
      });

      if (!availability || !availability.isAvailable) {
        return res.status(400).json({
          error: 'Availability not found or not available'
        });
      }

      // Create scheduled viewing
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: userId,
          date: availability.date,
          time: availability.startTime,
          endTime: availability.endTime,
          status: 'SCHEDULED',
        },
      });

      // Update availability
      await prisma.propertyAvailability.update({
        where: { id: availabilityId },
        data: { isAvailable: false },
      });

      // Notify seller
      const buyer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέα Προγραμματισμένη Προβολή',
          message: `Ο χρήστης ${buyer?.name || 'Unknown'} προγραμμάτισε προβολή του ακινήτου ${property.title} στις ${availability.date.toLocaleDateString('el-GR')} ${availability.startTime}-${availability.endTime}`,
          type: 'VIEWING_SCHEDULED',
        },
      });

      res.json(viewingRequest);
    }
  } catch (error) {
    console.error('Error scheduling viewing:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

export default router;















