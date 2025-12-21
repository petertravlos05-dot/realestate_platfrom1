const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReferralSystem() {
  try {
    console.log('=== Testing Referral System ===');
    
    // 1. Check if referrals table exists and has data
    console.log('\n1. Checking referrals table...');
    const referrals = await prisma.$queryRaw`SELECT * FROM referrals LIMIT 5`;
    console.log('Referrals found:', referrals);
    
    // 2. Check if referral_points table exists and has data
    console.log('\n2. Checking referral_points table...');
    const referralPoints = await prisma.$queryRaw`SELECT * FROM "referral_points" LIMIT 5`;
    console.log('Referral points found:', referralPoints);
    
    // 3. Check users table
    console.log('\n3. Checking users table...');
    const users = await prisma.$queryRaw`SELECT id, name, email, role FROM users LIMIT 5`;
    console.log('Users found:', users);
    
    // 4. Test a specific referral query
    if (users.length > 0) {
      const testUserId = users[0].id;
      console.log(`\n4. Testing referral stats for user: ${testUserId}`);
      
      const userReferrals = await prisma.$queryRaw`
        SELECT r.*, u.name as referred_name, u.email as referred_email
        FROM referrals r
        JOIN users u ON r."referredId" = u.id
        WHERE r."referrerId" = ${testUserId} AND r."isActive" = true
      `;
      console.log('User referrals:', userReferrals);
      
      const userPoints = await prisma.$queryRaw`
        SELECT rp.*, p.title as property_title
        FROM "referral_points" rp
        LEFT JOIN properties p ON rp."propertyId" = p.id
        WHERE rp."referralId" IN (
          SELECT id FROM referrals WHERE "referrerId" = ${testUserId} AND "isActive" = true
        )
      `;
      console.log('User points:', userPoints);
    }
    
  } catch (error) {
    console.error('Error testing referral system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReferralSystem(); 