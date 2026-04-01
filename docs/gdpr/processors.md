# External Data Processors

**Last Updated:** 2025-01-XX  
**Purpose:** Inventory of external processors and data processing agreements (DPA) status

---

## Overview

This document lists all external service providers (data processors) that process personal data on behalf of the platform.

**Data Controller:** [TO BE FILLED]  
**Data Protection Officer:** [TO BE FILLED]

---

## 1. Stripe (Payment Processing)

### Service Details
- **Provider:** Stripe, Inc.
- **Service Type:** Payment processing, subscription management
- **Website:** https://stripe.com
- **Location:** United States (with EU data processing capabilities)
- **GDPR Compliance:** Stripe is GDPR compliant and offers EU data processing

### Data Processed
- **Personal Data:**
  - User email addresses (for customer creation)
  - User IDs (in metadata)
  - Subscription plan IDs
  - Billing cycle preferences
  - Payment method information (handled by Stripe, not stored in our DB)
  - Payment transaction data (handled by Stripe)
  - Stripe customer IDs
  - Stripe subscription IDs

- **Sensitive Data:**
  - Payment card information (PCI DSS compliant, handled entirely by Stripe)
  - Billing addresses (if provided to Stripe)

### Processing Activities
- Payment method collection and storage
- Payment processing and authorization
- Subscription creation and management
- Invoice generation
- Payment failure handling
- Refund processing

### Data Location
- **Primary:** United States (with EU data processing option)
- **Backup:** Stripe's global infrastructure

### Data Retention
- Stripe retains payment data per their policy (typically 7+ years for tax compliance)
- Our system stores: Stripe customer IDs, subscription IDs, webhook event IDs
- **Our Retention:** Until subscription cancellation + [TO BE DETERMINED] retention period

### DPA Status
- **Status:** [TO BE VERIFIED]
- **DPA Link:** https://stripe.com/legal/dpa
- **Notes:** Stripe offers standard DPA. Verify if signed and if EU data processing is enabled.

### Implementation References
- **Code:** `backend/src/routes/stripe.ts`
- **Database:** `subscriptions` table (Stripe IDs), `webhook_events` table
- **Environment Variables:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 2. AWS S3 (File Storage)

### Service Details
- **Provider:** Amazon Web Services (AWS)
- **Service Type:** Object storage (file hosting)
- **Website:** https://aws.amazon.com/s3/
- **Location:** Configurable (EU, US, etc.)
- **GDPR Compliance:** AWS is GDPR compliant and offers EU data processing

### Data Processed
- **Personal Data:**
  - Property images (may contain property addresses/locations)
  - Property documents (legal documents, IDs, certificates)
  - User-uploaded files (property photos, documents)
  - Lawyer information documents
  - Company logos (if uploaded)

- **Sensitive Data:**
  - Legal documents (title deeds, building permits, energy certificates)
  - Property documents containing personal information
  - Tax identification documents (if uploaded)
  - License documents

### Processing Activities
- File upload and storage
- File retrieval and serving
- File deletion (on property removal or user request)
- File access control (via signed URLs if implemented)

### Data Location
- **Configurable:** Set via `AWS_REGION` environment variable
- **Recommended:** EU region (e.g., `eu-west-1`) for GDPR compliance
- **Current Config:** `backend/src/routes/properties.ts:27-30`

### Data Retention
- Files stored until property removal or user deletion request
- Deletion handled via AWS S3 API
- **Our Retention:** Same as property/document retention policy

### DPA Status
- **Status:** [TO BE VERIFIED]
- **DPA Link:** https://aws.amazon.com/compliance/gdpr-center/
- **Notes:** AWS offers standard DPA. Verify if signed and if EU region is configured.

### Implementation References
- **Code:** `backend/src/routes/properties.ts:37-100` (upload), `backend/src/lib/utils/file-validation.ts`
- **Storage Path:** `properties/{propertyId}/{documentType}/{filename}`
- **Environment Variables:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

---

## 3. Render.com (Hosting & Infrastructure)

### Service Details
- **Provider:** Render, Inc.
- **Service Type:** Cloud hosting, application deployment
- **Website:** https://render.com
- **Location:** United States (with EU options)
- **GDPR Compliance:** Render is GDPR compliant

### Data Processed
- **Personal Data:**
  - All application data (database content)
  - Application logs (including IP addresses, user agents)
  - Environment variables (including database credentials)
  - Request/response data (transient, in memory)

- **Sensitive Data:**
  - Database backups (if enabled)
  - Application logs containing personal data
  - Environment variables containing secrets

