const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findTestUser() {
  try {
    console.log('=== Finding Users with Points ===');
    
    // Βρίσκουμε χρήστες που έχουν πόντους
    const usersWithPoints = await prisma.$queryRaw`
      SELECT DISTINCT 
        u.id,
        u.email,
        u.name,
        u.role,
        COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM users u
      INNER JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
      INNER JOIN referral_points rp ON rp."referralId" = r.id
      GROUP BY u.id, u.email, u.name, u.role
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC
      LIMIT 5
    `;
    
    console.log('Users with points:');
    usersWithPoints.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Total Points: ${user.totalPoints}`);
      console.log('');
    });
    
    if (usersWithPoints.length > 0) {
      console.log('To test a specific user, run:');
      console.log(`node test-user-stats.js ${usersWithPoints[0].id}`);
    }
    
  } catch (error) {
    console.error('Error finding test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTestUser(); 