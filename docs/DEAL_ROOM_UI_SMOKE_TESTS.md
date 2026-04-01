# Deal Room UI Smoke Tests

## Frontend Structure Map

### Existing Entry Points
- **Buyer Dashboard**: `listings/frontend/src/app/dashboard/buyer/page.tsx`
- **Seller Dashboard**: `listings/frontend/src/app/dashboard/seller/page.tsx`
- **Agent Dashboard**: `listings/frontend/src/app/dashboard/agent/page.tsx`
- **Dynamic Navbar**: `listings/frontend/src/components/navigation/DynamicNavbar.tsx`
- **API Client**: `listings/frontend/src/lib/api/client.ts` (uses `fetchFromBackend` and `apiClient`)

### Integration Points
- **Buyer Dashboard**: Add "My Deals" widget/card in properties section
- **Seller Dashboard**: Add "Deals" widget linking to `/deals`
- **Agent Dashboard**: Add "Deals" widget linking to `/deals`
- **Navbar**: Add "Deals" link for BUYER/SELLER/AGENT roles, "Professional Dashboard" for LAWYER/NOTARY

### Existing Patterns
- Uses `react-hot-toast` for notifications
- Uses `fetchFromBackend` from `@/lib/api/client` for API calls
- Uses modals for actions (PropertyDetailsModal, TransactionProgressModal pattern)
- Uses tabs for organization (properties/favorites/messages/support pattern)
- Loading states with skeleton components
- Error handling with try/catch and toast.error

---

## Test Scenarios

### 1. Buyer Flow: Create Deal → Request Lawyer → Accept → Chat → Documents → Appointment

**Steps:**
1. Login as BUYER
2. Navigate to `/deals` (via navbar or dashboard widget)
3. Click "Create Deal" or select property → "Start Deal Room"
4. Verify deal room created, redirects to `/deals/[dealId]`
5. Go to "Professionals" tab
6. Search for LAWYER (use property city/area)
7. Click "Request" on a verified lawyer
8. Verify request status shows "REQUESTED"
9. **Switch to Lawyer account** → Login as LAWYER
10. Navigate to `/professional/requests`
11. Verify request appears in list
12. Click "Accept"
13. Verify status changes to "ACCEPTED"
14. Click "Open Deal Room" → Should navigate to `/deals/[dealId]`
15. **Switch back to Buyer** → Navigate to `/deals/[dealId]`
16. Go to "Chat" tab
17. Verify GROUP thread exists with all participants
18. Click "Message privately" with lawyer → Creates DIRECT thread
19. Send message in direct thread
20. Go to "Documents" tab
21. As LAWYER: Click "Request Document" → Select category → Request from BUYER
22. As BUYER: Verify document request appears → Click "Upload" → Upload file
23. As LAWYER: Verify document uploaded → Click "Review" → Approve/Request Changes
24. Go to "Appointments" tab
25. As BUYER: Click "Request Appointment" → Select lawyer → Choose date/time
26. As LAWYER: Verify appointment request → Click "Confirm"
27. Verify appointment shows as CONFIRMED

**Expected Status Codes:**
- GET `/api/deals` → 200
- POST `/api/deals` → 200
- GET `/api/deals/:id` → 200
- POST `/api/deals/:id/requests` → 200
- GET `/api/professionals/me/requests` → 200 (lawyer)
- POST `/api/deals/:id/requests/:id/accept` → 200
- GET `/api/deals/:id/threads` → 200
- POST `/api/deals/:id/threads/direct` → 200
- POST `/api/threads/:id/messages` → 200
- POST `/api/deals/:id/documents/request` → 200
- POST `/api/deals/:id/documents/upload` → 200
- POST `/api/documents/:id/review` → 200
- GET `/api/documents/:id/download-url` → 200
- POST `/api/deals/:id/appointments/request` → 200
- POST `/api/appointments/:id/confirm` → 200

