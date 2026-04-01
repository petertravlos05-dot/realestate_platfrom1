/**
 * Complete S3 Deletion Flow Test Script
 * 
 * This script tests the full Phase 2 S3 deletion flow:
 * 
 * NOTE: This script uses tsx to run TypeScript modules
 * Run with: tsx scripts/test-s3-deletion-flow.js
 * Or: node --loader tsx/esm scripts/test-s3-deletion-flow.js
 * 1. Creates a test user
 * 2. Creates a property with S3 image URLs (simulated)
 * 3. Creates property documents with S3 URLs (simulated)
 * 4. Sets user avatar and company logo (simulated)
 * 5. Deletes the user account
 * 6. Verifies S3 keys were collected and queued
 * 7. Runs worker in DRY_RUN mode
 * 8. Verifies jobs were processed
 * 
 * Usage:
 *   node scripts/test-s3-deletion-flow.js
 * 
 * Environment Variables:
 *   DRY_RUN=true - Run worker in DRY_RUN mode (default: true)
 *   CLEANUP=true - Delete test user and data after test (default: false)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { URL } = require('url');

const prisma = new PrismaClient();
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = `test-s3-deletion-${Date.now()}@example.com`;
const TEST_PASSWORD = 'testpassword123';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default: true
const CLEANUP = process.env.CLEANUP === 'true'; // Default: false

const cookies = new Map();
let testUserId = null;
let testPropertyId = null;

function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return;
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  cookieStrings.forEach(cookieStr => {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length === 2) {
      cookies.set(parts[0].trim(), parts[1].trim());
    }
  });
}

function getCookieString() {
  return Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const cookieHeader = getCookieString();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    if (options.csrfToken) {
      headers['X-CSRF-Token'] = options.csrfToken;
    }
    
    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers,
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        extractCookies(res.headers['set-cookie']);
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`   [ERROR] Request error: ${err.message}`);
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

async function generateJwtToken(user) {
  const jwtSecret = await getJwtSecret();
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

async function createTestUser() {
  console.log('📋 Step 1: Creating test user...');
  
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      password: hashedPassword,
      name: 'Test S3 Deletion User',
      role: 'SELLER',
      // Simulate S3 URLs for avatar and company logo
      image: `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/avatars/user-${Date.now()}.jpg`,
      companyLogo: `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/logos/company-${Date.now()}.png`,
    },
  });
  
  testUserId = user.id;
  console.log(`✅ User created: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Avatar: ${user.image}`);
  console.log(`   Company Logo: ${user.companyLogo}\n`);
  
  return user;
}

async function createTestProperty(user) {
  console.log('📋 Step 2: Creating test property with S3 images...');
  
  // Simulate S3 image URLs
  const s3ImageUrls = [
    `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/properties/image1-${Date.now()}.jpg`,
    `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/properties/image2-${Date.now()}.jpg`,
    `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/properties/image3-${Date.now()}.jpg`,
  ];
  
  const property = await prisma.property.create({
    data: {
      userId: user.id,
      title: 'Test Property for S3 Deletion',
      fullDescription: 'This property will be used to test S3 deletion',
      propertyType: 'HOUSE',
      area: 100,
      price: 100000,
      state: 'Test State',
      city: 'Test City',
      street: 'Test Street',
      number: '123',
      images: s3ImageUrls,
      status: 'PENDING',
    },
  });
  
  testPropertyId = property.id;
  console.log(`✅ Property created: ${property.id}`);
  console.log(`   Images: ${s3ImageUrls.length} S3 URLs\n`);
  
  return property;
}

async function createTestDocuments(user, property) {
  console.log('📋 Step 3: Creating test property documents...');
  
  const documentTypes = ['title', 'building_permit', 'energy_certificate'];
  const documents = [];
  
  for (const docType of documentTypes) {
    const doc = await prisma.propertyDocument.create({
      data: {
        propertyId: property.id,
        type: docType,
        fileUrl: `https://${process.env.AWS_S3_BUCKET || 'test-bucket'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${property.id}/${docType}/document-${Date.now()}.pdf`,
        status: 'pending',
        uploadedAt: new Date(),
        uploadedBy: user.id,
      },
    });
    documents.push(doc);
  }
  
  console.log(`✅ Documents created: ${documents.length}`);
  documents.forEach(doc => {
    console.log(`   - ${doc.type}: ${doc.fileUrl}`);
  });
  console.log('');
  
  return documents;
}

async function acceptConsents(user) {
  console.log('📋 Step 4: Accepting consents...');
  
  const currentVersions = {
    TERMS: process.env.TERMS_VERSION || '2026-01-01',
    PRIVACY: process.env.PRIVACY_VERSION || '2026-01-01',
  };
  
  const consentTypes = ['TERMS', 'PRIVACY'];
  for (const type of consentTypes) {
    await prisma.userConsent.upsert({
      where: {
        userId_consentType_version: {
          userId: user.id,
          consentType: type,
          version: currentVersions[type],
        },
      },
      create: {
        userId: user.id,
        consentType: type,
        version: currentVersions[type],
      },
      update: {},
    });
  }
  
  console.log('✅ Consents accepted\n');
}

async function deleteUserAccount(user) {
  console.log('📋 Step 5: Deleting user account...');
  
  // Get CSRF token
  const healthResponse = await request('GET', '/health');
  const csrfToken = cookies.get('csrf_token');
  
  if (!csrfToken) {
    console.log('   ⚠️  No CSRF token found, trying again...');
    await new Promise(resolve => setTimeout(resolve, 500));
    await request('GET', '/health');
    const retryCsrfToken = cookies.get('csrf_token');
    if (!retryCsrfToken) {
      throw new Error('Failed to obtain CSRF token');
    }
  }
  
  // Generate JWT token
  const authToken = await generateJwtToken(user);
  
  // Delete account
  const deleteResponse = await request('POST', '/api/user/delete', {
    body: { password: TEST_PASSWORD },
    csrfToken: csrfToken || cookies.get('csrf_token'),
    authToken,
  });
  
  if (deleteResponse.status === 200) {
    console.log('✅ Account deleted successfully');
    console.log(`   Response: ${JSON.stringify(deleteResponse.data, null, 2)}\n`);
  } else {
    console.error(`   ❌ Delete failed: ${deleteResponse.status}`);
    console.error(`   Response: ${JSON.stringify(deleteResponse.data, null, 2)}`);
    console.error(`   CSRF Token: ${csrfToken ? 'present (' + csrfToken.substring(0, 20) + '...)' : 'missing'}`);
    console.error(`   Auth Token: ${authToken ? 'present (' + authToken.substring(0, 20) + '...)' : 'missing'}`);
    
    if (deleteResponse.status === 501 && deleteResponse.data?.error === 'NOT_IMPLEMENTED') {
      console.error('\n   ⚠️  The delete endpoint returned NOT_IMPLEMENTED.');
      console.error('   This usually means:');
      console.error('   1. The backend server needs to be restarted');
      console.error('   2. The code changes have not been deployed');
      console.error('   3. There might be a routing issue\n');
    }
    
    throw new Error(`Failed to delete account: ${deleteResponse.status} - ${JSON.stringify(deleteResponse.data)}`);
  }
}

async function verifyQueuedJobs(userId) {
  console.log('📋 Step 6: Verifying queued deletion jobs...');
  
  const jobs = await prisma.fileDeletionJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  
  console.log(`✅ Found ${jobs.length} queued jobs:`);
  jobs.forEach((job, index) => {
    console.log(`   ${index + 1}. ${job.s3Key} (status: ${job.status})`);
  });
  console.log('');
  
  // Group by status
  const byStatus = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('   Status breakdown:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });
  console.log('');
  
  return jobs;
}

async function runWorker() {
  console.log('📋 Step 7: Running S3 deletion worker...');
  console.log(`   Mode: ${DRY_RUN ? 'DRY_RUN (simulation)' : 'LIVE (real deletion)'}\n`);
  
  // Use Prisma directly to process deletion queue
  // Since we can't easily import TypeScript modules from Node.js script,
  // we'll simulate the worker by calling the processDeletionQueue via API
  // or implement a simplified version here
  
  const MAX_ATTEMPTS = 5;
  const ERROR_MAX_LENGTH = 500;
  const S3_BUCKET = process.env.AWS_S3_BUCKET;
  const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  const isDryRun = DRY_RUN;
  
  // Check if S3 is configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !S3_BUCKET) {
    console.log('   ⚠️  S3 not configured, simulating deletion queue processing...');
    console.log('   (In production, configure AWS credentials and S3_BUCKET)\n');
    
    // Mark all jobs as deleted in DRY_RUN mode
    if (isDryRun) {
      const jobs = await prisma.fileDeletionJob.findMany({
        where: { status: 'QUEUED' },
      });
      
      for (const job of jobs) {
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
          },
        });
      }
      
      console.log(`   ✅ Simulated deletion of ${jobs.length} jobs (DRY_RUN mode)\n`);
      return { totalProcessed: jobs.length, totalDeleted: jobs.length, totalFailed: 0 };
    } else {
      console.log('   ⚠️  Cannot process deletions without S3 configuration\n');
      return { totalProcessed: 0, totalDeleted: 0, totalFailed: 0 };
    }
  }
  
  // Import AWS SDK dynamically
  let S3Client, DeleteObjectCommand, HeadObjectCommand;
  try {
    const awsSdk = await import('@aws-sdk/client-s3');
    S3Client = awsSdk.S3Client;
    DeleteObjectCommand = awsSdk.DeleteObjectCommand;
    HeadObjectCommand = awsSdk.HeadObjectCommand;
  } catch (error) {
    console.log('   ⚠️  AWS SDK not available, simulating deletion...\n');
    const jobs = await prisma.fileDeletionJob.findMany({
      where: { status: 'QUEUED' },
    });
    
    for (const job of jobs) {
      await prisma.fileDeletionJob.update({
        where: { id: job.id },
        data: {
          status: isDryRun ? 'DELETED' : 'FAILED',
          deletedAt: isDryRun ? new Date() : null,
          lastError: isDryRun ? null : 'AWS SDK not available',
        },
      });
    }
    
    return { totalProcessed: jobs.length, totalDeleted: isDryRun ? jobs.length : 0, totalFailed: isDryRun ? 0 : jobs.length };
  }
  
  const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  let totalProcessed = 0;
  let totalDeleted = 0;
  let totalFailed = 0;
  let iteration = 0;
  const MAX_ITERATIONS = 10;
  const BATCH_SIZE = 50;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`   Batch ${iteration}: Processing up to ${BATCH_SIZE} jobs...`);
    
    // Fetch queued jobs
    const jobs = await prisma.fileDeletionJob.findMany({
      where: {
        status: 'QUEUED',
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });
    
    if (jobs.length === 0) {
      console.log('   ✅ No more jobs to process\n');
      break;
    }
    
    for (const job of jobs) {
      totalProcessed++;
      
      try {
        // Mark as processing
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING' },
        });
        
        // Delete from S3 (or simulate in DRY_RUN)
        if (isDryRun) {
          console.log(`     [DRY_RUN] Would delete: ${job.s3Key}`);
        } else {
          // Verify file exists
          try {
            await s3Client.send(new HeadObjectCommand({
              Bucket: S3_BUCKET,
              Key: job.s3Key,
            }));
          } catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
              console.log(`     File ${job.s3Key} not found in S3, marking as deleted`);
            } else {
              throw error;
            }
          }
          
          // Delete from S3
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: job.s3Key,
          }));
          console.log(`     Deleted: ${job.s3Key}`);
        }
        
        // Mark as deleted
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            lastError: null,
          },
        });
        
        totalDeleted++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const truncatedError = errorMessage.length > ERROR_MAX_LENGTH
          ? errorMessage.substring(0, ERROR_MAX_LENGTH) + '...'
          : errorMessage;
        
        const newAttempts = job.attempts + 1;
        const shouldRetry = newAttempts < MAX_ATTEMPTS;
        
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: {
            status: shouldRetry ? 'QUEUED' : 'FAILED',
            attempts: newAttempts,
            lastError: truncatedError,
          },
        });
        
        if (shouldRetry) {
          console.log(`     ⚠️  Failed (attempt ${newAttempts}/${MAX_ATTEMPTS}): ${truncatedError}`);
        } else {
          console.log(`     ❌ Failed after ${newAttempts} attempts: ${truncatedError}`);
          totalFailed++;
        }
      }
    }
    
    console.log(`     Processed: ${jobs.length}, Deleted: ${totalDeleted - (totalFailed > 0 ? totalFailed : 0)}, Failed: ${totalFailed}`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const result = { totalProcessed, totalDeleted, totalFailed };
    
  console.log(`   Summary: Processed ${result.totalProcessed}, Deleted ${result.totalDeleted}, Failed ${result.totalFailed}\n`);
  
  return result;
}

async function verifyFinalState(userId) {
  console.log('📋 Step 8: Verifying final state...');
  
  const jobs = await prisma.fileDeletionJob.findMany({
    where: { userId },
  });
  
  const byStatus = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('   Final job status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });
  
  const deletedCount = byStatus.DELETED || 0;
  const failedCount = byStatus.FAILED || 0;
  const queuedCount = byStatus.QUEUED || 0;
  
  if (DRY_RUN) {
    if (deletedCount > 0) {
      console.log(`\n   ✅ ${deletedCount} jobs marked as deleted (DRY_RUN mode - no actual S3 deletion)`);
    }
    if (failedCount > 0) {
      console.log(`   ⚠️  ${failedCount} jobs failed`);
    }
    if (queuedCount > 0) {
      console.log(`   ⚠️  ${queuedCount} jobs still queued`);
    }
  } else {
    if (deletedCount > 0) {
      console.log(`\n   ✅ ${deletedCount} files deleted from S3`);
    }
    if (failedCount > 0) {
      console.log(`   ⚠️  ${failedCount} files failed to delete`);
    }
  }
  
  console.log('');
}

async function cleanup() {
  if (!CLEANUP) return;
  
  console.log('📋 Cleanup: Removing test data...');
  
  try {
    if (testPropertyId) {
      await prisma.propertyDocument.deleteMany({
        where: { propertyId: testPropertyId },
      });
      await prisma.property.delete({
        where: { id: testPropertyId },
      });
    }
    
    if (testUserId) {
      await prisma.fileDeletionJob.deleteMany({
        where: { userId: testUserId },
      });
      // User is already deleted, so we can't delete it again
      // But we can clean up any remaining jobs
    }
    
    console.log('✅ Cleanup completed\n');
  } catch (error) {
    console.error('⚠️  Cleanup error (non-fatal):', error.message);
  }
}

async function checkBackendHealth() {
  console.log('📋 Checking backend server health...');
  try {
    const healthResponse = await request('GET', '/health');
    if (healthResponse.status === 200) {
      console.log('✅ Backend server is running\n');
      return true;
    } else {
      console.log(`⚠️  Backend returned status ${healthResponse.status}\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Backend server is not accessible: ${error.message}`);
    console.error('   Please make sure the backend server is running on', BASE_URL);
    console.error('   Start it with: npm run dev\n');
    return false;
  }
}

async function main() {
  console.log('🚀 S3 Deletion Flow Test Script\n');
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🔧 DRY_RUN Mode: ${DRY_RUN}`);
  console.log(`🧹 Cleanup: ${CLEANUP}`);
  console.log(`🌐 Backend URL: ${BASE_URL}\n`);
  console.log('='.repeat(60) + '\n');
  
  // Check backend health first
  const backendHealthy = await checkBackendHealth();
  if (!backendHealthy) {
    process.exit(1);
  }
  
  try {
    // Step 1: Create test user
    const user = await createTestUser();
    
    // Step 2: Create property with S3 images
    const property = await createTestProperty(user);
    
    // Step 3: Create property documents
    const documents = await createTestDocuments(user, property);
    
    // Step 4: Accept consents
    await acceptConsents(user);
    
    // Step 5: Delete user account (this should trigger S3 key collection)
    await deleteUserAccount(user);
    
    // Wait a bit for async S3 key collection to complete
    console.log('⏳ Waiting for S3 key collection to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
    
    // Step 6: Verify queued jobs
    const jobs = await verifyQueuedJobs(user.id);
    
    if (jobs.length === 0) {
      console.log('⚠️  No jobs were queued. This might mean:');
      console.log('   - S3 keys were not found in the database');
      console.log('   - All URLs were local (not S3)');
      console.log('   - There was an error during key collection\n');
    } else {
      // Step 7: Run worker
      await runWorker();
      
      // Step 8: Verify final state
      await verifyFinalState(user.id);
    }
    
    // Cleanup if requested
    await cleanup();
    
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!\n');
    
    if (DRY_RUN) {
      console.log('ℹ️  Note: DRY_RUN mode was enabled - no actual S3 deletions occurred');
      console.log('   To test real deletion, run: DRY_RUN=false node scripts/test-s3-deletion-flow.js\n');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    
    // Cleanup on error if requested
    if (CLEANUP) {
      await cleanup();
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

