# Sentry Integration Summary

This document provides a quick reference for the Sentry integration setup, including installation commands, environment variables, and testing steps.

## Quick Start

### Backend Installation

```bash
cd backend
npm install @sentry/node
```

### Frontend Installation

```bash
cd listings/frontend
npm install @sentry/nextjs
```

## Environment Variables

### Backend (.env)

```env
SENTRY_ENABLE=true
SENTRY_DSN_BACKEND=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production|staging|development
SENTRY_RELEASE=plotex-backend@<git_sha_or_semver>
SENTRY_TRACES_SAMPLE_RATE=0.05
SENTRY_PROFILES_SAMPLE_RATE=0.0
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_SENTRY_ENABLE=true
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production|staging|development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05

# CI only (never expose to client)
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_RELEASE=plotex-frontend@<git_sha_or_semver>
```

## Files Changed

### Backend

- ✅ `backend/src/lib/sentry.ts` - Sentry initialization and scrubbing
- ✅ `backend/src/index.ts` - Sentry middleware integration
- ✅ `backend/src/routes/user.ts` - DSAR export/delete error capturing
- ✅ `backend/src/routes/consents.ts` - Consent error capturing
- ✅ `backend/src/services/gdpr/s3-cleanup.ts` - S3 deletion error capturing
- ✅ `backend/.env.example` - Environment variable examples

### Frontend

- ✅ `listings/frontend/sentry.client.config.ts` - Client-side Sentry config
- ✅ `listings/frontend/sentry.server.config.ts` - Server-side Sentry config
- ✅ `listings/frontend/sentry.edge.config.ts` - Edge runtime Sentry config
- ✅ `listings/frontend/src/instrumentation.ts` - Next.js instrumentation hook
- ✅ `listings/frontend/next.config.js` - Sentry sourcemap configuration
- ✅ `listings/frontend/tsconfig.json` - Instrumentation hook enabled
- ✅ `listings/frontend/.env.example` - Environment variable examples

### Documentation

- ✅ `docs/ops/sentry.md` - Complete setup guide
- ✅ `docs/ops/sentry-alerts.md` - Alert configuration guide

## Testing Commands

### Backend Test

1. **Start backend with Sentry enabled:**
   ```bash
   cd backend
   # Set SENTRY_ENABLE=true and SENTRY_DSN_BACKEND in .env
   npm run dev
   ```

2. **Trigger test error (dev-only route):**
   ```bash
   # Add to backend/src/routes/debug.ts or create test route:
   if (process.env.NODE_ENV !== 'production') {
     router.get('/test-sentry', (req, res) => {
       throw new Error('Test Sentry error');
     });
   }
   
   # Then call:
   curl http://localhost:3001/api/debug/test-sentry
   ```

3. **Check Sentry dashboard** for the error event.

### Frontend Test

1. **Start frontend with Sentry enabled:**
   ```bash
   cd listings/frontend
   # Set NEXT_PUBLIC_SENTRY_ENABLE=true and NEXT_PUBLIC_SENTRY_DSN in .env.local
   npm run dev
   ```

2. **Trigger test error (dev-only page):**
   ```typescript
   // Add to any page component (e.g., src/app/test-sentry/page.tsx):
   'use client';
   
   if (process.env.NODE_ENV !== 'production') {
     throw new Error('Test Sentry error');
   }
   
   export default function TestSentry() {
     return <div>Test Sentry</div>;
   }
   ```

3. **Navigate to** `http://localhost:3000/test-sentry`
4. **Check Sentry dashboard** for the error event.

### DSAR Error Test

1. **Test export failure:**
   ```bash
   # Temporarily disconnect DB or cause error
   # Then trigger export endpoint with valid JWT
   curl -X POST http://localhost:3001/api/user/export \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json"
   ```

2. **Check Sentry** for event with tags:
   - `gdpr: dsar`
   - `gdpr_event: export_failed`

### S3 Deletion Error Test

1. **Create failed deletion job:**
   ```bash
   # Use backend script or manually create FileDeletionJob with invalid S3 key
   # Run deletion worker until max attempts reached
   npm run s3-deletion-worker
   ```

2. **Check Sentry** for event with tags:
   - `job: s3_deletion`
   - `s3_delete: failed`

## Verification Checklist

- [ ] Backend Sentry initialized (check console logs)
- [ ] Frontend Sentry initialized (check console logs)
- [ ] Test error appears in Sentry dashboard
- [ ] No tokens/PII in Sentry event payload
- [ ] DSAR errors tagged correctly (`gdpr: dsar`)
- [ ] S3 deletion errors tagged correctly (`job: s3_deletion`)
- [ ] Sourcemaps uploaded (production builds only)
- [ ] Alerts configured in Sentry dashboard

## Release Naming

Set release version in CI/CD:

**Backend:**
```bash
export SENTRY_RELEASE="plotex-backend@$(git rev-parse --short HEAD)"
```

**Frontend:**
```bash
export SENTRY_RELEASE="plotex-frontend@$(git rev-parse --short HEAD)"
```

## Alert Setup

See `docs/ops/sentry-alerts.md` for detailed alert configuration.

Quick setup:
1. Go to Sentry Dashboard → Alerts → Create Alert Rule
2. **DSAR Failures**: Filter `tags.gdpr:dsar AND tags.gdpr_event:(export_failed OR delete_failed OR consent_failed)`
3. **S3 Deletion Failures**: Filter `tags.job:s3_deletion AND tags.s3_delete:failed`
4. Configure email/Slack notifications

## Troubleshooting

### Sentry Not Capturing Events

1. Check `SENTRY_ENABLE` / `NEXT_PUBLIC_SENTRY_ENABLE` is `true`
2. Verify DSN is correct
3. Check console logs for Sentry init messages
4. Verify network requests to Sentry (browser DevTools)

### Sourcemaps Not Working

1. Ensure `SENTRY_AUTH_TOKEN` is set in CI (not client)
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match Sentry project
3. Verify `SENTRY_RELEASE` matches release in Sentry
4. Check build logs for sourcemap upload errors

## Next Steps

1. Install packages (`npm install`)
2. Set environment variables
3. Test error capturing
4. Configure alerts in Sentry dashboard
5. Set up release naming in CI/CD
6. Monitor Sentry dashboard for errors

## References

- [Complete Setup Guide](sentry.md)
- [Alert Configuration](sentry-alerts.md)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)




