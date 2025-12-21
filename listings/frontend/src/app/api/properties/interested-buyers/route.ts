import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Property {
  id: string;
}

interface Transaction {
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  propertyId: string;
  createdAt: Date;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Πρέπει να συνδεθείτε για να δείτε τους ενδιαφερόμενους' },
        { status: 401 }
      );
    }

    // Βρίσκουμε πρώτα όλα τα ακίνητα του seller
    const properties = await prisma.property.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      select: {
        id: true
      }
    });

    const propertyIds = properties.map((p: Property) => p.id);

    // Βρίσκουμε όλους τους ενδιαφερόμενους για αυτά τα ακίνητα
    const interestedBuyers = await prisma.transaction.findMany({
      where: {
        propertyId: {
          in: propertyIds
        },
        status: 'INTERESTED'
      },
      include: {
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
        createdAt: 'desc'
      }
    });

    // Μετατρέπουμε τα δεδομένα στη μορφή που θέλουμε
    const formattedBuyers = interestedBuyers.map((transaction: Transaction) => ({
      id: transaction.buyer.id,
      name: transaction.buyer.name,
      email: transaction.buyer.email,
      phone: transaction.buyer.phone ?? '',
      propertyId: transaction.propertyId,
      createdAt: transaction.createdAt
    }));

    return NextResponse.json(formattedBuyers);
  } catch (error) {
    console.error('Error fetching interested buyers:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ενδιαφερόμενων' },
      { status: 500 }
    );
  }
} 