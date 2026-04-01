# Core Security Verification - B1. Consent (GDPR)

**Date:** 2025-01-XX  
**Status:** ✅ GO

---

## B1. Consent - VERIFICATION RESULTS

### ✅ B1.1: Login Returns 428 if Consents Missing

**Status:** ✅ **PASS**

**Evidence:**

1. **Login Consent Check** (`backend/src/routes/auth.ts:234-250`):
   ```typescript
   // Check consent requirements
   const consentCheck = await checkUserConsents(user.id, ['TERMS', 'PRIVACY']);
   if (!consentCheck.hasAllConsents) {
     // User missing required consents - return 428 Precondition Required
     const currentVersions = getCurrentConsentVersions();
     const requiredLowercase = consentCheck.missingConsents.map(c => c.toLowerCase());
     return res.status(428).json({
       error: 'CONSENT_REQUIRED',
       required: requiredLowercase,
       versions: {
         terms: currentVersions.TERMS,
         privacy: currentVersions.PRIVACY,
       },
       message: 'Please accept the latest Terms of Service and Privacy Policy to continue.',
     });
   }
   ```

2. **Consent Check Function** (`backend/src/lib/utils/consent-helpers.ts:35-87`):
   ```typescript
   export async function checkUserConsents(
     userId: string,
     requiredTypes: ConsentType[] = ['TERMS', 'PRIVACY']
   ): Promise<{
     hasAllConsents: boolean;
     missingConsents: ConsentType[];
     currentVersions: ConsentVersion;
   }> {
     // Gets user's latest consent for each type
     // Compares with current required versions
     // Returns missing consents if any
   }
   ```

3. **HTTP Status Code:**
   - ✅ Returns **428 Precondition Required** (correct status code for missing prerequisites)
   - ✅ Returns before JWT token generation (login blocked)
   - ✅ Includes required consent types and current versions in response

4. **Required Consents:**
   - Only `TERMS` and `PRIVACY` are required for login
   - `MARKETING` is **NOT** required (opt-in only)

**Verification:** ✅ Login endpoint returns 428 Precondition Required if TERMS or PRIVACY consents are missing. Login is blocked until consents are accepted.

---

### ✅ B1.2: Consent History Stored with Version + Timestamp

**Status:** ✅ **PASS**

**Evidence:**

1. **Database Schema** (`backend/prisma/schema.prisma:694-707`):
   ```prisma
   model UserConsent {
     id          String      @id @default(cuid())
     userId      String
     consentType ConsentType
     version     String      // Version identifier (e.g., "2026-01-01")
     acceptedAt  DateTime    @default(now())  // ✅ Timestamp
     ip          String?     // IP address at time of consent
     userAgent   String?     // User agent at time of consent
     user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@unique([userId, consentType, version])
     @@index([userId, consentType])
     @@index([consentType, version])
     @@map("user_consents")
   }
   ```

2. **Consent Recording** (`backend/src/lib/utils/consent-helpers.ts:92-125`):
   ```typescript
   export async function recordConsent(
     userId: string,
     consentType: ConsentType,
     version: string,
     ip?: string,
     userAgent?: string
   ): Promise<void> {
     await prisma.userConsent.create({
       data: {
         userId,
         consentType,
         version,  // ✅ Version stored
         ip: ip || null,
         userAgent: userAgent || null,
         // acceptedAt is auto-set by @default(now()) ✅ Timestamp
       },
     });
   }
   ```

3. **Consent History Retrieval** (`backend/src/routes/consents.ts:271-285`):
   ```typescript
   const consents = await prisma.userConsent.findMany({
     where: { userId },
     orderBy: { acceptedAt: 'desc' },
     select: {
       id: true,
       consentType: true,
       version: true,        // ✅ Version returned
       acceptedAt: true,     // ✅ Timestamp returned
       // IP and userAgent excluded for privacy
     },
   });
   ```

4. **Version Tracking:**
   - ✅ Version stored as string (e.g., "2026-01-01")
   - ✅ Unique constraint: `@@unique([userId, consentType, version])` prevents duplicates
   - ✅ Version comparison: Compares string versions lexicographically (line 77: `userVersion < requiredVersion`)
   - ✅ Current versions from env vars: `TERMS_VERSION`, `PRIVACY_VERSION`, `MARKETING_VERSION`

5. **Timestamp Tracking:**
   - ✅ `acceptedAt` field with `@default(now())` automatically sets timestamp
   - ✅ History ordered by `acceptedAt: 'desc'` (most recent first)
   - ✅ Timestamp returned in consent history API

**Verification:** ✅ Consent history is stored with:
- ✅ Version identifier (string, e.g., "2026-01-01")
- ✅ Timestamp (`acceptedAt` with auto-default)
- ✅ Unique constraint prevents duplicate version records
- ✅ History API returns both version and timestamp

