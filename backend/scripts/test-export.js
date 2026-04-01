/**
 * Test GDPR DSAR Export endpoint
 */

const http = require('http');
const { URL } = require('url');
const fs = require('fs');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
// Use userA@example.com which already has consents (from previous tests)
const EMAIL = process.env.TEST_EMAIL || 'userA@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'passwordA';

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
      // Debug: Verify CSRF token is set
      if (path.includes('consents')) {
        console.log(`   [DEBUG] CSRF Token: ${options.csrfToken.substring(0, 20)}...`);
        console.log(`   [DEBUG] Cookie header: ${cookieHeader ? cookieHeader.substring(0, 50) + '...' : 'missing'}`);
      }
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

async function main() {
  console.log('🔍 Testing GDPR DSAR Export\n');
  console.log(`📧 Using email: ${EMAIL}\n`);
  
  // Step 1: Get CSRF token
  console.log('📋 Step 1: Get CSRF token');
  await request('GET', '/health');
  const csrfToken = cookies.get('csrf_token');
  console.log(`✅ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
  
  // Step 2: Try login, if fails try register
  console.log('📋 Step 2: Login (or register if needed)');
  let loginResponse = await request('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
    csrfToken,
  });
  
  if (loginResponse.status === 401) {
    console.log('⚠️  Login failed, attempting registration...');
    const registerResponse = await request('POST', '/api/auth/register', {
      body: {
        email: EMAIL,
        password: PASSWORD,
        name: 'Test Export User',
        role: 'BUYER',
      },
      csrfToken,
    });
    
    if (registerResponse.status === 200 || registerResponse.status === 201) {
      console.log('✅ User registered successfully');
      // Accept consents (required before login)
      console.log('📋 Accepting required consents...');
      const acceptResponse = await request('POST', '/api/user/consents/accept-with-auth', {
        body: {
          email: EMAIL,
          password: PASSWORD,
          consents: [
            { type: 'TERMS', version: '2026-01-01' },
            { type: 'PRIVACY', version: '2026-01-01' },
          ],
        },
        csrfToken,
      });
      
      console.log(`   Accept response status: ${acceptResponse.status}`);
      if (acceptResponse.status !== 200) {
        console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
      }
      
      if (acceptResponse.status === 200) {
        console.log('✅ Consents accepted');
      } else {
        console.log(`⚠️  Consent acceptance failed: ${acceptResponse.status}`);
      }
      
      // Try login again
      loginResponse = await request('POST', '/api/auth/login', {
        body: { email: EMAIL, password: PASSWORD },
        csrfToken,
      });
    } else {
      console.log(`❌ Registration failed: ${registerResponse.status}`);
      console.log('   Response:', JSON.stringify(registerResponse.data, null, 2));
      return;
    }
  }
  
  if (loginResponse.status === 428) {
    console.log('⚠️  Login requires consents, accepting...');
    const acceptResponse = await request('POST', '/api/user/consents/accept-with-auth', {
      body: {
        email: EMAIL,
        password: PASSWORD,
        consents: [
          { type: 'TERMS', version: loginResponse.data.versions?.terms || loginResponse.data.versions?.TERMS || '2026-01-01' },
          { type: 'PRIVACY', version: loginResponse.data.versions?.privacy || loginResponse.data.versions?.PRIVACY || '2026-01-01' },
        ],
      },
      csrfToken,
    });
    
    console.log(`   Accept response status: ${acceptResponse.status}`);
    if (acceptResponse.status !== 200) {
      console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
    }
    
    if (acceptResponse.status === 200) {
      console.log('✅ Consents accepted');
      // Try login again
      loginResponse = await request('POST', '/api/auth/login', {
        body: { email: EMAIL, password: PASSWORD },
        csrfToken,
      });
    } else {
      console.log(`❌ Consent acceptance failed: ${acceptResponse.status}`);
      return;
    }
  }
  
  if (loginResponse.status !== 200) {
    console.log(`❌ Login failed: ${loginResponse.status}`);
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
    return;
  }
  
  const authToken = cookies.get('access_token') || loginResponse.data?.token;
  console.log(`✅ Login successful`);
  console.log(`   Auth Token: ${authToken ? authToken.substring(0, 20) + '...' : 'not found'}\n`);
  
  // Step 3: Request export
  console.log('📋 Step 3: Request data export');
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
  
  // Step 4: Verify export structure
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
  
  // Step 5: Verify exclusions
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
  
  // Step 6: Save to file
  const filename = `gdpr-export-test-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`💾 Export saved to: ${filename}`);
  console.log(`   Size: ${(JSON.stringify(exportData).length / 1024).toFixed(2)} KB`);
}

main().catch(console.error);

