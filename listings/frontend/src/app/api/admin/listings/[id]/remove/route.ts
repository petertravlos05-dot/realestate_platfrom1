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

    // Βρίσκουμε το ακίνητο
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Ενημερώνουμε το ακίνητο - το αφαιρούμε από την πλατφόρμα
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        status: 'unavailable',
        removalRequested: false // Αφαιρούμε το flag αφού το ακίνητο αφαιρέθηκε άμεσα
      },
      include: { user: true }
    });

    // Δημιουργούμε ειδοποίηση για τον ιδιοκτήτη
    await prisma.notification.create({
      data: {
        title: 'Ακίνητο Αφαιρέθηκε',
        message: `Το ακίνητο "${property.title}" αφαιρέθηκε από την πλατφόρμα από τον διαχειριστή.`,
        type: 'property_removed',
        userId: property.userId,
        propertyId: property.id
      }
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error removing property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




