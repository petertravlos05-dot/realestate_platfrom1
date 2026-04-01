/**
 * Validate .env file configuration
 * 
 * Usage:
 *   node scripts/validate-env.js
 * 
 * This script checks if all required environment variables are set correctly
 */

require('dotenv').config({ path: '.env' });
const crypto = require('crypto');

console.log('🔍 Validating .env Configuration\n');

const errors = [];
const warnings = [];
const isProduction = process.env.NODE_ENV === 'production';

// Required in all environments
const requiredVars = [
  { name: 'JWT_SECRET', validator: (val) => {
    if (!val) return 'Missing';
    if (val.length < 32) return `Too short (${val.length} chars, need 32+)`;
    return null;
  }},
  { name: 'DATABASE_URL', validator: (val) => {
    if (!val) return 'Missing';
    if (!val.startsWith('postgresql://')) return 'Invalid format (must start with postgresql://)';
    return null;
  }},
];

// Required only in production
const productionRequiredVars = [
  { name: 'FRONTEND_URL', validator: (val) => {
    if (!val) return 'Missing';
    if (isProduction && !val.startsWith('https://')) {
      return 'Should use HTTPS in production';
    }
    return null;
  }},
];

// Optional but recommended
const recommendedVars = [
  { name: 'PORT', description: 'Server port (default: 3001)' },
  { name: 'NODE_ENV', description: 'Environment (development/production)' },
  { name: 'STRIPE_SECRET_KEY', description: 'Stripe payments' },
  { name: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhooks' },
  { name: 'AWS_ACCESS_KEY_ID', description: 'S3 file uploads' },
  { name: 'AWS_SECRET_ACCESS_KEY', description: 'S3 file uploads' },
  { name: 'AWS_S3_BUCKET', description: 'S3 bucket name' },
  { name: 'RATE_LIMIT_REDIS_URL', description: 'Distributed rate limiting' },
];

// Check required variables
console.log('📋 Checking Required Variables:\n');

for (const { name, validator } of requiredVars) {
  const value = process.env[name];
  const error = validator(value);
  
  if (error) {
    errors.push({ name, error });
    console.log(`❌ ${name}: ${error}`);
  } else {
    // Mask sensitive values
    const displayValue = name === 'JWT_SECRET' 
      ? `${value.substring(0, 10)}... (${value.length} chars)`
      : name === 'DATABASE_URL'
      ? value.replace(/:[^:@]+@/, ':****@') // Hide password
      : value;
    console.log(`✅ ${name}: ${displayValue}`);
  }
}

// Check production-only required variables
if (isProduction) {
  console.log('\n📋 Checking Production-Required Variables:\n');
  
  for (const { name, validator } of productionRequiredVars) {
    const value = process.env[name];
    const error = validator(value);
    
    if (error) {
      errors.push({ name, error });
      console.log(`❌ ${name}: ${error}`);
    } else {
      console.log(`✅ ${name}: ${value}`);
    }
  }
}

// Check recommended variables
console.log('\n📋 Checking Recommended Variables:\n');

for (const { name, description } of recommendedVars) {
  const value = process.env[name];
  
  if (!value) {
    warnings.push({ name, description });
    console.log(`⚠️  ${name}: Missing (${description})`);
  } else {
    // Mask sensitive values
    const displayValue = name.includes('SECRET') || name.includes('KEY')
      ? `${value.substring(0, 10)}...`
      : value;
    console.log(`✅ ${name}: ${displayValue}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Validation Summary:\n');

if (errors.length === 0) {
  console.log('✅ All required variables are set correctly!');
} else {
  console.log(`❌ Found ${errors.length} error(s):`);
  errors.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  Found ${warnings.length} missing recommended variable(s):`);
  warnings.forEach(({ name, description }) => {
    console.log(`   - ${name}: ${description}`);
  });
  
  if (isProduction) {
    console.log('\n⚠️  WARNING: Missing recommended variables may cause issues in production!');
  }
}

console.log('\n' + '='.repeat(60));

// Additional checks
console.log('\n🔍 Additional Checks:\n');

// Check JWT_SECRET strength
if (process.env.JWT_SECRET) {
  const secret = process.env.JWT_SECRET;
  const entropy = crypto.randomBytes(32).length * 8; // Approximate
  console.log(`✅ JWT_SECRET length: ${secret.length} characters (minimum: 32)`);
  
  if (secret.length >= 32) {
    console.log('✅ JWT_SECRET meets minimum length requirement');
  }
}

// Check DATABASE_URL format
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const hasPassword = dbUrl.includes('@') && dbUrl.split('@')[0].includes(':');
  console.log(`✅ DATABASE_URL format: ${hasPassword ? 'Contains credentials' : 'May be missing password'}`);
}

// Check FRONTEND_URL
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL;
  const urls = frontendUrl.split(',').map(u => u.trim());
  console.log(`✅ FRONTEND_URL: ${urls.length} origin(s) configured`);
  urls.forEach((url, i) => {
    const protocol = url.startsWith('https://') ? 'HTTPS' : url.startsWith('http://') ? 'HTTP' : 'Unknown';
    console.log(`   ${i + 1}. ${url} (${protocol})`);
  });
}

// Final result
console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('❌ VALIDATION FAILED');
  console.log('\nPlease fix the errors above before starting the server.');
  process.exit(1);
} else {
  console.log('✅ VALIDATION PASSED');
  console.log('\nYour .env file is correctly configured!');
  
  if (warnings.length > 0 && !isProduction) {
    console.log('\n💡 Note: Some recommended variables are missing, but the server will run.');
    console.log('   Consider adding them for full functionality.');
  }
  
  process.exit(0);
}





