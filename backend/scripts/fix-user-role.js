/**
 * Script to fix user role in database
 * Usage: node scripts/fix-user-role.js <email> <correctRole>
 * Example: node scripts/fix-user-role.js buyer5@example.com BUYER
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserRole(email, correctRole) {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);
    console.log(`Target role: ${correctRole}`);

    if (user.role === correctRole) {
      console.log('User already has the correct role. No changes needed.');
      process.exit(0);
    }

    // Update role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: correctRole },
    });

    console.log(`✅ Successfully updated role from ${user.role} to ${correctRole}`);

    // Check if user has professional profile that should be removed
    if (correctRole !== 'LAWYER' && correctRole !== 'NOTARY' && correctRole !== 'ACCOUNTANT') {
      const professionalProfile = await prisma.professionalProfile.findUnique({
        where: { userId: user.id },
      });

      if (professionalProfile) {
        console.log(`⚠️  Warning: User has professional profile. Consider removing it.`);
        console.log(`   Professional profile ID: ${professionalProfile.id}`);
      }
    }
  } catch (error) {
    console.error('Error fixing user role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const email = process.argv[2];
const correctRole = process.argv[3];

if (!email || !correctRole) {
  console.error('Usage: node scripts/fix-user-role.js <email> <correctRole>');
  console.error('Example: node scripts/fix-user-role.js buyer5@example.com BUYER');
  process.exit(1);
}

const validRoles = ['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ACCOUNTANT', 'ADMIN'];
if (!validRoles.includes(correctRole.toUpperCase())) {
  console.error(`Invalid role: ${correctRole}`);
  console.error(`Valid roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

fixUserRole(email, correctRole.toUpperCase());
