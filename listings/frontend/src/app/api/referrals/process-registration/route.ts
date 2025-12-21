import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Επεξεργασία referral κατά την εγγραφή
export async function POST(request: NextRequest) {
  try {
    const { referralCode, userId } = await request.json();
    
    console.log('Processing referral registration:', { referralCode, userId });

    if (!referralCode || !userId) {
      return NextResponse.json({ 
        error: 'Missing referral code or user ID' 
      }, { status: 400 });
    }

    // Έλεγχος αν ο χρήστης έχει ήδη κάνει εγγραφή ως referred σε οποιοδήποτε referral
    const existingUserReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referredId" = ${userId} AND "isActive" = true LIMIT 1
    `;
    
    if (existingUserReferral && Array.isArray(existingUserReferral) && existingUserReferral.length > 0) {
      console.log('User already has a referral as referred, skipping points addition');
      return NextResponse.json({ 
        success: true,
        message: 'User already has a referral as referred',
        referralCode,
        userId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Εύρεση του referral με βάση τον κωδικό
    const existingReferral = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referralCode" = ${referralCode} AND "isActive" = true
    `;
    
    console.log('Existing referral found:', existingReferral);

    if (!existingReferral || !Array.isArray(existingReferral) || existingReferral.length === 0) {
      console.log('No valid referral found for code:', referralCode);
      return NextResponse.json({ 
        error: 'Invalid referral code' 
      }, { status: 400 });
    }

    const referralData = existingReferral[0] as any;
    const referrerId = referralData.referrerId;

    // Έλεγχος αν ο referrer είναι ίδιος με τον referred (αυτο-referral)
    if (referrerId === userId) {
      console.log('Self-referral detected, skipping points addition');
      return NextResponse.json({ 
        success: true,
        message: 'Self-referral detected, no points added',
        referralCode,
        userId,
        referrerId: referrerId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Έλεγχος αν ο χρήστης έχει ήδη λάβει πόντους registration
    const existingRegistrationPoints = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referredId" = ${userId} OR r."referrerId" = ${userId}) 
      AND rp.reason = 'registration'
    `;
    
    const hasRegistrationPoints = Number((existingRegistrationPoints as any[])[0]?.count || 0) > 0;
    
    if (hasRegistrationPoints) {
      console.log('User already has registration points, skipping points addition');
      return NextResponse.json({ 
        success: true,
        message: 'User already has registration points',
        referralCode,
        userId,
        referrerId: referrerId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Ενημέρωση του υπάρχοντος referral με το referredId
    const updateReferral = await prisma.$executeRaw`
      UPDATE referrals 
      SET "referredId" = ${userId}, "updatedAt" = NOW()
      WHERE "referralCode" = ${referralCode} AND "referrerId" = ${referrerId}
    `;
    
    console.log('Updated referral with referredId:', userId);

    // Λήψη του ID του referral
    const referralResult = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referralCode" = ${referralCode} AND "referrerId" = ${referrerId}
    `;
    
    const referralId = (referralResult as any[])[0]?.id;
    console.log('Referral ID for points:', referralId);

    // Προσθήκη πόντων στον referrer (100 πόντους)
    if (referralId) {
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
        VALUES (${crypto.randomUUID()}, ${referralId}, ${referrerId}, 100, 'registration', NOW())
      `;
      console.log('Added 100 points to referrer for registration');
    }

    // Προσθήκη πόντων στον referred (50 πόντους) - στο ίδιο referral record
    if (referralId) {
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
        VALUES (${crypto.randomUUID()}, ${referralId}, ${userId}, 50, 'registration', NOW())
      `;
      console.log('Added 50 points to referred user for registration');
    }

    // Ενημέρωση των στατιστικών του referral (συνολικά 150 πόντους)
    if (referralId) {
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = "totalPoints" + 150, 
            "updatedAt" = NOW()
        WHERE id = ${referralId}
      `;
    }

    const referrerPointsAdded = referralId ? 100 : 0;
    const referredPointsAdded = referralId ? 50 : 0;
    
    console.log(`Referral processed successfully: ${referralCode} for user: ${userId} by referrer: ${referrerId}`);
    console.log('Points added:', { referrerPointsAdded, referredPointsAdded });

    return NextResponse.json({ 
      success: true, 
      message: 'Referral processed successfully',
      referralCode,
      userId,
      referrerId: referrerId,
      referrerPoints: referrerPointsAdded,
      referredPoints: referredPointsAdded
    });

  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 