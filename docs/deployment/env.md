# Environment Variables Reference

## Backend Environment Variables

### Required in All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token signing (min 32 chars) | `your-secret-key-minimum-32-characters-long` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/dbname` |

### Required in Production

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_ORIGIN` | Comma-separated frontend URLs (HTTPS required) | `https://app.domain.com,https://staging.domain.com` |
| `FRONTEND_URL` | Alternative to FRONTEND_ORIGIN | `https://app.domain.com` |

### Optional but Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/staging) | `development` |
| `PORT` | Server port | `3001` |
| `COOKIE_DOMAIN` | Cookie domain for cross-subdomain cookies | Not set |
| `TERMS_VERSION` | Terms of Service version | `2026-01-01` |
| `PRIVACY_VERSION` | Privacy Policy version | `2026-01-01` |
| `MARKETING_VERSION` | Marketing consent version (optional) | Not set |

### Stripe (Required for Payments)

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |

### AWS S3 (Required for File Uploads)

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `...` |
| `AWS_S3_BUCKET` | S3 bucket name | `your-bucket-name` |
| `AWS_REGION` | AWS region | `us-east-1` |

### Redis (Recommended for Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `RATE_LIMIT_REDIS_URL` | Redis connection URL for distributed rate limiting | `redis://localhost:6379` |

### Sentry (Recommended for Production)

| Variable | Description | Default |
|----------|-------------|---------|
| `SENTRY_ENABLE` | Enable Sentry error tracking | `false` |
| `SENTRY_DSN_BACKEND` | Sentry DSN for backend | Not set |
| `SENTRY_ENVIRONMENT` | Environment name | `NODE_ENV` |
| `SENTRY_RELEASE` | Release version | Not set |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance tracing sample rate (0.0-1.0) | `0.05` |
| `SENTRY_PROFILES_SAMPLE_RATE` | Profiling sample rate (0.0-1.0) | `0.0` |

### Admin Endpoints

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_ADMIN_HEALTH` | Enable admin health endpoints | `false` |

### Ops Monitoring

| Variable | Description | Default |
|----------|-------------|---------|
| `OPS_MONITOR_ENABLE` | Enable ops monitoring jobs | `false` |
| `QUEUE_STUCK_QUEUED_MIN` | Minutes before queued job is stuck | `60` |
| `QUEUE_STUCK_PROCESSING_MIN` | Minutes before processing job is stuck | `30` |
| `QUEUE_FAILED_ALERT_THRESHOLD` | Failed jobs threshold for alert | `1` |
| `QUEUE_NO_PROGRESS_MIN` | Minutes without progress before alert | `30` |
| `QUEUE_ALERT_COOLDOWN_MIN` | Cooldown minutes between alerts | `60` |
| `DB_TIMEOUT_MS` | DB query timeout (ms) | `1500` |
| `DB_SLOW_THRESHOLD_MS` | DB slow query threshold (ms) | `800` |
| `DB_ALERT_COOLDOWN_MIN` | DB alert cooldown (minutes) | `30` |
| `UPTIME_ALERT_COOLDOWN_MIN` | Uptime alert cooldown (minutes) | `15` |
| `BACKEND_PUBLIC_URL` | Public backend URL for uptime ping | Not set |
| `OPS_PING_TIMEOUT_MS` | Uptime ping timeout (ms) | `3000` |

### Retention & Cleanup

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_DELETION_JOB_DELETED_RETENTION_DAYS` | Retention for deleted jobs (days) | `30` |
| `FILE_DELETION_JOB_FAILED_RETENTION_DAYS` | Retention for failed jobs (days) | `90` |
| `AUDIT_LOG_RETENTION_DAYS` | Audit log retention (days) | `180` |
| `CLEANUP_BATCH_SIZE` | Cleanup batch size | `500` |

### Export Limits

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_EXPORT_BYTES` | Maximum export size (bytes) | `2000000` |
| `MAX_EXPORT_TIME_MS` | Maximum export time (ms) | `2000` |
| `MAX_MESSAGES_EXPORT` | Maximum messages in export | `1000` |
| `MAX_AUDIT_EVENTS_EXPORT` | Maximum audit events in export | `500` |
| `MAX_TRANSACTIONS_EXPORT` | Maximum transactions in export | `500` |
| `MAX_LEADS_EXPORT` | Maximum leads in export | `500` |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_LOGIN_POINTS` | Login rate limit points | `5` |
| `RATE_LIMIT_LOGIN_DURATION` | Login rate limit duration (seconds) | `900` |
| `RATE_LIMIT_GENERAL_POINTS` | General rate limit points | `100` |
| `RATE_LIMIT_GENERAL_DURATION` | General rate limit duration (seconds) | `900` |
| `RATE_LIMIT_ADMIN_POINTS` | Admin rate limit points | `200` |
| `RATE_LIMIT_ADMIN_DURATION` | Admin rate limit duration (seconds) | `60` |

## Frontend Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `https://api.domain.com` |

### Optional - Sentry

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_ENABLE` | Enable Sentry | `false` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | Not set |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Environment name | `NODE_ENV` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Tracing sample rate | `0.05` |

### Optional - NextAuth

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | NextAuth base URL | `https://app.domain.com` |
| `NEXTAUTH_SECRET` | NextAuth secret (min 32 chars) | `your-nextauth-secret` |

### Optional - AWS S3 (if frontend uploads directly)

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket name | `your-bucket-name` |
| `AWS_ACCESS_KEY_ID` | AWS access key ID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `...` |

### Build-Time Only (Not Exposed to Client)

| Variable | Description | Example |
|----------|-------------|---------|
| `SENTRY_ORG` | Sentry organization | `your-org` |
| `SENTRY_PROJECT` | Sentry project | `your-project` |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (CI only) | `...` |

## Environment Setup

### Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   cp listings/frontend/.env.example listings/frontend/.env.local
   ```

2. Update values in `.env` files

3. Run validation:
   ```bash
   cd backend
   npm run validate-env
   ```

### Production

1. Set environment variables in hosting platform (Render.com, etc.)
2. Ensure all required variables are set
3. Validate at startup (automatic)

## Security Notes

- **Never commit `.env` files** to version control
- **Use strong secrets** (min 32 characters for JWT_SECRET)
- **Rotate secrets regularly** in production
- **Use different secrets** for each environment
- **Restrict access** to production environment variables

## Related Documentation

- [Security Baseline](../security_baseline.md) - Security requirements
- [Architecture](../ARCHITECTURE.md) - System architecture
- [Deployment Guide](../../RENDER_DEPLOY.md) - Deployment instructions


