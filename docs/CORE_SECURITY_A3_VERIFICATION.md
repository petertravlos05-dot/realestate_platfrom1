# Core Security Verification - A3. Headers, CORS, HTTPS

**Date:** 2025-01-XX  
**Status:** ⚠️ **PARTIAL PASS** (CSP has wildcards)

---

## A3. Headers, CORS, HTTPS - VERIFICATION RESULTS

### ✅ A3.1: HSTS Only on HTTPS (Robust x-forwarded-proto)

**Status:** ✅ **PASS**

**Evidence:**

1. **Robust HTTPS Detection** (`backend/src/middleware/security-headers.ts:24-54`):
   ```typescript
   export function isRequestSecure(req: Request): boolean {
     // Check req.secure (works when trust proxy is set)
     if (req.secure) {
       return true;
     }
     
     // Fallback: check x-forwarded-proto header (for reverse proxy scenarios)
     const forwardedProto = req.headers['x-forwarded-proto'];
     
     if (!forwardedProto) {
       return false;
     }
     
     // Normalize header value (can be string, string[], or comma-separated string)
     let firstProto: string;
     
     if (Array.isArray(forwardedProto)) {
       firstProto = forwardedProto[0];
     } else {
       firstProto = forwardedProto.split(',')[0];
     }
     
     firstProto = firstProto.trim().toLowerCase();
     
     // Return true only if first protocol is "https"
     return firstProto === 'https';
   }
   ```
   **Features:**
   - Handles `req.secure` (populated when `trust proxy` is set)
   - Fallback to `x-forwarded-proto` header
   - Handles array format: `["https", ...]`
   - Handles comma-separated format: `"https, http"`
   - Takes first value (most trusted)
   - Case-insensitive comparison
   - Returns `false` if header missing

2. **HSTS Only on HTTPS** (`backend/src/middleware/security-headers.ts:95-103`):
   ```typescript
   // Strict Transport Security (HSTS) - only in production with HTTPS
   if (process.env.NODE_ENV === 'production' && isRequestSecure(req)) {
     res.setHeader(
       'Strict-Transport-Security',
       'max-age=31536000; includeSubDomains; preload'
     );
   }
   ```
   **Conditions:**
   - ✅ Only in production (`NODE_ENV === 'production'`)
   - ✅ Only if HTTPS (`isRequestSecure(req)` returns true)
   - ✅ Uses robust `x-forwarded-proto` detection

3. **Helmet HSTS Configuration** (`backend/src/index.ts:158-164`):
   ```typescript
   hsts: {
     maxAge: 31536000, // 1 year
     includeSubDomains: true,
     preload: true,
     // HSTS is only enabled in production (HTTPS required)
     // Helmet automatically disables HSTS for non-HTTPS connections
   },
   ```
   **Note:** Helmet also handles HSTS and automatically disables it for non-HTTPS connections.

4. **Trust Proxy Configuration** (`backend/src/index.ts:138`):
   ```typescript
   app.set('trust proxy', 1);
   ```
   **Impact:** Enables `req.secure` to be populated from `x-forwarded-proto` header.

**Verification:** ✅ HSTS is only set on HTTPS requests. Uses robust `x-forwarded-proto` detection that handles:
- Direct `req.secure` check
- Array format headers
- Comma-separated headers
- Case-insensitive comparison
- Production-only enforcement

---

### ⚠️ A3.2: CSP Without Wildcard

**Status:** ⚠️ **PARTIAL PASS** (Has wildcards: `https:`, `http:`)

**Evidence:**

1. **CSP Directives** (`backend/src/middleware/security-headers.ts:80-91`):
   ```typescript
   const cspDirectives = [
     "default-src 'self'",
     "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
     "style-src 'self' 'unsafe-inline'",
     "img-src 'self' data: https: http:", // ⚠️ WILDCARD: https: http:
     "font-src 'self' data:",
     "connect-src 'self' https: wss:", // ⚠️ WILDCARD: https: wss:
     "frame-ancestors 'none'",
     "base-uri 'self'",
     "form-action 'self'",
     "upgrade-insecure-requests",
   ];
   ```

2. **Helmet CSP Configuration** (`backend/src/index.ts:144-156`):
   ```typescript
   contentSecurityPolicy: {
     directives: {
       defaultSrc: ["'self'"],
       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
       styleSrc: ["'self'", "'unsafe-inline'"],
       imgSrc: ["'self'", 'data:', 'https:', 'http:'], // ⚠️ WILDCARD
       fontSrc: ["'self'", 'data:'],
       connectSrc: ["'self'", 'https:', 'wss:'], // ⚠️ WILDCARD
       frameAncestors: ["'none'"],
       baseUri: ["'self'"],
       formAction: ["'self'"],
       upgradeInsecureRequests: [],
     },
   },
   ```

**Issues Found:**

1. **`img-src 'self' data: https: http:`**
   - ⚠️ `https:` allows images from ANY HTTPS source (wildcard)
   - ⚠️ `http:` allows images from ANY HTTP source (security risk in production)
   - **Risk:** Allows loading images from any domain

2. **`connect-src 'self' https: wss:`**
   - ⚠️ `https:` allows connections to ANY HTTPS endpoint (wildcard)
   - ⚠️ `wss:` allows WebSocket connections to ANY secure endpoint (wildcard)
   - **Risk:** Allows API calls to any external HTTPS endpoint

**Recommendation:**
- Replace `https:` with specific domains (e.g., `https://app.domain.com`, `https://api.domain.com`)
- Remove `http:` in production (only allow in development)
- Replace `wss:` with specific WebSocket endpoints if needed

