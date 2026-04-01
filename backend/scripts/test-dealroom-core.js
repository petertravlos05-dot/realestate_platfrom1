/**
 * Deal Room Core Security Test
 * Tests IDOR/BOLA prevention and basic functionality
 * 
 * Usage:
 *   node scripts/test-dealroom-core.js
 * 
 * Environment:
 *   BACKEND_URL (default: http://localhost:3001)
 *   TEST_EMAIL_A (default: test-dealroom-a@example.com)
 *   TEST_EMAIL_B (default: test-dealroom-b@example.com)
 *   TEST_PASSWORD (default: testpassword123)
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL_A = process.env.TEST_EMAIL_A || `test-dealroom-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = process.env.TEST_EMAIL_B || `test-dealroom-b-${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let tokenA = null;
let tokenB = null;
let cookiesA = [];
let cookiesB = [];
let csrfToken = null;

// Helper: Get JWT secret (matching existing test scripts)
function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

// Helper: Get CSRF token
async function getCsrfToken() {
  try {
    // First, make a request to get the CSRF cookie (from /health endpoint)
    const response = await makeRequest({
      method: 'GET',
      url: '/health',
    });

    if (response.status !== 200) {
      console.error(`✗ Health check failed with status ${response.status}`);
      if (response.body && response.body.error) {
        console.error(`  Error: ${JSON.stringify(response.body)}`);
      }
      return false;
    }

    // Extract CSRF token from cookies
    if (response.cookies && response.cookies.length > 0) {
      const csrfCookie = response.cookies.find(c => c.startsWith('csrf_token='));
      if (csrfCookie) {
        csrfToken = csrfCookie.split('=')[1].split(';')[0];
        console.log('✓ CSRF token obtained');
        return true;
      }
    }

    // Fallback: try to get from endpoint
    const csrfResponse = await makeRequest({
      method: 'GET',
      url: '/api/auth/csrf-token',
    });

    if (csrfResponse.status === 200 && csrfResponse.body && csrfResponse.body.csrfToken) {
      csrfToken = csrfResponse.body.csrfToken;
      console.log('✓ CSRF token obtained from endpoint');
      return true;
    }
    
    console.error('✗ CSRF token not found in cookies or endpoint');
    console.error(`  Health check status: ${response.status}`);
    console.error(`  Cookies received: ${response.cookies ? response.cookies.length : 0}`);
    if (response.cookies) {
      console.error(`  Cookie names: ${response.cookies.map(c => c.split('=')[0]).join(', ')}`);
    }
    return false;
  } catch (error) {
    const errorMsg = error.message || error.toString() || 'Unknown error';
    console.error('✗ Failed to get CSRF token:', errorMsg);
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`  → Backend server is not running at ${BACKEND_URL}`);
      console.error('  → Start it with: cd backend && npm run dev');
    } else if (error.stack) {
      console.error('  Stack:', error.stack);
    }
    return false;
  }
}

// Helper: Make HTTP request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // Build cookie string
    const cookieParts = [];
    if (csrfToken) {
      cookieParts.push(`csrf_token=${csrfToken}`);
    }
    if (options.cookies && options.cookies.length > 0) {
      cookieParts.push(...options.cookies);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.token && { 'Authorization': `Bearer ${options.token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...(cookieParts.length > 0 && { 'Cookie': cookieParts.join('; ') }),
    };

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const setCookieHeaders = res.headers['set-cookie'] || [];
        const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        const cookies = cookieArray.map(cookie => cookie.split(';')[0]);
        
        // Extract CSRF token from cookie if present
        const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
        if (csrfCookie && !csrfToken) {
          csrfToken = csrfCookie.split('=')[1].split(';')[0];
        }
        
        let parsedBody = null;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch (e) {
          parsedBody = data || null;
        }
        
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies,
          body: parsedBody,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Helper: Create user and get token
async function createUserAndGetToken(email, name) {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create user
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'BUYER',
      },
    });
  }

  // Generate JWT token
  const jwtSecret = getJwtSecret();
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: '24h' }
  );

  return { user, token };
}

async function testDealRoomIDOR() {
  console.log('\n=== Testing Deal Room IDOR Prevention ===\n');

  let userA = null;
  let userB = null;
  let propertyId = null;

  try {
    // Step 0: Get CSRF token
    console.log('Step 0: Getting CSRF token...');
    const csrfSuccess = await getCsrfToken();
    if (!csrfSuccess) {
      throw new Error('Failed to obtain CSRF token');
    }

    // Step 1: Create User A (buyer)
    console.log('Step 1: Creating User A (buyer)...');
    const userAData = await createUserAndGetToken(TEST_EMAIL_A, 'Test Buyer A');
    userA = userAData.user;
    tokenA = userAData.token;
    console.log(`✓ User A created: ${userA.email} (${userA.id})`);

    // Step 2: Create User B (non-participant)
    console.log('Step 2: Creating User B (non-participant)...');
    const userBData = await createUserAndGetToken(TEST_EMAIL_B, 'Test Buyer B');
    userB = userBData.user;
    tokenB = userBData.token;
    console.log(`✓ User B created: ${userB.email} (${userB.id})`);

    // Step 2.5: Create a test property (owned by a seller)
    console.log('Step 2.5: Creating test property...');
    const seller = await prisma.user.findFirst({
      where: { role: 'SELLER' },
    });

    let sellerId;
    if (!seller) {
      // Create a seller user
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const newSeller = await prisma.user.create({
        data: {
          email: `test-seller-${Date.now()}@example.com`,
          name: 'Test Seller',
          password: hashedPassword,
          role: 'SELLER',
        },
      });
      sellerId = newSeller.id;
    } else {
      sellerId = seller.id;
    }

    propertyId = (await prisma.property.create({
      data: {
        userId: sellerId,
        title: 'Test Property for Deal Room',
        street: 'Test St',
        number: '123',
        city: 'Athens',
        state: 'Attica',
        price: 100000,
        area: 100,
        propertyType: 'HOUSE',
        status: 'ACTIVE',
        fullDescription: 'Test property for deal room testing',
      },
    })).id;
    console.log(`✓ Test property created: ${propertyId}`);

    // Step 3: User A creates deal room
    console.log('Step 3: User A creates deal room...');
    const createResponse = await makeRequest({
      method: 'POST',
      url: '/api/deals',
      token: tokenA,
    }, {
      propertyId,
    });

    if (createResponse.status !== 200) {
      throw new Error(`Failed to create deal room: ${createResponse.status} - ${JSON.stringify(createResponse.body)}`);
    }

    const dealRoom = createResponse.body;
    const dealRoomId = dealRoom.dealRoomId;

    if (!dealRoomId) {
      throw new Error('Deal room ID not returned');
    }

    console.log(`✓ Deal room created: ${dealRoomId}`);

    // Step 4: User B tries to access User A's deal room
    console.log('Step 4: User B attempts to access User A\'s deal room...');
    const accessResponse = await makeRequest({
      method: 'GET',
      url: `/api/deals/${dealRoomId}`,
      token: tokenB,
    });

    if (accessResponse.status === 403 || accessResponse.status === 404) {
      console.log(`✓ PASS: User B correctly denied access (${accessResponse.status})`);
    } else {
      console.error(`✗ FAIL: User B was able to access deal room (status: ${accessResponse.status})`);
      console.error(`Response: ${JSON.stringify(accessResponse.body)}`);
      return false;
    }

    // Step 5: User A can access their own deal room
    console.log('Step 5: User A accesses their own deal room...');
    const ownAccessResponse = await makeRequest({
      method: 'GET',
      url: `/api/deals/${dealRoomId}`,
      token: tokenA,
    });

    if (ownAccessResponse.status === 200) {
      console.log('✓ PASS: User A can access their own deal room');
    } else {
      console.error(`✗ FAIL: User A cannot access their own deal room (status: ${ownAccessResponse.status})`);
      console.error(`Response: ${JSON.stringify(ownAccessResponse.body)}`);
      return false;
    }

    // Step 6: Test thread access control
    console.log('Step 6: Testing thread access control...');
    const threadsResponse = await makeRequest({
      method: 'GET',
      url: `/api/deals/${dealRoomId}/threads`,
      token: tokenA,
    });

    if (threadsResponse.status === 200) {
      const threads = threadsResponse.body;
      if (threads.threads && threads.threads.length > 0) {
        const threadId = threads.threads[0].id;

        // User B tries to access thread messages
        const messagesResponse = await makeRequest({
          method: 'GET',
          url: `/api/threads/${threadId}/messages`,
          token: tokenB,
        });

        if (messagesResponse.status === 403) {
          console.log('✓ PASS: User B correctly denied access to thread messages (403)');
        } else {
          console.error(`✗ FAIL: User B was able to access thread messages (status: ${messagesResponse.status})`);
          console.error(`Response: ${JSON.stringify(messagesResponse.body)}`);
          return false;
        }
      } else {
        console.log('⚠ WARNING: No threads found in deal room (skipping thread test)');
      }
    } else {
      console.error(`✗ FAIL: Could not fetch threads (status: ${threadsResponse.status})`);
      return false;
    }

    console.log('\n=== All Tests PASSED ===\n');
    return true;
  } catch (error) {
    console.error('\n=== Test FAILED ===');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.error('\n');
    return false;
  } finally {
    // Cleanup (optional)
    if (process.env.CLEANUP === 'true') {
      console.log('Cleaning up test data...');
      if (propertyId) {
        await prisma.property.delete({ where: { id: propertyId } }).catch(() => {});
      }
      if (userA) {
        await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
      }
      if (userB) {
        await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
  }
}

// Run test
if (require.main === module) {
  testDealRoomIDOR()
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution error:', error);
      process.exit(1);
    });
}

module.exports = { testDealRoomIDOR };

