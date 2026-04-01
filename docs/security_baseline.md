# Security Baseline

**Last Updated:** 2025-01-XX  
**Version:** 1.0

This document defines the security baseline for the Real Estate Platform. All code must comply with these rules.

---

## 1. Authentication & Authorization

### 1.1 JWT Secrets
- ✅ **REQUIRED:** JWT_SECRET must be set in environment variables
- ✅ **REQUIRED:** JWT_SECRET must be at least 32 characters long
- ❌ **FORBIDDEN:** Hardcoded JWT secrets in code
- ❌ **FORBIDDEN:** Default/fallback secrets
- ✅ **REQUIRED:** Application must fail to start if JWT_SECRET missing in production

**Implementation:**
- Use `getJwtSecret()` utility function (backend: `backend/src/lib/utils/jwt-secret.ts`, frontend: `listings/frontend/src/lib/utils/jwt-secret.ts`)
- Validate secret strength at startup
- Never use `process.env.JWT_SECRET || 'fallback'` pattern

### 1.2 Password Security
- ✅ **REQUIRED:** Passwords must be hashed with bcrypt (minimum 12 rounds)
- ✅ **REQUIRED:** Password strength policy (min 12 chars, complexity)
- ✅ **REQUIRED:** Account lockout after 5 failed login attempts
- ❌ **FORBIDDEN:** Storing plaintext passwords
- ❌ **FORBIDDEN:** Weak password policies

### 1.3 Object-Level Authorization (BOLA/IDOR Protection)
- ✅ **REQUIRED:** Every endpoint accessing user-owned resources must verify ownership/involvement
- ✅ **REQUIRED:** Use explicit authorization middleware or utility functions
- ❌ **FORBIDDEN:** Trusting user-provided IDs without verification
- ✅ **REQUIRED:** Admin endpoints must verify admin role
- ✅ **REQUIRED:** Return 404 for non-existent resources, 403 for unauthorized access (prevents enumeration)

**Implementation:**
- Use authorization middleware from `backend/src/middleware/authorization.ts`
- Use utility functions from `backend/src/lib/utils/authorization.ts`
- See `docs/authz_matrix.md` for complete authorization rules

**Pattern:**
```typescript
// ✅ GOOD - Using middleware
router.get('/:id', validateJwtToken, requirePropertyOwnership, handler);

// ✅ GOOD - Using utility function
const result = await checkPropertyOwnership(propertyId, userId);
if (!result.allowed) {
  return res.status(403).json({ error: result.reason });
}

// ❌ BAD - Missing ownership check
router.get('/:id', validateJwtToken, handler); // No authorization check!
```

**Protected Resources:**
- Properties (ownership required for UPDATE/DELETE)
- Transactions (involvement required: buyer/seller/agent)
- Viewing Requests (involvement required)
- Property Leads (involvement required)
- Favorites (ownership required)
- Property Availability (ownership required)

---

## 2. Input Validation & Sanitization

### 2.1 Mass Assignment Prevention
- ✅ **REQUIRED:** Use strict schemas (Zod) for all inputs
- ✅ **REQUIRED:** Whitelist allowed fields
- ✅ **REQUIRED:** Reject unknown fields using `.strict()` in Zod schemas
- ❌ **FORBIDDEN:** Accepting unknown fields from request body
- ❌ **FORBIDDEN:** Allowing updates to protected fields (`role`, `userId`, `isVerified`, `createdAt`, etc.)
- ✅ **REQUIRED:** Use `validateBody()` middleware for all POST/PUT/PATCH endpoints

**Protected Fields (cannot be updated via API):**
- `id`
- `userId` / `ownerId`
- `role`
- `isVerified`
- `createdAt`
- `updatedAt` (auto-managed)
- `password` (use dedicated password change endpoint)

**Implementation:**
- Use validation schemas from `backend/src/lib/validation/schemas.ts`
- Use `validateBody(schema)` middleware from `backend/src/middleware/validation.ts`
- All schemas use `.strict()` to reject unknown fields

**Example:**
```typescript
// ✅ GOOD
router.patch('/:id', validateBody(updatePropertySchema), handler);

// ❌ BAD
router.patch('/:id', handler); // No validation!
```

### 2.2 Input Sanitization
- ✅ **REQUIRED:** Sanitize all user inputs
- ✅ **REQUIRED:** Validate email format
- ✅ **REQUIRED:** Validate URL format
- ✅ **REQUIRED:** Escape HTML in user-generated content
- ❌ **FORBIDDEN:** Storing raw user input without validation

