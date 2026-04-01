# Record of Processing Activities (ROPA-lite)

**Last Updated:** 2025-01-XX  
**Purpose:** Simplified Record of Processing Activities per GDPR Article 30

---

## Overview

This document records all processing activities involving personal data, organized by activity type.

**Data Controller:** [TO BE FILLED]  
**Data Protection Officer:** [TO BE FILLED]

---

## 1. User Registration & Account Management

### Activity: User Registration
- **Data Processed:** Name, email, password, phone, role, company information (if applicable)
- **Purpose:** Create user account, enable platform access
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** All users (buyers, sellers, agents, admins)
- **Recipients:** Internal systems, email service provider (verification emails)
- **Retention:** Until account deletion + [TO BE DETERMINED] grace period
- **Location:** `backend/src/routes/auth.ts:15-160`
- **Database:** `users` table

### Activity: User Login & Authentication
- **Data Processed:** Email, password (hashed), IP address, user agent, session tokens
- **Purpose:** User authentication, session management, security monitoring
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (security)]
- **Data Subjects:** All authenticated users
- **Recipients:** Internal systems, audit logs
- **Retention:** Session tokens: 7 days, Audit logs: [TO BE DETERMINED]
- **Location:** `backend/src/routes/auth.ts:171-260`, `backend/src/middleware/auth.ts`
- **Database:** `sessions` table, audit logs

### Activity: Profile Management
- **Data Processed:** Name, email, phone, company information, profile image
- **Purpose:** User profile updates, account management
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** All users
- **Recipients:** Internal systems
- **Retention:** Until account deletion
- **Location:** `backend/src/routes/user.ts`, `backend/src/routes/auth.ts:263-320`
- **Database:** `users` table

### Activity: Role Changes
- **Data Processed:** User ID, old role, new role, IP address
- **Purpose:** Access control, platform functionality assignment
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Users with role changes
- **Recipients:** Internal systems, audit logs
- **Retention:** Until account deletion + audit retention period
- **Location:** `backend/src/routes/auth.ts:263-320`
- **Database:** `users` table, audit logs

---

## 2. Property Listing Management

### Activity: Property Creation
- **Data Processed:** Property details (address, coordinates, price, images), owner user ID, lawyer information
- **Purpose:** Property listing publication, transaction facilitation
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Property owners (sellers), lawyers
- **Recipients:** Internal systems, public property listings, AWS S3 (images/documents)
- **Retention:** Until property sold/removed + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/properties.ts:100-300`
- **Database:** `properties` table, AWS S3

### Activity: Property Updates
- **Data Processed:** Property details, owner user ID, IP address
- **Purpose:** Property information updates, listing maintenance
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Property owners
- **Recipients:** Internal systems, public property listings, audit logs
- **Retention:** Same as property creation
- **Location:** `backend/src/routes/properties.ts:400-600`
- **Database:** `properties` table, audit logs

### Activity: Property Document Upload
- **Data Processed:** Legal documents (title deeds, permits, certificates), property ID, uploader user ID
- **Purpose:** Property verification, legal compliance
- **Legal Basis:** [TO BE DETERMINED - Likely: Legal obligation (verification), Contract]
- **Data Subjects:** Property owners, lawyers
- **Recipients:** Internal systems, AWS S3, admin reviewers
- **Retention:** Until property sold/removed + [TO BE DETERMINED] legal retention period
- **Location:** `backend/src/routes/properties.ts:940-990`
- **Database:** `property_documents` table, AWS S3

### Activity: Property Viewing
- **Data Processed:** Property ID, viewer user ID, timestamp, IP address (optional)
- **Purpose:** Analytics, user interest tracking, platform optimization
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (analytics)]
- **Data Subjects:** Property viewers (buyers)
- **Recipients:** Internal systems, analytics
- **Retention:** [TO BE DETERMINED - e.g., 2 years]
- **Location:** `backend/src/routes/properties.ts` (implicit tracking)
- **Database:** `property_views` table

---

## 3. Transaction Processing

### Activity: Lead Creation (Interest Expression)
- **Data Processed:** Buyer user ID, property ID, agent ID (optional), notes
- **Purpose:** Buyer interest tracking, agent-buyer matching
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Buyers, agents, property owners
- **Recipients:** Internal systems, property owners, agents
- **Retention:** Until transaction completed/cancelled + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/buyer.ts`, `backend/src/routes/seller.ts`
- **Database:** `property_leads` table

