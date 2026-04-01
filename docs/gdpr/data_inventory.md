# GDPR Data Inventory

**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive inventory of all personal data stored and processed by the platform

---

## Overview

This document catalogs all personal data categories stored in the system, their locations, purposes, legal basis, and retention periods.

**Data Controller:** [TO BE FILLED]  
**Data Protection Officer:** [TO BE FILLED]

---

## 1. User Account Data

### 1.1 Core User Information

**Data Fields:**
- `id` (CUID)
- `name` (String, required)
- `email` (String, unique, required)
- `emailVerified` (DateTime, optional)
- `password` (String, hashed with bcrypt)
- `role` (String: BUYER, SELLER, AGENT, ADMIN)
- `phone` (String, optional)
- `image` (String, optional - profile picture URL)
- `userType` (String: INDIVIDUAL, COMPANY)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `users` (Prisma model: `User`)
- **Schema File:** `backend/prisma/schema.prisma:42-97`
- **API Routes:** `backend/src/routes/auth.ts`, `backend/src/routes/user.ts`

**Purpose:**
- User authentication and authorization
- Account management
- Platform access control
- User communication

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (platform operation)

**Retention:** [TO BE DETERMINED]
- Active accounts: Until account deletion
- Inactive accounts: [TO BE DETERMINED - e.g., 3 years after last login]
- Deleted accounts: Anonymized or deleted per GDPR Article 17

---

### 1.2 Company Information (for COMPANY userType)

**Data Fields:**
- `companyName` (String, optional)
- `companyTitle` (String, optional)
- `companyTaxId` (String, optional) - **Sensitive: Tax Identification Number**
- `companyDou` (String, optional) - **Sensitive: DOU registration number**
- `companyPhone` (String, optional)
- `companyEmail` (String, optional)
- `companyHeadquarters` (String, optional) - **Sensitive: Physical address**
- `companyWebsite` (String, optional)
- `companyWorkingHours` (String, optional)
- `companyLogo` (String, optional - URL)
- `contactPersonName` (String, optional)
- `contactPersonEmail` (String, optional)
- `contactPersonPhone` (String, optional)
- `licenseNumber` (String, optional) - **Sensitive: Professional license**
- `businessAddress` (String, optional) - **Sensitive: Physical address**

**Location:**
- **Database Table:** `users` (same table as core user info)
- **Schema File:** `backend/prisma/schema.prisma:51-65`
- **API Routes:** `backend/src/routes/auth.ts:18-41` (registration)

**Purpose:**
- Business verification
- Professional licensing verification
- Company profile display
- Legal compliance (tax, licensing)

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legal obligation (tax/licensing), Contract (Terms of Service)

**Retention:** [TO BE DETERMINED]
- Same as user account data
- Tax/license data may require longer retention per local law

---

### 1.3 Authentication Tokens & Sessions

**Data Fields:**
- `sessionToken` (String, unique)
- `expires` (DateTime)
- `refresh_token` (String, optional - OAuth)
- `access_token` (String, optional - OAuth)
- `id_token` (String, optional - OAuth)

**Location:**
- **Database Tables:** `sessions`, `accounts` (NextAuth)
- **Schema File:** `backend/prisma/schema.prisma:10-40`
- **Cookies:** `access_token`, `csrf_token` (httpOnly cookies)
- **JWT Tokens:** Stored in localStorage (frontend) or cookies (backend)

**Purpose:**
- User session management
- Authentication state
- OAuth integration

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (security, platform operation)

**Retention:** [TO BE DETERMINED]
- Access tokens: 7 days (JWT expiration)
- Refresh tokens: [TO BE DETERMINED - if implemented]
- Sessions: Until expiration or logout
- Cookies: Per cookie TTL (7 days for access_token, 24h for csrf_token)

---

## 2. Property Data

### 2.1 Property Information

**Data Fields:**
- `id` (CUID)
- `title` (String)
- `shortDescription` (String, optional)
- `fullDescription` (String)
- `propertyType` (String: HOUSE, APARTMENT, etc.)
- `address` fields:
  - `state` (String)
  - `city` (String)
  - `neighborhood` (String, optional)
  - `street` (String)
  - `number` (String)
  - `postalCode` (String, optional)
- `coordinates` (JSON - lat/lng) - **Sensitive: Precise location**
- `price` (Float)
- `images` (String[] - URLs)
- `userId` (String - FK to users) - **Links to property owner**
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `properties`
- **Schema File:** `backend/prisma/schema.prisma:99-225`
- **API Routes:** `backend/src/routes/properties.ts`
- **File Storage:** AWS S3 or `public/uploads/` (local)

