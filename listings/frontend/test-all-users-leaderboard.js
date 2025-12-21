const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAllUsersLeaderboard() {
  try {
    console.log('=== Testing All Users Leaderboard ===\n');

    // 1. Εύρεση όλων των χρηστών στη βάση
    console.log('1. Finding all users in database...');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true
      }
    });

    console.log(`Found ${allUsers.length} total users in database`);

    if (allUsers.length === 0) {
      console.log('No users found in database.');
      return;
    }

    // 2. Εμφάνιση όλων των χρηστών ανά ρόλο
    console.log('\n2. All users by role:');
    const usersByRole = {};
    allUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role} (${usersByRole[role].length} users):`);
      usersByRole[role].forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      });
    });

    // 3. Έλεγχος για referrals και πόντους για όλους τους χρήστες
    console.log('\n3. Checking for referrals and points for all users...');
    
    const usersWithPoints = [];
    
    for (const user of allUsers) {
      const referrals = await prisma.referral.findMany({
        where: {
          OR: [
            { referrerId: user.id },
            { referredId: user.id }
          ]
        }
      });

      const points = await prisma.referralPoints.findMany({
        where: { userId: user.id }
      });

      const totalPoints = points.reduce((sum, point) => sum + point.points, 0);
      
      console.log(`${user.name} (${user.role}): ${referrals.length} referrals, ${points.length} point records, ${totalPoints} total points`);
      
      if (totalPoints > 0) {
        usersWithPoints.push({
          ...user,
          totalPoints,
          totalReferrals: referrals.length,
          pointRecords: points.length
        });
      }
    }

    // 4. Εμφάνιση χρηστών με πόντους
    console.log('\n4. Users with points:');
    if (usersWithPoints.length === 0) {
      console.log('No users with points found.');
      console.log('The leaderboard will be empty until users start earning points.');
    } else {
      console.log(`Found ${usersWithPoints.length} users with points:`);
      usersWithPoints.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.role}) - ${user.totalPoints} points, ${user.totalReferrals} referrals`);
      });
    }

    // 5. Test του νέου leaderboard query (χωρίς φίλτρο ρόλου)
    console.log('\n5. Testing updated leaderboard query (all roles)...');
    
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
      console.log('\nNo users with points found in leaderboard query.');
      console.log('The leaderboard will be empty until users start earning points.');
      
      // 6. Προτάσεις για δημιουργία αληθινών δεδομένων
      console.log('\n6. Suggestions for creating real data:');
      console.log('- Users need to create referral links');
      console.log('- New users need to register using those links');
      console.log('- Properties need to be added by referred users');
      console.log('- Admin can add bonus points manually');
      console.log('- All roles (AGENT, BUYER, SELLER, ADMIN) can earn points!');
      
      return;
    }

    console.log('\nTop Users by Points (All Roles):');
    console.log('Rank | Name | Role | Points | Referrals | Properties');
    console.log('-----|------|------|--------|-----------|------------');
    
    leaderboardData.forEach((user, index) => {
      console.log(`${index + 1}    | ${user.name.padEnd(20)} | ${user.role.padEnd(6)} | ${user.totalPoints.toString().padStart(6)} | ${user.totalReferrals.toString().padStart(9)} | ${user.propertiesAdded.toString().padStart(10)}`);
    });

    // 7. Συνολικός αριθμός χρηστών με πόντους
    console.log('\n7. Total users with points...');
    
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
    
    const totalUsers = Number(totalUsersResult[0]?.totalUsers || 0);
    console.log(`Total users with points: ${totalUsers}`);

    // 8. Στατιστικά ανά ρόλο
    console.log('\n8. Statistics by role:');
    const roleStats = {};
    
    for (const user of allUsers) {
      const userStats = await prisma.$queryRaw`
        SELECT 
          COALESCE(SUM(rp.points), 0) as "totalPoints",
          COUNT(DISTINCT r.id) as "totalReferrals",
          COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded"
        FROM users u
        LEFT JOIN referral_points rp ON u.id = rp."userId"
        LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
        WHERE u.id = ${user.id}
      `;
      
      const stats = userStats[0];
      if (!roleStats[user.role]) {
        roleStats[user.role] = {
          count: 0,
          totalPoints: 0,
          totalReferrals: 0,
          totalProperties: 0,
          usersWithPoints: 0
        };
      }
      
      roleStats[user.role].count++;
      roleStats[user.role].totalPoints += Number(stats.totalPoints);
      roleStats[user.role].totalReferrals += Number(stats.totalReferrals);
      roleStats[user.role].totalProperties += Number(stats.propertiesAdded);
      
      if (Number(stats.totalPoints) > 0) {
        roleStats[user.role].usersWithPoints++;
      }
    }

    console.log('Role | Users | With Points | Total Points | Total Referrals | Total Properties');
    console.log('-----|-------|-------------|--------------|-----------------|------------------');
    
    Object.keys(roleStats).forEach(role => {
      const stats = roleStats[role];
      console.log(`${role.padEnd(5)} | ${stats.count.toString().padStart(5)} | ${stats.usersWithPoints.toString().padStart(11)} | ${stats.totalPoints.toString().padStart(12)} | ${stats.totalReferrals.toString().padStart(15)} | ${stats.totalProperties.toString().padStart(16)}`);
    });

    console.log('\n=== All Users Leaderboard Test Completed ===');
    console.log('✅ The leaderboard now shows all users with points, regardless of role!');

  } catch (error) {
    console.error('Error testing all users leaderboard:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του test
testAllUsersLeaderboard(); 