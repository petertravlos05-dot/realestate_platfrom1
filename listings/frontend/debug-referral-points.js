const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugReferralPoints() {
  try {
    console.log('=== Debugging Referral Points ===\n');

    // 1. Εύρεση όλων των χρηστών με όνομα "Agent" και "fousi"
    console.log('1. Εύρεση χρηστών...');
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'Agent', mode: 'insensitive' } },
          { name: { contains: 'fousi', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    console.log('Χρήστες που βρέθηκαν:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ID: ${user.id} - Created: ${user.createdAt}`);
    });

    if (users.length === 0) {
      console.log('Δεν βρέθηκαν χρήστες με αυτά τα ονόματα');
      return;
    }

    // 2. Εύρεση όλων των referrals
    console.log('\n2. Εύρεση όλων των referrals...');
    const allReferrals = await prisma.$queryRaw`
      SELECT 
        id,
        "referrerId",
        "referredId",
        "referralCode",
        "isActive",
        "createdAt",
        "updatedAt",
        "totalPoints"
      FROM referrals
      ORDER BY "createdAt" DESC
    `;

    console.log('Όλα τα referrals:');
    allReferrals.forEach((referral, index) => {
      console.log(`${index + 1}. ID: ${referral.id}`);
      console.log(`   Referrer: ${referral.referrerId}`);
      console.log(`   Referred: ${referral.referredId}`);
      console.log(`   Code: ${referral.referralCode}`);
      console.log(`   Active: ${referral.isActive}`);
      console.log(`   Total Points: ${referral.totalPoints}`);
      console.log(`   Created: ${referral.createdAt}`);
      console.log(`   Updated: ${referral.updatedAt}`);
      console.log('');
    });

    // 3. Εύρεση όλων των referral points
    console.log('3. Εύρεση όλων των referral points...');
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
      ORDER BY rp."createdAt" DESC
    `;

    console.log('Όλα τα referral points:');
    allPoints.forEach((point, index) => {
      console.log(`${index + 1}. ID: ${point.id}`);
      console.log(`   Referral ID: ${point.referralId}`);
      console.log(`   Points: ${point.points}`);
      console.log(`   Reason: ${point.reason}`);
      console.log(`   Referrer: ${point.referrerId}`);
      console.log(`   Referred: ${point.referredId}`);
      console.log(`   Created: ${point.createdAt}`);
      console.log('');
    });

    // 4. Υπολογισμός πόντων ανά χρήστη
    console.log('4. Υπολογισμός πόντων ανά χρήστη...');
    for (const user of users) {
      const userPoints = await prisma.$queryRaw`
        SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
        FROM referral_points rp
        INNER JOIN referrals r ON rp."referralId" = r.id
        WHERE r."referredId" = ${user.id} OR r."referrerId" = ${user.id}
      `;

      const totalPoints = Number(userPoints[0]?.totalPoints || 0);
      console.log(`${user.name} (${user.email}): ${totalPoints} πόντους`);
    }

    // 5. Εύρεση referrals που σχετίζονται με αυτούς τους χρήστες
    console.log('\n5. Εύρεση referrals που σχετίζονται με αυτούς τους χρήστες...');
    for (const user of users) {
      const userReferrals = await prisma.$queryRaw`
        SELECT 
          id,
          "referrerId",
          "referredId",
          "referralCode",
          "isActive",
          "createdAt",
          "totalPoints"
        FROM referrals
        WHERE "referrerId" = ${user.id} OR "referredId" = ${user.id}
        ORDER BY "createdAt" DESC
      `;

      console.log(`\nReferrals για ${user.name}:`);
      userReferrals.forEach((referral, index) => {
        const role = referral.referrerId === user.id ? 'Referrer' : 'Referred';
        console.log(`${index + 1}. ${role} - Code: ${referral.referralCode} - Points: ${referral.totalPoints} - Created: ${referral.createdAt}`);
      });
    }

  } catch (error) {
    console.error('Σφάλμα κατά το debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του script
debugReferralPoints(); 