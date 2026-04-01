/**
 * Script to fix missing await params in Next.js 16 route handlers
 * Finds all uses of params.id, params.property_id, etc. and adds await params
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
  let modified = false;
  
  // Check if file has Promise<{ ... }> params
  const hasPromiseParams = /params.*:.*Promise<\{[^}]+\}>/.test(content);
  
  if (!hasPromiseParams) {
    return false; // Skip files without Promise params
  }
  
  // Find all uses of params.xxx
  const paramUsagePattern = /params\.(\w+)/g;
  const matches = [...content.matchAll(paramUsagePattern)];
  
  if (matches.length === 0) {
    return false; // No params usage found
  }
  
  // Extract param names
  const paramNames = [...new Set(matches.map(m => m[1]))];
  
  // Check if await params already exists
  const awaitPattern = new RegExp(`const\\s+\\{[^}]*${paramNames[0]}[^}]*\\}\\s*=\\s*await\\s+params`, 's');
  if (awaitPattern.test(content)) {
    return false; // Already has await params
  }
  
  // Find all functions that use params
  const functionPattern = /(export\s+(async\s+)?function\s+\w+\s*\([^)]*\{[^}]*params[^}]*\}\)[^{]*\{)/gs;
  const functionMatches = [...content.matchAll(functionPattern)];
  
  if (functionMatches.length === 0) {
    return false;
  }
  
  // Process each function
  for (const functionMatch of functionMatches) {
    const functionStart = functionMatch.index + functionMatch[0].length;
    const openingBrace = content.indexOf('{', functionStart);
    
    if (openingBrace === -1) {
      continue;
    }
    
    // Find the first non-whitespace line after the opening brace
    let insertPos = openingBrace + 1;
    while (insertPos < content.length && /\s/.test(content[insertPos])) {
      if (content[insertPos] === '\n') {
        insertPos++;
        break;
      }
      insertPos++;
    }
    
    // Get indentation
    const indentMatch = content.substring(openingBrace + 1, insertPos).match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    
    // Check if await params already exists in this function
    const functionEnd = content.indexOf('\n}', insertPos);
    const functionBody = functionEnd !== -1 ? content.substring(insertPos, functionEnd) : content.substring(insertPos);
    if (functionBody.includes('await params') || functionBody.includes('= await params')) {
      continue; // Already has await params
    }
    
    // Create the destructuring line
    const paramList = paramNames.join(', ');
    const awaitLine = `\n${indent}const { ${paramList} } = await params;`;
    
    // Insert the await params line
    content = content.substring(0, insertPos) + awaitLine + content.substring(insertPos);
    modified = true;
    
    // Update insertPos for next function
    insertPos += awaitLine.length;
  }
  
  // Replace all params.xxx with just xxx
  for (const paramName of paramNames) {
    const regex = new RegExp(`params\\.${paramName}`, 'g');
    content = content.replace(regex, paramName);
  }
  
  if (modified) {
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

