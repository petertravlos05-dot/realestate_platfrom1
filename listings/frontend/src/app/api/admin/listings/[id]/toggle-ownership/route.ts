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
    
    if (!action || !['remove', 'restore'].includes(action)) {
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

    // Αν είναι remove, θέτουμε σε unavailable
    // Αν είναι restore, επαναφέρουμε σε approved
    const newStatus = action === 'remove' ? 'unavailable' : 'approved';
    
    // Ενημερώνουμε το ακίνητο
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        status: newStatus
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: action === 'remove' ? 'Αφαίρεση Ιδιοκτησίας' : 'Επαναφορά Ιδιοκτησίας',
        message: action === 'remove' 
          ? 'Το ακίνητό σας έχει αφαιρεθεί από τη δημόσια προβολή από τον διαχειριστή.'
          : 'Το ακίνητό σας έχει επαναφερθεί στη δημόσια προβολή από τον διαχειριστή.',
        type: 'OWNERSHIP_CHANGE',
        propertyId: property.id
      }
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error toggling property ownership:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 