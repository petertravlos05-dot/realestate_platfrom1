# Sentry Error Tracking Architecture

## Overview

Sentry is configured for three runtime environments:
- **Client-side (Browser)**: `sentry.client.config.ts`
- **Server-side (Node.js)**: `sentry.server.config.ts`
- **Edge Runtime**: `sentry.edge.config.ts`

All three use a shared event sanitizer (`src/lib/sentry/sanitizeEvent.ts`) to ensure consistent scrubbing of PII, tokens, and sensitive data.

## Architecture

### Client-side Initialization

**File**: `sentry.client.config.ts`

- Automatically loaded by Next.js Sentry SDK
- Initializes when the app starts (not in `ClientLayout.tsx`)
- Uses shared `sanitizeSentryEvent()` for scrubbing
- Ignores common browser noise (ResizeObserver, network errors)

**Note**: `ClientLayout.tsx` should NOT call `Sentry.init()`. It only sets tags/context.

### Server-side Initialization

**File**: `sentry.server.config.ts`

- Imported by `src/instrumentation.ts` on server startup
- Captures errors from API routes and server components
- Uses shared `sanitizeSentryEvent()` + removes request body for sensitive routes

### Edge Runtime Initialization

**File**: `sentry.edge.config.ts`

- Imported by `src/instrumentation.ts` for edge runtime
- Captures errors from middleware and edge API routes
- Uses shared `sanitizeSentryEvent()` + additional edge-specific scrubbing:
  - Removes ALL cookies unconditionally
  - Removes query string (keeps only pathname)
  - Removes request body entirely

## Data Scrubbing

### Shared Sanitizer (`sanitizeEvent.ts`)

Removes/redacts:

1. **Request Headers**: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-csrf-token`
2. **Cookies**: All cookies removed
3. **Query Parameters**: `token`, `jwt`, `auth`, `key`, `secret`, `password`, `api_key`
4. **Request Body**: Sensitive keys redacted recursively
5. **User Context**: Only hashed `id` kept, `email`, `username`, `ip_address` removed
6. **Breadcrumbs**: Sensitive keys redacted
7. **Extra Context**: Sensitive keys redacted recursively
8. **Long Strings**: Truncated to 512 chars (keeps first 128)

### Sensitive Keys (case-insensitive)

- `password`, `pass`, `token`, `jwt`, `refresh`, `secret`, `key`
- `authorization`, `cookie`, `email`, `phone`, `ssn`, `address`
- `api_key`, `apikey`, `access_token`, `refresh_token`, `session`
- `csrf`, `auth`, `bearer`, `x-api-key`, `x-csrf-token`

### Server-specific Scrubbing

- **Sensitive Routes**: Request body removed entirely for:
  - `/api/auth/*`
  - `/api/user/delete`
  - `/api/user/export`

### Edge-specific Scrubbing

- All cookies removed unconditionally
- Query string removed (only pathname kept)
- Request body removed entirely

## Low-noise Alerting

### DSAR Failures

**Helper**: `src/lib/sentry/report.ts::reportDsarFailure()`

- Uses `captureMessage` with stable fingerprint: `['gdpr', eventName]`
- Tags: `gdpr=dsar`, `gdpr_event=<export_failed|delete_failed|consent_failed>`
- Message: `dsar.<eventName>`
- Context: Safe data only (no PII, no tokens)

**Usage**:
```typescript
import { reportDsarFailure } from '@/lib/sentry/report';

try {
  // DSAR operation
} catch (error) {
  reportDsarFailure('export_failed', error, { /* safe context */ });
}
```

### S3 Deletion Failures

**Helper**: `src/lib/sentry/report.ts::reportS3DeletionFailure()`

- Uses `captureMessage` with stable fingerprint: `['job', 's3_deletion', 'failed']`
- Tags: `job=s3_deletion`, `s3_delete=failed`
- Message: `s3_deletion.failed`
- Context: Only `keyPrefix` (never full key), `bucket`, `attempts`, `maxAttempts`

**Usage**:
```typescript
import { reportS3DeletionFailure } from '@/lib/sentry/report';

