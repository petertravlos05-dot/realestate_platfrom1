# Authorization Matrix

**Last Updated:** 2025-01-XX  
**Purpose:** Defines who can perform what actions on which resources

---

## Resource Types

1. **Property** - Real estate listing
2. **Transaction** - Property transaction between buyer/seller/agent
3. **ViewingRequest** - Scheduled property viewing
4. **PropertyLead** - Buyer interest in a property
5. **Favorite** - User's favorite properties
6. **PropertyAvailability** - Available viewing times for a property
7. **PropertyDocument** - Legal documents for a property
8. **PropertyProgress** - Property listing progress stages

---

## Role Definitions

- **BUYER** - User looking to buy properties
- **SELLER** - User selling properties
- **AGENT** - Real estate agent
- **ADMIN** - Platform administrator

---

## Authorization Rules

### Properties

| Action | Resource | Owner | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|-------|--------|-------|-------|-------|
| **CREATE** | Property | ✅ | ✅ | ✅ | ✅ | ✅ | Any authenticated user |
| **READ (own)** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Seller can read their own |
| **READ (other's)** | Property | ❌ | ✅* | ❌ | ✅* | ✅ | *If available or has relationship |
| **UPDATE** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **DELETE** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **UPLOAD_IMAGES** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **SET_AVAILABILITY** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **SET_LAWYER_INFO** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **REQUEST_REMOVAL** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |
| **UPDATE_PROGRESS** | Property | ✅ | ❌ | ✅ | ❌ | ✅ | Only owner or admin |

**Special Cases:**
- Unavailable properties: Only owner, admin, or users with relationship (favorite/connection) can view
- Available properties: Any authenticated user can view

### Transactions

| Action | Resource | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|--------|-------|-------|-------|
| **CREATE** | Transaction | ✅ | ❌ | ❌ | ✅ | Buyer expresses interest |
| **READ** | Transaction | ✅* | ✅* | ✅* | ✅ | *Only if involved in transaction |
| **UPDATE** | Transaction | ✅* | ✅* | ✅* | ✅ | *Only if involved in transaction |
| **DELETE** | Transaction | ✅* | ❌ | ❌ | ✅ | *Only buyer can delete their own |

**Involvement Definition:**
- Buyer: `transaction.buyerId === userId`
- Seller: `transaction.property.userId === userId` OR `transaction.sellerId === userId`
- Agent: `transaction.agentId === userId`

### Viewing Requests

| Action | Resource | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|--------|-------|-------|-------|
| **CREATE** | ViewingRequest | ✅ | ❌ | ✅ | ✅ | Buyer or agent can create |
| **READ** | ViewingRequest | ✅* | ✅* | ✅* | ✅ | *Only if involved |
| **UPDATE** | ViewingRequest | ✅* | ✅* | ✅* | ✅ | *Only if involved |
| **DELETE** | ViewingRequest | ✅* | ✅* | ✅* | ✅ | *Only if involved |

**Involvement Definition:**
- Buyer: `viewingRequest.buyerId === userId`
- Seller: `viewingRequest.property.userId === userId`
- Agent: `viewingRequest.agentId === userId`

### Property Leads

| Action | Resource | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|--------|-------|-------|-------|
| **CREATE** | PropertyLead | ✅ | ❌ | ❌ | ✅ | Buyer expresses interest |
| **READ** | PropertyLead | ✅* | ✅* | ✅* | ✅ | *Only if involved |
| **UPDATE** | PropertyLead | ✅* | ✅* | ✅* | ✅ | *Only if involved |
| **DELETE** | PropertyLead | ✅* | ❌ | ❌ | ✅ | *Only buyer can cancel |

**Involvement Definition:**
- Buyer: `lead.buyerId === userId`
- Seller: `lead.property.userId === userId`
- Agent: `lead.agentId === userId`

### Favorites

| Action | Resource | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|--------|-------|-------|-------|
| **CREATE** | Favorite | ✅ | ✅ | ✅ | ✅ | Any authenticated user |
| **READ** | Favorite | ✅* | ✅* | ✅* | ✅ | *Only own favorites |
| **DELETE** | Favorite | ✅* | ✅* | ✅* | ✅ | *Only own favorites |

**Ownership:** `favorite.userId === userId`

### Property Availability

| Action | Resource | Buyer | Seller | Agent | Admin | Notes |
|--------|----------|-------|--------|-------|-------|-------|
| **CREATE** | PropertyAvailability | ❌ | ✅* | ❌ | ✅ | *Only for own properties |
| **READ** | PropertyAvailability | ✅ | ✅ | ✅ | ✅ | Public (for available properties) |
| **DELETE** | PropertyAvailability | ❌ | ✅* | ❌ | ✅ | *Only for own properties |

**Ownership:** Property owner (`property.userId === userId`)

---

## Implementation

### Middleware Functions

Located in `backend/src/middleware/authorization.ts`:

- `requirePropertyOwnership` - Ensures user owns the property
- `requirePropertyAccess` - More permissive: allows owner, admin, or users with relationship
- `requireTransactionAccess` - Ensures user is involved in transaction (buyer/seller/agent/admin)
- `requireViewingRequestAccess` - Ensures user is involved in viewing request
- `requirePropertyLeadAccess` - Ensures user is involved in lead
- `requireFavoriteOwnership` - Ensures user owns the favorite

### Utility Functions

Located in `backend/src/lib/utils/authorization.ts`:

- `checkPropertyOwnership(propertyId, userId)` - Returns `{ allowed: boolean, reason?: string }`
- `checkTransactionAccess(transactionId, userId, userRole?)` - Checks transaction involvement
- `checkViewingRequestAccess(viewingRequestId, userId, userRole?)` - Checks viewing request involvement
- `checkPropertyLeadAccess(leadId, userId, userRole?)` - Checks lead involvement
- `checkFavoriteOwnership(favoriteId, userId)` - Checks favorite ownership
- `checkPropertyAccess(propertyId, userId, userRole?)` - More permissive property access check

---

## Applied Endpoints

### Properties Endpoints

| Endpoint | Method | Authorization | Status |
|----------|--------|---------------|--------|
| `/api/properties/:id` | PATCH | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id` | DELETE | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/availability` | POST | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/availability` | DELETE | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/lawyer` | POST | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/progress/documents` | POST | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/progress` | PUT | `requirePropertyOwnership` | ✅ |
| `/api/properties/:id/request-removal` | POST | `requirePropertyOwnership` | ✅ |

### Transactions Endpoints

| Endpoint | Method | Authorization | Status |
|----------|--------|---------------|--------|
| `/api/transactions/:id` | GET | `requireTransactionAccess` | ✅ |
| `/api/transactions/:id` | PUT | `requireTransactionAccess` | ✅ |
| `/api/transactions/:id` | DELETE | Manual check (buyer only) | ✅ |

### Viewing Requests Endpoints

| Endpoint | Method | Authorization | Status |
|----------|--------|---------------|--------|
| `/api/viewing-requests/:id` | GET | `requireViewingRequestAccess` | ✅ |
| `/api/viewing-requests/:id` | PUT | `requireViewingRequestAccess` | ✅ |
| `/api/viewing-requests/:id/status` | PATCH | `requireViewingRequestAccess` | ✅ |
| `/api/viewing-requests/:id` | DELETE | `requireViewingRequestAccess` | ✅ |

### Seller Endpoints

| Endpoint | Method | Authorization | Status |
|----------|--------|---------------|--------|
| `/api/seller/properties/:property_id` | GET | Manual check (already OK) | ✅ |
| `/api/seller/properties/:property_id/visit-settings` | PUT | `requirePropertyOwnership` | ✅ |

---

## Testing Requirements

### Test Cases Required

1. **Property Ownership Tests:**
   - ✅ User A cannot update User B's property
   - ✅ User A cannot delete User B's property
   - ✅ User A cannot set availability for User B's property
   - ✅ Seller can update their own property
   - ✅ Admin can update any property

2. **Transaction Access Tests:**
   - ✅ Buyer can only access their own transactions
   - ✅ Seller can only access transactions for their properties
   - ✅ Agent can only access transactions they're involved in
   - ✅ Admin can access all transactions
   - ✅ User A cannot access User B's transaction

3. **Viewing Request Access Tests:**
   - ✅ Buyer can only access their own viewing requests
   - ✅ Seller can only access viewing requests for their properties
   - ✅ Agent can only access viewing requests they're involved in
   - ✅ User A cannot access User B's viewing request

4. **Property Lead Access Tests:**
   - ✅ Buyer can only cancel their own leads
   - ✅ Seller can only view leads for their properties
   - ✅ User A cannot cancel User B's lead

---

## Security Notes

1. **Default Deny:** All endpoints default to denying access unless explicitly allowed
2. **Explicit Checks:** Every endpoint that accesses user-owned resources must verify ownership/involvement
3. **Admin Override:** Admins can access all resources (with proper logging)
4. **Relationship-Based Access:** Some resources allow access based on relationships (favorites, connections)
5. **404 vs 403:** Return 404 for non-existent resources, 403 for unauthorized access (prevents enumeration)

---

**End of Authorization Matrix**





