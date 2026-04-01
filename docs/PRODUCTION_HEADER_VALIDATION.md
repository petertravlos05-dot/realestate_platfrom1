# Production Header Validation Guide

**Purpose:** Verify security headers are correctly configured in staging/production environments

---

## Quick Test Command

```bash
# Production/Staging (HTTPS) - Manual
curl -I https://YOUR_DOMAIN/health | rg -i "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy"

# Automated Script (Bash)
DOMAIN="https://your-domain.com" bash backend/scripts/test-production-headers.sh

# Automated Script (PowerShell)
$env:DOMAIN = "https://your-domain.com"
.\backend\scripts\test-production-headers.ps1
```

**Important:** Always test on HTTPS endpoints in production/staging!

---

## Expected Headers

### ✅ Required Headers:

1. **Content-Security-Policy**
   - Should be present
   - Should not be too permissive (`default-src *` is dangerous)
   - May allow `'unsafe-inline'` and `'unsafe-eval'` for React/Next.js (acceptable but monitor)

2. **Strict-Transport-Security** (HSTS)
   - ✅ Should be present **ONLY** on HTTPS endpoints
   - ❌ Should **NOT** be present on HTTP endpoints
   - Current config: Enabled only in production (Helmet handles this automatically)

3. **X-Frame-Options**
   - Should be `DENY` (prevents clickjacking)
   - `SAMEORIGIN` is acceptable but less secure

4. **X-Content-Type-Options**
   - Should be `nosniff` (prevents MIME sniffing)

5. **Referrer-Policy**
   - Should be present (e.g., `strict-origin-when-cross-origin`)

### ❌ Should NOT Be Present:

- **X-Powered-By** - Should be removed (prevents server fingerprinting)

---

## HSTS Configuration

**Current Implementation:**
- **File:** `backend/src/index.ts:130-136` (Helmet config)
- **File:** `backend/src/middleware/security-headers.ts:50-55` (Custom check)
- **Behavior:** 
  - Helmet automatically disables HSTS for non-HTTPS connections
  - Custom middleware uses `isRequestSecure()` for robust detection behind proxy
- **Production:** HSTS enabled (max-age: 1 year, includeSubDomains, preload)
- **Development:** HSTS disabled (HTTP localhost)

**Secure Detection Logic:**
Request is considered secure (HTTPS) when **either**:
- `req.secure === true` (works when `trust proxy` is set), **OR**
- `req.headers['x-forwarded-proto'] === 'https'` (for reverse proxy scenarios)

This ensures HSTS works correctly behind Render.com reverse proxy.

**Verification:**
```bash
# HTTPS endpoint - should have HSTS
curl -I https://your-domain.com/health | grep -i strict-transport

# HTTP endpoint - should NOT have HSTS
curl -I http://your-domain.com/health | grep -i strict-transport

# Behind proxy with x-forwarded-proto=https - should have HSTS
curl -I https://your-domain.com/health \
  -H "X-Forwarded-Proto: https" | grep -i strict-transport
```

**Unit Test:**
```bash
# Build first
cd backend && npm run build

# Run verification
node scripts/verify-hsts-detection.js
```

---

## CSP Configuration

**Current Implementation:**
- **File:** `backend/src/index.ts:115-126`
- **Policy:** Configured for React/Next.js apps
- **Allows:** `'unsafe-inline'` and `'unsafe-eval'` (needed for React/Next.js)

**Current CSP:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https: http:
font-src 'self' data:
connect-src 'self' https: wss:
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

**If CSP is Missing or Too Permissive:**

1. **Start with CSP-Report-Only:**
   ```typescript
   // In backend/src/index.ts
   helmet({
     contentSecurityPolicy: {
       directives: { /* your policy */ },
       reportOnly: true, // Start with report-only
     },
   })
   ```

2. **Monitor Reports:**
   - Check browser console for CSP violations
   - Monitor report-uri endpoint (if configured)
   - Fix violations before enforcing

3. **Enforce CSP:**
   ```typescript
   helmet({
     contentSecurityPolicy: {
       directives: { /* your policy */ },
       reportOnly: false, // Enforce after testing
     },
   })
   ```

---

## Automated Testing Scripts

### Bash Script:
```bash
backend/scripts/test-production-headers.sh
```

**Usage:**
```bash
DOMAIN="https://your-staging-domain.com" bash backend/scripts/test-production-headers.sh
```

### PowerShell Script:
```powershell
backend/scripts/test-production-headers.ps1
```

**Usage:**
```powershell
$env:DOMAIN = "https://your-staging-domain.com"
.\backend\scripts\test-production-headers.ps1
```

---

## Common Issues & Fixes

### Issue 1: CSP Missing
**Symptom:** No `Content-Security-Policy` header in response

**Fix:**
1. Verify Helmet is configured in `backend/src/index.ts`
2. Check that CSP is not disabled
3. Start with CSP-Report-Only mode

### Issue 2: HSTS on HTTP
**Symptom:** `Strict-Transport-Security` header present on HTTP endpoint

**Fix:**
- Helmet should handle this automatically
- Verify `NODE_ENV=production` is set
- Check that HTTPS is properly configured

### Issue 3: CSP Breaking Assets
**Symptom:** Images/styles/scripts not loading

**Fix:**
1. Use CSP-Report-Only mode first
2. Check browser console for CSP violations
3. Adjust CSP directives to allow necessary sources
4. Common fixes:
   - Add `https:` to `img-src` for external images
   - Add `data:` to `img-src` for data URIs
   - Add CDN domains to `script-src` or `style-src`

### Issue 4: X-Powered-By Present
**Symptom:** `X-Powered-By: Express` header visible

**Fix:**
- Verify `securityHeaders` middleware is applied
- Check that `res.removeHeader('X-Powered-By')` is called

---

## Testing Checklist

- [ ] Run production header validation script
- [ ] Verify CSP is present and not too permissive
- [ ] Verify HSTS is present on HTTPS, absent on HTTP
- [ ] Verify X-Frame-Options is DENY
- [ ] Verify X-Content-Type-Options is nosniff
- [ ] Verify Referrer-Policy is present
- [ ] Verify X-Powered-By is removed
- [ ] Test that CSP doesn't break assets (images, styles, scripts)
- [ ] Monitor CSP violations (if using report-only mode)

---

## Next Steps

1. **If CSP is missing:** Add CSP-Report-Only first, monitor, then enforce
2. **If CSP is too permissive:** Tighten policy gradually
3. **If assets break:** Adjust CSP directives to allow necessary sources
4. **Monitor:** Set up CSP violation reporting (report-uri or report-to)

---

**Last Updated:** 2025-01-XX

