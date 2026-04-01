/**
 * Test Job Lock
 * 
 * Runs two concurrent invocations using separate PrismaClient instances
 * (simulating different processes) and confirms second exits without running.
 * 
 * Usage:
 *   node scripts/test-job-lock.js
 * 
 * Note: Requires compiled TypeScript. Run `npm run build` first.
 */

const { PrismaClient } = require('@prisma/client');

async function testJobLock() {
  console.log('🧪 Testing Job Lock');
  console.log('==================\n');
  console.log('Note: Using separate PrismaClient instances to simulate different processes\n');

  const lockName = 'test-job-lock';
  let firstAcquired = false;
  let secondAcquired = false;

  // Create separate PrismaClient instances (simulating different processes)
  const prisma1 = new PrismaClient();
  const prisma2 = new PrismaClient();

  try {
    // Try to acquire lock twice concurrently from different "processes"
    const lock1Promise = (async () => {
      try {
        const result = await prisma1.$queryRaw`
          SELECT pg_try_advisory_lock(hashtext(${lockName})) AS acquired
        `;
        const acquired = result[0]?.acquired ?? false;
        if (acquired) {
          firstAcquired = true;
          console.log('   Lock 1 (Process 1): ✅ ACQUIRED');
          // Hold lock for 2 seconds
          await new Promise(resolve => setTimeout(resolve, 2000));
          await prisma1.$queryRaw`
            SELECT pg_advisory_unlock(hashtext(${lockName}))
          `;
          console.log('   Lock 1 (Process 1): ✅ RELEASED');
        } else {
          console.log('   Lock 1 (Process 1): ❌ NOT ACQUIRED');
        }
      } finally {
        await prisma1.$disconnect();
      }
    })();

    // Try to acquire same lock from second "process" (should fail)
    const lock2Promise = (async () => {
      // Small delay to ensure lock1 acquires first
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const result = await prisma2.$queryRaw`
          SELECT pg_try_advisory_lock(hashtext(${lockName})) AS acquired
        `;
        const acquired = result[0]?.acquired ?? false;
        if (acquired) {
          secondAcquired = true;
          console.log('   Lock 2 (Process 2): ✅ ACQUIRED');
          await prisma2.$queryRaw`
            SELECT pg_advisory_unlock(hashtext(${lockName}))
          `;
          console.log('   Lock 2 (Process 2): ✅ RELEASED');
        } else {
          console.log('   Lock 2 (Process 2): ❌ NOT ACQUIRED (expected)');
        }
      } finally {
        await prisma2.$disconnect();
      }
    })();

    await Promise.all([lock1Promise, lock2Promise]);

    console.log('\n📊 Results:');
    console.log(`   Lock 1 acquired: ${firstAcquired ? '✅' : '❌'}`);
    console.log(`   Lock 2 acquired: ${secondAcquired ? '❌ (should not acquire)' : '✅ (correctly blocked)'}`);

    if (firstAcquired && !secondAcquired) {
      console.log('\n✅ Test PASSED: Second lock correctly blocked');
      process.exit(0);
    } else {
      console.log('\n❌ Test FAILED: Lock behavior incorrect');
      console.log('   Note: If both locks acquired, they may be using different DB sessions.');
      console.log('   This is expected with connection pooling. Locks work across different processes.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await prisma1.$disconnect().catch(() => {});
    await prisma2.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testJobLock();

