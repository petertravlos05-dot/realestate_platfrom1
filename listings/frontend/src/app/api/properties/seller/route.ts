import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    const session = await getServerSession(authOptions);
    let userId;
    let userEmail;

    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string; email: string };
        userId = decoded.userId;
        userEmail = decoded.email;
      } catch (error) {
        return NextResponse.json(
          { error: 'Μη έγκυρο token' },
          { status: 401 }
        );
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Πρέπει να συνδεθείτε για να δείτε τα ακίνητά σας' },
        { status: 401 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        user: {
          email: userEmail
        }
      },
      include: {
        stats: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' },
      { status: 500 }
    );
  }
} 