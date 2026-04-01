/**
 * Simple script to get consent history for userA@example.com
 * This user already has consents accepted
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3001';
const EMAIL = 'userA@example.com';
const PASSWORD = 'passwordA';

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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null,
        });
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
  console.log('🔍 Getting consent history for userA@example.com\n');
  
  // Step 1: Get CSRF token
  console.log('📋 Step 1: Get CSRF token');
  const healthResponse = await request('GET', '/health');
  const csrfToken = cookies.get('csrf_token');
  console.log(`✅ CSRF Token: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'not found'}\n`);
  
  // Step 2: Login
  console.log('📋 Step 2: Login');
  const loginResponse = await request('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
    csrfToken,
  });
  
  if (loginResponse.status === 428) {
    console.log('⚠️  Login returned 428 - CONSENT_REQUIRED');
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
    return;
  }
  
  if (loginResponse.status !== 200) {
    console.log(`❌ Login failed: ${loginResponse.status}`);
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
    return;
  }
  
  const authToken = cookies.get('access_token') || loginResponse.data?.token;
  console.log(`✅ Login successful`);
  console.log(`   Auth Token: ${authToken ? authToken.substring(0, 20) + '...' : 'not found'}\n`);
  
  // Step 3: Get consent history
  console.log('📋 Step 3: Get consent history');
  const historyResponse = await request('GET', '/api/user/consents', {
    authToken,
  });
  
  if (historyResponse.status === 200) {
    console.log('✅ Consent history retrieved successfully');
    console.log('\n📊 Consent History:');
    console.log(JSON.stringify(historyResponse.data, null, 2));
  } else {
    console.log(`❌ Failed to get consent history: ${historyResponse.status}`);
    console.log('   Response:', JSON.stringify(historyResponse.data, null, 2));
  }
}

main().catch(console.error);




