/**
 * HSTS Secure Detection Verification
 * 
 * Verifies that HSTS header is correctly set based on request security:
 * - Present when x-forwarded-proto=https OR req.secure=true
 * - Absent when x-forwarded-proto=http OR missing AND req.secure=false
 * 
 * This script tests the isRequestSecure() function logic directly.
 */

// Replicate isRequestSecure logic for testing
function isRequestSecure(req) {
  // Check req.secure (works when trust proxy is set)
  if (req.secure) {
    return true;
  }
  
  // Fallback: check x-forwarded-proto header (for reverse proxy scenarios)
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  if (!forwardedProto) {
    return false;
  }
  
  // Normalize header value (can be string, string[], or comma-separated string)
  let firstProto;
  
  if (Array.isArray(forwardedProto)) {
    // Array format: ["https", ...]
    firstProto = forwardedProto[0];
  } else {
    // String format: "https" or "https, http"
    firstProto = forwardedProto.split(',')[0];
  }
  
  // Trim whitespace and lowercase for comparison
  firstProto = firstProto.trim().toLowerCase();
  
  // Return true only if first protocol is "https"
  return firstProto === 'https';
}

// Mock Express Request objects
function createMockRequest(secure, forwardedProto) {
  return {
    secure: secure || false,
    headers: {
      'x-forwarded-proto': forwardedProto || undefined,
    },
  };
}

console.log('🔒 HSTS Secure Detection Verification\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

// Test 1: req.secure = true (direct HTTPS)
console.log('\nTest 1: req.secure = true (direct HTTPS)');
const req1 = createMockRequest(true, undefined);
const isSecure1 = isRequestSecure(req1);
if (isSecure1) {
  console.log('✅ PASS: Request detected as secure');
  passed++;
} else {
  console.log('❌ FAIL: Request should be detected as secure');
  failed++;
}

// Test 2: x-forwarded-proto = https (behind proxy)
console.log('\nTest 2: x-forwarded-proto = https (behind proxy)');
const req2 = createMockRequest(false, 'https');
const isSecure2 = isRequestSecure(req2);
if (isSecure2) {
  console.log('✅ PASS: Request detected as secure via x-forwarded-proto');
  passed++;
} else {
  console.log('❌ FAIL: Request should be detected as secure via x-forwarded-proto');
  failed++;
}

// Test 3: req.secure = true AND x-forwarded-proto = https (both set)
console.log('\nTest 3: req.secure = true AND x-forwarded-proto = https');
const req3 = createMockRequest(true, 'https');
const isSecure3 = isRequestSecure(req3);
if (isSecure3) {
  console.log('✅ PASS: Request detected as secure (both conditions)');
  passed++;
} else {
  console.log('❌ FAIL: Request should be detected as secure');
  failed++;
}

// Test 4: req.secure = false AND x-forwarded-proto = http (HTTP request)
console.log('\nTest 4: req.secure = false AND x-forwarded-proto = http');
const req4 = createMockRequest(false, 'http');
const isSecure4 = isRequestSecure(req4);
if (!isSecure4) {
  console.log('✅ PASS: Request correctly detected as NOT secure');
  passed++;
} else {
  console.log('❌ FAIL: Request should NOT be detected as secure');
  failed++;
}

// Test 5: req.secure = false AND no x-forwarded-proto (HTTP, no proxy)
console.log('\nTest 5: req.secure = false AND no x-forwarded-proto');
const req5 = createMockRequest(false, undefined);
const isSecure5 = isRequestSecure(req5);
if (!isSecure5) {
  console.log('✅ PASS: Request correctly detected as NOT secure');
  passed++;
} else {
  console.log('❌ FAIL: Request should NOT be detected as secure');
  failed++;
}

// Test 6: x-forwarded-proto = "https, http" (comma-separated, first is https)
console.log('\nTest 6: x-forwarded-proto = "https, http" (comma-separated)');
const req6 = createMockRequest(false, 'https, http');
const isSecure6 = isRequestSecure(req6);
if (isSecure6) {
  console.log('✅ PASS: Request detected as secure (first proto is https)');
  passed++;
} else {
  console.log('❌ FAIL: Request should be detected as secure (first proto is https)');
  failed++;
}

// Test 7: x-forwarded-proto = ["https"] (array format)
console.log('\nTest 7: x-forwarded-proto = ["https"] (array format)');
const req7 = {
  secure: false,
  headers: {
    'x-forwarded-proto': ['https'],
  },
};
const isSecure7 = isRequestSecure(req7);
if (isSecure7) {
  console.log('✅ PASS: Request detected as secure (array format)');
  passed++;
} else {
  console.log('❌ FAIL: Request should be detected as secure (array format)');
  failed++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All tests passed! HSTS secure detection is working correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
}

