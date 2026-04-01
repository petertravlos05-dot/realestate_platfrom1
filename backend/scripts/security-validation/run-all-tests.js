#!/usr/bin/env node

/**
 * Security Validation Pack - Run All Tests
 * 
 * Runs all security smoke tests to verify:
 * - Rate limiting (no production bypass)
 * - IDOR/BOLA protection
 * - Security headers
 * - File upload security
 * - Log sanitization
 * 
 * Usage:
 *   node scripts/security-validation/run-all-tests.js [--base-url=http://localhost:3001]
 */

const { execSync } = require('child_process');
const path = require('path');

const BASE_URL = process.env.BASE_URL || process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3001';

console.log('🔒 Security Validation Pack');
console.log('==========================\n');
console.log(`Base URL: ${BASE_URL}\n`);

const tests = [
  { name: 'Rate Limit Tests', script: 'test-rate-limits.js' },
  { name: 'IDOR/BOLA Tests', script: 'test-idor.js' },
  { name: 'Security Headers', script: 'test-headers.js' },
  { name: 'File Upload Security', script: 'test-upload-security.js' },
  { name: 'Log Sanitization', script: 'test-auth-sanitization.js' },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n📋 Running: ${test.name}`);
  console.log('─'.repeat(50));
  
  try {
    const scriptPath = path.join(__dirname, test.script);
    execSync(`node "${scriptPath}" --base-url=${BASE_URL}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..'),
    });
    console.log(`✅ ${test.name}: PASSED\n`);
    passed++;
  } catch (error) {
    console.error(`❌ ${test.name}: FAILED\n`);
    failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📋 Total:  ${tests.length}`);

if (failed > 0) {
  console.log('\n⚠️  Some tests failed. Review the output above.');
  process.exit(1);
} else {
  console.log('\n✅ All security tests passed!');
  process.exit(0);
}



