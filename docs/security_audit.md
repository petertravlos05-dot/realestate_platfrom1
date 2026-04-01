# Security Audit Report
**Date:** 2025-01-XX  
**Auditor:** Security Engineering Team  
**Scope:** Full-stack security audit (Frontend + Backend + APIs + Infrastructure)

---

## Executive Summary

This security audit identifies critical vulnerabilities across authentication, authorization, input validation, file uploads, and infrastructure configuration. **15 Critical/High severity issues** were identified requiring immediate attention.

**Risk Distribution:**
- 🔴 **Critical:** 5 issues
- 🟠 **High:** 10 issues  
- 🟡 **Medium:** 8 issues
- 🟢 **Low:** 4 issues

---

## PHASE 0: Repository Map

### Stack Overview

**Backend:**
- **Framework:** Express.js (TypeScript)
- **Port:** 3001 (configurable via PORT env)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT tokens (Bearer token in Authorization header)
- **File Storage:** AWS S3 (with local fallback to `public/uploads/`)
- **Payments:** Stripe (webhooks + checkout sessions)
- **Deployment:** Render.com (based on `render.yaml`)

**Frontend:**
- **Framework:** Next.js 14 (TypeScript, React)
- **Port:** 3000 (default)
- **Auth:** NextAuth.js (JWT strategy) + direct JWT from backend
- **API Calls:** Axios client + fetch helpers (`/lib/api/client.ts`)
- **Deployment:** Vercel (likely)

### Key Folders

```
backend/
├── src/
│   ├── index.ts              # Main Express app, CORS config
│   ├── middleware/
│   │   └── auth.ts            # JWT validation, role checks
│   ├── routes/                # 28 route files
│   │   ├── auth.ts            # Login, register, JWT creation
│   │   ├── properties.ts     # CRUD operations
│   │   ├── buyer.ts          # Buyer-specific endpoints
│   │   ├── seller.ts         # Seller-specific endpoints
│   │   ├── agent.ts          # Agent-specific endpoints
│   │   ├── stripe.ts         # Payment processing
│   │   └── ...
│   └── lib/
│       └── prisma.ts          # Database client

listings/frontend/
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes (103 files)
│   │   ├── dashboard/        # Protected pages
│   │   └── ...
│   ├── lib/
│   │   ├── auth.ts           # NextAuth config
│   │   └── api/client.ts     # Backend API client
│   └── middleware.ts         # Route protection
```

### Authentication Entrypoints

1. **Backend:** `/api/auth/login` (POST) - Returns JWT token
2. **Backend:** `/api/auth/register` (POST) - Creates user, returns JWT
3. **Frontend:** `/api/auth/[...nextauth]/route.ts` - NextAuth handler
4. **Frontend:** `/api/auth/login/route.ts` - Direct JWT login

**Auth Flow:**
- User logs in → Backend validates → Returns JWT (7d expiry)
- Frontend stores JWT in localStorage + NextAuth session
- Requests include `Authorization: Bearer <token>`
- Backend middleware `validateJwtToken` verifies token

### Main API Routes

**Public:**
- `GET /api/properties` - List properties (optional auth)
- `GET /api/properties/:id` - Property details

**Authenticated:**
- `POST /api/properties` - Create property (requires auth)
- `GET /api/buyer/interested-properties` - Buyer leads
- `GET /api/seller/properties` - Seller's properties
- `GET /api/agent/properties` - Agent's properties
- `POST /api/properties/images` - Upload images
- `POST /api/stripe/create-checkout-session` - Payment
- `POST /api/stripe/webhook` - Stripe webhook

**Admin:**
- `/api/admin/*` - Admin operations

### Permission System Location

**Backend:**
- `backend/src/middleware/auth.ts`:
  - `validateJwtToken` - Verifies JWT, sets `req.userId`, `req.userRole`
  - `requireRole(...roles)` - Role-based access control
  - `optionalAuth` - Sets user if token exists, doesn't fail

**Frontend:**
- `listings/frontend/src/middleware.ts` - Route protection
- `listings/frontend/src/lib/auth.ts` - NextAuth config