**Expected UI States:**
- Deal list shows all user's deals
- Deal room shows participants, threads, documents, appointments
- Professional requests show status badges
- Chat shows threads user is member of
- Documents show visibility labels
- Appointments show status and time

---

### 2. Seller Flow: View Deal → Group Chat → Shared Documents

**Steps:**
1. Login as SELLER
2. Navigate to `/deals` (via navbar or dashboard widget)
3. Click on a deal room (where seller is participant)
4. Verify deal room opens → Shows property summary
5. Go to "Chat" tab
6. Verify GROUP thread is visible
7. Verify DIRECT threads are NOT visible (seller should not see buyer-lawyer private threads)
8. Send message in GROUP thread
9. Go to "Documents" tab
10. Verify only documents visible to SELLER role are shown
11. Verify documents with visibility "BUYER+LAWYER+NOTARY" are NOT visible to seller
12. Verify documents with visibility "ALL_PARTICIPANTS" ARE visible

**Expected Status Codes:**
- GET `/api/deals` → 200
- GET `/api/deals/:id` → 200
- GET `/api/deals/:id/threads` → 200 (only GROUP thread)
- GET `/api/threads/:id/messages` → 200 (GROUP thread only)
- POST `/api/threads/:id/messages` → 200 (GROUP thread only)
- GET `/api/deals/:id/documents` → 200 (filtered by visibility)

**Expected UI States:**
- Seller sees GROUP thread only
- Seller sees only documents visible to SELLER role
- Seller cannot access DIRECT threads
- Seller cannot request professionals (button hidden)

---

### 3. Agent Flow: View Deal → Group Chat

**Steps:**
1. Login as AGENT
2. Navigate to `/deals` (via navbar or dashboard widget)
3. Click on a deal room (where agent is participant)
4. Verify deal room opens
5. Go to "Chat" tab
6. Verify GROUP thread is visible
7. Send message in GROUP thread
8. Verify cannot see DIRECT threads between buyer-lawyer

**Expected Status Codes:**
- GET `/api/deals` → 200
- GET `/api/deals/:id` → 200
- GET `/api/deals/:id/threads` → 200 (only GROUP thread)

**Expected UI States:**
- Agent sees GROUP thread only
- Agent cannot request professionals (button hidden)

---

### 4. Lawyer/Notary Flow: Accept Request → Request Document → Review → Confirm Appointment

**Steps:**
1. Login as LAWYER
2. Navigate to `/professional/requests`
3. Verify incoming requests list shows
4. Click "Accept" on a request
5. Verify redirects to deal room or shows "Open Deal Room" button
6. Navigate to `/deals/[dealId]`
7. Go to "Documents" tab
8. Click "Request Document" → Select category → Request from BUYER
9. Verify document request created
10. **Switch to Buyer** → Upload document
11. **Switch back to Lawyer** → Verify document uploaded
12. Click "Review" → Select APPROVED or CHANGES_REQUESTED → Add note
13. Verify review status updated
14. Go to "Appointments" tab
15. Verify appointment requests from buyer
16. Click "Confirm" on appointment
17. Verify appointment status changes to CONFIRMED

**Expected Status Codes:**
- GET `/api/professionals/me/requests` → 200
- POST `/api/deals/:id/requests/:id/accept` → 200
- POST `/api/deals/:id/documents/request` → 200
- POST `/api/documents/:id/review` → 200
- POST `/api/appointments/:id/confirm` → 200

**Expected UI States:**
- Professional requests page shows incoming requests
- Deal room shows lawyer as participant
- Documents tab shows "Request Document" button
- Documents show "Review" button for uploaded docs
- Appointments show "Confirm" button for requested appointments

---

### 5. IDOR Prevention Tests

**Steps:**
1. Login as User A (BUYER)
2. Create deal room → Note dealId
3. **Switch to User B** (different BUYER, not participant)
4. Try to access `/deals/[dealId]` → Should get 403 or redirect
5. Try to access `/api/deals/[dealId]` directly → Should get 403
6. Try to access `/api/threads/[threadId]/messages` → Should get 403
7. Try to access `/api/documents/[docId]/download-url` → Should get 403

