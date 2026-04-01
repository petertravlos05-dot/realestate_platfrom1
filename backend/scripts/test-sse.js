/**
 * Test Script for SSE Real-time Updates
 * 
 * Tests:
 * 1. SSE connection establishes successfully
 * 2. Events are received for participants
 * 3. Events are NOT received for non-participants
 * 
 * Usage:
 *   node scripts/test-sse.js <api_url> <userA_token> <userB_token> <dealId>
 * 
 * Example:
 *   node scripts/test-sse.js http://localhost:5000 <tokenA> <tokenB> <dealId>
 */

const API_URL = process.argv[2];
const USER_A_TOKEN = process.argv[3];
const USER_B_TOKEN = process.argv[4];
const DEAL_ID = process.argv[5];

if (!API_URL || !USER_A_TOKEN || !USER_B_TOKEN || !DEAL_ID) {
  console.error('Usage: node scripts/test-sse.js <api_url> <userA_token> <userB_token> <dealId>');
  process.exit(1);
}

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Test: ${name}`);
    fn()
      .then(() => {
        console.log(`✅ PASS: ${name}`);
        testsPassed++;
        resolve();
      })
      .catch((error) => {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${error.message}`);
        testsFailed++;
        resolve();
      });
  });
}

function createSSEConnection(url, token) {
  return new Promise((resolve, reject) => {
    const EventSource = require('eventsource');
    
    const headers = {
      Cookie: `access_token=${token}`,
    };

    const es = new EventSource(url, { headers });

    let snapshotReceived = false;
    let eventReceived = false;
    let errorOccurred = false;

    const timeout = setTimeout(() => {
      es.close();
      if (!snapshotReceived) {
        reject(new Error('Snapshot not received within 10 seconds'));
      } else if (!eventReceived) {
        reject(new Error('Event not received within 10 seconds'));
      } else {
        resolve({ snapshotReceived, eventReceived });
      }
    }, 10000);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'snapshot') {
          snapshotReceived = true;
          console.log(`   📸 Snapshot received:`, data);
        } else {
          eventReceived = true;
          console.log(`   📨 Event received:`, data);
          clearTimeout(timeout);
          es.close();
          resolve({ snapshotReceived, eventReceived });
        }
      } catch (error) {
        console.error(`   ⚠️  Error parsing event:`, error);
      }
    };

    es.onerror = (error) => {
      if (!errorOccurred) {
        errorOccurred = true;
        clearTimeout(timeout);
        es.close();
        reject(new Error(`SSE connection error: ${error.message || 'Unknown error'}`));
      }
    };

    es.onopen = () => {
      console.log(`   🔌 SSE connection opened`);
    };
  });
}

function sendMessage(dealId, threadId, token, body) {
  const axios = require('axios');
  return axios.post(
    `${API_URL}/api/threads/${threadId}/messages`,
    { body },
    {
      headers: {
        Cookie: `access_token=${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
}

async function getDealThreads(dealId, token) {
  const axios = require('axios');
  const response = await axios.get(`${API_URL}/api/deals/${dealId}/threads`, {
    headers: {
      Cookie: `access_token=${token}`,
    },
    withCredentials: true,
  });
  return response.data.threads;
}

async function runTests() {
  console.log('🚀 Starting SSE Tests');
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Deal ID: ${DEAL_ID}`);

  // Test 1: Participant can connect to SSE
  await test('Participant can connect to SSE', async () => {
    const url = `${API_URL}/api/deals/${DEAL_ID}/events`;
    await createSSEConnection(url, USER_A_TOKEN);
  });

  // Test 2: Non-participant cannot connect (403)
  await test('Non-participant cannot connect to SSE', async () => {
    const axios = require('axios');
    const url = `${API_URL}/api/deals/${DEAL_ID}/events`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          Cookie: `access_token=${USER_B_TOKEN}`,
        },
        withCredentials: true,
        validateStatus: () => true, // Don't throw on 403
      });

      if (response.status === 403) {
        return; // Expected
      } else {
        throw new Error(`Expected 403, got ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        return; // Expected
      }
      throw error;
    }
  });

  // Test 3: Participant receives events
  await test('Participant receives events when message sent', async () => {
    // Get GROUP thread
    const threads = await getDealThreads(DEAL_ID, USER_A_TOKEN);
    const groupThread = threads.find((t) => t.type === 'GROUP');
    
    if (!groupThread) {
      throw new Error('GROUP thread not found');
    }

    // Setup SSE connection
    const url = `${API_URL}/api/deals/${DEAL_ID}/events`;
    const connectionPromise = createSSEConnection(url, USER_A_TOKEN);

    // Wait a bit for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send message as USER_B
    await sendMessage(DEAL_ID, groupThread.id, USER_B_TOKEN, 'Test message for SSE');

    // Wait for event
    await connectionPromise;
  });

  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


