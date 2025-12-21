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

    // Update property status to unavailable
    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        status: 'unavailable'
      },
      include: {
        user: true
      }
    });

    // Create notification for the seller
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: 'Ακίνητο μη διαθέσιμο',
        message: 'Το ακίνητό σας έχει χαρακτηριστεί ως μη διαθέσιμο από τον διαχειριστή.',
        type: 'STATUS_CHANGE',
        propertyId: property.id
      }
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error marking property as unavailable:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 