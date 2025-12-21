import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { property_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: params.property_id },
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
        userId: session.user.id,
        propertyId: params.property_id,
      },
    });

    if (existingFavorite) {
      // Αφαίρεση από τα αγαπημένα
      await prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });

      // Ενημέρωση του αριθμού ενδιαφερόμενων
      await prisma.propertyStats.update({
        where: { propertyId: params.property_id },
        data: { interestedCount: { decrement: 1 } },
      });

      return NextResponse.json({ isFavorite: false });
    } else {
      // Προσθήκη στα αγαπημένα
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          propertyId: params.property_id,
        },
      });

      // Ενημέρωση του αριθμού ενδιαφερόμενων
      await prisma.propertyStats.update({
        where: { propertyId: params.property_id },
        data: { interestedCount: { increment: 1 } },
      });

      return NextResponse.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ενημέρωση των αγαπημένων' },
      { status: 500 }
    );
  }
} 