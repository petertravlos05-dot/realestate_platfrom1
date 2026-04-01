# Deal Room Phase 2 - Quick Start Guide

**Status:** ✅ Backend Routes Complete

---

## 🚀 Quick Test

### Prerequisites
1. Backend server running: `npm run dev` (in `backend/` directory)
2. Database migrated: `npx prisma db push` (already done ✅)
3. `.env` file with `JWT_SECRET` set

### Run Smoke Test
```bash
cd backend
npm run test:dealroom-core
```

**Expected Output:**
```
=== Testing Deal Room IDOR Prevention ===

Step 1: Creating User A (buyer)...
✓ User A created: test-dealroom-a-...@example.com (...)
Step 2: Creating User B (non-participant)...
✓ User B created: test-dealroom-b-...@example.com (...)
Step 3: User A creates deal room...
✓ Deal room created: clxxx...
Step 4: User B attempts to access User A's deal room...
✓ PASS: User B correctly denied access (403)
Step 5: User A accesses their own deal room...
✓ PASS: User A can access their own deal room
Step 6: Testing thread access control...
✓ PASS: User B correctly denied access to thread messages (403)

=== All Tests PASSED ===
```

---

## 📡 API Endpoints Summary

### Deal Rooms
- `POST /api/deals` - Create/get deal room
- `GET /api/deals` - List user's deal rooms
- `GET /api/deals/:id` - Get deal room details
- `POST /api/deals/:dealId/requests` - Request professional
- `POST /api/deals/:dealId/requests/:requestId/accept` - Accept request
- `POST /api/deals/:dealId/requests/:requestId/decline` - Decline request

### Professionals
- `POST /api/professionals/register` - Register professional profile
- `POST /api/professionals/availability` - Update availability
- `GET /api/professionals/search` - Search verified professionals
- `POST /api/professionals/:id/verify` - Admin verify (ADMIN only)

### Chat (Threads & Messages)
- `GET /api/deals/:dealId/threads` - List threads
- `POST /api/deals/:dealId/threads/direct` - Create direct thread
- `GET /api/threads/:threadId/messages` - Get messages
- `POST /api/threads/:threadId/messages` - Send message

### Documents
- `POST /api/deals/:dealId/documents/request` - Request document (LAWYER/NOTARY)
- `POST /api/deals/:dealId/documents/upload` - Upload document
- `POST /api/documents/:docId/review` - Review document (LAWYER/NOTARY)
- `GET /api/deals/:dealId/documents` - List documents
- `GET /api/documents/:docId/download-url` - Get signed URL

### Appointments
- `POST /api/deals/:dealId/appointments/request` - Request appointment (BUYER)
- `POST /api/appointments/:id/confirm` - Confirm appointment (professional)
- `POST /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/deals/:dealId/appointments` - List appointments

---

## 🔒 Security Features

✅ **Every endpoint has:**
1. JWT authentication
2. Zod input validation
3. Authorization checks
4. Rate limiting
5. Audit logging
6. Sentry error capture

✅ **Critical IDOR protections:**
- Thread access: Membership verified before any access
- Document access: Visibility rules enforced, s3Key never exposed
- Deal room access: Participant verification required

---

## 📝 Next: Manual Testing

### Test Deal Room Creation
```bash
curl -X POST http://localhost:3001/api/deals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "your-property-id"}'
```

### Test Professional Request
```bash
curl -X POST http://localhost:3001/api/deals/DEAL_ID/requests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"professionalId": "professional-id", "message": "Please help"}'
```

### Test Thread Access (IDOR Check)
```bash
# As User A (participant) - should work
curl http://localhost:3001/api/threads/THREAD_ID/messages \
  -H "Authorization: Bearer USER_A_TOKEN"

# As User B (non-participant) - should return 403
curl http://localhost:3001/api/threads/THREAD_ID/messages \
  -H "Authorization: Bearer USER_B_TOKEN"
```

---

## ⚠️ Troubleshooting

### Test Script Fails with "fetch failed"
- **Cause:** Backend server not running
- **Fix:** Start backend: `cd backend && npm run dev`

### Test Script Fails with "JWT_SECRET required"
- **Cause:** Missing JWT_SECRET in .env
- **Fix:** Add `JWT_SECRET=your-secret-key` to `backend/.env`

### 403 Errors on All Endpoints
- **Cause:** Invalid or expired JWT token
- **Fix:** Generate new token via `/api/auth/login`

---

**Phase 2 Complete!** Ready for Phase 3 (Frontend) 🎉


