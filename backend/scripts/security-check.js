/**
 * Security Check Script
 * 
 * Runs comprehensive security checks:
 * - Dependency vulnerability scanning (npm audit)
 * - Type checking (TypeScript)
 * - Lockfile verification
 * 
 * Usage:
 *   node scripts/security-check.js
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Running Security Checks\n');
console.log('='.repeat(60));

const errors = [];
const warnings = [];

// Check 1: Verify package-lock.json exists
console.log('\n📦 Check 1: Lockfile Verification');
try {
  const lockfilePath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(lockfilePath)) {
    console.log('✅ package-lock.json exists');
  } else {
    errors.push('package-lock.json missing - run "npm install"');
    console.log('❌ package-lock.json missing');
  }
} catch (error) {
  errors.push(`Lockfile check failed: ${error.message}`);
  console.log(`❌ Error: ${error.message}`);
}

// Check 2: Dependency vulnerability scanning
console.log('\n🔍 Check 2: Dependency Vulnerability Scanning');
try {
  console.log('Running npm audit...');
  const auditOutput = execSync('npm audit --audit-level=moderate --json', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  const auditResult = JSON.parse(auditOutput);
  
  if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
    const vulns = auditResult.metadata.vulnerabilities;
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;
    const low = vulns.low || 0;
    const total = critical + high + moderate + low;

    if (critical > 0 || high > 0) {
      errors.push(`${critical} critical, ${high} high vulnerabilities found`);
      console.log(`❌ Found ${critical} critical, ${high} high vulnerabilities`);
    } else if (moderate > 0) {
      warnings.push(`${moderate} moderate vulnerabilities found`);
      console.log(`⚠️  Found ${moderate} moderate vulnerabilities`);
    } else {
      console.log(`✅ No critical or high vulnerabilities found`);
    }

    if (low > 0) {
      console.log(`ℹ️  ${low} low severity vulnerabilities (non-blocking)`);
    }

    console.log(`   Total vulnerabilities: ${total}`);
  } else {
    console.log('✅ No vulnerabilities found');
  }
} catch (error) {
  // npm audit returns non-zero exit code if vulnerabilities found
  if (error.status !== null && error.status !== 0) {
    try {
      const auditOutput = error.stdout || error.stderr || '';
      const auditResult = JSON.parse(auditOutput);
      
      if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
        const vulns = auditResult.metadata.vulnerabilities;
        const critical = vulns.critical || 0;
        const high = vulns.high || 0;
        const moderate = vulns.moderate || 0;

        if (critical > 0 || high > 0) {
          errors.push(`${critical} critical, ${high} high vulnerabilities found`);
          console.log(`❌ Found ${critical} critical, ${high} high vulnerabilities`);
          console.log('   Run "npm audit fix" to attempt automatic fixes');
        } else if (moderate > 0) {
          warnings.push(`${moderate} moderate vulnerabilities found`);
          console.log(`⚠️  Found ${moderate} moderate vulnerabilities`);
        }
      }
    } catch (parseError) {
      warnings.push('Could not parse npm audit output');
      console.log('⚠️  npm audit found issues (could not parse details)');
    }
  } else {
    errors.push(`npm audit failed: ${error.message}`);
    console.log(`❌ npm audit failed: ${error.message}`);
  }
}

// Check 3: Type checking
console.log('\n📝 Check 3: TypeScript Type Checking');
try {
  console.log('Running TypeScript compiler check...');
  execSync('npx tsc --noEmit', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('✅ Type checking passed');
} catch (error) {
  errors.push('TypeScript type errors found');
  console.log('❌ Type checking failed');
}

// Check 4: Outdated dependencies (informational)
console.log('\n📊 Check 4: Dependency Versions (Informational)');
try {
  console.log('Checking for outdated packages...');
  const outdatedOutput = execSync('npm outdated --json', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  const outdated = JSON.parse(outdatedOutput);
  const outdatedCount = Object.keys(outdated).length;

  if (outdatedCount > 0) {
    warnings.push(`${outdatedCount} packages have newer versions available`);
    console.log(`⚠️  ${outdatedCount} packages have newer versions available`);
    console.log('   Consider running "npm update" to update packages');
  } else {
    console.log('✅ All packages are up to date');
  }
} catch (error) {
  // npm outdated returns non-zero if packages are outdated
  if (error.status !== null && error.status !== 0) {
    try {
      const outdatedOutput = error.stdout || error.stderr || '';
      const outdated = JSON.parse(outdatedOutput);
      const outdatedCount = Object.keys(outdated).length;

      if (outdatedCount > 0) {
        warnings.push(`${outdatedCount} packages have newer versions available`);
        console.log(`⚠️  ${outdatedCount} packages have newer versions available`);
      }
    } catch (parseError) {
      // Ignore parse errors for outdated check
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Security Check Summary:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All security checks passed!');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):`);
    errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} warning(s):`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  console.log('\n💡 Recommendations:');
  if (errors.some(e => e.includes('vulnerabilities'))) {
    console.log('   - Run "npm audit fix" to attempt automatic fixes');
    console.log('   - Review "npm audit" output for manual fixes');
  }
  if (warnings.some(w => w.includes('outdated'))) {
    console.log('   - Run "npm update" to update packages');
    console.log('   - Review changelogs before updating major versions');
  }

  // Exit with error code if critical issues found
  process.exit(errors.length > 0 ? 1 : 0);
}





