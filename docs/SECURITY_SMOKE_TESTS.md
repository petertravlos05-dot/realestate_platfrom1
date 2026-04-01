# Security Smoke Tests

**Last Updated:** 2025-01-XX  
**Purpose:** Automated security validation tests for production readiness

---

## Overview

This document describes the security validation pack for verifying critical security controls before production deployment.

**Location:** `backend/scripts/security-validation/`

**Run All Tests:**
```bash
cd backend
npm run security:smoke
```

Or manually:
```bash
node scripts/security-validation/run-all-tests.js --base-url=http://localhost:3001
```

---

## Test Suite

### 1. Rate Limit Tests (`test-rate-limits.js`)

**Purpose:** Verify rate limiting works and production bypass is disabled.

**Tests:**
- ✅ Rate limit enforced (returns 429 after limit)
- ✅ Production bypass disabled (even with `X-Test-Request` header)
- ✅ Rate limit headers present (`Retry-After`)
- ✅ Different limits for different endpoints

**Usage:**
```bash
node scripts/security-validation/test-rate-limits.js --base-url=http://localhost:3001
```

---

### 2. IDOR/BOLA Tests (`test-idor.js`)

**Purpose:** Verify authorization checks prevent IDOR vulnerabilities.

**Tests:**
- ✅ User A cannot access User B's properties
- ✅ User A cannot update User B's transactions
- ✅ User A cannot delete User B's favorites
- ✅ Deleted users cannot access any endpoints
- ✅ Admin can access all resources (with proper logging)

**Usage:**
```bash
node scripts/security-validation/test-idor.js --base-url=http://localhost:3001
```

**Requirements:**
- Test users must be created first (see test script for setup)

---

### 3. Security Headers Tests (`test-headers.js`)

**Purpose:** Verify security headers are set correctly.

**Tests:**
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Strict-Transport-Security` (HTTPS only)
- ✅ `Content-Security-Policy` present
- ✅ `Referrer-Policy` present
- ✅ `Permissions-Policy` present

**Usage:**
```bash
node scripts/security-validation/test-headers.js --base-url=http://localhost:3001
```

---

### 4. File Upload Security Tests (`test-upload-security.js`)

**Purpose:** Verify file upload security controls.

**Tests:**
- ✅ Forbidden extensions rejected (.exe, .sh, .php, etc.)
- ✅ MIME type validation (magic bytes)
- ✅ File size limits enforced
- ✅ Filename sanitization
- ✅ Malware scan hook (stub verified)

**Usage:**
```bash
node scripts/security-validation/test-upload-security.js --base-url=http://localhost:3001
```

---

### 5. Log Sanitization Tests (`test-auth-sanitization.js`)

**Purpose:** Verify sensitive data is not logged.

**Tests:**
- ✅ Passwords never logged
- ✅ Tokens never logged
- ✅ Email addresses sanitized (domain only in audit logs)
- ✅ Sentry scrubbing verified (no PII in error tracking)

**Usage:**
```bash
node scripts/security-validation/test-auth-sanitization.js --base-url=http://localhost:3001
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm install
      - run: cd backend && npm run build
      - run: cd backend && npm run security:smoke
        env:
          BASE_URL: http://localhost:3001
```

---

## Manual Testing Checklist

### Pre-Production Checklist

- [ ] Run all security smoke tests
- [ ] Verify rate limiting in production (no bypass)
- [ ] Test IDOR vulnerabilities manually
- [ ] Verify security headers (use browser dev tools)
- [ ] Test file upload with malicious files
- [ ] Verify logs don't contain sensitive data
- [ ] Test GDPR export endpoint (size limits, pagination)
- [ ] Test GDPR deletion endpoint (anonymization)
- [ ] Verify S3 signed URLs (if implemented)
- [ ] Verify Stripe webhook IP allowlist (if implemented)

---

## Test Data Setup

Some tests require test users. Create them with:

```bash
# Create test users
node scripts/create-test-users.js

# Or use Prisma Studio
npx prisma studio
```

**Test Users:**
- `test-user-a@example.com` - User A (for IDOR tests)
- `test-user-b@example.com` - User B (for IDOR tests)
- `admin@example.com` - Admin user (for admin tests)

---

## Expected Results

### All Tests Should Pass

```
🔒 Security Validation Pack
==========================

Base URL: http://localhost:3001

📋 Running: Rate Limit Tests
──────────────────────────────────────────────────
✅ Rate limit enforced
✅ Production bypass disabled
✅ Rate Limit Tests: PASSED

📋 Running: IDOR/BOLA Tests
──────────────────────────────────────────────────
✅ User A cannot access User B's resources
✅ IDOR/BOLA Tests: PASSED

📋 Running: Security Headers
──────────────────────────────────────────────────
✅ All security headers present
✅ Security Headers: PASSED

📋 Running: File Upload Security
──────────────────────────────────────────────────
✅ Forbidden extensions rejected
✅ File Upload Security: PASSED

📋 Running: Log Sanitization
──────────────────────────────────────────────────
✅ No sensitive data in logs
✅ Log Sanitization: PASSED

==================================================
📊 Summary
==================================================
✅ Passed: 5
❌ Failed: 0
📋 Total:  5

✅ All security tests passed!
```

---

## Troubleshooting

### Tests Fail in Production

- **Rate Limit Bypass:** Verify `NODE_ENV=production` and bypass is disabled
- **IDOR Tests:** Verify test users exist and have proper relationships
- **Headers:** Verify reverse proxy (Render.com) doesn't strip headers
- **File Upload:** Verify S3/AWS credentials are configured

### Tests Fail Locally

- **Database:** Ensure database is running and migrations applied
- **Port:** Verify backend is running on correct port (default: 3001)
- **Auth:** Verify test users exist and can authenticate

---

## Next Steps

1. **Implement Missing Tests:** Create test scripts for each category
2. **CI Integration:** Add to GitHub Actions / CI pipeline
3. **Regular Testing:** Run before each production deployment
4. **Expand Coverage:** Add more test cases as vulnerabilities are discovered

---

**Document Status:** ⚠️ Test Scripts To Be Created

**Priority:** HIGH (required before production)



