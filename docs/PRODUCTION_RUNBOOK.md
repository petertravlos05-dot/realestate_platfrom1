# Production Deployment Runbook

**Last Updated:** 2024-12-19  
**Purpose:** Step-by-step guide for deploying to production (app.domain.com + api.domain.com)

---

## Prerequisites

- Domain purchased and DNS access
- Render.com account (or hosting provider)
- AWS account (for S3, if used)
- Stripe account (if payments enabled)
- Database (PostgreSQL) provisioned
- All environment variables prepared (see `docs/ENV_REQUIRED.md`)

---

## Step 1: Domain & DNS Setup

### 1.1 Purchase Domain
- Purchase domain (e.g., `yourdomain.com`)
- Ensure DNS management access

### 1.2 DNS Records

Create the following DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `api` | `<backend-ip>` | 300 |
| A | `app` | `<frontend-ip>` | 300 |
| CNAME | `www` | `app.yourdomain.com` | 300 |

**Note:** If using Render, use Render's provided hostnames instead of IPs:
- Backend: `your-backend-service.onrender.com`
- Frontend: `your-frontend-service.onrender.com`

Then use CNAME records:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | `your-backend-service.onrender.com` | 300 |
| CNAME | `app` | `your-frontend-service.onrender.com` | 300 |

### 1.3 SSL Certificates
- Render automatically provisions SSL certificates via Let's Encrypt
- Ensure HTTPS is enforced (Render default)

---

## Step 2: Database Setup

### 2.1 Provision Database
- Create PostgreSQL database (Render PostgreSQL, AWS RDS, or other)
- Note connection string: `postgresql://user:password@host:5432/dbname`

### 2.2 Run Migrations
```bash
cd backend
npx prisma migrate deploy
```

### 2.3 Verify Schema
```bash
npx prisma db pull
npx prisma generate
```

---

## Step 3: Backend Deployment (api.domain.com)

### 3.1 Create Render Service
1. Go to Render Dashboard → New → Web Service
2. Connect GitHub repository
3. Configure:
   - **Name:** `realestate-backend` (or your name)
   - **Environment:** `Node`
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Choose appropriate plan (Free tier for testing)

### 3.2 Set Environment Variables

Add all required environment variables (see `docs/ENV_REQUIRED.md`):

**Critical:**
```
NODE_ENV=production
JWT_SECRET=<32+ character random string>
DATABASE_URL=<postgresql-connection-string>
FRONTEND_ORIGIN=https://app.yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
```

**S3 (if used):**
```
AWS_S3_BUCKET=<bucket-name>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
```

**Stripe (if used):**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Sentry (if enabled):**
```
SENTRY_ENABLE=true
SENTRY_DSN_BACKEND=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

**Real-time:**
```
REALTIME_BUS=memory
```

**Server:**
```
PORT=5000
```

### 3.3 Configure Custom Domain
1. In Render service settings → Custom Domains
2. Add: `api.yourdomain.com`
3. Render will provision SSL certificate automatically

### 3.4 Deploy
1. Click "Manual Deploy" → "Deploy latest commit"
2. Monitor build logs for errors
3. Wait for deployment to complete

### 3.5 Run Preflight Check
```bash
# SSH into Render instance or run locally with production env vars
cd backend
node scripts/preflight-production-check.js
```

### 3.6 Verify Backend
```bash
# Health check
curl https://api.yourdomain.com/health

# Should return:
# {"status":"ok","service":"backend","env":"production","time":"..."}
```

---

## Step 4: Frontend Deployment (app.domain.com)

### 4.1 Create Render Service
1. Go to Render Dashboard → New → Static Site (or Web Service for SSR)
2. Connect GitHub repository
3. Configure:
   - **Name:** `realestate-frontend`
   - **Environment:** `Node`
   - **Build Command:** `cd listings/frontend && npm install && npm run build`
   - **Publish Directory:** `listings/frontend/.next` (if static) or use Web Service for SSR
   - **Plan:** Choose appropriate plan

### 4.2 Set Environment Variables

**Critical:**
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://app.yourdomain.com
NEXTAUTH_SECRET=<random-secret>
```

**Sentry (if enabled):**
```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_DSN=https://...@sentry.io/...
```

### 4.3 Configure Custom Domain
1. In Render service settings → Custom Domains
2. Add: `app.yourdomain.com`
3. Render will provision SSL certificate automatically

### 4.4 Deploy
1. Click "Manual Deploy" → "Deploy latest commit"
2. Monitor build logs for errors
3. Wait for deployment to complete

### 4.5 Run Preflight Check
```bash
cd listings/frontend
node scripts/preflight-production-check.js
```

### 4.6 Verify Frontend
```bash
# Open in browser
https://app.yourdomain.com

# Should load homepage
```

---

## Step 5: Post-Deployment Smoke Tests

### 5.1 Backend Tests

