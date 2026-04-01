# Data Subject Access Request (DSAR) Specification

**Last Updated:** 2025-01-XX  
**Purpose:** Technical specification for implementing GDPR Data Subject Access Rights

---

## Overview

This document specifies the technical implementation of GDPR Article 15 (Right of Access) and Article 17 (Right to Erasure) features.

**Legal Basis:** GDPR Articles 15, 16, 17, 18, 20, 21

---

## 1. Data Export (Article 15 - Right of Access)

### 1.1 Feature: "Export My Data"

**Purpose:** Allow users to download all their personal data in a machine-readable format.

**Endpoint:** `POST /api/user/export`

**Authentication:** Required (JWT token)
**CSRF Protection:** Required (X-CSRF-Token header)
**Rate Limit:** 
- Initial export: 2 per hour per user (userId-based)
- Paginated requests: 20 per hour per user (userId-based)
- **Security:** In production, rate limit bypass mechanisms are disabled. See `docs/security/rate-limiting.md`

**Response Format:** JSON file (v2 with pagination support)

**Implementation Status:** ✅ IMPLEMENTED (v2 with pagination and size limits)
**Code Reference:** `backend/src/routes/user.ts:181-283`, `backend/src/lib/utils/export-helpers.ts`

**Version:** v2 (supports pagination and size limits)

**Request Body (Optional):**
```json
{
  "cursor": {
    "messages": "base64-encoded-cursor-string",
    "auditEvents": "base64-encoded-cursor-string",
    "leads": "base64-encoded-cursor-string",
    "transactions": "base64-encoded-cursor-string",
    "dealMessages": "base64-encoded-cursor-string"
  },
  "limits": {
    "messages": 1000,
    "auditEvents": 500,
    "leads": 500,
    "transactions": 500,
    "dealMessages": 1000
  }
}
```

**Response Format (v2):**
```json
{
  "exportedAt": "2025-01-XXT...",
  "userId": "user-id",
  "exportVersion": "v2",
  "part": 1,
  "isPartial": false,
  "nextCursor": {
    "messages": "base64-encoded-cursor-string",
    "auditEvents": null,
    "leads": null,
    "transactions": null,
    "dealMessages": null
  },
  "data": { ... }
}
```

**Size Limits:**
- Maximum response size: 2MB (configurable via `MAX_EXPORT_BYTES` env var)
- Maximum execution time: 2 seconds (configurable via `MAX_EXPORT_TIME_MS` env var)
- If export exceeds size limit, returns `413 Payload Too Large` with suggested limits

**Pagination:**
- For large exports, response includes `nextCursor` and `isPartial: true`
- Client should make subsequent requests with `cursor` from previous response
- Continue until `nextCursor` is `null` or `isPartial` is `false`

**Data to Include:**

#### 1.1.1 User Account Data
- User profile (name, email, phone, role, company info)
- Account creation date
- Last login date
- Email verification status
- **Source:** `users` table
- **Code Reference:** `backend/prisma/schema.prisma:42-97`

#### 1.1.2 Properties
- All properties owned by user
- Property details (address, price, images, documents)
- Property status and dates
- **Source:** `properties` table (filtered by `userId`)
- **Code Reference:** `backend/prisma/schema.prisma:99-225`

#### 1.1.3 Transactions
- All transactions where user is buyer, seller, or agent
- Transaction status and stages
- Transaction progress updates
- **Source:** `transactions` table, `transaction_progress` table
- **Code Reference:** `backend/prisma/schema.prisma:512-541, 495-510`

#### 1.1.4 Leads & Interests
- Property leads (buyer interests)
- Lead status and notes
- **Source:** `property_leads` table
- **Code Reference:** `backend/prisma/schema.prisma:386-408`

#### 1.1.5 Messages & Inquiries
- All messages sent/received
- Property inquiries
- **Source:** `messages` table, `inquiries` table
- **Code Reference:** `backend/prisma/schema.prisma:258-266, 242-256`

#### 1.1.6 Viewing Requests
- All viewing requests (as buyer or agent)
- Viewing dates and status
- **Source:** `viewing_requests` table
- **Code Reference:** `backend/prisma/schema.prisma:460-479`

