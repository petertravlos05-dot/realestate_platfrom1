import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { validateJwtToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/agent/properties - Get all properties for agent
router.get('/properties', validateJwtToken, async (req: AuthRequest, res: Response) => {
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
                  // 3. Has promoted the property
                  {
                    connections: {
                      some: {
                        agent: {
                          id: userId
                        }
                      }
                    }
                  },
                  // 4. Has connected buyer who has shown interest
                  {
                    favorites: {
                      some: {
                        user: {
                          buyerConnections: {
                            some: {
                              agent: {
                                id: userId
                              }
                            }
                          }
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
        },
        leads: {
          where: {
            interestCancelled: false,
            agentId: userId
          },
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
        }
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc
      }
    };

    const properties = await prisma.property.findMany(query);

    res.json(properties);
  } catch (error) {
    console.error('Error fetching agent properties:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση των ακινήτων'
    });
  }
});

// GET /api/agent/properties/:property_id - Get single property
router.get('/properties/:property_id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { property_id } = req.params;

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

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      error: 'Σφάλμα κατά την ανάκτηση του ακινήτου'
    });
  }
});

// GET /api/agents/clients - Get agent clients (MUST be before /:id route)
router.get('/clients', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    // Get all clients (leads) for the agent
    const clients = await prisma.propertyLead.findMany({
      where: {
        agentId: userId,
        interestCancelled: false
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            state: true,
            city: true,
            street: true,
            number: true,
            propertyType: true,
            status: true,
            images: true,
            bedrooms: true,
            bathrooms: true,
            area: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get all connections for the agent
    const connections = await prisma.buyerAgentConnection.findMany({
      where: {
        agentId: userId,
        status: 'CONFIRMED'
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            state: true,
            city: true,
            street: true,
            number: true,
            propertyType: true,
            status: true,
            images: true,
            bedrooms: true,
            bathrooms: true,
            area: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get all propertyIds and buyerIds from leads and connections
    const allPropertyIds = [...clients, ...connections].map(c => c.property.id);
    const allBuyerIds = [...clients, ...connections].map(c => c.buyer.id);

    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        propertyId: { in: allPropertyIds },
        buyerId: { in: allBuyerIds }
      },
      include: {
        progress: { orderBy: { createdAt: 'desc' } }
      }
    });

    // Transform clients with transaction info
    const transformedClients = [...clients, ...connections].map(client => {
      // Find all transactions with propertyId, buyerId, agentId
      const allTransactions = transactions.filter(t =>
        t.propertyId === client.property.id &&
        t.buyerId === client.buyer.id &&
        t.agentId === userId
      );

      // Get the most recent transaction
      let transaction = allTransactions.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      if (!transaction) {
        // Fallback: get most recent with just propertyId + buyerId
        const fallbackTransactions = transactions.filter(t =>
          t.propertyId === client.property.id &&
          t.buyerId === client.buyer.id
        );
        transaction = fallbackTransactions.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
      }

      return {
        id: client.id,
        name: client.buyer.name,
        email: client.buyer.email,
        phone: client.buyer.phone,
        connectionDate: client.createdAt.toISOString(),
        lastContact: client.updatedAt.toISOString(),
        property: {
          id: client.property.id,
          title: client.property.title,
          price: client.property.price,
          location: `${client.property.street} ${client.property.number}, ${client.property.city}, ${client.property.state}`,
          type: client.property.propertyType,
          status: client.property.status,
          images: client.property.images,
          bedrooms: client.property.bedrooms,
          bathrooms: client.property.bathrooms,
          area: client.property.area
        },
        status: transaction?.progress[0]?.stage || 'PENDING',
        transactionId: transaction?.id || '',
        notes: 'notes' in client ? client.notes : null,
        transaction: transaction ? {
          id: transaction.id,
          createdAt: transaction.createdAt.toISOString(),
          agent: {
            name: client.buyer.name,
            email: client.buyer.email,
            phone: client.buyer.phone
          },
          progress: {
            stage: transaction.progress[0]?.stage || 'PENDING',
            updatedAt: transaction.progress[0]?.createdAt.toISOString() || client.updatedAt.toISOString(),
            notifications: transaction.progress.map((p: any) => ({
              id: p.id,
              stage: p.stage,
              notes: p.notes,
              createdAt: p.createdAt.toISOString(),
              completedAt: p.completedAt?.toISOString() || null
            }))
          }
        } : undefined
      };
    });

    res.json(transformedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agents/:id - Get agent info (MUST be after specific routes like /clients)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        businessAddress: true,
        role: true,
        image: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

