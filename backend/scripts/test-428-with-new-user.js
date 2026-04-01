/**
 * Test CHECK A: Login without consent → 428
 * Uses a completely new email to avoid rate limits
 */

const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { URL } = require('url');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test-428-check@example.com';
const TEST_PASSWORD = 'testpassword123';

const cookies = new Map();

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
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function setupUser() {
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
        name: 'Test 428 Check User',
        role: 'BUYER',
      },
    });
    console.log('✅ User created');
  } else {
    console.log('ℹ️  User already exists');
  }
  
  // Ensure no consents exist for this user
  const deletedCount = await prisma.userConsent.deleteMany({
    where: { userId: user.id },
  });
  console.log(`✅ Deleted ${deletedCount.count} existing consents (user has no consents now)`);
  
  return user;
}

async function main() {
  try {
    console.log('🔍 CHECK A: Login without consent → 428 Test\n');
    console.log(`📧 Using NEW email: ${TEST_EMAIL}\n`);
    console.log('   (This should avoid rate limits as it\'s a different user)\n');
    
    // Setup: Create user and ensure no consents
    const user = await setupUser();
    console.log(`   User ID: ${user.id}\n`);
    
    // Step 1: Get CSRF token
    console.log('📋 Step 1: Get CSRF token');
    await request('GET', '/health');
    const csrfToken = cookies.get('csrf_token');
    console.log(`✅ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
    
    // Step 2: Attempt login (should return 428)
    console.log('📋 Step 2: Attempt login (should return 428 - CONSENT_REQUIRED)');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}\n`);
    
    const loginResponse = await request('POST', '/api/auth/login', {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      csrfToken,
    });
    
    console.log(`📊 Response Status: ${loginResponse.status}`);
    console.log(`📊 Response Body:`);
    console.log(JSON.stringify(loginResponse.data, null, 2));
    console.log();
    
    if (loginResponse.status === 428) {
      console.log('✅✅✅ CHECK A PASSED: Login returned 428 - CONSENT_REQUIRED ✅✅✅');
      console.log();
      console.log('📋 Verifying response structure:');
      
      const data = loginResponse.data;
      const checks = [
        { name: 'error field', value: data?.error === 'CONSENT_REQUIRED', expected: 'CONSENT_REQUIRED' },
        { name: 'required array', value: Array.isArray(data?.required), expected: 'array' },
        { name: 'required contains "terms"', value: data?.required?.includes('terms'), expected: true },
        { name: 'required contains "privacy"', value: data?.required?.includes('privacy'), expected: true },
        { name: 'versions object', value: typeof data?.versions === 'object', expected: 'object' },
        { name: 'versions.terms', value: data?.versions?.terms === '2026-01-01', expected: '2026-01-01' },
        { name: 'versions.privacy', value: data?.versions?.privacy === '2026-01-01', expected: '2026-01-01' },
        { name: 'message field', value: typeof data?.message === 'string', expected: 'string' },
      ];
      
      checks.forEach(check => {
        const status = check.value ? '✅' : '❌';
        console.log(`   ${status} ${check.name}: ${check.value} (expected: ${check.expected})`);
      });
      
      const allPassed = checks.every(c => c.value);
      if (allPassed) {
        console.log();
        console.log('🎉 All response fields are correct!');
      }
      
    } else if (loginResponse.status === 429) {
      console.log('❌ CHECK A FAILED: Rate limit still applies');
      console.log('   This might mean rate limit is based on IP, not email');
      console.log('   Retry after:', loginResponse.data?.retryAfterSeconds, 'seconds');
    } else if (loginResponse.status === 401) {
      console.log('❌ CHECK A FAILED: Login returned 401 (wrong credentials)');
      console.log('   This should not happen - user exists and password is correct');
    } else if (loginResponse.status === 200) {
      console.log('❌ CHECK A FAILED: Login succeeded (should have returned 428)');
      console.log('   This means user has consents or consent check is not working');
    } else {
      console.log(`❌ CHECK A FAILED: Unexpected status ${loginResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();




