import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points, reason } = await request.json();
    const { userId } = params;

    if (!points || !reason || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Έλεγχος αν ο χρήστης υπάρχει
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Αν προσπαθούμε να αφαιρέσουμε πόντους, ελέγχουμε αν ο χρήστης έχει αρκετούς
    if (points < 0) {
      // Υπολογίζουμε τους συνολικούς πόντους του χρήστη
      const totalPointsResult = await prisma.$queryRaw`
        SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
        FROM referral_points rp
        INNER JOIN referrals r ON rp."referralId" = r.id
        WHERE (r."referrerId" = ${userId} OR r."referredId" = ${userId})
      `;
      
      const totalPoints = Number((totalPointsResult as any)[0]?.totalPoints || 0);
      const pointsToRemove = Math.abs(points);
      
      if (totalPoints < pointsToRemove) {
        return NextResponse.json({ 
          error: `Ο χρήστης έχει μόνο ${totalPoints} πόντους. Δεν μπορείτε να αφαιρέσετε ${pointsToRemove} πόντους.` 
        }, { status: 400 });
      }
    }

    // Βρίσκουμε ή δημιουργούμε referral record για τον χρήστη
    let referralId: string;
    const existingReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referrerId" = ${userId} AND "isActive" = true LIMIT 1
    `;
    
    if (existingReferral && Array.isArray(existingReferral) && existingReferral.length > 0) {
      // Χρησιμοποιούμε το υπάρχον referral
      referralId = (existingReferral[0] as any).id;
    } else {
      // Δημιουργούμε ένα νέο referral record
      referralId = crypto.randomUUID();
      const newReferralCode = crypto.randomBytes(8).toString('hex');
      
      await prisma.$executeRaw`
        INSERT INTO referrals (id, "referrerId", "referredId", "referralCode", "isActive", "createdAt", "updatedAt", "totalPoints", "propertiesAdded", "totalArea")
        VALUES (${referralId}, ${userId}, ${userId}, ${newReferralCode}, true, NOW(), NOW(), 0, 0, 0)
      `;
    }

    // Προσθήκη πόντων στον χρήστη
    await prisma.$executeRaw`
      INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
      VALUES (${crypto.randomUUID()}, ${referralId}, ${userId}, ${points}, ${reason}, NOW())
    `;

    // Ενημέρωση των στατιστικών του referral
    await prisma.$executeRaw`
      UPDATE referrals 
      SET "totalPoints" = "totalPoints" + ${points}, 
          "updatedAt" = NOW()
      WHERE id = ${referralId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Points added successfully',
      points,
      reason
    });

  } catch (error) {
    console.error('Error adding points:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 