**Current Roles:** `BUYER`, `SELLER`, `AGENT`, `ADMIN`

### Middleware/Security Settings

**Current:**
- ✅ CORS configured (allowlist-based, but warns if FRONTEND_URL not set)
- ✅ JWT validation middleware
- ✅ Role-based access control (`requireRole`)
- ❌ **No rate limiting**
- ❌ **No security headers (helmet)**
- ❌ **No CSRF protection**
- ❌ **No request size limits**
- ❌ **No input sanitization**

### Existing Rate Limiting / Logging / Monitoring

- ❌ **No rate limiting** (no `express-rate-limit` found)
- ⚠️ **Basic logging:** `console.log` / `console.error` only
- ❌ **No structured audit logging**
- ❌ **No monitoring/alerting**

---

## PHASE 1: Security Gap Report

### OWASP Top 10 (Web) + API Top 10 Alignment

---

## 🔴 CRITICAL ISSUES

### 1. Hardcoded JWT Secret Fallback
**Severity:** CRITICAL  
**OWASP Category:** A02:2021 – Cryptographic Failures

**Evidence:**
- `backend/src/middleware/auth.ts:35`: `process.env.JWT_SECRET || 'Agapao_ton_stivo05'`
- `backend/src/routes/auth.ts:199`: Same hardcoded fallback
- `listings/frontend/src/app/api/auth/login/route.ts:34`: Same fallback

**Exploit Scenario:**
- Attacker can forge JWT tokens if `JWT_SECRET` env var is missing
- Can impersonate any user, including admins
- Full system compromise

**Recommended Fix:**
- Remove all fallback secrets
- Add startup check that fails if `JWT_SECRET` missing in production
- Use strong, randomly generated secrets (min 32 bytes)

---

### 2. Missing Object-Level Authorization (BOLA/IDOR)
**Severity:** CRITICAL  
**OWASP Category:** API01:2023 – Broken Object Level Authorization

**Evidence:**
- `backend/src/routes/buyer.ts:312` - DELETE `/interested-properties/:id` checks `buyerId: userId` but uses `propertyId` from params
- `backend/src/routes/seller.ts:86` - GET `/properties/:property_id` checks `userId` but doesn't verify ownership
- `backend/src/routes/properties.ts:607` - POST `/:id/favorite` - No ownership check before favorite operations
- Many endpoints accept resource IDs from URL params without verifying user owns/accesses that resource

**Exploit Scenario:**
```javascript
// Attacker can access/modify other users' resources
DELETE /api/buyer/interested-properties/<victim_property_id>
GET /api/seller/properties/<victim_property_id>
PATCH /api/properties/<victim_property_id>
```

**Recommended Fix:**
- Create explicit authorization layer
- Every endpoint that accesses user-owned resources must verify ownership
- Use middleware: `requireOwnership(resourceType, idParam)`
- Add integration tests proving IDOR prevention

---

### 3. Mass Assignment Vulnerabilities
**Severity:** CRITICAL  
**OWASP Category:** API8:2023 – Security Misconfiguration

**Evidence:**
- `backend/src/routes/auth.ts:74-96` - Registration accepts all fields from `req.body` without whitelist
- `backend/src/routes/properties.ts:164-279` - Property creation accepts all fields
- No schema validation (Zod/Joi) to reject unknown fields
- Protected fields (`role`, `userId`, `isVerified`) can be overwritten

**Exploit Scenario:**
```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "pass",
  "role": "ADMIN",  // ⚠️ Should be rejected
  "isVerified": true  // ⚠️ Should be rejected
}
```

**Recommended Fix:**
- Use strict schemas (Zod) for all inputs
- Whitelist allowed fields
- Reject unknown fields
- Protect sensitive fields (`role`, `userId`, `isVerified`, `createdAt`, etc.)

---

### 4. File Upload Security Gaps
**Severity:** CRITICAL  
**OWASP Category:** A03:2021 – Injection

**Evidence:**
- `backend/src/routes/properties.ts:667-710` - Image upload accepts any file type
- `backend/src/routes/properties.ts:12-14` - Multer config: `storage: multer.memoryStorage()` - No size limits
- No MIME type validation
- No magic byte verification
- Files stored with original filename (path traversal risk)
- No malware scanning

