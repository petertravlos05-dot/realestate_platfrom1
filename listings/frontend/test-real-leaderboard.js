const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRealLeaderboard() {
  try {
    console.log('=== Testing Real Leaderboard Data ===\n');

    // 1. Εύρεση όλων των agents στη βάση
    console.log('1. Finding all agents in database...');
    const allAgents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true
      }
    });

    console.log(`Found ${allAgents.length} agents in database`);

    if (allAgents.length === 0) {
      console.log('No agents found in database.');
      return;
    }

    // 2. Εμφάνιση όλων των agents
    console.log('\n2. All agents:');
    allAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.email})`);
    });

    // 3. Έλεγχος για referrals και πόντους
    console.log('\n3. Checking for referrals and points...');
    
    for (const agent of allAgents) {
      const referrals = await prisma.referral.findMany({
        where: {
          OR: [
            { referrerId: agent.id },
            { referredId: agent.id }
          ]
        }
      });

      const points = await prisma.referralPoints.findMany({
        where: { userId: agent.id }
      });

      const totalPoints = points.reduce((sum, point) => sum + point.points, 0);
      
      console.log(`${agent.name}: ${referrals.length} referrals, ${points.length} point records, ${totalPoints} total points`);
    }

    // 4. Test του leaderboard query
    console.log('\n4. Testing leaderboard query...');
    
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
      WHERE u.role = 'AGENT'
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC, "totalReferrals" DESC
      LIMIT 10
    `;

    if (leaderboardData.length === 0) {
      console.log('\nNo agents with points found.');
      console.log('The leaderboard will be empty until agents start earning points.');
      
      // 5. Προτάσεις για δημιουργία αληθινών δεδομένων
      console.log('\n5. Suggestions for creating real data:');
      console.log('- Agents need to create referral links');
      console.log('- New users need to register using those links');
      console.log('- Properties need to be added by referred users');
      console.log('- Admin can add bonus points manually');
      
      return;
    }

    console.log('\nTop Agents by Points:');
    console.log('Rank | Name | Points | Referrals | Properties');
    console.log('-----|------|--------|-----------|------------');
    
    leaderboardData.forEach((agent, index) => {
      console.log(`${index + 1}    | ${agent.name.padEnd(20)} | ${agent.totalPoints.toString().padStart(6)} | ${agent.totalReferrals.toString().padStart(9)} | ${agent.propertiesAdded.toString().padStart(10)}`);
    });

    // 6. Test ranking για συγκεκριμένο agent
    console.log('\n6. Testing ranking for first agent...');
    
    const testAgentId = allAgents[0].id;
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
      WHERE u.role = 'AGENT'
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING u.id = ${testAgentId}
    `;

    if (currentUserRank.length > 0) {
      const agent = currentUserRank[0];
      console.log(`\nRank for ${agent.name}: #${agent.rank}`);
      console.log(`Total Points: ${agent.totalPoints}`);
      console.log(`Total Referrals: ${agent.totalReferrals}`);
    } else {
      console.log(`\nNo ranking found for ${allAgents[0].name} (no points)`);
    }

    // 7. Συνολικός αριθμός agents με πόντους
    console.log('\n7. Total agents with points...');
    
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
    console.log(`Total agents with points: ${totalAgents}`);

    // 8. Στατιστικά για όλους τους agents
    console.log('\n8. All agents statistics:');
    console.log('Name | Points | Referrals | Properties');
    console.log('-----|--------|-----------|------------');
    
    for (const agent of allAgents) {
      const agentStats = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(rp.points), 0) as "totalPoints",
          COUNT(DISTINCT r.id) as "totalReferrals",
          COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded"
        FROM users u
        LEFT JOIN referral_points rp ON u.id = rp."userId"
        LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
        WHERE u.id = ${agent.id}
      `;
      
      const stats = agentStats[0];
      console.log(`${agent.name.padEnd(20)} | ${stats.totalPoints.toString().padStart(6)} | ${stats.totalReferrals.toString().padStart(9)} | ${stats.propertiesAdded.toString().padStart(10)}`);
    }

    console.log('\n=== Real Leaderboard Test Completed ===');

  } catch (error) {
    console.error('Error testing real leaderboard:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του test
testRealLeaderboard(); 