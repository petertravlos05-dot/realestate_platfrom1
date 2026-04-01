/**
 * Verify that rate limit bypass is disabled in production
 * 
 * This script tests that X-Test-Request header does NOT bypass rate limiting
 * when NODE_ENV=production
 * 
 * Usage:
 *   1. Set NODE_ENV=production in backend
 *   2. Restart backend server
 *   3. Run: node scripts/verify-production-bypass-disabled.js
 * 
 * Expected: Request should be rate limited normally (429 if limit exceeded)
 */

const http = require('http');
const { URL } = require('url');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // JWT token
const TEST_CSRF = process.env.TEST_CSRF || ''; // CSRF token

if (!TEST_TOKEN) {
  console.error('❌ Error: TEST_TOKEN environment variable required');
  console.log('\nTo get a token:');
  console.log('  1. Login via API: POST /api/auth/login');
  console.log('  2. Extract JWT from response');
  console.log('  3. Extract CSRF token from Set-Cookie header');
  console.log('  4. Run: TEST_TOKEN=<token> TEST_CSRF=<csrf> node scripts/verify-production-bypass-disabled.js');
  process.exit(1);
}

function makeRequest() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/user/export', BACKEND_URL);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'X-CSRF-Token': TEST_CSRF,
      'X-Test-Request': 'true', // This should be IGNORED in production
      'Cookie': `csrf_token=${TEST_CSRF}`,
    };

    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
        });
      });
    });

    req.on('error', reject);
    req.write('{}');
    req.end();
  });
}

async function verifyProductionBypassDisabled() {
  console.log('========================================');
  console.log('Production Rate Limit Bypass Verification');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log('\n⚠️  IMPORTANT: Backend must be running with NODE_ENV=production');
  console.log('   If NODE_ENV is not "production", this test will not verify production behavior\n');

  try {
    console.log('Sending request with X-Test-Request: true header...');
    console.log('(This header should be IGNORED in production)\n');

    const response = await makeRequest();

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Data:`, JSON.stringify(response.data, null, 2));

    if (response.status === 429) {
      console.log('\n✅ SUCCESS: Request was rate limited (bypass did NOT work)');
      console.log('   This confirms that bypass is disabled in production.');
      console.log(`   Rate limit message: ${response.data.message || 'Too many requests'}`);
      return true;
    } else if (response.status === 200) {
      // Check if we're actually in production
      if (process.env.NODE_ENV === 'production') {
        console.log('\n❌ FAILURE: Request succeeded, but bypass should be disabled in production!');
        console.log('   This indicates a security vulnerability.');
        console.log('   Check backend logs for: "[RATE_LIMIT] Security: X-Test-Request header ignored"');
        return false;
      } else {
        console.log('\n⚠️  WARNING: Request succeeded, but NODE_ENV is not "production"');
        console.log('   Set NODE_ENV=production and restart backend to test production behavior.');
        return false;
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('\n⚠️  Authentication/Authorization error');
      console.log('   Check that TEST_TOKEN and TEST_CSRF are valid.');
      console.log(`   Status: ${response.status}, Error: ${JSON.stringify(response.data)}`);
      return false;
    } else {
      console.log(`\n⚠️  Unexpected status code: ${response.status}`);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

verifyProductionBypassDisabled()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });




