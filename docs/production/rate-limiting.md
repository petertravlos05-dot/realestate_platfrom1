# Rate Limiting - Production Guide

## Overview

The backend uses **distributed rate limiting** with Redis for production environments. This ensures consistent rate limiting across multiple server instances.

## Architecture

- **Redis-based**: Distributed rate limiting (production)
- **In-memory**: Fallback for development or when Redis is unavailable
- **Automatic fallback**: Gracefully falls back to in-memory if Redis fails

## Production Setup

### 1. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Redis for distributed rate limiting (REQUIRED for production)
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# For Redis with authentication:
# RATE_LIMIT_REDIS_URL=redis://username:password@host:port

# For Redis Cluster:
# RATE_LIMIT_REDIS_URL=redis://host1:6379,host2:6379,host3:6379

# Optional: Customize rate limits
RATE_LIMIT_ENABLED=true
RATE_LIMIT_LOGIN_POINTS=5
RATE_LIMIT_LOGIN_DURATION=900
RATE_LIMIT_STRICT_POINTS=3
RATE_LIMIT_STRICT_DURATION=3600
```

### 3. Install Redis Client

The Redis client is already included in `package.json`. If missing:

```bash
npm install redis
```

## Rate Limit Configuration

### Default Limits

| Endpoint Type | Points | Duration | Block Duration |
|--------------|--------|----------|----------------|
| Login | 5 | 15 min | 15 min |
| Registration/Password Reset | 3 | 1 hour | 1 hour |
| Export (initial) | 2 | 1 hour | 1 hour |
| Export (paginated) | 20 | 1 hour | 1 hour |
| General API | 100 | 15 min | - |
| High-traffic (search) | 200 | 15 min | - |

### Customizing Limits

Set environment variables:

```env
RATE_LIMIT_LOGIN_POINTS=10
RATE_LIMIT_LOGIN_DURATION=1800
RATE_LIMIT_STRICT_POINTS=5
RATE_LIMIT_STRICT_DURATION=7200
```

## Health Check

The `/health` endpoint includes rate limiting status:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-05T12:00:00.000Z",
  "rateLimiting": {
    "enabled": true,
    "redis": {
      "configured": true,
      "connected": true,
      "status": "connected"
    },
    "mode": "redis"
  }
}
```

## Monitoring

### Check Redis Connection

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis info
redis-cli info stats
```

### Monitor Rate Limit Keys

```bash
# List all rate limit keys
redis-cli KEYS "rl_*"

# Check specific user's rate limit
redis-cli GET "rl_export:user123_initial"

# Clear rate limits (development only)
redis-cli FLUSHDB
```

## Production Best Practices

### 1. Use Redis for Multiple Instances

**Required** when running multiple backend instances (load balancing, horizontal scaling).

**Why:** In-memory rate limiting is per-instance. Without Redis, rate limits won't be shared across instances.

### 2. Redis High Availability

For production, consider:
- **Redis Sentinel**: Automatic failover
- **Redis Cluster**: Distributed Redis
- **Managed Redis**: AWS ElastiCache, Redis Cloud, etc.

### 3. Connection Handling

The rate limiter automatically:
- ✅ Reconnects on connection loss
- ✅ Falls back to in-memory if Redis unavailable
- ✅ Logs connection status
- ✅ Handles errors gracefully

### 4. Monitoring

Monitor:
- Redis connection status (via `/health`)
- Rate limit violations (audit logs)
- Redis memory usage
- Connection errors

## Troubleshooting

### Redis Not Connecting

**Symptoms:**
- Logs show: "Redis connection failed, using in-memory rate limiting"
- `/health` shows `redis.connected: false`

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Verify `RATE_LIMIT_REDIS_URL` is correct
3. Check firewall/network connectivity
4. Review Redis logs: `redis-cli monitor`

### Rate Limits Not Working Across Instances

**Cause:** Using in-memory rate limiting instead of Redis

**Solution:** Set `RATE_LIMIT_REDIS_URL` in all instances

### High Memory Usage

**Cause:** Rate limit keys accumulating in Redis

**Solution:** Keys auto-expire based on `duration`. If needed, set shorter durations or use Redis TTL policies.

## Development vs Production

### Development
- ✅ In-memory rate limiting is fine
- ✅ Single instance
- ✅ No Redis required

### Production
- ⚠️ **Must use Redis** for multiple instances
- ⚠️ In-memory rate limiting won't work across instances
- ✅ Redis provides distributed rate limiting

## Security Considerations

1. **Redis Authentication**: Use password-protected Redis in production
   ```env
   RATE_LIMIT_REDIS_URL=redis://username:password@host:port
   ```

2. **Network Security**: Use private networks/VPN for Redis connections

3. **Rate Limit Bypass**: Rate limits are enforced server-side, cannot be bypassed by clients

## API Response Format

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "retryAfterSeconds": 3600,
  "message": "Rate limit exceeded. Please try again in 3600 seconds."
}
```

HTTP Headers:
- `Retry-After: 3600` (seconds until retry allowed)

## Scripts

### Clear Rate Limits

```bash
# Clear all export rate limits
npm run clear:export-rate-limit

# Clear specific user's rate limits
npm run clear:export-rate-limit <userId>
```

**Note:** Only works if Redis is configured and running.

## References

- [rate-limiter-flexible Documentation](https://github.com/animir/node-rate-limiter-flexible)
- [Redis Documentation](https://redis.io/docs/)
- [Production Deployment Guide](../deployment/production.md)




