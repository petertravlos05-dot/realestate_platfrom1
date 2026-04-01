/**
 * Script to update existing professional profiles by adding city to areaTags
 * This ensures that all professionals have their city in areaTags for better search results
 * 
 * Usage: node scripts/update-professionals-area-tags.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProfessionalsAreaTags() {
  try {
    const isDryRun = process.argv.includes('--dry-run');
    
    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    console.log('🔍 Fetching all professional profiles...\n');

    const professionals = await prisma.professionalProfile.findMany({
      where: {
        city: {
          not: null,
        },
      },
      select: {
        id: true,
        displayName: true,
        city: true,
        areaTags: true,
      },
    });

    console.log(`📊 Found ${professionals.length} professional profile(s) with city\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const prof of professionals) {
      const city = prof.city?.trim();
      if (!city) {
        skippedCount++;
        continue;
      }

      // Check if city is already in areaTags (case-insensitive)
      const areaTags = prof.areaTags || [];
      const cityInAreaTags = areaTags.some(tag => 
        tag.toLowerCase() === city.toLowerCase()
      );

      if (cityInAreaTags) {
        console.log(`⏭️  Skipping ${prof.displayName} (${city}) - city already in areaTags`);
        skippedCount++;
        continue;
      }

      // Add city to areaTags
      const updatedAreaTags = [...areaTags, city];

      if (isDryRun) {
        console.log(`🔍 Would update ${prof.displayName} (${city}):`);
        console.log(`   Current areaTags: ${areaTags.length > 0 ? areaTags.join(', ') : 'N/A'}`);
        console.log(`   New areaTags: ${updatedAreaTags.join(', ')}`);
      } else {
        await prisma.professionalProfile.update({
          where: { id: prof.id },
          data: {
            areaTags: updatedAreaTags,
          },
        });
        console.log(`✅ Updated ${prof.displayName} (${city}):`);
        console.log(`   Added "${city}" to areaTags`);
      }
      updatedCount++;
    }

    console.log('\n' + '═'.repeat(100));
    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${professionals.length}`);

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Update completed successfully');
    }

  } catch (error) {
    console.error('❌ Error updating professionals:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateProfessionalsAreaTags()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
