# Professional Onboarding Smoke Tests

## Overview
This document outlines smoke tests for the Professional Onboarding flow (Lawyers & Notaries).

## Prerequisites
- Backend server running on `http://localhost:3001` (or configured BACKEND_URL)
- Frontend server running on `http://localhost:3000`
- Database accessible and migrations applied
- Test user account (or use registration flow)

## Test Checklist

### 1. Public Landing Pages

#### `/professionals`
- [ ] Page loads without errors
- [ ] Shows two cards: "Δικηγόροι" and "Συμβολαιογράφοι"
- [ ] "Μάθε πώς δουλεύει" buttons navigate to respective pages
- [ ] "Γίνε Επαγγελματίας" buttons navigate to `/professional/join`
- [ ] "Σύνδεση" button navigates to login (if not authenticated)
- [ ] Navigation link "Επαγγελματίες" appears in navbar

#### `/professionals/lawyers`
- [ ] Page loads without errors
- [ ] Shows lawyer-specific content
- [ ] "Εγγραφή ως Δικηγόρος" button navigates to `/professional/join?type=LAWYER`
- [ ] FAQ section displays correctly

#### `/professionals/notaries`
- [ ] Page loads without errors
- [ ] Shows notary-specific content
- [ ] "Εγγραφή ως Συμβολαιογράφος" button navigates to `/professional/join?type=NOTARY`
- [ ] FAQ section displays correctly

### 2. Join Flow (`/professional/join`)

#### Authentication & Redirects
- [ ] Unauthenticated user redirected to login with callbackUrl
- [ ] Authenticated user with LAWYER/NOTARY role + existing profile redirected to `/professional/dashboard`
- [ ] Authenticated user with BUYER/SELLER/AGENT role can access join flow

#### Step 1: Account Basics
- [ ] Progress indicator shows step 1/3
- [ ] Full name field is required and validated
- [ ] Email field is read-only (from session)
- [ ] Phone field is optional
- [ ] City field is required and validated
- [ ] "Επόμενο" button validates required fields
- [ ] "Πίσω" button is disabled on step 1

#### Step 2: Professional Details
- [ ] Progress indicator shows step 2/3
- [ ] Professional type selection (LAWYER/NOTARY) works
- [ ] Registry number field is required and validated
- [ ] Office name field is optional
- [ ] Languages checkboxes work (Greek default checked)
- [ ] "Επόμενο" button validates required fields
- [ ] "Πίσω" button navigates to step 1

#### Step 3: Availability
- [ ] Progress indicator shows step 3/3
- [ ] Weekly availability checkboxes work (Mon-Fri)
- [ ] Time pickers appear when day is checked
- [ ] Meeting types checkboxes work (ONLINE/IN_PERSON)
- [ ] "Ολοκλήρωση Εγγραφής" button submits form
- [ ] "Πίσω" button navigates to step 2

#### Form Submission
- [ ] Loading state shows during submission
- [ ] Success toast appears: "Η εγγραφή ολοκληρώθηκε επιτυχώς!"
- [ ] Redirects to `/professional/dashboard` after success
- [ ] Error toast appears on failure with human-readable message
- [ ] No raw JSON errors displayed to user

### 3. Backend Endpoints

#### GET `/api/professionals/me`
- [ ] Requires authentication (JWT)
- [ ] Returns `{ exists: boolean, profile: {...} | null }`
- [ ] No PII (email/phone) in response
- [ ] Returns 200 status

#### POST `/api/professionals/me`
- [ ] Requires authentication (JWT)
- [ ] Requires CSRF token
- [ ] Rate limited (10/hour per userId+ip)
- [ ] Validates required fields (type, displayName, city, registryNumber)
- [ ] Creates ProfessionalProfile if doesn't exist
- [ ] Updates ProfessionalProfile if exists
- [ ] Updates user.role to LAWYER or NOTARY
- [ ] Creates/updates ProfessionalAvailability if provided
- [ ] Returns `{ ok: true, role: 'LAWYER'|'NOTARY', profileId: string }`
- [ ] Audit logs: `professional.onboarding_started` (if new)
- [ ] Audit logs: `professional.onboarding_completed`
- [ ] Audit logs: `role.change` (if role changed)
- [ ] No registryNumber in audit logs (only profileId)

### 4. Security Checks

- [ ] Cannot escalate to ADMIN role
- [ ] CSRF protection active
- [ ] Rate limiting active (10/hour)
- [ ] No PII leakage in responses
- [ ] JWT authentication required
- [ ] Deleted users blocked (if applicable)

### 5. UI/UX Quality

- [ ] Form validation errors appear below inputs
- [ ] Loading states on buttons during submission
- [ ] Disabled buttons have proper styling
- [ ] Toast notifications work correctly
- [ ] No console errors
- [ ] Responsive design works on mobile
- [ ] Progress indicator is clear and accurate

## Running Tests

### Backend Test Script
```bash
cd backend
node scripts/test-professional-onboarding.js
```

### Manual Frontend Tests
1. Navigate to `http://localhost:3000/professionals`
2. Click through landing pages
3. Click "Εγγραφή" and complete join flow
4. Verify redirects and form behavior

## Expected Results

After successful onboarding:
- User role should be LAWYER or NOTARY
- ProfessionalProfile should exist with verificationStatus = 'PENDING'
- ProfessionalAvailability should exist (if provided)
- User should be redirected to `/professional/dashboard`
- Audit logs should contain onboarding events

## Known Issues / Notes

- Verification status is always PENDING initially (admin verification is Phase 2)
- Registry number is stored in services JSON (not separate field)
- Availability is optional but recommended
- Languages default to ['Greek'] if none selected

