const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestData() {
  try {
    console.log('=== Cleaning up test data ===\n');

    // 1. Βρίσκουμε όλους τους test agents
    console.log('1. Finding test agents...');
    const testEmails = [
      'giorgos@test.com',
      'maria@test.com', 
      'nikos@test.com',
      'eleni@test.com',
      'alex@test.com',
      'sofia@test.com',
      'dimitris@test.com',
      'anna@test.com',
      'kostas@test.com',
      'irini@test.com',
      'michalis@test.com',
      'christina@test.com'
    ];

    const testAgents = await prisma.user.findMany({
      where: {
        email: { in: testEmails },
        role: 'AGENT'
      }
    });

    console.log(`Found ${testAgents.length} test agents to remove`);

    if (testAgents.length === 0) {
      console.log('No test agents found. Database is already clean.');
      return;
    }

    // 2. Βρίσκουμε τα referral IDs για αυτούς τους agents
    console.log('\n2. Finding referral records...');
    const agentIds = testAgents.map(agent => agent.id);
    
    const referrals = await prisma.referral.findMany({
      where: {
        OR: [
          { referrerId: { in: agentIds } },
          { referredId: { in: agentIds } }
        ]
      }
    });

    console.log(`Found ${referrals.length} referral records to remove`);

    // 3. Διαγράφουμε τα referral points πρώτα (CASCADE)
    console.log('\n3. Deleting referral points...');
    const referralIds = referrals.map(ref => ref.id);
    
    if (referralIds.length > 0) {
      const deletedPoints = await prisma.referralPoints.deleteMany({
        where: {
          referralId: { in: referralIds }
        }
      });
      console.log(`Deleted ${deletedPoints.count} referral points`);
    }

    // 4. Διαγράφουμε τα referrals
    console.log('\n4. Deleting referral records...');
    if (referrals.length > 0) {
      const deletedReferrals = await prisma.referral.deleteMany({
        where: {
          id: { in: referralIds }
        }
      });
      console.log(`Deleted ${deletedReferrals.count} referral records`);
    }

    // 5. Διαγράφουμε τους test agents
    console.log('\n5. Deleting test agents...');
    const deletedAgents = await prisma.user.deleteMany({
      where: {
        id: { in: agentIds }
      }
    });
    console.log(`Deleted ${deletedAgents.count} test agents`);

    // 6. Επιβεβαίωση ότι τα δεδομένα διαγράφηκαν
    console.log('\n6. Verifying cleanup...');
    
    const remainingTestAgents = await prisma.user.findMany({
      where: {
        email: { in: testEmails }
      }
    });

    const remainingReferrals = await prisma.referral.findMany({
      where: {
        OR: [
          { referrerId: { in: agentIds } },
          { referredId: { in: agentIds } }
        ]
      }
    });

    console.log(`Remaining test agents: ${remainingTestAgents.length}`);
    console.log(`Remaining test referrals: ${remainingReferrals.length}`);

    if (remainingTestAgents.length === 0 && remainingReferrals.length === 0) {
      console.log('\n✅ Test data cleanup completed successfully!');
    } else {
      console.log('\n⚠️ Some test data may still remain');
    }

    // 7. Εμφάνιση τρέχοντος leaderboard με αληθινά δεδομένα
    console.log('\n7. Current leaderboard with real data:');
    
    const realLeaderboard = await prisma.$queryRaw`
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
      WHERE u.role = 'AGENT'
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC, "totalReferrals" DESC
      LIMIT 10
    `;

    if (realLeaderboard.length === 0) {
      console.log('No agents with points found in the database.');
      console.log('The leaderboard will be empty until real agents start earning points.');
    } else {
      console.log('\nTop Agents by Points:');
      console.log('Rank | Name | Points | Referrals | Properties');
      console.log('-----|------|--------|-----------|------------');
      
      realLeaderboard.forEach((agent, index) => {
        console.log(`${index + 1}    | ${agent.name.padEnd(20)} | ${agent.totalPoints.toString().padStart(6)} | ${agent.totalReferrals.toString().padStart(9)} | ${agent.propertiesAdded.toString().padStart(10)}`);
      });
    }

    // 8. Συνολικός αριθμός agents με πόντους
    const totalAgentsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as "totalAgents"
      FROM (
        SELECT u.id
        FROM users u
        LEFT JOIN referral_points rp ON u.id = rp."userId"
        WHERE u.role = 'AGENT'
        GROUP BY u.id
        HAVING COALESCE(SUM(rp.points), 0) > 0
      ) as agents_with_points
    `;
    
    const totalAgents = Number(totalAgentsResult[0]?.totalAgents || 0);
    console.log(`\nTotal agents with points: ${totalAgents}`);

    console.log('\n=== Cleanup completed ===');
    console.log('The leaderboard will now show only real data from actual agents.');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του cleanup
cleanupTestData(); 