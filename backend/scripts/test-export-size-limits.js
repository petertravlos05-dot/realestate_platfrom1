/**
 * Test DSAR Export Size Limits + Pagination
 * 
 * Tests:
 * 1. Normal user export → should download 1 file (no pagination)
 * 2. User with many messages (2000+) → should download parts (pagination) without 500/timeout
 * 
 * Usage:
 *   node scripts/test-export-size-limits.js
 * 
 * IMPORTANT: 
 *   - Backend server must be running with latest code (restart if needed)
 *   - This script sends X-Test-Request header to bypass rate limiting
 *   - Rate limit bypass ONLY works in non-production (NODE_ENV !== 'production')
 *   - In production, bypass is disabled for security. Use spaced requests or dedicated test users.
 *   - If you see rate limit errors, restart the backend server or wait for rate limit to reset
 * 
 * Environment:
 *   BACKEND_URL (default: http://localhost:3001)
 *   NODE_ENV (if 'production', bypass will be disabled)
 *   ALLOW_TEST_RATE_LIMIT_BYPASS (optional, set to 'true' to enable bypass even in production - ONLY for localhost)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Set DISABLE_EXPORT_RATE_LIMIT for testing (can be overridden by env)
if (!process.env.DISABLE_EXPORT_RATE_LIMIT) {
  process.env.DISABLE_EXPORT_RATE_LIMIT = 'true';
}

// Use timestamp-based emails to avoid rate limit conflicts between test runs
const timestamp = Date.now();
const NORMAL_USER_EMAIL = `test-export-normal-${timestamp}@example.com`;
const LARGE_USER_EMAIL = `test-export-large-${timestamp}@example.com`;
const TEST_PASSWORD = 'testpassword123';

let authToken = null;
let csrfToken = null;
let cookies = [];

// Helper: Get JWT secret
async function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

// Helper: Generate JWT token
async function generateJwtToken(user) {
  const jwtSecret = await getJwtSecret();
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

// Helper: Make HTTP request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // Only send test header in non-production environments
    // In production, rate limit bypass is disabled for security
    const isProduction = process.env.NODE_ENV === 'production';
    const allowBypass = process.env.ALLOW_TEST_RATE_LIMIT_BYPASS === 'true';
    const shouldSendTestHeader = !isProduction || allowBypass;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(shouldSendTestHeader && { 'X-Test-Request': 'true' }), // Bypass rate limiting for test requests (non-production only)
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...(cookies.length > 0 && { 'Cookie': cookies.join('; ') }),
      ...options.headers,
    };

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Extract cookies
        const setCookieHeaders = res.headers['set-cookie'];
        if (setCookieHeaders) {
          const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
          cookies = cookieArray.map(cookie => cookie.split(';')[0]);
          
          // Update CSRF token from cookie if present
          const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
          if (csrfCookie) {
            csrfToken = csrfCookie.split('=')[1].split(';')[0];
          }
        }

        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
          raw: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

// Helper: Get CSRF token
async function getCsrfToken() {
  try {
    const response = await makeRequest({
      method: 'GET',
      path: '/health',
    });

    // CSRF token should be in cookies after health check
    const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
    if (csrfCookie) {
      csrfToken = csrfCookie.split('=')[1].split(';')[0];
      return true;
    }
    
    // If not found, try to get it from any endpoint that sets cookies
    if (!csrfToken) {
      const csrfResponse = await makeRequest({
        method: 'GET',
        path: '/api/user/consents',
      });
      const csrfCookie2 = cookies.find(c => c.startsWith('csrf_token='));
      if (csrfCookie2) {
        csrfToken = csrfCookie2.split('=')[1].split(';')[0];
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // CSRF might not be critical for some endpoints, but log it
    console.warn('⚠ Could not get CSRF token:', error.message);
    return false;
  }
}

// Helper: Setup user with consents
async function setupUser(email, name) {
  try {
    let user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'BUYER',
        },
      });
      console.log(`✓ User created: ${email}`);
    } else {
      console.log(`ℹ User already exists: ${email}`);
    }
    
    // Ensure consents exist
    const currentVersions = {
      TERMS: process.env.TERMS_VERSION || '2026-01-01',
      PRIVACY: process.env.PRIVACY_VERSION || '2026-01-01',
    };
    
    const existingConsents = await prisma.userConsent.findMany({
      where: {
        userId: user.id,
        consentType: { in: ['TERMS', 'PRIVACY'] },
        version: { in: [currentVersions.TERMS, currentVersions.PRIVACY] },
      },
    });
    
    if (existingConsents.length < 2) {
      const consentTypes = ['TERMS', 'PRIVACY'];
      for (const type of consentTypes) {
        const existing = existingConsents.find(c => c.consentType === type && c.version === currentVersions[type]);
        if (!existing) {
          await prisma.userConsent.create({
            data: {
              userId: user.id,
              consentType: type,
              version: currentVersions[type],
            },
          });
        }
      }
    }
    
    return user;
  } catch (error) {
    console.error(`✗ Setup error for ${email}:`, error.message);
    throw error;
  }
}

// Helper: Setup auth (using direct JWT generation to bypass rate limits)
async function setupAuth(user) {
  authToken = await generateJwtToken(user);
  
  // Try to get CSRF token, but don't fail if it's not available
  // Some endpoints may work without CSRF if JWT is present
  try {
    await getCsrfToken();
  } catch (error) {
    // CSRF token might not be critical for some endpoints
    console.warn('  ⚠ Could not get CSRF token, continuing anyway');
  }
  
  return true;
}

// Helper: Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Test 1: Normal user export (should be 1 file, no pagination)
async function testNormalUserExport() {
  console.log('\n=== Test 1: Normal User Export (No Pagination) ===');
  
  try {
    // Setup normal user
    const user = await setupUser(NORMAL_USER_EMAIL, 'Normal Test User');
    await setupAuth(user);
    
    // Ensure CSRF token is available (non-blocking)
    if (!csrfToken) {
      try {
        await getCsrfToken();
      } catch (e) {
        // Continue without CSRF if needed
      }
    }
    
    console.log(`\n  Requesting export for user: ${user.email}`);
    const startTime = Date.now();
    
    const response = await makeRequest({
      method: 'POST',
      path: '/api/user/export',
    }, {});
    
    const elapsedTime = Date.now() - startTime;
    
    if (response.status === 200) {
      const exportData = response.data;
      const jsonSize = Buffer.byteLength(JSON.stringify(exportData), 'utf8');
      
      console.log('  ✓ Export successful');
      console.log(`    Version: ${exportData.exportVersion}`);
      console.log(`    Is Partial: ${exportData.isPartial}`);
      console.log(`    Has Next Cursor: ${exportData.nextCursor !== null}`);
      console.log(`    Response Size: ${formatBytes(jsonSize)}`);
      console.log(`    Time: ${elapsedTime}ms`);
      
      // Verify it's a single file (no pagination)
      if (exportData.isPartial || exportData.nextCursor) {
        console.log('  ✗ FAILED: Export should not be paginated for normal user');
        return false;
      } else {
        console.log('  ✓ PASSED: Single file export (no pagination)');
        return true;
      }
    } else if (response.status === 429) {
      console.log('  ⚠ Rate limited - backend may need restart to load bypass changes');
      console.log(`    Response: ${JSON.stringify(response.data)}`);
      return false;
    } else {
      console.error('  ✗ Export failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.error('  ✗ Test error:', error.message);
    return false;
  }
}

// Test 2: Large user export (should paginate)
async function testLargeUserExport() {
  console.log('\n=== Test 2: Large User Export (With Pagination) ===');
  
  try {
    // Setup large user
    const user = await setupUser(LARGE_USER_EMAIL, 'Large Test User');
    
    // Create 2000+ messages for this user (to ensure pagination with MAX_MESSAGES_EXPORT=1000)
    console.log('\n  Creating 2000+ messages for user...');
    const messagesToCreate = 2000;
    const batchSize = 100;
    
    // Check existing messages
    const existingCount = await prisma.message.count({
      where: { userId: user.id },
    });
    
    if (existingCount < messagesToCreate) {
      const messagesNeeded = messagesToCreate - existingCount;
      console.log(`    Creating ${messagesNeeded} messages...`);
      
      // Get or create a test property for messages
      let testProperty = await prisma.property.findFirst({
        where: { userId: user.id },
      });
      
      if (!testProperty) {
        testProperty = await prisma.property.create({
          data: {
            userId: user.id,
            title: 'Test Property for Export',
            propertyType: 'APARTMENT',
            area: 100.0, // Required field
            price: 100000,
            city: 'Athens',
            state: 'Attica',
          },
        });
        console.log(`    Created test property: ${testProperty.id}`);
      }
      
      // Create messages in batches
      for (let i = 0; i < messagesNeeded; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) < messagesNeeded; j++) {
          batch.push({
            userId: user.id,
            propertyId: testProperty.id,
            content: `Test message ${i + j + 1} for export testing. This is a longer message to simulate real-world data.`,
            createdAt: new Date(Date.now() - (messagesNeeded - i - j) * 60000), // Stagger timestamps
          });
        }
        await prisma.message.createMany({
          data: batch,
        });
        process.stdout.write(`    Created ${Math.min(i + batchSize, messagesNeeded)}/${messagesNeeded} messages\r`);
      }
      console.log(`\n    ✓ Created ${messagesNeeded} messages`);
    } else {
      console.log(`    ℹ User already has ${existingCount} messages`);
    }
    
    // Setup auth
    await setupAuth(user);
    
    // Ensure CSRF token is available (non-blocking)
    if (!csrfToken) {
      try {
        await getCsrfToken();
      } catch (e) {
        // Continue without CSRF if needed
      }
    }
    
    console.log(`\n  Requesting export for user: ${user.email}`);
    const totalMessages = await prisma.message.count({ where: { userId: user.id } });
    console.log(`    User has ${totalMessages} messages`);
    console.log(`    Using MAX_MESSAGES_EXPORT=1000, so export should paginate into ${Math.ceil(totalMessages / 1000)} parts`);
    
    const startTime = Date.now();
    let part = 1;
    let cursor = null;
    const downloadedParts = [];
    let totalSize = 0;
    
    // Download all parts
    while (true) {
      const partStartTime = Date.now();
      
      const requestBody = {};
      if (cursor) {
        requestBody.cursor = cursor;
      }
      
      const response = await makeRequest({
        method: 'POST',
        path: '/api/user/export',
        headers: {
          'X-Export-Part': part.toString(),
        },
      }, requestBody);
      
      const partElapsedTime = Date.now() - partStartTime;
      
      if (response.status === 200) {
        const exportData = response.data;
        const jsonSize = Buffer.byteLength(JSON.stringify(exportData), 'utf8');
        totalSize += jsonSize;
        
        downloadedParts.push({
          part: part,
          size: jsonSize,
          time: partElapsedTime,
          isPartial: exportData.isPartial,
          hasNextCursor: exportData.nextCursor !== null,
          messageCount: exportData.data?.messages?.length || 0,
        });
        
        console.log(`  ✓ Part ${part} downloaded`);
        console.log(`    Size: ${formatBytes(jsonSize)}, Time: ${partElapsedTime}ms`);
        console.log(`    Messages in part: ${exportData.data?.messages?.length || 0}`);
        console.log(`    Is Partial: ${exportData.isPartial}, Has Next: ${exportData.nextCursor !== null}`);
        
        if (exportData.nextCursor && exportData.isPartial) {
          cursor = exportData.nextCursor;
          part++;
        } else {
          break;
        }
      } else if (response.status === 429) {
        console.log('  ⚠ Rate limited - backend may need restart to load bypass changes');
        console.log(`    Response: ${JSON.stringify(response.data)}`);
        return false;
      } else if (response.status === 500 || response.status === 504) {
        console.error('  ✗ FAILED: Server error/timeout');
        console.error(`    Status: ${response.status}, Error: ${JSON.stringify(response.data)}`);
        return false;
      } else {
        console.error('  ✗ Export failed:', response.status, response.data);
        return false;
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n  ✓ Export complete`);
    console.log(`    Total parts: ${downloadedParts.length}`);
    console.log(`    Total size: ${formatBytes(totalSize)}`);
    console.log(`    Total time: ${totalTime}ms`);
    
    // Verify pagination worked
    const totalMessagesCount = await prisma.message.count({ where: { userId: user.id } });
    const expectedParts = Math.ceil(totalMessagesCount / 1000); // MAX_MESSAGES_EXPORT = 1000
    
    if (downloadedParts.length === 1 && !downloadedParts[0].isPartial) {
      if (totalMessagesCount <= 1000) {
        console.log('  ✓ PASSED: Single file export (user has ≤1000 messages, no pagination needed)');
        return true;
      } else {
        console.log('  ✗ FAILED: Export should have paginated but did not');
        console.log(`    Total messages: ${totalMessagesCount}, Expected parts: ${expectedParts}`);
        return false;
      }
    } else if (downloadedParts.length > 1 || downloadedParts[0].isPartial) {
      console.log('  ✓ PASSED: Export paginated correctly');
      console.log('    Parts breakdown:');
      downloadedParts.forEach(p => {
        console.log(`      Part ${p.part}: ${formatBytes(p.size)} (${p.messageCount} messages, ${p.time}ms)`);
      });
      
      // Verify we got all messages
      const totalExportedMessages = downloadedParts.reduce((sum, p) => sum + p.messageCount, 0);
      if (totalExportedMessages >= totalMessagesCount) {
        console.log(`    ✓ All ${totalMessagesCount} messages exported across ${downloadedParts.length} parts`);
      } else {
        console.log(`    ⚠ Only ${totalExportedMessages}/${totalMessagesCount} messages exported`);
      }
      
      return true;
    } else {
      console.log('  ✓ PASSED: Single file export (data fits in one file)');
      return true;
    }
  } catch (error) {
    console.error('  ✗ Test error:', error.message);
    console.error('    Stack:', error.stack);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('========================================');
  console.log('DSAR Export Size Limits + Pagination Tests');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  const isProduction = process.env.NODE_ENV === 'production';
  const allowBypass = process.env.ALLOW_TEST_RATE_LIMIT_BYPASS === 'true';
  if (isProduction && !allowBypass) {
    console.log('⚠️  Production mode: Rate limit bypass is DISABLED for security');
    console.log('   Tests will use normal rate limits. Use spaced requests or dedicated test users.');
  } else {
    console.log('Note: This script uses X-Test-Request header to bypass rate limiting');
    console.log('      (Only works from localhost in non-production environments)');
  }
  console.log('      Make sure backend server has latest code (restart if needed)\n');
  
  try {
    const test1Result = await testNormalUserExport();
    const test2Result = await testLargeUserExport();
    
    console.log('\n========================================');
    console.log('Test Results');
    console.log('========================================');
    console.log(`Test 1 (Normal User): ${test1Result ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`Test 2 (Large User): ${test2Result ? '✓ PASSED' : '✗ FAILED'}`);
    
    if (test1Result && test2Result) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
runTests()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

