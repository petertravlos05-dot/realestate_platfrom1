import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Έλεγχος αν ο χρήστης είναι admin ή αν ζητάει δεδομένα για άλλον χρήστη
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    
    if (requestedUserId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestedRole = searchParams.get('role');
    
    // Για admin, χρησιμοποιούμε το requestedUserId αν δίνεται
    const userId = requestedUserId || session.user.id;
    const userRole = requestedRole?.toUpperCase() || session.user.role;

    console.log('API Debug:', { userId, userRole, requestedUserId, requestedRole });

    let properties: any[] = [];
    let transactions: any[] = [];

    // Fetch properties based on requested role
    if (userRole === 'SELLER') {
      // Seller sees their own properties (όπως στο seller dashboard)
      properties = await prisma.property.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          city: true,
          street: true,
          number: true
        }
      });
    } else if (userRole === 'AGENT') {
      // Agent sees properties they're connected to (όπως στο agent dashboard)
      const connections = await prisma.buyerAgentConnection.findMany({
        where: { agentId: userId },
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
      // Buyer sees properties they're interested in (όπως στο buyer dashboard)
      const interestedProperties = await prisma.propertyLead.findMany({
        where: { buyerId: userId },
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
      // Buyer transactions (όπως στο buyer dashboard)
      transactions = await prisma.transaction.findMany({
        where: { buyerId: userId },
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
      // Seller transactions (όπως στο seller dashboard)
      transactions = await prisma.transaction.findMany({
        where: { sellerId: userId },
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
      // Agent transactions (όπως στο agent dashboard - μόνο αυτές που είναι agent)
      transactions = await prisma.transaction.findMany({
        where: { 
          agentId: userId,
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

    console.log('API Result:', { 
      propertiesCount: result.properties.length, 
      transactionsCount: result.transactions.length,
      sampleProperties: result.properties.slice(0, 2),
      sampleTransactions: result.transactions.slice(0, 2)
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 