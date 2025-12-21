import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { property_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Το μήνυμα είναι υποχρεωτικό' },
        { status: 400 }
      );
    }

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: params.property_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Δημιουργία του ερωτήματος
    const inquiry = await prisma.inquiry.create({
      data: {
        message,
        propertyId: params.property_id,
        userId: session.user.id,
      },
    });

    // Ενημέρωση του αριθμού ενδιαφερόμενων
    await prisma.propertyStats.update({
      where: { propertyId: params.property_id },
      data: { interestedCount: { increment: 1 } },
    });

    // Δημιουργία ειδοποίησης για τον πωλητή
    await prisma.notification.create({
      data: {
        title: 'Νέο Ερώτημα',
        type: 'INQUIRY',
        message: `Νέο ερώτημα για το ακίνητο ${property.title}`,
        userId: property.user.id,
        propertyId: params.property_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending inquiry:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποστολή του ερωτήματος' },
      { status: 500 }
    );
  }
} 