# Incident Response Playbook

**Last Updated:** 2024-12-19  
**Purpose:** Step-by-step response procedures for security incidents and outages

---

## Overview

This playbook provides immediate response procedures for common security incidents and outages. Follow these steps in order, and escalate if the incident is beyond the scope of this playbook.

---

## General Incident Response Steps

1. **Assess:** Determine severity and scope
2. **Contain:** Stop the attack/outage from spreading
3. **Eradicate:** Remove the threat
4. **Recover:** Restore service
5. **Document:** Record what happened and lessons learned

---

## Incident Types

### 1. S3 Data Leak Suspected

**Symptoms:**
- Unauthorized access to S3 URLs
- Reports of data exposure
- Unusual S3 access patterns

**Immediate Actions:**

1. **Disable File Download Endpoint:**
   ```bash
   # Set environment variable in Render
   DISABLE_FILE_DOWNLOADS=true
   # Redeploy backend
   ```

2. **Rotate S3 Credentials:**
   - Go to AWS IAM → Users → Your S3 User
   - Create new access key
   - Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Render
   - Delete old access key
   - Redeploy backend

3. **Audit S3 Access:**
   - Check AWS CloudTrail for unauthorized access
   - Review S3 bucket access logs
   - Identify exposed files

4. **Revoke Signed URLs:**
   - Signed URLs expire automatically (default: 1 hour)
   - If needed, rotate S3 keys to invalidate all URLs immediately

5. **Notify Affected Users:**
   - If PII exposed, notify users per GDPR requirements
   - Document incident for compliance

**Prevention:**
- Ensure S3 bucket has Block Public Access enabled
- Never expose `s3Key` in API responses
- Use signed URLs with short expiration (1 hour)
- Monitor S3 access logs regularly

---

### 2. JWT Secret Compromised

**Symptoms:**
- Unauthorized access to user accounts
- Reports of account hijacking
- Unusual authentication patterns

**Immediate Actions:**

1. **Rotate JWT Secret:**
   ```bash
   # Generate new secret (32+ characters)
   openssl rand -base64 32
   
   # Update in Render environment variables
   JWT_SECRET=<new-secret>
   # Redeploy backend
   ```

2. **Force Logout All Users:**
   ```sql
   -- Delete all sessions (forces re-login)
   DELETE FROM sessions;
   ```

3. **Revoke All Tokens:**
   - Old tokens will be invalid immediately after secret rotation
   - Users must re-login

4. **Audit Access:**
   - Check audit logs for suspicious activity
   - Review authentication logs
   - Identify compromised accounts

5. **Notify Users:**
   - Send email to all users: "Security update: Please re-login"
   - Explain that tokens were rotated for security

**Prevention:**
- Use strong JWT_SECRET (32+ characters, random)
- Rotate secrets periodically (e.g., quarterly)
- Monitor authentication failures
- Implement rate limiting on login

---

### 3. Database Compromised

**Symptoms:**
- Unauthorized data access
- Data corruption
- Unusual database queries
- Database connection errors

**Immediate Actions:**

1. **Isolate Database:**
   - Change database password immediately
   - Update `DATABASE_URL` in Render
   - Restrict database access to backend IPs only
   - Redeploy backend

2. **Assess Damage:**
   ```sql
   -- Check for unauthorized data access
   SELECT * FROM audit_logs 
   WHERE event_type LIKE '%unauthorized%' 
   ORDER BY created_at DESC 
   LIMIT 100;
   ```

3. **Restore from Backup:**
   ```bash
   # If data corruption detected
   # Restore from latest backup
   pg_restore -d database_name backup_file.dump
   ```

4. **Audit Access:**
   - Review database access logs
   - Check for SQL injection attempts
   - Identify compromised accounts

5. **Rotate Credentials:**
   - Change database user password
   - Update `DATABASE_URL` in Render
   - Redeploy backend

**Prevention:**
- Use parameterized queries (Prisma does this)
- Restrict database access to backend IPs
- Enable database audit logging
- Regular backups (daily)
- Monitor slow queries

---

### 4. Stripe Webhook Abuse

**Symptoms:**
- Unusual webhook requests
- Duplicate payments
- Webhook signature failures

**Immediate Actions:**

1. **Disable Webhook Endpoint Temporarily:**
   ```bash
   # In Stripe Dashboard → Webhooks
   # Disable webhook endpoint temporarily
   ```

2. **Rotate Webhook Secret:**
   - Go to Stripe Dashboard → Webhooks → Your endpoint
   - Reveal signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in Render
   - Redeploy backend

