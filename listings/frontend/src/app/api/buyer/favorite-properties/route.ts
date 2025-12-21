import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateJwtToken } from '@/middleware';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    let userId: string | undefined;

    if (jwtUser) {
      // Αν έχουμε έγκυρο JWT token, χρησιμοποιούμε το userId από αυτό
      userId = jwtUser.userId;
    } else {
      // Αλλιώς δοκιμάζουμε το next-auth session (για το web app)
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: userId,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({
      properties: favorites.map(favorite => favorite.property)
    });
  } catch (error) {
    console.error('Error fetching favorite properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των αγαπημένων ακινήτων' },
      { status: 500 }
    );
  }
} 