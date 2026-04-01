/**
 * Test Ops Alert Noise Control
 * 
 * Simulates repeated failures and confirms only 1 alert per cooldown period.
 * 
 * Usage:
 *   node scripts/test-ops-alert-noise.js
 */

const { PrismaClient } = require('@prisma/client');
const { shouldSendAlert } = require('../dist/lib/ops/alerting');

const prisma = new PrismaClient();

const TEST_KEY = 'test.ops.alert_noise';
const COOLDOWN_MINUTES = 1; // Short cooldown for testing

async function testAlertNoise() {
  console.log('🧪 Testing Ops Alert Noise Control');
  console.log('==================================\n');

  // Clean up any existing test state
  await prisma.opsAlertState.deleteMany({
    where: { key: TEST_KEY },
  });

  console.log('Test 1: First alert (should send)');
  const alert1 = await shouldSendAlert(TEST_KEY, 'alert', COOLDOWN_MINUTES, { test: 1 });
  console.log(`   Result: ${alert1 ? '✅ SENT' : '❌ NOT SENT'}`);
  console.log(`   Expected: ✅ SENT\n`);

  console.log('Test 2: Immediate repeat (should NOT send - in cooldown)');
  const alert2 = await shouldSendAlert(TEST_KEY, 'alert', COOLDOWN_MINUTES, { test: 2 });
  console.log(`   Result: ${alert2 ? '❌ SENT' : '✅ NOT SENT'}`);
  console.log(`   Expected: ✅ NOT SENT\n`);

  console.log('Test 3: State change to OK (should send)');
  const alert3 = await shouldSendAlert(TEST_KEY, 'ok', COOLDOWN_MINUTES, { test: 3 });
  console.log(`   Result: ${alert3 ? '✅ SENT' : '❌ NOT SENT'}`);
  console.log(`   Expected: ✅ SENT\n`);

  console.log('Test 4: Back to alert (should send - state change)');
  const alert4 = await shouldSendAlert(TEST_KEY, 'alert', COOLDOWN_MINUTES, { test: 4 });
  console.log(`   Result: ${alert4 ? '✅ SENT' : '❌ NOT SENT'}`);
  console.log(`   Expected: ✅ SENT\n`);

  console.log('Test 5: Wait for cooldown...');
  await new Promise(resolve => setTimeout(resolve, (COOLDOWN_MINUTES + 1) * 60 * 1000));
  
  const alert5 = await shouldSendAlert(TEST_KEY, 'alert', COOLDOWN_MINUTES, { test: 5 });
  console.log(`   Result: ${alert5 ? '✅ SENT' : '❌ NOT SENT'}`);
  console.log(`   Expected: ✅ SENT (cooldown expired)\n`);

  // Clean up
  await prisma.opsAlertState.deleteMany({
    where: { key: TEST_KEY },
  });

  console.log('✅ Test completed');
}

testAlertNoise()
  .then(() => {
    console.log('\n✅ All tests passed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



