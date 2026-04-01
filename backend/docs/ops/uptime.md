# Production Uptime & Queue Health Monitoring

## Overview

This system provides comprehensive monitoring for:
- **API Uptime**: External ping to public `/health` endpoint
- **Database Connectivity**: Automated DB health checks (including slow query detection)
- **Queue Health**: FileDeletionJob queue monitoring for stuck/failed jobs and no-progress detection

All alerts use Sentry with stable fingerprints and state-change + cooldown logic for low-noise alerting.

## Key Features

### Alert Noise Control
- **State-change alerts**: Alerts only sent when status changes (ok → alert or alert → ok)
- **Cooldown periods**: Repeated alerts only sent after cooldown expires
- **Recovery alerts**: Automatic recovery notifications when issues resolve

### Job Locking
- **Postgres advisory locks**: Prevents concurrent cron job executions
- **Idempotent execution**: Jobs can be safely scheduled without overlap concerns
- **Automatic cleanup**: Locks automatically released on completion or error

### Advanced Detection
- **DB slow alerts**: Detects slow queries before DB goes down
- **No-progress detection**: Detects when queue processing stalls (no deletions happening)

## Endpoints

### Public Health Endpoint

**GET `/health`**

- **Auth**: None (public)
- **Purpose**: Fast health check for load balancers and uptime monitors
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "backend",
    "env": "production",
    "time": "2025-01-06T12:00:00.000Z"
  }
  ```
- **Rules**:
  - Always returns 200 if process is alive
  - No database calls (fast)
  - No secrets exposed

### Admin Ops Health Endpoint

**GET `/api/admin/ops/health`**

- **Auth**: JWT token + Admin role required
- **Feature Flag**: `ENABLE_ADMIN_HEALTH=true` (returns 404 if disabled)
- **Rate Limit**: 5 requests/minute per IP+userId
- **Purpose**: Comprehensive ops health metrics
- **Response**:
  ```json
  {
    "status": "ok" | "degraded",
    "db": {
      "ok": true,
      "latencyMs": 15
    },
    "fileDeletionJobs": {
      "queued": 0,
      "processing": 0,
      "failed": 0,
      "deleted": 1234
    },
    "queueAges": {
      "oldestQueuedMinutes": null,
      "oldestProcessingMinutes": null
    },
    "time": "2025-01-06T12:00:00.000Z"
  }
  ```
- **Status Logic**:
  - `degraded` if DB check fails
  - `degraded` if queued jobs > 0 AND oldest queued > 60 minutes
  - `degraded` if processing jobs > 0 AND oldest processing > 30 minutes
  - `degraded` if failed jobs > 0

## Monitoring Jobs

### Queue Monitor Job

**Script**: `npm run job:queue-monitor`

**Purpose**: Detects stuck queue jobs and high failure counts

**Checks**:
- Stuck queued jobs (older than threshold)
- Stuck processing jobs (older than threshold)
- Failed job count

**Alerts**:
- Sentry message: `ops.queue_issue`
- Tags: `ops=queue`, `job=file_deletion`, `issue=<stuck_queued|stuck_processing|failed_jobs>`
- Fingerprint: `['ops', 'queue', '<issue>']`

**Environment Variables**:
- `OPS_MONITOR_ENABLE` - Enable monitoring (default: false)
- `QUEUE_STUCK_QUEUED_MIN` - Minutes before queued job is stuck (default: 60)
- `QUEUE_STUCK_PROCESSING_MIN` - Minutes before processing job is stuck (default: 30)
- `QUEUE_FAILED_ALERT_THRESHOLD` - Failed jobs to trigger alert (default: 1)
- `QUEUE_NO_PROGRESS_MIN` - Minutes without progress before alerting (default: 30)
- `QUEUE_ALERT_COOLDOWN_MIN` - Cooldown minutes between alerts (default: 60)

**Alert Keys**:
- `ops.queue.stuck_queued` - Stuck queued jobs
- `ops.queue.stuck_processing` - Stuck processing jobs
- `ops.queue.failed_jobs` - Failed job count exceeded
- `ops.queue.no_progress_processing` - No progress detected (deleted count not increasing)

### Database Monitor Job

**Script**: `npm run job:db-monitor`

**Purpose**: Monitors database connectivity

**Checks**:
- DB connectivity (`SELECT 1`)
- Query latency
- Timeout detection

**Alerts**:
- Sentry message: `ops.db_down`
- Tags: `ops=db`, `issue=db_down`
- Fingerprint: `['ops', 'db', 'down']`

**Environment Variables**:
- `OPS_MONITOR_ENABLE` - Enable monitoring (default: false)
- `DB_TIMEOUT_MS` - DB query timeout (default: 1500)
- `DB_SLOW_THRESHOLD_MS` - Latency threshold for slow alert (default: 800)
- `DB_ALERT_COOLDOWN_MIN` - Cooldown minutes between alerts (default: 30)

**Alert Keys**:
- `ops.db.down` - Database connectivity failure
- `ops.db.slow` - Database query latency exceeded threshold

### External Uptime Ping

**Script**: `npm run ping:health`

**Purpose**: External ping to public health endpoint

**Checks**:
- HTTP 200 response
- Response time
- Network connectivity

**Alerts**:
- Sentry message: `ops.api_down`
- Tags: `ops=uptime`, `issue=api_down`
- Fingerprint: `['ops', 'uptime', 'api_down']`

**Environment Variables**:
- `BACKEND_PUBLIC_URL` - Public URL (e.g., `https://api.domain.com`)
- `OPS_PING_TIMEOUT_MS` - Request timeout (default: 3000)
- `UPTIME_ALERT_COOLDOWN_MIN` - Cooldown minutes between alerts (default: 15)

