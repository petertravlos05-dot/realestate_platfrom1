# Ops Hardening Implementation Summary

## Overview

This document summarizes the final ops hardening implementation with alert noise control, DB slow detection, job locking, and improved stuck-processing detection.

## ✅ Completed Features

### A) Job Locking (Postgres Advisory Locks)
- ✅ Created `backend/src/lib/utils/jobLock.ts`
- ✅ Applied to all monitoring jobs:
  - `queue-monitor` (TTL: 120s)
  - `db-monitor` (TTL: 120s)
  - `cleanup-job` (TTL: 600s)
  - `s3-deletion-worker` (TTL: 600s)

### B) Alert Noise Control (State-Change + Cooldown)
- ✅ Created `backend/src/lib/ops/alerting.ts`
- ✅ Added `OpsAlertState` Prisma model
- ✅ Created migration: `20260106000000_add_ops_alert_state`
- ✅ Applied to all monitoring jobs:
  - Queue monitor: 4 alert keys with cooldown
  - DB monitor: 2 alert keys (down + slow)
  - Uptime ping: 1 alert key + recovery alerts

### C) DB Slow Alerting
- ✅ Added latency threshold detection in `dbMonitorJob.ts`
- ✅ New alert: `ops.db.slow` when latency > threshold
- ✅ Configurable via `DB_SLOW_THRESHOLD_MS` (default: 800ms)

### D) Queue "No Progress" Detection
- ✅ Enhanced `queueMonitorJob.ts` with progress tracking
- ✅ Detects when processing jobs exist but deleted count doesn't increase
- ✅ New alert: `ops.queue.no_progress_processing`
- ✅ Configurable via `QUEUE_NO_PROGRESS_MIN` (default: 30 minutes)

### E) Uptime Ping Noise Control
- ✅ Updated `ping-health.js` with alerting helper
- ✅ Recovery alerts when API comes back online
- ✅ State-change + cooldown logic applied

### F) Documentation & Tests
- ✅ Updated `backend/docs/ops/uptime.md` with all new features
- ✅ Created `backend/scripts/test-ops-alert-noise.js`
- ✅ Created `backend/scripts/test-job-lock.js`

## Files Changed

### New Files
1. `backend/src/lib/utils/jobLock.ts` - Job locking utility
2. `backend/src/lib/ops/alerting.ts` - Alert noise control helper
3. `backend/prisma/migrations/20260106000000_add_ops_alert_state/migration.sql` - Migration
4. `backend/scripts/test-ops-alert-noise.js` - Test script
5. `backend/scripts/test-job-lock.js` - Test script
6. `backend/OPS_HARDENING_SUMMARY.md` - This file

### Modified Files
1. `backend/prisma/schema.prisma` - Added `OpsAlertState` model
2. `backend/src/jobs/queueMonitorJob.ts` - Added alerting + no-progress + job lock
3. `backend/src/jobs/dbMonitorJob.ts` - Added slow alerting + alerting + job lock
4. `backend/src/jobs/cleanupJob.ts` - Added job lock
5. `backend/scripts/ping-health.js` - Added alerting + recovery alerts
6. `backend/scripts/run-s3-deletion-worker.ts` - Added job lock
7. `backend/docs/ops/uptime.md` - Updated documentation

## Environment Variables Added

```env
# Queue Monitoring
QUEUE_NO_PROGRESS_MIN=30
QUEUE_ALERT_COOLDOWN_MIN=60

# Database Monitoring
DB_SLOW_THRESHOLD_MS=800
DB_ALERT_COOLDOWN_MIN=30

# Uptime Ping
UPTIME_ALERT_COOLDOWN_MIN=15
```

## Migration Required

Run the migration to create the `OpsAlertState` table:

```bash
cd backend
npx prisma migrate deploy
# or for dev:
npx prisma migrate dev
```

## Verification Steps

### 1. Test Alert Noise Control
```bash
cd backend
npm run build
node scripts/test-ops-alert-noise.js
```

Expected: Only 1 alert per cooldown period, alerts on state changes.

### 2. Test Job Lock
```bash
cd backend
npm run build
node scripts/test-job-lock.js
```

Expected: Second concurrent invocation blocked.

### 3. Test Queue Monitor
```bash
export OPS_MONITOR_ENABLE=true
npm run job:queue-monitor
```

Expected: Runs with job lock, uses alerting helper, detects no-progress.

### 4. Test DB Monitor (Slow Detection)
```bash
export OPS_MONITOR_ENABLE=true
export DB_SLOW_THRESHOLD_MS=100  # Low threshold for testing
npm run job:db-monitor
```

Expected: Alerts if latency > threshold, respects cooldown.

### 5. Test Uptime Ping
```bash
export BACKEND_PUBLIC_URL=http://localhost:3001
npm run ping:health
```

Expected: Sends recovery alert when API recovers, respects cooldown.

## Alert Keys Reference

### Queue Monitoring
- `ops.queue.stuck_queued` - Stuck queued jobs
- `ops.queue.stuck_processing` - Stuck processing jobs
- `ops.queue.failed_jobs` - Failed job count exceeded
- `ops.queue.no_progress_processing` - No progress detected
- `ops.queue.progress` - Progress snapshot (internal)

### Database Monitoring
- `ops.db.down` - Database connectivity failure
- `ops.db.slow` - Database query latency exceeded threshold

### Uptime Monitoring
- `ops.uptime.api_down` - API endpoint unreachable

## Benefits

1. **Reduced Alert Noise**: State-change + cooldown prevents spam
2. **Early Detection**: DB slow alerts catch issues before DB goes down
3. **Better Visibility**: No-progress detection catches stalled processing
4. **Idempotent Jobs**: Job locks prevent concurrent execution issues
5. **Recovery Alerts**: Automatic notifications when issues resolve

## Next Steps

1. Run migration: `npx prisma migrate deploy`
2. Set environment variables in Render
3. Test all monitoring jobs locally
4. Deploy to production
5. Monitor Sentry for alert patterns
6. Adjust cooldown periods if needed based on production behavior



