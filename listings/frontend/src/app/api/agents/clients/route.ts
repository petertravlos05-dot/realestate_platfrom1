import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

interface Property {
  id: string;
  title: string;
  shortDescription: string | null;
  fullDescription: string;
  price: number;
  propertyType: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  images: string[];
  state: string;
  city: string;
  street: string;
  number: string;
}

interface Transaction {
  transactionId: string;
  transactionStatus: string;
  transactionStage: string;
  connectionDate: Date;
  lastContact: Date;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  propertyLocation: string;
  propertyType: string;
  propertyStatus: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    const session = await getServerSession(authOptions);
    let userId;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        return NextResponse.json({ error: 'Μη έγκυρο token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
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
        status: 'VERIFIED'
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

    // Φέρε όλα τα propertyId και buyerId από leads και connections
    const allPropertyIds = [...clients, ...connections].map(c => c.property.id);
    const allBuyerIds = [...clients, ...connections].map(c => c.buyer.id);

    // Φέρε όλα τα transactions που έχουν propertyId και buyerId στα παραπάνω
    const transactions = await prisma.transaction.findMany({
      where: {
        propertyId: { in: allPropertyIds },
        buyerId: { in: allBuyerIds }
      },
      include: {
        progress: { orderBy: { createdAt: 'desc' } }
      }
    });

    // Για κάθε γραμμή, βρες το transaction που έχει το ίδιο propertyId, buyerId και agentId (αν υπάρχει)
    const transformedClients = [...clients, ...connections].map(client => {
      // Βρες όλα τα transactions με propertyId, buyerId, agentId
      const allTransactions = transactions.filter(t =>
        t.propertyId === client.property.id &&
        t.buyerId === client.buyer.id &&
        t.agentId === userId
      );
      // Πάρε το πιο πρόσφατο (με βάση updatedAt)
      let transaction = allTransactions.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      if (!transaction) {
        // Αν δεν υπάρχει με agentId, πάρε το πιο πρόσφατο μόνο με propertyId + buyerId
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

    return NextResponse.json(transformedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 