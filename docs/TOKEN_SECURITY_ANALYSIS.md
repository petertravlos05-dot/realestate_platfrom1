# Token Security Analysis

**Date:** 2025-01-XX  
**Purpose:** Document current JWT token configuration and storage

---

## 1. Access Token TTL (Time To Live)

### Backend API (`/auth/login`)
- **File:** `backend/src/routes/auth.ts:229`
- **TTL:** `7d` (7 ημέρες / 168 ώρες)
- **Code:**
  ```typescript
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
  ```

### Frontend API (`/api/auth/token`)
- **File:** `listings/frontend/src/app/api/auth/token/route.ts:35`
- **TTL:** `7d` (7 ημέρες / 168 ώρες)
- **Code:**
  ```typescript
  const token = jwt.sign(
    {
      userId: session.user.id,
      email: session.user.email,
      role: (session.user as any).role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
  ```

### Update Role Endpoint (`/auth/update-role`)
- **File:** `backend/src/routes/auth.ts:299`
- **TTL:** `24h` (24 ώρες)
- **Note:** Shorter TTL for role updates (security best practice)

---

## 2. Refresh Token Flow

**Status:** ❌ **NOT IMPLEMENTED**

- No refresh token mechanism exists
- No refresh token endpoint (`/auth/refresh`)
- No refresh token storage in database
- No refresh token rotation logic

**Current Behavior:**
- Users must re-login when access token expires (after 7 days)
- No automatic token renewal

**Security Implications:**
- ⚠️ Long-lived access tokens (7 days) increase risk if token is stolen
- ⚠️ No way to revoke tokens without changing JWT_SECRET (affects all users)
- ⚠️ No token rotation mechanism

---

## 3. Token Storage Location

### Current Implementation: **B) localStorage**

**Files:**
- `listings/frontend/src/lib/auth-token.ts:9,26`
- `listings/frontend/src/lib/api/client.ts:30,38,45,59,68,110,119`

**Storage Method:**
```typescript
// Store token
localStorage.setItem('token', token);

// Retrieve token
const token = localStorage.getItem('token');

// Use in Authorization header
config.headers.Authorization = `Bearer ${token}`;
```

**Security Risk:** ⚠️ **HIGH**
- Vulnerable to XSS attacks
- Accessible to any JavaScript code running on the page
- Persists across browser sessions
- Cannot be protected with httpOnly flag

**Not Used:**
- ❌ **A) httpOnly cookies** - Not implemented
- ❌ **C) In-memory only** - Token is persisted in localStorage

---

## 4. Security Concerns

### 4.1 Long Access Token TTL (7 days)
- **Risk:** If token is stolen, attacker has 7 days of access
- **Recommendation:** Reduce to 15 minutes - 1 hour, implement refresh tokens

### 4.2 No Refresh Token Mechanism
- **Risk:** Users must re-login frequently OR use long-lived tokens (current)
- **Recommendation:** Implement refresh token flow with:
  - Access token: 15m - 1h
  - Refresh token: 7d - 30d (stored in httpOnly cookie or secure database)

### 4.3 localStorage Storage
- **Risk:** XSS vulnerability can steal tokens
- **Recommendation:** Move to httpOnly cookies (CSRF protection needed) OR in-memory storage

### 4.4 No Token Revocation
- **Risk:** Cannot revoke individual tokens without changing JWT_SECRET
- **Recommendation:** Implement token blacklist or use refresh token rotation

---

## 5. Recommended Improvements

### Priority 1: Implement Refresh Token Flow
1. Create `/auth/refresh` endpoint
2. Store refresh tokens in database (with expiration and revocation support)
3. Reduce access token TTL to 15m - 1h
4. Set refresh token TTL to 7d - 30d

### Priority 2: Move Tokens to httpOnly Cookies
1. Store access token in httpOnly cookie (short-lived)
2. Store refresh token in httpOnly cookie (long-lived)
3. Implement CSRF protection (CSRF tokens or SameSite cookies)
4. Remove localStorage token storage

### Priority 3: Token Revocation
1. Add token blacklist table (Redis or database)
2. Check blacklist on every request
3. Implement logout endpoint that blacklists tokens

### Priority 4: Token Rotation
1. Rotate refresh tokens on each use
2. Invalidate old refresh token when new one is issued
3. Detect token reuse (potential attack indicator)

---

## 6. Current Token Flow

```
1. User logs in → POST /auth/login
   ↓
2. Backend generates JWT (expiresIn: '7d')
   ↓
3. Frontend receives token → stores in localStorage
   ↓
4. Frontend uses token in Authorization header for API calls
   ↓
5. Token expires after 7 days → User must re-login
```

---

## 7. Files Involved

### Backend:
- `backend/src/routes/auth.ts` - Login endpoint, token generation
- `backend/src/middleware/auth.ts` - Token validation middleware
- `backend/src/lib/utils/jwt-secret.ts` - JWT secret management

### Frontend:
- `listings/frontend/src/lib/auth-token.ts` - Token retrieval utility
- `listings/frontend/src/lib/api/client.ts` - API client with token injection
- `listings/frontend/src/app/api/auth/token/route.ts` - Token generation from NextAuth session

---

## Summary

| Aspect | Current State | Security Level |
|--------|--------------|----------------|
| **Access Token TTL** | 7 days | ⚠️ Medium (too long) |
| **Refresh Token** | ❌ Not implemented | ❌ High risk |
| **Token Storage** | localStorage | ⚠️ High risk (XSS) |
| **Token Revocation** | ❌ Not implemented | ⚠️ High risk |
| **Token Rotation** | ❌ Not implemented | ⚠️ Medium risk |

**Overall Security Rating:** ⚠️ **MEDIUM-HIGH RISK**

**Immediate Actions Required:**
1. Reduce access token TTL to 15m - 1h
2. Implement refresh token mechanism
3. Move tokens to httpOnly cookies
4. Add token revocation capability





