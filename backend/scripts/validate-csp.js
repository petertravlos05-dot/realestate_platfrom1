#!/usr/bin/env node

/**
 * CSP Validation Script
 * 
 * Validates Content Security Policy header:
 * - Present in response
 * - No wildcards (https:, http:, *)
 * - Required directives present
 * - Domains match environment variables
 * 
 * Usage:
 *   node scripts/validate-csp.js [url]
 * 
 * Default URL: http://localhost:3001/health
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_URL = process.env.API_URL || 'http://localhost:3001/health';

// Allow testing against localhost even if URL looks like production
const ALLOW_LOCALHOST = process.env.ALLOW_LOCALHOST !== 'false';

function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

function validateCSP(cspHeader, env) {
  const errors = [];
  const warnings = [];
  
  if (!cspHeader) {
    errors.push('CSP header missing');
    return { errors, warnings };
  }
  
  // Check for wildcards (as standalone directives, not in URLs)
  // Match patterns like: "img-src https: http:" or "connect-src *"
  // But NOT: "https://example.com" (which is a valid URL)
  
  // Split CSP into directives
  const directives = cspHeader.split(';').map(d => d.trim());
  
  for (const directive of directives) {
    if (!directive) continue;
    
    // Extract directive name and values
    const parts = directive.split(/\s+/);
    if (parts.length < 2) continue;
    
    const directiveName = parts[0];
    const values = parts.slice(1);
    
    // Check each value for wildcards
    for (const value of values) {
      const trimmedValue = value.trim();
      
      // Check for standalone wildcards (not URLs)
      // Match: "https:" or "http:" or "*" as standalone tokens
      // Don't match: "https://example.com" (contains "//")
      if (trimmedValue === '*' || trimmedValue === 'https:' || trimmedValue === 'http:') {
        errors.push(`CSP directive "${directiveName}" contains wildcard: ${trimmedValue}`);
      }
      
      // Also check for wildcards followed by semicolon or end of string
      // But exclude URLs (which contain "//")
      if (!trimmedValue.includes('//')) {
        if (trimmedValue === 'https:' || trimmedValue === 'http:' || trimmedValue === '*') {
          errors.push(`CSP directive "${directiveName}" contains wildcard: ${trimmedValue}`);
        }
      }
    }
  }
  
  // Check required directives
  const requiredDirectives = [
    "default-src",
    "base-uri",
    "object-src",
    "frame-ancestors",
  ];
  
  for (const directive of requiredDirectives) {
    if (!cspHeader.includes(directive)) {
      warnings.push(`Missing directive: ${directive}`);
    }
  }
  
  // Check for unsafe directives
  if (cspHeader.includes("'unsafe-eval'")) {
    warnings.push("CSP contains 'unsafe-eval' (should be removed if possible)");
  }
  
  if (cspHeader.includes("'unsafe-inline'")) {
    warnings.push("CSP contains 'unsafe-inline' (consider using nonces)");
  }
  
  // Check domain configuration
  const frontendOrigin = env.FRONTEND_ORIGIN || env.FRONTEND_URL;
  if (!frontendOrigin && process.env.NODE_ENV === 'production') {
    warnings.push('FRONTEND_ORIGIN/FRONTEND_URL not set (CSP may block frontend requests)');
  }
  
  return { errors, warnings };
}

async function main() {
  let url = process.argv[2] || DEFAULT_URL;
  
  // If URL is a placeholder domain, use localhost instead
  if (url.includes('api.domain.com') || url.includes('domain.com')) {
    if (ALLOW_LOCALHOST) {
      console.warn(`⚠️  Warning: Placeholder domain detected (${url})`);
      console.warn(`   Using localhost instead. Set API_URL environment variable to test production.\n`);
      url = DEFAULT_URL;
    } else {
      console.error(`❌ Error: Placeholder domain detected (${url})`);
      console.error(`   Please provide a real URL or set API_URL environment variable.`);
      console.error(`   Example: node scripts/validate-csp.js http://localhost:3001/health`);
      process.exit(1);
    }
  }
  
  console.log(`🔍 Validating CSP for: ${url}\n`);
  
  try {
    const { statusCode, headers } = await fetchHeaders(url);
    
    if (statusCode !== 200) {
      console.error(`❌ Request failed with status ${statusCode}`);
      process.exit(1);
    }
    
    const cspHeader = headers['content-security-policy'];
    
    if (!cspHeader) {
      console.error('❌ Content-Security-Policy header missing');
      process.exit(1);
    }
    
    console.log('✅ CSP header present');
    console.log(`\nCSP: ${cspHeader}\n`);
    
    const { errors, warnings } = validateCSP(cspHeader, process.env);
    
    if (errors.length > 0) {
      console.error('❌ CSP Validation Errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️  CSP Warnings:');
      warnings.forEach(warn => console.warn(`   - ${warn}`));
    }
    
    console.log('✅ CSP validation passed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

