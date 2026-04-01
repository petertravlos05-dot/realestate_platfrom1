# Sentry Alert Configuration

This document describes the alert rules configured in Sentry for GDPR/DSAR failures and S3 deletion failures.

## Overview

Alerts are configured to notify on critical operational failures:
1. **DSAR failures** - GDPR data export/delete/consent errors
2. **S3 deletion failures** - File deletion worker failures

All alerts are **low-noise** and **actionable** - they trigger only on actual failures, not warnings.

## Alert 1: DSAR Failures

### Purpose
Alert when GDPR data subject access requests (DSAR) fail:
- Data export failures
- Account deletion failures
- Consent recording failures

### Configuration

**Filter:**
```
tags.gdpr = dsar AND (tags.gdpr_event = export_failed OR tags.gdpr_event = delete_failed OR tags.gdpr_event = consent_failed)
```

**Trigger:**
- **On every new issue** (immediate notification)
- **OR** when event count >= 1 in 5 minutes (rate limit protection)

**Actions:**
- Email notification to ops team
- Slack webhook (optional)
- PagerDuty integration (optional, for production)

### Setup Steps

1. Go to Sentry Dashboard → Alerts → Create Alert Rule
2. Set name: "DSAR Failures"
3. Set conditions:
   - **If**: An issue is created
   - **AND**: The issue matches: `tags.gdpr:dsar AND (tags.gdpr_event:export_failed OR tags.gdpr_event:delete_failed OR tags.gdpr_event:consent_failed)`
4. Set actions:
   - Send email to: `ops@yourdomain.com`
   - Send Slack notification (if configured)
5. Save alert rule

### Alternative: Event-Based Alert

If you prefer event-based alerts (not issue-based):

**Filter:**
```
tags.gdpr = dsar AND (tags.gdpr_event = export_failed OR tags.gdpr_event = delete_failed OR tags.gdpr_event = consent_failed)
```

**Trigger:**
- Event count >= 1 in 5 minutes

**Actions:**
- Email notification
- Slack webhook

## Alert 2: S3 Deletion Failures

### Purpose
Alert when S3 file deletion jobs fail after max attempts.

### Configuration

**Filter:**
```
tags.job = s3_deletion AND tags.s3_delete = failed
```

**Trigger:**
- Event count >= 1 in 10 minutes (allows batching)

**Actions:**
- Email notification to ops team
- Slack webhook (optional)

### Setup Steps

1. Go to Sentry Dashboard → Alerts → Create Alert Rule
2. Set name: "S3 Deletion Failures"
3. Set conditions:
   - **If**: Event count >= 1 in 10 minutes
   - **AND**: The event matches: `tags.job:s3_deletion AND tags.s3_delete:failed`
4. Set actions:
   - Send email to: `ops@yourdomain.com`
   - Send Slack notification (if configured)
5. Save alert rule

## Alert 3: High Error Rate (Optional)

### Purpose
Alert when error rate exceeds threshold (general health check).

### Configuration

**Filter:**
```
(No filter - all errors)
```

**Trigger:**
- Event count >= 50 in 5 minutes (adjust based on traffic)

**Actions:**
- Email notification
- PagerDuty escalation (for production)

**Note:** This alert can be noisy. Consider disabling in favor of targeted alerts.

## Disabling Default "All New Issues" Alert

Sentry creates a default "All New Issues" alert by default. For production, this can be noisy.

**To disable:**
1. Go to Sentry Dashboard → Alerts
2. Find "All New Issues" alert
3. Edit → Disable or Delete

**Alternative:** Keep it but set a higher threshold (e.g., only alert on errors with `level:error`).

## Slack Integration

### Setup

1. Go to Sentry Dashboard → Settings → Integrations → Slack
2. Connect Slack workspace
3. Select channel (e.g., `#alerts`)
4. Configure notification preferences

### Webhook URL Format

```
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Add to alert actions → "Send Slack notification" → Enter webhook URL.

## Email Notifications

### Setup

1. Go to Sentry Dashboard → Settings → Notifications
2. Add email addresses for alerts
3. Configure notification preferences

### Recommended Recipients

- **DSAR Failures**: `ops@yourdomain.com`, `gdpr@yourdomain.com`
- **S3 Deletion Failures**: `ops@yourdomain.com`, `devops@yourdomain.com`
- **High Error Rate**: `ops@yourdomain.com`, on-call engineer

## PagerDuty Integration (Optional)

### Setup

1. Go to Sentry Dashboard → Settings → Integrations → PagerDuty
2. Connect PagerDuty account
3. Create PagerDuty service for Sentry alerts
4. Add PagerDuty action to critical alerts

**Recommended for:**
- Production DSAR failures (GDPR compliance critical)
- Production S3 deletion failures (data retention critical)

## Testing Alerts

### Test DSAR Alert

1. Trigger a DSAR export failure (staging):
   ```bash
   # Temporarily disconnect DB or cause error
   # Trigger export endpoint
   ```
2. Verify alert fires in Sentry
3. Check email/Slack notification received

### Test S3 Deletion Alert

1. Create a `FileDeletionJob` with invalid S3 key
2. Run deletion worker until max attempts reached
3. Verify alert fires in Sentry
4. Check email/Slack notification received

## Alert Tuning

### Reducing Noise

- **Increase time window**: Change "5 minutes" to "10 minutes" for less frequent alerts
- **Add filters**: Only alert on specific environments (e.g., `environment:production`)
- **Set thresholds**: Require multiple events before alerting

### Example: Production-Only Alert

**Filter:**
```
tags.gdpr = dsar AND tags.gdpr_event = export_failed AND environment = production
```

This only alerts on production DSAR failures, not staging/dev.

## Monitoring Alert Health

### Check Alert Status

1. Go to Sentry Dashboard → Alerts
2. View "Alert History" to see recent triggers
3. Check "Alert Rules" to verify configuration

### Metrics to Track

- **Alert frequency**: How often alerts fire
- **False positives**: Alerts that don't require action
- **Response time**: Time to acknowledge/resolve alerts

## Best Practices

1. **Start conservative**: Begin with high thresholds, reduce if needed
2. **Test in staging**: Verify alerts work before production
3. **Document runbooks**: Create playbooks for each alert type
4. **Review regularly**: Adjust thresholds based on actual patterns
5. **Avoid alert fatigue**: Only alert on actionable issues

## Runbook Templates

### DSAR Export Failure

1. Check Sentry event details
2. Verify database connectivity
3. Check export endpoint logs
4. Verify user account status (not deleted)
5. Retry export manually if needed
6. Escalate to GDPR team if persistent

### S3 Deletion Failure

1. Check Sentry event details (bucket, key prefix, attempts)
2. Verify S3 credentials/permissions
3. Check S3 bucket status
4. Verify file exists in S3 (may already be deleted)
5. Manually delete file if needed
6. Retry deletion job if appropriate

## References

- [Sentry Alert Rules Docs](https://docs.sentry.io/product/alerts/alert-rules/)
- [Sentry Integrations](https://docs.sentry.io/product/integrations/)




