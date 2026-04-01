/**
 * Production Preflight Check Script
 * 
 * Validates all required environment variables and configuration before production deployment.
 * Exits with code 1 if any critical checks fail.
 * 
 * Usage:
 *   node scripts/preflight-production-check.js
 * 
 * Or with custom domain:
 *   FRONTEND_ORIGIN=https://app.example.com node scripts/preflight-production-check.js
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

console.log('🚀 Production Preflight Check\n');
console.log('=' .repeat(60));

// 1. NODE_ENV Check
check(
  'NODE_ENV is production',
  process.env.NODE_ENV === 'production',
  'NODE_ENV must be "production" in production environment'
);

// 2. JWT_SECRET Check
check(
  'JWT_SECRET is set',
  !!process.env.JWT_SECRET,
  'JWT_SECRET environment variable is required'
);

check(
  'JWT_SECRET is at least 32 characters',
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
  `JWT_SECRET must be at least 32 characters (current: ${process.env.JWT_SECRET?.length || 0})`
);

// 3. DATABASE_URL Check
check(
  'DATABASE_URL is set',
  !!process.env.DATABASE_URL,
  'DATABASE_URL environment variable is required'
);

check(
  'DATABASE_URL is not a placeholder',
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder'),
  'DATABASE_URL appears to be a placeholder value'
);

// 4. CORS Configuration
const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
check(
  'FRONTEND_ORIGIN or FRONTEND_URL is set',
  !!frontendOrigin,
  'FRONTEND_ORIGIN or FRONTEND_URL must be set for CORS configuration'
);

if (frontendOrigin) {
  const origins = frontendOrigin.split(',').map(o => o.trim());
  
  // Check for wildcards
  check(
    'CORS origins do not contain wildcards',
    !origins.some(o => o.includes('*')),
    'CORS origins must not contain wildcards (*)'
  );
  
  // Check for http in production
  const httpOrigins = origins.filter(o => o.startsWith('http://'));
  check(
    'CORS origins use HTTPS in production',
    httpOrigins.length === 0,
    `Found HTTP origins in production: ${httpOrigins.join(', ')}`
  );
  
  // Check for app.domain.com pattern
  const hasAppDomain = origins.some(o => o.includes('app.') || o.includes('://app'));
  warn(
    'CORS includes app subdomain',
    hasAppDomain,
    'Consider including https://app.yourdomain.com in CORS origins'
  );
  
  // Validate exact origins (no wildcards, no http in prod)
  origins.forEach(origin => {
    if (origin.includes('*')) {
      check(
        `CORS origin "${origin}" does not contain wildcard`,
        false,
        'CORS origins must not contain wildcards (*)'
      );
    }
    if (origin.startsWith('http://')) {
      check(
        `CORS origin "${origin}" uses HTTPS`,
        false,
        'CORS origins must use HTTPS in production'
      );
    }
  });
}

// 5. Cookie Domain Check
warn(
  'COOKIE_DOMAIN is set',
  !!process.env.COOKIE_DOMAIN,
  'COOKIE_DOMAIN should be set for cross-subdomain cookie sharing (e.g., .yourdomain.com)'
);

if (process.env.COOKIE_DOMAIN) {
  check(
    'COOKIE_DOMAIN starts with dot',
    process.env.COOKIE_DOMAIN.startsWith('.'),
    'COOKIE_DOMAIN should start with dot (e.g., .yourdomain.com) for subdomain sharing'
  );
}

// 6. Stripe Configuration (if Stripe is used)
if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET) {
  check(
    'STRIPE_SECRET_KEY is set',
    !!process.env.STRIPE_SECRET_KEY,
    'STRIPE_SECRET_KEY is required if Stripe is enabled'
  );
  
  check(
    'STRIPE_SECRET_KEY starts with sk_',
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'),
    'STRIPE_SECRET_KEY should start with sk_'
  );
  
  warn(
    'STRIPE_WEBHOOK_SECRET is set',
    !!process.env.STRIPE_WEBHOOK_SECRET,
    'STRIPE_WEBHOOK_SECRET should be set for webhook verification'
  );
}

// 7. S3 Configuration (if S3 is used)
const hasS3Config = !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_BUCKET);
if (hasS3Config) {
  check(
    'AWS_S3_BUCKET is set',
    !!process.env.AWS_S3_BUCKET,
    'AWS_S3_BUCKET is required if S3 is configured'
  );
  
  check(
    'AWS_REGION is set',
    !!process.env.AWS_REGION,
    'AWS_REGION is required if S3 is configured'
  );
  
  // Either access keys OR IAM role (for EC2/ECS)
  const hasAccessKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const hasIAMRole = !hasAccessKeys; // If no access keys, assume IAM role
  
  if (!hasIAMRole) {
    check(
      'AWS_ACCESS_KEY_ID is set',
      !!process.env.AWS_ACCESS_KEY_ID,
      'AWS_ACCESS_KEY_ID is required if not using IAM role'
    );
    
    check(
      'AWS_SECRET_ACCESS_KEY is set',
      !!process.env.AWS_SECRET_ACCESS_KEY,
      'AWS_SECRET_ACCESS_KEY is required if not using IAM role'
    );
  }
}

// 8. Admin Endpoints Safety
check(
  'ENABLE_ADMIN_HEALTH is not set (disabled by default)',
  process.env.ENABLE_ADMIN_HEALTH !== 'true',
  'ENABLE_ADMIN_HEALTH should be false in production unless explicitly enabled'
);

// 9. Rate Limiting Safety
check(
  'DISABLE_EXPORT_RATE_LIMIT is not set',
  !process.env.DISABLE_EXPORT_RATE_LIMIT || process.env.DISABLE_EXPORT_RATE_LIMIT !== 'true',
  'DISABLE_EXPORT_RATE_LIMIT must NOT be set in production'
);

// 10. Sentry Configuration (if enabled)
if (process.env.SENTRY_ENABLE === 'true') {
  check(
    'SENTRY_DSN is set',
    !!process.env.SENTRY_DSN,
    'SENTRY_DSN is required if SENTRY_ENABLE is true'
  );
  
  check(
    'SENTRY_ENVIRONMENT is set',
    !!process.env.SENTRY_ENVIRONMENT,
    'SENTRY_ENVIRONMENT should be set (e.g., production, staging)'
  );
}

// 11. Realtime Bus Check
const realtimeBus = process.env.REALTIME_BUS || 'memory';
warn(
  'REALTIME_BUS is memory (single-instance only)',
  realtimeBus === 'memory',
  'REALTIME_BUS=memory requires single backend instance. For multi-instance, use REALTIME_BUS=redis'
);

if (realtimeBus === 'redis') {
  check(
    'REDIS_URL or RATE_LIMIT_REDIS_URL is set',
    !!(process.env.REDIS_URL || process.env.RATE_LIMIT_REDIS_URL),
    'REDIS_URL or RATE_LIMIT_REDIS_URL is required if REALTIME_BUS=redis'
  );
}

// 12. Port Check
const port = process.env.PORT || '5000';
warn(
  'PORT is set',
  !!process.env.PORT,
  `Using default port ${port}. Set PORT env var if different`
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