try {
  // S3 deletion
} catch (error) {
  reportS3DeletionFailure(error, {
    bucket: 'my-bucket',
    keyPrefix: 'properties/image', // Only prefix, never full key
    attempts: 3,
    maxAttempts: 5,
  });
}
```

## Alert Filters

### Recommended Sentry Alert Rules

1. **DSAR Failures**:
   - Filter: `tags.gdpr:dsar AND tags.gdpr_event:*`
   - Group by: `fingerprint` (stable)
   - Threshold: Alert on new issues

2. **S3 Deletion Failures**:
   - Filter: `tags.job:s3_deletion AND tags.s3_delete:failed`
   - Group by: `fingerprint` (stable)
   - Threshold: Alert on new issues

3. **General Errors**:
   - Filter: `level:error AND NOT tags.gdpr:* AND NOT tags.job:s3_deletion`
   - Threshold: Alert on 10+ events/hour

## Verification Checklist

### Client-side
- [ ] Trigger a client error in dev
- [ ] Verify error appears once (no duplicate init)
- [ ] Verify no `authorization` header in event
- [ ] Verify no cookies in event
- [ ] Verify user context has no email/username

### Server-side
- [ ] Trigger an API route error
- [ ] Verify no sensitive headers in event
- [ ] Verify request body removed for `/api/auth/*` routes
- [ ] Verify user context has no email/username

### Edge Runtime
- [ ] Trigger a middleware error
- [ ] Verify all cookies removed
- [ ] Verify query string removed (only pathname)
- [ ] Verify request body removed

### DSAR/S3 Failures
- [ ] Trigger DSAR export failure
- [ ] Verify tags: `gdpr=dsar`, `gdpr_event=export_failed`
- [ ] Verify fingerprint: `['gdpr', 'export_failed']`
- [ ] Verify no PII in context

- [ ] Trigger S3 deletion failure
- [ ] Verify tags: `job=s3_deletion`, `s3_delete=failed`
- [ ] Verify fingerprint: `['job', 's3_deletion', 'failed']`
- [ ] Verify only `keyPrefix` (not full key) in context

## Environment Variables

```env
NEXT_PUBLIC_SENTRY_ENABLE=true
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production|staging|development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
SENTRY_RELEASE=<git_sha>
```

## Testing

### Quick Test Commands

1. **Test client error**:
   ```bash
   # Visit http://localhost:3004/test-sentry
   # Click "Test Error Capture"
   ```

2. **Test server error**:
   ```bash
   # Trigger any API route error
   # Check Sentry dashboard
   ```

3. **Test DSAR failure** (backend):
   ```bash
   # Trigger /api/user/export with invalid data
   # Check Sentry dashboard for tags and fingerprint
   ```

4. **Test S3 deletion failure** (backend):
   ```bash
   # Trigger S3 deletion with invalid key
   # Check Sentry dashboard for tags and fingerprint
   ```

## Files Changed

- ✅ `src/lib/sentry/sanitizeEvent.ts` - Shared event sanitizer
- ✅ `sentry.client.config.ts` - Client-side config (NEW)
- ✅ `sentry.server.config.ts` - Server-side config (updated)
- ✅ `sentry.edge.config.ts` - Edge config (updated)
- ✅ `src/components/layout/ClientLayout.tsx` - Removed manual init
- ✅ `src/lib/sentry/report.ts` - Low-noise helpers (NEW)

## Migration Notes

**Before**: Client Sentry initialized manually in `ClientLayout.tsx`  
**After**: Client Sentry initialized via `sentry.client.config.ts` (standard Next.js pattern)

**Before**: Each config had inline scrubbing logic  
**After**: All configs use shared `sanitizeSentryEvent()`

**Before**: DSAR/S3 failures used `captureException` (high noise)  
**After**: DSAR/S3 failures use `captureMessage` with stable fingerprints (low noise)



