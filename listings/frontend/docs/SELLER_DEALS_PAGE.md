# Seller Deals Page Documentation

## Overview

The Seller Deals Page (`/deals/seller`) provides a dedicated interface for sellers to manage their properties and view interested buyers. It features a split-view layout with properties on the left and interested buyers on the right.

## Routes

- **Path**: `/deals/seller`
- **Access**: SELLER role only
- **Authentication**: Required (redirects to login if not authenticated)

## Components

### Main Page Component
- **File**: `listings/frontend/src/app/deals/seller/page.tsx`
- **Purpose**: Main page orchestrator with role gating, data fetching, and navigation logic

### Reusable Components

#### 1. `PropertyListPanel`
- **File**: `listings/frontend/src/components/deals/PropertyListPanel.tsx`
- **Purpose**: Displays list of seller's properties in the left column
- **Features**:
  - Property cards with image, title, location, price
  - Selection state highlighting
  - Interested count display
  - Empty state with CTA to add property

#### 2. `InterestedBuyersPanel`
- **File**: `listings/frontend/src/components/deals/InterestedBuyersPanel.tsx`
- **Purpose**: Displays interested buyers for selected property
- **Features**:
  - Filters by selected property
  - Toggle to show all leads across properties
  - Empty state when no property selected

#### 3. `SellerLeadsList`
- **File**: `listings/frontend/src/components/deals/SellerLeadsList.tsx`
- **Purpose**: Reusable component for displaying leads table
- **Features**:
  - Sortable columns (property, buyer, stage, date)
  - Stage filtering
  - Blur protection for buyer info (until deposit paid)
  - "New" badge for leads < 24h old
- **Used by**: Seller Dashboard, Seller Deals Page

#### 4. `SellerAppointmentsList`
- **File**: `listings/frontend/src/components/deals/SellerAppointmentsList.tsx`
- **Purpose**: Reusable component for displaying appointments table
- **Features**:
  - Sortable columns (property, buyer, date, status)
  - Property filtering
  - Approve/reject actions for pending appointments
  - Blur protection for buyer info
- **Used by**: Seller Dashboard, Deal Room Appointments Tab (seller view)

#### 5. `SelectPropertyModal`
- **File**: `listings/frontend/src/components/deals/SelectPropertyModal.tsx`
- **Purpose**: Modal for selecting property when buyer has interest in multiple properties
- **Features**:
  - List of properties buyer is interested in
  - Click to navigate to deal room
  - Accessible (focus trap, ESC to close)

## Features

### 1. Split View Layout

**Desktop**:
- Left column (35%): Properties list
- Right column (65%): Interested buyers

**Mobile**:
- Tab-based navigation between Properties and Interested Buyers
- Stacked layout

### 2. Property Selection

- Click property → filters leads to that property
- Selected property highlighted with green border
- Auto-selects first property on load

### 3. Lead Navigation

**Single Property Interest**:
- Click lead → Navigate directly to deal room

**Multiple Property Interest**:
- Click lead → Show `SelectPropertyModal`
- Select property → Navigate to deal room

### 4. Deal Room Integration

- Uses existing `/deals/[dealId]` route
- Appointments tab shows seller view when `role=SELLER`
- Seller view uses `SellerAppointmentsList` component
- Buyer view unchanged (existing buyer appointments UI)

### 5. Rate Limiting & Performance

- Debounced property selection (500ms)
- Debounced search inputs
- Toast deduplication for 429 errors
- Inline rate limit message banner
- AbortController for request cancellation

## API Endpoints Used

### Properties & Leads
- `GET /api/seller/leads` - Fetch properties with leads

### Deal Rooms
- `GET /api/deals` - List seller's deal rooms (for navigation)

### Appointments (Seller View)
- `GET /api/seller/appointments` - Fetch appointments
- `PUT /api/seller/appointments/:id/status` - Approve/reject appointment

## User Flow

1. **Seller visits `/deals/seller`**
   - Role check → redirect if not SELLER
   - Fetch properties with leads
   - Auto-select first property

2. **Select Property**
   - Click property card
   - Leads filtered to selected property
   - Right panel updates

3. **Click Lead**
   - Check if buyer has interest in multiple properties
   - If single → navigate to deal room
   - If multiple → show property selection modal

4. **Navigate to Deal Room**
   - Find existing deal room by `propertyId` + `buyerId`
   - Navigate to `/deals/[dealId]?tab=overview`
   - Deal room shows seller-specific UI in Appointments tab

## Appointments Tab (Seller View)

When seller opens deal room, the Appointments tab shows:

- **Same UI as Seller Dashboard**: Uses `SellerAppointmentsList` component
- **Approve/Reject**: Actions for pending appointments
- **Blur Protection**: Buyer info blurred until deposit paid
- **Appointment Details Modal**: Full details on click

## Testing

### Manual Testing Steps

1. **Access Control**
   - ✅ Login as SELLER → should access page
   - ✅ Login as BUYER → should show ForbiddenState
   - ✅ Not authenticated → should redirect to login

2. **Properties List**
   - ✅ Properties load and display
   - ✅ Click property → highlights and filters leads
   - ✅ Empty state shows when no properties

3. **Leads List**
   - ✅ Leads filtered by selected property
   - ✅ "Show All" toggle works
   - ✅ Click lead → navigates to deal room (single property)
   - ✅ Click lead → shows modal (multiple properties)

4. **Deal Room Navigation**
   - ✅ Navigates to correct deal room
   - ✅ Appointments tab shows seller view
   - ✅ Approve/reject appointments works

5. **Rate Limiting**
   - ✅ Rapid property clicks → debounced
   - ✅ 429 errors → single toast + inline message

6. **Mobile Responsiveness**
   - ✅ Tabs work on mobile
   - ✅ Layout stacks properly

## Known Limitations

1. **Deal Room Creation**: Deal rooms are created when buyer expresses interest. If a lead exists but deal room doesn't, seller will see error message. This is expected behavior.

2. **Multi-Property Detection**: Currently checks all properties for buyer interest. Could be optimized with backend support.

3. **Real-time Updates**: No SSE connection on seller deals page. Relies on manual refresh or navigation.

## Future Enhancements

- [ ] Add SSE for real-time lead/appointment updates
- [ ] Add search/filter for properties
- [ ] Add bulk actions for leads
- [ ] Add analytics/metrics panel
- [ ] Add export functionality for leads

## Related Files

- `listings/frontend/src/app/dashboard/seller/page.tsx` - Seller Dashboard (uses same components)
- `listings/frontend/src/app/deals/[dealId]/page.tsx` - Deal Room page
- `listings/frontend/src/components/deals/tabs/AppointmentsTab.tsx` - Appointments tab (seller view)

