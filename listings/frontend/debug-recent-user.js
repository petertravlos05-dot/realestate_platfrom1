const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRecentUser() {
  try {
    console.log('=== Debugging Recent User Registration ===\n');

    // 1. Εύρεση του τελευταίου χρήστη που έκανε εγγραφή
    console.log('1. Εύρεση τελευταίου χρήστη...');
    const recentUsers = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    console.log('Τελευταίοι 5 χρήστες:');
    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Created: ${user.createdAt}`);
    });

    if (recentUsers.length === 0) {
      console.log('Δεν βρέθηκαν χρήστες');
      return;
    }

    // 2. Εύρεση referrals για τον τελευταίο χρήστη
    const latestUser = recentUsers[0];
    console.log(`\n2. Εύρεση referrals για ${latestUser.name}...`);
    
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
      WHERE "referrerId" = ${latestUser.id} OR "referredId" = ${latestUser.id}
      ORDER BY "createdAt" DESC
    `;

    console.log('Referrals του χρήστη:');
    userReferrals.forEach((referral, index) => {
      const role = referral.referrerId === latestUser.id ? 'Referrer' : 'Referred';
      console.log(`${index + 1}. ${role} - Code: ${referral.referralCode} - Points: ${referral.totalPoints} - Created: ${referral.createdAt}`);
    });

    // 3. Εύρεση όλων των πόντων του χρήστη
    console.log(`\n3. Εύρεση όλων των πόντων για ${latestUser.name}...`);
    const userPoints = await prisma.$queryRaw`
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
      WHERE r."referredId" = ${latestUser.id} OR r."referrerId" = ${latestUser.id}
      ORDER BY rp."createdAt" DESC
    `;

    console.log('Όλοι οι πόντοι του χρήστη:');
    userPoints.forEach((point, index) => {
      const role = point.referrerId === latestUser.id ? 'Referrer' : 'Referred';
      console.log(`${index + 1}. Πόντοι: ${point.points}, Λόγος: ${point.reason}, Ρόλος: ${role}, Ημ/νία: ${point.createdAt}`);
    });

    // 4. Υπολογισμός συνολικών πόντων
    const totalPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referredId" = ${latestUser.id} OR r."referrerId" = ${latestUser.id}
    `;
    
    const totalPoints = Number(totalPointsResult[0]?.totalPoints || 0);
    console.log(`\nΣύνολο πόντων ${latestUser.name}: ${totalPoints}`);

    // 5. Έλεγχος για διπλές εγγραφές registration
    console.log(`\n5. Έλεγχος για διπλές εγγραφές registration...`);
    const registrationPoints = userPoints.filter(p => p.reason === 'registration');
    console.log(`Βρέθηκαν ${registrationPoints.length} εγγραφές με reason 'registration'`);
    
    if (registrationPoints.length > 1) {
      console.log('ΠΡΟΒΛΗΜΑ: Υπάρχουν πολλαπλές εγγραφές registration!');
      registrationPoints.forEach((point, index) => {
        console.log(`${index + 1}. ID: ${point.id}, Πόντοι: ${point.points}, Ημ/νία: ${point.createdAt}`);
      });
    }

  } catch (error) {
    console.error('Σφάλμα κατά το debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του script
debugRecentUser(); 