**Exploit Scenario:**
- Upload `.php` file → Execute on server
- Upload large file → DoS
- Upload malicious image → XSS if served unsafely

**Recommended Fix:**
- Whitelist allowed MIME types (`image/jpeg`, `image/png`, `image/webp`)
- Verify magic bytes match declared MIME type
- Enforce max file size (e.g., 10MB)
- Sanitize filenames (remove path separators)
- Store files with UUID names
- Add malware scanning hook (ClamAV integration or cloud service)

---

### 5. No Rate Limiting
**Severity:** CRITICAL  
**OWASP Category:** API4:2023 – Unrestricted Resource Consumption

**Evidence:**
- No `express-rate-limit` package found
- Login endpoint (`/api/auth/login`) has no throttling
- Registration endpoint (`/api/auth/register`) has no throttling
- File upload endpoints have no rate limits
- Search endpoints have no rate limits

**Exploit Scenario:**
- Brute-force login attempts
- Registration spam
- DoS via rapid requests
- Resource exhaustion

**Recommended Fix:**
- Install `express-rate-limit`
- Add per-IP rate limiting (e.g., 5 req/min for login)
- Add per-user rate limiting (if authenticated)
- Stricter limits for sensitive endpoints (login, register, upload)

---

## 🟠 HIGH SEVERITY ISSUES

### 6. Missing Security Headers
**Severity:** HIGH  
**OWASP Category:** A05:2021 – Security Misconfiguration

**Evidence:**
- No `helmet` middleware found
- No CSP headers
- No HSTS headers
- No X-Frame-Options
- No X-Content-Type-Options

**Exploit Scenario:**
- Clickjacking attacks
- MIME type sniffing
- XSS via missing CSP

**Recommended Fix:**
- Install and configure `helmet`
- Set CSP policy
- Enable HSTS
- Set `X-Frame-Options: DENY`
- Set `X-Content-Type-Options: nosniff`

---

### 7. Stripe Webhook Not Idempotent
**Severity:** HIGH  
**OWASP Category:** API9:2023 – Improper Assets Management

**Evidence:**
- `backend/src/routes/stripe.ts:148-178` - `handleCheckoutSessionCompleted` doesn't check for duplicate events
- No deduplication by Stripe event ID
- Can create duplicate subscriptions if webhook retries

**Exploit Scenario:**
- Stripe retries webhook → Duplicate subscription created
- User charged multiple times
- Database inconsistency

**Recommended Fix:**
- Store processed event IDs
- Check if event already processed before handling
- Make handlers idempotent

---

### 8. No Audit Logging
**Severity:** HIGH  
**OWASP Category:** A09:2021 – Security Logging and Monitoring Failures

**Evidence:**
- Only `console.log` / `console.error` used
- No structured logging
- No audit trail for:
  - Login attempts (success/failure)
  - Password changes
  - Role changes
  - Property modifications
  - Payment events

**Exploit Scenario:**
- Cannot detect attacks
- Cannot investigate incidents
- No compliance trail

**Recommended Fix:**
- Implement structured audit logging (Winston/Pino)
- Log all security events with:
  - User ID
  - IP address
  - Timestamp
  - Action type
  - Resource ID
- Ensure logs don't contain secrets/PII

---

### 9. CORS Configuration Warnings
**Severity:** HIGH  
**OWASP Category:** A05:2021 – Security Misconfiguration

**Evidence:**
- `backend/src/index.ts:32-34` - Warns but allows all origins if `FRONTEND_URL` not set in production
- Could allow unauthorized origins

**Exploit Scenario:**
- If `FRONTEND_URL` missing in production → All origins allowed
- CSRF attacks possible

**Recommended Fix:**
- Fail-fast if `FRONTEND_URL` not set in production
- Never allow wildcard in production
- Use strict allowlist

---

### 10. No Input Sanitization
**Severity:** HIGH  
**OWASP Category:** A03:2021 – Injection

**Evidence:**
- No input sanitization library found
- User inputs stored directly in database
- No XSS protection for user-generated content
- No SQL injection protection (Prisma helps, but not foolproof)

