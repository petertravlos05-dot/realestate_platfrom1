import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

interface PropertyWithLeads {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  type: string;
  status: string;
  images: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  leads: Array<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    notes: string | null;
    buyer: {
      name: string;
      email: string;
      phone: string | null;
    };
    agent: {
      name: string;
      email: string;
      phone: string | null;
    } | null;
  }> | null;
  stats: {
    views: number;
    interestedCount: number;
    viewingCount: number;
    lastViewed: Date | null;
  } | null;
}

interface PropertyLead {
  id: string;
  propertyId: string;
  buyerId: string;
  agentId: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadWithRelations extends PropertyLead {
  buyer: {
    name: string;
    email: string;
    phone: string | null;
  };
  agent: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  status: string;
  images: string[];
}

interface Transaction {
  buyer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    const session = await getServerSession(authOptions);
    let userId;
    let userRole;

    if (session?.user?.id) {
      userId = session.user.id;
      userRole = session.user.role;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string; role: string };
        userId = decoded.userId;
        userRole = decoded.role;
      } catch (error) {
        return NextResponse.json({ error: 'Μη έγκυρο token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
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

    // Πάρε όλα τα transaction που σχετίζονται με τα leads του seller
    const allPropertyIds = properties.map(p => p.id);
    const allBuyerIds = properties.flatMap(p => p.leads?.map(l => l.buyer?.id) || []);
    const allAgentIds = properties.flatMap(p => p.leads?.map(l => l.agent?.id).filter(Boolean) || []);
    console.log('=== Seller Leads Debug ===');
    console.log('Property IDs:', allPropertyIds);
    console.log('Buyer IDs:', allBuyerIds);
    console.log('Agent IDs:', allAgentIds);
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
    
    console.log('=== Seller Leads Transactions Debug ===');
    console.log('Found transactions:', transactions.map(t => ({
      id: t.id,
      propertyId: t.propertyId,
      buyerId: t.buyerId,
      status: t.status,
      stage: t.stage,
      interestCancelled: t.interestCancelled,
      lastProgressStage: t.progress?.[0]?.stage,
      allProgressStages: t.progress?.map(p => p.stage)
    })));
    console.log('Transactions found:', transactions.length);
    console.log('Transactions:', transactions.map(t => ({ id: t.id, propertyId: t.propertyId, buyerId: t.buyerId, agentId: t.agentId })));
    // Map κάθε lead να έχει το σωστό transaction object (αν υπάρχει)
    const propertiesWithTransactions = properties.map(property => ({
      ...property,
      leads: property.leads?.map(lead => {
        // Προσπάθησε πρώτα να βρεις transaction με agentId (αν υπάρχει agent στο lead)
        let transaction = transactions.find(t =>
          t.propertyId === property.id &&
          t.buyerId === lead.buyer?.id &&
          (lead.agent?.id ? t.agentId === lead.agent.id : true)
        );
        // Αν δεν βρέθηκε και υπάρχει agent, δοκίμασε χωρίς agentId
        if (!transaction) {
          transaction = transactions.find(t =>
            t.propertyId === property.id &&
            t.buyerId === lead.buyer?.id
          );
        }
        console.log(`Mapping lead ${lead.id} for property ${property.id}:`, {
          leadBuyerId: lead.buyer?.id,
          leadAgentId: lead.agent?.id,
          foundTransactionId: transaction?.id
        });
        return {
          ...lead,
          transaction: transaction
            ? {
                id: String(transaction.id), // Ensure id is string
                createdAt: transaction.createdAt.toISOString(),
                progress: {
                  stage: (() => {
                    const lastProgress = transaction.progress?.[0];
                    const calculatedStage = (() => {
                      // Αν το transaction είναι ενεργό (INTERESTED) αλλά το τελευταίο progress είναι CANCELLED, 
                      // εμφανίζουμε PENDING
                      if (transaction.status === 'INTERESTED' && lastProgress?.stage === 'CANCELLED') {
                        return 'PENDING';
                      }
                      // Αν το transaction είναι ενεργό αλλά δεν έχει progress, εμφανίζουμε PENDING
                      if (transaction.status === 'INTERESTED' && !lastProgress) {
                        return 'PENDING';
                      }
                      // Αν το transaction.stage είναι CANCELLED αλλά το status είναι INTERESTED, 
                      // χρησιμοποιούμε PENDING
                      if (transaction.stage === 'CANCELLED' && transaction.status === 'INTERESTED') {
                        return 'PENDING';
                      }
                      // Αν το transaction είναι ενεργό και το τελευταίο progress είναι CANCELLED, 
                      // εμφανίζουμε PENDING
                      if (transaction.status === 'INTERESTED' && transaction.progress?.some(p => p.stage === 'CANCELLED')) {
                        return 'PENDING';
                      }
                      // Αν το transaction είναι ενεργό (INTERESTED), εμφανίζουμε PENDING ανεξάρτητα από το stage
                      if (transaction.status === 'INTERESTED') {
                        console.log(`Transaction ${transaction.id} is INTERESTED, forcing PENDING stage`);
                        return 'PENDING';
                      }
                      return transaction.stage || lastProgress?.stage || lead.status;
                    })();
                    
                    console.log(`Stage calculation for transaction ${transaction.id}:`, {
                      transactionStatus: transaction.status,
                      transactionStage: transaction.stage,
                      lastProgressStage: lastProgress?.stage,
                      allProgressStages: transaction.progress?.map(p => p.stage),
                      leadStatus: lead.status,
                      calculatedStage
                    });
                    
                    return calculatedStage;
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

    return NextResponse.json(propertiesWithTransactions);
  } catch (error) {
    console.error('Error fetching seller leads:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, status, notes } = await request.json();

    // Verify that the lead belongs to a property owned by the seller
    const lead = await prisma.propertyLead.findFirst({
      where: {
        id: leadId,
        property: {
          userId: session.user.id
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
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

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { leadId } = await request.json();
    // Βρες το lead και το property
    const lead = await prisma.propertyLead.findUnique({
      where: { id: leadId },
      include: { property: true }
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    // Επιτρέπεται μόνο αν ο χρήστης είναι ο buyer ή ο seller
    if (lead.buyerId !== session.user.id && lead.property.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    // Διαγραφή του lead
    await prisma.propertyLead.delete({ where: { id: leadId } });
    // Διαγραφή του connection (αν υπάρχει)
    await prisma.buyerAgentConnection.deleteMany({
      where: {
        buyerId: lead.buyerId,
        propertyId: lead.propertyId
      }
    });
    // Ενημέρωση του transaction (αν υπάρχει) σε CANCELLED
    await prisma.transaction.updateMany({
      where: {
        propertyId: lead.propertyId,
        buyerId: lead.buyerId
      },
      data: {
        status: 'CANCELLED'
      }
    });
    // Logging
    console.log(`Lead ${leadId} deleted by user ${session.user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { leadId, propertyId, interestCancelled } = await request.json();
    
    console.log('=== Updating Lead ===', {
      leadId,
      propertyId,
      interestCancelled
    });

    if (leadId) {
      // Ενημέρωση με leadId
      const updatedLead = await prisma.propertyLead.update({
        where: { id: leadId },
        data: { interestCancelled }
      });
      console.log('Updated lead:', updatedLead);
      return NextResponse.json(updatedLead);
    } else if (propertyId) {
      // Ενημέρωση με propertyId
      const updatedLead = await prisma.propertyLead.updateMany({
        where: { 
          propertyId,
          buyerId: session.user.id
        },
        data: { interestCancelled }
      });
      console.log('Updated lead with propertyId:', updatedLead);
      return NextResponse.json(updatedLead);
    }

    return new NextResponse('Missing leadId or propertyId', { status: 400 });
  } catch (error) {
    console.error('Error updating lead:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 