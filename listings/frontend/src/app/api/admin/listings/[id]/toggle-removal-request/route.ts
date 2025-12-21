import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    
    if (!action || !['approve', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Βρίσκουμε το ακίνητο
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Ενημερώνουμε το ακίνητο
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        removalRequested: action === 'approve' ? true : false,
        status: action === 'approve' ? 'unavailable' : 'approved'
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        title: action === 'approve' ? 'Αίτηση Αφαίρεσης Εγκρίθηκε' : 'Αίτηση Αφαίρεσης Ακυρώθηκε',
        message: action === 'approve' 
          ? `Η αίτηση αφαίρεσης για το ακίνητο "${property.title}" εγκρίθηκε από τον διαχειριστή. Το ακίνητο έχει αφαιρεθεί από την πλατφόρμα.`
          : `Η αίτηση αφαίρεσης για το ακίνητο "${property.title}" ακυρώθηκε από τον διαχειριστή. Το ακίνητο παραμένει διαθέσιμο στην πλατφόρμα.`,
        type: action === 'approve' ? 'removal_approved' : 'removal_cancelled',
        userId: property.userId,
        propertyId: property.id
      }
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error toggling removal request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



