/**
 * Test script to verify file upload security
 * 
 * Usage:
 *   node scripts/test-file-upload.js
 * 
 * Make sure backend is running on http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_ENDPOINT = `${BACKEND_URL}/api/properties/images`;

console.log('📁 Testing File Upload Security');
console.log(`Target: ${TEST_ENDPOINT}\n`);

// Create test files
const testFilesDir = path.join(__dirname, '..', 'test-files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

// Create a valid JPEG file (minimal valid JPEG)
const validJpegBuffer = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
]);

// Create a fake PHP file (should be rejected)
const fakePhpBuffer = Buffer.from('<?php echo "hack"; ?>');

// Create a file with forbidden extension but valid image content (should be rejected)
const maliciousImageBuffer = validJpegBuffer;

function createMultipartFormData(fileBuffer, filename, fieldName = 'file') {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
  const CRLF = '\r\n';
  
  let body = '';
  body += `--${boundary}${CRLF}`;
  body += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${CRLF}`;
  body += `Content-Type: image/jpeg${CRLF}${CRLF}`;
  
  const bodyBuffer = Buffer.concat([
    Buffer.from(body, 'utf8'),
    fileBuffer,
    Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8')
  ]);
  
  return {
    body: bodyBuffer,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function testFileUpload(fileBuffer, filename, description, expectedStatus = 200) {
  return new Promise((resolve) => {
    const formData = createMultipartFormData(fileBuffer, filename);
    const url = new URL(BACKEND_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: '/api/properties/images',
      method: 'POST',
      headers: {
        'Content-Type': formData.contentType,
        'Content-Length': formData.body.length,
        'Authorization': 'Bearer test-token', // You may need a valid token
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const success = res.statusCode === expectedStatus;
        const statusIcon = success ? '✅' : '❌';
        console.log(`${statusIcon} ${description}`);
        console.log(`   Status: ${res.statusCode} (expected: ${expectedStatus})`);
        
        if (res.statusCode !== expectedStatus) {
          try {
            const json = JSON.parse(data);
            console.log(`   Error: ${json.error || 'Unknown error'}`);
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}`);
          }
        }
        console.log('');
        
        resolve({ success, statusCode: res.statusCode });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}\n`);
      resolve({ success: false, error: error.message });
    });

    req.write(formData.body);
    req.end();
  });
}

async function runTests() {
  console.log('Running file upload security tests...\n');

  // Test 1: Valid JPEG file
  await testFileUpload(
    validJpegBuffer,
    'test.jpg',
    'Test 1: Valid JPEG file',
    200 // Should succeed (or 401 if auth required)
  );

  // Test 2: PHP file (should be rejected)
  await testFileUpload(
    fakePhpBuffer,
    'malicious.php',
    'Test 2: PHP file (should be rejected)',
    400
  );

  // Test 3: File with .exe extension (should be rejected)
  await testFileUpload(
    validJpegBuffer,
    'malicious.exe',
    'Test 3: Executable file extension (should be rejected)',
    400
  );

  // Test 4: File with path traversal in filename (should be sanitized)
  await testFileUpload(
    validJpegBuffer,
    '../../../etc/passwd.jpg',
    'Test 4: Path traversal in filename (should be sanitized)',
    200 // Should succeed but filename sanitized
  );

  // Test 5: Large file (should be rejected if > 10MB)
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  validJpegBuffer.copy(largeBuffer, 0);
  await testFileUpload(
    largeBuffer,
    'large.jpg',
    'Test 5: Large file > 10MB (should be rejected)',
    400
  );

  console.log('📊 File upload security tests completed!');
  console.log('\nNote: Some tests may fail with 401 (Unauthorized) if authentication is required.');
  console.log('This is expected - the important thing is that forbidden file types are rejected.');
}

runTests().catch(console.error);





