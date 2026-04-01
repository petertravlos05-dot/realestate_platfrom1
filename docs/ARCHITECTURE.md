# System Architecture

**Last Updated:** 2025-01-XX  
**Purpose:** Technical architecture documentation for security and compliance audit

---

## Overview

This document describes the technical architecture, entry points, services, and trust boundaries of the real estate platform.

**Platform Type:** Real Estate Marketplace  
**Deployment:** Render.com (backend) + Next.js (frontend)  
**Database:** PostgreSQL (via Prisma ORM)  
**Storage:** AWS S3 (file storage)  
**Payments:** Stripe

---

## 1. System Components

### 1.1 Backend Service (Express.js)

**Location:** `backend/`  
**Runtime:** Node.js (TypeScript)  
**Framework:** Express.js  
**Port:** 3001 (default) or `PORT` env var  
**Entry Point:** `backend/src/index.ts`

**Key Features:**
- RESTful API
- JWT authentication (Bearer tokens + httpOnly cookies)
- CSRF protection
- Rate limiting (Redis or in-memory)
- File upload handling (multer + S3)
- GDPR DSAR endpoints
- Audit logging
- Sentry error tracking

**Middleware Stack (order matters):**
1. Helmet (security headers)
2. Custom security headers
3. Request ID middleware
4. Sentry request context
5. Cookie parser
6. CORS
7. CSRF protection
8. Body parsers (JSON, URL-encoded)
9. Routes
10. Error handlers

