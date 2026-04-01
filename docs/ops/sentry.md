# Sentry Error Tracking Setup

This document describes the Sentry integration for both backend and frontend, including configuration, environment variables, and release naming conventions.

## Overview

Sentry is integrated with **strict scrubbing** to ensure no tokens, PII, or sensitive data is sent to Sentry. All events are scrubbed before transmission.

## Backend Setup (Express/Node.js)

### Installation

```bash
cd backend
npm install @sentry/node
```

### Environment Variables

Add to `backend/.env`:

```env
# Enable Sentry
SENTRY_ENABLE=true

# Sentry DSN (get from Sentry project settings)
SENTRY_DSN_BACKEND=https://xxx@xxx.ingest.sentry.io/xxx

# Environment name
SENTRY_ENVIRONMENT=production|staging|development

# Release version (see Release Naming below)
SENTRY_RELEASE=plotex-backend@<git_sha_or_semver>

# Performance tracing sample rate (0.0-1.0)
SENTRY_TRACES_SAMPLE_RATE=0.05

# Profiling sample rate (0.0-1.0, default: 0.0 = disabled)
SENTRY_PROFILES_SAMPLE_RATE=0.0
```

### Configuration

Sentry is initialized in `backend/src/lib/sentry.ts` with:

- **HTTP + Express integrations** for request tracking
- **Strict scrubbing** of:
  - Authorization headers, cookies
  - Request bodies on auth endpoints (`/api/auth/*`, `/api/user/delete`)
  - Query parameters containing tokens/secrets
  - Password fields, JWT tokens, API keys

### Request Context

Each request automatically sets non-PII tags:
- `service`: "backend"
- `route`: Request route path
- `method`: HTTP method
- `role`: User role (or "anonymous")
- `requestId`: Request ID for correlation

User context uses **hashed userId only** (never email or raw userId).

### DSAR Error Capturing

DSAR-related errors are automatically captured with tags:
- `gdpr: dsar`
- `gdpr_event: export_failed | delete_failed | consent_failed`

Locations:
- `backend/src/routes/user.ts` - Export/delete endpoints
- `backend/src/routes/consents.ts` - Consent endpoints

### S3 Deletion Error Capturing

S3 deletion failures are captured when `FileDeletionJob` reaches max attempts:
- Tags: `job: s3_deletion`, `s3_delete: failed`
- Context: bucket name, key prefix (never full key), attempts

Location: `backend/src/services/gdpr/s3-cleanup.ts`

## Frontend Setup (Next.js)

### Installation

```bash
cd listings/frontend
npm install @sentry/nextjs
```

### Environment Variables

Add to `listings/frontend/.env.local`:

```env
# Enable Sentry
NEXT_PUBLIC_SENTRY_ENABLE=true

# Sentry DSN (get from Sentry project settings)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Environment name
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production|staging|development

# Performance tracing sample rate (0.0-1.0)
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05

# Sourcemap upload (CI only - never expose in client)
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_RELEASE=plotex-frontend@<git_sha_or_semver>
```

### Configuration Files

- `sentry.client.config.ts` - Browser/client-side errors
- `sentry.server.config.ts` - API routes & server components
- `sentry.edge.config.ts` - Edge runtime (middleware)

All configs include strict scrubbing (same as backend).

### Sourcemaps

Sourcemaps are automatically uploaded during build when:
- `NEXT_PUBLIC_SENTRY_ENABLE=true`
- `SENTRY_AUTH_TOKEN` is set (CI only)
- `SENTRY_ORG` and `SENTRY_PROJECT` are set

**Important:** `SENTRY_AUTH_TOKEN` should **never** be exposed to the client. Only set it in CI/CD environments.

### Instrumentation

Server-side initialization happens via `src/instrumentation.ts` (Next.js instrumentation hook).

## Release Naming

Releases should follow this format:

```
<service-name>@<version>
```

Examples:
- `plotex-backend@abc123def` (git SHA)
- `plotex-backend@1.2.3` (semver)
- `plotex-frontend@abc123def`
- `plotex-frontend@1.2.3`

### Setting Release in CI/CD

**Backend:**
```bash
export SENTRY_RELEASE="plotex-backend@$(git rev-parse --short HEAD)"
```

**Frontend:**
```bash
export SENTRY_RELEASE="plotex-frontend@$(git rev-parse --short HEAD)"
```

Or use semver:
```bash
export SENTRY_RELEASE="plotex-backend@$(node -p "require('./package.json').version")"
```

## Scrubbing Rules

### Never Sent to Sentry

- JWT tokens (Authorization headers, cookies)
- Passwords (request bodies, query params)
- API keys, secrets
- Email addresses (removed from user context)
- Phone numbers, addresses
- Full S3 keys (only prefix sent)
- Raw userId (hashed only)

### Safe to Send

- Route paths, HTTP methods
- User roles (non-PII)
- Request IDs (correlation)
- Hashed userId (SHA-256, first 16 chars)
- Error messages (sanitized)
- Stack traces (sourcemaps in production)

## Verification

### Backend

1. Set `SENTRY_ENABLE=true` and `SENTRY_DSN_BACKEND`
2. Trigger a test error (dev-only route):
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     router.get('/test-sentry', (req, res) => {
       throw new Error('Test Sentry error');
     });
   }
   ```
3. Check Sentry dashboard for event

### Frontend

1. Set `NEXT_PUBLIC_SENTRY_ENABLE=true` and `NEXT_PUBLIC_SENTRY_DSN`
2. Trigger a client error (dev-only page):
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     throw new Error('Test Sentry error');
   }
   ```
3. Check Sentry dashboard for event

### Verify Scrubbing

1. Trigger an error with sensitive data (e.g., auth endpoint with password)
2. Check Sentry event payload
3. Verify no tokens/passwords/PII are present

## Performance Impact

- **Tracing sample rate**: 5% (configurable via `SENTRY_TRACES_SAMPLE_RATE`)
- **Profiling**: Disabled by default (`SENTRY_PROFILES_SAMPLE_RATE=0.0`)
- **Client-side**: Minimal overhead, async error capture
- **Server-side**: Negligible overhead, async error capture

## Troubleshooting

### Sentry Not Capturing Events

1. Check `SENTRY_ENABLE` / `NEXT_PUBLIC_SENTRY_ENABLE` is `true`
2. Verify DSN is set correctly
3. Check browser/server console for Sentry init logs
4. Verify network requests to Sentry (check browser DevTools Network tab)

### Sourcemaps Not Working

1. Ensure `SENTRY_AUTH_TOKEN` is set in CI (not client)
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match Sentry project
3. Verify `SENTRY_RELEASE` matches release in Sentry
4. Check build logs for sourcemap upload errors

### Too Many Events

- Reduce `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.01` = 1%)
- Add filters in Sentry dashboard
- Use alert rules (see `sentry-alerts.md`)

## References

- [Sentry Node.js Docs](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Alert Rules](docs/ops/sentry-alerts.md)




