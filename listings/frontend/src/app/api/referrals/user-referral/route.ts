import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Λήψη referral δεδομένων για συγκεκριμένο χρήστη
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing user ID' 
      }, { status: 400 });
    }

    // Εύρεση του referral για αυτόν τον χρήστη
    const referral = await prisma.$queryRaw`
      SELECT r.*, u.name as referrer_name
      FROM referrals r
      JOIN users u ON r."referrerId" = u.id
      WHERE r."referredId" = ${userId} AND r."isActive" = true
      LIMIT 1
    `;

    if (!referral || !Array.isArray(referral) || referral.length === 0) {
      return NextResponse.json({
        hasReferral: false,
        referrerName: null,
        referralCode: null
      });
    }

    const referralData = referral[0] as any;

    return NextResponse.json({
      hasReferral: true,
      referrerName: referralData.referrer_name,
      referralCode: referralData.referralCode
    });

  } catch (error) {
    console.error('Error fetching user referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 