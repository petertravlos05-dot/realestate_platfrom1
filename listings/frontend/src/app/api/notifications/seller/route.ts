import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Φιλτράρουμε τις ειδοποιήσεις που είναι σχετικές με sellers
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { type: 'SELLER_INTEREST' },
          { type: 'SELLER_APPOINTMENT' },
          { type: 'SELLER_OFFER' },
          { type: 'SELLER_TRANSACTION' },
          { type: 'SELLER_GENERAL' },
          {
            metadata: {
              path: ['recipient'],
              equals: 'seller'
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching seller notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, type, metadata, title } = await request.json();

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: title || 'Νέα Ειδοποίηση Πωλητή',
        message,
        type: type || 'SELLER_GENERAL',
        metadata: metadata ? metadata : undefined,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating seller notification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 