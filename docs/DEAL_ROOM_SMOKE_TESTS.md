# Deal Room Model - Smoke Tests

**Last Updated:** 2025-01-XX  
**Purpose:** Comprehensive smoke tests for Deal Room feature

---

## Test Environment Setup

```bash
# Set API URL
export API_URL=http://localhost:3000

# Or use .env file
API_URL=http://localhost:3000
```

---

## Test 1: IDOR/BOLA Prevention

**File:** `backend/scripts/test-dealroom-idor.js`

**Purpose:** Verify users cannot access deal rooms they're not participants in.

**Test Steps:**
1. Create User A and User B
2. User A creates deal room for Property X
3. User B attempts to access User A's deal room
4. Expected: 403 Forbidden

**Expected Result:**
- ✅ User B receives 403 error
- ✅ Audit log records authorization failure
- ✅ No deal room data leaked

---

## Test 2: Document Visibility Rules

**File:** `backend/scripts/test-doc-visibility.js`

**Purpose:** Verify document visibility rules are enforced.

**Test Steps:**
1. Create deal room with Buyer, Seller, Lawyer
2. Lawyer requests document from Buyer (visibility: BUYER + LAWYER only)
3. Seller attempts to download document
4. Expected: 403 Forbidden

**Expected Result:**
- ✅ Seller receives 403 error
- ✅ Buyer can download document
- ✅ Lawyer can download document
- ✅ Audit log records access attempts

---

## Test 3: Professional Request Flow

**File:** `backend/scripts/test-professional-request-flow.js`

**Purpose:** Verify professional request → accept → participant flow.

**Test Steps:**
1. Buyer creates deal room
2. Buyer requests Lawyer (Professional A)
3. Professional A accepts request
4. Verify:
   - Professional A added as DealParticipant (role: LAWYER)
   - Professional A added to GROUP thread
   - DIRECT thread created between Buyer and Professional A
   - DealRoom status updated to ACTIVE (if both lawyer and notary present)

**Expected Result:**
- ✅ Professional A appears in participants list
- ✅ GROUP thread includes Professional A
- ✅ DIRECT thread exists with exactly 2 members (Buyer + Professional A)
- ✅ Audit logs record all steps

---

## Test 4: Chat Rate Limiting

**File:** `backend/scripts/test-chat-rate-limit.js`

**Purpose:** Verify chat message rate limiting works.

**Test Steps:**
1. User joins deal room thread
2. Send 30 messages rapidly (within 1 minute)
3. Attempt to send 31st message
4. Expected: 429 Too Many Requests

**Expected Result:**
- ✅ First 30 messages succeed
- ✅ 31st message returns 429
- ✅ Retry-After header present
- ✅ Rate limit resets after 1 minute

---

## Test 5: Appointment Booking

**File:** `backend/scripts/test-appointment-booking.js`

**Purpose:** Verify appointment booking flow.

**Test Steps:**
1. Professional sets availability (Monday 10:00-14:00)
2. Buyer requests appointment:
   - Valid slot: Monday 11:00-12:00 ✅
   - Invalid slot: Sunday 10:00-11:00 ❌
   - Overlapping slot: Monday 13:00-15:00 ❌
3. Professional confirms valid appointment
4. Verify appointment status: CONFIRMED

**Expected Result:**
- ✅ Valid slot booking succeeds
- ✅ Invalid slot booking fails with 400
- ✅ Overlapping slot booking fails with 400
- ✅ Confirmed appointment appears in list
- ✅ Audit logs record all actions

---

## Test 6: Deal Room Creation

**Test Steps:**
1. Buyer creates deal room for Property X
2. Verify:
   - DealRoom created with status DRAFT
   - Buyer added as participant (role: BUYER)
   - Seller added as participant (role: SELLER) if property has owner
   - GROUP thread created automatically
   - All participants added to GROUP thread

**Expected Result:**
- ✅ DealRoom exists with correct participants
- ✅ GROUP thread exists with all participants
- ✅ Audit log records deal creation