### 2.3 Request Size Limits
- ✅ **REQUIRED:** JSON body limit: 10MB
- ✅ **REQUIRED:** URL-encoded body limit: 10MB
- ✅ **REQUIRED:** File upload limit: 10MB per file
- ❌ **FORBIDDEN:** Unlimited request sizes

**Implementation:**
- Configured in `backend/src/index.ts`: `express.json({ limit: '10mb' })`
- Multer file size limits should be configured per route

### 2.4 Pagination Limits
- ✅ **REQUIRED:** Maximum page size: 100 items
- ✅ **REQUIRED:** Maximum page number: 1000
- ✅ **REQUIRED:** Default page size: 20 items
- ✅ **REQUIRED:** All list endpoints must support pagination
- ❌ **FORBIDDEN:** Returning unlimited results

**Implementation:**
- Use `parsePagination()` from `backend/src/lib/validation/pagination.ts`
- Use `createPaginationMeta()` for pagination metadata
- Apply to all GET endpoints that return lists

**Example:**
```typescript
const { page, limit, skip } = parsePagination(req.query);
const [items, total] = await Promise.all([
  prisma.model.findMany({ skip, take: limit }),
  prisma.model.count(),
]);
const pagination = createPaginationMeta(page, limit, total);
res.json({ data: items, pagination });
```

---

## 3. Rate Limiting

### 3.1 Authentication Endpoints
- ✅ **REQUIRED:** Login: 5 requests per 15 minutes per IP (configurable via `RATE_LIMIT_LOGIN_POINTS`, `RATE_LIMIT_LOGIN_DURATION`)
- ✅ **REQUIRED:** Registration: 3 requests per hour per IP (strict rate limit)
- ✅ **REQUIRED:** Password reset: 3 requests per hour per IP (strict rate limit)
- ✅ **REQUIRED:** OTP endpoints: 5 requests per 15 minutes per IP
- ✅ **REQUIRED:** Token refresh/update-role: 30 requests per minute per IP

### 3.2 API Endpoints
- ✅ **REQUIRED:** General API: 100 requests per 15 minutes per IP (configurable via `RATE_LIMIT_GENERAL_POINTS`, `RATE_LIMIT_GENERAL_DURATION`)
- ✅ **REQUIRED:** Properties list/search: 200 requests per 15 minutes per IP (high rate limit)
- ✅ **REQUIRED:** Seller/Agent endpoints (properties, leads, clients): 30 requests per minute per IP
- ✅ **REQUIRED:** File upload: 30 requests per minute per IP
- ✅ **REQUIRED:** Webhook endpoints: 100 requests per minute per IP

### 3.3 Implementation
- ✅ **IMPLEMENTED:** Uses `rate-limiter-flexible` middleware
- ✅ **IMPLEMENTED:** Supports Redis (if `RATE_LIMIT_REDIS_URL` set) or in-memory fallback
- ✅ **REQUIRED:** Return `429 Too Many Requests` when limit exceeded
- ✅ **REQUIRED:** Include `Retry-After` header in response
- ✅ **REQUIRED:** Configurable via environment variables

### 3.4 Environment Variables

**Rate Limiting Configuration:**
```env
# Enable/disable rate limiting (default: true)
RATE_LIMIT_ENABLED=true

# Redis URL (optional - if not set, uses in-memory)
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Login limits
RATE_LIMIT_LOGIN_POINTS=5
RATE_LIMIT_LOGIN_DURATION=900  # seconds (15 minutes)
RATE_LIMIT_LOGIN_BLOCK_DURATION=900

# General API limits
RATE_LIMIT_GENERAL_POINTS=100
RATE_LIMIT_GENERAL_DURATION=900  # seconds (15 minutes)

# Strict limits (registration, password reset)
RATE_LIMIT_STRICT_POINTS=3
RATE_LIMIT_STRICT_DURATION=3600  # seconds (1 hour)

# Medium limits (token refresh, update-role)
RATE_LIMIT_MEDIUM_POINTS=30
RATE_LIMIT_MEDIUM_DURATION=60  # seconds (1 minute)

# High limits (search, properties list)
RATE_LIMIT_HIGH_POINTS=200
RATE_LIMIT_HIGH_DURATION=900  # seconds (15 minutes)
```

### 3.5 Applied Routes

