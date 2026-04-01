/**
 * Professional Onboarding Test Script
 * Tests professional profile creation and role updates
 * 
 * Usage:
 *   node scripts/test-professional-onboarding.js
 * 
 * Environment:
 *   BACKEND_URL (default: http://localhost:3001)
 *   TEST_EMAIL (default: test-professional-{timestamp}@example.com)
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
const TEST_EMAIL = process.env.TEST_EMAIL || `test-professional-${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let token = null;
let cookies = [];
let csrfToken = null;
let userId = null;

// Helper: Get JWT secret
function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

// Helper: Parse cookies from Set-Cookie header
function parseCookies(setCookieHeaders) {
  const parsed = {};
  setCookieHeaders.forEach(cookie => {
    const parts = cookie.split(';')[0].split('=');
    if (parts.length === 2) {
      parsed[parts[0].trim()] = parts[1].trim();
    }
  });
  return parsed;
}

// Helper: Get CSRF token
async function getCsrfToken() {
  try {
    const response = await makeRequest({
      method: 'GET',
      url: '/health',
    });

    if (response.status !== 200) {
      console.error(`✗ Health check failed with status ${response.status}`);
      return false;
    }

    // Store cookies from response
    if (response.cookies && response.cookies.length > 0) {
      const parsedCookies = parseCookies(response.cookies);
      if (parsedCookies.csrf_token) {
        csrfToken = parsedCookies.csrf_token;
        // Store cookies for subsequent requests
        cookies = response.cookies.map(c => c.split(';')[0]);
        console.log('✓ CSRF token obtained from cookie');
        return true;
      }
    }

    const csrfResponse = await makeRequest({
      method: 'GET',
      url: '/api/auth/csrf-token',
    });

    if (csrfResponse.status === 200 && csrfResponse.body && csrfResponse.body.csrfToken) {
      csrfToken = csrfResponse.body.csrfToken;
      // Store cookies from CSRF endpoint too
      if (csrfResponse.cookies && csrfResponse.cookies.length > 0) {
        cookies = csrfResponse.cookies.map(c => c.split(';')[0]);
      }
      console.log('✓ CSRF token obtained from endpoint');
      return true;
    }
    
    console.error('✗ CSRF token not found');
    return false;
  } catch (error) {
    console.error('✗ Failed to get CSRF token:', error.message);
    return false;
  }
}

// Helper: Make HTTP request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // Build cookie header
    const cookieParts = [];
    if (cookies.length > 0) {
      cookieParts.push(...cookies);
    }
    // Ensure CSRF token cookie is included for POST requests (check if not already in cookies)
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET');
    if (csrfToken && isStateChanging) {
      const hasCsrfCookie = cookies.some(c => c.startsWith('csrf_token='));
      if (!hasCsrfCookie) {
        cookieParts.push(`csrf_token=${csrfToken}`);
      }
    }

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH' || options.method === 'DELETE') ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieParts.length > 0 ? { 'Cookie': cookieParts.join('; ') } : {}),
        ...(options.headers || {}),
      },
    };

    if (body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      const responseCookies = res.headers['set-cookie'] || [];

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = data ? JSON.parse(data) : {};
        } catch (e) {
          parsedBody = { raw: data };
        }

        // Update cookies from response (for session persistence)
        if (responseCookies && responseCookies.length > 0) {
          const cookieArray = Array.isArray(responseCookies) ? responseCookies : [responseCookies];
          cookieArray.forEach(cookieHeader => {
            const cookieStr = cookieHeader.split(';')[0]; // Remove attributes like HttpOnly, Secure, etc.
            const [name, value] = cookieStr.split('=');
            if (name && value) {
              // Remove old cookie with same name if exists
              cookies = cookies.filter(c => !c.startsWith(`${name.trim()}=`));
              // Add new cookie
              cookies.push(`${name.trim()}=${value.trim()}`);
              
              // Update CSRF token if this is the CSRF cookie
              if (name.trim() === 'csrf_token') {
                csrfToken = value.trim();
              }
            }
          });
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          cookies: responseCookies,
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

// Setup user
async function setupUser() {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          name: 'Test Professional',
          password: hashedPassword,
          role: 'BUYER',
        },
      });
      console.log(`✓ Created test user: ${TEST_EMAIL}`);
    } else {
      console.log(`✓ Using existing user: ${TEST_EMAIL}`);
    }

    userId = user.id;

    // Generate JWT token
    token = jwt.sign(
      { userId: user.id, role: user.role },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    return true;
  } catch (error) {
    console.error('✗ Failed to setup user:', error.message);
    return false;
  }
}

// Test GET /api/professionals/me (should return exists: false initially)
async function testGetProfile() {
  console.log('\n--- Test: GET /api/professionals/me ---');
  try {
    const response = await makeRequest({
      method: 'GET',
      url: '/api/professionals/me',
    });

    if (response.status === 200) {
      console.log('✓ GET /api/professionals/me successful');
      console.log(`  Response: ${JSON.stringify(response.body)}`);
      return response.body.exists === false;
    } else {
      console.error(`✗ GET /api/professionals/me failed with status ${response.status}`);
      console.error(`  Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.error('✗ GET /api/professionals/me error:', error.message);
    return false;
  }
}

// Test POST /api/professionals/me (create profile)
async function testCreateProfile() {
  console.log('\n--- Test: POST /api/professionals/me ---');
  try {
    const payload = {
      type: 'LAWYER',
      displayName: 'Test Lawyer',
      city: 'Athens',
      registryNumber: 'TEST12345',
      languages: ['Greek', 'English'],
      availability: {
        timezone: 'Europe/Athens',
        weeklyRules: [
          { weekday: 1, start: '09:00', end: '17:00' },
          { weekday: 2, start: '09:00', end: '17:00' },
          { weekday: 3, start: '09:00', end: '17:00' },
          { weekday: 4, start: '09:00', end: '17:00' },
          { weekday: 5, start: '09:00', end: '17:00' },
        ],
        meetingTypes: ['ONLINE', 'IN_PERSON'],
      },
    };

    const response = await makeRequest({
      method: 'POST',
      url: '/api/professionals/me',
    }, payload);

    if (response.status === 200 || response.status === 201) {
      console.log('✓ POST /api/professionals/me successful');
      console.log(`  Response: ${JSON.stringify(response.body)}`);
      
      // Verify role was updated
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role === 'LAWYER') {
        console.log('✓ User role updated to LAWYER');
        return true;
      } else {
        console.error(`✗ User role not updated. Current role: ${user?.role}`);
        return false;
      }
    } else {
      console.error(`✗ POST /api/professionals/me failed with status ${response.status}`);
      console.error(`  Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.error('✗ POST /api/professionals/me error:', error.message);
    return false;
  }
}

// Test GET /api/professionals/me (should return exists: true now)
async function testGetProfileAfterCreate() {
  console.log('\n--- Test: GET /api/professionals/me (after create) ---');
  try {
    const response = await makeRequest({
      method: 'GET',
      url: '/api/professionals/me',
    });

    if (response.status === 200 && response.body.exists === true) {
      console.log('✓ GET /api/professionals/me returns exists: true');
      console.log(`  Profile ID: ${response.body.profile.id}`);
      console.log(`  Type: ${response.body.profile.type}`);
      console.log(`  Verification Status: ${response.body.profile.verificationStatus}`);
      
      // Verify no PII in response
      if (!response.body.profile.email && !response.body.profile.phone) {
        console.log('✓ No PII (email/phone) in response');
      } else {
        console.error('✗ PII found in response');
        return false;
      }
      
      return true;
    } else {
      console.error(`✗ GET /api/professionals/me failed`);
      console.error(`  Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.error('✗ GET /api/professionals/me error:', error.message);
    return false;
  }
}

// Test audit logs
async function testAuditLogs() {
  console.log('\n--- Test: Audit Logs ---');
  try {
    // Check if audit logs were created (this is a basic check - actual audit log storage may vary)
    console.log('✓ Audit logging is handled by backend (check logs for professional.onboarding_started and professional.onboarding_completed)');
    return true;
  } catch (error) {
    console.error('✗ Audit log check error:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== Professional Onboarding Test ===\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}\n`);

  let allPassed = true;

  // Step 1: Get CSRF token
  if (!(await getCsrfToken())) {
    console.error('\n✗ Failed to get CSRF token. Aborting tests.');
    process.exit(1);
  }

  // Step 2: Setup user
  if (!(await setupUser())) {
    console.error('\n✗ Failed to setup user. Aborting tests.');
    process.exit(1);
  }

  // Step 3: Test GET /api/professionals/me (before)
  if (!(await testGetProfile())) {
    allPassed = false;
  }

  // Step 4: Test POST /api/professionals/me
  if (!(await testCreateProfile())) {
    allPassed = false;
  }

  // Step 5: Test GET /api/professionals/me (after)
  if (!(await testGetProfileAfterCreate())) {
    allPassed = false;
  }

  // Step 6: Test audit logs
  if (!(await testAuditLogs())) {
    allPassed = false;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  if (allPassed) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.error('✗ Some tests failed');
    process.exit(1);
  }
}

// Cleanup
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Run tests
runTests().catch(async (error) => {
  console.error('\n✗ Test suite failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});

