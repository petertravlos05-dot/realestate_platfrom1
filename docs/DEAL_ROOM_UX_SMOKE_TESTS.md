# Deal Room UX Smoke Tests

**Date:** 2024-12-19  
**Purpose:** Verify buyer flow and UI/UX improvements work correctly  
**Scope:** All new components and improvements

---

## Prerequisites

1. Backend running and accessible
2. Frontend running on `http://localhost:3000`
3. Valid buyer account logged in
4. At least one deal room exists

---

## Test Scenarios

### 1. Deal Room Page Load

**Steps:**
1. Navigate to `/deals/[dealId]` (replace with actual deal ID)
2. Observe page load

**Expected:**
- ✅ Compact sticky header visible at top
- ✅ Header shows: property title, location, price, status chip
- ✅ Participant avatars (max 4 + "+N") visible
- ✅ Connection status indicator (green dot = connected)
- ✅ "Επόμενο Βήμα" CTA button visible in header
- ✅ 2-column layout on desktop (35% left / 65% right)
- ✅ Left column: Actions Panel, Activity Feed, Deal Summary
- ✅ Right column: Tabs panel

**Notes:**
- Header should be sticky (stays at top when scrolling)
- Connection indicator should show correct status

---

### 2. Actions Panel

**Steps:**
1. Observe Actions Panel in left column
2. Check task list

**Expected:**
- ✅ Tasks shown based on deal state:
  - Choose professional (if none selected)
  - Upload documents (if requested)
  - Review documents (if rejected)
  - Book appointment (if none upcoming)
  - Open chat (always available)
- ✅ Each task has: icon, title, description, status (todo/done)
- ✅ Clicking task navigates to correct tab
- ✅ Done tasks collapsed under "Ολοκληρωμένα"

**Notes:**
- Tasks should update when deal state changes
- CTAs should navigate correctly

---

### 3. Activity Feed

**Steps:**
1. Observe Activity Feed in left column
2. Trigger some events (send message, upload doc, etc.)
3. Check feed updates

**Expected:**
- ✅ Feed shows last 30 events
- ✅ Events translated to Greek:
  - "Νέο μήνυμα στη συνομιλία"
  - "Ζητήθηκε έγγραφο"
  - "Ανέβηκε έγγραφο"
  - "Ολοκληρώθηκε έλεγχος εγγράφου"
  - "Αιτήθηκε ραντεβού"
  - "Ραντεβού επιβεβαιώθηκε"
  - "Επαγγελματίας αποδέχτηκε"
- ✅ Relative timestamps ("πριν 5 λεπτά")
- ✅ Clicking event navigates to relevant tab
- ✅ Events sorted by most recent first

**Notes:**
- Feed should update in real-time via SSE
- No sensitive data exposed

---

### 4. Deal Summary Panel

**Steps:**
1. Observe Deal Summary in left column

**Expected:**
- ✅ Shows property snapshot (title, city)
- ✅ Shows current stage
- ✅ Shows selected professionals count
- ✅ Shows documents progress (approved/total)
- ✅ Shows next appointment date/time (if any)
- ✅ Only visible for buyers

**Notes:**
- Summary should reflect current deal state
- Updates when deal changes

---

### 5. Tab Navigation with Badges

**Steps:**
1. Observe tab navigation
2. Check badges on tabs

**Expected:**
- ✅ Tabs: Overview, Professionals, Chat, Documents, Appointments
- ✅ Badges show counts:
  - Chat: unread messages count
  - Documents: pending docs count
  - Appointments: pending appointments count
- ✅ Badges only show when count > 0
- ✅ Tab selection persists in URL (`?tab=chat`)
- ✅ Deep-linking works (can navigate directly to tab)

**Notes:**
- Badge counts should update via SSE
- URL should update without full page reload

---

### 6. Professionals Tab

**Steps:**
1. Click "Επαγγελματίες" tab
2. Observe professional list

**Expected:**
- ✅ Shows lawyers and notaries
- ✅ Each card shows: displayName, type, area tags, languages
- ✅ Verified badge (if applicable)
- ✅ Status: Request / Pending / Accepted
- ✅ After acceptance: "Άνοιγμα ιδιωτικής συνομιλίας" button
- ✅ Search/filter functionality works

**Notes:**
- Only buyers can request professionals
- Status should update after request/acceptance

---

### 7. Documents Tab - Checklist View

**Steps:**
1. Click "Έγγραφα" tab
2. Observe checklist view

**Expected:**
- ✅ Progress indicator at top (approved/total)
- ✅ Documents grouped by status:
  - Requested (with count)
  - Uploaded - Waiting Review (with count)
  - Rejected (with reason, if any)
  - Approved (with count)
- ✅ Each row shows:
  - Category name
  - Status pill
  - File name (if uploaded)
  - Updated date
  - Review note (if rejected)
- ✅ Action buttons per row:
  - Upload (for requested docs, buyer only)
  - Download (for uploaded docs)
  - Approve/Reject (for professionals)
- ✅ Empty state: "Ζήτα από τον δικηγόρο να προσθέσει checklist"

**Notes:**
- Grouping should be clear and visual
- Status pills should be color-coded
- Drag & drop upload (if implemented)

---

### 8. Appointments Tab - Upcoming Card

**Steps:**
1. Click "Ραντεβού" tab
2. Observe appointments list