**Strict Rate Limit (3/hour):**
- `POST /api/auth/register`

**Login Rate Limit (5/15min):**
- `POST /api/auth/login`

**Medium Rate Limit (30/min):**
- `PUT /api/auth/update-role`
- `GET /api/auth/me`
- `GET /api/seller/properties`
- `GET /api/seller/leads`
- `GET /api/agent/properties`
- `GET /api/agent/clients`
- `POST /api/buyer/interested-properties`
- `POST /api/properties` (create)
- `POST /api/properties/images` (upload)

**High Rate Limit (200/15min):**
- `GET /api/properties` (list/search)

**OTP Rate Limit (5/15min):**
- `POST /api/buyer-agent/connect`
- `POST /api/buyer-agent/verify-otp`

---

## 4. Security Headers

### 4.1 Required Headers
- ✅ **REQUIRED:** `Content-Security-Policy` (CSP)
- ✅ **REQUIRED:** `Strict-Transport-Security` (HSTS) - max-age: 31536000 (production only)
- ✅ **REQUIRED:** `X-Frame-Options: DENY`
- ✅ **REQUIRED:** `X-Content-Type-Options: nosniff`
- ✅ **REQUIRED:** `X-XSS-Protection: 1; mode=block`
- ✅ **REQUIRED:** `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ **REQUIRED:** `Permissions-Policy` (restrictive)
- ✅ **REQUIRED:** Remove `X-Powered-By` header

**Implementation:**
- Uses `helmet` middleware (`backend/src/index.ts`)
- Custom security headers middleware (`backend/src/middleware/security-headers.ts`)
- CSP configured for React/Next.js apps (allows unsafe-inline for styles/scripts)
- HSTS only enabled in production with HTTPS

**Headers Set:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Restricts browser features (geolocation, camera, etc.)
- `Content-Security-Policy` - Restricts resource loading
- `Strict-Transport-Security` - Forces HTTPS (production only)

**Testing:**
```bash
# Run test script
node backend/scripts/test-security-headers.js

# Or check manually
curl -I http://localhost:3001/health
```

---

## 5. CORS Configuration

### 5.1 Rules
- ✅ **REQUIRED:** Use allowlist (no wildcard in production)
- ✅ **REQUIRED:** Fail-fast if `FRONTEND_URL` not set in production
- ✅ **REQUIRED:** Only allow necessary headers
- ✅ **REQUIRED:** Only allow necessary methods
- ❌ **FORBIDDEN:** `Access-Control-Allow-Origin: *` in production
- ✅ **REQUIRED:** Support multiple origins via comma-separated `FRONTEND_URL`

**Implementation:**
- CORS configuration in `backend/src/middleware/security-headers.ts`
- Uses `getCorsOptions()` helper function
- Normalizes origins (removes trailing slashes)
- Allows requests with no origin (mobile apps, Postman)

**Environment Variables:**
```env
# Single origin
FRONTEND_URL=http://localhost:3000

# Multiple origins (comma-separated)
FRONTEND_URL=http://localhost:3000,https://app.example.com,https://www.example.com
```

**Allowed Headers:**
- `Content-Type`
- `Authorization`
- `X-Requested-With`

**Allowed Methods:**
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `OPTIONS`

**Development Defaults:**
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

**Production Behavior:**
- If `FRONTEND_URL` not set: **FAILS** (no wildcard fallback)
- If `FRONTEND_URL` set: Only allows specified origins
- Credentials: `true` (allows cookies/auth headers)

---

## 6. File Upload Security

### 6.1 Validation
- ✅ **REQUIRED:** Whitelist allowed MIME types
- ✅ **REQUIRED:** Verify magic bytes match declared MIME type
- ✅ **REQUIRED:** Enforce max file size (10MB)
- ✅ **REQUIRED:** Sanitize filenames (remove path separators)
- ✅ **REQUIRED:** Store files with UUID names (not original filename)
- ✅ **REQUIRED:** Reject forbidden file extensions
- ✅ **REQUIRED:** Malware scanning hook (stub implemented, TODO: integrate ClamAV/cloud service)
- ❌ **FORBIDDEN:** Executable file types (.exe, .sh, .php, etc.)
- ❌ **FORBIDDEN:** Files without proper MIME type validation

**Implementation:**
- File validation utilities: `backend/src/lib/utils/file-validation.ts`
- Secure upload middleware: `backend/src/middleware/file-upload.ts`
- Uses `file-type` library for magic byte detection
- Uses `multer` with secure configuration

**Allowed MIME Types (Images):**
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

**Allowed MIME Types (Documents):**
- `application/pdf`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)

**Forbidden Extensions:**
- Executables: `.exe`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.msi`, `.dll`
- Scripts: `.sh`, `.bash`, `.zsh`, `.php`, `.asp`, `.aspx`, `.jsp`, `.py`, `.rb`, `.pl`
- PowerShell: `.ps1`, `.psm1`, `.psd1`, `.psc1`
- Other: `.js`, `.jar`, `.vbs`, `.so`, `.dylib`

