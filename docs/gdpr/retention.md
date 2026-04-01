# GDPR Data Retention Policy

This document describes the data retention rules and cleanup jobs that enforce storage limitation principles under GDPR.

## Overview

We enforce storage limitation by automatically deleting old operational data that is no longer needed, while keeping enough for security and auditability purposes.

## Retention Rules

### 1. FileDeletionJob Records

**Purpose:** Track S3 file deletion jobs for GDPR account deletion (Phase 2).

#### Deleted Jobs (status='deleted')
- **Retention:** 30 days after `deletedAt` timestamp
- **Rationale:** Once a file is successfully deleted, we only need to keep the record for a short period to verify completion. After 30 days, the record is no longer needed.
- **Cleanup:** Deletes records where `status='deleted'` AND `deletedAt < (now - 30 days)`
- **Default:** `FILE_DELETION_JOB_DELETED_RETENTION_DAYS=30`

#### Failed Jobs (status='failed')
- **Retention:** 90 days after `updatedAt` timestamp
- **Rationale:** Failed deletion jobs may need investigation or retry. We keep them longer than successful deletions to allow for troubleshooting and manual intervention.
- **Cleanup:** Deletes records where `status='failed'` AND `updatedAt < (now - 90 days)`
- **Default:** `FILE_DELETION_JOB_FAILED_RETENTION_DAYS=90`

#### Queued/Processing Jobs
- **Retention:** Indefinite (until processed)
- **Rationale:** Active jobs must remain until completion. They are not cleaned up by the retention job.

### 2. Audit Logs

**Purpose:** Security monitoring, compliance auditing, incident investigation.

**Current Implementation:**
- **Storage:** Console logs (structured JSON)
- **Retention:** Managed by log aggregation service (e.g., Render logs, external logging service)
- **Database Cleanup:** Not applicable (logs are not stored in database)

**Future Consideration:**
If audit logs are migrated to database storage:
- **Retention:** 180 days
- **Rationale:** Security events need to be retained for incident investigation and compliance. 180 days provides a balance between retention needs and storage costs.
- **Cleanup:** Would delete records older than `AUDIT_LOG_RETENTION_DAYS` (default: 180 days)
- **Exclusions:** Legally required logs (if such classification exists) would be excluded from cleanup
- **Default:** `AUDIT_LOG_RETENTION_DAYS=180`

## Cleanup Job

### Implementation

**File:** `backend/src/jobs/cleanupJob.ts`

**Features:**
- Batched processing to avoid long database locks
- Configurable batch size (default: 500 records per batch)
- Logs counts only (no PII, no keys)
- Error handling and reporting

### Running Cleanup

**Local Development:**
```bash
cd backend
npm run job:cleanup
```

**Production (Render Cron):**
```bash
# Recommended schedule: Daily at 03:00 UTC
npm run job:cleanup
```

### Environment Variables

```bash
# FileDeletionJob retention (days)
FILE_DELETION_JOB_DELETED_RETENTION_DAYS=30
FILE_DELETION_JOB_FAILED_RETENTION_DAYS=90

# Audit log retention (days) - currently not used (console logs)
AUDIT_LOG_RETENTION_DAYS=180

# Batch size for cleanup operations
CLEANUP_BATCH_SIZE=500
```

## Monitoring

### Health Endpoint

**Endpoint:** `GET /api/admin/gdpr/health`

**Access:** 
- **Feature Flag:** Must set `ENABLE_ADMIN_HEALTH=true` (returns 404 if disabled)
- **Authentication:** JWT token with `ADMIN` or `SUPER_ADMIN` role required
- **Rate Limiting:** 5 requests per minute per IP+userId
- **Production:** Disabled by default (returns 404) - must explicitly enable

**Security:**
- Endpoint existence is hidden when disabled (404 instead of 403)
- Rate limited to prevent abuse
- All access attempts are audit logged
- Response contains only aggregate counts (no PII, no secrets)

**Response:**
```json
{
  "fileDeletionJobs": {
    "queued": 0,
    "processing": 5,
    "failed": 2,
    "deleted": 150
  },
  "oldestQueuedJobAgeHours": 120,
  "auditLogOldestAgeDays": null,
  "note": "Audit logs are stored as console logs, not in database"
}
```

**What is NEVER returned:**
- User IDs
- S3 keys
- Email addresses
- Stack traces
- SQL queries
- Internal error details

**Usage:**
```bash
# Enable feature flag first
export ENABLE_ADMIN_HEALTH=true

# Get GDPR health metrics (requires admin token)
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
     http://localhost:3001/api/admin/gdpr/health
```

**Monitoring Recommendations:**
- Monitor `oldestQueuedJobAgeHours` - if > 24 hours, investigate why jobs are stuck
- Monitor `failed` count - if growing, investigate S3 deletion failures
- Set up alerts for high `failed` counts or old `queued` jobs
- Review audit logs for access patterns and denied attempts

## Recommended Render Cron Schedules

### S3 Deletion Worker
**Schedule:** Every 5-10 minutes
```bash
npm run s3-deletion-worker
```

**Purpose:** Process queued S3 file deletions for GDPR account deletion.

### Cleanup Job
**Schedule:** Once daily at 03:00 UTC
```bash
npm run job:cleanup
```

**Purpose:** Delete old FileDeletionJob records and other operational data that exceeds retention periods.

## Testing

**Test Script:** `backend/scripts/test-cleanup-job.js`

**Usage:**
```bash
cd backend
npm run build  # Build TypeScript first
npm run test:cleanup
```

**What it tests:**
- Creates old deleted FileDeletionJob (should be cleaned up)
- Creates old failed FileDeletionJob (should be cleaned up)
- Creates recent deleted FileDeletionJob (should NOT be cleaned up)
- Creates recent failed FileDeletionJob (should NOT be cleaned up)
- Runs cleanup job
- Verifies correct records were deleted

## Legal Considerations

- **Storage Limitation:** GDPR Article 5(1)(e) requires that personal data be kept in a form which permits identification for no longer than necessary.
- **Security:** Retaining some operational data (e.g., failed deletion jobs) for troubleshooting is a legitimate interest.
- **Audit Requirements:** Some data may need to be retained longer for legal compliance (e.g., financial records). Such data would be excluded from cleanup.

## Related Documentation

- [GDPR DSAR Spec](./dsar_spec.md) - Data Subject Access Request implementation
- [Deletion Policy](./deletion_policy.md) - Account deletion and S3 cleanup
- [Data Inventory](./data_inventory.md) - Complete data inventory and retention policies

