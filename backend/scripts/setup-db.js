#!/usr/bin/env node

/**
 * Database Setup Script
 * This script runs prisma db push to ensure database tables exist
 * It's safe to run multiple times - it will only create missing tables
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Setting up database...');

try {
  // Change to backend directory
  const backendDir = path.join(__dirname, '..');
  process.chdir(backendDir);

  // Run prisma db push
  console.log('📦 Running prisma db push...');
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    cwd: backendDir
  });

  console.log('✅ Database setup completed successfully!');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.error('⚠️  Continuing anyway - tables may already exist');
  // Don't exit with error - allow the app to start
  // The app will show proper errors if tables are missing
}















