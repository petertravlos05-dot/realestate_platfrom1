import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Seller {
  id: string;
  name: string;
  email: string;
  properties: {
    id: string;
    status: string;
    createdAt: Date;
  }[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users who are sellers and have at least one property
    const sellers = await prisma.user.findMany({
      where: {
        properties: {
          some: {} // Has at least one property
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        properties: {
          select: {
            id: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Transform the data to match the required format
    const formattedSellers = sellers.map((seller: Seller) => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      propertyCount: seller.properties.length,
      lastPropertyDate: seller.properties[0]?.createdAt || null,
      lastPropertyStatus: seller.properties[0]?.status || null
    }));

    return NextResponse.json(formattedSellers);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 