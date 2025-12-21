import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('=== Referral Leaderboard API Called ===');
    
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

    // Φέρνουμε τους top 10 χρήστες με βάση τους συνολικούς πόντους (όλων των ρόλων)
    console.log('Fetching top 10 users with referral points...');
    const leaderboardData = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.image,
        COALESCE(SUM(rp.points), 0) as "totalPoints",
        COUNT(DISTINCT r.id) as "totalReferrals",
        COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
        MAX(rp."createdAt") as "lastActivity"
      FROM users u
      LEFT JOIN referral_points rp ON u.id = rp."userId"
      LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
      WHERE u.id != ${session.user.id}
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC, "totalReferrals" DESC
      LIMIT 10
    `;
    
    console.log('Leaderboard data fetched:', leaderboardData);

    // Φέρνουμε και τη θέση του τρέχοντος χρήστη
    console.log('Fetching current user rank...');
    const currentUserRank = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.image,
        COALESCE(SUM(rp.points), 0) as "totalPoints",
        COUNT(DISTINCT r.id) as "totalReferrals",
        COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
        MAX(rp."createdAt") as "lastActivity",
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(rp.points), 0) DESC, COUNT(DISTINCT r.id) DESC) as "rank"
      FROM users u
      LEFT JOIN referral_points rp ON u.id = rp."userId"
      LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING u.id = ${session.user.id}
    `;

    console.log('Current user rank:', currentUserRank);

    // Υπολογίζουμε συνολικό αριθμό χρηστών με πόντους
    const totalUsersResult = await prisma.$queryRaw`
      SELECT COUNT(*) as "totalUsers"
      FROM (
        SELECT u.id
        FROM users u
        LEFT JOIN referral_points rp ON u.id = rp."userId"
        GROUP BY u.id
        HAVING COALESCE(SUM(rp.points), 0) > 0
      ) as users_with_points
    `;
    
    const totalUsers = Number((totalUsersResult as any[])[0]?.totalUsers || 0);
    console.log('Total users with points:', totalUsers);

    // Προσθέτουμε ranking στους top 10
    const leaderboardWithRanking = (leaderboardData as any[]).map((agent, index) => ({
      ...agent,
      rank: index + 1,
      totalPoints: Number(agent.totalPoints),
      totalReferrals: Number(agent.totalReferrals),
      propertiesAdded: Number(agent.propertiesAdded)
    }));

    const currentUser = (currentUserRank as any[])[0] ? {
      ...(currentUserRank as any[])[0],
      rank: Number((currentUserRank as any[])[0].rank),
      totalPoints: Number((currentUserRank as any[])[0].totalPoints),
      totalReferrals: Number((currentUserRank as any[])[0].totalReferrals),
      propertiesAdded: Number((currentUserRank as any[])[0].propertiesAdded)
    } : null;

    console.log('Final leaderboard response:', {
      leaderboard: leaderboardWithRanking,
      currentUser,
      totalUsers
    });

    return NextResponse.json({
      leaderboard: leaderboardWithRanking,
      currentUser,
      totalUsers
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 