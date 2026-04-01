# Cookie-Based Authentication Implementation

**Date:** 2025-01-XX  
**Purpose:** Production domain + cookie-auth compatibility for split deployment

---

## Deployment Architecture

- **Frontend:** `https://app.yourdomain.com` (Next.js)
- **Backend API:** `https://api.yourdomain.com` (Express on Render)

---

## PHASE 1 — Backend (Express) Configuration

### A) Trust Proxy ✅
- **Status:** Already configured
- **File:** `backend/src/index.ts:110`
- **Code:** `app.set('trust proxy', 1);`

### B) CORS (Strict Allowlist + Credentials) ✅

**File:** `backend/src/middleware/security-headers.ts`

**Changes:**
- Added `X-CSRF-Token` to `allowedHeaders`
- Supports `FRONTEND_ORIGIN` env var (preferred) or `FRONTEND_URL` (backward compatible)
- `credentials: true` already enabled
- Methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`

**Environment Variables:**
- `FRONTEND_ORIGIN=https://app.yourdomain.com` (preferred)
- `FRONTEND_URL=https://app.yourdomain.com` (backward compatible, comma-separated)

### C) Cookie Settings ✅

**File:** `backend/src/lib/utils/cookie-helpers.ts` (NEW)

**Cookie Configuration:**
- **Domain:** `.yourdomain.com` (from `COOKIE_DOMAIN` env var)
- **HttpOnly:** `true` (for auth cookies)
- **Secure:** `true` in production
- **SameSite:** `lax` (CSRF protection while allowing cross-site navigation)
- **Path:** `/` (access token), `/api/auth/refresh` (refresh token)

**Helper Functions:**
- `setAuthCookie()` - Sets access token cookie
- `setRefreshTokenCookie()` - Sets refresh token cookie (for future use)
- `setCsrfCookie()` - Sets CSRF token cookie (non-HttpOnly)
- `clearAuthCookies()` - Clears all auth cookies

**Environment Variables:**
- `COOKIE_DOMAIN=.yourdomain.com` (must start with dot for subdomain sharing)

### D) CSRF Protection ✅

**File:** `backend/src/middleware/csrf.ts` (NEW)

**Implementation:**
- Generates CSRF token on safe methods (GET, HEAD, OPTIONS)
- Validates CSRF token on state-changing methods (POST, PUT, PATCH, DELETE)
- Exempts: `/api/stripe/webhook` (webhook signature verification instead)

**Cookie Name:** `csrf_token`  
**Header Name:** `X-CSRF-Token`

**Validation:**
- Both cookie and header must be present
- Tokens must match exactly

### E) Auth Endpoints Updated ✅

**File:** `backend/src/routes/auth.ts`

**Changes:**
- `POST /api/auth/login` - Sets `access_token` cookie (7 days TTL)
- `PUT /api/auth/update-role` - Sets `access_token` cookie (24 hours TTL)
- `POST /api/auth/logout` - NEW endpoint, clears all auth cookies

**Backward Compatibility:**
- Tokens still returned in JSON response for Bearer token auth
- Frontend can use either cookie or Authorization header

### F) Auth Middleware Updated ✅

**File:** `backend/src/middleware/auth.ts`

**Changes:**
- `validateJwtToken` now checks cookies first (`req.cookies.access_token`)
- Falls back to Authorization header if cookie not present
- Supports both authentication methods simultaneously

### G) Cookie Parser Middleware ✅

**File:** `backend/src/index.ts`

**Changes:**
- Added `cookie-parser` middleware
- Installed dependency: `cookie-parser@^1.4.6`
- Middleware order: After request ID, before CORS, before CSRF

---

## PHASE 2 — Frontend (Next.js) Compatibility

### A) Send Cookies with Requests ✅

**File:** `listings/frontend/src/lib/api/client.ts`

**Changes:**
- Added `withCredentials: true` to axios instance
- Added `credentials: 'include'` to all fetch calls (`fetchFromBackend`, `uploadToBackend`)

### B) CSRF Header Injection ✅

**File:** `listings/frontend/src/lib/api/client.ts`

