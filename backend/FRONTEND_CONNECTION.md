# Σύνδεση Frontend με Backend

## Environment Variables

Δημιουργήστε ένα `.env.local` file στο `listings/frontend/` με τα εξής:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# JWT Secret (πρέπει να είναι ίδιο με το backend)
JWT_SECRET=Agapao_ton_stivo05

# Database (για NextAuth - συνεχίζει να χρησιμοποιεί Prisma)
DATABASE_URL=your_database_url_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# AWS S3 (αν χρησιμοποιείτε)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# Stripe (αν χρησιμοποιείτε)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Admin Key
NEXT_PUBLIC_ADMIN_KEY=your_admin_key_here
```

## Σημαντικές Σημειώσεις

### NextAuth (Authentication)
- Το **NextAuth συνεχίζει να χρησιμοποιεί τα Next.js API routes** για session management
- Τα routes `/api/auth/login` και `/api/auth/register` στο frontend μπορούν να παραμείνουν για NextAuth
- Ή μπορείτε να τα αλλάξετε να καλούν το backend `/api/auth/login` και `/api/auth/register`

### API Calls
- Χρησιμοποιήστε το `apiClient` από `@/lib/api/client` για JSON requests
- Χρησιμοποιήστε το `fetchFromBackend` για fetch calls
- Χρησιμοποιήστε το `uploadToBackend` για FormData uploads

### Παράδειγμα Χρήσης

```typescript
// JSON Request
import { apiClient } from '@/lib/api/client';
const response = await apiClient.get('/properties');
const data = await apiClient.post('/properties', propertyData);

// Fetch Request
import { fetchFromBackend } from '@/lib/api/client';
const response = await fetchFromBackend('/properties');
const data = await response.json();

// FormData Upload
import { uploadToBackend } from '@/lib/api/client';
const formData = new FormData();
formData.append('file', file);
const response = await uploadToBackend('/properties/images', formData);
```

## Migration Checklist

- [x] Ενημέρωση `apiClient` baseURL
- [x] Προσθήκη `fetchFromBackend` helper
- [x] Προσθήκη `uploadToBackend` helper
- [ ] Ενημέρωση όλων των `fetch('/api/...')` calls
- [ ] Έλεγχος authentication flows
- [ ] Testing όλων των endpoints

## Backend Endpoints

Όλα τα endpoints είναι διαθέσιμα στο:
- Development: `http://localhost:3001/api`
- Production: `https://your-backend-url.com/api`

### Βασικά Endpoints:
- `/api/auth/*` - Authentication
- `/api/properties/*` - Properties management
- `/api/seller/*` - Seller specific
- `/api/agent/*` - Agent specific
- `/api/buyer/*` - Buyer specific
- `/api/admin/*` - Admin specific
- `/api/appointments/*` - Appointments
- `/api/transactions/*` - Transactions
- `/api/support/*` - Support tickets
- `/api/notifications/*` - Notifications
- `/api/referrals/*` - Referrals
- `/api/stripe/*` - Stripe payments
- `/api/subscriptions/*` - Subscriptions