**Exploit Scenario:**
- XSS via property descriptions
- Stored XSS in user names/emails
- NoSQL injection if Prisma bypassed

**Recommended Fix:**
- Sanitize all user inputs (DOMPurify for HTML, validator for emails/URLs)
- Use parameterized queries (Prisma does this, but verify)
- Escape output in frontend

---

### 11. Password Policy Weak
**Severity:** HIGH  
**OWASP Category:** A07:2021 – Identification and Authentication Failures

**Evidence:**
- `backend/src/routes/auth.ts:71` - Password hashed with bcrypt (✅ good)
- But no password strength requirements
- No password history
- No account lockout after failed attempts

**Exploit Scenario:**
- Weak passwords → Brute-forceable
- No lockout → Unlimited attempts

**Recommended Fix:**
- Enforce password policy (min 12 chars, complexity)
- Add account lockout after 5 failed attempts
- Implement password history

---

### 12. No CSRF Protection
**Severity:** HIGH  
**OWASP Category:** A01:2021 – Broken Access Control

**Evidence:**
- No CSRF tokens
- No SameSite cookie protection
- JWT in localStorage (XSS risk)

**Exploit Scenario:**
- Attacker tricks user into making authenticated request
- User's actions performed without consent

**Recommended Fix:**
- Use SameSite cookies for session
- Add CSRF tokens for state-changing operations
- Consider moving JWT to httpOnly cookies

---

### 13. JWT Token Storage in localStorage
**Severity:** HIGH  
**OWASP Category:** A02:2021 – Cryptographic Failures

**Evidence:**
- `listings/frontend/src/lib/api/client.ts:30` - Stores token in `localStorage`
- Vulnerable to XSS attacks

**Exploit Scenario:**
- XSS vulnerability → Attacker steals JWT from localStorage
- Full account compromise

**Recommended Fix:**
- Use httpOnly cookies for JWT
- Or use NextAuth session cookies (already configured)

---

### 14. No Request Size Limits
**Severity:** HIGH  
**OWASP Category:** API4:2023 – Unrestricted Resource Consumption

**Evidence:**
- `backend/src/index.ts:56` - `express.json()` with no `limit` option
- No body parser limits
- Can cause DoS via large payloads

**Exploit Scenario:**
- Attacker sends 100MB JSON → Server crashes

**Recommended Fix:**
- Set `express.json({ limit: '10mb' })`
- Set `express.urlencoded({ limit: '10mb' })`
- Configure nginx/reverse proxy limits

---

### 15. Secrets in Code (Multiple Instances)
**Severity:** HIGH  
**OWASP Category:** A07:2021 – Identification and Authentication Failures

**Evidence:**
- Hardcoded JWT secret fallback (already listed as Critical)
- No `.env.example` file found
- No startup validation of required secrets

**Exploit Scenario:**
- Developer commits `.env` file → Secrets exposed
- Missing env vars → System uses insecure defaults

**Recommended Fix:**
- Create `.env.example` with all required vars (no values)
- Add startup check: fail if critical secrets missing
- Never commit `.env` files

---

## 🟡 MEDIUM SEVERITY ISSUES

### 16. No MFA Support
**Severity:** MEDIUM  
**Category:** A07:2021 – Identification and Authentication Failures

**Evidence:**
- No MFA implementation
- No TOTP/2FA for admin/seller/agent roles

**Recommended Fix:**
- Add MFA hooks/placeholders
- Implement TOTP for privileged roles
- Document MFA setup process

---

### 17. Error Messages Leak Information
**Severity:** MEDIUM  
**Category:** A01:2021 – Broken Access Control

**Evidence:**
- `backend/src/routes/auth.ts:183` - "Λανθασμένο email ή κωδικός" (good - generic)
- But some endpoints return detailed errors

**Recommended Fix:**
- Standardize error messages
- Don't reveal if email exists
- Don't expose stack traces in production

---

### 18. No Dependency Scanning
**Severity:** MEDIUM  
**Category:** A06:2021 – Vulnerable Components

**Evidence:**
- No `npm audit` in CI
- No Dependabot/Snyk integration
- Vulnerable dependencies may exist

