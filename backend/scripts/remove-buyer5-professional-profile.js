/**
 * Script to remove professional profile from buyer5
 * This fixes the issue where buyer5 has a professional profile causing confusion
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeBuyer5ProfessionalProfile() {
  try {
    // Find buyer5 user
    const user = await prisma.user.findUnique({
      where: { email: 'buyer5@buyer5.gr' },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      console.error('User buyer5@buyer5.gr not found');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    // Find professional profile
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      console.log('No professional profile found for buyer5. Nothing to remove.');
      process.exit(0);
    }

    console.log(`Found professional profile: ${profile.id} (type: ${profile.type})`);

    // Delete professional profile (this will cascade delete related records)
    await prisma.professionalProfile.delete({
      where: { id: profile.id },
    });

    console.log(`✅ Successfully deleted professional profile ${profile.id} for buyer5`);

    // Verify user role is still BUYER
    if (user.role !== 'BUYER') {
      console.log(`⚠️  Warning: User role is ${user.role}, not BUYER. Consider fixing it.`);
    }
  } catch (error) {
    console.error('Error removing professional profile:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeBuyer5ProfessionalProfile();
