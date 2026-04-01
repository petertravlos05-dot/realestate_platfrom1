# Deal Room Stage-Based Refactor Plan

**Date:** 2024-12-19  
**Status:** In Progress  
**Goal:** Transform Deal Room into guided purchase journey

---

## Architecture Changes

### 1. Move to Buyer Dashboard
- Add "Deals" tab to Buyer Dashboard
- Deal Rooms list shown in dashboard tab
- Clicking deal opens full-screen modal/drawer (not new page)
- Preserve deep-linking via URL hash or query param

### 2. Stage-Based Flow

**Stages:**
1. **Deal Created** - Initial state
2. **Choose Lawyer** - Select and accept lawyer
3. **Choose Notary** - Select and accept notary  
4. **Document Review** - Upload and review documents
5. **Appointments / Signing** - Schedule and complete appointments
6. **Completion** - Deal closed

**Stage Logic:**
- Only one stage is primary/active at a time
- Previous stages show as completed
- Future stages show as locked/upcoming
- Visual progress indicator

---

## Component Structure

### New Components

1. **DealRoomModal.tsx**
   - Full-screen drawer/modal
   - Handles deal room display
   - Manages stage state
   - Sticky header with property info

2. **PurchaseGuideStepper.tsx**
   - Left sidebar stepper
   - Shows all stages
   - Highlights current stage
   - Shows completion status

3. **StageContent.tsx**
   - Renders content based on current stage
   - Stage-specific UI components
   - Unified chat, docs, appointments within stage context

4. **UnifiedChat.tsx**
   - Group chat + private channels
   - System messages integration
   - Better message threading

5. **DocumentChecklist.tsx**
   - Checklist-style document view
   - Stage context
   - Inline actions

6. **AppointmentCalendar.tsx**
   - Calendar view
   - Stage context
   - Clear CTAs

---

## Implementation Steps

1. ✅ Create DealRoomModal component
2. ⏳ Add Deals tab to Buyer Dashboard
3. ⏳ Create PurchaseGuideStepper
4. ⏳ Refactor to stage-based flow
5. ⏳ Improve chat experience
6. ⏳ Improve documents UX
7. ⏳ Improve appointments UX
8. ⏳ Polish and refine

---

## Key Principles

- **Guided Experience:** Buyer always knows what to do next
- **Context-Aware:** UI adapts to current stage
- **Progressive Disclosure:** Show only what's relevant
- **Visual Hierarchy:** Clear primary actions
- **Premium Feel:** Polished, professional design

---

## Backend Compatibility

✅ **NO API CHANGES**
- All existing endpoints used as-is
- Stage logic computed on frontend
- No new backend requirements

