import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sellerId = params.id;

    // Χρησιμοποιούμε το ίδιο query structure με το listings API
    const properties = await prisma.property.findMany({
      where: {
        userId: sellerId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 