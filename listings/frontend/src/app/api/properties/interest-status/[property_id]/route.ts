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
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    // Έλεγχος αν υπάρχει ήδη ενδιαφέρον
    const existingInterest = await prisma.transaction.findFirst({
      where: {
        propertyId: params.property_id,
        buyerId: session.user.id,
        status: 'INTERESTED'
      }
    });

    return NextResponse.json({
      hasExpressedInterest: !!existingInterest
    });
  } catch (error) {
    console.error('Error checking interest status:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά τον έλεγχο της κατάστασης ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 