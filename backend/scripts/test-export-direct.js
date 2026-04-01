/**
 * Test GDPR DSAR Export endpoint
 * Uses Prisma to create user/consents directly, then generates JWT token manually
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');

const prisma = new PrismaClient();
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_EMAIL || 'test-export-direct@example.com';
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
      timeout: 60000, // 60 second timeout
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
  // Try to get JWT secret from environment or use default
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
}

async function setupUser() {
  console.log('📋 Setting up test user in database...');
  
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
  });
  
  if (!user) {
    // Create user
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        password: hashedPassword,
        name: 'Test Export Direct',
        role: 'BUYER',
      },
    });
    console.log('✅ User created');
  } else {
    console.log('ℹ️  User already exists');
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
        console.log(`✅ Consent ${type} created`);
      }
    }
  } else {
    console.log('✅ Consents already exist');
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
    console.log('🔍 Testing GDPR DSAR Export (Direct Method)\n');
    console.log(`📧 Using email: ${EMAIL}\n`);
    
    // Step 1: Setup user and consents in database
    const user = await setupUser();
    console.log(`   User ID: ${user.id}\n`);
    
    // Step 2: Generate JWT token manually
    console.log('📋 Step 2: Generate JWT token');
    const authToken = await generateJwtToken(user);
    console.log(`✅ JWT Token generated: ${authToken.substring(0, 20)}...\n`);
    
    // Step 3: Get CSRF token
    console.log('📋 Step 3: Get CSRF token');
    await request('GET', '/health');
    const csrfToken = cookies.get('csrf_token');
    console.log(`✅ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
    
    // Step 4: Request export
    console.log('📋 Step 4: Request data export');
    const exportResponse = await request('POST', '/api/user/export', {
      csrfToken,
      authToken,
    });
    
    if (exportResponse.status === 429) {
      console.log('⚠️  Rate limit exceeded');
      console.log('   Response:', JSON.stringify(exportResponse.data, null, 2));
      return;
    }
    
    if (exportResponse.status !== 200) {
      console.log(`❌ Export failed: ${exportResponse.status}`);
      console.log('   Response:', JSON.stringify(exportResponse.data, null, 2));
      return;
    }
    
    console.log('✅ Export successful!\n');
    
    // Step 5: Verify export structure
    const exportData = exportResponse.data;
    console.log('📊 Export Structure:');
    console.log(`   exportedAt: ${exportData.exportedAt}`);
    console.log(`   userId: ${exportData.userId}`);
    console.log(`   exportVersion: ${exportData.exportVersion}`);
    console.log(`   data.profile: ${exportData.data?.profile ? '✅' : '❌'}`);
    console.log(`   data.consents: ${Array.isArray(exportData.data?.consents) ? `✅ (${exportData.data.consents.length} items)` : '❌'}`);
    console.log(`   data.properties: ${Array.isArray(exportData.data?.properties) ? `✅ (${exportData.data.properties.length} items)` : '❌'}`);
    console.log(`   data.transactions: ${Array.isArray(exportData.data?.transactions) ? `✅ (${exportData.data.transactions.length} items)` : '❌'}`);
    console.log(`   data.messages: ${Array.isArray(exportData.data?.messages) ? `✅ (${exportData.data.messages.length} items)` : '❌'}`);
    console.log();
    
    // Step 6: Verify exclusions
    console.log('🔒 Security Checks:');
    const profile = exportData.data?.profile;
    if (profile) {
      console.log(`   password field: ${profile.password ? '❌ EXPOSED' : '✅ Excluded'}`);
      console.log(`   email field: ${profile.email ? '✅ Present' : '❌ Missing'}`);
    }
    
    const consents = exportData.data?.consents || [];
    if (consents.length > 0) {
      const firstConsent = consents[0];
      console.log(`   consent.ip: ${firstConsent.ip ? '❌ EXPOSED' : '✅ Excluded'}`);
      console.log(`   consent.userAgent: ${firstConsent.userAgent ? '❌ EXPOSED' : '✅ Excluded'}`);
    }
    
    console.log();
    
    // Step 7: Save to file
    const filename = `gdpr-export-test-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`💾 Export saved to: ${filename}`);
    console.log(`   Size: ${(JSON.stringify(exportData).length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

