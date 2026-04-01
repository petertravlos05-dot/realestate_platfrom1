# GDPR Account Deletion Policy

**Last Updated:** 2026-01-05  
**Purpose:** Technical specification for GDPR Article 17 (Right to Erasure) implementation

---

## Overview

This document describes the two-phase approach to account deletion, balancing immediate user rights with operational requirements.

**Legal Basis:** GDPR Article 17 (Right to Erasure)

---

## Phase 1: Immediate Anonymization + Access Revocation (CURRENT)

### Implementation Status: ✅ IMPLEMENTED

### What Happens:

1. **User Requests Deletion**
   - User must provide password confirmation
   - Endpoint: `POST /api/user/delete`
   - Protected by: Auth + CSRF + Rate limit (strict)

2. **Immediate Actions (within same transaction):**
   - Set `isDeleted = true`
   - Set `deletedAt = now()`
   - Set `anonymizedAt = now()`
   - Anonymize PII fields:
     - `email` → `deleted+<userId>@example.invalid`
     - `name` → `"Deleted User"`
     - `phone` → `null`
     - `image` → `null`
     - All company fields → `null`
     - All address fields → `null`
   - Delete all sessions (`sessions` table)
   - Delete all OAuth accounts (`accounts` table)

3. **Access Revocation:**
   - Login blocked (403 ACCOUNT_DELETED)
   - All authenticated endpoints blocked (403 ACCOUNT_DELETED)
   - DSAR export blocked (403 ACCOUNT_DELETED)
   - Document access blocked (403 ACCOUNT_DELETED)

4. **Referential Integrity:**
   - Transactions, leads, messages, properties are **preserved**
   - Deal Room data (deals, threads, messages, documents, appointments) are **preserved**
   - User ID remains valid for foreign keys
   - Data anonymization prevents identification
   - **Deal Messages:** Messages authored by deleted user remain in database, but sender identity is anonymized (shows as "Deleted User" via anonymized User record)
   - **Deal Documents:** Documents uploaded by deleted user remain, but uploader identity is anonymized
   - **Deal Appointments:** Appointments remain, but booker identity is anonymized

### Code References:
- **Schema:** `backend/prisma/schema.prisma` (User model)
- **Migration:** `backend/prisma/migrations/20260105000000_add_user_deletion_fields/`
- **Delete Endpoint:** `backend/src/routes/user.ts:209-323`
- **Auth Middleware:** `backend/src/middleware/auth.ts:60-70`
- **Login Block:** `backend/src/routes/auth.ts:214-225`
- **Export Block:** `backend/src/routes/user.ts:161-168`

---

## Phase 2: Hard Delete S3 Files + Retention Cleanup

### Implementation Status: ✅ IMPLEMENTED (S3 Deletion) | ⏳ PLANNED (Retention Cleanup)

### What Happens:

1. **S3 Object Deletion:** ✅ IMPLEMENTED
   - **Automatic Queueing:** When account is deleted, all S3 keys owned by the user are automatically discovered and queued for deletion
   - **Sources:**
     - Property images (`Property.images` array)
     - Property documents (`PropertyDocument.fileUrl`)
     - User avatar (`User.image`)
     - Company logo (`User.companyLogo`)
     - Deal Room documents (`DealDocument.s3Key` where `uploadedById = userId`) ✅ ADDED Phase 4
   - **Deletion Queue:** Jobs are stored in `FileDeletionJob` table with status tracking
   - **Worker Process:** Background worker script processes the queue and deletes files from S3
   - **Retry Logic:** Failed deletions are retried up to 5 times before marking as failed
   - **Code Reference:** `backend/src/services/gdpr/s3-cleanup.ts`

2. **Retention Policy Cleanup:** ⏳ PLANNED
   - Background job to hard-delete anonymized accounts after retention period
   - Retention period: [TO BE DETERMINED - e.g., 1 year]
   - Only applies to accounts where `isDeleted = true` AND `deletedAt < retention_threshold`

3. **Data Minimization:**
   - Consider anonymizing transaction/lead data after business requirements expire
   - Maintain audit logs per legal requirements

### S3 Deletion Implementation Details:

**Database Model:** `FileDeletionJob`
- Tracks each S3 file that needs to be deleted
- Status: `QUEUED` → `PROCESSING` → `DELETED` or `FAILED`
- Retry tracking: `attempts` field, max 5 attempts
- Error logging: `lastError` field (truncated to 500 chars)

**Worker Script:** `backend/scripts/run-s3-deletion-worker.ts`
- Processes queued deletion jobs in batches
- Configurable batch size (default: 50)
- DRY_RUN mode for testing
- Safe and idempotent

**Security:**
- Only deletes keys proven to belong to deleted user via DB relationships
- Never accepts arbitrary s3Key from client input
- Validates file existence before deletion
- Handles missing files gracefully (marks as deleted if already gone)

---

## Security & Privacy

### Access Control:
- Deleted users **cannot** login (403 ACCOUNT_DELETED)
- Deleted users **cannot** access any authenticated endpoints
- Deleted users **cannot** export data (403 ACCOUNT_DELETED)
- Deleted users **cannot** access documents

### Data Protection:
- Email anonymization ensures uniqueness (`deleted+<userId>@example.invalid`)
- All PII fields nullified
- Sessions revoked immediately
- OAuth accounts removed

### Audit Logging:
- Event: `dsar.delete_requested` (before commit)
- Event: `dsar.delete_completed` (after successful commit)
- No plaintext email/phone in logs

---

