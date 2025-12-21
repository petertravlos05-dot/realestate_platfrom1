import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { generateOTP } from '../lib/utils/otp';
import { sendOtpEmail, sendOtpSms } from '../lib/utils/send-otp';
import { generateId } from '../lib/utils/id';

const router = Router();

// GET /api/buyer-agent/check - Check if connection exists
router.get('/check', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const propertyId = req.query.propertyId as string;
    const agentId = req.query.agentId as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!propertyId || !agentId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        propertyId,
        agentId,
        buyerId: userId,
      },
    });

    res.json({
      exists: !!existingConnection,
      connection: existingConnection,
    });
  } catch (error) {
    console.error('Error checking buyer-agent connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/buyer-agent/check - Check connection (alternative)
router.post('/check', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId, agentId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!propertyId || !agentId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        propertyId,
        agentId,
        buyerId: userId,
      },
    });

    res.json({
      exists: !!existingConnection,
      connection: existingConnection,
    });
  } catch (error) {
    console.error('Error checking buyer-agent connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/buyer-agent/connect - Connect buyer with agent
router.post('/connect', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, propertyId, buyerName, buyerEmail, buyerPhone, otpMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Scenario 1: Buyer is logged in (call from ConfirmAgentConnectionModal)
    if (!buyerEmail && !buyerName) {
      const buyerId = userId;

      // Check if user is the property owner
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { userId: true }
      });

      if (property && property.userId === buyerId) {
        return res.status(400).json({
          error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς'
        });
      }

      // Check if connection already exists
      const existingConnection = await prisma.buyerAgentConnection.findFirst({
        where: { buyerId, agentId, propertyId },
      });

      if (existingConnection) {
        return res.status(400).json({ error: 'Connection already exists' });
      }

      // Create connection directly, without OTP
      const connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId,
          agentId,
          propertyId,
          status: 'CONFIRMED',
        },
      });

      // Create PropertyLead and Transaction
      const lead = await prisma.propertyLead.create({
        data: {
          propertyId: connection.propertyId,
          buyerId: connection.buyerId,
          agentId: connection.agentId,
          status: 'PENDING',
          notes: 'Connection established directly by buyer.',
        },
      });

      const propertyDetails = await prisma.property.findUnique({
        where: { id: connection.propertyId },
        select: { userId: true, title: true }
      });

      if (propertyDetails) {
        const transaction = await prisma.transaction.create({
          data: {
            buyerId: connection.buyerId,
            agentId: connection.agentId,
            propertyId: connection.propertyId,
            sellerId: propertyDetails.userId,
            status: 'PRE_DEPOSIT',
            stage: 'PENDING',
            leadId: lead.id,
          },
        });

        // Create notification for seller
        const buyer = await prisma.user.findUnique({
          where: { id: connection.buyerId },
          select: { name: true, email: true }
        });

        if (buyer) {
          await prisma.notification.create({
            data: {
              userId: propertyDetails.userId,
              title: 'Νέο Ενδιαφέρον',
              message: `Ο ${buyer.name} (${buyer.email}) συνδέθηκε με μεσίτη και ενδιαφέρεται για το ακίνητό σας "${propertyDetails.title}".`,
              type: 'PROPERTY_INTEREST',
              propertyId: connection.propertyId,
              metadata: {
                leadId: lead.id,
                transactionId: transaction.id,
                buyerId: connection.buyerId,
                agentId: connection.agentId,
                buyerName: buyer.name,
                buyerEmail: buyer.email,
                recipient: 'seller',
                shouldOpenModal: true
              }
            },
          });

          // Create notification for agent
          await prisma.notification.create({
            data: {
              userId: connection.agentId,
              title: 'Νέα Σύνδεση με Αγοραστή',
              message: `Ο χρήστης ${buyer.name} αποδέχθηκε να συνδεθεί μαζί σας για το ακίνητο "${propertyDetails.title}".`,
              type: 'AGENT_CLIENT_CONNECTION',
              propertyId: connection.propertyId,
              metadata: {
                leadId: lead.id,
                transactionId: transaction.id,
                buyerId: connection.buyerId,
                agentId: connection.agentId,
                buyerName: buyer.name,
                buyerEmail: buyer.email,
                propertyTitle: propertyDetails.title,
                recipient: 'agent',
                shouldOpenModal: true
              }
            },
          });
        }
      }

      return res.json({ success: true, connection });
    }

    // Scenario 2: Agent adds interested buyer (call from AddInterestedBuyerModal)
    if (!agentId || !propertyId || !buyerName || !buyerEmail) {
      return res.status(400).json({ error: 'Missing required fields for new lead' });
    }

    // Find or create buyer by email
    let buyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
    if (!buyer) {
      buyer = await prisma.user.create({
        data: {
          name: buyerName,
          email: buyerEmail,
          phone: buyerPhone || '',
          role: 'BUYER',
          password: 'lead-' + Date.now(), // placeholder
        },
      });
    }

    // Check if buyer is the property owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true }
    });

    if (property && property.userId === buyer.id) {
      return res.status(400).json({
        error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς'
      });
    }

    // Check if connection already exists
    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId: buyer.id,
        agentId,
        propertyId,
      },
    });

    if (existingConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    // Create new connection in pending status
    const connection = await prisma.buyerAgentConnection.create({
      data: {
        buyerId: buyer.id,
        agentId,
        propertyId,
        status: 'PENDING',
      },
    });

    // Generate and send OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.buyerAgentConnection.update({
      where: { id: connection.id },
      data: { otpCode: otp, otpExpires },
    });

    if (otpMethod === 'email') {
      await sendOtpEmail(buyerEmail, otp);
    } else if (otpMethod === 'sms' && buyerPhone) {
      await sendOtpSms(buyerPhone, otp);
    }

    // Return data for OTP step
    res.json({
      connectionId: connection.id,
      buyerId: buyer.id,
      agentId,
      propertyId,
    });
  } catch (error) {
    console.error('Error creating buyer-agent connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/buyer-agent/verify-otp - Verify OTP
router.post('/verify-otp', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { buyerId, agentId, propertyId, otpCode } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if connection exists
    let connection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId,
        agentId,
        propertyId,
      },
    });

    // If doesn't exist, create new connection with otpCode
    if (!connection) {
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId,
          agentId,
          propertyId,
          status: 'PENDING',
          otpCode,
          otpExpires,
        },
      });
    }

    // Check if OTP expired
    if (!connection.otpExpires || connection.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Check if OTP is correct
    if (connection.otpCode !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update connection status
    const updatedConnection = await prisma.buyerAgentConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONFIRMED',
        otpCode: null,
        otpExpires: null,
      },
    });

    // Create PropertyLead
    const leadId = generateId();
    const lead = await prisma.propertyLead.create({
      data: {
        id: leadId,
        propertyId: connection.propertyId,
        buyerId: connection.buyerId,
        agentId: connection.agentId,
        status: 'PENDING',
        notes: 'Initial connection established',
      },
    });

    // Find sellerId from property
    const property = await prisma.property.findUnique({
      where: { id: connection.propertyId },
      select: { userId: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Create transaction
    const transactionId = generateId();
    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        buyerId: connection.buyerId,
        agentId: connection.agentId,
        propertyId: connection.propertyId,
        sellerId: property.userId,
        status: 'PRE_DEPOSIT',
        stage: 'PENDING',
        leadId: leadId,
      },
    });

    // Update PropertyStats
    await prisma.propertyStats.upsert({
      where: { propertyId: connection.propertyId },
      create: {
        id: generateId(),
        propertyId: connection.propertyId,
        views: 1,
        interestedCount: 1,
        viewingCount: 0,
        lastViewed: new Date(),
      },
      update: {
        interestedCount: { increment: 1 },
        lastViewed: new Date(),
      },
    });

    // Create notifications
    const buyer = await prisma.user.findUnique({
      where: { id: connection.buyerId },
      select: { name: true, email: true }
    });

    const propertyDetails = await prisma.property.findUnique({
      where: { id: connection.propertyId },
      select: { title: true, userId: true }
    });

    if (propertyDetails && buyer) {
      // Notify seller
      await prisma.notification.create({
        data: {
          userId: propertyDetails.userId,
          title: 'Νέο Ενδιαφέρον',
          message: `Ο μεσίτης πρόσθεσε τον ${buyer.name} (${buyer.email}) ως ενδιαφερόμενο για το ακίνητό σας "${propertyDetails.title}".`,
          type: 'PROPERTY_INTEREST',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            buyerId: connection.buyerId,
            agentId: connection.agentId,
            buyerName: buyer.name,
            buyerEmail: buyer.email,
            recipient: 'seller',
            shouldOpenModal: true
          }
        },
      });

      // Notify agent
      await prisma.notification.create({
        data: {
          userId: connection.agentId,
          title: 'Επιτυχημένη Προσθήκη Ενδιαφερόμενου',
          message: `Προσθέσατε επιτυχώς τον ${buyer.name} (${buyer.email}) ως ενδιαφερόμενο για το ακίνητο "${propertyDetails.title}".`,
          type: 'AGENT_LEAD_ADDED',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            buyerId: connection.buyerId,
            agentId: connection.agentId,
            buyerName: buyer.name,
            buyerEmail: buyer.email,
            propertyTitle: propertyDetails.title,
            recipient: 'agent',
            shouldOpenModal: true
          }
        },
      });

      // Notify buyer
      await prisma.notification.create({
        data: {
          userId: connection.buyerId,
          title: 'Επιτυχής Σύνδεση με Μεσίτη',
          message: `✅ Η σύνδεσή σας με τον μεσίτη ολοκληρώθηκε με επιτυχία!`,
          type: 'INTERESTED',
          propertyId: connection.propertyId,
          metadata: {
            leadId: lead.id,
            transactionId: transaction.id,
            shouldOpenModal: false
          }
        },
      });
    }

    res.json({
      message: 'OTP verified successfully',
      connection: updatedConnection,
      lead,
      transaction,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/buyer-agent/connections - Get buyer connections
router.get('/connections', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const connections = await prisma.buyerAgentConnection.findMany({
      where: {
        buyerId: userId,
        interestCancelled: false
      },
      include: {
        property: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const properties = connections.map(connection => ({
      id: connection.property.id,
      title: connection.property.title,
      shortDescription: connection.property.shortDescription,
      fullDescription: connection.property.fullDescription,
      price: connection.property.price,
      location: `${connection.property.street} ${connection.property.number}, ${connection.property.city}, ${connection.property.state}`,
      propertyType: connection.property.propertyType,
      status: connection.property.status,
      bedrooms: connection.property.bedrooms ?? 0,
      bathrooms: connection.property.bathrooms ?? 0,
      squareMeters: connection.property.area,
      images: connection.property.images,
      agent: {
        id: connection.agent.id,
        name: connection.agent.name,
        email: connection.agent.email,
      },
    }));

    res.json(properties);
  } catch (error) {
    console.error('Error fetching buyer connections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/buyer-agent/connections - Create connection
router.post('/connections', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId, agentId, checkCancelled, buyerEmail, buyerPhone } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (checkCancelled && propertyId && agentId && (buyerEmail || buyerPhone)) {
      // Find buyer by email or phone
      const buyer = await prisma.user.findFirst({
        where: {
          ...(buyerEmail ? { email: buyerEmail } : {}),
          ...(buyerPhone ? { phone: buyerPhone } : {}),
        }
      });

      if (!buyer) {
        return res.json({ interestCancelled: false });
      }

      const cancelledConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: buyer.id,
          propertyId,
          agentId,
          interestCancelled: true
        }
      });

      return res.json({ interestCancelled: !!cancelledConnection });
    }

    if (checkCancelled && propertyId && agentId) {
      const cancelledConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: userId,
          propertyId,
          agentId,
          interestCancelled: true
        }
      });

      return res.json({ interestCancelled: !!cancelledConnection });
    }

    // Create new buyer-agent connection
    if (propertyId && agentId) {
      // Check if connection already exists
      const existingConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: userId,
          agentId,
          propertyId,
        },
      });

      if (existingConnection) {
        return res.status(400).json({
          error: 'Η σύνδεση υπάρχει ήδη'
        });
      }

      // Create new connection
      const connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId: userId,
          agentId,
          propertyId,
          status: 'PENDING',
        },
      });

      return res.json({
        success: true,
        connection,
      });
    }

    res.status(400).json({ error: 'Missing required fields' });
  } catch (error) {
    console.error('Error in buyer-agent connections POST:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/buyer-agent/connections - Update connection
router.patch('/connections', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId, interestCancelled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update connection
    const updatedConnection = await prisma.buyerAgentConnection.updateMany({
      where: {
        buyerId: userId,
        propertyId
      },
      data: {
        interestCancelled
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating buyer-agent connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/buyer-agent/connections - Delete connection
router.delete('/connections', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { propertyId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete connection
    await prisma.buyerAgentConnection.deleteMany({
      where: {
        buyerId: userId,
        propertyId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting buyer-agent connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/buyer-agent/schedule-viewing/:id - Schedule viewing
router.post('/schedule-viewing/:id', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id: propertyId } = req.params;
    const { agentId, date, time } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify availability
    const availability = await prisma.propertyAvailability.findFirst({
      where: {
        propertyId,
        date: new Date(date),
        startTime: time,
        isAvailable: true,
      },
    });

    if (!availability) {
      return res.status(400).json({ error: 'Selected time is not available' });
    }

    // Create viewing request
    const viewing = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId: userId,
        agentId,
        date: new Date(date),
        time,
        endTime: time,
        status: 'PENDING',
      },
    });

    // Update availability
    await prisma.propertyAvailability.update({
      where: { id: availability.id },
      data: { isAvailable: false },
    });

    // Create notifications
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (property) {
      // Notify seller
      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέο Αίτημα Επισκέψεως',
          message: `Έχετε λάβει νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
          type: 'VIEWING_REQUEST',
        },
      });

      // Notify agent if exists
      if (agentId) {
        await prisma.notification.create({
          data: {
            userId: agentId,
            title: 'Νέο Αίτημα Επισκέψεως',
            message: `Έχετε λάβει νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
            type: 'VIEWING_REQUEST',
          },
        });
      }

      // Notify admin
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (admin) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Νέο Αίτημα Επισκέψεως',
            message: `Νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
            type: 'VIEWING_REQUEST',
          },
        });
      }
    }

    res.json(viewing);
  } catch (error) {
    console.error('Error scheduling viewing:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

