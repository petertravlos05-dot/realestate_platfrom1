import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// Δημιουργία referral link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referredUserId } = await request.json();

    // Δημιουργία μοναδικού referral code
    const referralCode = randomBytes(8).toString('hex');

    // Για τώρα, επιστρέφουμε μόνο τον referral code
    // Θα προσθέσουμε τη λειτουργικότητα με τα νέα models αργότερα
    const referralData = {
      referrerId: session.user.id,
      referredId: referredUserId,
      referralCode,
      totalPoints: 100,
      propertiesAdded: 0,
      totalArea: 0,
    };

    return NextResponse.json({ 
      success: true, 
      referral: referralData,
      message: 'Referral created successfully' 
    });

  } catch (error) {
    console.error('Error creating referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Λήψη referral statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Για τώρα, επιστρέφουμε mock data
    // Θα προσθέσουμε τη λειτουργικότητα με τα νέα models αργότερα
    const mockData = {
      referralsMade: [],
      totalPoints: 1250,
      totalProperties: 3,
      totalArea: 450,
      recentPoints: [
        {
          id: '1',
          points: 100,
          reason: 'registration',
          createdAt: new Date('2024-01-15'),
          referral: {
            referred: {
              name: 'Γιώργος Παπαδόπουλος',
              email: 'giorgos@example.com',
            },
          },
        },
        {
          id: '2',
          points: 500,
          reason: 'property_added',
          createdAt: new Date('2024-01-10'),
          property: {
            title: 'Μοντέρνο διαμέρισμα στο κέντρο',
            area: 120,
            city: 'Αθήνα',
          },
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: mockData,
    });

  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 