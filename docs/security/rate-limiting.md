# Rate Limiting Security

## Overview

Rate limiting is enforced on all API endpoints to prevent abuse and ensure service availability. This document describes the security measures in place.

## Production Security

### No Hidden Bypasses

**In production (`NODE_ENV=production`), rate limiting bypass mechanisms are DISABLED.**

- The `X-Test-Request` header is **ignored** in production
- No environment variables can bypass rate limits in production
- All requests are subject to normal rate limiting regardless of headers

### Development/Testing Bypass

Rate limit bypass is **only** available in non-production environments and **only** from localhost:

1. **Non-production environments** (`NODE_ENV !== 'production'`):
   - `X-Test-Request: true` header bypasses rate limiting
   - **Only works from localhost** (127.0.0.1 or ::1)
   - Intended for local development and testing

2. **Explicit bypass flag** (`ALLOW_TEST_RATE_LIMIT_BYPASS=true`):
   - Can be enabled even in production for testing
   - **Still requires localhost** - remote requests cannot bypass
   - Should only be used in staging/test environments, never in production

## Rate Limits

### Export Endpoints

- **Initial export**: 2 requests per hour per user
- **Paginated export**: 20 requests per hour per user
- Rate limits are enforced per user ID (from JWT token)

### Other Endpoints

See `docs/production/rate-limiting.md` for complete rate limit configuration.

## Security Verification

### Verify Bypass is Disabled in Production

1. **Set production environment**:
   ```bash
   export NODE_ENV=production
   ```

2. **Send request with bypass header**:
   ```bash
   curl -X POST http://your-server/api/user/export \
     -H "Authorization: Bearer <token>" \
     -H "X-Test-Request: true" \
     -H "Content-Type: application/json"
   ```

3. **Expected behavior**:
   - Request should be rate limited normally
   - Server logs should show: `[RATE_LIMIT] Security: X-Test-Request header ignored in production`
   - No bypass should occur

### Verify Bypass Works in Development

1. **Set development environment**:
   ```bash
   export NODE_ENV=development
   # or unset NODE_ENV
   ```

2. **Send request from localhost**:
   ```bash
   curl -X POST http://localhost:3001/api/user/export \
     -H "Authorization: Bearer <token>" \
     -H "X-Test-Request: true" \
     -H "Content-Type: application/json"
   ```

3. **Expected behavior**:
   - Request should bypass rate limiting
   - Server logs should show: `[RATE_LIMIT] Bypassing rate limit for test request`

## Best Practices

1. **Never enable bypass in production** - Use proper rate limit configuration instead
2. **Use dedicated test users** - For production testing, create test users with appropriate rate limits
3. **Space out requests** - In production, respect rate limits and space out test requests
4. **Monitor rate limit violations** - Check audit logs for excessive rate limit hits

## Related Documentation

- `docs/production/rate-limiting.md` - Rate limiting configuration and setup
- `docs/gdpr/dsar_spec.md` - DSAR export rate limits




