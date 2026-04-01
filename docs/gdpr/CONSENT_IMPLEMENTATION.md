# GDPR Consent History Implementation

**Last Updated:** 2025-01-XX  
**Status:** ✅ Implemented

---

## Overview

This document describes the implementation of GDPR consent tracking for Terms of Service, Privacy Policy, and optional Marketing consent.

---

## Backend Implementation

### Database Schema

**Model:** `UserConsent` (`backend/prisma/schema.prisma`)

```prisma
enum ConsentType {
  TERMS
  PRIVACY
  MARKETING
}

model UserConsent {
  id          String      @id @default(cuid())
  userId      String
  consentType ConsentType
  version     String      // Version identifier (e.g., "2026-01-01")
  acceptedAt  DateTime    @default(now())
  ip          String?     // IP address at time of consent
  userAgent   String?     // User agent at time of consent
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, consentType, version])
  @@index([userId])
  @@index([consentType])
  @@index([acceptedAt])
  @@map("user_consents")
}
```

### Environment Variables

```env
TERMS_VERSION=2026-01-01
PRIVACY_VERSION=2026-01-01
MARKETING_VERSION=2026-01-01  # Optional
```

### Files Created/Modified

1. **`backend/src/lib/utils/consent-helpers.ts`** (NEW)
   - `getCurrentConsentVersions()` - Get versions from env vars
   - `checkUserConsents()` - Check if user has required consents
   - `recordConsent()` - Record consent acceptance

2. **`backend/src/routes/consents.ts`** (NEW)
   - `POST /api/user/consents/accept` - Accept consents
   - `GET /api/user/consents` - Get consent history

3. **`backend/src/routes/auth.ts`** (MODIFIED)
   - Added consent check in login endpoint
   - Returns 428 if consent missing

4. **`backend/src/index.ts`** (MODIFIED)
   - Added warning for missing consent version env vars
   - Registered consents routes

### API Endpoints

#### POST /api/user/consents/accept

**Authentication:** Required  
**CSRF:** Required (via middleware)  
**Rate Limit:** Medium

**Request Body:**
```json
{
  "consents": [
    { "type": "TERMS", "version": "2026-01-01" },
    { "type": "PRIVACY", "version": "2026-01-01" }
  ]
}
```

**Response:**
```json
{
  "message": "Consents recorded successfully",
  "consents": [
    { "type": "TERMS", "version": "2026-01-01" },
    { "type": "PRIVACY", "version": "2026-01-01" }
  ]
}
```

#### GET /api/user/consents

**Authentication:** Required

**Response:**
```json
{
  "consents": [
    {
      "id": "cuid123",
      "consentType": "TERMS",
      "version": "2026-01-01",
      "acceptedAt": "2026-01-03T10:00:00Z"
    }
  ],
  "status": {
    "TERMS": { "current": true, "latestVersion": "2026-01-01" },
    "PRIVACY": { "current": true, "latestVersion": "2026-01-01" }
  },
  "currentVersions": {
    "TERMS": "2026-01-01",
    "PRIVACY": "2026-01-01"
  }
}
```

**Note:** IP address and user agent are stored but NOT returned in the API response for privacy.

---

## Login Flow with Consent Check

### Flow Diagram

```
1. User attempts login
   ↓
2. Backend validates credentials
   ↓
3. Backend checks consent versions
   ↓
4a. If consent missing → 428 CONSENT_REQUIRED
   ↓
   Frontend shows consent modal
   ↓
   User accepts consents
   ↓
   Frontend calls POST /api/user/consents/accept
   ↓
   Frontend retries login
   ↓
4b. If consent present → Login succeeds (200)
```

### 428 Response Format

```json
{
  "error": "CONSENT_REQUIRED",
  "required": ["TERMS", "PRIVACY"],
  "versions": {
    "TERMS": "2026-01-01",
    "PRIVACY": "2026-01-01"
  },
  "message": "Please accept the latest Terms of Service and Privacy Policy to continue."
}
```

---

## Security Features

### Authentication
- All consent endpoints require authentication (`validateJwtToken` middleware)
- Users can only access/modify their own consents