**Purpose:**
- Property listing display
- Property search and filtering
- Transaction facilitation
- Platform core functionality

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (platform operation)

**Retention:** [TO BE DETERMINED]
- Active listings: Until property sold or removed
- Sold properties: [TO BE DETERMINED - e.g., 7 years for tax records]
- Removed properties: [TO BE DETERMINED - e.g., 30 days grace period]

---

### 2.2 Property Owner Information (Linked)

**Data Fields:**
- Property owner's `userId` (links to `users` table)
- Owner's name, email, phone (via User relation)

**Location:**
- **Database:** Via `properties.userId` foreign key
- **Schema:** `backend/prisma/schema.prisma:205-206`

**Purpose:**
- Property ownership verification
- Contact between buyers and sellers
- Transaction processing

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (transaction facilitation)

**Retention:** Same as property data

---

### 2.3 Property Documents

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `type` (String: title, building_permit, topographic, energy_certificate, coverage_diagram)
- `fileUrl` (String - S3 URL or local path)
- `status` (String: pending, approved, rejected)
- `uploadedAt` (DateTime)
- `uploadedBy` (String - FK to users)
- `adminComment` (String, optional)

**Location:**
- **Database Table:** `property_documents`
- **Schema File:** `backend/prisma/schema.prisma:571-585`
- **File Storage:** AWS S3 (`properties/{propertyId}/{documentType}/`)
- **API Routes:** `backend/src/routes/properties.ts:940-990`

**Purpose:**
- Legal document verification
- Property authenticity verification
- Compliance with property listing requirements

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legal obligation (property verification), Contract (Terms of Service)

**Retention:** [TO BE DETERMINED]
- Active properties: Until property sold or removed
- Sold properties: [TO BE DETERMINED - e.g., 7 years for legal compliance]

---

### 2.4 Property Lawyer Information

**Data Fields:**
- `lawyerName` (String, optional)
- `lawyerEmail` (String, optional)
- `lawyerPhone` (String, optional)
- `lawyerTaxId` (String, optional) - **Sensitive: Tax ID**
- `lawyerInfo` (JSON, optional)
- `assignmentDocument` (JSON, optional)

**Location:**
- **Database Table:** `properties` (embedded fields)
- **Schema File:** `backend/prisma/schema.prisma:199-202`
- **API Routes:** `backend/src/routes/properties.ts:850-900`

**Purpose:**
- Legal representation for property transactions
- Document assignment verification

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (legal compliance)

**Retention:** Same as property data

---

## 3. Transaction & Lead Data

### 3.1 Property Leads

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `buyerId` (String - FK to users)
- `agentId` (String - FK to users, optional)
- `status` (String: PENDING, VIEWING_SCHEDULED, NEGOTIATING, CLOSED)
- `notes` (String, optional)
- `interestCancelled` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `property_leads`
- **Schema File:** `backend/prisma/schema.prisma:386-408`
- **API Routes:** `backend/src/routes/buyer.ts`, `backend/src/routes/seller.ts`

**Purpose:**
- Buyer interest tracking
- Agent-buyer connection facilitation
- Transaction initiation

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (transaction facilitation)

**Retention:** [TO BE DETERMINED]
- Active leads: Until transaction completed or cancelled
- Completed transactions: [TO BE DETERMINED - e.g., 7 years for tax/legal records]
- Cancelled leads: [TO BE DETERMINED - e.g., 1 year]

---

### 3.2 Transactions

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `buyerId` (String - FK to users)
- `agentId` (String - FK to users, optional)
- `sellerId` (String - FK to users, optional)
- `status` (String)
- `stage` (TransactionStage enum)
- `interestCancelled` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `transactions`
- **Schema File:** `backend/prisma/schema.prisma:512-541`
- **API Routes:** `backend/src/routes/transactions.ts`

**Purpose:**
- Transaction management
- Payment processing coordination
- Legal compliance

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legal obligation (tax records)

**Retention:** [TO BE DETERMINED]
- Active transactions: Until completion
- Completed transactions: [TO BE DETERMINED - e.g., 7 years for tax/legal compliance]
- Cancelled transactions: [TO BE DETERMINED - e.g., 3 years]

---

### 3.3 Transaction Progress