#### 1.1.7 Support Tickets
- All support tickets created
- Support messages
- **Source:** `support_tickets` table, `support_messages` table
- **Code Reference:** `backend/prisma/schema.prisma:269-340`

#### 1.1.8 Favorites
- All favorited properties
- Favorite dates
- **Source:** `favorites` table
- **Code Reference:** `backend/prisma/schema.prisma:227-240`

#### 1.1.9 Referrals
- Referral program participation
- Referral points and history
- **Source:** `referrals` table, `referral_points` table
- **Code Reference:** `backend/prisma/schema.prisma:587-626`

#### 1.1.10 Subscriptions
- Subscription plan and status
- Billing cycle
- Stripe customer ID (if applicable)
- **Source:** `subscriptions` table
- **Code Reference:** `backend/prisma/schema.prisma:647-666`

#### 1.1.11 Notifications
- All notifications received
- Notification read status
- **Source:** `notifications` table
- **Code Reference:** `backend/prisma/schema.prisma:440-458`

#### 1.1.12 Audit Logs (User-Related)
- Login attempts
- Account changes
- Actions performed by user
- **Source:** Audit logs (console logs or log storage)
- **Code Reference:** `backend/src/lib/utils/audit-logger.ts`
- **Note:** May need to parse logs or store in database for easier retrieval

#### 1.1.13 Property Views
- Properties viewed by user
- View timestamps
- **Source:** `property_views` table
- **Code Reference:** `backend/prisma/schema.prisma:543-553`

#### 1.1.14 Deal Room Data (NEW - Phase 4)
- **Deal Rooms:** All deal rooms where user is participant
  - Includes: dealRoomId, propertyId, status, createdAt, participantRole
  - Participants summary: userId, role, displayName (only for professionals - public info)
  - **NO third-party PII:** Other users' emails/phones excluded
- **Deal Threads:** Threads user is member of
  - Includes: threadId, dealRoomId, type, title, createdAt
- **Deal Messages:** Messages from threads user is member of (paginated)
  - Includes: messageId, threadId, senderUserId, body, createdAt
  - Pagination: Uses cursor-based pagination (MAX_DEAL_MESSAGES_EXPORT = 1000)
- **Deal Documents:** Metadata only (no s3Key, no signed URLs)
  - Includes: docId, dealRoomId, category, status, fileName, mimeType, sizeBytes, visibility, requestedById, uploadedById, reviewById, reviewNote, createdAt, updatedAt
- **Deal Appointments:** Appointments where user is buyer or professional
  - Includes: appointmentId, dealRoomId, professionalId, buyerId, startAt, endAt, type, status, location, meetingLink, note, createdAt, updatedAt
- **Professional Requests:** Requests where user is professional OR requester
  - Includes: requestId, dealRoomId, professionalId, requestedById, type, status, respondedAt, createdAt, updatedAt
- **Source:** `deal_rooms`, `deal_participants`, `deal_threads`, `deal_messages`, `deal_documents`, `deal_appointments`, `professional_requests` tables
- **Code Reference:** `backend/src/lib/utils/export-helpers.ts` (Phase 4 updates)
- **Privacy:** No s3Key, no signed URLs, minimal third-party PII (only professional displayName if public)

### 1.2 Implementation Plan

**Phase 1: Basic Export**
1. Create endpoint: `GET /api/user/export-data`
2. Query all user-related data from database
3. Format as JSON
4. Return JSON response or trigger email with download link

**Phase 2: Enhanced Export**
1. Include file attachments (property images, documents)
2. Package as ZIP file
3. Generate secure download link (expires in 7 days)
4. Email user with download link

**Phase 3: Scheduled Export**
1. Allow users to request export via UI
2. Process asynchronously (background job)
3. Email user when ready
4. Store export temporarily (7 days retention)

**Code Structure:**
```
backend/src/routes/user.ts
  - GET /api/user/export-data
  - Implementation: Query all user data, format JSON, return or email

backend/src/lib/utils/data-export.ts (NEW)
  - exportUserData(userId: string): Promise<ExportData>
  - formatExportData(data: ExportData): JSON
  - generateZipFile(data: ExportData, files: File[]): Promise<Buffer>
```

**Security Considerations:**
- Verify user identity (authentication required)
- Rate limit export requests (prevent abuse)
- Sanitize sensitive data (passwords, tokens)
- Secure download links (time-limited, token-based)
- Log export requests for audit