**Alert Keys**:
- `ops.uptime.api_down` - API endpoint unreachable
- Recovery alerts sent automatically when API recovers

## Render Cron Jobs

Add these cron jobs in Render dashboard:

### Queue Monitor (every 5 minutes)
```
Command: npm run job:queue-monitor
Schedule: */5 * * * *
```

### Database Monitor (every 5 minutes)
```
Command: npm run job:db-monitor
Schedule: */5 * * * *
```

### Uptime Ping (every 1 minute)
```
Command: npm run ping:health
Schedule: * * * * *
```

**Note**: For uptime ping, you can also use external services like:
- UptimeRobot
- Pingdom
- StatusCake

## Environment Variables

Add to `.env` (and Render environment variables):

```env
# Monitoring
OPS_MONITOR_ENABLE=true
QUEUE_STUCK_QUEUED_MIN=60
QUEUE_STUCK_PROCESSING_MIN=30
QUEUE_FAILED_ALERT_THRESHOLD=1
DB_TIMEOUT_MS=1500

# Uptime Ping
BACKEND_PUBLIC_URL=https://api.domain.com
OPS_PING_TIMEOUT_MS=3000

# Admin Health Endpoint
ENABLE_ADMIN_HEALTH=true

# Sentry (required for alerts)
SENTRY_ENABLE=true
SENTRY_DSN_BACKEND=https://...
SENTRY_ENVIRONMENT=production
```

## Alert Interpretation

### `ops.queue_issue` (stuck_queued)
- **Meaning**: Queued jobs are not being processed
- **Action**: Check worker process, restart if needed
- **Fingerprint**: `['ops', 'queue', 'stuck_queued']`

### `ops.queue_issue` (stuck_processing)
- **Meaning**: Processing jobs are stuck (not completing)
- **Action**: Check worker logs, investigate S3 connectivity
- **Fingerprint**: `['ops', 'queue', 'stuck_processing']`

### `ops.queue_issue` (failed_jobs)
- **Meaning**: Jobs are failing repeatedly
- **Action**: Check S3 credentials, bucket permissions, network
- **Fingerprint**: `['ops', 'queue', 'failed_jobs']`

