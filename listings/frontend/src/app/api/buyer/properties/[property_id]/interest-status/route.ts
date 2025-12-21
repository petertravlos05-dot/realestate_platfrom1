import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateJwtToken } from '@/middleware';

export async function GET(
  request: Request,
  { params }: { params: { property_id: string } }
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

    // Έλεγχος αν υπάρχει ήδη ενδιαφέρον
    const existingLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId: params.property_id,
        buyerId: userId
      }
    });

    return NextResponse.json({
      hasExpressedInterest: !!existingLead,
      interestCancelled: existingLead?.interestCancelled ?? false
    });
  } catch (error) {
    console.error('Error checking interest status:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά τον έλεγχο της κατάστασης ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 