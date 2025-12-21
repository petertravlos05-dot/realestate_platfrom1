import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    let userId = session.user.id;

    // Αν παρέχεται userEmail, ελέγχουμε αν υπάρχει χρήστης με αυτό το email
    if (userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true }
      });
      
      if (user) {
        userId = user.id;
      } else {
        // Αν δεν υπάρχει χρήστης με αυτό το email, επιστρέφουμε false
        return NextResponse.json({ 
          hasViewed: false,
          viewedAt: null 
        });
      }
    }

    // Έλεγχος αν το ακίνητο έχει προβληθεί από τον χρήστη (αφαιρούμε τον έλεγχο ρόλου)
    const propertyView = await prisma.propertyView.findFirst({
      where: {
        propertyId: params.id,
        buyerId: userId
      }
    });

    return NextResponse.json({ 
      hasViewed: !!propertyView,
      viewedAt: propertyView?.viewedAt 
    });
  } catch (error) {
    console.error('Error checking property view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Έλεγχος αν ο χρήστης είναι αγοραστής
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || user.role !== 'BUYER') {
      return NextResponse.json(
        { error: 'Only buyers can view properties' },
        { status: 403 }
      );
    }

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: params.id }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Καταγραφή της προβολής
    await prisma.propertyView.upsert({
      where: {
        propertyId_buyerId: {
          propertyId: params.id,
          buyerId: session.user.id
        }
      },
      create: {
        propertyId: params.id,
        buyerId: session.user.id
      },
      update: {
        viewedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording property view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 