**File Size Limits:**
- Images: 10MB max
- Documents: 10MB max
- Configured in multer limits

### 6.2 Storage
- ✅ **REQUIRED:** Private storage (S3 bucket with private ACL)
- ✅ **REQUIRED:** Use signed URLs for private file access
- ✅ **REQUIRED:** Secure filename generation (UUID-based)
- ✅ **REQUIRED:** Filename sanitization (remove path separators, dangerous chars)

**Implementation:**
- Files stored with UUID-based filenames
- Original filenames sanitized before processing
- S3 uploads use secure key generation
- Local storage uses secure directory structure

### 6.3 Malware Scanning
- ✅ **REQUIRED:** Malware scanning hook (stub implemented)
- ⚠️ **TODO:** Integrate actual malware scanning service
  - Options: ClamAV (local), AWS GuardDuty, VirusTotal API
  - Current implementation: Stub that logs scan attempts

**Current Status:**
- Hook implemented: `scanForMalware()` in `backend/src/middleware/file-upload.ts`
- Currently returns `{ clean: true }` (stub)
- TODO: Implement actual scanning integration
- ✅ **REQUIRED:** Malware scanning hook (even if stubbed)
- ❌ **FORBIDDEN:** Public file storage without access control

---

## 7. Payment/Webhook Security

### 7.1 Stripe Webhooks
- ✅ **REQUIRED:** Verify webhook signatures
- ✅ **REQUIRED:** Make handlers idempotent (dedupe by event ID)
- ✅ **REQUIRED:** Store processed event IDs in database
- ✅ **REQUIRED:** Only process events from Stripe API (never trust frontend)
- ✅ **REQUIRED:** Rate limiting on webhook endpoint
- ✅ **REQUIRED:** Structured logging for webhook events
- ❌ **FORBIDDEN:** Processing webhooks without signature verification
- ❌ **FORBIDDEN:** Processing duplicate events (must check event ID)

**Implementation:**
- Webhook security utilities: `backend/src/lib/utils/webhook-security.ts`
- Webhook handler: `backend/src/routes/stripe.ts`
- Database model: `WebhookEvent` (stores processed event IDs)
- Rate limiting: `webhookRateLimit` middleware (100 requests/minute)

**Idempotency Pattern:**
```typescript
// ✅ GOOD - Check if event already processed
const alreadyProcessed = await isEventProcessed(event.id);
if (alreadyProcessed) {
  return res.json({ received: true, message: 'Event already processed' });
}

// Mark as processing
await markEventProcessed(event, 'RETRYING');

// Process event...
await handleEvent(event);

// Mark as completed
await markEventProcessed(event, 'PROCESSED');

// ❌ BAD - Process without idempotency check
// await handleEvent(event); // Can create duplicates!
```

**Signature Verification:**
```typescript
// ✅ GOOD - Verify signature before processing
event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

// ❌ BAD - Process without signature verification
// const event = JSON.parse(body); // Never trust!
```

**Rate Limiting:**
- Webhook endpoint: 100 requests per minute per IP
- Configurable via `RATE_LIMIT_WEBHOOK_POINTS` and `RATE_LIMIT_WEBHOOK_DURATION`
- Block duration: 5 minutes if exceeded

**Structured Logging:**
- All webhook events logged with: event ID, event type, status, IP address, request ID
- Logs include: signature verification, idempotency checks, handler success/failure
- No secrets or sensitive data logged

---

## 8. Audit Logging

### 8.1 Required Events
- ✅ **REQUIRED:** Login attempts (success/failure)
- ✅ **REQUIRED:** Failed login attempts
- ✅ **REQUIRED:** Password changes
- ✅ **REQUIRED:** Role changes
- ✅ **REQUIRED:** Property creation/modification/deletion
- ✅ **REQUIRED:** Payment events
- ✅ **REQUIRED:** Webhook events
- ✅ **REQUIRED:** Admin actions
- ✅ **REQUIRED:** Authorization failures
- ✅ **REQUIRED:** Rate limit exceeded events
- ✅ **REQUIRED:** API errors

