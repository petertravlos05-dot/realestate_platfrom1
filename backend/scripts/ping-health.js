/**
 * External Uptime Ping Script
 * 
 * Pings the public /health endpoint and sends Sentry alerts on failures.
 * Uses state-change + cooldown logic to reduce alert noise.
 * Designed to run from Render cron jobs or external uptime providers.
 * 
 * Environment Variables:
 *   BACKEND_PUBLIC_URL - Public URL of backend (e.g., https://api.domain.com)
 *   OPS_PING_TIMEOUT_MS - Timeout in milliseconds (default: 3000)
 *   UPTIME_ALERT_COOLDOWN_MIN - Cooldown minutes between alerts (default: 15)
 *   SENTRY_ENABLE - Enable Sentry (true|false)
 *   SENTRY_DSN_BACKEND - Sentry DSN
 *   DATABASE_URL - Database connection string (for alert state)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');

const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL;
const OPS_PING_TIMEOUT_MS = parseInt(process.env.OPS_PING_TIMEOUT_MS || '3000', 10);
const UPTIME_ALERT_COOLDOWN_MIN = parseInt(process.env.UPTIME_ALERT_COOLDOWN_MIN || '15', 10);
const SENTRY_ENABLE = process.env.SENTRY_ENABLE === 'true';

const prisma = new PrismaClient();

if (!BACKEND_PUBLIC_URL) {
  console.error('[PING-HEALTH] BACKEND_PUBLIC_URL not set');
  process.exit(1);
}

// Initialize Sentry if enabled
let Sentry = null;
if (SENTRY_ENABLE && process.env.SENTRY_DSN_BACKEND) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN_BACKEND,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.0, // No tracing for ping script
    });
  } catch (error) {
    console.error('[PING-HEALTH] Failed to initialize Sentry:', error);
  }
}

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
      clearTimeout(timeout);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({ statusCode: res.statusCode, body: json });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        } else {
          reject(new Error(`Health endpoint returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    req.end();
  });
}

// Helper function to check if alert should be sent (simplified version for JS)
async function shouldSendAlert(key, nextStatus, cooldownMinutes, snapshotObj) {
  const currentState = await prisma.opsAlertState.findUnique({
    where: { key },
  });

  const now = new Date();
  const lastSentAt = currentState?.lastSentAt;
  const lastStatus = currentState?.lastStatus;

  let lastValueJson = null;
  if (snapshotObj) {
    const jsonStr = JSON.stringify(snapshotObj);
    lastValueJson = jsonStr.length > 1000 ? jsonStr.substring(0, 1000) + '...' : jsonStr;
  }

  // State change: always send alert
  if (lastStatus !== nextStatus) {
    await prisma.opsAlertState.upsert({
      where: { key },
      update: {
        lastStatus: nextStatus,
        lastSentAt: nextStatus === 'alert' ? now : undefined,
        lastValueJson,
      },
      create: {
        key,
        lastStatus: nextStatus,
        lastSentAt: nextStatus === 'alert' ? now : null,
        lastValueJson,
      },
    });
    return true;
  }

  // Same status: only send if "alert" and cooldown expired
  if (nextStatus === 'alert') {
    if (!lastSentAt) {
      await prisma.opsAlertState.upsert({
        where: { key },
        update: {
          lastStatus: nextStatus,
          lastSentAt: now,
          lastValueJson,
        },
        create: {
          key,
          lastStatus: nextStatus,
          lastSentAt: now,
          lastValueJson,
        },
      });
      return true;
    }

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastSent = now.getTime() - lastSentAt.getTime();

    if (timeSinceLastSent >= cooldownMs) {
      await prisma.opsAlertState.upsert({
        where: { key },
        update: {
          lastStatus: nextStatus,
          lastSentAt: now,
          lastValueJson,
        },
        create: {
          key,
          lastStatus: nextStatus,
          lastSentAt: now,
          lastValueJson,
        },
      });
      return true;
    }

    await prisma.opsAlertState.upsert({
      where: { key },
      update: { lastValueJson },
      create: {
        key,
        lastStatus: nextStatus,
        lastValueJson,
      },
    });
    return false;
  }

  // Status is "ok": update state but don't send alert
  await prisma.opsAlertState.upsert({
    where: { key },
    update: { lastValueJson },
    create: {
      key,
      lastStatus: nextStatus,
      lastValueJson,
    },
  });
  return false;
}

async function main() {
  try {
    const startTime = Date.now();
    const result = await pingHealth();
    const latencyMs = Date.now() - startTime;
    
    // API is OK - check if we should send recovery alert
    const urlHostname = new URL(BACKEND_PUBLIC_URL).hostname;
    const shouldAlertRecovery = await shouldSendAlert(
      'ops.uptime.api_down',
      'ok',
      UPTIME_ALERT_COOLDOWN_MIN,
      { statusCode: result.statusCode, latencyMs }
    );

    if (shouldAlertRecovery && Sentry) {
      // Send recovery alert
      Sentry.withScope((scope) => {
        scope.setTag('ops', 'uptime');
        scope.setTag('issue', 'api_recovered');
        scope.setFingerprint(['ops', 'uptime', 'recovered']);
        scope.setContext('ping_health', {
          url: urlHostname,
          statusCode: result.statusCode,
          latencyMs,
        });
        Sentry.captureMessage('ops.api_recovered', {
          level: 'info',
          extra: {
            url: urlHostname,
            statusCode: result.statusCode,
            latencyMs,
          },
        });
      });
      await Sentry.flush(2000);
    }
    
    console.log(`[PING-HEALTH] Health check OK (${result.statusCode}, latency: ${latencyMs}ms)`);
    process.exit(0);
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    console.error(`[PING-HEALTH] Health check failed: ${errorMessage}`);
    
    const urlHostname = new URL(BACKEND_PUBLIC_URL).hostname;
    const shouldAlert = await shouldSendAlert(
      'ops.uptime.api_down',
      'alert',
      UPTIME_ALERT_COOLDOWN_MIN,
      { url: urlHostname, timeoutMs: OPS_PING_TIMEOUT_MS, error: errorMessage }
    );
    
    if (shouldAlert && Sentry) {
      Sentry.withScope((scope) => {
        scope.setTag('ops', 'uptime');
        scope.setTag('issue', 'api_down');
        scope.setFingerprint(['ops', 'uptime', 'api_down']);
        scope.setContext('ping_health', {
          url: urlHostname,
          timeoutMs: OPS_PING_TIMEOUT_MS,
          error: errorMessage,
        });
        Sentry.captureMessage('ops.api_down', {
          level: 'error',
          extra: {
            url: urlHostname,
            timeoutMs: OPS_PING_TIMEOUT_MS,
            error: errorMessage,
          },
        });
      });
      await Sentry.flush(2000);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