**Recommended Fix:**
- Add `npm audit` to CI
- Set up Dependabot
- Regular dependency updates

---

### 19. No Pagination Limits
**Severity:** MEDIUM  
**Category:** API4:2023 – Unrestricted Resource Consumption

**Evidence:**
- `backend/src/routes/properties.ts:71` - GET `/api/properties` returns all properties
- No pagination
- Can cause DoS

**Recommended Fix:**
- Add pagination (default 20, max 100)
- Enforce max page size

---

### 20. Debug Logging in Production
**Severity:** MEDIUM  
**Category:** A09:2021 – Security Logging and Monitoring Failures

**Evidence:**
- `backend/src/middleware/auth.ts:40-46` - Debug logs with token details
- Could leak sensitive info

**Recommended Fix:**
- Remove debug logs in production
- Use log levels (debug/error/info)

---

### 21. No Request ID Correlation
**Severity:** MEDIUM  
**Category:** A09:2021 – Security Logging and Monitoring Failures

**Evidence:**
- No request IDs in logs
- Hard to trace requests across services

**Recommended Fix:**
- Add request ID middleware
- Include request ID in all logs

---

### 22. S3 Bucket Permissions Not Verified
**Severity:** MEDIUM  
**Category:** A05:2021 – Security Misconfiguration

**Evidence:**
- Files uploaded to S3 without ACL checks
- No verification that bucket is private

**Recommended Fix:**
- Verify S3 bucket ACLs
- Use signed URLs for private files
- Ensure bucket is not public

---

### 23. No Health Check Security
**Severity:** MEDIUM  
**Category:** A05:2021 – Security Misconfiguration

**Evidence:**
- `backend/src/index.ts:63` - `/health` endpoint returns basic info
- Could leak version info

**Recommended Fix:**
- Keep health check minimal
- Don't expose version/stack info

---

## 🟢 LOW SEVERITY ISSUES

### 24. Weak CORS Headers
**Severity:** LOW  
**Category:** A05:2021 – Security Misconfiguration

**Evidence:**
- `backend/src/index.ts:47` - `allowedHeaders: ['Content-Type', 'Authorization']`
- Could be more restrictive

**Recommended Fix:**
- Only allow necessary headers

---

### 25. No Content Security Policy
**Severity:** LOW (covered in #6)  
**Category:** A03:2021 – Injection

**Note:** Already addressed in Security Headers issue.

---

### 26. JWT Expiry Too Long
**Severity:** LOW  
**Category:** A07:2021 – Identification and Authentication Failures

**Evidence:**
- `backend/src/routes/auth.ts:200` - JWT expires in 7 days
- Could be shorter (e.g., 1 day) with refresh tokens

**Recommended Fix:**
- Reduce JWT expiry to 1 day
- Implement refresh tokens

---

### 27. No API Versioning
**Severity:** LOW  
**Category:** API9:2023 – Improper Assets Management

**Evidence:**
- No API versioning (`/api/v1/...`)
- Hard to deprecate endpoints

**Recommended Fix:**
- Add versioning for future-proofing

---

## Top 10 Fix Plan (Ordered by Impact)

1. **🔴 Remove hardcoded JWT secret fallbacks** (Critical - 30 min)
2. **🔴 Implement object-level authorization checks** (Critical - 4 hours)
3. **🔴 Add rate limiting** (Critical - 2 hours)
4. **🔴 Fix file upload security** (Critical - 3 hours)
5. **🔴 Prevent mass assignment** (Critical - 2 hours)
6. **🟠 Add security headers (helmet)** (High - 30 min)
7. **🟠 Make Stripe webhooks idempotent** (High - 1 hour)
8. **🟠 Implement audit logging** (High - 3 hours)
9. **🟠 Add input sanitization** (High - 2 hours)
10. **🟠 Fix CORS configuration** (High - 30 min)

---

## Next Steps

1. Review this audit with team
2. Prioritize fixes based on business impact
3. Implement fixes one-by-one (see PHASE 2)
4. Add tests for each fix
5. Update security baseline document

---

**End of Security Audit Report**





