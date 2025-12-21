import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = await params.id;
    
    const availabilities = await prisma.propertyAvailability.findMany({
      where: {
        propertyId: propertyId,
        date: {
          gte: new Date(),
        },
        isAvailable: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(availabilities);
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availabilities' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify that the user is the property owner
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!property || property.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { date, startTime, endTime } = body;

    const availability = await prisma.propertyAvailability.create({
      data: {
        propertyId: params.id,
        date: new Date(date),
        startTime,
        endTime,
        isAvailable: true,
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error creating availability:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify that the user is the property owner
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!property || property.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const availabilityId = searchParams.get('availabilityId');

    if (!availabilityId) {
      return new NextResponse('Availability ID is required', { status: 400 });
    }

    await prisma.propertyAvailability.delete({
      where: { id: availabilityId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting availability:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 