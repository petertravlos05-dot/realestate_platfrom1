# Core Security Verification - D2. Ops Monitoring

**Date:** 2025-01-XX  
**Status:** ✅ GO

---

## D2. Ops Monitoring - VERIFICATION RESULTS

### ✅ D2.1: /health Public (No DB)

**Status:** ✅ **PASS**

**Evidence:**

1. **Public Health Endpoint** (`backend/src/index.ts:212-220`):
   ```typescript
   // Public health check (no auth, no DB calls, fast)
   app.get('/health', (req, res) => {
     res.json({ 
       status: 'ok',
       service: 'backend',
       env: process.env.NODE_ENV || 'development',
       time: new Date().toISOString(),
     });
   });
   ```
   **Features:**
   - ✅ No authentication required (public endpoint)
   - ✅ No database calls (fast response)
   - ✅ Returns 200 if process is alive
   - ✅ No secrets exposed
   - ✅ Simple JSON response

2. **No Database Dependencies:**
   - ✅ No `prisma` queries
   - ✅ No database connection checks
   - ✅ Only returns process status and timestamp

**Verification:** ✅ `/health` endpoint is public and has no database calls:
- ✅ No authentication required
- ✅ No database queries
- ✅ Fast response (process status only)
- ✅ No secrets exposed

---

### ✅ D2.2: Admin Ops Health Feature-Flagged

**Status:** ✅ **PASS**

**Evidence:**

1. **Feature Flag Check** (`backend/src/routes/admin.ts:29-31`):
   ```typescript
   function isAdminHealthEnabled(): boolean {
     return process.env.ENABLE_ADMIN_HEALTH === 'true';
   }
   ```

2. **Feature Flag Gate** (`backend/src/routes/admin.ts:186-200`):
   ```typescript
   router.get('/ops/health',
     // Feature flag gate (must be first - returns 404 if disabled)
     (req: Request, res: Response, next: NextFunction) => {
       if (!isAdminHealthEnabled()) {
         auditLog(req as AuthRequest, 'admin.action', 'Admin ops health endpoint access denied - feature disabled', 'failure', {
           resourceType: 'admin_endpoint',
           resourceId: '/api/admin/ops/health',
           details: { reason: 'disabled' },
         });
         return res.status(404).json({
           error: 'NOT_FOUND',
         });
       }
       next();
     },
     // ... rest of middleware
   );
   ```

3. **Security Features:**
   - ✅ Returns 404 if feature flag not set (hides endpoint existence)
   - ✅ Audit logged when access denied
   - ✅ Admin authentication required (after feature flag check)
   - ✅ Rate limited (5 requests/minute)

4. **GDPR Health Endpoint** (`backend/src/routes/admin.ts:75-83`):
   - ✅ Also feature-flagged with same `ENABLE_ADMIN_HEALTH` check
   - ✅ Returns 404 if disabled

**Verification:** ✅ Admin ops health is feature-flagged:
- ✅ Feature flag: `ENABLE_ADMIN_HEALTH=true`
- ✅ Returns 404 if disabled (hides endpoint)
- ✅ Audit logged when access denied
- ✅ Admin auth + rate limiting after feature flag check

---

### ✅ D2.3: Queue Monitor (Stuck / No-Progress)

**Status:** ✅ **PASS**

**Evidence:**

1. **Queue Monitor Implementation** (`backend/src/jobs/queueMonitorJob.ts`):
   - ✅ Monitors FileDeletionJob queue
   - ✅ Detects stuck queued jobs (default: >60 minutes)
   - ✅ Detects stuck processing jobs (default: >30 minutes)
   - ✅ Detects failed jobs (threshold: >=1)
   - ✅ Detects no-progress processing (deleted count not increasing)

2. **Stuck Queued Detection** (`backend/src/jobs/queueMonitorJob.ts:54-63, 114-149`):
   ```typescript
   // Find oldest queued job
   const oldestQueuedJob = await prisma.fileDeletionJob.findFirst({
     where: { status: 'QUEUED' },
     orderBy: { createdAt: 'asc' },
   });
   
   const oldestQueuedMinutes = oldestQueuedJob
     ? Math.floor((Date.now() - oldestQueuedJob.createdAt.getTime()) / (1000 * 60))
     : null;
   
   const stuckQueued = queued > 0 && oldestQueuedMinutes !== null && oldestQueuedMinutes > QUEUE_STUCK_QUEUED_MIN;
   ```

