import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { validateJwtToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All seller routes require authentication
router.use(validateJwtToken);

// GET /api/seller/properties - Get all seller's properties
router.get('/properties', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    const query: Prisma.PropertyFindManyArgs = {
      where: {
        OR: [
          // Available properties
          { status: { not: 'unavailable' } },
          // Unavailable properties with special permissions
          {
            AND: [
              { status: 'unavailable' },
              {
                OR: [
                  // 1. Is the owner
                  { userId: userId },
                  // 2. Is admin
                  { user: { role: 'admin' } },
                  // 3. Has interested buyer
                  {
                    favorites: {
                      some: {
                        user: {
                          id: userId
                        }
                      }
                    }
                  },
                  // 4. Has connected agent
                  {
                    connections: {
                      some: {
                        agent: {
                          id: userId
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      include: {
        stats: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    };

    const properties = await prisma.property.findMany(query);
    res.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ακινήτων'
    });
  }
});

// GET /api/seller/properties/:property_id - Get single seller property
router.get('/properties/:property_id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
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

    // Check if property belongs to user
    if (property.userId !== userId) {
      return res.status(403).json({
        error: 'Δεν έχετε πρόσβαση σε αυτό το ακίνητο'
      });
    }

    // Check if property is favorite
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: userId,
        propertyId: property_id,
      },
    });

    // Count favorites and inquiries
    const favoritesCount = await prisma.favorite.count({
      where: { propertyId: property_id },
    });

    const inquiriesCount = await prisma.inquiry.count({
      where: { propertyId: property_id },
    });

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

// PUT /api/seller/properties/:property_id/visit-settings - Update visit settings
router.put('/properties/:property_id/visit-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;
    const data = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    // Check if property belongs to user
    const property = await prisma.property.findFirst({
      where: {
        id: property_id,
        userId: userId
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε ή δεν ανήκει σε εσάς'
      });
    }

    const updated = await prisma.property.update({
      where: { id: property_id },
      data: {
        visitSettings: data as any
      }
    });

    res.json({ propertyId: property_id, ...data });
  } catch (error) {
    console.error('Error updating visit settings:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ενημέρωση των ρυθμίσεων'
    });
  }
});

// GET /api/seller/properties/:property_id/visit-settings - Get visit settings
router.get('/properties/:property_id/visit-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { property_id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    const property = await prisma.property.findUnique({
      where: { id: property_id }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε'
      });
    }

    if (property.visitSettings) {
      return res.json({
        propertyId: property_id,
        ...(property.visitSettings as any)
      });
    }

    res.json({
      propertyId: property_id,
      availability: { days: [], timeSlots: [] }
    });
  } catch (error) {
    console.error('Error fetching visit settings:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ρυθμίσεων'
    });
  }
});

