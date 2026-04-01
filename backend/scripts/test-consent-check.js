/**
 * Test script for consent checks
 * Uses a different email to avoid rate limits
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3001';
const EMAIL = 'test-consent-check@example.com';
const PASSWORD = 'testpassword123';

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

async function main() {
  console.log('🔍 Testing Consent Flow\n');
  console.log(`📧 Using email: ${EMAIL}\n`);
  
  // Step 1: Get CSRF token
  console.log('📋 Step 1: Get CSRF token');
  await request('GET', '/health');
  const csrfToken = cookies.get('csrf_token');
  console.log(`✅ CSRF Token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
  
  // Step 2: Try to register (might fail if user exists)
  console.log('📋 Step 2: Register user');
  const registerResponse = await request('POST', '/api/auth/register', {
    body: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Test Consent Check',
      role: 'BUYER',
    },
    csrfToken,
  });
  
  if (registerResponse.status === 200 || registerResponse.status === 201) {
    console.log('✅ User registered successfully');
  } else if (registerResponse.status === 400 && registerResponse.data?.error?.includes('already exists')) {
    console.log('ℹ️  User already exists, continuing...');
  } else {
    console.log(`⚠️  Registration response: ${registerResponse.status}`);
    console.log('   Response:', JSON.stringify(registerResponse.data, null, 2));
  }
  console.log();
  
  // Step 3: Try login (should return 428 if no consents)
  console.log('📋 Step 3: Attempt login (should return 428 if no consents)');
  const loginResponse = await request('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
    csrfToken,
  });
  
  if (loginResponse.status === 428) {
    console.log('✅ CHECK A PASSED: Login returned 428 - CONSENT_REQUIRED');
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
    console.log();
    
    // Step 4: Accept consents
    console.log('📋 Step 4: Accept consents via accept-with-auth');
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
    
    if (acceptResponse.status === 200) {
      console.log('✅ CHECK B PASSED: Consents accepted successfully');
      console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
      console.log();
      
      // Step 5: Login again (should succeed now)
      console.log('📋 Step 5: Login again (should succeed now)');
      const loginAfterConsent = await request('POST', '/api/auth/login', {
        body: { email: EMAIL, password: PASSWORD },
        csrfToken,
      });
      
      if (loginAfterConsent.status === 200) {
        const authToken = cookies.get('access_token') || loginAfterConsent.data?.token;
        console.log('✅ Login successful after consent acceptance');
        console.log(`   Auth Token: ${authToken ? authToken.substring(0, 20) + '...' : 'not found'}`);
        console.log();
        
        // Step 6: Get consent history
        console.log('📋 Step 6: Get consent history');
        const historyResponse = await request('GET', '/api/user/consents', {
          authToken,
        });
        
        if (historyResponse.status === 200) {
          console.log('✅ CHECK C PASSED: Consent history retrieved successfully');
          console.log('\n📊 Consent History:');
          console.log(JSON.stringify(historyResponse.data, null, 2));
        } else {
          console.log(`❌ CHECK C FAILED: ${historyResponse.status}`);
          console.log('   Response:', JSON.stringify(historyResponse.data, null, 2));
        }
      } else {
        console.log(`❌ Login failed after consent: ${loginAfterConsent.status}`);
        console.log('   Response:', JSON.stringify(loginAfterConsent.data, null, 2));
      }
    } else {
      console.log(`❌ CHECK B FAILED: ${acceptResponse.status}`);
      console.log('   Response:', JSON.stringify(acceptResponse.data, null, 2));
    }
  } else if (loginResponse.status === 200) {
    console.log('ℹ️  Login succeeded (user already has consents)');
    const authToken = cookies.get('access_token') || loginResponse.data?.token;
    
    // Get consent history
    console.log('\n📋 Getting consent history');
    const historyResponse = await request('GET', '/api/user/consents', {
      authToken,
    });
    
    if (historyResponse.status === 200) {
      console.log('✅ CHECK C PASSED: Consent history retrieved successfully');
      console.log('\n📊 Consent History:');
      console.log(JSON.stringify(historyResponse.data, null, 2));
    } else {
      console.log(`❌ CHECK C FAILED: ${historyResponse.status}`);
      console.log('   Response:', JSON.stringify(historyResponse.data, null, 2));
    }
  } else {
    console.log(`❌ Unexpected login response: ${loginResponse.status}`);
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
  }
}

main().catch(console.error);