**Changes:**
- Added `getCsrfToken()` helper function (reads from `document.cookie`)
- Injects `X-CSRF-Token` header for state-changing requests (POST, PUT, PATCH, DELETE)
- Integrated into axios interceptor and fetch helpers

### C) Auth Token Storage Migration Plan ✅

**File:** `listings/frontend/src/lib/api/client.ts`

**Migration Strategy:**
- Added `ALLOW_BEARER_TOKENS` flag (set to `true` for migration period)
- Cookie auth preferred (automatic with `withCredentials: true`)
- Bearer token fallback maintained for backward compatibility
- TODO comments added for removing localStorage once cookies confirmed working

**Current Behavior:**
- Cookies sent automatically (preferred method)
- Bearer tokens still supported (fallback)
- localStorage still used (will be removed after migration)

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/realestate_db
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=production

# Frontend Origin (preferred)
FRONTEND_ORIGIN=https://app.yourdomain.com
# Alternative (backward compatible):
# FRONTEND_URL=https://app.yourdomain.com

# Cookie Domain (for cross-subdomain sharing)
COOKIE_DOMAIN=.yourdomain.com

# Server Port
PORT=3001
```

### Frontend (`listings/frontend/.env`)

```bash
# Backend API Base URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## PHASE 3 — Verification / Testing

### 1) CORS + Cookies (Browser)

**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to `https://app.yourdomain.com`
3. Login via frontend
4. Check Network tab for login request:
   - **Request:** `POST https://api.yourdomain.com/api/auth/login`
   - **Response Headers:** Should include `Set-Cookie: access_token=...; Domain=.yourdomain.com; Secure; HttpOnly`
   - **Cookies Tab:** Should show `access_token` cookie with Domain `.yourdomain.com`

5. Make subsequent API call (e.g., fetch properties):
   - **Request Headers:** Should include `Cookie: access_token=...; csrf_token=...`
   - **Request Headers:** Should include `X-CSRF-Token: <csrf_token_value>`

**Expected Results:**
- ✅ Cookies set with `Domain=.yourdomain.com`
- ✅ Cookies sent automatically with requests
- ✅ CSRF token cookie readable by JavaScript
- ✅ CSRF token header sent with state-changing requests

### 2) CORS Preflight (curl)

```bash
# Test OPTIONS preflight request
curl -X OPTIONS https://api.yourdomain.com/api/auth/login \
  -H "Origin: https://app.yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,X-CSRF-Token" \
  -v

# Expected Response Headers:
# Access-Control-Allow-Origin: https://app.yourdomain.com
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
# Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,X-CSRF-Token
```

### 3) Login Cookie Setting (curl)

```bash
# Test login endpoint (with credentials)
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Origin: https://app.yourdomain.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt \
  -v

# Expected Response Headers:
# Set-Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Domain=.yourdomain.com; Path=/; Secure; HttpOnly; SameSite=Lax
# Set-Cookie: csrf_token=abc123...; Domain=.yourdomain.com; Path=/; Secure; SameSite=Lax

# Check cookies.txt file:
# .yourdomain.com	TRUE	/	FALSE	1735689600	access_token	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# .yourdomain.com	TRUE	/	FALSE	1735603200	csrf_token	abc123...
```

### 4) CSRF Protection (curl)

```bash
# Test POST without CSRF token (should fail)
curl -X POST https://api.yourdomain.com/api/properties \
  -H "Origin: https://app.yourdomain.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"title":"Test Property"}' \
  -v

# Expected Response:
# HTTP/1.1 403 Forbidden
# {"error":"CSRF token missing","message":"CSRF protection: Both cookie and header token required"}

# Test POST with CSRF token (should succeed)
curl -X POST https://api.yourdomain.com/api/properties \
  -H "Origin: https://app.yourdomain.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; csrf_token=abc123..." \
  -H "X-CSRF-Token: abc123..." \
  -d '{"title":"Test Property"}' \
  -v

# Expected Response:
# HTTP/1.1 201 Created
# {"id":"...","title":"Test Property",...}
```

### 5) Stripe Webhook Exemption (curl)

```bash
# Test Stripe webhook (should work without CSRF)
curl -X POST https://api.yourdomain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=..." \
  -d '{"id":"evt_...","type":"payment_intent.succeeded"}' \
  -v

# Expected Response:
# HTTP/1.1 200 OK
# (Webhook processed successfully)
```

