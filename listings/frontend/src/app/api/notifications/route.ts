import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';

interface AdminUser {
  id: string;
}

export async function GET(request: Request) {
  try {
    let userId: string | undefined;

    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    if (jwtUser) {
      userId = jwtUser.userId;
    } else {
      // Αν δεν υπάρχει JWT token, δοκιμάζουμε το session (για web)
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let userId: string | undefined;

    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    if (jwtUser) {
      userId = jwtUser.userId;
    } else {
      // Αν δεν υπάρχει JWT token, δοκιμάζουμε το session (για web)
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, type, metadata, title } = await request.json();

    // Αν η ειδοποίηση είναι για όλους τους admins
    if (type === 'ADMIN') {
      // Βρίσκουμε όλους τους admins
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
        },
        select: {
          id: true,
        },
      });

      // Δημιουργούμε ειδοποίηση για κάθε admin
      const notifications = await Promise.all(
        adminUsers.map((admin: AdminUser) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: title || 'Νέα Ειδοποίηση',
              message,
              type,
              metadata: metadata ? metadata : undefined,
            },
          })
        )
      );

      return NextResponse.json(notifications);
    }

    // Αν η ειδοποίηση είναι για συγκεκριμένο χρήστη
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        title: title || 'Νέα Ειδοποίηση',
        message,
        type,
        metadata: metadata ? metadata : undefined,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    let userId: string | undefined;

    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    if (jwtUser) {
      userId = jwtUser.userId;
    } else {
      // Αν δεν υπάρχει JWT token, δοκιμάζουμε το session (για web)
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 

export async function DELETE(request: Request) {
  try {
    let userId: string | undefined;

    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    if (jwtUser) {
      userId = jwtUser.userId;
    } else {
      // Αν δεν υπάρχει JWT token, δοκιμάζουμε το session (για web)
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const notificationId = url.searchParams.get('id');

    if (notificationId) {
      // Διαγραφή συγκεκριμένης ειδοποίησης
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId,
        },
      });
    } else {
      // Διαγραφή όλων των ειδοποιήσεων του χρήστη
      await prisma.notification.deleteMany({
        where: {
          userId: userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification(s):', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 