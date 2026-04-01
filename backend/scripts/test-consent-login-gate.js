/**
 * Test script for login gating with consent requirements
 * 
 * Tests:
 * 1. User without consents -> login returns 428 CONSENT_REQUIRED
 * 2. Accept required consents -> login returns 200 and token
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test-consent-gate@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken = null;
let csrfToken = null;
let userId = null;
const cookies = new Map();

/**
 * Helper: Extract cookies from Set-Cookie header
 */
function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return;
  
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  cookieStrings.forEach(cookieStr => {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length === 2) {
      const name = parts[0].trim();
      const value = parts[1].trim();
      cookies.set(name, value);
      if (name === 'csrf_token') {
        csrfToken = value;
      }
      if (name === 'access_token') {
        authToken = value;
      }
    }
  });
}

/**
 * Helper: Build cookie string for requests
 */
function getCookieString() {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Helper: Make HTTP request using native http module
 */
function request(method, endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const postData = options.body ? JSON.stringify(options.body) : null;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...(cookies.size > 0 && { Cookie: getCookieString() }),
      ...options.headers,
    };
    
    if (postData) {
      requestHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: requestHeaders,
    };
    
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      // Extract cookies from Set-Cookie header
      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader) {
        extractCookies(setCookieHeader);
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // Not JSON, keep as empty object
        }
        
        resolve({
          status: res.statusCode,
          data: parsedData,
          headers: res.headers,
        });
      });
    });
    
    req.on('error', (error) => {
      reject({ status: 0, error: error.message });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Step 0: Get CSRF token
 */
async function getCsrfToken() {
  console.log('\n📋 Step 0: Get CSRF token');
  console.log('='.repeat(60));
  
  const response = await request('GET', '/health');
  
  if (csrfToken) {
    console.log(`✅ CSRF token obtained: ${csrfToken.substring(0, 10)}...`);
    return { success: true };
  }
  
  console.log('⚠️  CSRF token not found, but continuing...');
  return { success: true };
}

/**
 * Step 1: Create user (or use existing)
 */
async function ensureUser() {
  console.log('\n📋 Step 1: Ensure user exists');
  console.log('='.repeat(60));
  
  // Try login first
  const loginResponse = await request('POST', '/api/auth/login', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  if (loginResponse.status === 200 && loginResponse.data.token) {
    authToken = loginResponse.data.token;
    userId = loginResponse.data.user?.id;
    console.log('✅ User exists and can login');
    console.log(`   User ID: ${userId}`);
    return { success: true, userExists: true };
  }

  // If login fails, try register
  if (loginResponse.status === 401 || loginResponse.status === 428) {
    console.log('⚠️  User exists but cannot login, attempting registration...');
    const registerResponse = await request('POST', '/api/auth/register', {
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Test Consent Gate User',
        role: 'BUYER',
      },
    });

    if (registerResponse.status === 201 || registerResponse.status === 200) {
      userId = registerResponse.data.user?.id;
      console.log('✅ User registered');
      console.log(`   User ID: ${userId}`);
      return { success: true, userExists: false };
    }
  }

  console.log('❌ Failed to create/access user');
  return { success: false };
}

/**
 * Step 2: Delete user consents (to test 428)
 */
async function deleteUserConsents() {
  console.log('\n📋 Step 2: Delete user consents (to test 428)');
  console.log('='.repeat(60));
  
  // This would require direct database access or admin endpoint
  // For now, we'll assume user has no consents or use a new user
  console.log('⚠️  Note: Using fresh user or assuming no consents');
  return { success: true };
}

/**
 * Step 3: Test login without consents -> should return 428
 */
async function testLoginWithoutConsents() {
  console.log('\n📋 Step 3: Test login without consents');
  console.log('='.repeat(60));
  
  // Clear any existing auth token
  authToken = null;
  cookies.delete('access_token');
  
  const response = await request('POST', '/api/auth/login', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  if (response.status === 428 && response.data.error === 'CONSENT_REQUIRED') {
    console.log('✅ PASS: Login correctly returns 428 CONSENT_REQUIRED');
    console.log('   Required consents:', response.data.required);
    console.log('   Versions:', JSON.stringify(response.data.versions, null, 2));
    return { 
      success: true, 
      requiredConsents: response.data.required,
      versions: response.data.versions 
    };
  } else if (response.status === 200) {
    console.log('⚠️  WARNING: Login succeeded without consent check');
    console.log('   This may mean user already has consents');
    return { success: false, reason: 'Login succeeded unexpectedly' };
  } else {
    console.log('❌ FAIL: Unexpected response');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    return { success: false, reason: 'Unexpected response' };
  }
}

/**
 * Step 4: Accept consents using email/password
 */
async function acceptConsents(requiredConsents, versions) {
  console.log('\n📋 Step 4: Accept consents');
  console.log('='.repeat(60));
  
  // Convert to backend format (uppercase)
  const consents = requiredConsents.map(type => ({
    type: type.toUpperCase(),
    version: versions[type.toLowerCase()] || versions[type] || '2026-01-01',
  }));

  console.log('   Accepting consents:', consents);
  
  const response = await request('POST', '/api/user/consents/accept-with-auth', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      consents,
    },
  });

  if (response.status === 200) {
    console.log('✅ Consents accepted successfully');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return { success: true };
  }

  console.log('❌ Failed to accept consents');
  console.log('   Status:', response.status);
  console.log('   Data:', JSON.stringify(response.data, null, 2));
  return { success: false };
}

/**
 * Step 5: Test login after consent acceptance -> should return 200
 */
async function testLoginAfterConsents() {
  console.log('\n📋 Step 5: Test login after consent acceptance');
  console.log('='.repeat(60));
  
  // Clear any existing auth token
  authToken = null;
  cookies.delete('access_token');
  
  const response = await request('POST', '/api/auth/login', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  if (response.status === 200 && response.data.token) {
    authToken = response.data.token;
    userId = response.data.user?.id;
    console.log('✅ PASS: Login successful after consent acceptance');
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    return { success: true };
  }

  console.log('❌ FAIL: Login failed after consent acceptance');
  console.log('   Status:', response.status);
  console.log('   Data:', JSON.stringify(response.data, null, 2));
  return { success: false };
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Login Gating with Consent Requirements Test');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`TERMS_VERSION: ${process.env.TERMS_VERSION || '2026-01-01'}`);
  console.log(`PRIVACY_VERSION: ${process.env.PRIVACY_VERSION || '2026-01-01'}`);

  try {
    // Step 0: Get CSRF token
    await getCsrfToken();

    // Step 1: Ensure user exists
    const step1 = await ensureUser();
    if (!step1.success) {
      console.log('\n❌ Test failed at Step 1');
      return;
    }

    // Step 2: Delete consents (or use fresh user)
    await deleteUserConsents();

    // Step 3: Test login without consents -> should return 428
    const step3 = await testLoginWithoutConsents();
    if (!step3.success) {
      console.log('\n❌ Test failed at Step 3');
      return;
    }

    // Step 4: Accept consents
    const step4 = await acceptConsents(step3.requiredConsents, step3.versions);
    if (!step4.success) {
      console.log('\n❌ Test failed at Step 4');
      return;
    }

    // Step 5: Test login after consents -> should return 200
    const step5 = await testLoginAfterConsents();
    if (!step5.success) {
      console.log('\n❌ Test failed at Step 5');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Login without consents: 428 CONSENT_REQUIRED ✅`);
    console.log(`   - Consents accepted: ✅`);
    console.log(`   - Login after consents: 200 OK ✅`);

  } catch (error) {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };




