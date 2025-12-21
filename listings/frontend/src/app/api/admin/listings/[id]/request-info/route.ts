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

    const { message } = await request.json();

    // Update property status
    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        status: 'info_requested'
      },
      include: {
        user: true
      }
    });

    // Create notification for the seller
    await prisma.notification.create({
      data: {
        userId: property.user.id,
        title: 'Αίτημα για επιπλέον πληροφορίες',
        type: 'INFO_REQUEST',
        message: message || 'Ο διαχειριστής ζήτησε επιπλέον πληροφορίες για το ακίνητό σας.',
        propertyId: property.id
      }
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error requesting additional info:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 