### 6) Cookie Domain Sharing (Browser)

**Steps:**
1. Login at `https://app.yourdomain.com`
2. Check cookies: Should see `access_token` with Domain `.yourdomain.com`
3. Navigate to `https://api.yourdomain.com/health` (or any API endpoint)
4. Check Network tab: Cookies should be sent automatically
5. Verify cookies work across both subdomains

---

## Files Changed

### Backend:
1. ✅ `backend/package.json` - Added `cookie-parser` dependency
2. ✅ `backend/src/index.ts` - Added cookie parser middleware, CSRF middleware
3. ✅ `backend/src/middleware/security-headers.ts` - Added `X-CSRF-Token` to CORS headers, support `FRONTEND_ORIGIN`
4. ✅ `backend/src/middleware/csrf.ts` - NEW: CSRF protection middleware
5. ✅ `backend/src/lib/utils/cookie-helpers.ts` - NEW: Cookie helper utilities
6. ✅ `backend/src/middleware/auth.ts` - Updated to support cookie-based auth
7. ✅ `backend/src/routes/auth.ts` - Added cookie setting, logout endpoint

### Frontend:
1. ✅ `listings/frontend/src/lib/api/client.ts` - Added `withCredentials`, CSRF token injection

### Documentation:
1. ✅ `docs/PHASE_0_REPO_DISCOVERY.md` - Discovery phase report
2. ✅ `docs/COOKIE_AUTH_IMPLEMENTATION.md` - This file

---

## Environment Variables Summary

### Backend Required:
- `FRONTEND_ORIGIN=https://app.yourdomain.com` (or `FRONTEND_URL`)
- `COOKIE_DOMAIN=.yourdomain.com`
- `NODE_ENV=production`
- `JWT_SECRET=...` (existing)
- `DATABASE_URL=...` (existing)

### Frontend Required:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

---

## Risks & Edge Cases

### 1. SameSite Cookie Behavior
- **Issue:** `SameSite=Lax` may block cookies on cross-site POST requests
- **Mitigation:** Using `Lax` allows top-level navigation while protecting against CSRF
- **Note:** If issues occur, consider `SameSite=None` with `Secure=true` (requires HTTPS)

### 2. Local Development (HTTP vs HTTPS)
- **Issue:** Cookies with `Secure=true` won't work on `http://localhost`
- **Mitigation:** `Secure` is only enabled in production (`NODE_ENV=production`)
- **Development:** Cookies work on `http://localhost` (Secure disabled)

### 3. Cookie Domain Format
- **Issue:** Domain must start with dot (`.yourdomain.com`) for subdomain sharing
- **Mitigation:** Validation warning if `COOKIE_DOMAIN` not set in production
- **Note:** Without dot, cookies only work on exact domain match

### 4. CSRF Token Expiration
- **Issue:** CSRF tokens expire after 24 hours
- **Mitigation:** Tokens regenerated on every GET request
- **Note:** Long-lived sessions may need token refresh

### 5. Bearer Token Fallback
- **Issue:** Maintaining both cookie and Bearer token auth increases complexity
- **Mitigation:** `ALLOW_BEARER_TOKENS` flag allows gradual migration
- **Plan:** Remove Bearer token support after cookie auth confirmed working

---

## Migration Checklist

- [x] Backend cookie parser installed
- [x] Backend CSRF middleware implemented
- [x] Backend cookie helpers created
- [x] Backend auth endpoints updated
- [x] Frontend credentials enabled
- [x] Frontend CSRF token injection
- [ ] Test CORS preflight
- [ ] Test cookie setting on login
- [ ] Test CSRF protection
- [ ] Test cookie domain sharing
- [ ] Test Stripe webhook exemption
- [ ] Remove Bearer token fallback (`ALLOW_BEARER_TOKENS = false`)
- [ ] Remove localStorage token storage

---

## Next Steps

1. **Deploy to staging environment**
2. **Run verification tests** (see PHASE 3)
3. **Monitor for cookie-related errors**
4. **Gradually disable Bearer token fallback**
5. **Remove localStorage token storage**

---

**Status:** ✅ Implementation Complete - Ready for Testing