**Data Fields:**
- `id` (CUID)
- `transactionId` (String - FK)
- `stage` (TransactionStage enum)
- `completedAt` (DateTime, optional)
- `notes` (String, optional)
- `createdById` (String - FK to users)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `transaction_progress`
- **Schema File:** `backend/prisma/schema.prisma:495-510`
- **API Routes:** `backend/src/routes/transactions.ts`

**Purpose:**
- Transaction status tracking
- Audit trail for transaction stages

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (transaction management)

**Retention:** Same as transaction data

---

## 4. Communication Data

### 4.1 Messages

**Data Fields:**
- `id` (CUID)
- `content` (String)
- `userId` (String - FK to users)
- `propertyId` (String - FK)
- `createdAt` (DateTime)

**Location:**
- **Database Table:** `messages`
- **Schema File:** `backend/prisma/schema.prisma:258-266`
- **API Routes:** `backend/src/routes/properties.ts` (inquiries)

**Purpose:**
- User-to-user communication
- Property inquiry handling

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (communication facilitation)

**Retention:** [TO BE DETERMINED]
- Active conversations: Until property sold or removed
- Archived: [TO BE DETERMINED - e.g., 1 year after property removal]

---

### 4.2 Inquiries

**Data Fields:**
- `id` (CUID)
- `message` (String)
- `userId` (String - FK to users)
- `propertyId` (String - FK)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `inquiries`
- **Schema File:** `backend/prisma/schema.prisma:242-256`
- **API Routes:** `backend/src/routes/properties.ts`

**Purpose:**
- Property inquiry tracking
- Buyer-seller communication

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (inquiry handling)

**Retention:** Same as messages

---

### 4.3 Support Tickets & Messages

