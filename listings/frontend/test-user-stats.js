const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserStats(userId) {
  try {
    console.log(`=== Testing Stats for User: ${userId} ===`);
    
    // 1. Βρίσκουμε τα referrals όπου ο χρήστης είναι referrer
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
    
    console.log('Referrer stats:', referrerStats);
    
    // 2. Βρίσκουμε τα referrals όπου ο χρήστης είναι referred
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
    
    console.log('Referred stats:', referredStats);
    
    // 3. Βρίσκουμε τους πόντους του χρήστη
    const userPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp."propertyId",
        rp.points,
        rp.reason,
        rp."createdAt",
        CASE 
          WHEN r."referrerId" = ${userId} AND r."referredId" != ${userId} THEN 'referrer'
          WHEN r."referredId" = ${userId} AND r."referrerId" != ${userId} THEN 'referred'
          WHEN r."referrerId" = ${userId} AND r."referredId" = ${userId} THEN 'self'
          ELSE 'other'
        END as "pointType"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referrerId" = ${userId} OR r."referredId" = ${userId})
      ORDER BY rp."createdAt" DESC
    `;
    
    console.log('User points:', userPoints);
    
    // 4. Υπολογίζουμε συνολικούς πόντους
    const totalPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referrerId" = ${userId} OR r."referredId" = ${userId})
    `;
    
    const totalPoints = Number(totalPointsResult[0]?.totalPoints || 0);
    
    // 5. Υπολογίζουμε πόντους ως referrer
    const referrerPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referrerPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referrerId" = ${userId} AND r."referredId" != ${userId}
    `;
    const referrerPoints = Number(referrerPointsResult[0]?.referrerPoints || 0);
    
    // 6. Υπολογίζουμε πόντους ως referred (συμπεριλαμβανομένων των self-referrals)
    const referredPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referredPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referredId" = ${userId} AND r."referrerId" != ${userId}) OR (r."referrerId" = ${userId} AND r."referredId" = ${userId})
    `;
    const referredPoints = Number(referredPointsResult[0]?.referredPoints || 0);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Points: ${totalPoints}`);
    console.log(`Referrer Points: ${referrerPoints}`);
    console.log(`Referred Points: ${referredPoints}`);
    console.log(`Referrals as Referrer: ${referrerStats.length}`);
    console.log(`Referrals as Referred: ${referredStats.length}`);
    console.log(`Total Points Records: ${userPoints.length}`);
    
  } catch (error) {
    console.error('Error testing user stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση για έναν συγκεκριμένο χρήστη
const testUserId = process.argv[2];
if (testUserId) {
  testUserStats(testUserId);
} else {
  console.log('Please provide a user ID as argument');
  console.log('Usage: node test-user-stats.js <userId>');
} 