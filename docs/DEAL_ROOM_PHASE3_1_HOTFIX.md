# Deal Room Phase 3.1 Hotfixes

## Step 0: Bad Usage Found

### localStorage.getItem('userId') Usage:
1. `listings/frontend/src/components/deals/tabs/AppointmentsTab.tsx:20`
   - Line 20: `deal.participants?.find((p) => p.userId === (typeof window !== 'undefined' ? localStorage.getItem('userId') : null))`
   - Replace with: `useCurrentUser().userId`

2. `listings/frontend/src/components/deals/tabs/ProfessionalsTab.tsx:22`
   - Line 22: `p.userId === (typeof window !== 'undefined' ? localStorage.getItem('userId') : null)`
   - Replace with: `useCurrentUser().userId`

3. `listings/frontend/src/components/deals/tabs/DocumentsTab.tsx:22`
   - Line 22: `deal.participants?.find((p) => p.userId === (typeof window !== 'undefined' ? localStorage.getItem('userId') : null))`
   - Replace with: `useCurrentUser().userId`

## Step 1: Create useCurrentUser Hook

Create: `listings/frontend/src/lib/auth/useCurrentUser.ts`

## Step 2: Update Components

Update these files to use `useCurrentUser()`:
- `listings/frontend/src/components/deals/tabs/AppointmentsTab.tsx`
- `listings/frontend/src/components/deals/tabs/ProfessionalsTab.tsx`
- `listings/frontend/src/components/deals/tabs/DocumentsTab.tsx`
- `listings/frontend/src/app/professional/dashboard/page.tsx`
- `listings/frontend/src/app/professional/requests/page.tsx`
- `listings/frontend/src/app/professional/availability/page.tsx`
- `listings/frontend/src/app/professional/profile/page.tsx`
- `listings/frontend/src/app/deals/[dealId]/page.tsx`

## Step 3: Create ForbiddenState Component

Create: `listings/frontend/src/components/common/ForbiddenState.tsx`

## Step 4: Add Deals Widgets

Add "Deals" card to:
- `listings/frontend/src/app/dashboard/seller/page.tsx`
- `listings/frontend/src/app/dashboard/agent/page.tsx`

## Step 5: Verification Steps

1. Log in as BUYER: /deals loads, /deals/[dealId] loads, chat works
2. Log in as SELLER: sees Deals widget, can open deals where participant, 403 for others
3. Log in as AGENT: sees Deals widget
4. Log in as LAWYER (no profile): /professional/dashboard shows "Create profile" CTA
5. Log in as LAWYER (with profile): /professional/requests loads
6. No localStorage userId remains in codebase


