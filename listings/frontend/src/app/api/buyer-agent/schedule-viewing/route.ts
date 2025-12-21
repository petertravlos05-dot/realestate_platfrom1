import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { agentId, date, time } = body;
    const propertyId = params.id;

    // Verify availability
    const availability = await prisma.propertyAvailability.findFirst({
      where: {
        propertyId,
        date: new Date(date),
        startTime: time,
        isAvailable: true,
      },
    });

    if (!availability) {
      return new NextResponse('Selected time is not available', { status: 400 });
    }

    // Create viewing request
    const viewing = await prisma.viewingRequest.create({
      data: {
        propertyId,
        buyerId: session.user.id,
        agentId,
        date: new Date(date),
        time,
        endTime: time,
        status: 'PENDING',
      },
    });

    // Update availability
    await prisma.propertyAvailability.update({
      where: { id: availability.id },
      data: { isAvailable: false },
    });

    // Create notifications
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    });

    if (property) {
      // Notify seller
      await prisma.notification.create({
        data: {
          userId: property.userId,
          title: 'Νέο Αίτημα Επισκέψεως',
          message: `Έχετε λάβει νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
          type: 'VIEWING_REQUEST',
        },
      });

      // Notify agent if exists
      if (agentId) {
        await prisma.notification.create({
          data: {
            userId: agentId,
            title: 'Νέο Αίτημα Επισκέψεως',
            message: `Έχετε λάβει νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
            type: 'VIEWING_REQUEST',
          },
        });
      }

      // Notify admin
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (admin) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Νέο Αίτημα Επισκέψεως',
            message: `Νέο αίτημα επισκέψεως για το ακίνητο ${property.title}`,
            type: 'VIEWING_REQUEST',
          },
        });
      }
    }

    return NextResponse.json(viewing);
  } catch (error) {
    console.error('Error scheduling viewing:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 