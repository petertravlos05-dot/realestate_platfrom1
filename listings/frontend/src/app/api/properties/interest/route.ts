import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface AdminUser {
  id: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await request.json();

    // Ελέγχουμε αν υπάρχει ήδη ενδιαφέρον
    const existingInterest = await prisma.transaction.findFirst({
      where: {
        propertyId,
        buyerId: session.user.id,
        status: 'INTERESTED'
      }
    });

    if (existingInterest) {
      return NextResponse.json(
        { error: 'Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο' },
        { status: 400 }
      );
    }

    // Βρίσκουμε το ακίνητο
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
    if (property.user.id === session.user.id) {
      return NextResponse.json(
        { error: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς' },
        { status: 400 }
      );
    }

    // Βρίσκουμε έναν διαθέσιμο agent
    const agent = await prisma.user.findFirst({
      where: {
        role: 'AGENT'
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Δεν βρέθηκε διαθέσιμος μεσίτης' },
        { status: 404 }
      );
    }

    // Δημιουργούμε το transaction
    const transaction = await prisma.transaction.create({
      data: {
        propertyId,
        buyerId: session.user.id,
        agentId: agent.id,
        status: 'INTERESTED'
      }
    });

    // Ενημερώνουμε τα στατιστικά
    await prisma.propertyStats.update({
      where: { propertyId },
      data: {
        interestedCount: {
          increment: 1
        }
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
      admins.map((admin: AdminUser) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Νέο Ενδιαφέρον',
            message: `Νέο ενδιαφέρον για το ακίνητο ${property.title} από τον χρήστη ${session.user.email}`,
            type: 'INTEREST'
          }
        })
      )
    );

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error expressing interest:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 