3. **Review Webhook Logs:**
   - Check Stripe Dashboard → Webhooks → Logs
   - Identify suspicious requests
   - Block offending IPs if needed

4. **Verify Payments:**
   - Check for duplicate charges
   - Refund unauthorized charges
   - Notify affected customers

5. **Re-enable Webhook:**
   - After secret rotation, re-enable webhook
   - Test webhook delivery

**Prevention:**
- Verify webhook signatures (already implemented)
- Rate limit webhook endpoint
- Monitor webhook logs
- Use idempotency keys for payments

---

### 5. GDPR Request Escalation

**Symptoms:**
- User requests data export/deletion
- Legal request for data
- Data breach notification required

**Immediate Actions:**

1. **Verify Request:**
   - Confirm user identity
   - Verify request is legitimate
   - Check if request is within GDPR scope

2. **Export Data (if requested):**
   ```bash
   # User can request export via API
   POST /api/user/export
   # Or manually via admin tools (if available)
   ```

3. **Delete Account (if requested):**
   ```bash
   # User can delete via API
   POST /api/user/delete
   # Or manually via admin tools
   ```

4. **Document Request:**
   - Record request in compliance log
   - Track response time (GDPR: 1 month deadline)
   - Document actions taken

5. **Notify User:**
   - Confirm data export/deletion completed
   - Provide confirmation receipt

**Legal Requirements:**
- Respond within 1 month (GDPR Article 15/17)
- Can extend to 2 months if complex (with notification)
- Provide data in machine-readable format
- Verify identity before deletion

---

### 6. Service Outage

**Symptoms:**
- 500 errors
- Service unavailable
- Database connection errors
- High error rates

**Immediate Actions:**

1. **Check Service Status:**
   ```bash
   # Health check
   curl https://api.yourdomain.com/health
   
   # Check Render dashboard for service status
   ```

2. **Check Logs:**
   - Render Dashboard → Logs
   - Check for error patterns
   - Identify root cause

3. **Scale Up (if needed):**
   - Render Dashboard → Service → Scale
   - Increase instance count temporarily
   - Monitor resource usage

4. **Rollback (if recent deploy):**
   - Render Dashboard → Deploys
   - Rollback to previous version
   - Verify service restored

5. **Database Issues:**
   - Check database connection pool
   - Verify database is accessible
   - Check database disk space
   - Restart database if needed

6. **Notify Users:**
   - Post status update
   - Set maintenance mode (if implemented)
   - Provide ETA for resolution

---

## Kill Switches

### Disable File Downloads

```bash
# Set in Render environment variables
DISABLE_FILE_DOWNLOADS=true
# Redeploy backend
```

### Rotate JWT Secret

```bash
# Generate new secret
openssl rand -base64 32

# Update in Render
JWT_SECRET=<new-secret>
# Redeploy backend
```

### Rotate S3 Credentials

```bash
# AWS IAM → Create new access key
# Update in Render
AWS_ACCESS_KEY_ID=<new-key>
AWS_SECRET_ACCESS_KEY=<new-secret>
# Redeploy backend
```

### Disable Admin Endpoints

```bash
# Ensure in Render environment variables
ENABLE_ADMIN_HEALTH=false
# Or remove variable entirely
# Redeploy backend
```

### Set Maintenance Mode

```bash
# If maintenance mode is implemented
MAINTENANCE_MODE=true
# Redeploy backend
```

---

## Escalation

### When to Escalate:

- Data breach affecting >100 users
- Financial loss (unauthorized payments)
- Legal action threatened
- Service outage >1 hour
- Unable to contain incident

### Escalation Contacts:

- **Technical Lead:** [TO BE FILLED]
- **Security Team:** [TO BE FILLED]
- **Legal/Compliance:** [TO BE FILLED]
- **Management:** [TO BE FILLED]

---

## Post-Incident

### 1. Document Incident

Create incident report:
- What happened
- When it happened
- How it was detected
- Actions taken
- Root cause
- Prevention measures

### 2. Review & Improve

- Review incident response
- Identify gaps
- Update playbook
- Improve monitoring
- Add prevention measures

### 3. Notify Stakeholders

- Internal team
- Affected users (if required)
- Legal/compliance (if required)
- Management (if severe)

---

## Prevention Checklist

Regular checks to prevent incidents:

- [ ] Review security logs weekly
- [ ] Rotate secrets quarterly
- [ ] Review access logs monthly
- [ ] Test backup restoration quarterly
- [ ] Review rate limiting effectiveness
- [ ] Audit admin endpoint access
- [ ] Monitor S3 access patterns
- [ ] Review GDPR request handling
- [ ] Test incident response procedures

---

**Last Updated:** 2024-12-19


