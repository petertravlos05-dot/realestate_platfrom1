# Real-time Updates - Phase 3.2

**Date:** 2024-12-19  
**Status:** ✅ Implemented

---

## Overview

Phase 3.2 implements real-time updates for the Deal Room system using Server-Sent Events (SSE). This enables live updates for chat messages, documents, appointments, and professional requests without requiring page refreshes.

---

## Architecture

### Backend

#### Event Bus (`backend/src/services/realtime/eventBus.ts`)

**In-memory EventEmitter-based event bus** for MVP.

**Limitation:** This implementation is **NOT multi-instance safe**. For production with multiple backend instances, migrate to Redis Pub/Sub.

**Classes:**
- `DealEventBus` - Handles deal-level events
- `ProfessionalEventBus` - Handles professional-specific events

**Features:**
- Event buffering (last 200 events per deal/user)
- `lastEventId` support for reconnection
- Subscription/unsubscription management

**Migration Path:**
When scaling to multiple instances, replace EventEmitter with Redis Pub/Sub:
1. Use Redis `PUBLISH` instead of `emit`
2. Use Redis `SUBSCRIBE` instead of `on`
3. Keep event buffer in Redis (with TTL)

#### SSE Endpoints

**GET `/api/deals/:dealId/events`**
- **Auth:** JWT required
- **Authorization:** Must be deal participant
- **Rate Limit:** 30 connects/hour per userId+ip
- **Concurrent Limit:** Max 3 connections per user
- **Features:**
  - Initial snapshot with counts
  - Keep-alive pings every 25 seconds
  - `lastEventId` support for reconnection
  - Automatic cleanup on disconnect

**GET `/api/professionals/me/events`**
- **Auth:** JWT required
- **Authorization:** Must be LAWYER or NOTARY
- **Rate Limit:** 30 connects/hour per userId+ip
- **Concurrent Limit:** Max 3 connections per user
- **Features:**
  - Initial snapshot with pending requests count
  - Keep-alive pings every 25 seconds
  - `lastEventId` support for reconnection

#### Event Publishing

Events are published from existing routes:

**Chat Events:**
- `message_sent` - When a message is sent (`deal-chat.ts`)
- `thread_created` - When a new thread is created (`deal-chat.ts`)

**Document Events:**
- `document_requested` - When a document is requested (`deal-documents.ts`)
- `document_uploaded` - When a document is uploaded (`deal-documents.ts`)
- `document_reviewed` - When a document is reviewed (`deal-documents.ts`)

**Appointment Events:**
- `appointment_requested` - When an appointment is requested (`deal-appointments.ts`)
- `appointment_confirmed` - When an appointment is confirmed (`deal-appointments.ts`)
- `appointment_cancelled` - When an appointment is cancelled (`deal-appointments.ts`)

**Professional Request Events:**
- `professional_requested` - When a professional is requested (`deals.ts`)
- `professional_accepted` - When a request is accepted (`deals.ts`)
- `professional_declined` - When a request is declined (`deals.ts`)
- `request_received` - Published to professional's event stream (`deals.ts`)

---

## Event Types

### Deal Events

All deal events follow this schema:

```typescript
{
  type: string;           // Event type (e.g., 'message_sent')
  at: string;            // ISO timestamp
  dealId: string;        // Deal room ID
  threadId?: string;     // Thread ID (if applicable)
  docId?: string;        // Document ID (if applicable)
  appointmentId?: string; // Appointment ID (if applicable)
  requestId?: string;    // Professional request ID (if applicable)
  actorUserId?: string;  // User who triggered the event
  summary?: string;      // Human-readable summary
  metadata?: Record<string, any>; // Additional metadata (never includes s3Key or signed URLs)
}
```

### Professional Events

```typescript
{
  type: string;              // Event type (e.g., 'request_received')
  at: string;               // ISO timestamp
  professionalUserId: string; // Professional user ID
  requestId?: string;       // Request ID
  dealId?: string;          // Deal room ID
  actorUserId?: string;     // User who triggered the event
  summary?: string;         // Human-readable summary
  metadata?: Record<string, any>;
}
```

### Snapshot Event

Sent on initial connection:

```typescript
{
  type: 'snapshot';
  dealId?: string;
  professionalUserId?: string;
  counts: {
    unreadMessages?: number;
    pendingDocuments?: number;
    upcomingAppointments?: number;
    pendingProfessionalRequests?: number;
  };
}
```

---

## Security Model

### Authentication
- All SSE endpoints require JWT authentication
- Uses cookie-based auth (`withCredentials: true`)
- CSRF protection via existing middleware

### Authorization
- **Deal Events:** Must be deal participant (checked via `requireDealParticipant` middleware)
- **Professional Events:** Must be LAWYER or NOTARY (checked via `requireRole` middleware)