**Verification:** ⚠️ CSP has wildcards (`https:`, `http:`, `wss:`) which allow any source. Should be restricted to specific domains.

---

### ✅ A3.3: CORS Allowlist - Only https://app.domain.com (+ Staging)

**Status:** ✅ **PASS**

**Evidence:**

1. **CORS Configuration** (`backend/src/middleware/security-headers.ts:115-170`):
   ```typescript
   export function getCorsOptions() {
     const allowedOrigins: string[] = [];

     // Parse FRONTEND_ORIGIN (preferred) or FRONTEND_URL from environment
     const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
     if (frontendOrigin) {
       const urls = frontendOrigin.split(',').map(url => url.trim().replace(/\/$/, ''));
       allowedOrigins.push(...urls);
     }

     // Development defaults
     if (process.env.NODE_ENV !== 'production') {
       allowedOrigins.push(
         'http://localhost:3000',
         'http://localhost:3001',
         'http://127.0.0.1:3000',
         'http://127.0.0.1:3001'
       );
     }

     return {
       origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
         // Allow requests with no origin (mobile apps, Postman, curl, etc.)
         if (!origin) {
           return callback(null, true);
         }

         // Normalize origin (remove trailing slash)
         const normalizedOrigin = origin.replace(/\/$/, '');

         // In production, require FRONTEND_URL to be set
         if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
           console.error('❌ CRITICAL: FRONTEND_URL not set in production! CORS will block all requests.');
           return callback(new Error('CORS configuration error: FRONTEND_URL not set'));
         }

         // Check if origin is allowed
         if (allowedOrigins.includes(normalizedOrigin)) {
           callback(null, true);
         } else {
           console.warn(`🚫 CORS blocked origin: ${origin}`);
           callback(new Error('Not allowed by CORS'));
         }
       },
       credentials: true,
       // ...
     };
   }
   ```

2. **CORS Features:**
   - ✅ **No Wildcard:** Uses explicit allowlist (`allowedOrigins.includes()`)
   - ✅ **Environment-Based:** Reads from `FRONTEND_ORIGIN` or `FRONTEND_URL` env var
   - ✅ **Comma-Separated:** Supports multiple origins (production + staging)
   - ✅ **Production Enforcement:** Requires `FRONTEND_URL` in production (blocks all if not set)
   - ✅ **Development Defaults:** Only adds localhost origins in non-production
   - ✅ **Origin Normalization:** Removes trailing slashes for consistent matching
   - ✅ **Logging:** Warns when origins are blocked

3. **Usage** (`backend/src/index.ts:193-194`):
   ```typescript
   const corsOptions = getCorsOptions();
   app.use(cors(corsOptions));
   ```

4. **Expected Configuration:**
   ```bash
   # Production
   FRONTEND_ORIGIN=https://app.domain.com,https://staging.domain.com
   
   # Or
   FRONTEND_URL=https://app.domain.com,https://staging.domain.com
   ```

**Verification:** ✅ CORS uses explicit allowlist (no wildcard). Only allows origins specified in `FRONTEND_ORIGIN` or `FRONTEND_URL` environment variable. Production requires env var to be set (blocks all if not set).

---

## Summary

| Requirement | Status | Evidence Location |
|------------|--------|-------------------|
| HSTS only on HTTPS (robust x-forwarded-proto) | ✅ PASS | `security-headers.ts:24-54, 95-103` |
| CSP without wildcard | ⚠️ PARTIAL | `security-headers.ts:84, 86` (has `https:`, `http:`) |
| CORS allowlist (no wildcard) | ✅ PASS | `security-headers.ts:115-170` |

---

## ⚠️ VERDICT: PARTIAL PASS (CSP Wildcards Need Fixing)

**Core security requirements for Headers, CORS, HTTPS:**

- ✅ HSTS only on HTTPS (robust `x-forwarded-proto` detection)
- ⚠️ CSP has wildcards (`https:`, `http:`, `wss:`) - needs fixing
- ✅ CORS allowlist (no wildcard, explicit origins only)

**Blocking Issue:** CSP wildcards (`https:`, `http:`) allow loading resources from any domain, which is a security risk.

---

## Recommended Fixes

### Fix CSP Wildcards

**File:** `backend/src/middleware/security-headers.ts`

**Change 1:** Restrict `img-src` (line 84)
```typescript
// BEFORE:
"img-src 'self' data: https: http:",

// AFTER (production):
"img-src 'self' data: https://app.domain.com https://staging.domain.com https://*.s3.amazonaws.com",

// Or if S3 signed URLs are used:
"img-src 'self' data: https://app.domain.com https://staging.domain.com",
```

**Change 2:** Restrict `connect-src` (line 86)
```typescript
// BEFORE:
"connect-src 'self' https: wss:",

// AFTER (production):
"connect-src 'self' https://app.domain.com https://api.domain.com https://staging.domain.com wss://app.domain.com",
```

**Change 3:** Environment-based CSP
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
const allowedDomains = frontendUrl.split(',').map(url => {
  const urlObj = new URL(url.trim());
  return `https://${urlObj.hostname}`;
}).join(' ');

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  isProduction 
    ? `img-src 'self' data: ${allowedDomains} https://*.s3.amazonaws.com`
    : "img-src 'self' data: https: http:",
  "font-src 'self' data:",
  isProduction
    ? `connect-src 'self' ${allowedDomains} wss://app.domain.com`
    : "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
];
```

---

## Next Steps

1. **Immediate:** Fix CSP wildcards before production deployment
2. **Verify:** Test CSP in production with browser dev tools
3. **Monitor:** Check CSP violation reports (if CSP reporting endpoint is configured)

---

**Full verification report:** `docs/CORE_SECURITY_A3_VERIFICATION.md`


