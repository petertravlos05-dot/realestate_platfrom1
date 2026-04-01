/**
 * Script για να βρούμε όλα τα fetch('/api/...') calls στο frontend
 * Τρέξτε: node backend/find-frontend-api-calls.js
 */

const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'listings', 'frontend', 'src');

function findApiCalls(dir, results = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
        findApiCalls(filePath, results);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find fetch('/api/...') calls
      const fetchRegex = /fetch\(['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = fetchRegex.exec(content)) !== null) {
        const url = match[1];
        if (url.startsWith('/api/')) {
          results.push({
            file: filePath.replace(frontendDir, ''),
            url: url,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
  }

  return results;
}

console.log('🔍 Αναζήτηση fetch("/api/...") calls στο frontend...\n');

const results = findApiCalls(frontendDir);

if (results.length === 0) {
  console.log('✅ Δεν βρέθηκαν fetch("/api/...") calls');
} else {
  console.log(`📋 Βρέθηκαν ${results.length} fetch calls:\n`);
  
  // Group by endpoint
  const grouped = {};
  results.forEach(result => {
    if (!grouped[result.url]) {
      grouped[result.url] = [];
    }
    grouped[result.url].push(result);
  });

  // Print grouped results
  Object.keys(grouped).sort().forEach(url => {
    console.log(`\n📍 ${url}`);
    grouped[url].forEach(result => {
      console.log(`   └─ ${result.file}:${result.line}`);
    });
  });

  console.log(`\n\n📝 Συνολικά: ${results.length} calls σε ${Object.keys(grouped).length} διαφορετικά endpoints`);
  console.log('\n💡 Οδηγίες:');
  console.log('   1. Αντικαταστήστε fetch("/api/...") με fetchFromBackend("/...")');
  console.log('   2. Για FormData, χρησιμοποιήστε uploadToBackend("/...", formData)');
  console.log('   3. Για JSON requests, χρησιμοποιήστε apiClient.get/post/put/delete("/...")');
}





