```bash
# Health check
curl https://api.yourdomain.com/health

# CORS test (from browser console on app.yourdomain.com)
fetch('https://api.yourdomain.com/health', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

### 5.2 Frontend Tests

1. **Homepage loads:** `https://app.yourdomain.com`
2. **Login works:** Navigate to login, test authentication
3. **API calls work:** Check browser Network tab for successful API calls
4. **Cookies set:** Check DevTools → Application → Cookies for `access_token`, `csrf_token`
5. **CORS works:** No CORS errors in console

### 5.3 Deal Room Tests (if enabled)

1. Create a deal room
2. Send a message (verify real-time updates)
3. Upload a document
4. Request an appointment

### 5.4 Cookie & CSRF Verification

**Test Cookies:**
1. Login via `https://app.yourdomain.com`
2. Open DevTools → Application → Cookies
3. Verify cookies are set with:
   - `Domain=.yourdomain.com` (starts with dot)
   - `Secure=true`
   - `SameSite=Lax`
   - `access_token` has `HttpOnly=true`
   - `csrf_token` has `HttpOnly=false`

**Test CSRF:**
```javascript
// Run in browser console on app.yourdomain.com
fetch('https://api.yourdomain.com/api/user/profile', {
  credentials: 'include',
  headers: {
    'X-CSRF-Token': document.cookie.split('csrf_token=')[1]?.split(';')[0]
  }
})
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Returns user profile (200 OK)

**Test CORS:**
```bash
curl -H "Origin: https://app.yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.yourdomain.com/api/user/profile

# Should return:
# Access-Control-Allow-Origin: https://app.yourdomain.com
# Access-Control-Allow-Credentials: true
```

---

## Step 6: Monitoring Setup

### 6.1 Render Monitoring
- Enable Render monitoring/alerts
- Set up uptime monitoring
- Configure error notifications

### 6.2 Sentry (if enabled)
- Verify errors are being captured
- Set up alerts for critical errors
- Configure release tracking

### 6.3 Database Monitoring
- Monitor database connection pool
- Set up slow query alerts
- Monitor disk usage

---

## Rollback Procedure

### Backend Rollback

1. **Via Render Dashboard:**
   - Go to service → Deploys
   - Find previous successful deployment
   - Click "Rollback to this deploy"

2. **Via Git:**
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push origin main
   # Render will auto-deploy
   ```

### Frontend Rollback

Same as backend (Render dashboard or Git revert).

### Database Rollback

**⚠️ WARNING:** Database rollbacks are destructive. Only rollback migrations if absolutely necessary.

```bash
cd backend
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Common Issues & Solutions

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS errors

**Solution:**
1. Verify `FRONTEND_ORIGIN` includes exact frontend URL (no trailing slash)
2. Check that frontend URL uses HTTPS
3. Ensure no wildcards in CORS origins
4. Verify `COOKIE_DOMAIN` is set correctly

### Issue: Cookies Not Working

**Symptoms:** Authentication fails, cookies not set

**Solution:**
1. Verify `COOKIE_DOMAIN` starts with dot (`.yourdomain.com`)
2. Check that cookies are `Secure=true` (automatic in production)
3. Ensure `SameSite=lax` works for cross-subdomain
4. Check browser DevTools → Application → Cookies

### Issue: Real-time Not Working

**Symptoms:** SSE connections fail, no real-time updates

**Solution:**
1. If multiple instances: Set `REALTIME_BUS=redis` and configure Redis
2. If single instance: Ensure `REALTIME_BUS=memory` (default)
3. Check backend logs for SSE connection errors
4. Verify rate limiting allows SSE connections

### Issue: Database Connection Errors

**Symptoms:** 500 errors, database connection timeouts

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check database is accessible from Render IPs
3. Verify connection pool settings
4. Check database disk space

---

## Maintenance Windows

### Scheduled Maintenance

1. **Notify users** (if possible)
2. **Enable maintenance mode** (if implemented)
3. **Deploy updates**
4. **Run smoke tests**
5. **Disable maintenance mode**

### Zero-Downtime Deployment

- Render supports zero-downtime deployments by default
- New instances start before old ones stop
- Health checks ensure new instances are ready

---

## Security Checklist

Before going live, verify:

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is 32+ characters, random
- [ ] `ENABLE_ADMIN_HEALTH=false` (or not set)
- [ ] `DISABLE_EXPORT_RATE_LIMIT` is NOT set
- [ ] CORS origins are exact (no wildcards)
- [ ] All URLs use HTTPS
- [ ] Cookies are Secure in production
- [ ] Database credentials are secure
- [ ] S3 bucket has Block Public Access enabled
- [ ] Stripe keys are production keys (not test)
- [ ] Sentry scrubbing is enabled
- [ ] Rate limiting is enabled

---

## Post-Launch Tasks

1. **Monitor logs** for errors
2. **Check Sentry** for exceptions
3. **Verify monitoring** alerts are working
4. **Test critical paths** (login, payments, etc.)
5. **Document** any issues encountered
6. **Update** runbook with lessons learned

---

**Last Updated:** 2024-12-19

