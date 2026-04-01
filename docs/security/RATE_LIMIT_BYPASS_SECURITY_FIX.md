# Rate Limit Bypass Security Fix

## Summary

Fixed security vulnerability where `X-Test-Request` header could bypass rate limiting in production environments.

## Changes Made

### 1. Backend Middleware (`backend/src/middleware/rateLimit.ts`)

**Before:** Rate limit bypass worked unconditionally when `X-Test-Request: true` header was present.

**After:** Rate limit bypass is now restricted:
- **Production (`NODE_ENV=production`)**: Bypass is **ALWAYS DISABLED**, even if header is present
- **Non-production**: Bypass only works from localhost (127.0.0.1 or ::1)
- **Explicit bypass**: `ALLOW_TEST_RATE_LIMIT_BYPASS=true` can enable bypass even in production, but **still requires localhost**

### 2. Test Script (`backend/scripts/test-export-size-limits.js`)

- Updated to only send `X-Test-Request` header in non-production environments
- Added warnings when running in production mode
- Script respects production security restrictions

### 3. Documentation

- Created `docs/security/rate-limiting.md` with security details
- Updated `docs/gdpr/dsar_spec.md` with security notes
- Added environment variable documentation

## Security Logic

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const testHeader = req.headers['x-test-request'];
const allowBypassEnv = process.env.ALLOW_TEST_RATE_LIMIT_BYPASS === 'true';
const clientIp = req.ip || req.socket.remoteAddress || '';
const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';

// Allow bypass ONLY if:
// 1. NOT in production AND (header present OR env var set) AND from localhost
// 2. OR explicitly enabled via env var AND from localhost
const canBypass = !isProduction && (testHeader === 'true' || allowBypassEnv) && isLocalhost;

// In production, NEVER bypass even if header is present
if (isProduction && testHeader === 'true') {
  console.warn(`[RATE_LIMIT] Security: X-Test-Request header ignored in production`);
  // Continue with normal rate limiting
}
```

## Verification Steps

### 1. Verify Bypass is Disabled in Production

**Using curl (Linux/Mac/Git Bash):**
```bash
# Set production environment
export NODE_ENV=production

# Start backend server
npm run dev

# In another terminal, send request with bypass header
curl -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Test-Request: true" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Using PowerShell (Windows):**
```powershell
# Set production environment
$env:NODE_ENV="production"

# Start backend server
npm run dev

# In another PowerShell window, send request
$headers = @{
    "Authorization" = "Bearer <your-token>"
    "X-Test-Request" = "true"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "http://localhost:3001/api/user/export" -Method Post -Headers $headers -Body '{}'
```

**Expected Result:**
- Request should be rate limited normally (429 Too Many Requests if limit exceeded)
- Backend logs should show: `[RATE_LIMIT] Security: X-Test-Request header ignored in production`
- No bypass should occur

### 2. Verify Bypass Works in Development

**Using curl:**
```bash
# Unset or set to development
unset NODE_ENV
# or
export NODE_ENV=development

# Restart backend server
npm run dev

# Send request from localhost
curl -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Test-Request: true" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result:**
- Request should bypass rate limiting
- Backend logs should show: `[RATE_LIMIT] Bypassing rate limit for test request: /api/user/export (from ::1)`
- Request should succeed even if rate limit would normally block it

### 3. Verify Remote Requests Cannot Bypass

**Test from remote IP (not localhost):**
```bash
# Even in development, remote requests cannot bypass
curl -X POST http://your-server/api/user/export \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Test-Request: true" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result:**
- Request should be rate limited normally
- Bypass should not work even in development if request is not from localhost

## Files Changed

1. `backend/src/middleware/rateLimit.ts` - Added production check and localhost restriction
2. `backend/scripts/test-export-size-limits.js` - Updated to respect production mode
3. `docs/security/rate-limiting.md` - New security documentation
4. `docs/gdpr/dsar_spec.md` - Added security notes

## Production Deployment Checklist

- [ ] Verify `NODE_ENV=production` is set in production environment
- [ ] Verify `ALLOW_TEST_RATE_LIMIT_BYPASS` is NOT set (or set to false)
- [ ] Test that bypass header is ignored in production
- [ ] Monitor logs for any bypass attempts
- [ ] Ensure rate limits are properly configured for production load

## Security Impact

**Before Fix:**
- Any request with `X-Test-Request: true` header could bypass rate limiting
- This could be exploited in production to bypass rate limits

**After Fix:**
- Production: Bypass is completely disabled
- Development: Bypass only works from localhost
- Remote requests: Cannot bypass even in development

## Related Documentation

- `docs/security/rate-limiting.md` - Complete rate limiting security guide
- `docs/production/rate-limiting.md` - Production rate limiting configuration
- `docs/gdpr/dsar_spec.md` - DSAR export rate limits




