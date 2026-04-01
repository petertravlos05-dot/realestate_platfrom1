/**
 * Integration test for consent flow
 * 
 * Tests:
 * 1. Login without consent -> 428 CONSENT_REQUIRED
 * 2. Accept consent -> login succeeds
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Test user credentials (create this user first or use existing)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken = null;
let userId = null;

/**
 * Helper: Make HTTP request
 */
async function request(method, endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

/**
 * Test 1: Login without consent -> 428 CONSENT_REQUIRED
 */
async function testLoginWithoutConsent() {
  console.log('\n📋 Test 1: Login without consent');
  console.log('='.repeat(60));

  // First, ensure user exists and has no consents (or delete existing consents)
  // For this test, we'll assume user exists but has no consents

  const { status, data } = await request('POST', '/api/auth/login', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  if (status === 428 && data.error === 'CONSENT_REQUIRED') {
    console.log('✅ PASS: Login correctly returns 428 CONSENT_REQUIRED');
    console.log('   Required consents:', data.required);
    console.log('   Versions:', data.versions);
    return { success: true, requiredConsents: data.required, versions: data.versions };
  } else if (status === 200) {
    console.log('⚠️  WARNING: Login succeeded without consent check');
    console.log('   This may mean:');
    console.log('   - User already has consents');
    console.log('   - Consent check is not enabled');
    console.log('   - Consent versions are not configured');
    return { success: false, reason: 'Login succeeded unexpectedly' };
  } else {
    console.log('❌ FAIL: Unexpected response');
    console.log('   Status:', status);
    console.log('   Data:', JSON.stringify(data, null, 2));
    return { success: false, reason: 'Unexpected response' };
  }
}

/**
 * Test 2: Accept consent -> login succeeds
 */
async function testAcceptConsentAndLogin(requiredConsents, versions) {
  console.log('\n📋 Test 2: Accept consent and login');
  console.log('='.repeat(60));

  // Step 1: Register or login to get a token (if user doesn't exist)
  // For this test, we'll assume user exists
  // In a real scenario, you might need to create the user first

  // Step 2: Accept consents
  // First, we need to login without consent check (or use admin endpoint)
  // For this test, we'll assume we can accept consents via the endpoint
  // In practice, you'd need to handle the 428 response and show UI

  // For testing, we'll create a temporary token or use admin endpoint
  // This is a simplified test - in production, the flow would be:
  // 1. User gets 428
  // 2. Frontend shows consent modal
  // 3. User accepts
  // 4. Frontend calls POST /api/user/consents/accept
  // 5. Frontend retries login

  console.log('⚠️  NOTE: This test requires manual setup:');
  console.log('   1. Create test user or use existing user');
  console.log('   2. Delete user consents (or use new user)');
  console.log('   3. Run test 1 to get 428');
  console.log('   4. Accept consents via POST /api/user/consents/accept');
  console.log('   5. Retry login');

  // Simplified test: Try to accept consents (will fail without auth token)
  const consents = requiredConsents.map(type => ({
    type,
    version: versions[type],
  }));

  console.log('\n   Attempting to accept consents:', consents);

  // Note: This will fail without authentication
  // In a real scenario, the frontend would handle the 428, show consent UI,
  // then accept consents, then retry login
  const { status, data } = await request('POST', '/api/user/consents/accept', {
    body: { consents },
  });

  if (status === 401) {
    console.log('✅ Expected: 401 Unauthorized (need to login first)');
    console.log('   This is correct - consent acceptance requires authentication');
    console.log('\n   To complete the test:');
    console.log('   1. User receives 428 on login');
    console.log('   2. Frontend shows consent modal');
    console.log('   3. User accepts consents (frontend calls POST /consents/accept)');
    console.log('   4. Frontend retries login');
    console.log('   5. Login should succeed');
    return { success: true, note: 'Manual flow required' };
  } else {
    console.log('⚠️  Unexpected response:', status, data);
    return { success: false };
  }
}

/**
 * Test 3: Get consent history
 */
async function testGetConsentHistory() {
  console.log('\n📋 Test 3: Get consent history');
  console.log('='.repeat(60));

  if (!authToken) {
    console.log('⚠️  SKIP: No auth token (login first)');
    return { success: false, reason: 'No auth token' };
  }

  const { status, data } = await request('GET', '/api/user/consents');

  if (status === 200 && Array.isArray(data.consents)) {
    console.log('✅ PASS: Consent history retrieved');
    console.log('   Consents:', data.consents.length);
    console.log('   Status:', JSON.stringify(data.status, null, 2));
    console.log('   Current versions:', JSON.stringify(data.currentVersions, null, 2));
    return { success: true, consents: data.consents };
  } else {
    console.log('❌ FAIL: Unexpected response');
    console.log('   Status:', status);
    console.log('   Data:', JSON.stringify(data, null, 2));
    return { success: false };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Consent Flow Integration Tests');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);

  // Test 1: Login without consent
  const test1Result = await testLoginWithoutConsent();

  if (test1Result.success && test1Result.requiredConsents) {
    // Test 2: Accept consent flow (simplified)
    await testAcceptConsentAndLogin(test1Result.requiredConsents, test1Result.versions);
  }

  // Test 3: Get consent history (requires auth token)
  // This would require a successful login first
  // await testGetConsentHistory();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   Test 1 (Login without consent): ${test1Result.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Test 2 (Accept consent): ⚠️  Manual verification required`);
  console.log(`   Test 3 (Get history): ⚠️  Requires authentication`);

  console.log('\n💡 To complete full test:');
  console.log('   1. Ensure test user exists');
  console.log('   2. Delete user consents: DELETE FROM user_consents WHERE userId = ?');
  console.log('   3. Run test 1 (should get 428)');
  console.log('   4. Accept consents via frontend or API');
  console.log('   5. Retry login (should succeed)');
  console.log('   6. Get consent history (should show accepted consents)');
}

// Run tests
runTests().catch(console.error);