## API Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/user/delete` | POST | Delete account (Phase 1) | ✅ IMPLEMENTED |
| `/api/user/deletion-status` | GET | Get deletion status | ✅ IMPLEMENTED |
| `/api/user/export` | POST | Export data (blocked if deleted) | ✅ IMPLEMENTED |

---

## Frontend Behavior

### Delete Flow:
1. User clicks "Delete Account"
2. Password confirmation modal appears
3. User enters password
4. `POST /api/user/delete` called
5. On success:
   - Local auth state cleared
   - Redirect to `/login?message=account_deleted`

### Error Handling:
- `401 INVALID_PASSWORD`: Show error, allow retry
- `409 ALREADY_DELETED`: Logout and redirect
- `403 ACCOUNT_DELETED`: Force logout, show message

### Global Error Handler:
- Any API call returning `403 ACCOUNT_DELETED` triggers:
  - Automatic logout
  - Redirect to login page
  - Message: "This account has been deleted"

---

## S3 Deletion Worker

### Running the Worker:

**DRY_RUN Mode (Testing):**
```bash
cd backend
DRY_RUN=true npm run s3-deletion-worker:dry-run
```

**Production Mode:**
```bash
cd backend
npm run s3-deletion-worker
```

**With Custom Settings:**
```bash
cd backend
BATCH_SIZE=100 MAX_ITERATIONS=50 SLEEP_MS=2000 npm run s3-deletion-worker
```

### Environment Variables:

- `DRY_RUN=true` - Simulate deletions without actually deleting from S3
- `BATCH_SIZE=50` - Number of jobs to process per batch (default: 50)
- `MAX_ITERATIONS=100` - Maximum number of batches (default: 100, 0 = unlimited)
- `SLEEP_MS=1000` - Sleep between batches in milliseconds (default: 1000)

### Required AWS Environment Variables:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_S3_BUCKET` - S3 bucket name

### Automated Test Script:

**Quick Test (Recommended):**
```bash
cd backend
npm run test:s3-deletion
```

This script automatically:
1. Creates a test user with S3 files (property images, documents, avatar, logo)
2. Deletes the user account
3. Verifies S3 keys were collected and queued
4. Runs worker in DRY_RUN mode
5. Verifies jobs were processed

**Options:**
- `npm run test:s3-deletion` - DRY_RUN mode (default, safe)
- `npm run test:s3-deletion:live` - Real deletion mode
- `npm run test:s3-deletion:cleanup` - Cleanup test data after test

### Manual Verification Steps:

1. **Delete a user account:**
   ```bash
   curl -X POST http://localhost:3001/api/user/delete \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: CSRF_TOKEN" \
     -H "Authorization: Bearer AUTH_TOKEN" \
     -b cookies.txt \
     -d '{"password":"correctpassword"}'
   ```

2. **Check queued jobs (via database):**
   ```sql
   SELECT COUNT(*) FROM file_deletion_jobs WHERE userId = 'USER_ID' AND status = 'QUEUED';
   ```

3. **Run worker in DRY_RUN mode:**
   ```bash
   DRY_RUN=true npm run s3-deletion-worker:dry-run
   ```

4. **Verify jobs marked as deleted:**
   ```sql
   SELECT COUNT(*) FROM file_deletion_jobs WHERE userId = 'USER_ID' AND status = 'DELETED';
   ```

5. **Run again (should be idempotent - no changes):**
   ```bash
   DRY_RUN=true npm run s3-deletion-worker:dry-run
   ```

6. **Run in production mode (real deletion):**
   ```bash
   npm run s3-deletion-worker
   ```

## Testing

### Manual Tests:

**Test 1: Delete with wrong password**
```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -b cookies.txt -c cookies.txt \
  -d '{"email":"user@example.com","password":"correct"}'

# 2. Delete with wrong password (should return 401)
curl -X POST http://localhost:3001/api/user/delete \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -H "Authorization: Bearer AUTH_TOKEN" \
  -b cookies.txt \
  -d '{"password":"wrong"}'
```

**Test 2: Delete with correct password**
```bash
# Delete with correct password (should return 200)
curl -X POST http://localhost:3001/api/user/delete \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -H "Authorization: Bearer AUTH_TOKEN" \
  -b cookies.txt \
  -d '{"password":"correct"}'
```

**Test 3: Login after deletion (should return 403)**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -b cookies.txt -c cookies.txt \
  -d '{"email":"deleted+USERID@example.invalid","password":"any"}'
```

**Test 4: Export after deletion (should return 403)**
```bash
curl -X POST http://localhost:3001/api/user/export \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -H "Authorization: Bearer AUTH_TOKEN" \
  -b cookies.txt
```

---

## Database Schema

### User Model Fields:
```prisma
model User {
  // ... existing fields ...
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  anonymizedAt DateTime?
  // ...
}
```

### Indexes:
- `users_isDeleted_idx` on `isDeleted` for efficient queries

---

## Risks & Notes

### Known Limitations:
1. **S3 Objects:** Still exist in Phase 1 (Phase 2 will delete)
2. **Transaction History:** Preserved for business/legal requirements
3. **Audit Logs:** Retained per legal requirements

### Considerations:
- Email uniqueness: `deleted+<userId>@example.invalid` ensures no conflicts
- Foreign key integrity: User ID remains valid, but user cannot access
- Rate limiting: Strict limit on delete endpoint prevents abuse

### Future Enhancements:
- Phase 2: S3 cleanup
- Phase 2: Retention policy automation
- Consider: Anonymization of transaction data after business period

---

**Document Status:** ✅ Phase 1 Complete - Phase 2 Planned

