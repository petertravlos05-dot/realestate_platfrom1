/**
 * Test script for GDPR cleanup job
 * 
 * Seeds old rows and confirms cleanup deletes them.
 * 
 * Usage:
 *   node scripts/test-cleanup-job.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCleanupJob() {
  console.log('🧪 Testing GDPR cleanup job...\n');

  try {
    // Create test user
    console.log('1. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: `test-cleanup-${Date.now()}@example.com`,
        name: 'Test Cleanup User',
        password: 'hashed_password_here', // Not used for this test
        role: 'BUYER',
      },
    });
    console.log(`   ✅ Created user: ${testUser.id}\n`);

    // Create old deleted FileDeletionJob (should be deleted)
    console.log('2. Creating old deleted FileDeletionJob (should be cleaned up)...');
    const oldDeletedDate = new Date();
    oldDeletedDate.setDate(oldDeletedDate.getDate() - 35); // 35 days ago (older than 30 day retention)

    const oldDeletedJob = await prisma.fileDeletionJob.create({
      data: {
        userId: testUser.id,
        s3Key: 'test/old-deleted-file.jpg',
        status: 'DELETED',
        deletedAt: oldDeletedDate,
        attempts: 1,
      },
    });
    console.log(`   ✅ Created old deleted job: ${oldDeletedJob.id} (deletedAt: ${oldDeletedDate.toISOString()})\n`);

    // Create old failed FileDeletionJob (should be deleted)
    console.log('3. Creating old failed FileDeletionJob (should be cleaned up)...');
    const oldFailedDate = new Date();
    oldFailedDate.setDate(oldFailedDate.getDate() - 95); // 95 days ago (older than 90 day retention)

    const oldFailedJob = await prisma.fileDeletionJob.create({
      data: {
        userId: testUser.id,
        s3Key: 'test/old-failed-file.jpg',
        status: 'FAILED',
        attempts: 5,
        lastError: 'Test error',
        updatedAt: oldFailedDate,
      },
    });
    console.log(`   ✅ Created old failed job: ${oldFailedJob.id} (updatedAt: ${oldFailedDate.toISOString()})\n`);

    // Create recent deleted FileDeletionJob (should NOT be deleted)
    console.log('4. Creating recent deleted FileDeletionJob (should NOT be cleaned up)...');
    const recentDeletedDate = new Date();
    recentDeletedDate.setDate(recentDeletedDate.getDate() - 10); // 10 days ago (within 30 day retention)

    const recentDeletedJob = await prisma.fileDeletionJob.create({
      data: {
        userId: testUser.id,
        s3Key: 'test/recent-deleted-file.jpg',
        status: 'DELETED',
        deletedAt: recentDeletedDate,
        attempts: 1,
      },
    });
    console.log(`   ✅ Created recent deleted job: ${recentDeletedJob.id} (deletedAt: ${recentDeletedDate.toISOString()})\n`);

    // Create recent failed FileDeletionJob (should NOT be deleted)
    console.log('5. Creating recent failed FileDeletionJob (should NOT be cleaned up)...');
    const recentFailedJob = await prisma.fileDeletionJob.create({
      data: {
        userId: testUser.id,
        s3Key: 'test/recent-failed-file.jpg',
        status: 'FAILED',
        attempts: 3,
        lastError: 'Test error',
      },
    });
    console.log(`   ✅ Created recent failed job: ${recentFailedJob.id}\n`);

    // Run cleanup job
    console.log('6. Running cleanup job...');
    const { runCleanup } = require('../dist/jobs/cleanupJob');
    const stats = await runCleanup();
    console.log(`   ✅ Cleanup completed\n`);

    // Verify old jobs were deleted
    console.log('7. Verifying cleanup results...');
    const oldDeletedStillExists = await prisma.fileDeletionJob.findUnique({
      where: { id: oldDeletedJob.id },
    });
    const oldFailedStillExists = await prisma.fileDeletionJob.findUnique({
      where: { id: oldFailedJob.id },
    });
    const recentDeletedStillExists = await prisma.fileDeletionJob.findUnique({
      where: { id: recentDeletedJob.id },
    });
    const recentFailedStillExists = await prisma.fileDeletionJob.findUnique({
      where: { id: recentFailedJob.id },
    });

    const oldDeletedPassed = !oldDeletedStillExists; // Should NOT exist
    const oldFailedPassed = !oldFailedStillExists; // Should NOT exist
    const recentDeletedPassed = !!recentDeletedStillExists; // Should exist
    const recentFailedPassed = !!recentFailedStillExists; // Should exist

    console.log(`   Old deleted job deleted: ${oldDeletedPassed ? '✅ PASSED' : '❌ FAILED'} (should be deleted)`);
    console.log(`   Old failed job deleted: ${oldFailedPassed ? '✅ PASSED' : '❌ FAILED'} (should be deleted)`);
    console.log(`   Recent deleted job preserved: ${recentDeletedPassed ? '✅ PASSED' : '❌ FAILED'} (should NOT be deleted)`);
    console.log(`   Recent failed job preserved: ${recentFailedPassed ? '✅ PASSED' : '❌ FAILED'} (should NOT be deleted)\n`);

    // Cleanup test data
    console.log('8. Cleaning up test data...');
    await prisma.fileDeletionJob.deleteMany({
      where: {
        userId: testUser.id,
      },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('   ✅ Test data cleaned up\n');

    // Summary
    const allPassed = oldDeletedPassed && oldFailedPassed && recentDeletedPassed && recentFailedPassed;
    
    if (allPassed) {
      console.log('✅ All tests passed!');
      console.log(`   - Old deleted jobs: ${stats.fileDeletionJobsDeleted} deleted`);
      console.log(`   - Old failed jobs: ${stats.fileDeletionJobsFailed} deleted`);
    } else {
      console.log('❌ Some tests failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testCleanupJob();

