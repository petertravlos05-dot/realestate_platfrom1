/**
 * GDPR Consent Tracking Test Script
 * 
 * Tests the end-to-end consent flow:
 * 1. Create user (or use existing)
 * 2. Accept consent via POST /api/user/consents/accept
 * 3. GET /api/user/consents returns the consent history
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test-consent@example.com';
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
 * Helper: Make HTTP request using native http module (supports cookies)
 */
function request(method, endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const postData = options.body ? JSON.stringify(options.body) : null;
    
    // Build cookie string (include access_token cookie if available)
    const cookieString = getCookieString();
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...(cookieString && { Cookie: cookieString }),
      ...options.headers,
    };
    
    // Debug logging
    if (process.env.DEBUG) {
      console.log(`   [DEBUG] ${method} ${path}`);
      console.log(`   [DEBUG] Has authToken: ${!!authToken}`);
      console.log(`   [DEBUG] Has csrfToken: ${!!csrfToken}`);
      console.log(`   [DEBUG] Cookie string: ${cookieString || '(none)'}`);
    }
    
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
        
        // Debug: Log cookies if found
        if (process.env.DEBUG) {
          console.log('   [DEBUG] Response cookies:', res.headers['set-cookie']);
          console.log('   [DEBUG] Current cookies map:', Array.from(cookies.entries()));
          console.log('   [DEBUG] Auth token:', authToken);
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
 * Step 0: Get CSRF token first (required for POST requests)
 */
async function getInitialCsrfToken() {
  console.log('\n📋 Step 0: Get initial CSRF token');
  console.log('='.repeat(60));
  
  // Make a GET request to a public endpoint to get CSRF token cookie
  // Try health check or any GET endpoint that doesn't require auth
  const response = await request('GET', '/health');
  
  if (csrfToken) {
    console.log(`✅ CSRF token obtained: ${csrfToken.substring(0, 10)}...`);
    return { success: true };
  }
  
  // If health endpoint doesn't exist, try user consents (will get 401 but should set CSRF cookie)
  if (response.status === 404) {
    const response2 = await request('GET', '/api/user/consents');
    if (csrfToken) {
      console.log(`✅ CSRF token obtained: ${csrfToken.substring(0, 10)}...`);
      return { success: true };
    }
  }
  
  console.log('⚠️  CSRF token not found, but continuing...');
  console.log('   Response status:', response.status);
  return { success: true }; // Continue anyway, might work
}

/**
 * Step 1: Register or login user
 */
async function loginOrRegister() {
  console.log('\n📋 Step 1: Login/Register user');
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
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   CSRF Token: ${csrfToken ? csrfToken.substring(0, 10) + '...' : 'not set'}`);
    return { success: true };
  }

  // If login fails, try register
  console.log('⚠️  Login failed, attempting registration...');
  const registerResponse = await request('POST', '/api/auth/register', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Test User',
      role: 'BUYER',
    },
  });

  if (registerResponse.status === 201 || registerResponse.status === 200) {
    userId = registerResponse.data.user?.id;
    console.log('✅ Registration successful');
    console.log(`   User ID: ${userId}`);
    
    // Registration doesn't return token, need to login to get token
    // But first, check if access_token cookie was set
    if (cookies.has('access_token')) {
      authToken = cookies.get('access_token');
      console.log('✅ Auth token obtained from cookie');
    } else {
      // Try to login to get token
      console.log('   Logging in to get auth token...');
      const loginAfterRegister = await request('POST', '/api/auth/login', {
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      });
      
      if (loginAfterRegister.status === 200 && loginAfterRegister.data.token) {
        authToken = loginAfterRegister.data.token;
        console.log('✅ Login after registration successful');
      } else if (cookies.has('access_token')) {
        authToken = cookies.get('access_token');
        console.log('✅ Auth token obtained from cookie after login');
      } else {
        console.log('⚠️  No token found, but continuing...');
        console.log('   Login response:', loginAfterRegister.status, loginAfterRegister.data);
      }
    }
    
    console.log(`   CSRF Token: ${csrfToken ? csrfToken.substring(0, 10) + '...' : 'not set'}`);
    return { success: true };
  }

  console.log('❌ Both login and registration failed');
  console.log('   Login:', loginResponse.status, loginResponse.data);
  console.log('   Register:', registerResponse.status, registerResponse.data);
  return { success: false };
}

/**
 * Step 2: Get CSRF token (via GET request)
 */
async function getCsrfToken() {
  console.log('\n📋 Step 2: Get CSRF token');
  console.log('='.repeat(60));
  
  const response = await request('GET', '/api/user/consents');
  
  if (response.status === 401) {
    console.log('✅ CSRF token obtained (401 expected without consents)');
    return { success: true };
  }
  
  console.log('⚠️  Unexpected response:', response.status);
  return { success: false };
}

/**
 * Step 3: Accept consents
 */
async function acceptConsents() {
  console.log('\n📋 Step 3: Accept consents');
  console.log('='.repeat(60));
  
  const consents = [
    { type: 'TERMS', version: process.env.TERMS_VERSION || '2026-01-01' },
    { type: 'PRIVACY', version: process.env.PRIVACY_VERSION || '2026-01-01' },
  ];

  console.log('   Accepting consents:', consents);
  
  // If we have auth token, use the regular endpoint
  if (authToken) {
    const response = await request('POST', '/api/user/consents/accept', {
      body: { consents },
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
  
  // If no auth token (because login returned 428), use email/password endpoint
  console.log('   Using email/password authentication for consent acceptance...');
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
 * Step 4: Get consent history
 */
async function getConsentHistory() {
  console.log('\n📋 Step 4: Get consent history');
  console.log('='.repeat(60));
  
  const response = await request('GET', '/api/user/consents');

  if (response.status === 200 && Array.isArray(response.data.consents)) {
    console.log('✅ Consent history retrieved');
    console.log(`   Total consents: ${response.data.consents.length}`);
    console.log('\n   Consents:');
    response.data.consents.forEach((consent, index) => {
      console.log(`   ${index + 1}. ${consent.consentType} v${consent.version} - ${new Date(consent.acceptedAt).toLocaleString()}`);
    });
    console.log('\n   Status:', JSON.stringify(response.data.status, null, 2));
    console.log('   Current versions:', JSON.stringify(response.data.currentVersions, null, 2));
    return { success: true, consents: response.data.consents };
  }

  console.log('❌ Failed to get consent history');
  console.log('   Status:', response.status);
  console.log('   Data:', JSON.stringify(response.data, null, 2));
  return { success: false };
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 GDPR Consent Tracking End-to-End Test');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`TERMS_VERSION: ${process.env.TERMS_VERSION || '2026-01-01'}`);
  console.log(`PRIVACY_VERSION: ${process.env.PRIVACY_VERSION || '2026-01-01'}`);

  try {
    // Step 0: Get CSRF token first
    await getInitialCsrfToken();
    
    // Step 1: Login/Register
    const step1 = await loginOrRegister();
    if (!step1.success) {
      console.log('\n❌ Test failed at Step 1');
      return;
    }

    // Step 2: Get CSRF token (refresh after login)
    await getCsrfToken();

    // Step 3: Accept consents
    const step3 = await acceptConsents();
    if (!step3.success) {
      console.log('\n❌ Test failed at Step 3');
      return;
    }

    // Step 3.5: Login again to get token (now that consents are accepted)
    if (!authToken) {
      console.log('\n📋 Step 3.5: Login after consent acceptance');
      console.log('='.repeat(60));
      const loginAfterConsent = await request('POST', '/api/auth/login', {
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      });
      
      if (loginAfterConsent.status === 200 && loginAfterConsent.data.token) {
        authToken = loginAfterConsent.data.token;
        console.log('✅ Login successful after consent acceptance');
      } else if (cookies.has('access_token')) {
        authToken = cookies.get('access_token');
        console.log('✅ Auth token obtained from cookie');
      } else {
        console.log('⚠️  No token found, but continuing...');
      }
    }

    // Step 4: Get consent history
    const step4 = await getConsentHistory();
    if (!step4.success) {
      console.log('\n❌ Test failed at Step 4');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Consents accepted: ${step4.consents?.length || 0}`);
    console.log(`   - Test completed successfully`);

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