### Data Protection
- **Never** send `s3Key` in events
- **Never** send signed URLs in events
- Only send minimal metadata (IDs, timestamps, summaries)
- Events are filtered by participation/role before sending

### Rate Limiting
- **SSE Connections:** 30 connects/hour per userId+ip
- **Concurrent Connections:** Max 3 per user
- Rate limiting is proxy-safe (uses `req.ip`)

---

## Frontend Implementation

### SSE Client (`listings/frontend/src/lib/realtime/sseClient.ts`)

**Features:**
- Automatic reconnection with exponential backoff
- JWT authentication via cookies
- `lastEventId` support for reconnection
- Connection status tracking

**Usage:**

```typescript
import { createDealSSEClient } from '@/lib/realtime/sseClient';

const client = createDealSSEClient(dealId, (event) => {
  // Handle event
  if (event.type === 'message_sent') {
    // Update UI
  }
});

client.connect();

// Cleanup
client.disconnect();
```

### UI Integration

**Deal Room Page (`/deals/[dealId]`)**
- Subscribes to deal events on mount
- Refreshes data on relevant events
- Shows connection status indicator

**Professional Requests Page (`/professional/requests`)**
- Subscribes to professional events on mount
- Refreshes requests list on `request_received` events
- Shows connection status indicator

**Connection Status Indicator:**
- Green dot: Connected
- Yellow pulsing dot: Reconnecting
- Gray dot: Disconnected

---

## Testing

### Manual Test Script

Create a test script to verify SSE functionality:

```bash
# Test deal events
# 1. Open SSE connection as participant A
# 2. Send message as participant B
# 3. Verify participant A receives event
# 4. Verify non-participant does NOT receive event
```

### Test Checklist

- [ ] SSE connection establishes successfully
- [ ] Initial snapshot received
- [ ] Events received for participants
- [ ] Events NOT received for non-participants
- [ ] Reconnection works after disconnect
- [ ] `lastEventId` prevents duplicate events
- [ ] Rate limiting works (30 connects/hour)
- [ ] Concurrent connection limit works (max 3)
- [ ] Connection status indicator updates correctly

---

## Known Limitations

1. **In-memory Event Bus:** Not multi-instance safe. Migrate to Redis Pub/Sub for production scaling.
   - **Production Requirement:** Backend must run as **single instance** when `REALTIME_BUS=memory`
   - **Runtime Warning:** Backend logs warning on startup if `REALTIME_BUS=memory` in production
   - **Render Configuration:** Pin backend service to 1 instance in Render dashboard
   - **Migration Path:** Set `REALTIME_BUS=redis` and configure Redis for multi-instance support

2. **Event Buffer:** Limited to last 200 events per deal/user. Events older than buffer are lost on reconnection.

3. **Unread Tracking:** Currently not implemented. Snapshot shows `unreadMessages: 0`. Future enhancement.

4. **Polling Fallback:** `/deals` list page uses polling (30-60s) instead of SSE. Acceptable for MVP.

---

## Future Enhancements

1. **Redis Pub/Sub Migration:** Replace EventEmitter with Redis for multi-instance support
2. **Unread Message Tracking:** Implement unread counts per thread
3. **Global Activity Stream:** Single SSE endpoint for all user activity
4. **Event Filtering:** Allow clients to subscribe to specific event types
5. **WebSocket Option:** Consider WebSocket for bidirectional communication (if needed)

---

## Files Changed

### Backend
- `backend/src/services/realtime/eventBus.ts` (NEW)
- `backend/src/routes/deal-events.ts` (NEW)
- `backend/src/routes/professional-events.ts` (NEW)
- `backend/src/middleware/rateLimit.ts` (added `sseConnectLimiter`)
- `backend/src/routes/deal-chat.ts` (added event publishing)
- `backend/src/routes/deal-documents.ts` (added event publishing)
- `backend/src/routes/deal-appointments.ts` (added event publishing)
- `backend/src/routes/deals.ts` (added event publishing)
- `backend/src/index.ts` (registered SSE routes)

### Frontend
- `listings/frontend/src/lib/realtime/sseClient.ts` (NEW)
- `listings/frontend/src/app/deals/[dealId]/page.tsx` (added SSE integration)
- `listings/frontend/src/app/professional/requests/page.tsx` (added SSE integration)

---

## Deployment Notes

1. **Environment Variables:** No new env vars required
2. **Database:** No schema changes
3. **Breaking Changes:** None (SSE is additive)
4. **Performance:** SSE connections are lightweight, but monitor connection count
5. **Scaling:** Migrate to Redis Pub/Sub before scaling to multiple instances

---

**Last Updated:** 2024-12-19

