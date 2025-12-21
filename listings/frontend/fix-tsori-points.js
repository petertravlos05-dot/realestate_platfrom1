const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function fixTsoriPoints() {
  try {
    console.log('=== Fixing Tsori Points ===\n');

    const userId = 'cmd4xt5450001nyf0opb5ilwj';

    // 1. Εύρεση όλων των referrals για τον tsori
    console.log('1. Εύρεση referrals για τον tsori...');
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
      ORDER BY "createdAt" ASC
    `;

    console.log('Βρέθηκαν referrals:');
    userReferrals.forEach((referral, index) => {
      const role = referral.referrerId === userId ? 'Referrer' : 'Referred';
      console.log(`${index + 1}. ${role} - Code: ${referral.referralCode} - Points: ${referral.totalPoints} - Created: ${referral.createdAt}`);
    });

    if (userReferrals.length === 0) {
      console.log('Δεν βρέθηκαν referrals για τον tsori');
      return;
    }

    // 2. Εύρεση του πρώτου referral (που θα διατηρήσουμε)
    const firstReferral = userReferrals[0];
    console.log('\n2. Πρώτο referral (θα διατηρηθεί):', firstReferral);

    // 3. Διαγραφή όλων των πόντων από όλα τα referrals
    console.log('\n3. Διαγραφή όλων των πόντων...');
    for (const referral of userReferrals) {
      await prisma.$executeRaw`
        DELETE FROM referral_points 
        WHERE "referralId" = ${referral.id}
      `;
      console.log(`Διαγράφηκαν οι πόντοι από το referral ${referral.id}`);
    }

    // 4. Διαγραφή όλων των referrals εκτός από το πρώτο
    console.log('\n4. Διαγραφή επιπλέον referrals...');
    for (let i = 1; i < userReferrals.length; i++) {
      const referral = userReferrals[i];
      await prisma.$executeRaw`
        DELETE FROM referrals WHERE id = ${referral.id}
      `;
      console.log(`Διαγράφηκε το referral ${referral.id}`);
    }

    // 5. Προσθήκη σωστών πόντων μόνο στο πρώτο referral
    console.log('\n5. Προσθήκη σωστών πόντων...');
    
    if (firstReferral.referredId === userId) {
      // Ο tsori είναι referred - προσθέτουμε 50 πόντους
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", points, reason, "createdAt")
        VALUES (${crypto.randomUUID()}, ${firstReferral.id}, 50, 'registration', NOW())
      `;
      console.log('Προστέθηκαν 50 πόντοι στον tsori (referred)');
      
      // Ενημέρωση στατιστικών
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = 50, 
            "updatedAt" = NOW()
        WHERE id = ${firstReferral.id}
      `;
    } else {
      // Ο tsori είναι referrer - προσθέτουμε 100 πόντους
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", points, reason, "createdAt")
        VALUES (${crypto.randomUUID()}, ${firstReferral.id}, 100, 'registration', NOW())
      `;
      console.log('Προστέθηκαν 100 πόντοι στον tsori (referrer)');
      
      // Ενημέρωση στατιστικών
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = 100, 
            "updatedAt" = NOW()
        WHERE id = ${firstReferral.id}
      `;
    }

    // 6. Επαλήθευση
    console.log('\n6. Επαλήθευση...');
    const finalPoints = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referredId" = ${userId} OR r."referrerId" = ${userId}
    `;
    
    const totalPoints = Number(finalPoints[0]?.totalPoints || 0);
    console.log(`Τελικοί πόντοι tsori: ${totalPoints}`);

    // 7. Εμφάνιση τελικού ιστορικού
    console.log('\n7. Τελικό ιστορικό πόντων:');
    const finalHistory = await prisma.$queryRaw`
      SELECT 
        rp.points,
        rp.reason,
        rp."createdAt"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE r."referredId" = ${userId} OR r."referrerId" = ${userId}
      ORDER BY rp."createdAt" ASC
    `;

    finalHistory.forEach((point, index) => {
      console.log(`${index + 1}. ${point.points} πόντοι - ${point.reason} - ${point.createdAt}`);
    });

    console.log('\n=== Διόρθωση ολοκληρώθηκε επιτυχώς ===');

  } catch (error) {
    console.error('Σφάλμα κατά τη διόρθωση:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Εκτέλεση του script
fixTsoriPoints(); 