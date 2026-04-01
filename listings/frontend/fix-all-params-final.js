/**
 * Final script to fix all missing await params in Next.js 16 route handlers
 * More robust: finds ALL files with params.xxx and fixes them systematically
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
  
  // Find all uses of params.xxx
  const paramUsagePattern = /params\.(\w+)/g;
  const matches = [...content.matchAll(paramUsagePattern)];
  
  if (matches.length === 0) {
    return false; // No params usage found
  }
  
  // Extract unique param names
  const paramNames = [...new Set(matches.map(m => m[1]))];
  
  // Find all async function definitions (GET, POST, PUT, DELETE, PATCH)
  // Match: export async function METHOD(request, { params }: { params: Promise<{...}> })
  const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\{[^}]*params[^}]*\}\)[^{]*\{/gs;
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
    
    // Find where to insert (after opening brace)
    let insertPos = openingBrace + 1;
    
    // Skip whitespace and newlines
    while (insertPos < content.length && /\s/.test(content[insertPos])) {
      insertPos++;
    }
    
    // Get indentation - look at the first non-empty line after the brace
    let lineStart = openingBrace + 1;
    while (lineStart < content.length && content[lineStart] !== '\n' && /\s/.test(content[lineStart])) {
      lineStart++;
    }
    const indentMatch = content.substring(openingBrace + 1, lineStart + 20).match(/^(\s+)/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    
    // Check if await params already exists in this function
    // Look ahead to find the function body
    let braceCount = 1;
    let functionEnd = openingBrace + 1;
    let inString = false;
    let stringChar = null;
    let inComment = false;
    
    while (functionEnd < content.length && braceCount > 0) {
      const char = content[functionEnd];
      const prevChar = functionEnd > 0 ? content[functionEnd - 1] : '';
      
      // Handle strings
      if (!inString && !inComment && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = null;
      }
      // Handle comments
      else if (!inString && !inComment && char === '/' && content[functionEnd + 1] === '/') {
        inComment = true;
      } else if (inComment && char === '\n') {
        inComment = false;
      }
      // Handle braces
      else if (!inString && !inComment) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      functionEnd++;
    }
    
    const functionBody = content.substring(insertPos, functionEnd - 1);
    
    // Check if await params already exists
    if (functionBody.match(/const\s+\{[^}]*\}\s*=\s*await\s+params\s*[;]/)) {
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




