# Professional Registration Flow Documentation

## Overview
Αυτό το έγγραφο εξηγεί πώς αποθηκεύονται οι επαγγελματίες όταν κάνουν εγγραφή από τη σελίδα `/professional/join` και πώς μπορούμε να τους φέρουμε πίσω.

## Database Schema

### 1. User Table (`users`)
Όταν ένας επαγγελματίας κάνει εγγραφή, δημιουργείται ένας **User** record με:
- `id`: Unique identifier (CUID)
- `email`: Email του επαγγελματία
- `name`: Όνομα (από `displayName`)
- `role`: `LAWYER` ή `NOTARY` (από το `formData.type`)
- `password`: Hashed password
- `phone`: Τηλέφωνο (optional)
- `createdAt`: Timestamp δημιουργίας

**Location:** `backend/src/routes/auth.ts` - `POST /api/auth/register`

### 2. ProfessionalProfile Table (`professional_profiles`)
Μετά τη δημιουργία του User, δημιουργείται ένα **ProfessionalProfile** record με:
- `id`: Unique identifier (CUID) - αυτό είναι το `professionalId`
- `userId`: Foreign key στο `users.id`
- `type`: `LAWYER` ή `NOTARY`
- `displayName`: Όνομα επαγγελματία
- `officeName`: Όνομα γραφείου (optional)
- `phone`: Τηλέφωνο
- `city`: Πόλη
- `areaTags`: Array με περιοχές (π.χ. `["Athens", "Palaio Faliro"]`)
  - **Σημείωση:** Το `city` προστίθεται αυτόματα στα `areaTags` κατά τη δημιουργία
- `languages`: Array με γλώσσες (π.χ. `["Greek", "English"]`)
- `registryNumber`: Αριθμός μητρώου (αποθηκεύεται στο `services.registryNumber`)
- `verificationStatus`: `VERIFIED` (auto-verified για professionals από `/professional/join`)
- `verifiedAt`: Timestamp verification
- `createdAt`: Timestamp δημιουργίας
- `updatedAt`: Timestamp τελευταίας ενημέρωσης

**Location:** `backend/src/routes/professionals.ts` - `POST /api/professionals/me`

### 3. ProfessionalAvailability Table (`professional_availability`)
Αν ο επαγγελματίας ορίσει διαθεσιμότητα, δημιουργείται ένα **ProfessionalAvailability** record με:
- `id`: Unique identifier
- `professionalId`: Foreign key στο `professional_profiles.id`
- `timezone`: Timezone (default: `Europe/Athens`)
- `weeklyRules`: JSON array με εβδομαδιαίους κανόνες
- `meetingTypes`: Array με τύπους συναντήσεων (π.χ. `["ONLINE", "IN_PERSON"]`)

**Location:** `backend/src/routes/professionals.ts` - `POST /api/professionals/availability`

## Registration Flow

### Step 1: User Registration
**Frontend:** `listings/frontend/src/app/professional/join/page.tsx`
```typescript
// POST /api/auth/register
{
  email: "lawyer@example.com",
  password: "password123",
  name: "Γιάννης Παπαδόπουλος",
  role: "LAWYER", // or "NOTARY"
  phone: "2101234567"
}
```

**Backend:** `backend/src/routes/auth.ts`
- Δημιουργεί User με `role = LAWYER` ή `NOTARY`
- Hash password με bcrypt
- Ελέγχει ότι το header `X-Professional-Registration: true` υπάρχει

### Step 2: Professional Profile Creation
**Frontend:** `listings/frontend/src/app/professional/join/page.tsx`
```typescript
// POST /api/professionals/me
{
  type: "LAWYER",
  displayName: "Γιάννης Παπαδόπουλος",
  officeName: "Νομικό Γραφείο Παπαδόπουλος",
  phone: "2101234567",
  city: "Αθήνα",
  areaTags: ["Αθήνα"],
  languages: ["Greek", "English"],
  registryNumber: "12345",
  availability: {
    timezone: "Europe/Athens",
    weeklyRules: [...],
    meetingTypes: ["ONLINE", "IN_PERSON"]
  }
}
```

**Backend:** `backend/src/routes/professionals.ts`
- Upsert ProfessionalProfile
- **Auto-verify:** `verificationStatus = 'VERIFIED'`, `verifiedAt = new Date()`
- Προσθέτει το `city` στα `areaTags` αν δεν υπάρχει ήδη
- Ενημερώνει το User role σε `LAWYER` ή `NOTARY`

## Retrieving All Professionals

### Current Search Endpoint
**Endpoint:** `GET /api/professionals/search`

**Query Parameters:**
- `type`: `LAWYER` ή `NOTARY` (required)
- `area`: Περιοχή αναζήτησης (optional)
- `propertyId`: ID property για area matching (optional)

**Backend Logic:** `backend/src/routes/professionals.ts`
```typescript
// Build where clause
const where: any = {
  type, // LAWYER or NOTARY
  // NO verificationStatus filter - shows all professionals
};

// Area matching: searches in both areaTags array AND city field
if (area || propertyAreaTags.length > 0) {
  const searchAreas = area ? [area, ...propertyAreaTags] : propertyAreaTags;
  where.OR = searchAreas.flatMap((a) => [
    { areaTags: { has: a } },
    { city: { contains: a, mode: 'insensitive' } }
  ]);
}
```

