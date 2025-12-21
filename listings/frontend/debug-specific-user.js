const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSpecificUser() {
  try {
    console.log('=== Debugging Specific User ===\n');

    const userId = 'cmd4xt5450001nyf0opb5ilwj';

    // 1. Εύρεση πληροφοριών χρήστη
    console.log('1. Πληροφορίες χρήστη...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log('Δεν βρέθηκε χρήστης');
      return;
    }

    console.log('Χρήστης:', user);

    // 2. Εύρεση referrals για αυτόν τον χρήστη
    console.log('\n2. Referrals για αυτόν τον χρήστη...');
    const userReferrals = await prisma.$queryRaw`
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
      WHERE "referrerId" = ${userId} OR "referredId" = ${userId}
      ORDER BY "createdAt" DESC
    `;

    console.log('Referrals:');
    userReferrals.forEach((referral, index) => {
      const role = referral.referrerId === userId ? 'Referrer' : 'Referred';
      console.log(`${index + 1}. ${role} - Code: ${referral.referralCode} - Points: ${referral.totalPoints} - Created: ${referral.createdAt}`);
    });

    // 3. Εύρεση όλων των πόντων για αυτόν τον χρήστη
    console.log('\n3. Όλοι οι πόντοι για αυτόν τον χρήστη...');
    const userPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp.points,
        rp.reason,
        rp."createdAt",
        r."referrerId",
        r."referredId",
        r."referralCode"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referredId" = ${userId} OR r."referrerId" = ${userId}
      ORDER BY rp."createdAt" DESC
    `;

    console.log('Πόντοι:');
    userPoints.forEach((point, index) => {
      const role = point.referrerId === userId ? 'Referrer' : 'Referred';
      console.log(`${index + 1}. ${point.points} πόντοι - ${point.reason} - ${role} - ${point.createdAt}`);
    });

    // 4. Υπολογισμός συνολικών πόντων
    console.log('\n4. Υπολογισμός συνολικών πόντων...');
    const totalPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referredId" = ${userId} OR r."referrerId" = ${userId}
    `;
    
    const totalPoints = Number(totalPointsResult[0]?.totalPoints || 0);
    console.log(`Σύνολο πόντων: ${totalPoints}`);

    // 5. Έλεγχος για διπλές εγγραφές registration
    console.log('\n5. Έλεγχος για διπλές εγγραφές registration...');
    const registrationPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp.points,
        rp."createdAt",
        r."referralCode"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referredId" = ${userId} OR r."referrerId" = ${userId})
        AND rp.reason = 'registration'
      ORDER BY rp."createdAt" DESC
    `;

    console.log('Registration points:');
    registrationPoints.forEach((point, index) => {
      console.log(`${index + 1}. ${point.points} πόντοι - ${point.createdAt} - Referral: ${point.referralCode}`);
    });

  } catch (error) {
    console.error('Σφάλμα:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του script
debugSpecificUser(); 