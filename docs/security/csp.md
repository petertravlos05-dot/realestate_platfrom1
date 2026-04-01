# Content Security Policy (CSP)

## Overview

The Content Security Policy (CSP) is configured to prevent XSS attacks and restrict resource loading to trusted sources only. **No wildcards** (`https:`, `http:`) are allowed - all domains must be explicitly listed.

## CSP Configuration

### Backend CSP (Express/Helmet)

**Location:** `backend/src/index.ts` and `backend/src/middleware/security-headers.ts`

**Directives:**

```typescript
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
img-src 'self' data: blob: <s3-domain> <frontend-domains>
style-src 'self' 'unsafe-inline'
script-src 'self'
connect-src 'self' <frontend-domains> <sentry-domain> <stripe-domains>
frame-src <stripe-domains> | 'none'
font-src 'self' data:
form-action 'self'
upgrade-insecure-requests
```

### Allowed Domains

Domains are dynamically derived from environment variables:

#### Frontend Domains
- **Source**: `FRONTEND_ORIGIN` or `FRONTEND_URL` environment variable
- **Format**: Comma-separated URLs (e.g., `https://app.domain.com,https://staging.domain.com`)
- **Used in**: `img-src`, `connect-src`

#### S3 Domain
- **Source**: `AWS_S3_BUCKET` and `AWS_REGION` environment variables
- **Format**: `https://{bucket}.s3.{region}.amazonaws.com`
- **Used in**: `img-src`

#### Sentry Domain
- **Source**: `SENTRY_DSN_BACKEND` environment variable (extracted from DSN URL)
- **Used in**: `connect-src`

#### Stripe Domains
- **Hardcoded** (for Stripe checkout iframe):
  - `https://js.stripe.com`
  - `https://hooks.stripe.com`
  - `https://checkout.stripe.com`
- **Used in**: `connect-src`, `frame-src`

## CSP Directives Explained

### `default-src 'self'`
- Default source for all resource types
- Only allows resources from same origin

### `base-uri 'self'`
- Restricts `<base>` tag URLs to same origin
- Prevents base tag injection attacks

### `object-src 'none'`
- Blocks `<object>`, `<embed>`, `<applet>` tags
- Prevents plugin-based attacks

### `frame-ancestors 'none'`
- Prevents page from being embedded in iframes
- Equivalent to `X-Frame-Options: DENY`

### `img-src 'self' data: blob: <domains>`
- Allows images from:
  - Same origin (`'self'`)
  - Data URIs (`data:`)
  - Blob URIs (`blob:`)
  - S3 bucket domain (if configured)
  - Frontend domains (if configured)
- **No wildcards** - all domains must be explicit

### `style-src 'self' 'unsafe-inline'`
- Allows styles from same origin
- Allows inline styles (`'unsafe-inline'`)
- **TODO**: Replace with nonce-based CSP later

### `script-src 'self'`
- Allows scripts only from same origin
- **No `'unsafe-inline'` or `'unsafe-eval'`** (removed for security)
- **TODO**: Add specific domains if external scripts are needed

### `connect-src 'self' <domains>`
- Allows fetch/XHR to:
  - Same origin (`'self'`)
  - Frontend domains (for API calls)
  - Sentry domain (for error reporting)
  - Stripe domains (for payment processing)
- **No wildcards** - all domains must be explicit

### `frame-src <stripe-domains> | 'none'`
- Allows iframes only from Stripe domains (for checkout)
- If Stripe not configured, defaults to `'none'`

### `font-src 'self' data:`
- Allows fonts from same origin and data URIs

### `form-action 'self'`
- Restricts form submissions to same origin

### `upgrade-insecure-requests`
- Upgrades HTTP requests to HTTPS automatically

## Environment Variables

**Required for CSP:**
```bash
# Frontend domains (comma-separated)
FRONTEND_ORIGIN=https://app.domain.com,https://staging.domain.com
# OR
FRONTEND_URL=https://app.domain.com,https://staging.domain.com

# S3 (optional, but required if using S3 images)
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Sentry (optional)
SENTRY_DSN_BACKEND=https://xxx@xxx.ingest.sentry.io/xxx
```

## CSP Violation Reporting

**Current Status:** CSP violations are not reported (no `report-uri` directive)

**To Enable Reporting:**
1. Set up CSP violation reporting endpoint
2. Add `report-uri` directive:
   ```typescript
   reportUri: '/api/csp-violations'
   ```
3. Log violations for analysis

**Note:** In production, CSP should be **enforced** (not report-only) unless explicitly approved for testing.

## Validation

### Manual Validation

**Check CSP Header:**
```bash
curl -I https://api.domain.com/api/properties | grep -i "content-security-policy"
```

**Expected Output:**
```
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; ...
```

### Automated Validation

**Script:** `backend/scripts/validate-csp.js` (to be created)

**Checks:**
- CSP header present
- No wildcards (`https:`, `http:`, `*`)
- Required directives present
- Domains match environment variables

## Common Issues

### Issue: Images Not Loading

**Cause:** S3 domain not in `img-src` directive

**Fix:** Ensure `AWS_S3_BUCKET` and `AWS_REGION` are set, or add S3 domain manually

### Issue: API Calls Blocked

**Cause:** Frontend domain not in `connect-src` directive

**Fix:** Ensure `FRONTEND_ORIGIN` or `FRONTEND_URL` is set correctly

### Issue: Stripe Checkout Not Loading

**Cause:** Stripe domains not in `frame-src` directive

**Fix:** Stripe domains are hardcoded - ensure Stripe integration is enabled

### Issue: Sentry Errors Not Reporting

**Cause:** Sentry domain not in `connect-src` directive

**Fix:** Ensure `SENTRY_DSN_BACKEND` is set (domain extracted automatically)

## Security Benefits

1. **XSS Prevention**: Blocks inline scripts and restricts script sources
2. **Data Exfiltration Prevention**: Restricts where data can be sent
3. **Clickjacking Prevention**: `frame-ancestors 'none'` prevents embedding
4. **Plugin Attack Prevention**: `object-src 'none'` blocks plugins
5. **HTTPS Enforcement**: `upgrade-insecure-requests` forces HTTPS

## Future Improvements

1. **Nonce-Based CSP**: Replace `'unsafe-inline'` with nonces for styles/scripts
2. **Strict-Dynamic**: Use `'strict-dynamic'` for script loading
3. **CSP Reporting**: Add violation reporting endpoint
4. **CSP Testing**: Add automated CSP validation tests

## Related Documentation

- [Security Headers](./headers_cors.md) - Other security headers
- [S3 Security](./s3.md) - S3 file access security
- [Architecture](../ARCHITECTURE.md) - System architecture


