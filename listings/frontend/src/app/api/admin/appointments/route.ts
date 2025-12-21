import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Παίρνουμε τα query parameters για φιλτράρισμα
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const propertyId = searchParams.get('propertyId') || '';
    const buyerId = searchParams.get('buyerId') || '';
    const sellerId = searchParams.get('sellerId') || '';

    // Δημιουργούμε το where clause για φιλτράρισμα
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

    // Παίρνουμε επίσης τα μοναδικά IDs για φίλτρα
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
        role: 'buyer'
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
        role: 'seller'
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

    return NextResponse.json({
      appointments,
      filters: {
        properties: uniqueProperties,
        buyers: uniqueBuyers,
        sellers: uniqueSellers
      }
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