### Activity: Transaction Management
- **Data Processed:** Buyer ID, seller ID, agent ID, property ID, transaction status, stage, notes
- **Purpose:** Transaction facilitation, payment coordination, legal compliance
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service), Legal obligation]
- **Data Subjects:** Buyers, sellers, agents
- **Recipients:** Internal systems, Stripe (payments), audit logs
- **Retention:** Until transaction completion + [TO BE DETERMINED] legal retention (e.g., 7 years)
- **Location:** `backend/src/routes/transactions.ts`
- **Database:** `transactions` table, `transaction_progress` table

### Activity: Transaction Progress Updates
- **Data Processed:** Transaction ID, stage, notes, creator user ID, timestamps
- **Purpose:** Transaction status tracking, audit trail
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Transaction participants
- **Recipients:** Internal systems, transaction participants
- **Retention:** Same as transaction data
- **Location:** `backend/src/routes/transactions.ts`
- **Database:** `transaction_progress` table

---

## 4. Communication & Messaging

### Activity: Property Inquiries
- **Data Processed:** Message content, sender user ID, property ID, timestamps
- **Purpose:** Buyer-seller communication, inquiry handling
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Buyers, sellers
- **Recipients:** Internal systems, message recipients
- **Retention:** Until property sold/removed + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/properties.ts`
- **Database:** `inquiries` table, `messages` table

### Activity: Support Ticket Creation
- **Data Processed:** Ticket title, description, category, user ID, property ID (optional), transaction ID (optional)
- **Purpose:** Customer support, issue resolution
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service), Legitimate Interest]
- **Data Subjects:** Users requesting support
- **Recipients:** Internal systems, support staff
- **Retention:** Until ticket resolution + [TO BE DETERMINED] retention period (e.g., 2 years)
- **Location:** `backend/src/routes/support.ts`
- **Database:** `support_tickets` table, `support_messages` table

### Activity: Support Message Exchange
- **Data Processed:** Message content, sender user ID, ticket ID, admin flag, metadata
- **Purpose:** Support communication, issue resolution
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Users, support staff
- **Recipients:** Internal systems, support staff, users
- **Retention:** Same as support tickets
- **Location:** `backend/src/routes/support.ts`
- **Database:** `support_messages` table

---

## 5. Viewing & Appointment Scheduling

### Activity: Viewing Request Creation
- **Data Processed:** Property ID, buyer ID, agent ID (optional), date, time, status
- **Purpose:** Property viewing scheduling, appointment management
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Buyers, agents, property owners
- **Recipients:** Internal systems, property owners, agents, buyers
- **Retention:** Until viewing completed/cancelled + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/viewing-requests.ts`
- **Database:** `viewing_requests` table

### Activity: Property Availability Management
- **Data Processed:** Property ID, dates, times, availability status
- **Purpose:** Viewing schedule management, calendar coordination
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Property owners
- **Recipients:** Internal systems, buyers, agents
- **Retention:** Until property sold/removed
- **Location:** `backend/src/routes/properties.ts`
- **Database:** `property_availability` table

---

## 6. Payment & Subscription Processing

