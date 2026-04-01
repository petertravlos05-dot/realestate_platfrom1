/**
 * Create ProfessionalProfile records for users who have LAWYER/NOTARY/ENGINEER role
 * but no profile (e.g. after migrations wiped professional_profiles).
 *
 * Usage: node scripts/seed-professional-profiles.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['LAWYER', 'NOTARY', 'ENGINEER'] } },
    include: { professionalProfile: true },
  });

  console.log(`Found ${users.length} users with professional role\n`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.professionalProfile) {
      skipped++;
      continue;
    }

    const type = user.role;
    if (!['LAWYER', 'NOTARY', 'ENGINEER'].includes(type)) continue;

    try {
      await prisma.professionalProfile.create({
        data: {
          userId: user.id,
          type,
          displayName: user.name || user.email?.split('@')[0] || `Professional ${type}`,
          languages: ['Greek'],
          areaTags: [],
        },
      });
      created++;
      console.log(`  ✓ Created profile for ${user.email} (${type})`);
    } catch (err) {
      console.error(`  ✗ Failed for ${user.email}:`, err.message);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped (already have profile): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