### `ops.db_down`
- **Meaning**: Database is unreachable or slow
- **Action**: Check database status, connection pool, network
- **Fingerprint**: `['ops', 'db', 'down']`

### `ops.api_down`
- **Meaning**: Public API endpoint is unreachable
- **Action**: Check Render service status, DNS, load balancer
- **Fingerprint**: `['ops', 'uptime', 'api_down']`

## Sentry Alert Rules

Recommended Sentry alert filters:

1. **Queue Issues**:
   - Filter: `tags.ops:queue AND tags.job:file_deletion`
   - Group by: `fingerprint`
   - Threshold: Alert on new issues

2. **Database Down**:
   - Filter: `tags.ops:db AND tags.issue:db_down`
   - Group by: `fingerprint`
   - Threshold: Alert immediately

3. **API Down**:
   - Filter: `tags.ops:uptime AND tags.issue:api_down`
   - Group by: `fingerprint`
   - Threshold: Alert immediately

## Testing

### Test Public Health
```bash
curl http://localhost:3001/health
# Expected: 200 OK with status: "ok"
```

### Test Admin Ops Health
```bash
# Get admin token first
TOKEN="your-admin-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/ops/health
# Expected: 200 OK with health metrics
```

### Test Queue Monitor
```bash
# Set env vars
export OPS_MONITOR_ENABLE=true
npm run job:queue-monitor
# Expected: Exit 0 if OK, exit 1 if issues found
```

### Test DB Monitor
```bash
# Set env vars
export OPS_MONITOR_ENABLE=true
npm run job:db-monitor
# Expected: Exit 0 if DB OK, exit 1 if DB down
```

### Test Uptime Ping
```bash
# Set env vars
export BACKEND_PUBLIC_URL=http://localhost:3001
npm run ping:health
# Expected: Exit 0 if OK, exit 1 if API down
```

### Simulate Stuck Queue
```bash
# Create a queued job and don't run worker
# Wait for QUEUE_STUCK_QUEUED_MIN minutes
# Run queue monitor - should alert
```

### Simulate DB Down
```bash
# Temporarily set wrong DATABASE_URL in staging
# Run DB monitor - should alert
# Restore correct DATABASE_URL
```

## Files Changed

- ✅ `backend/src/index.ts` - Updated `/health` endpoint
- ✅ `backend/src/routes/admin.ts` - Added `/api/admin/ops/health` endpoint
- ✅ `backend/src/jobs/queueMonitorJob.ts` - Queue monitoring job with alerting + no-progress detection
- ✅ `backend/src/jobs/dbMonitorJob.ts` - DB monitoring job with slow alerting
- ✅ `backend/src/jobs/cleanupJob.ts` - Added job lock
- ✅ `backend/scripts/ping-health.js` - External uptime ping with alerting + recovery alerts
- ✅ `backend/scripts/run-s3-deletion-worker.ts` - Added job lock
- ✅ `backend/src/lib/utils/jobLock.ts` - Job locking utility (NEW)
- ✅ `backend/src/lib/ops/alerting.ts` - Alert noise control helper (NEW)
- ✅ `backend/prisma/schema.prisma` - Added `OpsAlertState` model
- ✅ `backend/prisma/migrations/*/add_ops_alert_state` - Migration (NEW)
- ✅ `backend/package.json` - Added npm scripts
- ✅ `backend/scripts/test-ops-alert-noise.js` - Test script (NEW)
- ✅ `backend/scripts/test-job-lock.js` - Test script (NEW)
- ✅ `backend/docs/ops/uptime.md` - Updated documentation

## Security

- **Public `/health`**: No secrets, no DB calls, fast response
- **Admin `/api/admin/ops/health`**: Feature-flagged, rate-limited, admin-only
- **Monitoring Jobs**: No PII in alerts, safe context only
- **Sentry Alerts**: Stable fingerprints prevent alert spam
- **Job Locks**: Postgres advisory locks prevent concurrent execution
- **Alert State**: Stored in database, no sensitive data in snapshots

