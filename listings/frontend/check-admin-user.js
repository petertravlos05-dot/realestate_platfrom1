const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('Checking for admin users...');
    
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log('Admin users found:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log('- ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Name:', user.name);
      console.log('  Role:', user.role);
      console.log('');
    });
    
    // Also check all users to see what roles exist
    console.log('All users and their roles:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}): ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser(); 