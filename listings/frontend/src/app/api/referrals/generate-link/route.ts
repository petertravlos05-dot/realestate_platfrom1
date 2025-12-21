import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import crypto from 'crypto';

// Δημιουργία referral link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Generating referral link for user:', session.user.id);
    
    // Έλεγχος αν υπάρχει ήδη referral code για αυτόν τον χρήστη ως referrer
    const existingReferral = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referrerId" = ${session.user.id} AND "referredId" != ${session.user.id} AND "isActive" = true
    `;
    
    console.log('Existing referral found:', existingReferral);

    let referralCode: string = '';

    if (existingReferral && Array.isArray(existingReferral) && existingReferral.length > 0) {
      // Χρησιμοποιούμε τον υπάρχοντα κωδικό
      referralCode = (existingReferral[0] as any).referralCode;
    } else {
      // Δημιουργία νέου μοναδικού referral code
      let isUnique = false;
      let tempReferralCode: string;
      
      while (!isUnique) {
        tempReferralCode = randomBytes(8).toString('hex');
        
        // Έλεγχος αν υπάρχει ήδη
        const existing = await prisma.$queryRaw`
          SELECT * FROM referrals WHERE "referralCode" = ${tempReferralCode}
        `;
        
        if (!existing || !Array.isArray(existing) || existing.length === 0) {
          isUnique = true;
          referralCode = tempReferralCode;
        }
      }

      // Δημιουργία του referral record (μόνο για τον referrer, με referredId ίσο με referrerId προσωρινά)
      await prisma.$executeRaw`
        INSERT INTO referrals (id, "referrerId", "referredId", "referralCode", "totalPoints", "propertiesAdded", "totalArea", "isActive", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${session.user.id}, ${session.user.id}, ${referralCode}, 0, 0, 0, true, NOW(), NOW())
      `;
      
      console.log('Created referral record with code:', referralCode);
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3004';
    const referralLink = `${baseUrl}/register?ref=${referralCode}`;

    return NextResponse.json({ 
      success: true, 
      referralCode,
      referralLink,
      message: 'Referral link generated successfully' 
    });

  } catch (error) {
    console.error('Error generating referral link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 