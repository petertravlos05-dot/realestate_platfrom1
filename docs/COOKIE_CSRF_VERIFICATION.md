# Cookie & CSRF Verification Guide

**Last Updated:** 2024-12-19  
**Purpose:** Verify cookie and CSRF settings work correctly for cross-subdomain deployment

---

## Architecture

- **Frontend:** `https://app.domain.com` (Next.js)
- **Backend:** `https://api.domain.com` (Express)

Cookies must be shared across subdomains for authentication to work.

---

## Cookie Configuration

### Backend Cookie Settings

**File:** `backend/src/lib/utils/cookie-helpers.ts`

**Production Settings:**
- `domain`: `.domain.com` (from `COOKIE_DOMAIN` env var)
- `secure`: `true` (HTTPS only)
- `sameSite`: `lax` (CSRF protection + cross-subdomain support)
- `httpOnly`: `true` (for auth cookies, prevents XSS)
- `path`: `/` (for access_token), `/api/auth/refresh` (for refresh_token)

**CSRF Cookie Settings:**
- `domain`: `.domain.com`
- `secure`: `true`
- `sameSite`: `lax`
- `httpOnly`: `false` (must be readable by JavaScript)

### Environment Variables

```bash
COOKIE_DOMAIN=.domain.com  # Must start with dot for subdomain sharing
```

---

## CSRF Protection

**File:** `backend/src/middleware/csrf.ts`

**How It Works:**
1. **Safe Methods (GET, HEAD, OPTIONS):** Generate CSRF token, set as cookie
2. **State-Changing Methods (POST, PUT, PATCH, DELETE):** Validate CSRF token
3. **Validation:** Token must match between cookie and `X-CSRF-Token` header

**Cross-Subdomain Support:**
- Cookies with `domain=.domain.com` are accessible to both `app.domain.com` and `api.domain.com`
- `SameSite=lax` allows cookies to be sent on cross-subdomain requests
- CSRF token cookie is readable by JavaScript (for header injection)

---

## Verification Tests

### Test 1: Cookie Domain Format

```bash
# Check COOKIE_DOMAIN starts with dot
echo $COOKIE_DOMAIN | grep '^\.'
# Should output: .domain.com
```

### Test 2: Cookies Set Correctly

1. **Login via Frontend:**
   - Navigate to `https://app.domain.com/login`
   - Login with valid credentials
   - Open DevTools → Application → Cookies

2. **Verify Cookies:**
   - `access_token`: Should have `Domain=.domain.com`, `Secure`, `HttpOnly`, `SameSite=Lax`
   - `csrf_token`: Should have `Domain=.domain.com`, `Secure`, `SameSite=Lax` (NOT HttpOnly)
   - Both cookies should be visible for `app.domain.com` and `api.domain.com`

### Test 3: Cross-Subdomain API Call

```javascript
// Run in browser console on app.domain.com
fetch('https://api.domain.com/api/user/profile', {
  credentials: 'include',
  headers: {
    'X-CSRF-Token': document.cookie.split('csrf_token=')[1]?.split(';')[0]
  }
})
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Should return user profile (200 OK)

**If Fails:**
- Check CORS: Verify `FRONTEND_ORIGIN` includes `https://app.domain.com`
- Check Cookies: Verify cookies are set with correct domain
- Check CSRF: Verify CSRF token is sent in header

### Test 4: CORS Exactness

```bash
# Test CORS from command line
curl -H "Origin: https://app.domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-CSRF-Token" \
     -X OPTIONS \
     https://api.domain.com/api/user/profile

# Should return:
# Access-Control-Allow-Origin: https://app.domain.com
# Access-Control-Allow-Credentials: true
```

**Verify:**
- `Access-Control-Allow-Origin` is exact (not `*`)
- `Access-Control-Allow-Credentials: true` is present
- `Access-Control-Allow-Headers` includes `X-CSRF-Token`

### Test 5: Invalid Origin Rejected

```bash
# Test with invalid origin
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.domain.com/api/user/profile

# Should return CORS error or no CORS headers
```

---

## Common Issues

### Issue: Cookies Not Set

**Symptoms:** No cookies in DevTools after login

**Solutions:**
1. Verify `COOKIE_DOMAIN` is set (e.g., `.domain.com`)
2. Check that `COOKIE_DOMAIN` starts with dot
3. Verify HTTPS is used (cookies with `Secure=true` require HTTPS)
4. Check browser console for cookie errors

### Issue: CSRF Token Mismatch

**Symptoms:** 403 CSRF token mismatch errors

**Solutions:**
1. Verify CSRF token cookie is set (check DevTools)
2. Verify `X-CSRF-Token` header is sent with requests
3. Check that token matches between cookie and header
4. Verify `SameSite=lax` allows cross-subdomain cookie sending

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS errors

**Solutions:**
1. Verify `FRONTEND_ORIGIN` includes exact frontend URL (no trailing slash)
2. Check that frontend URL uses HTTPS
3. Verify no wildcards in CORS origins
4. Check that `credentials: true` is set in CORS config

---

## Production Checklist

Before going live, verify:

- [ ] `COOKIE_DOMAIN=.domain.com` is set (starts with dot)
- [ ] Cookies are `Secure=true` in production (automatic)
- [ ] Cookies are `SameSite=lax` (allows cross-subdomain)
- [ ] CSRF token cookie is NOT `HttpOnly` (readable by JavaScript)
- [ ] `FRONTEND_ORIGIN` includes exact frontend URL (no wildcards)
- [ ] CORS allows credentials (`credentials: true`)
- [ ] Test login works from `app.domain.com`
- [ ] Test API calls work from `app.domain.com` to `api.domain.com`
- [ ] Test CSRF protection (try request without token → should fail)

---

## Browser Compatibility

### SameSite=Lax Support

- ✅ Chrome 51+
- ✅ Firefox 60+
- ✅ Safari 12+
- ✅ Edge 79+

**Note:** Older browsers may not support `SameSite=lax`. Consider `SameSite=none` with `Secure=true` if needed, but `lax` is preferred for CSRF protection.

---

**Last Updated:** 2024-12-19


