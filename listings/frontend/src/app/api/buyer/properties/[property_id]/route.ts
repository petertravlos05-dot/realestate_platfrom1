import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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

    const property = await prisma.property.findUnique({
      where: { id: params.property_id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        stats: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν το ακίνητο είναι στα αγαπημένα του χρήστη
    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: session.user.id,
        propertyId: params.property_id,
      },
    });

    // Αύξηση του αριθμού προβολών
    await prisma.propertyStats.upsert({
      where: { propertyId: params.property_id },
      update: { views: { increment: 1 } },
      create: {
        propertyId: params.property_id,
        views: 1,
        interestedCount: 0,
        viewingCount: 0,
      },
    });

    // Υπολογισμός του αριθμού αγαπημένων και ερωτημάτων
    const favoritesCount = await prisma.favorite.count({
      where: { propertyId: params.property_id },
    });

    const inquiriesCount = await prisma.inquiry.count({
      where: { propertyId: params.property_id },
    });

    // Προσθήκη των επιπλέον πεδίων στο ακίνητο
    const propertyWithStats = {
      ...property,
      isFavorite: !!favorite,
      stats: {
        ...property.stats,
        favorites: favoritesCount,
        inquiries: inquiriesCount,
      },
    };

    return NextResponse.json(propertyWithStats);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση του ακινήτου' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { property_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }
    const body = await request.json();
    // Ενημέρωση του interestCancelled σε false
    const updatedLead = await prisma.propertyLead.updateMany({
      where: {
        propertyId: params.property_id,
        buyerId: session.user.id,
        interestCancelled: true
      },
      data: {
        interestCancelled: false
      }
    });
    // Ενημέρωση και στο transaction
    const updatedTransaction = await prisma.transaction.updateMany({
      where: {
        propertyId: params.property_id,
        buyerId: session.user.id,
        interestCancelled: true
      },
      data: {
        interestCancelled: false
      }
    });
    console.log('PATCH restore-interest:', {
      propertyId: params.property_id,
      buyerId: session.user.id,
      updatedLeadCount: updatedLead.count,
      updatedTransactionCount: updatedTransaction.count
    });
    if (updatedLead.count === 0) {
      return NextResponse.json(
        { error: 'Δεν βρέθηκε ακυρωμένο ενδιαφέρον για επαναφορά' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring interest:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την επαναφορά ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 