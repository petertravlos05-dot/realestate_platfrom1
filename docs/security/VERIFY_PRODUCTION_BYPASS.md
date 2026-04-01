# Verify Production Rate Limit Bypass is Disabled

## Quick Test Command

**Prerequisites:**
1. Backend server running with `NODE_ENV=production`
2. Valid JWT token and CSRF token

**Test Command:**
```bash
curl -i -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-CSRF-Token: <CSRF>" \
  -H "X-Test-Request: true" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result:**
- **Status: 429 Too Many Requests** (if rate limit exceeded)
- **OR Status: 200 OK** (if within rate limit, but bypass did NOT work)
- Backend logs should show: `[RATE_LIMIT] Security: X-Test-Request header ignored in production`

**If bypass works (SECURITY VULNERABILITY):**
- Request succeeds even when rate limit should block it
- No security warning in logs
- **This indicates a backdoor exists**

## Step-by-Step Verification

### 1. Set Production Environment

**PowerShell (Windows):**
```powershell
$env:NODE_ENV="production"
```

**Bash/Linux/Mac:**
```bash
export NODE_ENV=production
```

### 2. Restart Backend Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### 3. Get Authentication Tokens

**Login to get token:**
```bash
curl -i -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

**Extract:**
- JWT token from response body (`token` field)
- CSRF token from `Set-Cookie` header (`csrf_token=...`)

### 4. Test Rate Limit Bypass

**First, trigger rate limit (make 3 requests quickly):**
```bash
# Request 1
curl -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-CSRF-Token: <CSRF>" \
  -H "Cookie: csrf_token=<CSRF>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Request 2 (should succeed)
curl -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-CSRF-Token: <CSRF>" \
  -H "Cookie: csrf_token=<CSRF>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Request 3 (should be rate limited - 429)
curl -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-CSRF-Token: <CSRF>" \
  -H "Cookie: csrf_token=<CSRF>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Then test with bypass header (should STILL be rate limited):**
```bash
curl -i -X POST http://localhost:3001/api/user/export \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-CSRF-Token: <CSRF>" \
  -H "Cookie: csrf_token=<CSRF>" \
  -H "X-Test-Request: true" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- Status: **429 Too Many Requests**
- Response: `{"error":"Too many requests","retryAfterSeconds":...}`
- Backend logs: `[RATE_LIMIT] Security: X-Test-Request header ignored in production`

### 5. Using Test Script

**Get tokens first, then:**
```bash
TEST_TOKEN=<your-jwt-token> \
TEST_CSRF=<your-csrf-token> \
NODE_ENV=production \
node scripts/verify-production-bypass-disabled.js
```

**Or with npm:**
```bash
TEST_TOKEN=<token> TEST_CSRF=<csrf> npm run verify:production-bypass
```

## Verification Checklist

- [ ] Backend running with `NODE_ENV=production`
- [ ] Rate limit triggered (429 response)
- [ ] Request with `X-Test-Request: true` still returns 429
- [ ] Backend logs show security warning
- [ ] No bypass occurred

## Security Impact

**If bypass works in production:**
- ⚠️ **CRITICAL SECURITY VULNERABILITY**
- Attackers could bypass rate limits
- Could lead to DoS or abuse
- **Immediate fix required**

**If bypass is disabled (correct behavior):**
- ✅ Security is working correctly
- Rate limits are enforced
- No backdoor exists




