import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.appointmentId;

    // Βρίσκουμε το ραντεβού με τα σχετικά δεδομένα
    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            state: true,
            city: true,
            street: true,
            price: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!viewingRequest) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Επιβεβαιώνουμε ότι το ραντεβού ανήκει σε ακίνητο του seller
    const property = await prisma.property.findFirst({
      where: {
        id: viewingRequest.propertyId,
        userId: session.user.id,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Unauthorized access to appointment' }, { status: 403 });
    }

    return NextResponse.json({
      id: viewingRequest.id,
      propertyId: viewingRequest.propertyId,
      buyerId: viewingRequest.buyerId,
      date: viewingRequest.date,
      time: viewingRequest.time,
      endTime: viewingRequest.endTime,
      status: viewingRequest.status,
      createdAt: viewingRequest.createdAt,
      updatedAt: viewingRequest.updatedAt,
      property: viewingRequest.property,
      buyer: viewingRequest.buyer,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 