// GET /api/seller/leads - Get all seller's leads
router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    // Get all properties of the seller with their leads and stats
    const properties = await prisma.property.findMany({
      where: {
        userId: userId
      },
      include: {
        leads: {
          where: {
            interestCancelled: false
          } as Prisma.PropertyLeadWhereInput,
          include: {
            buyer: {
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
            }
          }
        },
        stats: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get all transactions related to seller's leads
    const allPropertyIds = properties.map(p => p.id);
    const allBuyerIds = properties.flatMap(p => p.leads?.map(l => l.buyer?.id) || []);
    const allAgentIds = properties.flatMap(p => p.leads?.map(l => l.agent?.id).filter(Boolean) || []);

    const transactions = await prisma.transaction.findMany({
      where: {
        propertyId: { in: allPropertyIds },
        buyerId: { in: allBuyerIds },
        OR: [
          { status: 'INTERESTED' },
          { status: 'PENDING' },
          { status: 'MEETING_SCHEDULED' },
          { status: 'DEPOSIT_PAID' },
          { status: 'FINAL_SIGNING' },
          { status: 'COMPLETED' },
          { AND: [{ status: 'CANCELLED' }, { interestCancelled: false }] }
        ]
      },
      include: {
        progress: {
          orderBy: { createdAt: 'desc' }
        },
        property: true,
        buyer: true,
        agent: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map each lead to include transaction
    const propertiesWithTransactions = properties.map(property => ({
      ...property,
      leads: property.leads?.map(lead => {
        let transaction = transactions.find(t =>
          t.propertyId === property.id &&
          t.buyerId === lead.buyer?.id &&
          (lead.agent?.id ? t.agentId === lead.agent.id : true)
        );

        if (!transaction) {
          transaction = transactions.find(t =>
            t.propertyId === property.id &&
            t.buyerId === lead.buyer?.id
          );
        }

        return {
          ...lead,
          transaction: transaction
            ? {
                id: String(transaction.id),
                createdAt: transaction.createdAt.toISOString(),
                progress: {
                  stage: (() => {
                    const lastProgress = transaction.progress?.[0];
                    if (transaction.status === 'INTERESTED' && lastProgress?.stage === 'CANCELLED') {
                      return 'PENDING';
                    }
                    if (transaction.status === 'INTERESTED' && !lastProgress) {
                      return 'PENDING';
                    }
                    if (transaction.stage === 'CANCELLED' && transaction.status === 'INTERESTED') {
                      return 'PENDING';
                    }
                    if (transaction.status === 'INTERESTED' && transaction.progress?.some(p => p.stage === 'CANCELLED')) {
                      return 'PENDING';
                    }
                    if (transaction.status === 'INTERESTED') {
                      return 'PENDING';
                    }
                    return transaction.stage || lastProgress?.stage || lead.status;
                  })(),
                  status: transaction.status || transaction.stage || transaction.progress?.[0]?.stage || lead.status,
                  updatedAt: transaction.updatedAt.toISOString(),
                  notifications: []
                },
                agent: transaction.agent
                  ? {
                      name: transaction.agent.name,
                      email: transaction.agent.email,
                      phone: transaction.agent.phone
                    }
                  : null
              }
            : undefined
        };
      })
    }));

    res.json(propertiesWithTransactions);
  } catch (error) {
    console.error('Error fetching seller leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/seller/leads - Update lead status
router.put('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { leadId, status, notes } = req.body;

    // Verify that the lead belongs to a property owned by the seller
    const lead = await prisma.propertyLead.findFirst({
      where: {
        id: leadId,
        property: {
          userId: userId
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update the lead status
    const updatedLead = await prisma.propertyLead.update({
      where: {
        id: leadId
      },
      data: {
        status,
        notes
      },
      include: {
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        agent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/seller/leads - Update lead interest cancelled
router.patch('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { leadId, propertyId, interestCancelled } = req.body;

    if (leadId) {
      const updatedLead = await prisma.propertyLead.update({
        where: { id: leadId },
        data: { interestCancelled }
      });
      return res.json(updatedLead);
    } else if (propertyId) {
      const updatedLead = await prisma.propertyLead.updateMany({
        where: {
          propertyId,
          buyerId: userId
        },
        data: { interestCancelled }
      });
      return res.json(updatedLead);
    }

    res.status(400).json({ error: 'Missing leadId or propertyId' });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/seller/leads - Delete lead
router.delete('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { leadId } = req.body;

    const lead = await prisma.propertyLead.findUnique({
      where: { id: leadId },
      include: { property: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Only allow if user is buyer or seller
    if (lead.buyerId !== userId && lead.property.userId !== userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    // Delete lead
    await prisma.propertyLead.delete({ where: { id: leadId } });

    // Delete connection if exists
    await prisma.buyerAgentConnection.deleteMany({
      where: {
        buyerId: lead.buyerId,
        propertyId: lead.propertyId
      }
    });

    // Update transaction to CANCELLED
    await prisma.transaction.updateMany({
      where: {
        propertyId: lead.propertyId,
        buyerId: lead.buyerId
      },
      data: {
        status: 'CANCELLED'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/seller/appointments - Get seller appointments
router.get('/appointments', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    // Get all seller's properties
    const properties = await prisma.property.findMany({
      where: { userId: userId },
      select: { id: true, title: true, price: true, city: true }
    });

    const propertyIds = properties.map(p => p.id);

    // Get query params
    const buyerId = req.query.buyerId as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;

    // Build where object
    let where: any = { propertyId: { in: propertyIds } };
    if (buyerId) where.buyerId = buyerId;
    if (propertyId) where.propertyId = propertyId;

    // Get viewing requests
    const viewingRequests = await prisma.viewingRequest.findMany({
      where,
      include: {
        property: true,
        buyer: true,
      },
      orderBy: { date: 'desc' }
    });

    res.json({ appointments: viewingRequests });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seller/appointments/:appointmentId - Get appointment details (alias)
router.get('/appointments/:appointmentId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            state: true,
            city: true,
            street: true,
            price: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!viewingRequest) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify appointment belongs to seller's property
    const property = await prisma.property.findFirst({
      where: {
        id: viewingRequest.propertyId,
        userId: userId,
      },
    });

    if (!property) {
      return res.status(403).json({ error: 'Unauthorized access to appointment' });
    }

    res.json({
      id: viewingRequest.id,
      propertyId: viewingRequest.propertyId,
      buyerId: viewingRequest.buyerId,
      date: viewingRequest.date,
      time: viewingRequest.time,
      endTime: viewingRequest.endTime,
      status: viewingRequest.status,
      createdAt: viewingRequest.createdAt,
      updatedAt: viewingRequest.updatedAt,
      property: viewingRequest.property,
      buyer: viewingRequest.buyer,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/seller/appointments/:appointmentId/status - Update appointment status (alias)
router.put('/appointments/:appointmentId/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find appointment and verify it belongs to seller's property
    const viewingRequest = await prisma.viewingRequest.findFirst({
      where: {
        id: appointmentId,
        property: {
          userId: userId
        }
      },
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
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    // Update status
    const updated = await prisma.viewingRequest.update({
      where: { id: appointmentId },
      data: { status: status.toUpperCase() },
      include: {
        property: {
          include: {
            user: true
          }
        },
        buyer: true
      }
    });

    // Create notification for buyer
    const formattedDate = new Date(updated.date).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let notificationMessage = '';
    let notificationType = '';

    if (status.toUpperCase() === 'ACCEPTED') {
      notificationMessage = `Το ραντεβού σας επιβεβαιώθηκε για τις ${formattedDate} από τον ${updated.property.user.name}. Παρακαλώ εμφανιστείτε στην ώρα που συμφωνήσατε.`;
      notificationType = 'APPOINTMENT_ACCEPTED';
    } else if (status.toUpperCase() === 'REJECTED') {
      notificationMessage = `Η ημερομηνία ${formattedDate} δεν εγκρίθηκε από τον ${updated.property.user.name}. Παρακαλώ προγραμματίστε νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_REJECTED';
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.buyerId,
          type: notificationType,
          title: status.toUpperCase() === 'ACCEPTED' ? 'Ραντεβού Επιβεβαιώθηκε' : 'Ραντεβού Απορρίφθηκε',
          message: notificationMessage,
          isRead: false,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            propertyTitle: updated.property.title,
            sellerName: updated.property.user.name,
            date: updated.date,
            time: updated.time,
            status: status.toUpperCase(),
            recipient: 'buyer'
          }
        }
      });
    }

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ενημέρωση του ραντεβού'
    });
  }
});

// POST /api/seller/appointments/create - Create appointment (alias)
router.post('/appointments/create', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    const { propertyId, buyerId, date, time, notes } = req.body;

    // Check if property belongs to seller
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: userId
      },
      include: {
        user: true
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Το ακίνητο δεν βρέθηκε ή δεν ανήκει σε εσάς'
      });
    }

    // Check if buyer exists
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId }
    });

    if (!buyer) {
      return res.status(404).json({
        error: 'Ο αγοραστής δεν βρέθηκε'
      });
    }

    // Create appointment
    const appointment = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId,
        date: new Date(date),
        time,
        endTime: time,
        status: 'PENDING'
      },
      include: {
        property: true,
        buyer: true
      }
    });

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'SELLER_APPOINTMENT',
        title: 'Νέο Ραντεβού',
        message: `Δημιουργήθηκε νέο ραντεβού για το ακίνητό σας "${property.title}" με τον χρήστη ${buyer.name} στις ${date} στις ${time}`,
        propertyId: propertyId,
        metadata: {
          appointmentId: appointment.id,
          buyerName: buyer.name,
          propertyTitle: property.title,
          date,
          time,
          recipient: 'seller'
        }
      }
    });

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: buyerId,
        type: 'APPOINTMENT_CREATED',
        title: 'Νέο Ραντεβού',
        message: `Δημιουργήθηκε ραντεβού για το ακίνητο "${property.title}" στις ${date} στις ${time}`,
        propertyId: propertyId,
        metadata: {
          appointmentId: appointment.id,
          propertyTitle: property.title,
          date,
          time
        }
      }
    });

    res.json({
      message: 'Το ραντεβού δημιουργήθηκε με επιτυχία',
      appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά τη δημιουργία του ραντεβού'
    });
  }
});

// GET /api/seller/transactions/:id - Get transaction details
router.get('/transactions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find transaction and check if it belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        property: {
          userId: userId
        },
        NOT: {
          status: 'CANCELLED'
        }
      },
      include: {
        property: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        agent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        progress: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            createdBy: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const response = {
      ...transaction,
      id: String(transaction.id),
      progress: {
        stage: transaction.stage || 'PENDING',
        status: transaction.status || 'PENDING',
        updatedAt: transaction.updatedAt,
        notifications: transaction.progress.map(p => ({
          id: p.id,
          message: p.notes || '',
          recipient: p.createdBy?.email === transaction.buyer.email ? 'buyer' :
                    p.createdBy?.email === transaction.property.user.email ? 'seller' :
                    'agent',
          stage: p.stage,
          category: 'general',
          createdAt: p.createdAt.toISOString(),
          isUnread: false
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

