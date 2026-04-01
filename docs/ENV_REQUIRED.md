# Required Environment Variables

**Last Updated:** 2024-12-19  
**Purpose:** Complete list of required and optional environment variables for production deployment

---

## Backend (Express API) - api.domain.com

### Critical (Required)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ Yes | - | Must be `production` in production |
| `JWT_SECRET` | ✅ Yes | - | At least 32 characters, used for JWT signing |
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `FRONTEND_ORIGIN` or `FRONTEND_URL` | ✅ Yes | - | Comma-separated allowed CORS origins (e.g., `https://app.domain.com`) |
| `COOKIE_DOMAIN` | ⚠️ Recommended | - | Cookie domain for subdomain sharing (e.g., `.domain.com`) |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_ADMIN_HEALTH` | ❌ No | `false` | Set to `true` to enable admin health endpoints (disabled by default) |
| `DISABLE_EXPORT_RATE_LIMIT` | ❌ No | `false` | **MUST NOT** be set in production (disables GDPR export rate limiting) |
| `ADMIN_KEY` | ⚠️ Recommended | - | Secret key for admin registration (used in `/api/admin/register`). Should be a strong random string. |
| `NEXT_PUBLIC_ADMIN_KEY` | ❌ No | - | Alternative admin key (can be used instead of `ADMIN_KEY`). **Note:** `NEXT_PUBLIC_` prefix makes it visible to frontend - use with caution. |

### AWS S3 (if using S3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_S3_BUCKET` | ✅ Yes* | - | S3 bucket name |
| `AWS_REGION` | ✅ Yes* | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | ✅ Yes* | - | AWS access key (or use IAM role) |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes* | - | AWS secret key (or use IAM role) |

*Required if S3 is used. Can use IAM role instead of access keys (e.g., on EC2/ECS).

### Stripe (if using Stripe)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | ✅ Yes* | - | Stripe secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Recommended* | - | Stripe webhook signing secret |

*Required if Stripe payments are enabled.

### Gemini (AI Description Generator)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes* | - | Google Gemini API key for AI-generated property descriptions (`/api/generate-description`). Get one at [Google AI Studio](https://aistudio.google.com/apikey). |

*Required if the AI description generator feature is used.

### Sentry (if enabled)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_ENABLE` | ❌ No | `false` | Set to `true` to enable Sentry |
| `SENTRY_DSN_BACKEND` | ✅ Yes* | - | Sentry DSN for backend |
| `SENTRY_ENVIRONMENT` | ⚠️ Recommended* | `production` | Environment name (production/staging) |
| `SENTRY_RELEASE` | ❌ No | - | Release version (e.g., `backend@<git_sha>`) |

*Required if `SENTRY_ENABLE=true`.

### Real-time (SSE)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REALTIME_BUS` | ❌ No | `memory` | `memory` (single-instance) or `redis` (multi-instance) |
| `REDIS_URL` or `RATE_LIMIT_REDIS_URL` | ✅ Yes** | - | Redis URL (required if `REALTIME_BUS=redis`) |

**Required if `REALTIME_BUS=redis`.

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | ❌ No | `true` | Enable rate limiting |
| `RATE_LIMIT_REDIS_URL` | ❌ No | - | Redis URL for distributed rate limiting (optional, falls back to memory) |

### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | `5000` | Server port |

---

## Frontend (Next.js) - app.domain.com

### Critical (Required)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ Yes | - | Must be `production` in production |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | - | Backend API URL (e.g., `https://api.domain.com`) |
| `NEXTAUTH_URL` | ⚠️ Recommended | - | Frontend URL (e.g., `https://app.domain.com`) |
| `NEXTAUTH_SECRET` | ⚠️ Recommended | - | Secret for NextAuth session encryption |

### Sentry (if enabled)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ Yes* | - | Sentry DSN for frontend |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | ⚠️ Recommended* | `production` | Environment name |
| `SENTRY_DSN` | ✅ Yes* | - | Sentry DSN for server-side (should match client) |

*Required if Sentry is enabled.

---

## Production Configuration Example

### Backend (.env)

```bash
# Critical
NODE_ENV=production
JWT_SECRET=<32+ character random string>
DATABASE_URL=postgresql://user:password@host:5432/dbname
FRONTEND_ORIGIN=https://app.domain.com,https://staging.domain.com
COOKIE_DOMAIN=.domain.com

# S3
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# Stripe (if used)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sentry (if enabled)
SENTRY_ENABLE=true
SENTRY_DSN_BACKEND=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Real-time (single-instance)
REALTIME_BUS=memory

# Server
PORT=5000
```

### Frontend (.env)

```bash
# Critical
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.domain.com
NEXTAUTH_URL=https://app.domain.com
NEXTAUTH_SECRET=<random-secret>

# Sentry (if enabled)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_DSN=https://...@sentry.io/...
```

---

## Staging Configuration

### Differences from Production:

- `NODE_ENV=staging` (or `production` with staging URLs)
- `FRONTEND_ORIGIN` includes staging URL: `https://staging-app.domain.com`
- `SENTRY_ENVIRONMENT=staging`
- `ENABLE_ADMIN_HEALTH=true` (optional, for testing)

---

## Validation

Run preflight checks before deployment:

```bash
# Backend
cd backend
node scripts/preflight-production-check.js

# Frontend
cd listings/frontend
node scripts/preflight-production-check.js
```

---

## Security Notes

1. **Never commit `.env` files** to version control
2. **Rotate secrets** if compromised (see `docs/INCIDENT_PLAYBOOK.md`)
3. **Use strong JWT_SECRET** (32+ characters, random)
4. **Disable admin endpoints** by default (`ENABLE_ADMIN_HEALTH=false`)
5. **Never disable rate limiting** (`DISABLE_EXPORT_RATE_LIMIT` must not be set)
6. **Use HTTPS** for all production URLs
7. **Cookie domain** must start with dot (`.domain.com`) for subdomain sharing

---

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_ORIGIN` includes exact frontend URL (no trailing slash)
- Check that frontend URL uses HTTPS in production
- Ensure no wildcards (`*`) in CORS origins

### Cookie Issues
- Verify `COOKIE_DOMAIN` starts with dot (`.domain.com`)
- Check that cookies are `Secure=true` in production (automatic)
- Ensure `SameSite=lax` works for cross-subdomain requests

### Real-time Not Working
- If multiple instances: Set `REALTIME_BUS=redis` and configure Redis
- If single instance: Ensure `REALTIME_BUS=memory` (default)
- Check SSE connection logs for errors

---

**Last Updated:** 2024-12-19