### Processing Activities
- Application hosting and execution
- Database hosting (PostgreSQL)
  - **Note:** Database may be self-hosted or managed by Render
- Log collection and storage
- Backup creation (if enabled)
- Request routing and load balancing

### Data Location
- **Primary:** United States (configurable)
- **Database:** Depends on database provider (Render PostgreSQL or external)
- **Current Config:** `render.yaml`

### Data Retention
- Application logs: Per Render's retention policy
- Database backups: If enabled, per backup retention policy
- **Our Control:** Database data retention per our policies

### DPA Status
- **Status:** [TO BE VERIFIED]
- **DPA Link:** https://render.com/legal/dpa (verify URL)
- **Notes:** Verify if DPA is signed and if EU hosting is configured.

### Implementation References
- **Config:** `render.yaml`
- **Database:** PostgreSQL (via `DATABASE_URL`)
- **Environment Variables:** All backend env vars (see `render.yaml:9-29`)

---

## 4. PostgreSQL Database (Data Storage)

### Service Details
- **Provider:** [TO BE DETERMINED - Render PostgreSQL or self-hosted]
- **Service Type:** Relational database
- **Location:** [TO BE DETERMINED]
- **GDPR Compliance:** Depends on provider

### Data Processed
- **All Personal Data:** All data categories listed in `data_inventory.md`
- **Database includes:** Users, properties, transactions, messages, etc.

### Processing Activities
- Data storage and retrieval
- Data queries and transactions
- Data backups (if enabled)
- Data replication (if configured)

### Data Location
- **Current:** [TO BE DETERMINED - check `DATABASE_URL`]
- **Recommended:** EU region for GDPR compliance

### Data Retention
- Per our retention policies (see `data_inventory.md`)
- Database backups: [TO BE DETERMINED]

### DPA Status
- **Status:** [TO BE VERIFIED]
- **Provider:** [TO BE DETERMINED]
- **Notes:** If using Render PostgreSQL, covered by Render DPA. If self-hosted, verify hosting provider DPA.

### Implementation References
- **ORM:** Prisma (`backend/prisma/schema.prisma`)
- **Connection:** `backend/src/lib/prisma.ts`
- **Environment Variable:** `DATABASE_URL`

---

## 5. Redis (Rate Limiting - Optional)

### Service Details
- **Provider:** [TO BE DETERMINED - Render Redis or external]
- **Service Type:** In-memory data store
- **Location:** [TO BE DETERMINED]
- **GDPR Compliance:** Depends on provider

### Data Processed
- **Personal Data:**
  - IP addresses (for rate limiting)
  - User IDs (for user-based rate limiting)
  - Request counts and timestamps

- **Sensitive Data:**
  - IP addresses

### Processing Activities
- Rate limit counter storage
- Request tracking
- Temporary data storage (expires per window)

### Data Location
- **Current:** [TO BE DETERMINED - check `RATE_LIMIT_REDIS_URL`]
- **Fallback:** In-memory (no external processor if Redis not configured)

### Data Retention
- Rate limit counters: Per window duration (15 minutes - 1 hour)
- Data expires automatically
- **No persistent storage**

### DPA Status
- **Status:** [TO BE VERIFIED - only if Redis is configured]
- **Provider:** [TO BE DETERMINED]
- **Notes:** If using Render Redis, covered by Render DPA. If external, verify provider DPA.

### Implementation References
- **Code:** `backend/src/middleware/rateLimit.ts:8-24`
- **Environment Variable:** `RATE_LIMIT_REDIS_URL` (optional)

---

## 6. Email Service Provider (Email Sending)

### Service Details
- **Provider:** [TO BE DETERMINED - Not explicitly found in codebase]
- **Service Type:** Email delivery service
- **Location:** [TO BE DETERMINED]
- **GDPR Compliance:** [TO BE VERIFIED]

### Data Processed
- **Personal Data:**
  - User email addresses (recipients)
  - User names (in email content)
  - Email content (notifications, verification emails)

### Processing Activities
- Email delivery
- Email verification (if implemented)
- Notification emails
- Transactional emails

### Data Location
- **Current:** [TO BE DETERMINED]
- **Common Providers:** SendGrid, Mailgun, AWS SES, etc.

### Data Retention
- Email logs: Per provider's retention policy
- **Our Control:** Email addresses stored in our database per our retention policy

### DPA Status
- **Status:** [TO BE VERIFIED]
- **Provider:** [TO BE DETERMINED]
- **Notes:** Identify email provider and verify DPA status.

