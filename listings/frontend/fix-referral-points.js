const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function fixReferralPoints() {
  try {
    console.log('=== Starting Referral Points Fix ===');
    
    // 1. Βρίσκουμε όλα τα referrals όπου referrerId = referredId (self-referrals που δημιουργήθηκαν λάθος)
    const selfReferrals = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referrerId" = "referredId" AND "isActive" = true
    `;
    
    console.log(`Found ${selfReferrals.length} self-referrals`);
    
    // 2. Για κάθε self-referral, ελέγχουμε αν έχει πόντους
    for (const selfReferral of selfReferrals) {
      console.log(`\nProcessing self-referral: ${selfReferral.id}`);
      console.log(`User ID: ${selfReferral.referrerId}`);
      console.log(`Referral Code: ${selfReferral.referralCode}`);
      
      // Βρίσκουμε τους πόντους αυτού του self-referral
      const points = await prisma.$queryRaw`
        SELECT * FROM referral_points WHERE "referralId" = ${selfReferral.id}
      `;
      
      console.log(`Found ${points.length} points in this self-referral`);
      
      if (points.length > 0) {
        // Αν έχει πόντους, ελέγχουμε αν είναι registration points
        const registrationPoints = points.filter(p => p.reason === 'registration');
        
        if (registrationPoints.length > 0) {
          console.log(`Found ${registrationPoints.length} registration points - these should be removed`);
          
          // Διαγράφουμε τα registration points από το self-referral
          for (const point of registrationPoints) {
            await prisma.$executeRaw`
              DELETE FROM referral_points WHERE id = ${point.id}
            `;
            console.log(`Deleted registration point: ${point.id} (${point.points} points)`);
          }
          
          // Ενημερώνουμε τα totalPoints του self-referral
          const remainingPoints = await prisma.$queryRaw`
            SELECT COALESCE(SUM(points), 0) as "totalPoints"
            FROM referral_points 
            WHERE "referralId" = ${selfReferral.id}
          `;
          
          const totalPoints = Number(remainingPoints[0]?.totalPoints || 0);
          
          await prisma.$executeRaw`
            UPDATE referrals 
            SET "totalPoints" = ${totalPoints}, "updatedAt" = NOW()
            WHERE id = ${selfReferral.id}
          `;
          
          console.log(`Updated self-referral total points to: ${totalPoints}`);
        }
      }
    }
    
    // 3. Βρίσκουμε referrals όπου referredId είναι NULL (σωστά δημιουργημένα)
    const validReferrals = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referredId" IS NULL AND "isActive" = true
    `;
    
    console.log(`\nFound ${validReferrals.length} valid referrals (with NULL referredId)`);
    
    // 4. Εμφάνιση στατιστικών
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as "totalReferrals",
        COUNT(CASE WHEN "referrerId" = "referredId" THEN 1 END) as "selfReferrals",
        COUNT(CASE WHEN "referredId" IS NULL THEN 1 END) as "validReferrals",
        COUNT(CASE WHEN "referredId" IS NOT NULL AND "referrerId" != "referredId" THEN 1 END) as "completedReferrals"
      FROM referrals 
      WHERE "isActive" = true
    `;
    
    console.log('\n=== Final Statistics ===');
    console.log('Total Referrals:', stats[0].totalReferrals);
    console.log('Self Referrals:', stats[0].selfReferrals);
    console.log('Valid Referrals (NULL referredId):', stats[0].validReferrals);
    console.log('Completed Referrals:', stats[0].completedReferrals);
    
    // 5. Εμφάνιση πόντων ανά τύπο
    const pointsStats = await prisma.$queryRaw`
      SELECT 
        rp.reason,
        COUNT(*) as "count",
        SUM(rp.points) as "totalPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      GROUP BY rp.reason
      ORDER BY rp.reason
    `;
    
    console.log('\n=== Points Statistics ===');
    pointsStats.forEach(stat => {
      console.log(`${stat.reason}: ${stat.count} records, ${stat.totalPoints} total points`);
    });
    
    console.log('\n=== Referral Points Fix Completed ===');
    
  } catch (error) {
    console.error('Error fixing referral points:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReferralPoints(); 