### CSRF Protection
- POST `/api/user/consents/accept` requires CSRF token
- CSRF middleware applied via `csrfProtection` in `backend/src/index.ts`

### Rate Limiting
- Consent acceptance endpoint uses `mediumRateLimit`
- Prevents abuse and spam

### Privacy
- IP address and user agent stored for audit but NOT exposed in GET endpoint
- Audit logs contain minimal PII (only consent types and versions)

---

## Testing

### Test Script

**File:** `backend/scripts/test-consent-flow.js`

**Usage:**
```bash
cd backend
node scripts/test-consent-flow.js
```

**Tests:**
1. Login without consent → 428 CONSENT_REQUIRED
2. Accept consent → Login succeeds (manual verification)

### Manual Testing with curl

#### 1. Test Login Without Consent

```bash
# Login (should return 428 if user has no consents)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Expected Response (428):**
```json
{
  "error": "CONSENT_REQUIRED",
  "required": ["TERMS", "PRIVACY"],
  "versions": {
    "TERMS": "2026-01-01",
    "PRIVACY": "2026-01-01"
  }
}
```

#### 2. Accept Consents (Requires Authentication)

```bash
# First, get auth token (if using Bearer token auth)
TOKEN="your-jwt-token"

# Accept consents
curl -X POST http://localhost:3001/api/user/consents/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "consents": [
      {"type": "TERMS", "version": "2026-01-01"},
      {"type": "PRIVACY", "version": "2026-01-01"}
    ]
  }'
```

**Expected Response (200):**
```json
{
  "message": "Consents recorded successfully",
  "consents": [
    {"type": "TERMS", "version": "2026-01-01"},
    {"type": "PRIVACY", "version": "2026-01-01"}
  ]
}
```

#### 3. Get Consent History

```bash
curl -X GET http://localhost:3001/api/user/consents \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "consents": [...],
  "status": {...},
  "currentVersions": {...}
}
```

#### 4. Retry Login (Should Succeed)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Expected Response (200):**
```json
{
  "user": {...},
  "token": "..."
}
```

---

## Frontend Integration (TODO)

### Required Changes

1. **Login Handler** (`listings/frontend/src/lib/api/client.ts` or login page)
   - Detect 428 response
   - Show consent modal/page
   - Call POST `/api/user/consents/accept`
   - Retry login

2. **Consent Modal Component** (NEW)
   - Display Terms and Privacy Policy links
   - Checkboxes for acceptance
   - Submit button

3. **Privacy Center** (NEW)
   - Display consent history
   - Show current consent status
   - Link to Terms/Privacy Policy

### Example Frontend Code (Pseudocode)

```typescript
// Login handler
async function handleLogin(email: string, password: string) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    if (error.response?.status === 428) {
      // Show consent modal
      const consentData = error.response.data;
      await showConsentModal(consentData);
      // Retry login
      return handleLogin(email, password);
    }
    throw error;
  }
}

// Consent modal
async function showConsentModal(consentData: ConsentRequiredResponse) {
  // Show modal with Terms/Privacy checkboxes
  const accepted = await userAcceptsConsents(consentData.versions);
  if (accepted) {
    await apiClient.post('/user/consents/accept', {
      consents: [
        { type: 'TERMS', version: consentData.versions.TERMS },
        { type: 'PRIVACY', version: consentData.versions.PRIVACY },
      ],
    });
  }
}
```

---

## Database Migration

After updating `schema.prisma`, run:

```bash
cd backend
npx prisma generate
npx prisma db push
# OR
npx prisma migrate dev --name add_user_consents
```

---

## Environment Setup

Add to `.env`:

```env
TERMS_VERSION=2026-01-01
PRIVACY_VERSION=2026-01-01
MARKETING_VERSION=2026-01-01  # Optional
```

---

## Summary

✅ **Backend Complete:**
- Database model created
- Consent helpers implemented
- API endpoints created
- Login enforcement added
- Security (auth, CSRF, rate limiting) implemented
- Test script created

⏳ **Frontend Pending:**
- Consent modal component
- Login handler update
- Privacy Center page

---

**Document Status:** ✅ Backend Implementation Complete - Frontend Integration Pending