---

## Test 7: Document Upload & Download

**Test Steps:**
1. Lawyer requests document from Buyer
2. Buyer uploads document
3. Verify:
   - Document status: UPLOADED
   - S3 key stored (not direct URL)
   - Buyer can request signed URL
   - Signed URL expires after 5 minutes (default)
   - Seller cannot access if visibility rules restrict

**Expected Result:**
- ✅ Document uploaded successfully
- ✅ Only S3 key stored (no direct URLs)
- ✅ Signed URL generated on request
- ✅ Signed URL expires correctly
- ✅ Visibility rules enforced

---

## Test 8: Thread Access Control

**Test Steps:**
1. Create deal room with Buyer, Seller, Lawyer
2. Create DIRECT thread between Buyer and Lawyer
3. Seller attempts to access DIRECT thread
4. Expected: 403 Forbidden

**Expected Result:**
- ✅ Seller cannot see DIRECT thread in list
- ✅ Seller cannot access DIRECT thread messages
- ✅ Buyer and Lawyer can access DIRECT thread

---

## Test 9: Professional Search & Filtering

**Test Steps:**
1. Register multiple professionals:
   - Lawyer A (Athens, verified)
   - Lawyer B (Thessaloniki, verified)
   - Lawyer C (Athens, pending)
   - Notary A (Athens, verified)
2. Search professionals:
   - Type: LAWYER, Area: Athens
   - Expected: Only Lawyer A (verified only)
3. Search professionals:
   - Type: NOTARY, Area: Athens
   - Expected: Only Notary A

**Expected Result:**
- ✅ Only verified professionals returned
- ✅ Filtering by type works
- ✅ Filtering by area works
- ✅ Pending professionals excluded

---

## Test 10: Rate Limiting - Deal Creation

**Test Steps:**
1. User creates 10 deal rooms (within 1 hour)
2. Attempt to create 11th deal room
3. Expected: 429 Too Many Requests

**Expected Result:**
- ✅ First 10 creations succeed
- ✅ 11th creation returns 429
- ✅ Rate limit resets after 1 hour

---

## Test 11: GDPR DSAR Export

**Test Steps:**
1. User participates in multiple deal rooms
2. User sends messages in threads
3. User uploads documents
4. Request DSAR export
5. Verify export includes:
   - Deal rooms where user is participant
   - Messages authored by user
   - Document metadata (not file content)
   - No other users' private messages

**Expected Result:**
- ✅ Export includes user's deal room data
- ✅ Export includes user's messages
- ✅ Export includes document metadata
- ✅ Export excludes other users' private data
- ✅ No S3 keys or signed URLs in export

---

## Test 12: Account Deletion

**Test Steps:**
1. User participates in deal rooms
2. User uploads documents
3. Delete user account
4. Verify:
   - User removed from DealParticipants (removedAt set)
   - User's messages anonymized
   - User's documents queued for S3 deletion
   - Deal rooms still exist (other participants unaffected)

**Expected Result:**
- ✅ User removed from participants
- ✅ Messages anonymized
- ✅ Documents queued for deletion
- ✅ Other participants unaffected

---

## Running All Tests

```bash
# Run all smoke tests
cd backend
node scripts/test-dealroom-idor.js
node scripts/test-doc-visibility.js
node scripts/test-professional-request-flow.js
node scripts/test-chat-rate-limit.js
node scripts/test-appointment-booking.js
```

---

## Test Checklist

- [ ] IDOR/BOLA prevention works
- [ ] Document visibility rules enforced
- [ ] Professional request flow works
- [ ] Chat rate limiting works
- [ ] Appointment booking works
- [ ] Deal room creation works
- [ ] Document upload/download works
- [ ] Thread access control works
- [ ] Professional search works
- [ ] Rate limiting works
- [ ] DSAR export includes deal room data
- [ ] Account deletion handles deal rooms

---

**End of Smoke Tests**


