/**
 * Script to list all professional profiles from the database
 * Useful for debugging and verifying registration flow
 * 
 * Usage: node scripts/list-all-professionals.js [type] [verificationStatus]
 * Examples:
 *   node scripts/list-all-professionals.js
 *   node scripts/list-all-professionals.js LAWYER
 *   node scripts/list-all-professionals.js LAWYER VERIFIED
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllProfessionals() {
  try {
    const type = process.argv[2]?.toUpperCase(); // LAWYER, NOTARY, or ENGINEER
    const verificationStatus = process.argv[3]?.toUpperCase(); // PENDING, VERIFIED, REJECTED

    console.log('🔍 Fetching professional profiles...\n');

    // Debug: raw count to verify table has data
    const rawCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM professional_profiles`;
    console.log(`📋 Raw DB count (professional_profiles): ${rawCount[0]?.count ?? 0}\n`);

    // Also check users with professional roles (might have profile in different state)
    const usersWithRole = await prisma.user.findMany({
      where: { role: { in: ['LAWYER', 'NOTARY', 'ENGINEER'] } },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log(`👤 Users with LAWYER/NOTARY/ENGINEER role: ${usersWithRole.length}`);
    usersWithRole.forEach((u) => console.log(`   - ${u.email} (${u.role})`));
    console.log('');

    // Build where clause - include ENGINEER in type filter
    const where = {};
    if (type && ['LAWYER', 'NOTARY', 'ENGINEER'].includes(type)) {
      where.type = type;
    }
    if (verificationStatus && ['PENDING', 'VERIFIED', 'REJECTED'].includes(verificationStatus)) {
      where.verificationStatus = verificationStatus;
    }

    const professionals = await prisma.professionalProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        availability: {
          select: {
            timezone: true,
            meetingTypes: true,
            weeklyRules: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    console.log(`📊 Found ${professionals.length} professional profile(s)\n`);
    console.log('═'.repeat(100));

    if (professionals.length === 0) {
      console.log('No professionals found matching the criteria.');
      return;
    }

    professionals.forEach((prof, index) => {
      console.log(`\n${index + 1}. Professional Profile`);
      console.log('─'.repeat(100));
      console.log(`   ID: ${prof.id}`);
      console.log(`   Type: ${prof.type}`);
      console.log(`   Display Name: ${prof.displayName}`);
      console.log(`   Office Name: ${prof.officeName || 'N/A'}`);
      console.log(`   City: ${prof.city || 'N/A'}`);
      console.log(`   Area Tags: ${prof.areaTags?.length > 0 ? prof.areaTags.join(', ') : 'N/A'}`);
      console.log(`   Languages: ${prof.languages?.length > 0 ? prof.languages.join(', ') : 'N/A'}`);
      console.log(`   Phone: ${prof.phone || 'N/A'}`);
      console.log(`   Verification Status: ${prof.verificationStatus}`);
      console.log(`   Verified At: ${prof.verifiedAt ? new Date(prof.verifiedAt).toLocaleString() : 'N/A'}`);
      console.log(`   Created At: ${new Date(prof.createdAt).toLocaleString()}`);
      console.log(`   Updated At: ${new Date(prof.updatedAt).toLocaleString()}`);
      
      // Registry Number (stored in services)
      if (prof.services && typeof prof.services === 'object') {
        const registryNumber = prof.services.registryNumber;
        if (registryNumber) {
          console.log(`   Registry Number: ${registryNumber}`);
        }
      }

      // User Info
      if (prof.user) {
        console.log(`\n   User Info:`);
        console.log(`   - User ID: ${prof.user.id}`);
        console.log(`   - Email: ${prof.user.email}`);
        console.log(`   - Name: ${prof.user.name}`);
        console.log(`   - Role: ${prof.user.role}`);
        console.log(`   - User Created: ${new Date(prof.user.createdAt).toLocaleString()}`);
      }

      // Availability Info
      if (prof.availability) {
        console.log(`\n   Availability:`);
        console.log(`   - Timezone: ${prof.availability.timezone}`);
        console.log(`   - Meeting Types: ${prof.availability.meetingTypes?.join(', ') || 'N/A'}`);
        if (prof.availability.weeklyRules && Array.isArray(prof.availability.weeklyRules)) {
          console.log(`   - Weekly Rules: ${prof.availability.weeklyRules.length} rule(s)`);
        }
      } else {
        console.log(`\n   Availability: Not set`);
      }

      console.log('');
    });

    console.log('═'.repeat(100));
    console.log(`\n✅ Total: ${professionals.length} professional profile(s)`);

    // Summary by type
    const byType = professionals.reduce((acc, prof) => {
      acc[prof.type] = (acc[prof.type] || 0) + 1;
      return acc;
    }, {});
    console.log('\n📈 Summary by Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Summary by verification status
    const byStatus = professionals.reduce((acc, prof) => {
      acc[prof.verificationStatus] = (acc[prof.verificationStatus] || 0) + 1;
      return acc;
    }, {});
    console.log('\n📈 Summary by Verification Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error listing professionals:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
listAllProfessionals()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