**Expected Status Codes:**
- GET `/api/deals/:id` → 403 (for non-participant)
- GET `/api/threads/:id/messages` → 403 (for non-member)
- GET `/api/documents/:id/download-url` → 403 (for non-participant or wrong visibility)

**Expected UI States:**
- Error message: "Access denied" or "You don't have permission"
- Redirect to `/deals` or show 403 page

---

## UI Quality Checks

### Loading States
- [ ] Deal list shows skeleton while loading
- [ ] Deal room shows skeleton while loading
- [ ] Messages show skeleton while loading
- [ ] Documents show skeleton while loading

### Error Handling
- [ ] 401 errors redirect to login
- [ ] 403 errors show "Access denied" message
- [ ] 404 errors show "Not found" message
- [ ] 500 errors show "Something went wrong" with retry button
- [ ] Network errors show "Connection error" message

### Notifications
- [ ] Success actions show toast.success
- [ ] Error actions show toast.error
- [ ] Loading actions show toast.loading (optional)

### Responsive Design
- [ ] Mobile: Deal list stacks vertically
- [ ] Mobile: Deal room tabs scroll horizontally
- [ ] Mobile: Chat messages wrap properly
- [ ] Tablet: Layout adapts correctly

---

## Backend Endpoint Requirements

### Missing Endpoints (to be added)
- `GET /api/professionals/me/requests` - List incoming professional requests for current user

### Existing Endpoints (verified in Phase 2)
- ✅ `POST /api/deals` - Create deal room
- ✅ `GET /api/deals` - List user's deals
- ✅ `GET /api/deals/:id` - Get deal room details
- ✅ `POST /api/deals/:id/requests` - Request professional
- ✅ `POST /api/deals/:id/requests/:id/accept` - Accept request
- ✅ `POST /api/deals/:id/requests/:id/decline` - Decline request
- ✅ `GET /api/deals/:id/threads` - List threads
- ✅ `POST /api/deals/:id/threads/direct` - Create direct thread
- ✅ `GET /api/threads/:id/messages` - Get messages
- ✅ `POST /api/threads/:id/messages` - Send message
- ✅ `GET /api/deals/:id/documents` - List documents
- ✅ `POST /api/deals/:id/documents/request` - Request document
- ✅ `POST /api/deals/:id/documents/upload` - Upload document
- ✅ `POST /api/documents/:id/review` - Review document
- ✅ `GET /api/documents/:id/download-url` - Get download URL
- ✅ `GET /api/deals/:id/appointments` - List appointments
- ✅ `POST /api/deals/:id/appointments/request` - Request appointment
- ✅ `POST /api/appointments/:id/confirm` - Confirm appointment
- ✅ `POST /api/appointments/:id/cancel` - Cancel appointment
- ✅ `GET /api/professionals/search` - Search professionals
- ✅ `POST /api/professionals/register` - Register professional
- ✅ `POST /api/professionals/availability` - Set availability

---

## Test Checklist

- [ ] Buyer can create deal room
- [ ] Buyer can request professional
- [ ] Professional can accept request
- [ ] Buyer can create direct thread with professional
- [ ] Buyer can send messages
- [ ] Professional can request documents
- [ ] Buyer can upload documents
- [ ] Professional can review documents
- [ ] Buyer can request appointments
- [ ] Professional can confirm appointments
- [ ] Seller can view deal room
- [ ] Seller can only see GROUP thread
- [ ] Seller can only see shared documents
- [ ] Agent can view deal room
- [ ] Agent can only see GROUP thread
- [ ] IDOR prevention works (403 for non-participants)
- [ ] Loading states work
- [ ] Error handling works
- [ ] Notifications work
- [ ] Mobile responsive