**Data Fields:**
- `id` (CUID)
- `title` (String)
- `description` (String)
- `status` (TicketStatus enum)
- `priority` (TicketPriority enum)
- `category` (TicketCategory enum)
- `selectedRole` (String, optional)
- `userId` (String - FK to users)
- `createdBy` (String - FK to users)
- `propertyId` (String - FK, optional)
- `transactionId` (String - FK, optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- Support messages: `content`, `isFromAdmin`, `metadata`

**Location:**
- **Database Tables:** `support_tickets`, `support_messages`
- **Schema File:** `backend/prisma/schema.prisma:269-340`
- **API Routes:** `backend/src/routes/support.ts`

**Purpose:**
- Customer support
- Issue resolution
- Platform improvement

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (customer support)

**Retention:** [TO BE DETERMINED]
- Active tickets: Until resolution
- Resolved tickets: [TO BE DETERMINED - e.g., 2 years]
- Closed tickets: [TO BE DETERMINED - e.g., 1 year]

---

## 5. Viewing & Appointment Data

### 5.1 Viewing Requests

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `buyerId` (String - FK to users)
- `agentId` (String - FK to users, optional)
- `date` (DateTime)
- `time` (String - HH:mm format)
- `endTime` (String - HH:mm format)
- `status` (String: PENDING, CONFIRMED, CANCELLED)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `viewing_requests`
- **Schema File:** `backend/prisma/schema.prisma:460-479`
- **API Routes:** `backend/src/routes/viewing-requests.ts`

**Purpose:**
- Property viewing scheduling
- Appointment management

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (viewing facilitation)

**Retention:** [TO BE DETERMINED]
- Upcoming viewings: Until completed or cancelled
- Past viewings: [TO BE DETERMINED - e.g., 1 year]

---

### 5.2 Property Availability

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `date` (DateTime)
- `startTime` (String - HH:mm)
- `endTime` (String - HH:mm)
- `isAvailable` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `property_availability`
- **Schema File:** `backend/prisma/schema.prisma:425-438`
- **API Routes:** `backend/src/routes/properties.ts`

**Purpose:**
- Property viewing availability management
- Calendar scheduling

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (scheduling)

**Retention:** Same as viewing requests

---

## 6. Payment & Subscription Data

### 6.1 Stripe Payment Data

**Data Fields:**
- `stripeCustomerId` (String, optional)
- `stripeSubscriptionId` (String, optional)
- `stripeEventId` (String - webhook events)
- Payment metadata (stored in Stripe, not directly in our DB)

**Location:**
- **Database Table:** `subscriptions` (Stripe IDs)
- **Database Table:** `webhook_events` (Stripe event tracking)
- **Schema File:** `backend/prisma/schema.prisma:647-666` (subscriptions), `668-682` (webhook_events)
- **External Service:** Stripe.com (primary storage)
- **API Routes:** `backend/src/routes/stripe.ts`

**Purpose:**
- Payment processing
- Subscription management
- Financial records

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legal obligation (tax records)

**Retention:** [TO BE DETERMINED]
- Active subscriptions: Until cancellation
- Payment records: [TO BE DETERMINED - e.g., 7 years for tax compliance]
- Stripe retains payment data per their policy (see Processors doc)

---

### 6.2 Subscription Plans

**Data Fields:**
- `id` (CUID)
- `name` (String)
- `description` (String, optional)
- `price` (Float)
- `maxProperties` (Int)
- `benefits` (String[])
- `stripePriceId` (String, optional)
- `stripePriceIdQuarterly` (String, optional)

**Location:**
- **Database Table:** `subscription_plans`
- **Schema File:** `backend/prisma/schema.prisma:629-645`
- **API Routes:** `backend/src/routes/subscription-plans.ts`

**Purpose:**
- Subscription plan management
- Pricing configuration

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (business operations)

**Retention:** Until plan removed (no personal data directly)

---

## 7. Behavioral & Analytics Data

### 7.1 Property Views

**Data Fields:**
- `id` (CUID)
- `propertyId` (String - FK)
- `buyerId` (String - FK to users)
- `viewedAt` (DateTime)

**Location:**
- **Database Table:** `property_views`
- **Schema File:** `backend/prisma/schema.prisma:543-553`
- **API Routes:** `backend/src/routes/properties.ts` (implicit tracking)

**Purpose:**
- Property analytics
- User interest tracking
- Platform optimization

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (analytics, platform improvement)

**Retention:** [TO BE DETERMINED]
- Active properties: Until property sold or removed
- Aggregated analytics: [TO BE DETERMINED - e.g., 2 years]

---

### 7.2 Favorites

**Data Fields:**
- `id` (CUID)
- `userId` (String - FK to users)
- `propertyId` (String - FK)
- `createdAt` (DateTime)

**Location:**
- **Database Table:** `favorites`
- **Schema File:** `backend/prisma/schema.prisma:227-240`
- **API Routes:** `backend/src/routes/favorites.ts`

**Purpose:**
- User preference storage
- Property bookmarking

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (user experience)

**Retention:** Until user removes favorite or account deletion

---

### 7.3 Referral Data

**Data Fields:**
- `id` (CUID)
- `referrerId` (String - FK to users)
- `referredId` (String - FK to users)
- `referralCode` (String, unique)
- `totalPoints` (Int)
- `propertiesAdded` (Int)
- `totalArea` (Float)
- `points` (ReferralPoints[] - detailed point history)
- `reason` (String: registration, property_added, property_sold)
- `area` (Float, optional)
- `location` (String, optional)

**Location:**
- **Database Tables:** `referrals`, `referral_points`
- **Schema File:** `backend/prisma/schema.prisma:587-626`
- **API Routes:** `backend/src/routes/referrals.ts`

**Purpose:**
- Referral program management
- Reward calculation
- Marketing analytics

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (marketing)

**Retention:** [TO BE DETERMINED]
- Active referrals: Until program ends or user opts out
- Historical data: [TO BE DETERMINED - e.g., 3 years]

---

## 8. Audit & Security Logs

### 8.1 Audit Logs

**Data Fields:**
- `timestamp` (DateTime)
- `requestId` (String)
- `eventType` (AuditEventType enum)
- `userId` (String, optional)
- `userEmail` (String, sanitized - domain only)
- `userRole` (String, optional)
- `ipAddress` (String) - **Sensitive: IP address**
- `userAgent` (String, optional)
- `action` (String)
- `resourceType` (String, optional)
- `resourceId` (String, optional)
- `status` (String: success, failure, warning)
- `details` (JSON, sanitized)
- `error` (String, optional)

**Location:**
- **Storage:** Console logs (structured JSON)
- **Implementation:** `backend/src/lib/utils/audit-logger.ts`
- **Events Logged:** Login, registration, role changes, property operations, authorization failures, rate limits, API errors

**Purpose:**
- Security monitoring
- Compliance auditing
- Incident investigation
- Fraud prevention

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (security), Legal obligation (compliance)

**Retention:** [TO BE DETERMINED]
- Security events: [TO BE DETERMINED - e.g., 1 year]
- Failed login attempts: [TO BE DETERMINED - e.g., 90 days]
- Successful operations: [TO BE DETERMINED - e.g., 6 months]

---

### 8.2 Rate Limiting Data

**Data Fields:**
- IP address (String) - **Sensitive: IP address**
- User ID (String, optional)
- Endpoint (String)
- Timestamp (DateTime)
- Request count

**Location:**
- **Storage:** Redis (if configured) or in-memory
- **Implementation:** `backend/src/middleware/rateLimit.ts`
- **Logging:** Audit logs for rate limit violations

**Purpose:**
- Abuse prevention
- DDoS protection
- API security

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (security, platform stability)

**Retention:** [TO BE DETERMINED]
- Rate limit counters: Per window duration (15 minutes - 1 hour)
- Violation logs: [TO BE DETERMINED - e.g., 30 days]

---

## 9. IP Addresses & Technical Data

### 9.1 IP Addresses

**Data Fields:**
- Client IP address (from `req.ip` or `req.socket.remoteAddress`)
- Stored in: Audit logs, rate limiting

**Location:**
- **Audit Logs:** `backend/src/lib/utils/audit-logger.ts:175`
- **Rate Limiting:** `backend/src/middleware/rateLimit.ts:92,105`
- **Webhook Logs:** `backend/src/routes/stripe.ts:101`

**Purpose:**
- Security monitoring
- Abuse prevention
- Request correlation
- Geographic analysis (if enabled)

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (security), Legal obligation (fraud prevention)

**Retention:** [TO BE DETERMINED]
- Same as audit logs
- IP addresses may be considered personal data per GDPR

---

### 9.2 User Agent & Technical Metadata

**Data Fields:**
- `userAgent` (String - browser/client information)
- Request headers (for security/CORS)
- Request ID (for correlation)

**Location:**
- **Audit Logs:** `backend/src/lib/utils/audit-logger.ts:176`
- **Request ID Middleware:** `backend/src/middleware/request-id.ts`

**Purpose:**
- Request correlation
- Security analysis
- Platform optimization

**Legal Basis:** [TO BE DETERMINED]
- Likely: Legitimate Interest (security, analytics)

**Retention:** Same as audit logs

---

## 10. Buyer-Agent Connections

### 10.1 Connection Data

**Data Fields:**
- `id` (CUID)
- `buyerId` (String - FK to users)
- `agentId` (String - FK to users)
- `propertyId` (String - FK)
- `status` (String: PENDING, CONFIRMED, etc.)
- `otpCode` (String, optional) - **Sensitive: OTP for verification**
- `otpExpires` (DateTime, optional)
- `interestCancelled` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `buyer_agent_connections`
- **Schema File:** `backend/prisma/schema.prisma:342-359`
- **API Routes:** `backend/src/routes/buyer-agent.ts`

**Purpose:**
- Buyer-agent matching
- OTP verification
- Connection management

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (matching service)

**Retention:** [TO BE DETERMINED]
- Active connections: Until transaction completed or cancelled
- OTP codes: Until expiration (15 minutes)
- Historical connections: [TO BE DETERMINED - e.g., 1 year]

---

## 11. Notifications

### 11.1 Notification Data

**Data Fields:**
- `id` (CUID)
- `userId` (String - FK to users)
- `title` (String)
- `message` (String)
- `type` (String)
- `isRead` (Boolean)
- `propertyId` (String - FK, optional)
- `propertyProgressId` (String - FK, optional)
- `metadata` (JSON, optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Location:**
- **Database Table:** `notifications`
- **Schema File:** `backend/prisma/schema.prisma:440-458`
- **API Routes:** `backend/src/routes/notifications.ts`

**Purpose:**
- User communication
- Platform updates
- Transaction notifications

**Legal Basis:** [TO BE DETERMINED]
- Likely: Contract (Terms of Service), Legitimate Interest (user communication)

**Retention:** [TO BE DETERMINED]
- Unread notifications: Until read or account deletion
- Read notifications: [TO BE DETERMINED - e.g., 90 days]

---

## Summary Table

| Data Category | Primary Location | Personal Data Types | Retention Status |
|--------------|----------------|---------------------|------------------|
| User Accounts | `users` table | Name, email, phone, password, role | [TO BE DETERMINED] |
| Company Info | `users` table | Tax ID, license, addresses | [TO BE DETERMINED] |
| Properties | `properties` table | Address, coordinates, owner ID | [TO BE DETERMINED] |
| Property Documents | `property_documents` + S3 | Legal documents, IDs | [TO BE DETERMINED] |
| Transactions | `transactions` table | Buyer/seller/agent IDs | [TO BE DETERMINED] |
| Leads | `property_leads` table | Buyer/agent IDs, notes | [TO BE DETERMINED] |
| Messages | `messages`, `inquiries` | Content, user IDs | [TO BE DETERMINED] |
| Support Tickets | `support_tickets` | Content, user IDs | [TO BE DETERMINED] |
| Viewing Requests | `viewing_requests` | Dates, user IDs | [TO BE DETERMINED] |
| Payments | Stripe + `subscriptions` | Customer IDs, subscription IDs | [TO BE DETERMINED] |
| IP Addresses | Audit logs, rate limiting | IP addresses | [TO BE DETERMINED] |
| Audit Logs | Console logs | IP, user IDs, actions | [TO BE DETERMINED] |
| Referrals | `referrals` table | Referrer/referred IDs | [TO BE DETERMINED] |
| Deal Rooms | `deal_rooms` table | Buyer/seller/agent IDs, property ID | Preserved (anonymized) |
| Deal Participants | `deal_participants` table | User IDs, roles | Preserved (anonymized) |
| Deal Threads | `deal_threads` table | Deal room ID, type | Preserved |
| Deal Messages | `deal_messages` table | Sender ID, body, thread ID | Preserved (sender anonymized) |
| Deal Documents | `deal_documents` table | Uploader ID, reviewer ID, s3Key | Preserved (uploader anonymized), S3 files deleted |
| Deal Appointments | `deal_appointments` table | Booker ID, professional ID, dates | Preserved (booker anonymized) |
| Professional Requests | `professional_requests` table | Requester ID, professional ID, status | Preserved (requester anonymized) |

---

## 10. GDPR Export - Excluded Fields

When users request a data export via `POST /api/user/export`, certain sensitive fields are **excluded** for security and privacy reasons:

### 10.1 Authentication & Security Data (NEVER EXPORTED)
- **Password hashes** (`users.password`) - Never exported
- **JWT tokens** - Never exported
- **Refresh tokens** (`accounts.refresh_token`) - Never exported
- **Access tokens** (`accounts.access_token`) - Never exported
- **ID tokens** (`accounts.id_token`) - Never exported
- **Session tokens** (`sessions.sessionToken`) - Never exported
- **CSRF tokens** - Never exported
- **Authorization headers** - Never exported

### 10.2 Privacy-Sensitive Fields (EXCLUDED FROM EXPORT)
- **IP addresses** from consent records (`user_consents.ip`) - Excluded
- **User agents** from consent records (`user_consents.userAgent`) - Excluded
- **IP addresses** from audit logs - Excluded (only event type + timestamp exported)
- **Metadata** from audit logs - Excluded

### 10.3 Payment Data (LIMITED EXPORT)
- **Stripe Customer ID** (`subscriptions.stripeCustomerId`) - ✅ Exported (reference only)
- **Stripe Subscription ID** (`subscriptions.stripeSubscriptionId`) - ✅ Exported (reference only)
- **Card numbers** - ❌ Never stored or exported
- **Card CVV** - ❌ Never stored or exported
- **Card expiry dates** - ❌ Never stored or exported
- **Bank account details** - ❌ Never stored or exported

### 10.4 Data Collection Limits
- **Messages**: Capped at 1000 most recent messages
- **Deal Messages**: Capped at 1000 most recent messages (paginated)
- **Audit Events**: Capped at 500 most recent events (event type + timestamp only)
- **Notifications**: Capped at 500 most recent notifications

### 10.5 Deal Room Data Privacy (NEW - Phase 4)
- **Third-Party PII Exclusion:** Other users' emails/phones are NOT exported
- **Participants Summary:** Only includes userId, role, and displayName (only for professionals - public info)
- **No S3 Keys:** Deal documents export includes metadata only, never s3Key
- **No Signed URLs:** Signed URLs are never included in export
- **Minimal Metadata:** Only necessary fields for user's rights (IDs, timestamps, status)

### 10.5 Export Implementation
- **Code Reference:** `backend/src/lib/utils/export-helpers.ts`
- **Endpoint:** `POST /api/user/export`
- **Rate Limit:** 2 exports per hour per user
- **Format:** JSON file (`gdpr-export-<userId>-<date>.json`)

---

## Next Steps

1. **Legal Review:** Determine legal basis for each data category
2. **Retention Policies:** Define retention periods per data category
3. **Data Minimization:** Review if all fields are necessary
4. **Anonymization:** Define anonymization procedures for deleted accounts
5. **Data Mapping:** Create visual data flow diagrams
6. **DPIA:** Conduct Data Protection Impact Assessment for high-risk processing

---

**Document Status:** ✅ Initial Inventory Complete - Requires Legal Review


