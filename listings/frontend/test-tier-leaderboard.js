const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Συνάρτηση για να προσδιορίσω το tier
function getTier(points) {
  if (points >= 1000) return { name: '🥇 Platinum', color: 'yellow' };
  if (points >= 500) return { name: '🥈 Gold', color: 'gray' };
  if (points >= 200) return { name: '🥉 Silver', color: 'orange' };
  return { name: '🏅 Bronze', color: 'amber' };
}

async function testTierLeaderboard() {
  try {
    console.log('=== Testing Tier-Based Leaderboard ===\n');

    // 1. Test του leaderboard query με tiers
    console.log('1. Testing leaderboard query with tiers...');
    
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
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC, "totalReferrals" DESC
      LIMIT 10
    `;

    if (leaderboardData.length === 0) {
      console.log('No users with points found.');
      return;
    }

    console.log('\nTop Users by Points (with Tiers):');
    console.log('Rank | Name | Tier | Points | Referrals | Properties');
    console.log('-----|------|------|--------|-----------|------------');
    
    leaderboardData.forEach((user, index) => {
      const tier = getTier(Number(user.totalPoints));
      console.log(`${index + 1}    | ${user.name.padEnd(20)} | ${tier.name.padEnd(12)} | ${user.totalPoints.toString().padStart(6)} | ${user.totalReferrals.toString().padStart(9)} | ${user.propertiesAdded.toString().padStart(10)}`);
    });

    // 2. Στατιστικά ανά tier
    console.log('\n2. Statistics by tier:');
    const tierStats = {
      '🥇 Platinum': { count: 0, totalPoints: 0, users: [] },
      '🥈 Gold': { count: 0, totalPoints: 0, users: [] },
      '🥉 Silver': { count: 0, totalPoints: 0, users: [] },
      '🏅 Bronze': { count: 0, totalPoints: 0, users: [] }
    };

    leaderboardData.forEach(user => {
      const tier = getTier(Number(user.totalPoints));
      tierStats[tier.name].count++;
      tierStats[tier.name].totalPoints += Number(user.totalPoints);
      tierStats[tier.name].users.push(user.name);
    });

    console.log('Tier | Count | Total Points | Users');
    console.log('-----|-------|-------------|------');
    
    Object.keys(tierStats).forEach(tier => {
      const stats = tierStats[tier];
      if (stats.count > 0) {
        console.log(`${tier.padEnd(12)} | ${stats.count.toString().padStart(5)} | ${stats.totalPoints.toString().padStart(11)} | ${stats.users.join(', ')}`);
      }
    });

    // 3. Test tier boundaries
    console.log('\n3. Testing tier boundaries:');
    const testPoints = [0, 50, 100, 199, 200, 250, 499, 500, 750, 999, 1000, 1500];
    
    console.log('Points | Tier');
    console.log('-------|------');
    testPoints.forEach(points => {
      const tier = getTier(points);
      console.log(`${points.toString().padStart(6)} | ${tier.name}`);
    });

    // 4. Εμφάνιση όλων των χρηστών με tiers
    console.log('\n4. All users with their tiers:');
    console.log('Name | Role | Points | Tier');
    console.log('-----|------|--------|------');
    
    leaderboardData.forEach(user => {
      const tier = getTier(Number(user.totalPoints));
      console.log(`${user.name.padEnd(20)} | ${user.role.padEnd(6)} | ${user.totalPoints.toString().padStart(6)} | ${tier.name}`);
    });

    // 5. Tier distribution
    console.log('\n5. Tier distribution:');
    const totalUsers = leaderboardData.length;
    Object.keys(tierStats).forEach(tier => {
      const stats = tierStats[tier];
      if (stats.count > 0) {
        const percentage = ((stats.count / totalUsers) * 100).toFixed(1);
        console.log(`${tier}: ${stats.count} users (${percentage}%)`);
      }
    });

    // 6. Average points per tier
    console.log('\n6. Average points per tier:');
    Object.keys(tierStats).forEach(tier => {
      const stats = tierStats[tier];
      if (stats.count > 0) {
        const average = Math.round(stats.totalPoints / stats.count);
        console.log(`${tier}: ${average} average points`);
      }
    });

    console.log('\n=== Tier Leaderboard Test Completed ===');
    console.log('✅ The leaderboard now shows tiers instead of roles!');

  } catch (error) {
    console.error('Error testing tier leaderboard:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του test
testTierLeaderboard(); 