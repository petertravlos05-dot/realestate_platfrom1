/**
 * Clear export rate limit keys
 * 
 * This script clears rate limit keys for export endpoints to allow testing.
 * 
 * Usage:
 *   node scripts/clear-export-rate-limit.js [userId]
 * 
 * If userId is provided, clears only that user's rate limits.
 * If not provided, clears all export rate limit keys.
 * 
 * Note: For in-memory rate limiting (default), you need to restart the server.
 * This script only works if Redis is configured (RATE_LIMIT_REDIS_URL).
 * 
 * Environment:
 *   RATE_LIMIT_REDIS_URL (optional) - Redis URL for rate limiting
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const userId = process.argv[2] || null;

async function clearRateLimits() {
  console.log('🔧 Clearing export rate limits...\n');

  // Check if Redis is configured
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL;
  
  if (redisUrl) {
    console.log('📦 Using Redis for rate limiting');
    console.log(`   Redis URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}\n`);
    
    try {
      // Dynamic import to avoid requiring redis if not needed
      let redis;
      try {
        redis = require('redis');
      } catch (requireError) {
        console.error('✗ Redis module not found');
        console.log('\n💡 Install Redis client: npm install redis');
        console.log('   Or use in-memory rate limiting (restart server to clear limits)');
        process.exit(1);
      }
      
      const client = redis.createClient({ url: redisUrl });
      
      await client.connect();
      console.log('✓ Connected to Redis\n');
      
      // Build key patterns
      const patterns = [];
      if (userId) {
        // Clear specific user's rate limits
        patterns.push(`rl_export:${userId}_initial`);
        patterns.push(`rl_export:${userId}_paginated`);
        patterns.push(`rl_export_paginated:${userId}`);
      } else {
        // Clear all export rate limits
        patterns.push('rl_export:*');
        patterns.push('rl_export_paginated:*');
      }
      
      let totalCleared = 0;
      for (const pattern of patterns) {
        console.log(`🔍 Searching for keys matching: ${pattern}`);
        
        // Scan for keys matching pattern
        const keys = [];
        let cursor = '0';
        
        do {
          const result = await client.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = result.cursor;
          keys.push(...result.keys);
        } while (cursor !== '0');
        
        if (keys.length > 0) {
          console.log(`   Found ${keys.length} key(s)`);
          await client.del(keys);
          totalCleared += keys.length;
          console.log(`   ✓ Cleared ${keys.length} key(s)\n`);
        } else {
          console.log(`   No keys found\n`);
        }
      }
      
      await client.quit();
      
      if (totalCleared > 0) {
        console.log(`✅ Successfully cleared ${totalCleared} rate limit key(s)`);
      } else {
        console.log('ℹ No rate limit keys found to clear');
      }
      
    } catch (error) {
      const errorMsg = error.message || String(error);
      const errorCode = error.code || '';
      const isConnectionError = errorCode === 'ECONNREFUSED' || 
                                 errorMsg.includes('ECONNREFUSED') || 
                                 errorMsg.includes('connect');
      
      if (isConnectionError) {
        console.error('✗ Cannot connect to Redis server');
        console.log('\n⚠ Redis is configured but server is not running.');
        console.log('\n✅ Quick Solution (Recommended):');
        console.log('   Restart your backend server to clear in-memory rate limits:');
        console.log('   1. Stop backend server (Ctrl+C)');
        console.log('   2. Start again: npm run dev');
        console.log('\n💡 Alternative Solutions:');
        console.log('   1. Start Redis server: redis-server');
        console.log('   2. Use different test email:');
        console.log('      TEST_EMAIL=test-export-new@example.com npm run test:export-pagination');
        console.log('   3. Wait for rate limit to expire (1 hour)');
      } else {
        console.error('✗ Error clearing Redis keys:', errorMsg);
        if (errorCode) {
          console.error(`   Error code: ${errorCode}`);
        }
        console.log('\n💡 Try restarting backend server or using different test email');
      }
      process.exit(1);
    }
  } else {
    console.log('📝 Using in-memory rate limiting (no Redis configured)');
    console.log('\n⚠ In-memory rate limits are stored in the server process memory.');
    console.log('   They cannot be cleared without restarting the server.\n');
    
    console.log('✅ Solutions:');
    console.log('\n   1. Restart the backend server:');
    console.log('      - Stop the server (Ctrl+C)');
    console.log('      - Start again: npm run dev');
    console.log('\n   2. Wait for rate limit to expire:');
    console.log('      - Export rate limit: 1 hour');
    console.log('      - Paginated export: 1 hour');
    console.log('\n   3. Use a different test user:');
    if (userId) {
      console.log(`      - Current user: ${userId}`);
    }
    console.log('      - Set TEST_EMAIL environment variable:');
    console.log('        TEST_EMAIL=test-export-new@example.com npm run test:export-pagination');
    console.log('\n   4. Configure Redis (optional, for persistent rate limiting):');
    console.log('      - Install Redis: https://redis.io/download');
    console.log('      - Add to .env: RATE_LIMIT_REDIS_URL=redis://localhost:6379');
    console.log('      - Install Redis client: npm install redis');
    
    process.exit(0);
  }
}

// Run
clearRateLimits()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

