# Admin Endpoints

This document describes admin-only endpoints for monitoring and management.

## Security Model

### Authentication
- **Method:** JWT token with role claim
- **Required Role:** `ADMIN` or `SUPER_ADMIN`
- **Token Source:** Authorization header (`Bearer <token>`) or cookie (`access_token`)

### Feature Flags
- Admin endpoints are **disabled by default** in production
- Must explicitly enable via environment variable: `ENABLE_ADMIN_HEALTH=true`
- When disabled, endpoints return `404 NOT_FOUND` (not `403`) to hide existence

### Rate Limiting
- **Limit:** 5 requests per minute per IP+userId
- **Key:** `${req.ip}:${req.userId}` (combines IP and user ID for precision)
- **Block Duration:** 1 minute if exceeded

### Audit Logging
All access attempts are logged:
- **Success:** `admin.action` event with `success` status
- **Denied:** `admin.action` event with `failure` status (reason: disabled|not_admin|unauthenticated)
- **Logged Fields:** userId, role, IP, requestId, endpoint
- **Never Logged:** Authorization headers, tokens, stack traces

## Endpoints

### GET /api/admin/gdpr/health

**Purpose:** Monitor GDPR cleanup job health and FileDeletionJob queue status.

**Access Requirements:**
1. `ENABLE_ADMIN_HEALTH=true` must be set
2. Valid JWT token with `ADMIN` or `SUPER_ADMIN` role
3. Rate limit not exceeded (5/minute)

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

**Response Fields:**
- `fileDeletionJobs.queued`: Count of jobs waiting to be processed
- `fileDeletionJobs.processing`: Count of jobs currently being processed
- `fileDeletionJobs.failed`: Count of jobs that failed (after max retries)
- `fileDeletionJobs.deleted`: Count of successfully deleted jobs
- `oldestQueuedJobAgeHours`: Age in hours of oldest queued job (null if none)
- `auditLogOldestAgeDays`: Age in days of oldest audit log (null - not stored in DB)

**What is NEVER returned:**
- User IDs
- S3 keys
- Email addresses
- Stack traces
- SQL queries
- Internal error details
- Any PII or sensitive data

**Error Responses:**
- `404 NOT_FOUND`: Feature disabled (`ENABLE_ADMIN_HEALTH` not set)
- `401 UNAUTHORIZED`: Invalid or missing JWT token
- `403 FORBIDDEN`: User does not have admin role
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded
- `500 INTERNAL_SERVER_ERROR`: Server error (generic message, no sensitive details)

**Example Usage:**
```bash
# Enable feature flag
export ENABLE_ADMIN_HEALTH=true

# Get health metrics
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
     http://localhost:3001/api/admin/gdpr/health
```

**Verification Commands:**

1. **Test 1: Without ENABLE_ADMIN_HEALTH (should return 404)**
```bash
# Feature flag NOT set (default)
curl -i http://localhost:3001/api/admin/gdpr/health
# Expected: 404 NOT_FOUND
```

2. **Test 2: With ENABLE_ADMIN_HEALTH but non-admin token (should return 403)**
```bash
# First, login as non-admin user to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')

# Then try admin endpoint
curl -i -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/admin/gdpr/health
# Expected: 403 FORBIDDEN
```

3. **Test 3: With ENABLE_ADMIN_HEALTH and admin token (should return 200)**
```bash
# First, login as admin user to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"adminpassword"}' | jq -r '.token')

# Then access admin endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/admin/gdpr/health
# Expected: 200 OK with JSON response
```

4. **Test 4: Rate limiting (10 rapid calls should trigger 429)**
```bash
# Login as admin first
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"adminpassword"}' | jq -r '.token')

# Make 10 rapid requests
for i in {1..10}; do
  echo "Request $i:"
  curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
       -H "Authorization: Bearer $TOKEN" \
       http://localhost:3001/api/admin/gdpr/health
  echo ""
done
# Expected: At least some requests return 429 TOO_MANY_REQUESTS
```

## Environment Variables

```bash
# Enable admin health endpoints (default: false)
ENABLE_ADMIN_HEALTH=true
```

## Security Considerations

1. **Feature Flag:** Always disabled by default - must explicitly enable
2. **404 on Disabled:** Returns 404 (not 403) to hide endpoint existence
3. **Rate Limiting:** Prevents abuse and brute force attempts
4. **Audit Logging:** All access attempts logged for security monitoring
5. **Response Minimization:** Only aggregate counts, no sensitive data
6. **Error Handling:** Generic error messages, no stack traces or internal details

## Related Documentation

- [GDPR Retention Policy](./gdpr/retention.md) - Data retention rules and cleanup jobs
- [GDPR DSAR Spec](./gdpr/dsar_spec.md) - Data Subject Access Request implementation
- [Deletion Policy](./gdpr/deletion_policy.md) - Account deletion and S3 cleanup