3. **Stuck Processing Detection** (`backend/src/jobs/queueMonitorJob.ts:65-74, 151-182`):
   ```typescript
   // Find oldest processing job
   const oldestProcessingJob = await prisma.fileDeletionJob.findFirst({
     where: { status: 'PROCESSING' },
     orderBy: { updatedAt: 'asc' },
   });
   
   const oldestProcessingMinutes = oldestProcessingJob
     ? Math.floor((Date.now() - oldestProcessingJob.updatedAt.getTime()) / (1000 * 60))
     : null;
   
   const stuckProcessing = processing > 0 && oldestProcessingMinutes !== null && oldestProcessingMinutes > QUEUE_STUCK_PROCESSING_MIN;
   ```

4. **No-Progress Detection** (`backend/src/jobs/queueMonitorJob.ts:76-100, 216-244`):
   ```typescript
   // Check for "no progress" (processing > 0 but deleted count hasn't increased)
   const progressState = await prisma.opsAlertState.findUnique({
     where: { key: 'ops.queue.progress' },
   });
   
   if (processing > 0 && progressState?.lastValueJson) {
     const lastSnapshot = JSON.parse(progressState.lastValueJson);
     const lastDeleted = lastSnapshot.deleted || 0;
     const timeSinceUpdate = Math.floor((Date.now() - progressState.updatedAt.getTime()) / (1000 * 60));
     
     // No progress if deleted count hasn't increased AND enough time has passed
     if (deleted === lastDeleted && timeSinceUpdate >= QUEUE_NO_PROGRESS_MIN) {
       noProgressProcessing = true;
     }
   }
   ```

5. **Alerting:**
   - ✅ Stuck queued: Alert with stable fingerprint `['ops', 'queue', 'stuck_queued']`
   - ✅ Stuck processing: Alert with stable fingerprint `['ops', 'queue', 'stuck_processing']`
   - ✅ Failed jobs: Alert with stable fingerprint `['ops', 'queue', 'failed_jobs']`
   - ✅ No progress: Alert with stable fingerprint `['ops', 'queue', 'no_progress_processing']`

**Verification:** ✅ Queue monitor implemented:
- ✅ Detects stuck queued jobs (>60 min default)
- ✅ Detects stuck processing jobs (>30 min default)
- ✅ Detects failed jobs (threshold: >=1)
- ✅ Detects no-progress processing (deleted count not increasing)
- ✅ All alerts use stable fingerprints

---

### ✅ D2.4: DB Monitor (Down + Slow)

**Status:** ✅ **PASS**

**Evidence:**

1. **DB Monitor Implementation** (`backend/src/jobs/dbMonitorJob.ts`):
   - ✅ Monitors database connectivity
   - ✅ Detects database down (timeout or error)
   - ✅ Detects slow queries (latency > threshold)