### Implementation References
- **Code:** [NOT FOUND - email sending may be handled by NextAuth or external service]
- **Potential Locations:** NextAuth email configuration, external email service integration

---

## 7. NextAuth.js (Authentication - Frontend)

### Service Details
- **Provider:** NextAuth.js (open-source library)
- **Service Type:** Authentication framework
- **Location:** Runs on our infrastructure (Render/Vercel)
- **GDPR Compliance:** N/A (library, not external service)

### Data Processed
- **Personal Data:**
  - User sessions (stored in database)
  - OAuth tokens (if OAuth providers used)
  - Email addresses (for email-based auth)

### Processing Activities
- Session management
- OAuth integration (if configured)
- Email verification (if configured)

### Data Location
- **Our Infrastructure:** Database and application servers
- **OAuth Providers:** If used, data shared with OAuth providers (Google, GitHub, etc.)

### Data Retention
- Sessions: Until expiration or logout
- OAuth tokens: Per OAuth provider policy

### DPA Status
- **Status:** N/A (library, not external service)
- **OAuth Providers:** If used, verify DPA with each provider (Google, GitHub, etc.)

### Implementation References
- **Code:** `listings/frontend/src/lib/auth.ts`, `listings/frontend/src/app/api/auth/[...nextauth]/route.ts`
- **Database:** `sessions` table, `accounts` table

---

## Summary Table

| Processor | Service Type | Data Processed | DPA Status | EU Processing |
|-----------|-------------|----------------|------------|---------------|
| **Stripe** | Payment processing | Payment data, customer IDs | [TO BE VERIFIED] | Available |
| **AWS S3** | File storage | Property images, documents | [TO BE VERIFIED] | Available (EU regions) |
| **Render.com** | Hosting | All application data, logs | [TO BE VERIFIED] | Available |
| **PostgreSQL** | Database | All personal data | [TO BE VERIFIED] | Depends on provider |
| **Redis** | Rate limiting | IP addresses, user IDs | [TO BE VERIFIED] | Depends on provider |
| **Email Provider** | Email delivery | Email addresses, content | [TO BE VERIFIED] | [TO BE DETERMINED] |
| **NextAuth** | Authentication | Sessions, OAuth tokens | N/A (library) | N/A |

---

## DPA Checklist

- [ ] Stripe DPA signed and EU data processing enabled
- [ ] AWS S3 DPA signed and EU region configured
- [ ] Render.com DPA signed and EU hosting configured (if applicable)
- [ ] PostgreSQL provider DPA verified (if external provider)
- [ ] Redis provider DPA verified (if external provider)
- [ ] Email provider identified and DPA signed
- [ ] OAuth provider DPAs verified (if OAuth used)
- [ ] All DPAs stored in secure location
- [ ] DPA review schedule established (annual review)

---

## Data Transfer Safeguards

### Standard Contractual Clauses (SCCs)
- **Status:** [TO BE VERIFIED]
- **Required for:** US-based processors (Stripe, Render if US-hosted)
- **Notes:** Verify if SCCs are included in DPAs

### EU-US Data Privacy Framework
- **Status:** [TO BE VERIFIED]
- **Applicable to:** US-based processors certified under DPF
- **Notes:** Check if processors are DPF certified

### Binding Corporate Rules (BCRs)
- **Status:** [NOT APPLICABLE]
- **Notes:** Not applicable for current processors

---

## Sub-Processors

### Stripe Sub-Processors
- **List:** https://stripe.com/legal/sub-processors
- **Review:** [TO BE DONE]
- **Notification:** Stripe notifies of sub-processor changes

### AWS Sub-Processors
- **List:** https://aws.amazon.com/compliance/sub-processors/
- **Review:** [TO BE DONE]
- **Notification:** AWS notifies of sub-processor changes

### Render Sub-Processors
- **List:** [TO BE FOUND]
- **Review:** [TO BE DONE]
- **Notification:** [TO BE VERIFIED]

---

## Next Steps

1. **Identify All Processors:** Complete inventory of all external services
2. **Verify DPAs:** Sign and verify DPAs with all processors
3. **Configure EU Processing:** Enable EU data processing where available
4. **Document Sub-Processors:** Maintain list of sub-processors
5. **Review Schedule:** Establish annual DPA review process
6. **Data Transfer Safeguards:** Verify SCCs or DPF certification
7. **Email Provider:** Identify and document email service provider

---

**Document Status:** ✅ Initial Inventory Complete - Requires DPA Verification





