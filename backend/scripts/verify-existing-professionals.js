/**
 * Script to verify existing professional profiles that have all required information
 * This will update PENDING professionals to VERIFIED if they have:
 * - registryNumber (in services)
 * - city
 * - displayName
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyExistingProfessionals() {
  try {
    console.log('🔍 Searching for PENDING professional profiles...');
    
    const pendingProfessionals = await prisma.professionalProfile.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log(`📊 Found ${pendingProfessionals.length} PENDING professionals`);

    let verifiedCount = 0;
    let skippedCount = 0;

    for (const profile of pendingProfessionals) {
      // Check if profile has all required information
      const hasRegistryNumber = profile.services && 
        (profile.services.registryNumber || 
         (typeof profile.services === 'object' && profile.services.registryNumber));
      const hasCity = profile.city && profile.city.trim().length > 0;
      const hasDisplayName = profile.displayName && profile.displayName.trim().length > 0;

      if (hasRegistryNumber && hasCity && hasDisplayName) {
        // Verify this professional
        await prisma.professionalProfile.update({
          where: { id: profile.id },
          data: {
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });

        console.log(`✅ Verified: ${profile.displayName} (${profile.type}) - ${profile.user.email}`);
        verifiedCount++;
      } else {
        console.log(`⏭️  Skipped: ${profile.displayName} (${profile.type}) - Missing: ${
          !hasRegistryNumber ? 'registryNumber ' : ''
        }${!hasCity ? 'city ' : ''}${!hasDisplayName ? 'displayName' : ''}`);
        skippedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Verified: ${verifiedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📊 Total: ${pendingProfessionals.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyExistingProfessionals()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