**Environment Variables:**
- `NODE_ENV` - Environment (production|staging|development)
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (validated at startup)
- `FRONTEND_ORIGIN` / `FRONTEND_URL` - Allowed CORS origins (comma-separated)
- `COOKIE_DOMAIN` - Cookie domain (for cross-subdomain auth)
- `RATE_LIMIT_REDIS_URL` - Redis URL for distributed rate limiting (optional)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` - S3 config
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe config
- `SENTRY_ENABLE`, `SENTRY_DSN_BACKEND`, `SENTRY_ENVIRONMENT` - Sentry config
- `TERMS_VERSION`, `PRIVACY_VERSION` - Consent version tracking

**Trust Proxy:** Enabled (`app.set('trust proxy', 1)`) for Render.com reverse proxy

---

### 1.2 Frontend Service (Next.js)

**Location:** `listings/frontend/`  
**Runtime:** Node.js (TypeScript)  
**Framework:** Next.js 14  
**Port:** 3000 (default)  
**Entry Point:** `listings/frontend/src/app/`

**Key Features:**
- Server-side rendering (SSR)
- API routes (`src/app/api/`)
- Client-side React components
- NextAuth.js authentication
- Sentry error tracking (client/server/edge)
- Stripe integration

**API Routes:**
- `/api/auth/[...nextauth]` - NextAuth authentication
- `/api/properties/*` - Property operations (some proxied to backend)
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/admin/*` - Admin endpoints

**Environment Variables:**
- `NODE_ENV` - Environment
- `NEXTAUTH_URL` - Frontend URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `DATABASE_URL` - PostgreSQL connection (for NextAuth)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `JWT_SECRET` - JWT secret (shared with backend)
- `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe config
- `AWS_*` - S3 config (for direct uploads)
- `SENTRY_DSN_FRONTEND`, `SENTRY_ENVIRONMENT` - Sentry config

---

### 1.3 Database (PostgreSQL)

**Provider:** Render PostgreSQL or external  
**ORM:** Prisma  
**Schema:** `backend/prisma/schema.prisma`  
**Migrations:** `backend/prisma/migrations/`

**Key Models:**
- `User` - User accounts (with soft delete support)
- `Property` - Property listings
- `Transaction` - Property transactions
- `Message`, `Inquiry` - User communications
- `SupportTicket`, `SupportMessage` - Support system
- `UserConsent` - GDPR consent tracking
- `FileDeletionJob` - S3 deletion queue
- `WebhookEvent` - Stripe webhook idempotency
- `Subscription`, `SubscriptionPlan` - Subscription management

**Connection:** Via `DATABASE_URL` environment variable

---

### 1.4 File Storage (AWS S3)

**Provider:** AWS S3  
**Bucket:** Configured via `AWS_S3_BUCKET_NAME`  
**Region:** Configured via `AWS_REGION`  
**Access:** Private bucket (ACL: private) - **NOT VERIFIED: Signed URLs not implemented**

**Storage Paths:**
- `properties/{propertyId}/{documentType}/{filename}` - Property documents
- `properties/{filename}` - Property images (legacy)

**Access Control:**
- **Current:** Direct URLs (`https://bucket.s3.region.amazonaws.com/key`)
- **Security Issue:** Files should use signed URLs with expiration
- **Code:** `backend/src/routes/properties.ts:65, 744, 980`

---

### 1.5 Payment Processing (Stripe)

**Provider:** Stripe, Inc.  
**Integration:** Stripe SDK (`stripe` npm package)  
**Webhook Endpoint:** `/api/stripe/webhook`  
**Webhook Security:** Signature verification + idempotency

**Data Flow:**
1. Frontend creates checkout session via backend
2. User completes payment on Stripe
3. Stripe sends webhook to backend
4. Backend verifies signature + checks idempotency
5. Backend updates subscription status

**PCI Compliance:**
- ✅ No card data touches our servers
- ✅ All payment data handled by Stripe
- ✅ PCI scope: SAQ-A (card data never stored)

**Code References:**
- `backend/src/routes/stripe.ts` - Stripe routes
- `backend/src/lib/utils/webhook-security.ts` - Webhook security utilities

---

### 1.6 Rate Limiting (Redis / In-Memory)

**Provider:** Redis (if configured) or in-memory fallback  
**Configuration:** `RATE_LIMIT_REDIS_URL` (optional)

**Rate Limiters:**
- `strictRateLimit` - 3 req/hour (login, registration, deletion)
- `loginRateLimit` - 5 req/15min (login endpoint)
- `mediumRateLimit` - 30 req/min (token refresh, consents)
- `generalRateLimit` - 100 req/15min (general API)
- `highRateLimit` - 200 req/15min (search, listings)
- `exportRateLimit` - 2 req/hour (GDPR export)
- `exportPaginationRateLimit` - 20 req/hour (export pagination)
- `webhookRateLimit` - 100 req/min (Stripe webhooks)
- `adminRateLimit` - 5 req/min (admin endpoints)

**Bypass Logic:**
- **Production:** Bypass disabled (even with `X-Test-Request` header)
- **Development:** Bypass allowed only from localhost with header
- **Code:** `backend/src/middleware/rateLimit.ts:153-180`

---

### 1.7 Error Tracking (Sentry)

**Provider:** Sentry  
**Integration:** `@sentry/node` (backend), `@sentry/nextjs` (frontend)  
**Configuration:** `SENTRY_ENABLE=true`, `SENTRY_DSN_*`

**Data Scrubbing:**
- ✅ Headers: authorization, cookie, x-csrf-token removed
- ✅ Cookies: access_token, refresh_token removed
- ✅ Query params: token, jwt, password removed
- ✅ Request body: password, token fields removed (auth endpoints)
- ✅ User context: Only hashed userId (never email)
- **Code:** `backend/src/lib/sentry.ts:64-173`

---

## 2. Entry Points

### 2.1 Public Endpoints (No Auth)

- `GET /health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/properties` - List properties (public)
- `GET /api/properties/:id` - Get property details (public)

### 2.2 Authenticated Endpoints (JWT Required)

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/export` - GDPR data export
- `POST /api/user/delete` - GDPR account deletion
- `GET /api/user/consents` - Get consent history
- `POST /api/user/consents/accept` - Accept consents
- All `/api/seller/*`, `/api/buyer/*`, `/api/agent/*` endpoints

### 2.3 Admin Endpoints (ADMIN Role Required)

- `GET /api/admin/*` - Admin operations
- `GET /api/admin/gdpr/health` - GDPR health metrics (if `ENABLE_ADMIN_HEALTH=true`)

### 2.4 Webhook Endpoints (Signature Verification)

- `POST /api/stripe/webhook` - Stripe webhook (bypasses CSRF, uses raw body)

---

## 3. Trust Boundaries

### 3.1 External → Frontend

**Trust Level:** Low  
**Protection:**
- CORS (allowlist: `FRONTEND_ORIGIN`)
- CSRF tokens (cookie + header)
- Rate limiting
- Security headers (CSP, HSTS, X-Frame-Options)

### 3.2 Frontend → Backend

**Trust Level:** Medium  
**Protection:**
- JWT authentication
- CSRF tokens
- CORS allowlist
- Rate limiting

### 3.3 Backend → Database

**Trust Level:** High  
**Protection:**
- Connection string encryption (env var)
- Prisma ORM (SQL injection protection)
- Parameterized queries

### 3.4 Backend → S3

**Trust Level:** Medium  
**Protection:**
- AWS credentials (env vars)
- Private bucket ACL
- **Security Gap:** Signed URLs not implemented (files accessible via direct URLs)

### 3.5 Stripe → Backend (Webhook)

**Trust Level:** Low (external)  
**Protection:**
- Signature verification (`stripe.webhooks.constructEvent`)
- Idempotency checks (WebhookEvent table)
- Rate limiting (100 req/min)
- IP allowlist: **NOT VERIFIED** (should restrict to Stripe IPs)

---

## 4. Network Architecture

```
Internet
  │
  ├─→ Render.com (Reverse Proxy)
  │     │
  │     ├─→ Backend Service (Express.js :3001)
  │     │     ├─→ PostgreSQL Database
  │     │     ├─→ Redis (optional, rate limiting)
  │     │     └─→ AWS S3 (file storage)
  │     │
  │     └─→ Frontend Service (Next.js :3000)
  │           └─→ Stripe (payment processing)
  │
  └─→ Stripe Webhooks → Backend (/api/stripe/webhook)
```

**Domain Setup:**
- Frontend: `app.domain.com` (or `https://app.domain.com`)
- Backend: `api.domain.com` (or `https://api.domain.com`)
- CORS: Allows only `https://app.domain.com` (+ staging equivalents)

---

## 5. Authentication Flow

### 5.1 Login Flow

1. User submits credentials → `POST /api/auth/login`
2. Backend validates credentials (bcrypt password check)
3. Backend checks consent status (returns 428 if missing)
4. Backend generates JWT token (7-day expiration)
5. Backend sets `access_token` cookie (httpOnly, secure, sameSite)
6. Backend returns JWT token in response body (for localStorage)
7. Frontend stores token (cookie or localStorage)

### 5.2 Token Validation

**Middleware:** `validateJwtToken` (`backend/src/middleware/auth.ts`)

**Process:**
1. Extract token from cookie (`access_token`) or Authorization header (`Bearer <token>`)
2. Verify JWT signature using `JWT_SECRET`
3. Check token expiration
4. Check if user account is deleted (`isDeleted=true` → 403)
5. Attach `userId`, `userRole`, `userEmail` to request

**Token Storage:**
- **Backend:** httpOnly cookies (preferred)
- **Frontend:** localStorage (fallback, XSS risk)

**Security Gap:** Token in localStorage vulnerable to XSS. Consider migrating to httpOnly cookies only.

---

## 6. Authorization Model

**Middleware:** `backend/src/middleware/authorization.ts`

**Checks:**
- `requirePropertyOwnership` - User must own property
- `requireTransactionAccess` - User must be buyer/seller/agent/admin
- `requireViewingRequestAccess` - User must be involved in viewing
- `requirePropertyLeadAccess` - User must be involved in lead
- `requireFavoriteOwnership` - User must own favorite
- `requirePropertyAccess` - More permissive (owner/admin/relationship)

**Implementation:** `backend/src/lib/utils/authorization.ts`

---

## 7. Data Flow

### 7.1 User Registration

1. Frontend → `POST /api/auth/register` (with validation)
2. Backend validates input (Zod schema)
3. Backend hashes password (bcrypt)
4. Backend creates user (Prisma)
5. Backend returns user (no password)

### 7.2 Property Upload

1. Frontend → `POST /api/properties` (with images)
2. Backend validates ownership (if updating)
3. Backend validates files (MIME type, magic bytes, size)
4. Backend uploads to S3 (or local storage)
5. Backend stores property record (Prisma)
6. Backend returns property data

### 7.3 GDPR Export

1. User → `POST /api/user/export`
2. Backend validates auth + rate limit
3. Backend collects user data (paginated, 2MB limit)
4. Backend returns JSON export

### 7.4 Account Deletion

1. User → `POST /api/user/delete` (with password)
2. Backend validates password
3. Backend anonymizes user (transaction)
4. Backend revokes sessions
5. Backend queues S3 deletions (async)
6. Backend returns success

---

## 8. Security Headers

**Middleware:** `backend/src/middleware/security-headers.ts`

**Headers Set:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), ...`
- `Content-Security-Policy: default-src 'self'; ...`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HTTPS only)

**HSTS Logic:**
- Only set in production
- Only if request is secure (checks `x-forwarded-proto` header)
- **Code:** `backend/src/middleware/security-headers.ts:24-54`

---

## 9. Logging & Monitoring

### 9.1 Audit Logging

**Implementation:** `backend/src/lib/utils/audit-logger.ts`

**Events Logged:**
- Login attempts (success/failure)
- Registration
- Role changes
- Property operations
- Authorization failures
- Rate limit violations
- DSAR requests (export, deletion)

**Data Sanitization:**
- Email addresses: Domain only (e.g., `@example.com`)
- Passwords: Never logged
- Tokens: Never logged
- IP addresses: Logged (required for security)

**Storage:** Console logs (structured JSON)

### 9.2 Error Tracking (Sentry)

**Implementation:** `backend/src/lib/sentry.ts`

**Scrubbing:** See Section 1.7

**Events:**
- Exceptions (with stack traces)
- DSAR failures (grouped by fingerprint)
- S3 deletion failures (grouped)

---

## 10. Environment Configuration

### 10.1 Required Variables

**Backend:**
- `JWT_SECRET` - Validated at startup (must be strong)
- `DATABASE_URL` - PostgreSQL connection
- `FRONTEND_ORIGIN` or `FRONTEND_URL` - CORS allowlist (production)

**Frontend:**
- `NEXTAUTH_URL` - Frontend URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_API_URL` - Backend URL

### 10.2 Optional Variables

- `RATE_LIMIT_REDIS_URL` - Redis for distributed rate limiting
- `SENTRY_ENABLE`, `SENTRY_DSN_*` - Error tracking
- `AWS_*` - S3 configuration
- `STRIPE_*` - Payment processing
- `TERMS_VERSION`, `PRIVACY_VERSION` - Consent tracking

**Validation:** `backend/src/index.ts:18-132` (validates critical vars at startup)

---

## 11. Deployment

### 11.1 Render.com Configuration

**File:** `render.yaml`

**Services:**
- `realestate-backend` - Express.js backend
- `realestate-frontend` - Next.js frontend

**Health Checks:**
- Backend: `GET /health`
- Frontend: Next.js default

**Environment Variables:** Synced via Render dashboard (marked `sync: false`)

---

## 12. Security Considerations

### 12.1 Verified Security Controls

- ✅ JWT secret validation at startup
- ✅ CSRF protection (cookie + header)
- ✅ Rate limiting (IP + user-based)
- ✅ Input validation (Zod schemas)
- ✅ Authorization checks (ownership/involvement)
- ✅ Password hashing (bcrypt)
- ✅ Security headers (HSTS, CSP, etc.)
- ✅ File upload validation (MIME, magic bytes, size)
- ✅ Stripe webhook signature verification
- ✅ Audit logging (sanitized)
- ✅ Sentry scrubbing (no PII/tokens)

### 12.2 Security Gaps Identified

- ❌ **S3 Signed URLs:** Files accessible via direct URLs (should use signed URLs with expiration)
- ❌ **Stripe Webhook IP Allowlist:** Not verified (should restrict to Stripe IP ranges)
- ⚠️ **Token Storage:** JWT in localStorage (XSS risk) - consider httpOnly cookies only
- ⚠️ **Email Provider:** Not identified (DPA status unknown)
- ⚠️ **Database Location:** Not verified (should be EU for GDPR)

---

## 13. GDPR Compliance Architecture

### 13.1 DSAR Endpoints

- `POST /api/user/export` - Data export (paginated, 2MB limit)
- `POST /api/user/delete` - Account deletion (anonymization + S3 queue)
- `GET /api/user/consents` - Consent history
- `POST /api/user/consents/accept` - Accept consents

### 13.2 Consent Enforcement

- Login gating: Returns 428 if consents missing
- Consent versions tracked (`TERMS_VERSION`, `PRIVACY_VERSION`)
- Consent history stored (`UserConsent` model)

### 13.3 Data Retention

- Cleanup job: `backend/src/jobs/cleanupJob.ts`
- FileDeletionJob retention: 30 days (deleted), 90 days (failed)
- Audit logs: Console logs (retention managed by log service)

---

## Next Steps

1. **Implement S3 Signed URLs:** Replace direct URLs with signed URLs (expiration: 1 hour)
2. **Verify Stripe Webhook IP Allowlist:** Restrict webhook endpoint to Stripe IP ranges
3. **Migrate Token Storage:** Move from localStorage to httpOnly cookies only
4. **Identify Email Provider:** Document email service and DPA status
5. **Verify Database Location:** Confirm PostgreSQL is in EU region
6. **Create .env.example:** Document all environment variables

---

**Document Status:** ✅ Architecture Documented - Security Gaps Identified



