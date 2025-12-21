# Οδηγός Migration Frontend → Backend

## Επισκόπηση

Βρέθηκαν **179 fetch calls** σε **122 διαφορετικά endpoints** που χρειάζονται ενημέρωση.

## Στρατηγική Migration

### 1. Helper Functions (Ήδη Δημιουργημένα)

```typescript
import { apiClient, fetchFromBackend, uploadToBackend, apiFetch } from '@/lib/api/client';
```

**Χρήση:**
- `apiClient.get/post/put/delete()` - για JSON requests με axios
- `fetchFromBackend()` - για fetch calls με JSON
- `uploadToBackend()` - για FormData uploads
- `apiFetch()` - universal helper (αυτόματα επιλέγει)

### 2. Παραδείγματα Αντικατάστασης

#### Παράδειγμα 1: GET Request
```typescript
// ΠΡΙΝ
const response = await fetch('/api/properties');
const data = await response.json();

// ΜΕΤΑ
import { fetchFromBackend } from '@/lib/api/client';
const response = await fetchFromBackend('/properties');
const data = await response.json();

// Ή με apiClient
import { apiClient } from '@/lib/api/client';
const { data } = await apiClient.get('/properties');
```

#### Παράδειγμα 2: POST Request με JSON
```typescript
// ΠΡΙΝ
const response = await fetch('/api/properties/interest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ propertyId })
});

// ΜΕΤΑ
import { apiClient } from '@/lib/api/client';
const response = await apiClient.post('/properties/interest', { propertyId });
```

#### Παράδειγμα 3: POST Request με FormData
```typescript
// ΠΡΙΝ
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/properties/images', {
  method: 'POST',
  body: formData
});

// ΜΕΤΑ
import { uploadToBackend } from '@/lib/api/client';
const formData = new FormData();
formData.append('file', file);
const response = await uploadToBackend('/properties/images', formData);
```

#### Παράδειγμα 4: PUT/DELETE Request
```typescript
// ΠΡΙΝ
const response = await fetch(`/api/properties/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// ΜΕΤΑ
import { apiClient } from '@/lib/api/client';
const response = await apiClient.put(`/properties/${id}`, data);
```

### 3. Query Parameters

```typescript
// ΠΡΙΝ
const params = new URLSearchParams({ status: 'active' });
const response = await fetch(`/api/properties?${params.toString()}`);

// ΜΕΤΑ
import { apiClient } from '@/lib/api/client';
const response = await apiClient.get('/properties', {
  params: { status: 'active' }
});
```

### 4. Template Strings με Variables

```typescript
// ΠΡΙΝ
const response = await fetch(`/api/properties/${propertyId}/view`);

// ΜΕΤΑ
import { fetchFromBackend } from '@/lib/api/client';
const response = await fetchFromBackend(`/properties/${propertyId}/view`);

// Ή
import { apiClient } from '@/lib/api/client';
const response = await apiClient.get(`/properties/${propertyId}/view`);
```

## Priority Files (Βασικά Components)

### Υψηλή Προτεραιότητα:
1. `app/properties/page.tsx` ✅ (Ήδη ενημερωμένο)
2. `components/PropertyForm.tsx` ✅ (Ήδη ενημερωμένο)
3. `app/admin/dashboard/page.tsx` - 50+ calls
4. `app/dashboard/seller/page.tsx` - 20+ calls
5. `app/dashboard/buyer/page.tsx` - 10+ calls
6. `app/dashboard/agent/page.tsx` - 15+ calls
7. `contexts/NotificationContext.tsx` - 5+ calls

### Μεσαία Προτεραιότητα:
- `components/support/SupportCenter.tsx`
- `components/leads/LeadDetailsModal.tsx`
- `app/admin/messages/page.tsx`
- `app/admin/transactions/page.tsx`

### Χαμηλή Προτεραιότητα:
- Landing pages
- Auth pages (μπορεί να παραμείνουν Next.js routes)
- Test pages

## Authentication

**Σημαντικό:** Το NextAuth μπορεί να συνεχίσει να χρησιμοποιεί τα Next.js API routes για session management, ή μπορείτε να το αλλάξετε να καλεί το backend.

**Επιλογές:**
1. **Να παραμείνει NextAuth με Next.js routes** (πιο απλό)
2. **Να καλεί το backend** `/api/auth/login` και `/api/auth/register`

## Environment Variables

Βεβαιωθείτε ότι έχετε `.env.local` στο `listings/frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing Checklist

Μετά την migration, ελέγξτε:

- [ ] Properties listing
- [ ] Property creation
- [ ] Property updates
- [ ] Authentication flows
- [ ] Admin dashboard
- [ ] Seller dashboard
- [ ] Buyer dashboard
- [ ] Agent dashboard
- [ ] Notifications
- [ ] Support tickets
- [ ] Transactions
- [ ] Appointments
- [ ] File uploads

## Troubleshooting

### CORS Errors
Αν βλέπετε CORS errors, ελέγξτε το `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 401 Unauthorized
- Ελέγξτε ότι το token αποθηκεύεται στο `localStorage.getItem('token')`
- Ελέγξτε ότι το token στέλνεται στο Authorization header

### 404 Not Found
- Ελέγξτε ότι το endpoint path είναι σωστό (χωρίς `/api/` prefix)
- Ελέγξτε ότι το backend τρέχει στο port 3001

## Automation Script

Για να κάνετε bulk replacement (προσοχή - δοκιμάστε πρώτα σε ένα file):

```bash
# Find and replace σε όλα τα .tsx/.ts files
find listings/frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|fetch('/api/|fetchFromBackend('/|g" {} \;
```

**Προσοχή:** Αυτό το script μπορεί να χρειάζεται manual fixes για template strings και FormData.