**Expected:**
- ✅ Upcoming appointment card at top (if any):
  - Highlighted with gradient background
  - Shows professional name
  - Shows date/time prominently
  - Shows type
- ✅ Appointments grouped by status:
  - Requested (with count)
  - Confirmed (with count)
  - Cancelled (with count)
- ✅ Empty state: Clear CTA "Αίτημα Ραντεβού"
- ✅ Request modal includes helper text:
  - What happens after request
  - Who confirms
  - Timeline expectations

**Notes:**
- Upcoming card should be visually distinct
- Grouping should be clear

---

### 9. Chat Tab - Workspace Style

**Steps:**
1. Click "Συνομιλία" tab
2. Observe chat interface

**Expected:**
- ✅ Left sidebar: threads list (narrower)
- ✅ "Ομαδική Συνομιλία" pinned at top
- ✅ Unread badges per thread
- ✅ Right: messages area
- ✅ Message bubbles with proper spacing
- ✅ Timestamps visible
- ✅ "Jump to latest" button when scrolled up
- ✅ SSE messages auto-append
- ✅ Unread badges update on new messages

**Notes:**
- Thread selection should work smoothly
- Messages should auto-scroll to bottom
- SSE integration should be seamless

---

### 10. Next Step CTA Logic

**Steps:**
1. Check "Επόμενο Βήμα" button in header
2. Complete each step
3. Observe button text changes

**Expected:**
- ✅ If no professional: "Επίλεξε Δικηγόρο/Συμβολαιογράφο"
- ✅ If requested docs pending: "Ανέβασε Έγγραφα (N)"
- ✅ If no upcoming appointment: "Κλείσε Ραντεβού"
- ✅ Otherwise: "Άνοιξε Συνομιλία"
- ✅ Clicking button navigates to correct tab

**Notes:**
- CTA should be context-aware
- Should update as deal progresses

---

### 11. SSE Connection Indicator

**Steps:**
1. Observe connection indicator in header
2. Disconnect network briefly
3. Reconnect

**Expected:**
- ✅ Green dot + "Συνδεδεμένο" when connected
- ✅ Yellow pulsing dot + "Επανασύνδεση..." when reconnecting
- ✅ Gray dot + "Αποσυνδεδεμένο" when disconnected
- ✅ Tooltip shows status on hover
- ✅ Events still arrive when reconnected

**Notes:**
- Indicator should be visible but not intrusive
- Reconnection should be automatic

---

### 12. Mobile Responsiveness

**Steps:**
1. Resize browser to mobile width (< 1024px)
2. Navigate deal room

**Expected:**
- ✅ Layout stacks vertically:
  - Header
  - Tabs
  - Action cards
- ✅ All components readable
- ✅ Touch targets adequate size
- ✅ No horizontal scrolling

**Notes:**
- Grid should collapse to single column
- Tabs should scroll horizontally if needed

---

### 13. URL Persistence

**Steps:**
1. Select a tab (e.g., "Έγγραφα")
2. Refresh page
3. Check URL and active tab

**Expected:**
- ✅ URL contains `?tab=documents`
- ✅ Correct tab is active after refresh
- ✅ Can share URL with tab selected
- ✅ Browser back/forward works

**Notes:**
- Tab state should persist across refreshes
- Deep-linking should work

---

## Edge Cases

### Empty States

**Test:**
- Deal with no documents
- Deal with no appointments
- Deal with no professionals

**Expected:**
- ✅ Clear empty states with CTAs
- ✅ Helpful guidance text
- ✅ No broken layouts

---

### Error Handling

**Test:**
- Network errors
- API errors
- Invalid deal ID

**Expected:**
- ✅ Error messages shown
- ✅ Graceful degradation
- ✅ No crashes

---

## Performance

**Test:**
- Page load time
- Tab switching speed
- SSE event processing

**Expected:**
- ✅ Page loads in < 2 seconds
- ✅ Tab switching is instant
- ✅ No layout shift
- ✅ Smooth scrolling

---

## Security

**Test:**
- Unauthorized access
- CSRF protection
- SSE authentication

**Expected:**
- ✅ 403 error for unauthorized users
- ✅ CSRF tokens validated
- ✅ SSE requires authentication
- ✅ No sensitive data in UI

---

## Checklist

- [ ] All components render correctly
- [ ] Actions Panel shows correct tasks
- [ ] Activity Feed updates in real-time
- [ ] Deal Summary accurate
- [ ] Tabs have badges
- [ ] URL persistence works
- [ ] Documents checklist view works
- [ ] Appointments upcoming card shows
- [ ] Chat unread badges work
- [ ] Next Step CTA logic correct
- [ ] SSE connection indicator works
- [ ] Mobile responsive
- [ ] No lint errors
- [ ] Build passes
- [ ] No API changes

---

## Notes

- All backend APIs remain unchanged
- SSE events properly handled
- No sensitive data exposed
- Consistent design with dashboard

---

## Known Limitations

1. Unread message count not yet implemented (shows 0)
2. Drag & drop upload not yet implemented
3. Calendar view for appointments not yet implemented
4. Professional filters (distance, languages) not yet implemented

---

## Future Enhancements

1. Add unread message tracking
2. Implement drag & drop upload
3. Add calendar view for appointments
4. Add professional filters
5. Add skeleton loading states
6. Add more granular SSE event handling

