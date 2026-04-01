/**
 * Direct test script using Prisma to manage users/consents
 * Bypasses rate limits by working directly with the database
 */

const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { URL } = require('url');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'direct-test@example.com';
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
        name: 'Direct Test User',
        role: 'BUYER',
      },
    });
    console.log('✅ User created');
  } else {
    console.log('ℹ️  User already exists');
  }
  
  // Delete all consents for this user
  await prisma.userConsent.deleteMany({
    where: { userId: user.id },
  });
  console.log('✅ All consents deleted (user has no consents now)');
  
  return user;
}

async function main() {
  try {
    console.log('🔍 Direct Consent Flow Test\n');
    console.log(`📧 Using email: ${TEST_EMAIL}\n`);
    
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
    const loginResponse = await request('POST', '/api/auth/login', {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      csrfToken,
    });
    
    if (loginResponse.status === 428) {
      console.log('✅ CHECK A PASSED: Login returned 428 - CONSENT_REQUIRED');
      console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
      console.log();
    } else {
      console.log(`❌ CHECK A FAILED: Expected 428, got ${loginResponse.status}`);
      console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
      console.log();
    }
    
    // Step 3: Accept consents
    console.log('📋 Step 3: Accept consents via accept-with-auth');
    const acceptResponse = await request('POST', '/api/user/consents/accept-with-auth', {
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        consents: [
          { type: 'TERMS', version: '2026-01-01' },
          { type: 'PRIVACY', version: '2026-01-01' },
        ],
      },
      csrfToken,
    });
    
    if (acceptResponse.status === 200) {
      console.log('✅ CHECK B PASSED: Consents accepted successfully');
      console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
      console.log();
    } else {
      console.log(`❌ CHECK B FAILED: Expected 200, got ${acceptResponse.status}`);
      console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
      console.log();
    }
    
    // Step 4: Login again (should succeed now)
    console.log('📋 Step 4: Login again (should succeed now)');
    const loginAfterConsent = await request('POST', '/api/auth/login', {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      csrfToken,
    });
    
    if (loginAfterConsent.status === 200) {
      const authToken = cookies.get('access_token') || loginAfterConsent.data?.token;
      console.log('✅ Login successful after consent acceptance');
      console.log(`   Auth Token: ${authToken ? authToken.substring(0, 20) + '...' : 'not found'}`);
      console.log();
      
      // Step 5: Get consent history
      console.log('📋 Step 5: Get consent history');
      const historyResponse = await request('GET', '/api/user/consents', {
        authToken,
      });
      
      if (historyResponse.status === 200) {
        console.log('✅ CHECK C PASSED: Consent history retrieved successfully');
        console.log('\n📊 Consent History:');
        console.log(JSON.stringify(historyResponse.data, null, 2));
      } else {
        console.log(`❌ CHECK C FAILED: Expected 200, got ${historyResponse.status}`);
        console.log('   Response:', JSON.stringify(historyResponse.data, null, 2));
      }
    } else {
      console.log(`❌ Login failed after consent: ${loginAfterConsent.status}`);
      console.log('   Response:', JSON.stringify(loginAfterConsent.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();




