import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/appointments/:propertyId - Create appointment (buyer)
router.post('/:propertyId', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId } = req.params;
    const { status, date, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: true
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // If custom_date request
    if (status === 'custom_date' && date) {
      const viewingRequest = await prisma.viewingRequest.create({
        data: {
          propertyId,
          buyerId: userId,
          date: new Date(date),
          time: new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'PENDING',
        },
        include: {
          property: {
            include: {
              user: true
            }
          },
          buyer: true,
        },
      });

      // Create notification for seller
      if (viewingRequest.property?.user?.id) {
        const formattedDate = new Date(date).toLocaleDateString('el-GR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await prisma.notification.create({
          data: {
            userId: viewingRequest.property.user.id,
            title: 'Νέα Πρόταση Ραντεβού',
            message: `Ο χρήστης ${viewingRequest.buyer.name} προτείνει ημερομηνία για ραντεβού στο ακίνητό σας "${viewingRequest.property.title}" στις ${formattedDate}.`,
            type: 'CUSTOM_APPOINTMENT_REQUEST',
            propertyId: propertyId,
            metadata: {
              viewingRequestId: viewingRequest.id,
              buyerId: userId,
              buyerName: viewingRequest.buyer.name,
              date: date,
              comment: comment,
              recipient: 'seller'
            }
          },
        });
      }

      // Create notification for buyer
      const formattedDate = new Date(date).toLocaleDateString('el-GR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await prisma.notification.create({
        data: {
          userId: userId,
          title: 'Πρόταση Ραντεβού Στάλθηκε',
          message: `Η πρότασή σας για ραντεβού στις ${formattedDate} στάλθηκε στον πωλητή ${viewingRequest.property.user.name} και αναμένει έγκριση.`,
          type: 'CUSTOM_APPOINTMENT_REQUEST',
          propertyId: propertyId,
          metadata: {
            viewingRequestId: viewingRequest.id,
            sellerName: viewingRequest.property.user.name,
            date: date,
            comment: comment,
            recipient: 'buyer'
          }
        },
      });

      return res.json({ success: true, viewingRequest });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling appointment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/appointments/seller/create - Create appointment (seller)
router.post('/seller/create', validateJwtToken, async (req: AuthRequest, res: Response) => {
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

// GET /api/appointments/seller/:appointmentId - Get appointment details (seller)
router.get('/seller/:appointmentId', validateJwtToken, async (req: AuthRequest, res: Response) => {
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

// PUT /api/appointments/seller/:appointmentId/status - Update appointment status (seller)
router.put('/seller/:appointmentId/status', validateJwtToken, async (req: AuthRequest, res: Response) => {
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

// PUT /api/appointments/buyer/:appointmentId/status - Update appointment status (buyer)
router.put('/buyer/:appointmentId/status', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find appointment and verify it belongs to buyer
    const viewingRequest = await prisma.viewingRequest.findFirst({
      where: {
        id: appointmentId,
        buyerId: userId
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

    // Create notification for seller
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

    if (status.toUpperCase() === 'CANCELLED') {
      notificationMessage = `Ο αγοραστής ${updated.buyer.name} ακύρωσε το ραντεβού για τις ${formattedDate} στο ακίνητό σας "${updated.property.title}".`;
      notificationType = 'APPOINTMENT_CANCELLED';
    } else if (status.toUpperCase() === 'COMPLETED') {
      notificationMessage = `Το ραντεβού με τον αγοραστή ${updated.buyer.name} για τις ${formattedDate} στο ακίνητό σας "${updated.property.title}" ολοκληρώθηκε.`;
      notificationType = 'APPOINTMENT_COMPLETED';
    }

    if (notificationMessage && updated.property?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: updated.property.user.id,
          type: notificationType,
          title: status.toUpperCase() === 'CANCELLED' ? 'Ραντεβού Ακυρώθηκε' : 'Ραντεβού Ολοκληρώθηκε',
          message: notificationMessage,
          isRead: false,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            propertyTitle: updated.property.title,
            buyerName: updated.buyer.name,
            date: updated.date,
            time: updated.time,
            status: status.toUpperCase(),
            recipient: 'seller'
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

// GET /api/appointments/admin - Get all appointments (admin)
router.get('/admin', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    // Get query parameters
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const propertyId = req.query.propertyId as string || '';
    const buyerId = req.query.buyerId as string || '';
    const sellerId = req.query.sellerId as string || '';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { property: { title: { contains: search, mode: 'insensitive' } } },
        { buyer: { name: { contains: search, mode: 'insensitive' } } },
        { buyer: { email: { contains: search, mode: 'insensitive' } } },
        { property: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { property: { user: { email: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (sellerId) {
      where.property = {
        userId: sellerId
      };
    }

    const appointments = await prisma.viewingRequest.findMany({
      where,
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
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Get unique IDs for filters
    const uniqueProperties = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    const uniqueBuyers = await prisma.user.findMany({
      where: {
        role: 'BUYER'
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const uniqueSellers = await prisma.user.findMany({
      where: {
        role: 'SELLER'
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      appointments,
      filters: {
        properties: uniqueProperties,
        buyers: uniqueBuyers,
        sellers: uniqueSellers
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/admin/:appointmentId/status - Update appointment status (admin)
router.put('/admin/:appointmentId/status', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Find appointment
    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: appointmentId },
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
      return res.status(404).json({ error: 'Appointment not found' });
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
      notificationMessage = `Το ραντεβού σας επιβεβαιώθηκε για τις ${formattedDate} από τον admin. Παρακαλώ εμφανιστείτε στην ώρα που συμφωνήσατε.`;
      notificationType = 'APPOINTMENT_ACCEPTED';
    } else if (status.toUpperCase() === 'REJECTED') {
      notificationMessage = `Η ημερομηνία ${formattedDate} δεν εγκρίθηκε από τον admin. Παρακαλώ προγραμματίστε νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_REJECTED';
    } else if (status.toUpperCase() === 'CANCELLED') {
      notificationMessage = `Το ραντεβού σας για τις ${formattedDate} ακυρώθηκε από τον admin. Παρακαλώ επικοινωνήστε για νέα ημερομηνία.`;
      notificationType = 'APPOINTMENT_CANCELLED';
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: updated.buyerId,
          title: `Ραντεβού ${status.toUpperCase() === 'ACCEPTED' ? 'Εγκρίθηκε' : status.toUpperCase() === 'REJECTED' ? 'Απορρίφθηκε' : 'Ακυρώθηκε'}`,
          message: notificationMessage,
          type: notificationType,
          propertyId: updated.propertyId,
          metadata: {
            appointmentId: updated.id,
            propertyId: updated.propertyId,
            status: status.toUpperCase()
          },
          isRead: false
        }
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;