### 8.2 Log Format
- ✅ **REQUIRED:** Structured logging (JSON)
- ✅ **REQUIRED:** Include: timestamp, user ID, IP address, action, resource ID
- ✅ **REQUIRED:** Request ID for correlation (X-Request-ID header)
- ✅ **REQUIRED:** Sanitize sensitive data (passwords, tokens, secrets)
- ✅ **REQUIRED:** Sanitize email addresses (show only domain)
- ❌ **FORBIDDEN:** Logging secrets or passwords
- ❌ **FORBIDDEN:** Logging full credit card numbers
- ❌ **FORBIDDEN:** Logging full email addresses

**Implementation:**
- Audit logger: `backend/src/lib/utils/audit-logger.ts`
- Request ID middleware: `backend/src/middleware/request-id.ts`
- Applied to: auth routes, property routes, authorization middleware, rate limit middleware

**Example:**
```json
{
  "timestamp": "2025-01-XXT12:00:00Z",
  "requestId": "req-1234567890-abc123",
  "eventType": "login.failure",
  "userId": null,
  "userEmail": "te***@example.com",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "action": "Login attempt failed",
  "status": "failure",
  "details": {
    "email": "te***@example.com",
    "reason": "Invalid password"
  },
  "error": "Invalid password"
}
```

**Audit Event Types:**
- `login.success` - Successful login
- `login.failure` - Failed login attempt
- `login.blocked` - Login blocked by rate limiting
- `logout` - User logout
- `password.change` - Password changed
- `password.reset.request` - Password reset requested
- `password.reset.complete` - Password reset completed
- `role.change` - User role changed
- `property.create` - Property created
- `property.update` - Property updated
- `property.delete` - Property deleted
- `authorization.failed` - Authorization check failed
- `rate_limit.exceeded` - Rate limit exceeded
- `api.error` - API error occurred

---

## 9. Secrets & Configuration

### 9.1 Environment Variables
- ✅ **REQUIRED:** All secrets in environment variables
- ✅ **REQUIRED:** `.env.example` file (no values, documented)
- ✅ **REQUIRED:** Startup validation for critical secrets
- ✅ **REQUIRED:** Fail-fast in production if critical secrets missing
- ✅ **REQUIRED:** Production warnings for missing recommended vars
- ❌ **FORBIDDEN:** Committing `.env` files (must be in `.gitignore`)
- ❌ **FORBIDDEN:** Hardcoded secrets

### 9.2 Required Environment Variables

**Backend (Required):**
- `JWT_SECRET` (32+ chars) - Validated at startup
- `DATABASE_URL` (PostgreSQL) - Validated at startup

**Backend (Required in Production):**
- `FRONTEND_URL` - Must be set or CORS will deny all requests

**Backend (Optional but Recommended):**
- `STRIPE_SECRET_KEY` - For payments
- `STRIPE_WEBHOOK_SECRET` - For webhooks
- `AWS_ACCESS_KEY_ID` - For S3 file uploads
- `AWS_SECRET_ACCESS_KEY` - For S3 file uploads
- `AWS_REGION` - For S3 (default: us-east-1)
- `AWS_S3_BUCKET` - For S3 file storage
- `RATE_LIMIT_REDIS_URL` - For distributed rate limiting (recommended in production)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

**Frontend (Required):**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `DATABASE_URL` - Must match backend (for NextAuth)
- `NEXTAUTH_SECRET` (32+ chars) - For NextAuth sessions
- `NEXTAUTH_URL` - Frontend URL
- `JWT_SECRET` (32+ chars) - Must match backend

**Frontend (Optional):**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - For Stripe payments
- `STRIPE_SECRET_KEY` - For server-side Stripe operations
- `STRIPE_WEBHOOK_SECRET` - For webhooks
- `AWS_ACCESS_KEY_ID` - For S3
- `AWS_SECRET_ACCESS_KEY` - For S3
- `AWS_REGION` - For S3
- `AWS_S3_BUCKET` - For S3
- `NEXT_PUBLIC_ADMIN_KEY` - For admin features

### 9.3 Startup Validation

