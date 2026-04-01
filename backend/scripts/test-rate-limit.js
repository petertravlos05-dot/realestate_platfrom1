/**
 * Test script to verify rate limiting works
 * 
 * Usage:
 *   node scripts/test-rate-limit.js
 * 
 * Make sure backend is running on http://localhost:3001
 */

const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${BACKEND_URL}/api/auth/login`;

console.log('🧪 Testing Rate Limiting');
console.log(`Target: ${TEST_ENDPOINT}\n`);

let successCount = 0;
let rateLimitedCount = 0;
let errorCount = 0;

function makeRequest(requestNum) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    const url = new URL(BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000 // 5 second timeout
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 429) {
          rateLimitedCount++;
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ Request ${requestNum}: Rate limit hit! Status: ${res.statusCode}, Retry-After: ${parsed.retryAfterSeconds}s`);
          } catch (e) {
            console.log(`✅ Request ${requestNum}: Rate limit hit! Status: ${res.statusCode}`);
          }
          resolve({ status: 429 });
        } else if (res.statusCode === 401) {
          successCount++;
          console.log(`✓ Request ${requestNum}: Success (401 - expected for wrong password)`);
          resolve({ status: 401 });
        } else {
          errorCount++;
          console.log(`❌ Request ${requestNum}: Unexpected status: ${res.statusCode}, Response: ${data.substring(0, 100)}`);
          resolve({ status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      errorCount++;
      // Only log non-timeout errors to reduce noise
      if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
        console.error(`❌ Request ${requestNum}: Error: ${error.code || error.message}`);
      }
      resolve({ error: error.code || error.message });
    });

    req.on('timeout', () => {
      errorCount++;
      req.destroy();
      console.error(`❌ Request ${requestNum}: Timeout`);
      resolve({ error: 'timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('Sending 10 requests rapidly...\n');

  const requests = [];
  for (let i = 1; i <= 10; i++) {
    requests.push(makeRequest(i));
    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await Promise.all(requests);

  console.log('\n📊 Results:');
  console.log(`   Successful requests (401): ${successCount}`);
  console.log(`   Rate limited (429): ${rateLimitedCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (rateLimitedCount > 0) {
    console.log('\n✅ Rate limiting is working! Some requests were rate limited.');
    console.log(`   Expected: First ${successCount} requests succeed, then rate limiting kicks in.`);
  } else if (successCount >= 5) {
    console.log('\n⚠️  Warning: No rate limits were hit, but requests succeeded.');
    console.log('   This might mean:');
    console.log('   - Rate limiting is disabled (RATE_LIMIT_ENABLED=false)');
    console.log('   - Limits are set higher than expected');
    console.log('   - Check your .env file for RATE_LIMIT_* variables');
  } else {
    console.log('\n⚠️  Warning: Unexpected results.');
    console.log('   - Backend might not be running');
    console.log('   - Check if backend is accessible at:', BACKEND_URL);
    console.log('   - Connection errors might indicate server overload or network issues');
  }
  
  if (errorCount > 0 && rateLimitedCount === 0) {
    console.log('\n💡 Tip: Connection errors might be due to:');
    console.log('   - Backend closing connections too quickly');
    console.log('   - Network issues');
    console.log('   - Server overload');
    console.log('   Try running the test again or check backend logs.');
  }
}

runTest().catch(console.error);

