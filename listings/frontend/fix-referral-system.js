const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function fixReferralSystem() {
  try {
    console.log('=== Starting Referral System Fix ===');
    
    // 1. Βρίσκουμε όλους τους χρήστες που έχουν referrals
    const allReferrals = await prisma.$queryRaw`
      SELECT DISTINCT 
        r.id,
        r."referrerId",
        r."referredId",
        r."referralCode",
        r."isActive",
        r."createdAt"
      FROM referrals r
      ORDER BY r."createdAt" ASC
    `;
    
    console.log(`Found ${allReferrals.length} total referrals`);
    
    // 2. Βρίσκουμε όλους τους χρήστες που έχουν πόντους
    const allPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp.points,
        rp.reason,
        rp."createdAt",
        r."referrerId",
        r."referredId"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      ORDER BY rp."createdAt" ASC
    `;
    
    console.log(`Found ${allPoints.length} total points records`);
    
    // 3. Δημιουργούμε self-referrals για όλους τους χρήστες που έχουν πόντους
    const usersWithPoints = new Set();
    
    for (const point of allPoints) {
      if (point.referrerId) usersWithPoints.add(point.referrerId);
      if (point.referredId) usersWithPoints.add(point.referredId);
    }
    
    console.log(`Found ${usersWithPoints.size} unique users with points`);
    
    // 4. Δημιουργούμε self-referrals για όλους τους χρήστες
    for (const userId of usersWithPoints) {
      const existingSelfReferral = await prisma.$queryRaw`
        SELECT id FROM referrals WHERE "referrerId" = ${userId} AND "referredId" = ${userId} AND "isActive" = true LIMIT 1
      `;
      
      if (!existingSelfReferral || !Array.isArray(existingSelfReferral) || existingSelfReferral.length === 0) {
        const selfReferralId = crypto.randomUUID();
        const selfReferralCode = crypto.randomBytes(8).toString('hex');
        
        await prisma.$executeRaw`
          INSERT INTO referrals (id, "referrerId", "referredId", "referralCode", "isActive", "createdAt", "updatedAt", "totalPoints", "propertiesAdded", "totalArea")
          VALUES (${selfReferralId}, ${userId}, ${userId}, ${selfReferralCode}, true, NOW(), NOW(), 0, 0, 0)
        `;
        
        console.log(`Created self-referral for user: ${userId}`);
      }
    }
    
    // 5. Ελέγχουμε και διορθώνουμε τους πόντους
    for (const point of allPoints) {
      // Αν ο χρήστης είναι referrer και έχει πόντους, πρέπει να είναι στο referral του
      if (point.referrerId && point.referrerId !== point.referredId) {
        // Οι πόντους του referrer πρέπει να παραμείνουν στο ίδιο referral
        console.log(`Keeping referrer points for user ${point.referrerId} in referral ${point.referralId}`);
      }
      
      // Αν ο χρήστης είναι referred και έχει πόντους, πρέπει να μεταφερθούν στο self-referral του
      if (point.referredId && point.referrerId !== point.referredId) {
        // Βρίσκουμε το self-referral του referred
        const selfReferral = await prisma.$queryRaw`
          SELECT id FROM referrals WHERE "referrerId" = ${point.referredId} AND "referredId" = ${point.referredId} AND "isActive" = true LIMIT 1
        `;
        
        if (selfReferral && Array.isArray(selfReferral) && selfReferral.length > 0) {
          const selfReferralId = selfReferral[0].id;
          
          // Μεταφέρουμε τους πόντους στο self-referral
          await prisma.$executeRaw`
            UPDATE referral_points 
            SET "referralId" = ${selfReferralId}
            WHERE id = ${point.id}
          `;
          
          console.log(`Moved points for referred user ${point.referredId} to self-referral ${selfReferralId}`);
        }
      }
    }
    
    // 6. Ενημερώνουμε τα totalPoints σε όλα τα referrals
    const allReferralsAfterFix = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "isActive" = true
    `;
    
    for (const referral of allReferralsAfterFix) {
      const totalPointsResult = await prisma.$queryRaw`
        SELECT COALESCE(SUM(points), 0) as "totalPoints"
        FROM referral_points
        WHERE "referralId" = ${referral.id}
      `;
      
      const totalPoints = Number(totalPointsResult[0]?.totalPoints || 0);
      
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = ${totalPoints}, "updatedAt" = NOW()
        WHERE id = ${referral.id}
      `;
      
      console.log(`Updated total points for referral ${referral.id}: ${totalPoints}`);
    }
    
    console.log('=== Referral System Fix Completed ===');
    
    // 7. Εμφάνιση στατιστικών
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT r.id) as "totalReferrals",
        COUNT(DISTINCT rp.id) as "totalPointsRecords",
        COUNT(DISTINCT CASE WHEN r."referrerId" = r."referredId" THEN r."referrerId" END) as "usersWithSelfReferrals"
      FROM referrals r
      LEFT JOIN referral_points rp ON r.id = rp."referralId"
      WHERE r."isActive" = true
    `;
    
    console.log('Final Statistics:', finalStats[0]);
    
  } catch (error) {
    console.error('Error fixing referral system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReferralSystem(); 