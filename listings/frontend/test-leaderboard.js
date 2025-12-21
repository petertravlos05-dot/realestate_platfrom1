const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLeaderboard() {
  try {
    console.log('=== Testing Leaderboard API ===\n');

    // 1. Δημιουργία test agents αν δεν υπάρχουν
    console.log('1. Creating test agents...');
    
    const testAgents = [
      { name: 'Γιώργος Παπαδόπουλος', email: 'giorgos@test.com', role: 'AGENT' },
      { name: 'Μαρία Κωνσταντίνου', email: 'maria@test.com', role: 'AGENT' },
      { name: 'Νίκος Δημητρίου', email: 'nikos@test.com', role: 'AGENT' },
      { name: 'Ελένη Παπαδοπούλου', email: 'eleni@test.com', role: 'AGENT' },
      { name: 'Αλέξανδρος Γεωργίου', email: 'alex@test.com', role: 'AGENT' },
      { name: 'Σοφία Μιχαήλ', email: 'sofia@test.com', role: 'AGENT' },
      { name: 'Δημήτρης Αντωνίου', email: 'dimitris@test.com', role: 'AGENT' },
      { name: 'Αννα Παπαδοπούλου', email: 'anna@test.com', role: 'AGENT' },
      { name: 'Κώστας Νικολάου', email: 'kostas@test.com', role: 'AGENT' },
      { name: 'Ειρήνη Γεωργίου', email: 'irini@test.com', role: 'AGENT' },
      { name: 'Μιχάλης Παπαδόπουλος', email: 'michalis@test.com', role: 'AGENT' },
      { name: 'Χριστίνα Δημητρίου', email: 'christina@test.com', role: 'AGENT' }
    ];

    const createdAgents = [];
    for (const agentData of testAgents) {
      const existingAgent = await prisma.user.findUnique({
        where: { email: agentData.email }
      });

      if (!existingAgent) {
        const agent = await prisma.user.create({
          data: {
            ...agentData,
            password: 'test123'
          }
        });
        createdAgents.push(agent);
        console.log(`Created agent: ${agent.name} (${agent.id})`);
      } else {
        createdAgents.push(existingAgent);
        console.log(`Agent already exists: ${existingAgent.name}`);
      }
    }

    // 2. Δημιουργία referrals και πόντων
    console.log('\n2. Creating referrals and points...');

    // Δημιουργία referrals για κάθε agent
    for (let i = 0; i < createdAgents.length; i++) {
      const agent = createdAgents[i];
      
      // Δημιουργία referral record
      const referral = await prisma.referral.create({
        data: {
          referrerId: agent.id,
          referredId: agent.id, // Προσωρινά ίδιο με referrer
          referralCode: `TEST${i + 1}${Date.now().toString(36)}`,
          totalPoints: 0,
          propertiesAdded: 0,
          totalArea: 0
        }
      });

      console.log(`Created referral for ${agent.name}: ${referral.referralCode}`);

      // Προσθήκη πόντων με διαφορετικές τιμές για κάθε agent
      const pointsToAdd = [
        { points: 1500, reason: 'registration' },
        { points: 800, reason: 'property_added' },
        { points: 300, reason: 'admin_bonus' },
        { points: 200, reason: 'compensation' },
        { points: 100, reason: 'promotion' }
      ];

      for (const pointData of pointsToAdd) {
        await prisma.referralPoints.create({
          data: {
            referralId: referral.id,
            userId: agent.id,
            points: pointData.points * (i + 1), // Διαφορετικοί πόντοι για κάθε agent
            reason: pointData.reason
          }
        });
      }

      // Ενημέρωση total points στο referral
      const totalPoints = pointsToAdd.reduce((sum, p) => sum + (p.points * (i + 1)), 0);
      await prisma.referral.update({
        where: { id: referral.id },
        data: { totalPoints }
      });

      console.log(`Added ${totalPoints} points to ${agent.name}`);
    }

    // 3. Test του leaderboard query
    console.log('\n3. Testing leaderboard query...');
    
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

    console.log('\nTop 10 Agents by Points:');
    console.log('Rank | Name | Points | Referrals | Properties');
    console.log('-----|------|--------|-----------|------------');
    
    leaderboardData.forEach((agent, index) => {
      console.log(`${index + 1}    | ${agent.name.padEnd(20)} | ${agent.totalPoints.toString().padStart(6)} | ${agent.totalReferrals.toString().padStart(9)} | ${agent.propertiesAdded.toString().padStart(10)}`);
    });

    // 4. Test ranking για συγκεκριμένο agent
    console.log('\n4. Testing ranking for specific agent...');
    
    const testAgentId = createdAgents[0].id;
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
    }

    // 5. Συνολικός αριθμός agents με πόντους
    console.log('\n5. Total agents with points...');
    
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

    console.log('\n=== Leaderboard Test Completed Successfully ===');

  } catch (error) {
    console.error('Error testing leaderboard:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του test
testLeaderboard(); 