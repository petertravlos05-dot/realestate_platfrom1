import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('=== Referral Stats API Called ===');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });
    
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('Requested userId:', userId);

    if (!userId) {
      console.log('No userId provided, returning 400');
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Έλεγχος αν ο χρήστης είναι admin ή αν ζητά τα δικά του stats
    if (session.user.role !== 'admin' && session.user.id !== userId) {
      console.log('Unauthorized access attempt:', {
        sessionUserId: session.user.id,
        requestedUserId: userId,
        userRole: session.user.role
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Authorization check passed');

    // Φέρνουμε τα referrals όπου ο χρήστης είναι referrer (έχει φέρει άλλους)
    console.log('Fetching referrer stats for userId:', userId);
    const referrerStats = await prisma.$queryRaw`
      SELECT 
        r.id,
        r."referralCode",
        r."createdAt" as "referralCreatedAt",
        r."referredId",
        'referrer' as "type"
      FROM referrals r
      WHERE r."referrerId" = ${userId} AND r."referredId" != ${userId}
      ORDER BY r."createdAt" DESC
    `;
    console.log('Referrer stats result:', referrerStats);

    // Φέρνουμε τα referrals όπου ο χρήστης είναι referred (έχει εγγραφεί μέσω referral)
    console.log('Fetching referred stats for userId:', userId);
    const referredStats = await prisma.$queryRaw`
      SELECT 
        r.id,
        r."referralCode",
        r."createdAt" as "referralCreatedAt",
        r."referrerId",
        'referred' as "type"
      FROM referrals r
      WHERE r."referredId" = ${userId} AND r."referrerId" != ${userId}
      ORDER BY r."createdAt" DESC
    `;
    console.log('Referred stats result:', referredStats);

    // Συνδυάζουμε τα δύο σύνολα
    const allReferrals = [...(referrerStats as any[]), ...(referredStats as any[])];

    // Φέρνουμε τους πόντους που ανήκουν στον συγκεκριμένο χρήστη
    console.log('Fetching points for userId:', userId);
    const userPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp."propertyId",
        rp.points,
        rp.reason,
        rp."createdAt",
        CASE 
          WHEN r."referrerId" = ${userId} AND rp."userId" = ${userId} THEN 'referrer'
          WHEN r."referredId" = ${userId} AND rp."userId" = ${userId} THEN 'referred'
          ELSE 'other'
        END as "pointType"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${userId}
      ORDER BY rp."createdAt" DESC
    `;
    console.log('User points result:', userPoints);

    // Υπολογίζουμε συνολικούς πόντους που ανήκουν στον συγκεκριμένο χρήστη
    console.log('Calculating total points for userId:', userId);
    const totalPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      WHERE rp."userId" = ${userId}
    `;
    console.log('Total points result:', totalPointsResult);

    const totalPoints = Number((totalPointsResult as any)[0]?.totalPoints || 0);
    console.log('Calculated total points:', totalPoints);

    // Υπολογίζουμε πόντους ως referrer
    const referrerPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referrerPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${userId} AND r."referrerId" = ${userId} AND r."referredId" != ${userId}
    `;
    const referrerPoints = Number((referrerPointsResult as any)[0]?.referrerPoints || 0);

    // Υπολογίζουμε πόντους ως referred
    const referredPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referredPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${userId} AND r."referredId" = ${userId} AND r."referrerId" != ${userId}
    `;
    const referredPoints = Number((referredPointsResult as any)[0]?.referredPoints || 0);

    console.log('Final results:', {
      totalPoints,
      referrerPoints,
      referredPoints,
      referralsCount: allReferrals.length,
      pointsCount: (userPoints as any[]).length,
      referrals: allReferrals,
      points: userPoints
    });

    return NextResponse.json({
      referrals: allReferrals,
      points: userPoints,
      totalPoints: totalPoints,
      referrerPoints: referrerPoints,
      referredPoints: referredPoints
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 