2. **DB Down Detection** (`backend/src/jobs/dbMonitorJob.ts:42-120`):
   ```typescript
   // Run DB check with timeout
   const dbCheckPromise = prisma.$queryRaw`SELECT 1`;
   const timeoutPromise = new Promise((_, reject) => {
     setTimeout(() => reject(new Error(`Database check timed out after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS);
   });
   
   try {
     await Promise.race([dbCheckPromise, timeoutPromise]);
   } catch (error) {
     // Database check failed - alert
     const shouldAlert = await shouldSendAlert(
       'ops.db.down',
       'alert',
       DB_ALERT_COOLDOWN_MIN,
       { timeoutMs: DB_TIMEOUT_MS, latencyMs, error: errorMessage }
     );
   }
   ```

3. **Slow Query Detection** (`backend/src/jobs/dbMonitorJob.ts:48-84`):
   ```typescript
   const startTime = Date.now();
   await Promise.race([dbCheckPromise, timeoutPromise]);
   const latencyMs = Date.now() - startTime;
   
   // Check for slow query
   if (latencyMs >= DB_SLOW_THRESHOLD_MS) {
     const shouldAlert = await shouldSendAlert(
       'ops.db.slow',
       'alert',
       DB_ALERT_COOLDOWN_MIN,
       { latencyMs, thresholdMs: DB_SLOW_THRESHOLD_MS }
     );
   }
   ```

4. **Alerting:**
   - ✅ DB down: Alert with stable fingerprint `['ops', 'db', 'down']`
   - ✅ DB slow: Alert with stable fingerprint `['ops', 'db', 'slow']`
   - ✅ Recovery alerts: When DB comes back online

5. **Configuration:**
   - ✅ `DB_TIMEOUT_MS` (default: 1500ms)
   - ✅ `DB_SLOW_THRESHOLD_MS` (default: 800ms)
   - ✅ `DB_ALERT_COOLDOWN_MIN` (default: 30 minutes)

**Verification:** ✅ DB monitor implemented:
- ✅ Detects database down (timeout or error)
- ✅ Detects slow queries (latency > threshold)
- ✅ Recovery alerts when DB comes back online
- ✅ All alerts use stable fingerprints

---

### ✅ D2.5: External Uptime Ping

**Status:** ✅ **PASS**

**Evidence:**

1. **Uptime Ping Script** (`backend/scripts/ping-health.js`):
   - ✅ Pings public `/health` endpoint
   - ✅ Configurable timeout (default: 3000ms)
   - ✅ Sends Sentry alerts on failures
   - ✅ Sends recovery alerts when API comes back online

2. **Health Check** (`backend/scripts/ping-health.js:49-91`):
   ```typescript
   async function pingHealth() {
     const url = new URL(`${BACKEND_PUBLIC_URL}/health`);
     const client = url.protocol === 'https:' ? https : http;
     
     return new Promise((resolve, reject) => {
       const timeout = setTimeout(() => {
         req.destroy();
         reject(new Error(`Request timed out after ${OPS_PING_TIMEOUT_MS}ms`));
       }, OPS_PING_TIMEOUT_MS);
       
       const req = client.request(url, {
         method: 'GET',
         timeout: OPS_PING_TIMEOUT_MS,
       }, (res) => {
         if (res.statusCode === 200) {
           resolve({ statusCode: res.statusCode, body: json });
         } else {
           reject(new Error(`Health endpoint returned ${res.statusCode}`));
         }
       });
     });
   }
   ```

3. **Alerting** (`backend/scripts/ping-health.js:194-272`):
   - ✅ Failure alert: `ops.uptime.api_down` with stable fingerprint `['ops', 'uptime', 'api_down']`
   - ✅ Recovery alert: `ops.uptime.api_recovered` with stable fingerprint `['ops', 'uptime', 'recovered']`
   - ✅ Uses state-change + cooldown logic

4. **Configuration:**
   - ✅ `BACKEND_PUBLIC_URL` (required)
   - ✅ `OPS_PING_TIMEOUT_MS` (default: 3000ms)
   - ✅ `UPTIME_ALERT_COOLDOWN_MIN` (default: 15 minutes)

5. **NPM Script** (`backend/package.json:40`):
   ```json
   "ping:health": "node scripts/ping-health.js"
   ```

**Verification:** ✅ External uptime ping implemented:
- ✅ Pings public `/health` endpoint
- ✅ Configurable timeout
- ✅ Sends Sentry alerts on failures
- ✅ Sends recovery alerts when API comes back online
- ✅ Uses state-change + cooldown logic

---

### ✅ D2.6: Alert Noise Control (State-Change + Cooldown + Recovery)

**Status:** ✅ **PASS**

**Evidence:**

1. **Alerting Helper** (`backend/src/lib/ops/alerting.ts`):
   ```typescript
   export async function shouldSendAlert(
     key: string,
     nextStatus: 'ok' | 'alert',
     cooldownMinutes: number,
     snapshotObj?: Record<string, any>
   ): Promise<boolean> {
     // State change: always send alert
     if (lastStatus !== nextStatus) {
       await updateAlertState(key, nextStatus, now, lastValueJson);
       return true;
     }
     
     // Same status: only send if "alert" and cooldown expired
     if (nextStatus === 'alert') {
       if (!lastSentAt) {
         // First time alerting
         return true;
       }
       
       const cooldownMs = cooldownMinutes * 60 * 1000;
       const timeSinceLastSent = now.getTime() - lastSentAt.getTime();
       
       if (timeSinceLastSent >= cooldownMs) {
         // Cooldown expired, send alert again
         return true;
       }
       
       // Still in cooldown, don't send
       return false;
     }
     
     // Status is "ok": update state but don't send alert
     return false;
   }
   ```

2. **State-Change Logic:**
   - ✅ Always sends alert on state change (ok → alert or alert → ok)
   - ✅ Tracks last status in database (`OpsAlertState` model)

3. **Cooldown Logic:**
   - ✅ Only sends alert if cooldown expired (for same status)
   - ✅ Cooldown only applies when status is "alert"
   - ✅ Configurable cooldown per alert type

4. **Recovery Alerts:**
   - ✅ Sends recovery alert when status changes from "alert" to "ok"
   - ✅ Implemented in `ping-health.js:200-230` (API recovery)
   - ✅ Implemented in `queueMonitorJob.ts:148, 181, 213, 243` (queue recovery)
   - ✅ Implemented in `dbMonitorJob.ts:81-82` (DB recovery)

5. **Database Model** (`backend/prisma/schema.prisma`):
   ```prisma
   model OpsAlertState {
     id            String   @id @default(cuid())
     key           String   @unique // e.g., "ops.queue.stuck_queued"
     lastStatus    String   // "ok" | "alert"
     lastSentAt    DateTime? // When last alert was sent (only for "alert" status)
     lastValueJson String?  @db.Text // Snapshot of values at last alert
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
   }
   ```

6. **Usage Examples:**
   - ✅ Queue monitor: 4 alert keys with cooldown (stuck_queued, stuck_processing, failed_jobs, no_progress_processing)
   - ✅ DB monitor: 2 alert keys with cooldown (down, slow)
   - ✅ Uptime ping: 1 alert key with cooldown (api_down) + recovery

**Verification:** ✅ Alert noise control implemented:
- ✅ State-change alerts (always sent on status change)
- ✅ Cooldown logic (prevents repeated alerts)
- ✅ Recovery alerts (sent when issues resolve)
- ✅ Database-backed state tracking (`OpsAlertState` model)

---

### ✅ D2.7: Job Locks (No Cron Overlap)

**Status:** ✅ **PASS**

**Evidence:**

1. **Job Lock Utility** (`backend/src/lib/utils/jobLock.ts`):
   ```typescript
   export async function withJobLock(
     lockName: string,
     ttlSeconds: number,
     fn: () => Promise<void>
   ): Promise<void> {
     // Use Postgres hashtext to convert lock name to integer for advisory lock
     const lockResult = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
       SELECT pg_try_advisory_lock(hashtext(${lockName})) AS acquired
     `;
     
     const acquired = lockResult[0]?.acquired ?? false;
     
     if (!acquired) {
       console.log(`[JOB-LOCK] Lock "${lockName}" already held, skipping execution`);
       return;
     }
     
     try {
       await fn();
     } finally {
       // Always release the lock
       await prisma.$queryRaw`
         SELECT pg_advisory_unlock(hashtext(${lockName}))
       `;
     }
   }
   ```

2. **Postgres Advisory Locks:**
   - ✅ Uses `pg_try_advisory_lock()` (non-blocking)
   - ✅ Uses `pg_advisory_unlock()` (always releases)
   - ✅ Lock name converted to integer using `hashtext()` for consistency

3. **Applied to All Monitoring Jobs:**
   - ✅ Queue monitor (`queueMonitorJob.ts:44`): `withJobLock('queue-monitor', 120, ...)`
   - ✅ DB monitor (`dbMonitorJob.ts:40`): `withJobLock('db-monitor', 120, ...)`
   - ✅ Cleanup job (`cleanupJob.ts:235`): `withJobLock('cleanup-job', 600, ...)`
   - ✅ S3 deletion worker (`run-s3-deletion-worker.ts:31`): `withJobLock('s3-deletion-worker', 600, ...)`

4. **Lock Behavior:**
   - ✅ Non-blocking: If lock already held, function exits silently (no error)
   - ✅ Automatic release: Lock released in `finally` block
   - ✅ Prevents overlap: Concurrent cron executions skip if lock held

5. **TTL (Time-To-Live):**
   - ✅ TTL parameter for logging/debugging (not enforced by DB)
   - ✅ Lock automatically released when process exits or function completes

**Verification:** ✅ Job locks implemented:
- ✅ Postgres advisory locks (`pg_try_advisory_lock`)
- ✅ Non-blocking (skips execution if lock held)
- ✅ Automatic release (always released in finally block)
- ✅ Applied to all monitoring jobs
- ✅ Prevents cron overlap

---

## Summary

| Requirement | Status | Evidence Location |
|------------|--------|-------------------|
| /health public (no DB) | ✅ PASS | `index.ts:212-220` (public endpoint, no DB) |
| Admin ops health feature-flagged | ✅ PASS | `admin.ts:29-31, 186-200` (ENABLE_ADMIN_HEALTH) |
| Queue monitor (stuck / no-progress) | ✅ PASS | `queueMonitorJob.ts` (stuck queued/processing, failed, no-progress) |
| DB monitor (down + slow) | ✅ PASS | `dbMonitorJob.ts` (down detection, slow detection) |
| External uptime ping | ✅ PASS | `ping-health.js` (pings /health, alerts on failure) |
| Alert noise control | ✅ PASS | `alerting.ts` (state-change + cooldown + recovery) |
| Job locks (no cron overlap) | ✅ PASS | `jobLock.ts` (Postgres advisory locks) |

---

## ✅ VERDICT: GO

**All ops monitoring requirements are met.**

- ✅ `/health` endpoint is public with no database calls
- ✅ Admin ops health is feature-flagged (`ENABLE_ADMIN_HEALTH`)
- ✅ Queue monitor detects stuck jobs and no-progress
- ✅ DB monitor detects down and slow queries
- ✅ External uptime ping implemented
- ✅ Alert noise control (state-change + cooldown + recovery)
- ✅ Job locks prevent cron overlap

**No blocking issues found. Platform has comprehensive ops monitoring.**

---

## Additional Notes

### Monitoring Jobs

**Queue Monitor:**
- Detects: Stuck queued (>60 min), stuck processing (>30 min), failed jobs (>=1), no-progress processing
- Cooldown: 60 minutes (configurable)
- Job lock: 120 seconds TTL

**DB Monitor:**
- Detects: DB down (timeout/error), slow queries (>800ms)
- Cooldown: 30 minutes (configurable)
- Job lock: 120 seconds TTL

**Uptime Ping:**
- Pings: `/health` endpoint
- Timeout: 3000ms (configurable)
- Cooldown: 15 minutes (configurable)
- Recovery alerts: When API comes back online

### Alert Keys

**Queue Monitor:**
- `ops.queue.stuck_queued`
- `ops.queue.stuck_processing`
- `ops.queue.failed_jobs`
- `ops.queue.no_progress_processing`

**DB Monitor:**
- `ops.db.down`
- `ops.db.slow`

**Uptime Ping:**
- `ops.uptime.api_down`
- `ops.uptime.api_recovered` (recovery)

### Job Lock Names

- `queue-monitor` (TTL: 120s)
- `db-monitor` (TTL: 120s)
- `cleanup-job` (TTL: 600s)
- `s3-deletion-worker` (TTL: 600s)

---

**Next Steps:**
- Ensure `OPS_MONITOR_ENABLE=true` in production
- Set up Render cron jobs for monitoring
- Configure external uptime monitoring (e.g., UptimeRobot, Pingdom)
- Review alert thresholds based on production usage

---

**Full verification report:** `docs/CORE_SECURITY_D2_VERIFICATION.md`