---

## 2. Account Deletion (Article 17 - Right to Erasure)

### 2.1 Feature: "Delete My Account"

**Purpose:** Allow users to request complete deletion of their account and personal data.

**Endpoint:** `POST /api/user/delete`

**Authentication:** Required (JWT token)
**CSRF Protection:** Required (X-CSRF-Token header)
**Rate Limit:** Strict (3 requests per hour per IP)

**Implementation Status:** ✅ IMPLEMENTED (Phase 1)
**Code Reference:** `backend/src/routes/user.ts:209-323`, `backend/src/middleware/auth.ts:60-70`

**Confirmation:** Password confirmation required

**Deletion Strategy:** 
- **Phase 1 (Current):** Immediate anonymization + access revocation ✅ IMPLEMENTED
- **Phase 2 (Future):** Hard delete S3 objects + retention cleanup ⏳ PLANNED

**See:** `docs/gdpr/deletion_policy.md` for detailed implementation specification

### 2.2 Data Deletion/Anonymization Plan

#### 2.2.1 User Account
- **Action:** Anonymize or delete
- **Fields to Anonymize:**
  - `name` → `"Deleted User"`
  - `email` → `"deleted-{userId}@deleted.local"`
  - `phone` → `null`
  - `password` → Hash random value (prevent re-login)
  - `companyName` → `null`
  - `companyTaxId` → `null`
  - `companyEmail` → `null`
  - `contactPersonName` → `null`
  - `contactPersonEmail` → `null`
  - `contactPersonPhone` → `null`
  - `businessAddress` → `null`
  - `licenseNumber` → `null`
- **Fields to Keep:** `id`, `createdAt`, `updatedAt` (for referential integrity)
- **Source:** `users` table

#### 2.2.2 Properties
- **Action:** Anonymize owner reference
- **Fields:** Keep property data but remove link to user
- **Options:**
  - Transfer to admin/system account
  - Anonymize `userId` → system user ID
  - Delete property entirely (if user requests)
- **Source:** `properties` table

#### 2.2.3 Transactions
- **Action:** Anonymize user references
- **Fields:** Replace `buyerId`, `sellerId`, `agentId` with anonymized IDs
- **Note:** May need to retain for legal/tax compliance (7 years)
- **Source:** `transactions` table

#### 2.2.4 Messages & Inquiries
- **Action:** Anonymize or delete
- **Fields:** Anonymize `userId` or delete messages
- **Source:** `messages` table, `inquiries` table

#### 2.2.14 Deal Room Data (NEW - Phase 4)
- **Deal Messages:** **PRESERVED** (preferred approach)
  - Messages authored by deleted user remain in database
  - Sender identity anonymized via User record (shows as "Deleted User")
  - Maintains transaction/legal continuity
  - **Source:** `deal_messages` table
- **Deal Documents:** **PRESERVED**
  - Documents uploaded by deleted user remain
  - Uploader identity anonymized (uploadedById still references userId, but User.name is "Deleted User")
  - S3 files queued for deletion via FileDeletionJob
  - **Source:** `deal_documents` table, S3
- **Deal Appointments:** **PRESERVED**
  - Appointments remain in database
  - Booker identity anonymized (bookedById still references userId, but User.name is "Deleted User")
  - **Source:** `deal_appointments` table
- **Deal Participants:** **PRESERVED**
  - Participant records remain (for legal/transaction integrity)
  - User identity anonymized via User record
  - **Source:** `deal_participants` table
- **Professional Requests:** **PRESERVED**
  - Request records remain (status history needed)
  - Requester identity anonymized via User record
  - **Source:** `professional_requests` table

#### 2.2.5 Support Tickets
- **Action:** Anonymize user reference
- **Fields:** Replace `userId`, `createdBy` with anonymized IDs
- **Note:** May need to retain for support history
- **Source:** `support_tickets` table, `support_messages` table

#### 2.2.6 Viewing Requests
- **Action:** Anonymize or delete
- **Fields:** Anonymize `buyerId`, `agentId`
- **Source:** `viewing_requests` table

#### 2.2.7 Favorites
- **Action:** Delete (no personal data to anonymize)
- **Source:** `favorites` table