**Backend:**
- Validates `JWT_SECRET` length (must be 32+ chars)
- Validates `DATABASE_URL` format (must start with `postgresql://`)
- In production: Requires `FRONTEND_URL` (fails fast if missing)
- In production: Warns if `FRONTEND_URL` doesn't use HTTPS
- Warns about missing recommended vars in production

**Files:**
- `backend/.env.example` - Template with all variables documented
- `listings/frontend/.env.example` - Template with all variables documented
- `backend/src/index.ts` - Startup validation logic

---

## 10. Error Handling

### 10.1 Rules
- ✅ **REQUIRED:** Generic error messages (don't reveal if email exists)
- ✅ **REQUIRED:** No stack traces in production
- ✅ **REQUIRED:** Log errors server-side
- ❌ **FORBIDDEN:** Detailed error messages exposing system internals
- ❌ **FORBIDDEN:** Different error messages for "email not found" vs "wrong password"

**Example:**
```typescript
// ✅ GOOD
return res.status(401).json({ error: 'Invalid credentials' });

// ❌ BAD
return res.status(401).json({ error: 'Email not found' });
return res.status(401).json({ error: 'Wrong password' });
```

---

## 11. Dependency Management & Supply Chain Security

### 11.1 Rules
- ✅ **REQUIRED:** Fix high/critical vulnerabilities immediately
- ✅ **REQUIRED:** Use lockfiles (`package-lock.json`)
- ✅ **REQUIRED:** Regular dependency scanning (`npm audit`)
- ✅ **REQUIRED:** Type checking before deployment (`tsc --noEmit`)
- ✅ **REQUIRED:** Lockfile verification (ensure package-lock.json exists)
- ❌ **FORBIDDEN:** Ignoring security advisories
- ❌ **FORBIDDEN:** Committing without lockfiles

### 11.2 Dependency Scanning

**Backend:**
```bash
# Run security checks
npm run security-check

# Or individual checks
npm audit                    # Check vulnerabilities
npm audit fix                 # Attempt automatic fixes
npm run type-check            # TypeScript type checking
```

**Frontend:**
```bash
npm audit                    # Check vulnerabilities
npm audit fix                # Attempt automatic fixes
npm run type-check           # TypeScript type checking
npm run lint                 # ESLint checking
```

### 11.3 CI/CD Integration

**GitHub Actions:**
- Workflow: `.github/workflows/security-checks.yml`
- Runs on: push, pull_request, weekly schedule
- Checks: dependency audit, type checking, linting

**Manual Checks:**
- Run `npm run security-check` before committing
- Review `npm audit` output regularly
- Update dependencies when security patches available

### 11.4 Vulnerability Severity

- **Critical/High:** Must fix immediately (blocks deployment)
- **Moderate:** Should fix soon (warnings in CI)
- **Low:** Informational (non-blocking)

---

## 12. Testing

### 12.1 Security Tests
- ✅ **REQUIRED:** Tests for IDOR prevention
- ✅ **REQUIRED:** Tests for mass assignment prevention
- ✅ **REQUIRED:** Tests for authentication bypass
- ✅ **REQUIRED:** Tests for rate limiting
- ✅ **REQUIRED:** Tests for input validation

---

## Compliance Checklist

Before deploying to production, verify:

- [ ] All hardcoded secrets removed
- [ ] JWT_SECRET set and validated
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] CORS configured correctly
- [ ] File upload validation implemented
- [ ] Input validation/sanitization in place
- [ ] Object-level authorization checks added
- [ ] Audit logging implemented
- [ ] Error messages are generic
- [ ] Dependencies scanned and updated
- [ ] Tests written for security controls

---

## 13. Infrastructure & Deployment

### 13.1 Reverse Proxy Configuration

**Render.com Deployment:**
- ✅ **REQUIRED:** `app.set('trust proxy', 1)` configured in Express
- ✅ **REQUIRED:** Rate limiting uses `req.ip` (not manual X-Forwarded-For parsing)
- ✅ **REQUIRED:** Audit logging uses `req.ip` (not manual X-Forwarded-For parsing)
- ✅ **REQUIRED:** Render runs behind a reverse proxy

**Implementation:**
- Trust proxy is set to `1` (trust first proxy) in `backend/src/index.ts`
- All IP tracking (rate limiting, audit logs) uses `req.ip` which automatically handles X-Forwarded-For headers
- No manual parsing of `x-forwarded-for` or `x-real-ip` headers needed

---

**End of Security Baseline**

