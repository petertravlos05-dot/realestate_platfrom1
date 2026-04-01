/**
 * Script to fix all missing await params in Next.js 16 route handlers
 * More aggressive approach: finds all params.xxx and fixes them
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function findRouteFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixRouteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file has Promise<{ ... }> params
  const hasPromiseParams = /params.*:.*Promise<\{[^}]+\}>/.test(content);
  
  if (!hasPromiseParams) {
    return false; // Skip files without Promise params
  }
  
  // Find all uses of params.xxx (not in comments or strings)
  const paramUsagePattern = /params\.(\w+)/g;
  const matches = [...content.matchAll(paramUsagePattern)];
  
  if (matches.length === 0) {
    return false; // No params usage found
  }
  
  // Extract unique param names
  const paramNames = [...new Set(matches.map(m => m[1]))];
  
  // Find all async function definitions (GET, POST, PUT, DELETE, PATCH)
  const functionPattern = /(export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\{[^}]*params[^}]*\}\)[^{]*\{)/gs;
  const functionMatches = [...content.matchAll(functionPattern)];
  
  if (functionMatches.length === 0) {
    return false;
  }
  
  let modified = false;
  
  // Process functions in reverse order to maintain positions
  for (let i = functionMatches.length - 1; i >= 0; i--) {
    const functionMatch = functionMatches[i];
    const functionStart = functionMatch.index + functionMatch[0].length;
    const openingBrace = content.indexOf('{', functionStart);
    
    if (openingBrace === -1) {
      continue;
    }
    
    // Find the first line after the opening brace
    let insertPos = openingBrace + 1;
    while (insertPos < content.length && (content[insertPos] === ' ' || content[insertPos] === '\t')) {
      insertPos++;
    }
    if (content[insertPos] === '\n') {
      insertPos++;
    }
    
    // Get indentation from the line after opening brace
    const lineAfterBrace = content.substring(openingBrace + 1, openingBrace + 100);
    const indentMatch = lineAfterBrace.match(/^(\s+)/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    
    // Check if await params already exists in this function
    // Find the end of this function (next closing brace at same level)
    let braceCount = 1;
    let functionEnd = openingBrace + 1;
    let inString = false;
    let stringChar = null;
    
    while (functionEnd < content.length && braceCount > 0) {
      const char = content[functionEnd];
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[functionEnd - 1] !== '\\') {
        inString = false;
        stringChar = null;
      } else if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      functionEnd++;
    }
    
    const functionBody = content.substring(insertPos, functionEnd - 1);
    if (functionBody.includes('await params') || functionBody.match(/const\s+\{[^}]*\}\s*=\s*await\s+params/)) {
      continue; // Already has await params
    }
    
    // Create the destructuring line
    const paramList = paramNames.join(', ');
    const awaitLine = `\n${indent}const { ${paramList} } = await params;`;
    
    // Insert the await params line
    content = content.substring(0, insertPos) + awaitLine + content.substring(insertPos);
    modified = true;
  }
  
  // Replace all params.xxx with just xxx (only if we added await params)
  if (modified) {
    for (const paramName of paramNames) {
      // Only replace if it's not already part of a destructuring
      const regex = new RegExp(`\\bparams\\.${paramName}\\b`, 'g');
      content = content.replace(regex, paramName);
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Find all route files
const routeFiles = findRouteFiles(apiDir);
console.log(`Found ${routeFiles.length} route files`);

let fixedCount = 0;
for (const file of routeFiles) {
  if (fixRouteFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} route files`);




