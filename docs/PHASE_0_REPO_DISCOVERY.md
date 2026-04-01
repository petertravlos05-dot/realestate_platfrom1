# PHASE 0 — REPO DISCOVERY

**Date:** 2025-01-XX  
**Purpose:** Map current CORS, cookie, and auth implementation before implementing cookie-based auth

---

## 1. Express App Bootstrap

**File:** `backend/src/index.ts`
- Express app created at line 106
- Trust proxy already set at line 110: `app.set('trust proxy', 1)` ✅
- CORS middleware applied at line 151
- No cookie-parser middleware found ❌

---

## 2. CORS Configuration

**File:** `backend/src/middleware/security-headers.ts` (lines 115-169)

**Current Implementation:**
- Function: `getCorsOptions()`
- Uses env var: `FRONTEND_URL` (comma-separated origins)
- `credentials: true` ✅ (already enabled)
- `methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']` ✅
- `allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']`
  - Missing: `X-CSRF-Token` ❌
- `exposedHeaders: ['Content-Length', 'X-Request-Id']`
- Development defaults: `http://localhost:3000`, `http://localhost:3001`, etc.

**Current Behavior:**
- Origin validation via allowlist (no wildcards in production)
- Allows requests with no origin (mobile apps, Postman, curl)

---

## 3. Cookie Usage

**Status:** ❌ **NO COOKIE USAGE FOUND**

- No `cookie-parser` middleware
- No `res.cookie()` calls
- No `req.cookies` usage
- No cookie-related dependencies in `package.json`

---

## 4. Auth Endpoints

**File:** `backend/src/routes/auth.ts`

**Endpoints:**
- `POST /api/auth/register` (line 15)
- `POST /api/auth/login` (line 171)
  - Returns JWT token in JSON response (line 240-252)
  - Token TTL: `7d` (line 229)
- `PUT /api/auth/update-role` (line 263)
  - Returns new JWT token in JSON response
  - Token TTL: `24h` (line 299)

**Current Token Response Format:**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**No endpoints found:**
- ❌ `/api/auth/logout` (not implemented)
- ❌ `/api/auth/refresh` (not implemented)

---

## 5. Frontend API Client

**File:** `listings/frontend/src/lib/api/client.ts`

**Current Implementation:**
- Uses `axios` (line 1)
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (line 4)
- **No `withCredentials` set** ❌
- Token storage: `localStorage.getItem('token')` (lines 38, 45, 59, 110)
- Token injection: `Authorization: Bearer ${token}` header (lines 31, 40, 47, 84, 134)

**Helper Functions:**
- `apiClient` (axios instance)
- `fetchFromBackend()` (fetch wrapper)
- `uploadToBackend()` (FormData upload wrapper)
- `apiFetch()` (unified wrapper)

**No CSRF token handling** ❌

---

## 6. Frontend Auth Token Utility

**File:** `listings/frontend/src/lib/auth-token.ts`

**Current Implementation:**
- Function: `getAuthToken()`
- Storage: `localStorage.getItem('token')` (line 9)
- Fallback: Fetches from `/api/auth/token` if not in localStorage
- Stores token in localStorage after fetch (line 26)

**No cookie-based token retrieval** ❌

---

## 7. Environment Variables

**Backend:**
- `FRONTEND_URL` - Used for CORS (comma-separated origins)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (production/development)
- `DATABASE_URL` - PostgreSQL connection string

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Backend API base URL

**Missing:**
- ❌ `FRONTEND_ORIGIN` (not used, but FRONTEND_URL exists)
- ❌ `COOKIE_DOMAIN` (not used)
- ❌ `.env.example` files (not found)

---

## 8. Current Token Flow

```
1. User logs in → POST /api/auth/login
   ↓
2. Backend generates JWT (expiresIn: '7d')
   ↓
3. Backend returns token in JSON: { user, token }
   ↓
4. Frontend stores token in localStorage
   ↓
5. Frontend sends token in Authorization header: Bearer <token>
   ↓
6. Backend validates token via validateJwtToken middleware
```

---

## 9. Files Summary

### Backend:
- ✅ `backend/src/index.ts` - Express bootstrap, trust proxy set
- ✅ `backend/src/middleware/security-headers.ts` - CORS configuration
- ✅ `backend/src/routes/auth.ts` - Auth endpoints
- ❌ No cookie-parser middleware
- ❌ No cookie utilities

### Frontend:
- ✅ `listings/frontend/src/lib/api/client.ts` - API client (axios)
- ✅ `listings/frontend/src/lib/auth-token.ts` - Token utility
- ❌ No cookie handling
- ❌ No CSRF token handling

---

## 10. Current Security Posture

| Feature | Status | Notes |
|---------|--------|-------|
| **Trust Proxy** | ✅ Set | `app.set('trust proxy', 1)` |
| **CORS** | ✅ Configured | Allowlist-based, credentials enabled |
| **CORS CSRF Header** | ❌ Missing | Need to add `X-CSRF-Token` |
| **Cookie Parser** | ❌ Not installed | Need to add |
| **Cookie Auth** | ❌ Not implemented | Tokens in localStorage |
| **CSRF Protection** | ❌ Not implemented | Required for cookie auth |
| **Refresh Tokens** | ❌ Not implemented | No refresh endpoint |

---

## Next Steps (PHASE 1-3)

1. **PHASE 1 - Backend:**
   - Verify trust proxy (already done ✅)
   - Update CORS to include `X-CSRF-Token` header
   - Add `cookie-parser` middleware
   - Add cookie helper utilities
   - Add CSRF middleware
   - Update auth endpoints to set cookies
   - Add env vars: `FRONTEND_ORIGIN`, `COOKIE_DOMAIN`

2. **PHASE 2 - Frontend:**
   - Add `withCredentials: true` to axios
   - Add `credentials: 'include'` to fetch calls
   - Add CSRF token reading and injection
   - Keep localStorage as fallback (migration path)

3. **PHASE 3 - Verification:**
   - Test CORS preflight
   - Test cookie setting
   - Test CSRF protection
   - Test cookie domain sharing

---

**Status:** ✅ Phase 0 Complete - Ready for implementation





