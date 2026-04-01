/**
 * Simple script to fix all missing await params in Next.js 16 route handlers
 * Strategy: Find all files with params.xxx, add await params at start, replace all params.xxx with xxx
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
  
  // Find all uses of params.xxx (not in comments)
  const paramUsagePattern = /params\.(\w+)/g;
  const matches = [...content.matchAll(paramUsagePattern)];
  
  if (matches.length === 0) {
    return false; // No params usage found
  }
  
  // Extract unique param names
  const paramNames = [...new Set(matches.map(m => m[1]))];
  
  // Find all async function definitions that have params in signature
  // Match: export async function METHOD(request, { params }: { params: Promise<{...}> })
  const functionPattern = /(export\s+async\s+function\s+\w+\s*\([^)]*\{[^}]*params[^}]*\}\)[^{]*\{)/gs;
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
    
    // Find where to insert (after opening brace, before first statement)
    let insertPos = openingBrace + 1;
    
    // Skip whitespace
    while (insertPos < content.length && /\s/.test(content[insertPos])) {
      insertPos++;
    }
    
    // Get indentation from first non-empty line after brace
    let indentPos = openingBrace + 1;
    while (indentPos < content.length && content[indentPos] !== '\n' && /\s/.test(content[indentPos])) {
      indentPos++;
    }
    const indentMatch = content.substring(openingBrace + 1, indentPos).match(/^(\s+)/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    
    // Check if await params already exists
    // Look for pattern: const { ... } = await params;
    const functionBodyStart = insertPos;
    const nextBrace = content.indexOf('}', functionBodyStart);
    const functionBodyEnd = nextBrace !== -1 ? nextBrace : content.length;
    const functionBody = content.substring(functionBodyStart, functionBodyEnd);
    
    if (functionBody.match(/const\s+\{[^}]*\}\s*=\s*await\s+params/)) {
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
      // Replace params.paramName with paramName (word boundary to avoid partial matches)
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