#### 2.2.8 Referrals
- **Action:** Anonymize user references
- **Fields:** Replace `referrerId`, `referredId` with anonymized IDs
- **Source:** `referrals` table, `referral_points` table

#### 2.2.9 Subscriptions
- **Action:** Cancel and anonymize
- **Fields:** Cancel active subscription, anonymize `userId`
- **Stripe:** Cancel Stripe subscription via API
- **Source:** `subscriptions` table

#### 2.2.10 Property Documents
- **Action:** Delete files and records
- **Files:** Delete from AWS S3
- **Database:** Delete `property_documents` records
- **Source:** `property_documents` table, AWS S3

#### 2.2.11 Property Images
- **Action:** Delete or anonymize
- **Files:** Delete from AWS S3 or local storage
- **Database:** Remove image URLs from `properties.images`
- **Source:** `properties` table, AWS S3

#### 2.2.12 Audit Logs
- **Action:** Anonymize user references
- **Fields:** Replace `userId`, `userEmail` with anonymized values
- **Note:** May need to retain for security/compliance
- **Source:** Audit logs (console or log storage)

#### 2.2.13 Sessions & Authentication
- **Action:** Delete all sessions
- **Source:** `sessions` table, `accounts` table

### 2.3 Implementation Plan

**Phase 1: Basic Deletion**
1. Create endpoint: `DELETE /api/user/account`
2. Require password confirmation
3. Anonymize user account
4. Delete user sessions
5. Cancel active subscriptions

**Phase 2: Comprehensive Deletion**
1. Anonymize all user references in related tables
2. Delete user-uploaded files (S3)
3. Handle referential integrity (transactions, properties)
4. Send confirmation email

**Phase 3: Legal Compliance**
1. Implement retention exceptions (legal/tax requirements)
2. Document what data is retained and why
3. Provide user with retention notice

**Code Structure:**
```
backend/src/routes/user.ts
  - DELETE /api/user/account
  - POST /api/user/delete-account (with confirmation)

backend/src/lib/utils/account-deletion.ts (NEW)
  - deleteUserAccount(userId: string, options: DeletionOptions): Promise<void>
  - anonymizeUser(userId: string): Promise<void>
  - deleteUserFiles(userId: string): Promise<void>
  - cancelUserSubscriptions(userId: string): Promise<void>
  - anonymizeUserReferences(userId: string): Promise<void>
```

**Security Considerations:**
- Require password confirmation or email verification
- Rate limit deletion requests
- Log deletion requests for audit
- Implement grace period (e.g., 30 days) before permanent deletion
- Allow account recovery during grace period

---

## 3. Consent History (Article 7 - Conditions for Consent)

### 3.1 Feature: "My Consent History"

**Purpose:** Track and display user consent history for transparency.

**Status:** ✅ **IMPLEMENTED**

**Data Tracked:**
- Consent type (TERMS, PRIVACY, MARKETING)
- Consent version (e.g., "2026-01-01")
- Consent timestamp (`acceptedAt`)
- IP address (stored but not exposed in API)
- User agent (stored but not exposed in API)

**Implementation:**
- **Database Model:** `UserConsent` (`backend/prisma/schema.prisma`)
- **Endpoints:**
  - `GET /api/user/consents` - Get consent history
  - `POST /api/user/consents/accept` - Accept consents
- **Code:** `backend/src/routes/consents.ts`, `backend/src/lib/utils/consent-helpers.ts`
- **Environment Variables:** `TERMS_VERSION`, `PRIVACY_VERSION`, `MARKETING_VERSION` (optional)

**Features:**
- Consent version tracking
- Login enforcement (428 if consent missing)
- Consent history retrieval
- Privacy-friendly (IP/userAgent not exposed in GET endpoint)

---

## 4. Data Rectification (Article 16 - Right to Rectification)

### 4.1 Feature: "Update My Data"

**Purpose:** Allow users to correct inaccurate personal data.

**Current Implementation:** Already exists via profile update endpoints.

**Endpoints:**
- `PUT /api/user/profile` - Update user profile
- `PUT /api/auth/update-role` - Update user role (with restrictions)

**Enhancement Needed:**
- Add data validation and error messages
- Log data changes for audit
- Notify user of changes via email

---

## 5. Data Portability (Article 20 - Right to Data Portability)

### 5.1 Feature: "Download My Data"