### Activity: Subscription Plan Selection
- **Data Processed:** User ID, plan ID, billing cycle
- **Purpose:** Subscription management, payment processing initiation
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Subscribing users
- **Recipients:** Internal systems, Stripe
- **Retention:** Until subscription cancellation + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/stripe.ts:18-94`
- **Database:** `subscriptions` table, Stripe

### Activity: Payment Processing (Stripe)
- **Data Processed:** User email, user ID, plan ID, billing cycle, Stripe customer ID, subscription ID
- **Purpose:** Payment collection, subscription activation
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service), Legal obligation]
- **Data Subjects:** Paying users
- **Recipients:** Stripe (primary), internal systems
- **Retention:** Until subscription cancellation + [TO BE DETERMINED] legal retention (e.g., 7 years)
- **Location:** `backend/src/routes/stripe.ts:99-350`
- **Database:** `subscriptions` table, `webhook_events` table, Stripe

### Activity: Webhook Event Processing
- **Data Processed:** Stripe event ID, event type, user ID, subscription data, IP address
- **Purpose:** Payment status synchronization, subscription management
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Subscribing users
- **Recipients:** Internal systems, audit logs
- **Retention:** [TO BE DETERMINED - e.g., 1 year]
- **Location:** `backend/src/routes/stripe.ts:99-350`, `backend/src/lib/utils/webhook-security.ts`
- **Database:** `webhook_events` table, audit logs

---

## 7. Analytics & Behavioral Tracking

### Activity: Property View Tracking
- **Data Processed:** Property ID, viewer user ID, timestamp
- **Purpose:** Analytics, interest tracking, platform optimization
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (analytics)]
- **Data Subjects:** Property viewers
- **Recipients:** Internal systems, analytics
- **Retention:** [TO BE DETERMINED - e.g., 2 years]
- **Location:** `backend/src/routes/properties.ts` (implicit)
- **Database:** `property_views` table

### Activity: Favorite Property Management
- **Data Processed:** User ID, property ID, timestamp
- **Purpose:** User preference storage, bookmarking
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Users creating favorites
- **Recipients:** Internal systems
- **Retention:** Until user removes favorite or account deletion
- **Location:** `backend/src/routes/favorites.ts`
- **Database:** `favorites` table

### Activity: Referral Program
- **Data Processed:** Referrer user ID, referred user ID, referral code, points, property data (area, location)
- **Purpose:** Referral program management, reward calculation, marketing
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service), Consent]
- **Data Subjects:** Referrers, referred users
- **Recipients:** Internal systems
- **Retention:** Until program end or user opt-out + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/referrals.ts`
- **Database:** `referrals` table, `referral_points` table

---

## 8. Security & Audit Logging

### Activity: Login Attempt Logging
- **Data Processed:** Email (sanitized), IP address, user agent, success/failure status, timestamp
- **Purpose:** Security monitoring, fraud prevention, incident investigation
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (security), Legal obligation]
- **Data Subjects:** All users attempting login
- **Recipients:** Internal systems, security team
- **Retention:** [TO BE DETERMINED - e.g., 90 days for failures, 1 year for successes]
- **Location:** `backend/src/routes/auth.ts:171-260`, `backend/src/lib/utils/audit-logger.ts`
- **Storage:** Console logs (structured JSON)

### Activity: Rate Limiting & Abuse Prevention
- **Data Processed:** IP address, user ID (optional), endpoint, request count, timestamp
- **Purpose:** Abuse prevention, DDoS protection, API security
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (security)]
- **Data Subjects:** All API users
- **Recipients:** Internal systems (Redis or in-memory), audit logs
- **Retention:** Rate limit counters: per window (15min-1h), Violation logs: [TO BE DETERMINED - e.g., 30 days]
- **Location:** `backend/src/middleware/rateLimit.ts`
- **Storage:** Redis (if configured) or in-memory, audit logs

### Activity: Authorization Failure Logging
- **Data Processed:** User ID, resource type, resource ID, IP address, action attempted, timestamp
- **Purpose:** Security monitoring, access control audit
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (security)]
- **Data Subjects:** Users attempting unauthorized access
- **Recipients:** Internal systems, security team
- **Retention:** [TO BE DETERMINED - e.g., 1 year]
- **Location:** `backend/src/middleware/authorization.ts`, `backend/src/lib/utils/audit-logger.ts`
- **Storage:** Console logs (structured JSON)

