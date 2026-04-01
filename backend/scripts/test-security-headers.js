/**
 * Test script to verify security headers are set correctly
 * 
 * Usage:
 *   node scripts/test-security-headers.js
 * 
 * Make sure backend is running on http://localhost:3001
 */

const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${BACKEND_URL}/health`;

console.log('🔒 Testing Security Headers');
console.log(`Target: ${TEST_ENDPOINT}\n`);

const requiredHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': (value) => value && value.includes('geolocation=()'),
  'Content-Security-Policy': (value) => value && value.includes("default-src 'self'"),
};

const optionalHeaders = {
  'Strict-Transport-Security': (value) => {
    // Only required in production with HTTPS
    if (process.env.NODE_ENV === 'production') {
      return value && value.includes('max-age=');
    }
    return true; // Optional in development
  },
};

function testHeaders() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(BACKEND_URL).hostname,
      port: new URL(BACKEND_URL).port || 3001,
      path: '/health',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      const headers = res.headers;
      const results = {
        passed: [],
        failed: [],
        warnings: [],
      };

      console.log('📋 Checking Security Headers:\n');

      // Check required headers
      for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
        const actualValue = headers[headerName.toLowerCase()];

        if (!actualValue) {
          results.failed.push({
            header: headerName,
            reason: 'Header is missing',
          });
          console.log(`❌ ${headerName}: MISSING`);
        } else if (typeof expectedValue === 'function') {
          // Custom validation function
          if (expectedValue(actualValue)) {
            results.passed.push(headerName);
            console.log(`✅ ${headerName}: ${actualValue.substring(0, 60)}...`);
          } else {
            results.failed.push({
              header: headerName,
              reason: 'Header value does not meet requirements',
              actual: actualValue,
            });
            console.log(`❌ ${headerName}: Invalid value - ${actualValue.substring(0, 60)}...`);
          }
        } else if (actualValue === expectedValue) {
          results.passed.push(headerName);
          console.log(`✅ ${headerName}: ${actualValue}`);
        } else {
          results.failed.push({
            header: headerName,
            reason: `Expected "${expectedValue}", got "${actualValue}"`,
            actual: actualValue,
          });
          console.log(`❌ ${headerName}: Expected "${expectedValue}", got "${actualValue}"`);
        }
      }

      // Check optional headers
      for (const [headerName, validator] of Object.entries(optionalHeaders)) {
        const actualValue = headers[headerName.toLowerCase()];

        if (!actualValue) {
          if (process.env.NODE_ENV === 'production') {
            results.warnings.push({
              header: headerName,
              reason: 'Header is missing (required in production)',
            });
            console.log(`⚠️  ${headerName}: MISSING (required in production)`);
          } else {
            console.log(`ℹ️  ${headerName}: Not set (optional in development)`);
          }
        } else if (validator(actualValue)) {
          results.passed.push(headerName);
          console.log(`✅ ${headerName}: ${actualValue.substring(0, 60)}...`);
        } else {
          results.warnings.push({
            header: headerName,
            reason: 'Header value does not meet requirements',
            actual: actualValue,
          });
          console.log(`⚠️  ${headerName}: Invalid value - ${actualValue.substring(0, 60)}...`);
        }
      }

      // Check that X-Powered-By is removed
      if (headers['x-powered-by']) {
        results.failed.push({
          header: 'X-Powered-By',
          reason: 'Should be removed for security',
          actual: headers['x-powered-by'],
        });
        console.log(`❌ X-Powered-By: Should be removed, but found "${headers['x-powered-by']}"`);
      } else {
        results.passed.push('X-Powered-By (removed)');
        console.log(`✅ X-Powered-By: Removed (good)`);
      }

      console.log('\n📊 Results:');
      console.log(`   ✅ Passed: ${results.passed.length}`);
      console.log(`   ❌ Failed: ${results.failed.length}`);
      console.log(`   ⚠️  Warnings: ${results.warnings.length}`);

      if (results.failed.length > 0) {
        console.log('\n❌ Security headers test FAILED:');
        results.failed.forEach((failure) => {
          console.log(`   - ${failure.header}: ${failure.reason}`);
        });
      } else {
        console.log('\n✅ Security headers test PASSED!');
      }

      if (results.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        results.warnings.forEach((warning) => {
          console.log(`   - ${warning.header}: ${warning.reason}`);
        });
      }

      resolve(results);
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test CORS headers
function testCORS() {
  return new Promise((resolve) => {
    const options = {
      hostname: new URL(BACKEND_URL).hostname,
      port: new URL(BACKEND_URL).port || 3001,
      path: '/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    };

    const req = http.request(options, (res) => {
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers'],
        'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
      };

      console.log('\n🌐 CORS Headers:');
      console.log(`   Access-Control-Allow-Origin: ${corsHeaders['access-control-allow-origin'] || 'MISSING'}`);
      console.log(`   Access-Control-Allow-Methods: ${corsHeaders['access-control-allow-methods'] || 'MISSING'}`);
      console.log(`   Access-Control-Allow-Headers: ${corsHeaders['access-control-allow-headers'] || 'MISSING'}`);
      console.log(`   Access-Control-Allow-Credentials: ${corsHeaders['access-control-allow-credentials'] || 'MISSING'}`);

      if (corsHeaders['access-control-allow-origin']) {
        console.log('✅ CORS is configured');
      } else {
        console.log('⚠️  CORS headers not found (might be normal for non-OPTIONS requests)');
      }

      resolve(corsHeaders);
    });

    req.on('error', (error) => {
      console.error('❌ CORS test error:', error.message);
      resolve({});
    });

    req.end();
  });
}

async function runTests() {
  try {
    await testHeaders();
    await testCORS();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();





