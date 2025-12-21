import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateJwtToken } from '@/middleware';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { id: propertyId } = params;

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν το ακίνητο είναι ήδη στα αγαπημένα
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        propertyId
      }
    });

    if (existingFavorite) {
      // Αν υπάρχει, το αφαιρούμε από τα αγαπημένα
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });

      return NextResponse.json({
        message: 'Το ακίνητο αφαιρέθηκε από τα αγαπημένα',
        isFavorite: false
      });
    } else {
      // Αν δεν υπάρχει, το προσθέτουμε στα αγαπημένα
      await prisma.favorite.create({
        data: {
          userId,
          propertyId
        }
      });

      return NextResponse.json({
        message: 'Το ακίνητο προστέθηκε στα αγαπημένα',
        isFavorite: true
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ενημέρωση των αγαπημένων' },
      { status: 500 }
    );
  }
} 