/**
 * Test GDPR Account Deletion (Phase 1)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { URL } = require('url');

const prisma = new PrismaClient();
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_EMAIL || 'test-deletion@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

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

async function setupUser() {
  console.log('📋 Setting up test user in database...');
  
  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
  });
  
  if (!user) {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        password: hashedPassword,
        name: 'Test Deletion User',
        role: 'BUYER',
      },
    });
    console.log('✅ User created');
  } else {
    console.log('ℹ️  User already exists');
    // Reset deletion status for testing
    if (user.isDeleted) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          anonymizedAt: null,
          email: EMAIL, // Restore original email
          name: 'Test Deletion User',
        },
      });
      console.log('✅ User deletion status reset');
    }
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
        console.log(`✅ Consent ${type} created`);
      }
    }
  }
  
  return user;
}

async function generateJwtToken(user) {
  const jwtSecret = await getJwtSecret();
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

async function main() {
  try {
    console.log('🔍 Testing GDPR Account Deletion (Phase 1)\n');
    console.log(`📧 Using email: ${EMAIL}\n`);
    
    // Step 1: Setup user
    const user = await setupUser();
    console.log(`   User ID: ${user.id}`);
    console.log(`   Original email: ${user.email}\n`);
    
    // Step 2: Generate JWT token
    console.log('📋 Step 2: Generate JWT token');
    const authToken = await generateJwtToken(user);
    console.log(`✅ JWT Token generated: ${authToken.substring(0, 20)}...\n`);
    
    // Step 3: Get CSRF token
    console.log('📋 Step 3: Get CSRF token');
    await request('GET', '/health');
    const csrfToken = cookies.get('csrf_token');
    console.log(`✅ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
    
    // Step 4: Test export before deletion (should work)
    console.log('📋 Step 4: Test export before deletion');
    const exportBefore = await request('POST', '/api/user/export', {
      csrfToken,
      authToken,
    });
    
    if (exportBefore.status === 200) {
      console.log('✅ Export works before deletion');
    } else {
      console.log(`⚠️  Export status: ${exportBefore.status}`);
    }
    console.log();
    
    // Step 5: Test delete with wrong password (should return 401)
    console.log('📋 Step 5: Test delete with wrong password');
    const deleteWrongPassword = await request('POST', '/api/user/delete', {
      body: { password: 'wrongpassword' },
      csrfToken,
      authToken,
    });
    
    if (deleteWrongPassword.status === 401) {
      console.log('✅ CHECK 1 PASSED: Wrong password returns 401');
      console.log(`   Error: ${deleteWrongPassword.data?.error}`);
    } else {
      console.log(`❌ CHECK 1 FAILED: Expected 401, got ${deleteWrongPassword.status}`);
    }
    console.log();
    
    // Step 6: Delete with correct password
    console.log('📋 Step 6: Delete account with correct password');
    const deleteResponse = await request('POST', '/api/user/delete', {
      body: { password: PASSWORD },
      csrfToken,
      authToken,
    });
    
    if (deleteResponse.status === 200) {
      console.log('✅ CHECK 2 PASSED: Account deleted successfully');
      console.log(`   Response: ${JSON.stringify(deleteResponse.data, null, 2)}`);
    } else {
      console.log(`❌ CHECK 2 FAILED: Expected 200, got ${deleteResponse.status}`);
      console.log(`   Response: ${JSON.stringify(deleteResponse.data, null, 2)}`);
      return;
    }
    console.log();
    
    // Step 7: Verify anonymization in database
    console.log('📋 Step 7: Verify anonymization in database');
    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isDeleted: true,
        deletedAt: true,
        anonymizedAt: true,
      },
    });
    
    if (deletedUser) {
      console.log('✅ User found in database');
      console.log(`   isDeleted: ${deletedUser.isDeleted} (expected: true)`);
      console.log(`   email: ${deletedUser.email} (expected: deleted+${user.id}@example.invalid)`);
      console.log(`   name: ${deletedUser.name} (expected: Deleted User)`);
      console.log(`   phone: ${deletedUser.phone} (expected: null)`);
      console.log(`   deletedAt: ${deletedUser.deletedAt}`);
      console.log(`   anonymizedAt: ${deletedUser.anonymizedAt}`);
      
      const checks = [
        { name: 'isDeleted is true', value: deletedUser.isDeleted === true },
        { name: 'email is anonymized', value: deletedUser.email === `deleted+${user.id}@example.invalid` },
        { name: 'name is anonymized', value: deletedUser.name === 'Deleted User' },
        { name: 'phone is null', value: deletedUser.phone === null },
        { name: 'deletedAt is set', value: deletedUser.deletedAt !== null },
        { name: 'anonymizedAt is set', value: deletedUser.anonymizedAt !== null },
      ];
      
      checks.forEach(check => {
        const status = check.value ? '✅' : '❌';
        console.log(`   ${status} ${check.name}`);
      });
    }
    console.log();
    
    // Step 8: Test login after deletion (should return 403)
    console.log('📋 Step 8: Test login after deletion');
    await request('GET', '/health'); // Get new CSRF token
    const newCsrfToken = cookies.get('csrf_token');
    
    const loginAfterDelete = await request('POST', '/api/auth/login', {
      body: { email: deletedUser.email, password: PASSWORD },
      csrfToken: newCsrfToken,
    });
    
    if (loginAfterDelete.status === 403 && loginAfterDelete.data?.error === 'ACCOUNT_DELETED') {
      console.log('✅ CHECK 3 PASSED: Login blocked after deletion (403 ACCOUNT_DELETED)');
    } else {
      console.log(`❌ CHECK 3 FAILED: Expected 403 ACCOUNT_DELETED, got ${loginAfterDelete.status}`);
      console.log(`   Response: ${JSON.stringify(loginAfterDelete.data, null, 2)}`);
    }
    console.log();
    
    // Step 9: Test export after deletion (should return 403)
    console.log('📋 Step 9: Test export after deletion');
    // Generate new token (will be blocked by auth middleware)
    const newAuthToken = await generateJwtToken(deletedUser);
    const exportAfter = await request('POST', '/api/user/export', {
      csrfToken: newCsrfToken,
      authToken: newAuthToken,
    });
    
    if (exportAfter.status === 403 && exportAfter.data?.error === 'ACCOUNT_DELETED') {
      console.log('✅ CHECK 4 PASSED: Export blocked after deletion (403 ACCOUNT_DELETED)');
    } else {
      console.log(`❌ CHECK 4 FAILED: Expected 403 ACCOUNT_DELETED, got ${exportAfter.status}`);
      console.log(`   Response: ${JSON.stringify(exportAfter.data, null, 2)}`);
    }
    console.log();
    
    // Step 10: Test deletion-status endpoint
    console.log('📋 Step 10: Test deletion-status endpoint');
    const statusResponse = await request('GET', '/api/user/deletion-status', {
      csrfToken: newCsrfToken,
      authToken: newAuthToken,
    });
    
    if (statusResponse.status === 403) {
      console.log('✅ CHECK 5 PASSED: Deletion-status blocked (403 - auth middleware working)');
    } else if (statusResponse.status === 200) {
      console.log('✅ Deletion-status returned:');
      console.log(`   ${JSON.stringify(statusResponse.data, null, 2)}`);
    } else {
      console.log(`⚠️  Unexpected status: ${statusResponse.status}`);
    }
    console.log();
    
    // Step 11: Verify sessions deleted
    console.log('📋 Step 11: Verify sessions deleted');
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    
    if (sessions.length === 0) {
      console.log('✅ CHECK 6 PASSED: All sessions deleted');
    } else {
      console.log(`⚠️  Found ${sessions.length} sessions (expected: 0)`);
    }
    console.log();
    
    console.log('🎉 All deletion tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();




