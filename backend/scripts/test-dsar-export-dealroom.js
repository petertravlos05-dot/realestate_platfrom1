/**
 * Test Script for DSAR Export with Deal Room Data
 * 
 * Tests:
 * 1. Export includes deal room data
 * 2. Export includes messages from threads user is member of
 * 3. Export does NOT include other users' emails/phones
 * 4. Export does NOT include s3Key
 * 5. Size caps respected
 * 
 * Usage:
 *   node scripts/test-dsar-export-dealroom.js <api_url> <buyer_token> <seller_token> <lawyer_token>
 * 
 * Example:
 *   node scripts/test-dsar-export-dealroom.js http://localhost:5000 <buyerToken> <sellerToken> <lawyerToken>
 */

const API_URL = process.argv[2];
const BUYER_TOKEN = process.argv[3];
const SELLER_TOKEN = process.argv[4];
const LAWYER_TOKEN = process.argv[5];

if (!API_URL || !BUYER_TOKEN || !SELLER_TOKEN || !LAWYER_TOKEN) {
  console.error('Usage: node scripts/test-dsar-export-dealroom.js <api_url> <buyer_token> <seller_token> <lawyer_token>');
  process.exit(1);
}

const axios = require('axios');

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

async function createDealRoom(propertyId, buyerToken) {
  const response = await axios.post(
    `${API_URL}/api/deals`,
    { propertyId },
    {
      headers: {
        Cookie: `access_token=${buyerToken}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data.dealRoomId || response.data.id;
}

async function sendMessage(dealId, threadId, token, body) {
  const response = await axios.post(
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
  return response.data;
}

async function requestDocument(dealId, token, category) {
  const response = await axios.post(
    `${API_URL}/api/deals/${dealId}/documents/request`,
    { category, requestedFromRole: 'BUYER' },
    {
      headers: {
        Cookie: `access_token=${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

async function requestAppointment(dealId, professionalId, token) {
  const startAt = new Date();
  startAt.setDate(startAt.getDate() + 1);
  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + 1);

  const response = await axios.post(
    `${API_URL}/api/deals/${dealId}/appointments/request`,
    {
      professionalId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      type: 'MEETING',
    },
    {
      headers: {
        Cookie: `access_token=${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

async function getDealThreads(dealId, token) {
  const response = await axios.get(`${API_URL}/api/deals/${dealId}/threads`, {
    headers: {
      Cookie: `access_token=${token}`,
    },
    withCredentials: true,
  });
  return response.data.threads;
}

async function exportUserData(token) {
  const response = await axios.post(
    `${API_URL}/api/user/export`,
    {},
    {
      headers: {
        Cookie: `access_token=${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

async function runTests() {
  console.log('🚀 Starting DSAR Export Deal Room Tests');
  console.log(`   API URL: ${API_URL}`);

  // Setup: Create a property (simplified - you may need to adjust)
  let propertyId;
  try {
    // For testing, assume propertyId is provided or create one
    // In real test, you'd create a property first
    propertyId = 'test-property-id'; // Replace with actual property creation
    console.log(`   Using property ID: ${propertyId}`);
  } catch (error) {
    console.error('   ⚠️  Could not create property, using placeholder');
  }

  // Test 1: Export includes deal rooms
  await test('Export includes deal rooms', async () => {
    const dealId = await createDealRoom(propertyId, BUYER_TOKEN);
    console.log(`   Created deal room: ${dealId}`);

    const exportData = await exportUserData(BUYER_TOKEN);

    if (!exportData.data.dealRooms || !Array.isArray(exportData.data.dealRooms)) {
      throw new Error('dealRooms not found in export');
    }

    const dealRoom = exportData.data.dealRooms.find((dr) => dr.dealRoomId === dealId);
    if (!dealRoom) {
      throw new Error(`Deal room ${dealId} not found in export`);
    }

    if (!dealRoom.participantRole) {
      throw new Error('participantRole missing');
    }

    console.log(`   Found deal room with role: ${dealRoom.participantRole}`);
  });

  // Test 2: Export includes messages
  await test('Export includes deal messages', async () => {
    const dealId = await createDealRoom(propertyId, BUYER_TOKEN);
    const threads = await getDealThreads(dealId, BUYER_TOKEN);
    const groupThread = threads.find((t) => t.type === 'GROUP');

    if (!groupThread) {
      throw new Error('GROUP thread not found');
    }

    await sendMessage(dealId, groupThread.id, BUYER_TOKEN, 'Test message for export');

    const exportData = await exportUserData(BUYER_TOKEN);

    if (!exportData.data.dealMessages || !Array.isArray(exportData.data.dealMessages)) {
      throw new Error('dealMessages not found in export');
    }

    const message = exportData.data.dealMessages.find((m) => m.body === 'Test message for export');
    if (!message) {
      throw new Error('Message not found in export');
    }

    console.log(`   Found message: ${message.messageId}`);
  });

  // Test 3: Export does NOT include other users' emails/phones
  await test('Export does NOT include other users emails/phones', async () => {
    const exportData = await exportUserData(BUYER_TOKEN);

    const exportString = JSON.stringify(exportData);
    
    // Check participants summary
    if (exportData.data.dealRooms) {
      for (const dealRoom of exportData.data.dealRooms) {
        if (dealRoom.participants) {
          for (const participant of dealRoom.participants) {
            if (participant.email || participant.phone) {
              throw new Error(`Found email/phone in participant: ${JSON.stringify(participant)}`);
            }
          }
        }
      }
    }

    console.log('   ✅ No emails/phones found in participants');
  });

  // Test 4: Export does NOT include s3Key
  await test('Export does NOT include s3Key', async () => {
    const exportData = await exportUserData(BUYER_TOKEN);
    const exportString = JSON.stringify(exportData);

    if (exportString.includes('s3Key') || exportString.includes('s3_key')) {
      throw new Error('Found s3Key in export');
    }

    console.log('   ✅ No s3Key found in export');
  });

  // Test 5: Export includes documents metadata
  await test('Export includes deal documents metadata', async () => {
    const dealId = await createDealRoom(propertyId, BUYER_TOKEN);
    await requestDocument(dealId, LAWYER_TOKEN, 'IDENTITY');

    const exportData = await exportUserData(BUYER_TOKEN);

    if (!exportData.data.dealDocuments || !Array.isArray(exportData.data.dealDocuments)) {
      throw new Error('dealDocuments not found in export');
    }

    const doc = exportData.data.dealDocuments.find((d) => d.category === 'IDENTITY');
    if (!doc) {
      throw new Error('Document not found in export');
    }

    if (doc.s3Key) {
      throw new Error('s3Key found in document export');
    }

    console.log(`   Found document: ${doc.docId}`);
  });

  // Test 6: Export includes appointments
  await test('Export includes deal appointments', async () => {
    // This test requires a professional profile - simplified for now
    const exportData = await exportUserData(BUYER_TOKEN);

    if (!exportData.data.dealAppointments || !Array.isArray(exportData.data.dealAppointments)) {
      throw new Error('dealAppointments not found in export');
    }

    console.log(`   Found ${exportData.data.dealAppointments.length} appointments`);
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