### Activity: General Audit Logging
- **Data Processed:** User ID, action, resource type, resource ID, IP address, user agent, timestamp, status
- **Purpose:** Compliance auditing, incident investigation, accountability
- **Legal Basis:** [TO BE DETERMINED - Likely: Legal obligation (compliance), Legitimate Interest]
- **Data Subjects:** All users performing actions
- **Recipients:** Internal systems, compliance team
- **Retention:** [TO BE DETERMINED - e.g., 1 year for security events, 6 months for general operations]
- **Location:** `backend/src/lib/utils/audit-logger.ts`
- **Storage:** Console logs (structured JSON)

---

## 9. Buyer-Agent Matching

### Activity: Buyer-Agent Connection Request
- **Data Processed:** Buyer ID, agent ID, property ID, OTP code, OTP expiration, status
- **Purpose:** Buyer-agent matching, connection verification
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service)]
- **Data Subjects:** Buyers, agents
- **Recipients:** Internal systems, buyers, agents
- **Retention:** Until connection confirmed/cancelled + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/buyer-agent.ts`
- **Database:** `buyer_agent_connections` table

### Activity: OTP Verification
- **Data Processed:** OTP code, buyer ID, agent ID, property ID, verification status
- **Purpose:** Connection verification, security
- **Legal Basis:** [TO BE DETERMINED - Likely: Legitimate Interest (security)]
- **Data Subjects:** Buyers, agents
- **Recipients:** Internal systems
- **Retention:** OTP codes: Until expiration (15 minutes), Connection data: Until connection ends
- **Location:** `backend/src/routes/buyer-agent.ts`
- **Database:** `buyer_agent_connections` table

---

## 10. Notification Management

### Activity: Notification Creation
- **Data Processed:** User ID, title, message, type, property ID (optional), metadata
- **Purpose:** User communication, platform updates, transaction notifications
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (Terms of Service), Legitimate Interest]
- **Data Subjects:** Notification recipients
- **Recipients:** Internal systems, users
- **Retention:** Unread: Until read or account deletion, Read: [TO BE DETERMINED - e.g., 90 days]
- **Location:** `backend/src/routes/notifications.ts`
- **Database:** `notifications` table

---

## 11. Deal Room Communications & Documents (NEW - Phase 4)

### Activity: Deal Room Creation
- **Data Processed:** Property ID, buyer ID, seller ID, agent ID (if applicable), deal status
- **Purpose:** Facilitate property transaction communications and document management
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (transaction facilitation)]
- **Data Subjects:** Buyers, sellers, agents, lawyers, notaries
- **Recipients:** Deal participants, internal systems
- **Retention:** Until deal completion + [TO BE DETERMINED] retention period (legal/transaction records)
- **Location:** `backend/src/routes/deals.ts`
- **Database:** `deal_rooms`, `deal_participants` tables

### Activity: Deal Chat Messages
- **Data Processed:** Message body, sender ID, thread ID, timestamp
- **Purpose:** Transaction-related communications between participants
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (transaction facilitation)]
- **Data Subjects:** Deal participants (buyers, sellers, agents, lawyers, notaries)
- **Recipients:** Thread members only, internal systems
- **Retention:** Until deal completion + [TO BE DETERMINED] retention period (legal records)
- **Location:** `backend/src/routes/deal-chat.ts`
- **Database:** `deal_threads`, `deal_messages`, `deal_thread_members` tables

### Activity: Deal Document Management
- **Data Processed:** Document metadata (category, status, fileName, mimeType, sizeBytes), uploader ID, reviewer ID, review notes, S3 key (stored but never exposed)
- **Purpose:** Legal document exchange and review for property transactions
- **Legal Basis:** [TO BE DETERMINED - Likely: Legal obligation (transaction documentation), Contract]
- **Data Subjects:** Deal participants, document uploaders/reviewers
- **Recipients:** Authorized deal participants only (role-based visibility), AWS S3
- **Retention:** Until deal completion + [TO BE DETERMINED] legal retention period
- **Location:** `backend/src/routes/deal-documents.ts`
- **Database:** `deal_documents` table, AWS S3
- **Privacy:** S3 keys never exposed in API responses, only signed URLs with authorization checks

### Activity: Deal Appointments
- **Data Processed:** Appointment dates/times, professional ID, buyer ID, location, meeting link, notes
- **Purpose:** Schedule meetings between buyers and professionals (lawyers/notaries)
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (transaction facilitation)]
- **Data Subjects:** Buyers, lawyers, notaries
- **Recipients:** Appointment participants, internal systems
- **Retention:** Until deal completion + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/deal-appointments.ts`
- **Database:** `deal_appointments` table

