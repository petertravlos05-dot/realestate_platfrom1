import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Δεν έχετε εξουσιοδότηση' },
        { status: 401 }
      );
    }

    const propertyId = params.id;

    // Ελέγχουμε αν το ακίνητο υπάρχει και αν ανήκει στον χρήστη
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        user: {
          email: session.user.email
        }
      },
      include: {
        leads: true,
        transactions: {
          where: {
            status: {
              not: 'COMPLETED'
            }
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json(
        { message: 'Το ακίνητο δεν βρέθηκε ή δεν έχετε δικαίωμα πρόσβασης' },
        { status: 404 }
      );
    }

    // Ενημερώνουμε το ακίνητο για να ζητήσει αφαίρεση
    await prisma.property.update({
      where: {
        id: propertyId
      },
      data: {
        removalRequested: true,
        updatedAt: new Date()
      }
    });

    // Βρίσκουμε όλους τους admins για να τους στείλουμε ειδοποίηση
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true
      }
    });

    // Δημιουργούμε ειδοποιήσεις για τους admins
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Αίτηση Αφαίρεσης Ακινητού',
            message: `Αίτηση αφαίρεσης ακινητού: ${property.title}`,
            type: 'REMOVAL_REQUEST',
            metadata: {
              propertyId: propertyId,
              propertyTitle: property.title,
              sellerEmail: session.user.email,
              sellerName: session.user.name || 'Άγνωστος πωλητής'
            }
          }
        })
      )
    );

    return NextResponse.json(
      { message: 'Η αίτηση αφαίρεσης ακινητού στάλθηκε επιτυχώς' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Σφάλμα κατά την αίτηση αφαίρεσης ακινητού:', error);
    return NextResponse.json(
      { message: 'Εσωτερικό σφάλμα διακομιστή' },
      { status: 500 }
    );
  }
}



