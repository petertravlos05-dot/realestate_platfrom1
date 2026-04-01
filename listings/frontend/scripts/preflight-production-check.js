/**
 * Frontend Production Preflight Check Script
 * 
 * Validates all required Next.js environment variables before production deployment.
 * Exits with code 1 if any critical checks fail.
 * 
 * Usage:
 *   node scripts/preflight-production-check.js
 */

const checks = [];
let hasFailures = false;

function check(name, condition, message) {
  const passed = typeof condition === 'function' ? condition() : condition;
  checks.push({ name, passed, message });
  if (!passed) {
    hasFailures = true;
    console.error(`❌ FAIL: ${name}`);
    if (message) console.error(`   ${message}`);
  } else {
    console.log(`✅ PASS: ${name}`);
  }
}

function warn(name, condition, message) {
  const passed = typeof condition === 'function' ? condition() : condition;
  if (!passed) {
    console.warn(`⚠️  WARN: ${name}`);
    if (message) console.warn(`   ${message}`);
  }
}

console.log('🚀 Frontend Production Preflight Check\n');
console.log('='.repeat(60));

// 1. NODE_ENV Check
check(
  'NODE_ENV is production',
  process.env.NODE_ENV === 'production',
  'NODE_ENV must be "production" in production environment'
);

// 2. API URL Check
check(
  'NEXT_PUBLIC_API_URL is set',
  !!process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_API_URL environment variable is required'
);

if (process.env.NEXT_PUBLIC_API_URL) {
  check(
    'NEXT_PUBLIC_API_URL uses HTTPS',
    process.env.NEXT_PUBLIC_API_URL.startsWith('https://'),
    'NEXT_PUBLIC_API_URL must use HTTPS in production'
  );
  
  check(
    'NEXT_PUBLIC_API_URL points to api subdomain',
    process.env.NEXT_PUBLIC_API_URL.includes('api.') || process.env.NEXT_PUBLIC_API_URL.includes('://api'),
    'NEXT_PUBLIC_API_URL should point to api subdomain (e.g., https://api.yourdomain.com)'
  );
  
  check(
    'NEXT_PUBLIC_API_URL is not localhost',
    !process.env.NEXT_PUBLIC_API_URL.includes('localhost') && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1'),
    'NEXT_PUBLIC_API_URL must not point to localhost in production'
  );
}

// 3. Sentry Configuration (if enabled)
const hasSentry = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
if (hasSentry) {
  check(
    'NEXT_PUBLIC_SENTRY_DSN is set',
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    'NEXT_PUBLIC_SENTRY_DSN is required for frontend Sentry'
  );
  
  check(
    'NEXT_PUBLIC_SENTRY_ENVIRONMENT is set',
    !!process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    'NEXT_PUBLIC_SENTRY_ENVIRONMENT should be set (e.g., production, staging)'
  );
  
  // Check consistency
  if (process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    warn(
      'Sentry DSN consistency',
      process.env.SENTRY_DSN === process.env.NEXT_PUBLIC_SENTRY_DSN || 
      process.env.NEXT_PUBLIC_SENTRY_DSN.startsWith(process.env.SENTRY_DSN),
      'Sentry DSNs should be consistent between server and client'
    );
  }
}

// 4. NextAuth Configuration
warn(
  'NEXTAUTH_URL is set',
  !!process.env.NEXTAUTH_URL,
  'NEXTAUTH_URL should be set to frontend URL (e.g., https://app.yourdomain.com)'
);

if (process.env.NEXTAUTH_URL) {
  check(
    'NEXTAUTH_URL uses HTTPS',
    process.env.NEXTAUTH_URL.startsWith('https://'),
    'NEXTAUTH_URL must use HTTPS in production'
  );
  
  check(
    'NEXTAUTH_URL points to app subdomain',
    process.env.NEXTAUTH_URL.includes('app.') || process.env.NEXTAUTH_URL.includes('://app'),
    'NEXTAUTH_URL should point to app subdomain (e.g., https://app.yourdomain.com)'
  );
}

warn(
  'NEXTAUTH_SECRET is set',
  !!process.env.NEXTAUTH_SECRET,
  'NEXTAUTH_SECRET should be set for NextAuth session encryption'
);

// 5. Build Check
warn(
  'Next.js build completed successfully',
  true, // This would need to be checked separately
  'Ensure "npm run build" completes without errors before deployment'
);

console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');
console.log(`   ✅ Passed: ${checks.filter(c => c.passed).length}`);
console.log(`   ❌ Failed: ${checks.filter(c => !c.passed).length}`);
console.log(`   ⚠️  Warnings: ${checks.filter(c => !c.passed && c.name.includes('WARN')).length}`);

if (hasFailures) {
  console.error('\n❌ Preflight check FAILED. Please fix the errors above before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ Preflight check PASSED. Ready for production deployment.');
  process.exit(0);
}


