# Phase 5: Production Hardening - Complete

**Date:** 2024-12-19  
**Status:** ✅ Complete

---

## Overview

Phase 5 implements production hardening, deployment runbooks, and pre-launch checks to ensure safe, repeatable production deployments.

---

## Deliverables

### 1. Preflight Check Scripts ✅

**Backend:** `backend/scripts/preflight-production-check.js`
- Validates NODE_ENV, JWT_SECRET, DATABASE_URL
- Checks CORS configuration (no wildcards, HTTPS only)
- Verifies cookie domain format
- Validates S3/Stripe configuration
- Ensures admin endpoints disabled by default
- Ensures rate limiting not disabled
- Checks realtime bus configuration

**Frontend:** `listings/frontend/scripts/preflight-production-check.js`
- Validates NODE_ENV
- Checks NEXT_PUBLIC_API_URL (HTTPS, api subdomain)
- Verifies Sentry configuration consistency
- Checks NextAuth configuration

**Usage:**
```bash
# Backend
cd backend
npm run preflight

# Frontend
cd listings/frontend
npm run preflight
```

### 2. Environment Variables Documentation ✅

**File:** `docs/ENV_REQUIRED.md`

Complete inventory of:
- Critical required variables
- Security variables
- Optional but recommended variables
- Production configuration examples
- Staging configuration differences
- Troubleshooting guide

### 3. Production Deployment Runbook ✅

**File:** `docs/PRODUCTION_RUNBOOK.md`

Step-by-step guide:
- Domain & DNS setup
- Database setup
- Backend deployment (Render)
- Frontend deployment (Render)
- Post-deployment smoke tests
- Rollback procedures
- Common issues & solutions
- Security checklist

### 4. Incident Response Playbook ✅

**File:** `docs/INCIDENT_PLAYBOOK.md`

Response procedures for:
- S3 data leak suspected
- JWT secret compromised
- Database compromised
- Stripe webhook abuse
- GDPR request escalation
- Service outage

Includes kill switches:
- Disable file downloads
- Rotate JWT secret
- Rotate S3 credentials
- Disable admin endpoints
- Set maintenance mode

### 5. Cookie & CSRF Verification Guide ✅

**File:** `docs/COOKIE_CSRF_VERIFICATION.md`

Verification tests:
- Cookie domain format
- Cookies set correctly
- Cross-subdomain API calls
- CORS exactness
- Invalid origin rejection

### 6. Realtime Single-Instance Safety ✅

**File:** `backend/src/services/realtime/eventBus.ts`

**Changes:**
- Added runtime warning when `REALTIME_BUS=memory` in production
- Warns that single instance is required
- Documents migration path to Redis

**Documentation:** Updated `docs/REALTIME_PHASE3_2.md` with:
- Production requirement: Single instance when `REALTIME_BUS=memory`
- Render configuration: Pin to 1 instance
- Migration path: Set `REALTIME_BUS=redis` for multi-instance

---

## Hardening Changes

### 1. CORS Exactness ✅

**Status:** Already implemented correctly
- Uses explicit allowlist (no wildcards)
- Requires `FRONTEND_ORIGIN` or `FRONTEND_URL` in production
- Validates HTTPS in production
- Preflight script validates exact origins

### 2. Cookie Settings ✅

**Status:** Already implemented correctly
- `Secure=true` in production (automatic)
- `SameSite=lax` (CSRF protection + cross-subdomain support)
- `domain=.domain.com` (from `COOKIE_DOMAIN` env var)
- Preflight script validates cookie domain format

### 3. CSRF Protection ✅

**Status:** Already implemented correctly
- Works cross-subdomain (cookies shared via `.domain.com`)
- Token in cookie + header validation
- Exempts safe methods (GET, HEAD, OPTIONS)
- Verification guide created

### 4. Admin Endpoints ✅

**Status:** Already implemented correctly
- Disabled by default (`ENABLE_ADMIN_HEALTH` must be `true`)
- Returns 404 when disabled (hides endpoint existence)
- Preflight script validates disabled by default

### 5. Sentry Single-Run ✅

**Status:** Already implemented correctly
- `initSentry()` checks if already initialized
- Prevents duplicate initialization in jobs + server
- Code: `backend/src/lib/sentry.ts:44-53`

### 6. Rate Limiting Safety ✅

**Status:** Already implemented correctly
- `DISABLE_EXPORT_RATE_LIMIT` must NOT be set in production
- Preflight script validates this
- Production bypass mechanisms disabled (verified in NO-GO blockers)

---

## Verification

### Preflight Checks

Run before every deployment:

```bash
# Backend
cd backend
npm run preflight:production

# Frontend
cd listings/frontend
npm run preflight:production
```

### Manual Verification

1. **CORS:** Test with curl (see `docs/COOKIE_CSRF_VERIFICATION.md`)
2. **Cookies:** Check DevTools → Application → Cookies
3. **CSRF:** Test API call with/without token
4. **Admin Endpoints:** Verify 404 when disabled
5. **Realtime:** Verify single-instance warning in logs

---

## Files Changed

### Scripts
- `backend/scripts/preflight-production-check.js` (NEW)
- `listings/frontend/scripts/preflight-production-check.js` (NEW)

### Code
- `backend/src/services/realtime/eventBus.ts` (added runtime warning)

### Documentation
- `docs/ENV_REQUIRED.md` (NEW)
- `docs/PRODUCTION_RUNBOOK.md` (NEW)
- `docs/INCIDENT_PLAYBOOK.md` (NEW)
- `docs/COOKIE_CSRF_VERIFICATION.md` (NEW)
- `docs/REALTIME_PHASE3_2.md` (updated with single-instance requirement)
- `docs/PHASE5_PRODUCTION_HARDENING.md` (NEW - this file)

### Package.json
- `backend/package.json` (added preflight scripts)
- `listings/frontend/package.json` (added preflight scripts)

---

## Production Checklist

Before going live:

- [ ] Run backend preflight check: `npm run preflight:production`
- [ ] Run frontend preflight check: `npm run preflight:production`
- [ ] Verify CORS origins are exact (no wildcards)
- [ ] Verify cookies work cross-subdomain
- [ ] Verify CSRF protection works
- [ ] Verify admin endpoints are disabled
- [ ] Verify realtime bus is memory (single-instance) OR redis (multi-instance)
- [ ] Verify Sentry is single-run
- [ ] Verify rate limiting is enabled
- [ ] Test smoke tests in production
- [ ] Document any issues encountered

---

## Next Steps

1. **Deploy to Staging:**
   - Follow `PRODUCTION_RUNBOOK.md` with staging URLs
   - Run preflight checks
   - Test all critical paths

2. **Deploy to Production:**
   - Follow `PRODUCTION_RUNBOOK.md` with production URLs
   - Run preflight checks
   - Monitor logs and Sentry

3. **Post-Launch:**
   - Monitor for 24-48 hours
   - Review incident playbook
   - Update runbook with lessons learned

---

**Status:** ✅ Phase 5 Complete - Production hardening, runbooks, and preflight checks implemented