---

### ✅ B1.3: Marketing Consent Separate & Opt-In (If Exists)

**Status:** ✅ **PASS**

**Evidence:**

1. **Separate Consent Type** (`backend/prisma/schema.prisma:688-692`):
   ```prisma
   enum ConsentType {
     TERMS
     PRIVACY
     MARKETING  // ✅ Separate consent type
   }
   ```

2. **Marketing Consent Not Required for Login** (`backend/src/routes/auth.ts:235`):
   ```typescript
   // Only TERMS and PRIVACY are required
   const consentCheck = await checkUserConsents(user.id, ['TERMS', 'PRIVACY']);
   // ✅ MARKETING is NOT in the requiredTypes array
   ```

3. **Marketing Consent Optional** (`backend/src/lib/utils/consent-helpers.ts:13, 22, 27`):
   ```typescript
   export interface ConsentVersion {
     TERMS: string;
     PRIVACY: string;
     MARKETING?: string;  // ✅ Optional (not required)
   }

   const marketingVersion = process.env.MARKETING_VERSION; // Optional
   return {
     TERMS: termsVersion,
     PRIVACY: privacyVersion,
     ...(marketingVersion && { MARKETING: marketingVersion }),  // ✅ Only included if configured
   };
   ```

4. **Marketing Consent Opt-In** (`backend/src/routes/consents.ts:24, 38`):
   ```typescript
   // Consent acceptance schema allows MARKETING
   const acceptConsentsSchema = z.object({
     consents: z.array(
       z.object({
         type: z.enum(['TERMS', 'PRIVACY', 'MARKETING']),  // ✅ MARKETING can be accepted
         version: z.string().min(1),
       })
     ).min(1),
   });
   ```
   **Note:** User must explicitly include MARKETING in the consents array to accept it.

5. **Consent Check Logic** (`backend/src/lib/utils/consent-helpers.ts:69-79`):
   ```typescript
   // Check each required consent type
   for (const type of requiredTypes) {
     const requiredVersion = currentVersions[type];
     if (!requiredVersion) {
       // Version not configured, skip  ✅ MARKETING skipped if not configured
       continue;
     }
     // ...
   }
   ```
   **Impact:** If `MARKETING_VERSION` is not set, marketing consent is not checked (opt-in only).

6. **Marketing Consent Not Enforced:**
   - ✅ Not required for login (only TERMS and PRIVACY)
   - ✅ Not checked if `MARKETING_VERSION` env var not set
   - ✅ User must explicitly accept (opt-in)
   - ✅ Separate from required consents

**Verification:** ✅ Marketing consent is:
- ✅ Separate consent type (`MARKETING` enum value)
- ✅ Opt-in (not required for login)
- ✅ Optional (only checked if `MARKETING_VERSION` env var is set)
- ✅ User must explicitly accept (included in consents array)

---

## Summary

| Requirement | Status | Evidence Location |
|------------|--------|-------------------|
| Login returns 428 if consents missing | ✅ PASS | `auth.ts:234-250` (428 status code) |
| Consent history with version + timestamp | ✅ PASS | `schema.prisma:694-707` (version, acceptedAt) |
| Marketing consent separate & opt-in | ✅ PASS | `auth.ts:235` (not required), `consent-helpers.ts:13` (optional) |

---

## ✅ VERDICT: GO

**All GDPR consent requirements are met.**

- ✅ Login returns 428 Precondition Required if TERMS or PRIVACY consents are missing
- ✅ Consent history stored with version identifier and timestamp (`acceptedAt`)
- ✅ Marketing consent is separate, optional, and opt-in (not required for login)

**No blocking issues found. Platform is GDPR-compliant for consent management.**

---

## Additional Notes

### Consent Flow

1. **User Registration:**
   - User can register without consents
   - Consents can be accepted via `POST /api/user/consents/accept` or `POST /api/user/consents/accept-with-auth`

2. **User Login:**
   - If consents missing → Returns 428 with required consents
   - User must accept consents before login succeeds
   - Marketing consent NOT required

3. **Consent History:**
   - `GET /api/user/consents` returns full history with versions and timestamps
   - Shows which consents are current vs outdated
   - Privacy-friendly (IP and userAgent not returned)

4. **Version Management:**
   - Versions configured via env vars: `TERMS_VERSION`, `PRIVACY_VERSION`, `MARKETING_VERSION`
   - Version comparison is lexicographic (string comparison)
   - Users must re-accept when versions change

---

**Next Steps:**
- Ensure `TERMS_VERSION` and `PRIVACY_VERSION` are set in production
- Set `MARKETING_VERSION` only if marketing emails are sent
- Monitor consent acceptance rates
- Regular review of consent versions

---

**Full verification report:** `docs/CORE_SECURITY_B1_VERIFICATION.md`