### Activity: Professional Requests
- **Data Processed:** Requester ID, professional ID, request type (LAWYER/NOTARY), status, response timestamp
- **Purpose:** Match buyers with legal professionals for transaction support
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (transaction facilitation)]
- **Data Subjects:** Buyers, lawyers, notaries
- **Recipients:** Requested professional, requester, internal systems
- **Retention:** Until deal completion + [TO BE DETERMINED] retention period
- **Location:** `backend/src/routes/deals.ts`
- **Database:** `professional_requests` table

### Activity: Real-time Updates (SSE)
- **Data Processed:** Event metadata (event type, deal ID, thread ID, doc ID, appointment ID, actor user ID, timestamps)
- **Purpose:** Real-time notifications for deal room activities (messages, documents, appointments)
- **Legal Basis:** [TO BE DETERMINED - Likely: Contract (transaction facilitation)]
- **Data Subjects:** Deal participants
- **Recipients:** Authorized deal participants only (via SSE streams with JWT auth)
- **Retention:** Events are ephemeral (in-memory buffer, last 200 events per deal)
- **Location:** `backend/src/routes/deal-events.ts`, `backend/src/services/realtime/eventBus.ts`
- **Database:** None (in-memory EventEmitter, future: Redis Pub/Sub)
- **Privacy:** No s3Key, no signed URLs, minimal metadata only

---

## Summary Table

| Activity | Primary Data | Purpose | Legal Basis Status | Retention Status |
|----------|-------------|---------|-------------------|------------------|
| User Registration | Name, email, password, phone | Account creation | [TO BE DETERMINED] | [TO BE DETERMINED] |
| User Login | Email, password, IP, session | Authentication | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Property Creation | Address, coordinates, owner ID | Listing publication | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Transaction Processing | Buyer/seller/agent IDs | Transaction facilitation | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Payment Processing | User ID, Stripe IDs | Payment collection | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Communication | Message content, user IDs | User communication | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Viewing Scheduling | Dates, user IDs | Appointment management | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Audit Logging | IP, user IDs, actions | Security, compliance | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Analytics | View data, favorites | Platform optimization | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Referrals | Referrer/referred IDs | Marketing program | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Deal Room Communications | Message content, participant IDs | Transaction facilitation | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Deal Documents | Document metadata, uploader/reviewer IDs | Legal documentation | [TO BE DETERMINED] | [TO BE DETERMINED] |
| Deal Appointments | Dates, professional/buyer IDs | Meeting scheduling | [TO BE DETERMINED] | [TO BE DETERMINED] |

---

## Next Steps

1. **Legal Review:** Determine legal basis for each activity
2. **Retention Policies:** Define retention periods per activity
3. **Data Minimization:** Review necessity of each data field
4. **Consent Management:** Implement consent tracking where required
5. **DPIA:** Conduct Data Protection Impact Assessment for high-risk activities

---

**Document Status:** ✅ Initial ROPA Complete - Requires Legal Review