**Response:**
```json
{
  "professionals": [
    {
      "professionalId": "cmk5et8qp0001ny8gj9chgkk9",
      "userId": "cmk5et8qp0001ny8gj9chgkk8",
      "type": "LAWYER",
      "displayName": "Γιάννης Παπαδόπουλος",
      "officeName": "Νομικό Γραφείο Παπαδόπουλος",
      "city": "Αθήνα",
      "areaTags": ["Αθήνα", "Palaio Faliro"],
      "languages": ["Greek", "English"],
      "verifiedAt": "2024-01-15T10:30:00Z",
      "meetingTypes": ["ONLINE", "IN_PERSON"]
    }
  ]
}
```

### Frontend Usage
**Component:** `listings/frontend/src/components/deals/tabs/ProfessionalsTab.tsx`

```typescript
// Search with area filter
await searchProfessionals({
  type: 'LAWYER',
  area: 'Αθήνα',
  propertyId: deal.propertyId
});

// Search without area filter (show all)
await searchProfessionals({
  type: 'LAWYER',
  propertyId: deal.propertyId
  // No 'area' parameter = shows all professionals
});
```

## Key Points

1. **Auto-Verification:** Professionals από `/professional/join` είναι αυτόματα `VERIFIED`
2. **City in AreaTags:** Το `city` προστίθεται αυτόματα στα `areaTags` για καλύτερη αναζήτηση
3. **Case-Insensitive Search:** Η αναζήτηση στο `city` field είναι case-insensitive
4. **No Verification Filter:** Το search endpoint δεν φιλτράρει βάσει `verificationStatus` - εμφανίζει όλους τους professionals
5. **Area Matching:** Η αναζήτηση γίνεται τόσο στα `areaTags` όσο και στο `city` field

## Database Queries

### Get All Professionals (Any Status)
```sql
SELECT * FROM professional_profiles 
WHERE type = 'LAWYER' OR type = 'NOTARY';
```

### Get Verified Professionals Only
```sql
SELECT * FROM professional_profiles 
WHERE type = 'LAWYER' 
  AND verification_status = 'VERIFIED';
```

### Get Professionals by City
```sql
SELECT * FROM professional_profiles 
WHERE type = 'LAWYER' 
  AND (city ILIKE '%Αθήνα%' OR 'Αθήνα' = ANY(area_tags));
```

### Get Professional with User Info
```sql
SELECT 
  pp.*,
  u.email,
  u.name as user_name
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
WHERE pp.type = 'LAWYER';
```

## Utility Scripts

### List All Professionals
**Script:** `backend/scripts/list-all-professionals.js`

Αυτό το script μπορεί να χρησιμοποιηθεί για να δούμε όλους τους professionals στη βάση δεδομένων.

**Usage:**
```bash
# List all professionals
node scripts/list-all-professionals.js

# List only LAWYER professionals
node scripts/list-all-professionals.js LAWYER

# List only VERIFIED professionals
node scripts/list-all-professionals.js LAWYER VERIFIED

# List PENDING NOTARY professionals
node scripts/list-all-professionals.js NOTARY PENDING
```

**Output includes:**
- Professional profile details (ID, type, displayName, city, etc.)
- User information (email, role, createdAt)
- Verification status and timestamp
- Availability settings
- Registry number (from services)
- Summary statistics by type and verification status

## Troubleshooting

### Professionals Not Appearing in Search
1. **Check verificationStatus:** Αν θέλουμε να εμφανίζονται μόνο VERIFIED, προσθέτουμε filter
2. **Check city/areaTags:** Βεβαιωθείτε ότι το `city` είναι συμπληρωμένο
3. **Check type:** Βεβαιωθείτε ότι το `type` είναι `LAWYER` ή `NOTARY`
4. **Check area matching:** Αν αναζητάτε με `area`, βεβαιωθείτε ότι ταιριάζει με `city` ή `areaTags`
5. **Use list script:** Τρέξτε `node scripts/list-all-professionals.js` για να δείτε όλους τους professionals στη βάση

### Auto-Load Not Working
Στο `ProfessionalsTab.tsx`, το auto-load:
- Ενεργοποιείται μόνο για buyers και sellers
- Χρησιμοποιεί το `deal.property?.city` για αναζήτηση
- Αν το `city` είναι κενό, αναζητά όλους τους professionals (passes `null` as area)

### Debugging Registration Issues
1. **Check User creation:** Βεβαιωθείτε ότι ο User δημιουργήθηκε με σωστό role
2. **Check ProfessionalProfile:** Βεβαιωθείτε ότι το ProfessionalProfile δημιουργήθηκε με σωστά δεδομένα
3. **Check verificationStatus:** Professionals από `/professional/join` πρέπει να είναι `VERIFIED`
4. **Check city in areaTags:** Το `city` πρέπει να είναι στα `areaTags` για καλύτερη αναζήτηση
5. **Use list script:** Τρέξτε το script για να δείτε αν ο professional υπάρχει στη βάση