**Purpose:** Provide data in structured, commonly used, machine-readable format.

**Implementation:** Same as "Export My Data" (Section 1)

**Format:** JSON (structured, machine-readable)

**Enhancement:** Consider adding CSV export for specific data types (properties, transactions)

---

## 6. Objection to Processing (Article 21 - Right to Object)

### 6.1 Feature: "Object to Processing"

**Purpose:** Allow users to object to processing based on legitimate interests.

**Implementation Plan:**
1. Create endpoint: `POST /api/user/object-processing`
2. Store objections in database
3. Implement processing restrictions based on objections
4. Review objections and respond within 1 month

**Code Structure:**
```
backend/prisma/schema.prisma (NEW)
  model ProcessingObjection {
    id          String   @id @default(cuid())
    userId      String
    processingType String // marketing, analytics, etc.
    reason      String?
    status      String   // pending, approved, rejected
    createdAt   DateTime @default(now())
    reviewedAt  DateTime?
    user        User     @relation(fields: [userId], references: [id])
  }
```

---

## 7. Implementation Roadmap

### Phase 1: Essential Rights (MVP)
- [ ] Data Export (JSON format)
- [ ] Account Deletion (anonymization)
- [ ] Profile Update (already exists, enhance)

### Phase 2: Enhanced Rights
- [ ] Data Export (ZIP with files)
- [ ] Consent History tracking
- [ ] Data Portability (CSV export)

### Phase 3: Advanced Rights
- [ ] Processing Objections
- [ ] Automated data export scheduling
- [ ] Data rectification workflow
- [ ] Retention policy enforcement

---

## 8. API Endpoints Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/user/export` | POST | Export all user data (GDPR DSAR) - v2 with pagination | ✅ IMPLEMENTED (v2) |
| `/api/user/delete` | POST | Delete user account (Phase 1: anonymization) | ✅ IMPLEMENTED |
| `/api/user/deletion-status` | GET | Get account deletion status | ✅ IMPLEMENTED |
| `/api/user/consents` | GET | Get consent history | ✅ IMPLEMENTED |
| `/api/user/profile` | PUT | Update profile (rectification) | ✅ EXISTS |
| `/api/user/object-processing` | POST | Object to processing | [TO BE IMPLEMENTED] |

---

## 9. Security & Privacy Considerations

### 9.1 Authentication & Authorization
- All DSAR endpoints require authentication
- Users can only access their own data
- Admin endpoints for DSAR management (if needed)

### 9.2 Rate Limiting
- Export requests: 2 initial exports per hour per user, 20 paginated requests per hour per user
- Limit deletion requests (e.g., 1 per week)
- Prevent abuse and DoS
- **Security:** In production (`NODE_ENV=production`), rate limit bypass mechanisms are disabled. No hidden bypass headers exist in production. See `docs/security/rate-limiting.md` for details.

### 9.3 Data Sanitization
- Remove sensitive data from exports (passwords, tokens)
- Sanitize email addresses in exports (if required)
- Redact third-party data (if applicable)

### 9.4 Audit Logging
- Log all DSAR requests
- Log account deletions
- Track consent changes

### 9.5 Legal Compliance
- Respond to DSARs within 1 month (GDPR requirement)
- Extend to 2 months if complex (with notification)
- Provide clear information about data processing

---

## 10. Testing Requirements

### 10.1 Unit Tests
- Test data export queries
- Test anonymization functions
- Test file deletion functions

### 10.2 Integration Tests
- Test complete export flow
- Test account deletion flow
- Test referential integrity after deletion

### 10.3 Manual Testing
- Verify exported data completeness
- Verify anonymization correctness
- Verify file deletion from S3
- Verify subscription cancellation

---

## Next Steps

1. **Implement Data Export:** Create `/api/user/export-data` endpoint
2. **Implement Account Deletion:** Create `/api/user/delete-account` endpoint
3. **Add Consent Tracking:** Create consent records table and tracking
4. **Enhance Profile Update:** Add audit logging and notifications
5. **Create Admin Tools:** Admin interface for DSAR management
6. **Documentation:** User-facing documentation for DSAR features
7. **Legal Review:** Review deletion/anonymization strategy with legal team

---

**Document Status:** ✅ Specification Complete - Ready for Implementation

