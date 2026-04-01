/**
 * Test script for GDPR DSAR Export v2 with pagination and size limits
 * 
 * Tests:
 * 1. Initial export (no cursor)
 * 2. Paginated export (with cursor)
 * 3. Size limit enforcement (413 response)
 * 4. Rate limiting (initial vs paginated)
 * 
 * Usage:
 *   node scripts/test-export-pagination.js
 * 
 * Environment:
 *   BACKEND_URL (default: http://localhost:3001)
 *   TEST_EMAIL (default: test-export-pagination@example.com)
 *   TEST_PASSWORD (default: testpassword123)
 * 
 * Note: Uses direct DB setup and JWT generation to bypass rate limits.
 * If you hit rate limits, wait or use a different TEST_EMAIL.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test-export-pagination@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken = null;
let csrfToken = null;
let cookies = [];

// Helper: Make HTTP request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
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
    // First, make a request to get the CSRF cookie (from /health endpoint)
    await makeRequest({
      method: 'GET',
      path: '/health',
    });

    // Extract CSRF token from cookie
    const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
    if (csrfCookie) {
      csrfToken = csrfCookie.split('=')[1].split(';')[0];
      console.log('✓ CSRF token obtained from cookie');
      return true;
    }

    // Fallback: try to get from endpoint
    const response = await makeRequest({
      method: 'GET',
      path: '/api/auth/csrf-token',
    });

    if (response.status === 200 && response.data && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
      console.log('✓ CSRF token obtained from endpoint');
      return true;
    }
    
    console.error('✗ CSRF token not found in cookie or endpoint response');
    return false;
  } catch (error) {
    console.error('✗ Failed to get CSRF token:', error.message);
    return false;
  }
}

// Helper: Setup user directly in database (bypasses rate limiting)
async function setupUser() {
  try {
    console.log('📋 Setting up test user in database...');
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    if (!user) {
      // Create user
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          password: hashedPassword,
          name: 'Test Export User',
          role: 'BUYER',
        },
      });
      console.log('✓ User created');
    } else {
      console.log('ℹ User already exists');
    }
    
    // Ensure consents exist
    const currentVersions = {
      TERMS: process.env.TERMS_VERSION || '2026-01-01',
      PRIVACY: process.env.PRIVACY_VERSION || '2026-01-01',
    };
    
    // Check if consents exist
    const existingConsents = await prisma.userConsent.findMany({
      where: {
        userId: user.id,
        consentType: { in: ['TERMS', 'PRIVACY'] },
        version: { in: [currentVersions.TERMS, currentVersions.PRIVACY] },
      },
    });
    
    if (existingConsents.length < 2) {
      // Create missing consents
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
          console.log(`✓ Consent ${type} created`);
        }
      }
    } else {
      console.log('✓ Consents already exist');
    }
    
    return true;
  } catch (error) {
    console.error('✗ Setup error:', error.message);
    return false;
  }
}

// Helper: Get JWT secret
async function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

// Helper: Generate JWT token (bypasses rate limiting)
async function generateJwtToken(user) {
  const jwtSecret = await getJwtSecret();
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

// Helper: Setup auth (get user and generate token)
async function setupAuth() {
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!user) {
      console.error('✗ User not found');
      return false;
    }

    // Generate JWT token manually
    authToken = await generateJwtToken(user);

    // Get CSRF token
    const csrfOk = await getCsrfToken();
    if (!csrfOk) {
      console.error('✗ Failed to get CSRF token');
      return false;
    }

    return true;
  } catch (error) {
    console.error('✗ Auth setup error:', error.message);
    return false;
  }
}

// Helper: Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Test 1: Initial export (no cursor)
async function testInitialExport() {
  console.log('\n=== Test 1: Initial Export (No Cursor) ===');
  
  try {
    // Ensure CSRF token is available before export
    if (!csrfToken) {
      const csrfOk = await getCsrfToken();
      if (!csrfOk) {
        console.error('✗ Failed to get CSRF token for export');
        return null;
      }
    }

    const response = await makeRequest({
      method: 'POST',
      path: '/api/user/export',
    }, {});

    if (response.status === 200) {
      const exportData = response.data;
      const jsonSize = Buffer.byteLength(JSON.stringify(exportData), 'utf8');
      
      console.log('✓ Export successful');
      console.log(`  Version: ${exportData.exportVersion}`);
      console.log(`  User ID: ${exportData.userId}`);
      console.log(`  Is Partial: ${exportData.isPartial}`);
      console.log(`  Part: ${exportData.part || 'N/A'}`);
      console.log(`  Response Size: ${formatBytes(jsonSize)}`);
      console.log(`  Has Next Cursor: ${exportData.nextCursor !== null}`);
      
      if (exportData.nextCursor) {
        console.log('  Next Cursor:', JSON.stringify(exportData.nextCursor, null, 2));
      }

      // Check data structure
      if (exportData.data) {
        console.log('  Data Sections:');
        Object.keys(exportData.data).forEach(key => {
          const value = exportData.data[key];
          if (Array.isArray(value)) {
            console.log(`    - ${key}: ${value.length} items`);
          } else if (typeof value === 'object' && value !== null) {
            console.log(`    - ${key}: object with ${Object.keys(value).length} keys`);
          } else {
            console.log(`    - ${key}: ${typeof value}`);
          }
        });
      }

      return exportData;
    } else if (response.status === 429) {
      console.error('✗ Export rate limited:', response.data.message);
      console.log(`  Retry after: ${Math.ceil(response.data.retryAfterSeconds / 60)} minutes`);
      return null;
    } else {
      console.error('✗ Export failed:', response.status, response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ Export error:', error.message);
    return null;
  }
}

// Test 2: Paginated export (with cursor)
async function testPaginatedExport(initialExport) {
  console.log('\n=== Test 2: Paginated Export (With Cursor) ===');
  
  if (!initialExport || !initialExport.nextCursor) {
    console.log('ℹ Skipping pagination test - no cursor in initial export');
    return;
  }

  try {
    let cursor = initialExport.nextCursor;
    let part = 2;
    let totalParts = 1;

    while (cursor && Object.values(cursor).some(c => c !== null)) {
      console.log(`\n  Requesting part ${part}...`);
      
      const response = await makeRequest({
        method: 'POST',
        path: '/api/user/export',
        headers: {
          'X-Export-Part': part.toString(),
        },
      }, {
        cursor: cursor,
      });

      if (response.status === 200) {
        const exportData = response.data;
        const jsonSize = Buffer.byteLength(JSON.stringify(exportData), 'utf8');
        
        console.log(`  ✓ Part ${part} received`);
        console.log(`    Is Partial: ${exportData.isPartial}`);
        console.log(`    Response Size: ${formatBytes(jsonSize)}`);
        console.log(`    Has Next Cursor: ${exportData.nextCursor !== null}`);

        if (exportData.nextCursor) {
          cursor = exportData.nextCursor;
          part++;
          totalParts++;
        } else {
          cursor = null;
        }
      } else if (response.status === 429) {
        console.log('  ⚠ Rate limited - waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      } else {
        console.error('  ✗ Paginated export failed:', response.status, response.data);
        break;
      }
    }

    console.log(`\n✓ Pagination test complete - downloaded ${totalParts} parts`);
  } catch (error) {
    console.error('✗ Pagination error:', error.message);
  }
}

// Test 3: Size limit enforcement (413 response)
async function testSizeLimit() {
  console.log('\n=== Test 3: Size Limit Enforcement ===');
  
  try {
    // Try with very small limits to trigger 413
    const response = await makeRequest({
      method: 'POST',
      path: '/api/user/export',
    }, {
      limits: {
        messages: 1,
        auditEvents: 1,
        leads: 1,
        transactions: 1,
      },
    });

    if (response.status === 413) {
      console.log('✓ Size limit enforced (413 response)');
      console.log('  Error:', response.data.error);
      console.log('  Max Bytes:', response.data.maxBytes);
      console.log('  Current Bytes:', response.data.currentBytes);
      console.log('  Suggested Limits:', JSON.stringify(response.data.suggestedLimits, null, 2));
      return true;
    } else if (response.status === 200) {
      const jsonSize = Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      console.log('ℹ Export succeeded despite small limits');
      console.log(`  Response Size: ${formatBytes(jsonSize)}`);
      console.log('  (User may not have enough data to trigger limit)');
      return false;
    } else if (response.status === 429) {
      console.error('✗ Size limit test rate limited:', response.data.message);
      return false;
    } else {
      console.error('✗ Unexpected response:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ Size limit test error:', error.message);
    return false;
  }
}

// Test 4: Rate limiting
async function testRateLimiting() {
  console.log('\n=== Test 4: Rate Limiting ===');
  
  try {
    // Make multiple initial export requests (should hit rate limit after 2)
    console.log('  Testing initial export rate limit (2/hour)...');
    
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        makeRequest({
          method: 'POST',
          path: '/api/user/export',
        }, {})
      );
    }

    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    console.log(`  Results: ${successCount} successful, ${rateLimitedCount} rate limited`);
    
    if (rateLimitedCount > 0) {
      console.log('  ✓ Rate limiting working (some requests blocked)');
    } else {
      console.log('  ℹ Rate limit not triggered (may need to wait or check rate limit config)');
    }

    // Test paginated rate limit (should allow more requests)
    console.log('\n  Testing paginated export rate limit (20/hour)...');
    
    const initialExport = await makeRequest({
      method: 'POST',
      path: '/api/user/export',
    }, {});

    if (initialExport.status === 200 && initialExport.data.nextCursor) {
      const paginatedRequests = [];
      for (let i = 0; i < 5; i++) {
        paginatedRequests.push(
          makeRequest({
            method: 'POST',
            path: '/api/user/export',
            headers: {
              'X-Export-Part': (i + 2).toString(),
            },
          }, {
            cursor: initialExport.data.nextCursor,
          })
        );
      }

      const paginatedResponses = await Promise.all(paginatedRequests);
      const paginatedSuccessCount = paginatedResponses.filter(r => r.status === 200).length;
      const paginatedRateLimitedCount = paginatedResponses.filter(r => r.status === 429).length;

      console.log(`  Results: ${paginatedSuccessCount} successful, ${paginatedRateLimitedCount} rate limited`);
      
      if (paginatedSuccessCount > successCount) {
        console.log('  ✓ Paginated requests have higher rate limit');
      } else {
        console.log('  ℹ Rate limit behavior as expected');
      }
    } else {
      console.log('  ℹ Skipping paginated rate limit test - no cursor available');
    }
  } catch (error) {
    console.error('✗ Rate limiting test error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('========================================');
  console.log('GDPR DSAR Export v2 Pagination Tests');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('');

  // Setup
  console.log('=== Setup ===');
  const setupOk = await setupUser();
  if (!setupOk) {
    console.error('✗ Setup failed');
    process.exit(1);
  }

  const authOk = await setupAuth();
  if (!authOk) {
    console.error('✗ Auth setup failed');
    process.exit(1);
  }

  // Run tests
  const initialExport = await testInitialExport();
  await testPaginatedExport(initialExport);
  await testSizeLimit();
  await testRateLimiting();

  console.log('\n========================================');
  console.log('Tests Complete');
  console.log('========================================');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

