/**
 * Script to fix Next.js 16 route handler params
 * Changes params from { params: { id: string } } to { params: Promise<{ id: string }> }
 * and adds await params
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  
  // Pattern 1: { params }: { params: { id: string } }
  const pattern1 = /\{ params \}: \{ params: \{ ([^}]+): string \} \}/g;
  const matches1 = [...content.matchAll(pattern1)];
  
  for (const match of matches1) {
    const paramName = match[1].trim();
    const oldPattern = `{ params }: { params: { ${paramName}: string } }`;
    const newPattern = `{ params }: { params: Promise<{ ${paramName}: string }> }`;
    
    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      modified = true;
      
      // Find where params is used and add await
      // Pattern: const { id } = params; or params.id
      const paramVar = paramName.split(':')[0].trim();
      
      // Replace direct usage like params.id with await params
      const directUsagePattern = new RegExp(`params\\.${paramVar}`, 'g');
      if (content.match(directUsagePattern)) {
        // First, add const { id } = await params; after the function signature
        const functionMatch = content.match(/(export\s+(async\s+)?function\s+\w+\s*\([^)]*\{[^}]*params[^}]*\}\)[^{]*\{)/);
        if (functionMatch) {
          const afterFunction = content.indexOf('{', functionMatch.index + functionMatch[0].length);
          if (afterFunction !== -1) {
            const nextLine = content.indexOf('\n', afterFunction);
            if (nextLine !== -1) {
              const indent = content.substring(afterFunction + 1, nextLine).match(/^\s*/)?.[0] || '';
              const awaitLine = `\n${indent}const { ${paramVar} } = await params;`;
              
              // Check if already exists
              if (!content.includes(`const { ${paramVar} } = await params;`)) {
                content = content.substring(0, nextLine + 1) + awaitLine + content.substring(nextLine + 1);
                // Replace all params.id with just id
                content = content.replace(new RegExp(`params\\.${paramVar}`, 'g'), paramVar);
                modified = true;
              }
            }
          }
        }
      }
    }
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




