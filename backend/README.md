# Real Estate Platform Backend

Express.js backend για το Real Estate Platform.

## Προαπαιτούμενα

- Node.js 18+
- PostgreSQL database
- npm ή yarn

## Εγκατάσταση

1. Εγκατάσταση dependencies:
```bash
cd backend
npm install
```

2. Δημιουργία `.env` file (αν δεν υπάρχει):
```bash
cp .env.example .env
```

3. Ρύθμιση του `.env` file:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key για JWT tokens
   - `PORT`: Port για το backend (default: 3001)
   - `FRONTEND_URL`: URL του frontend (default: http://localhost:3000)

4. Prisma setup:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (αν χρειάζεται)
npm run prisma:migrate
```

## Εκτέλεση

### Development
```bash
npm run dev
```

Το backend θα τρέξει στο `http://localhost:3001`

### Production
```bash
npm run build
npm start
```

## API Endpoints

Όλα τα endpoints είναι διαθέσιμα στο `/api/*`:

- `/api/auth` - Authentication
- `/api/properties` - Properties management
- `/api/seller` - Seller routes
- `/api/agent` - Agent routes
- `/api/buyer` - Buyer routes
- `/api/admin` - Admin routes
- `/api/notifications` - Notifications
- `/api/support` - Support tickets
- `/api/stripe` - Stripe payments
- και πολλά άλλα...

## Health Check

```bash
curl http://localhost:3001/health
```

## Database

Χρησιμοποιούμε Prisma ORM με PostgreSQL. Για να ανοίξετε το Prisma Studio:

```bash
npm run prisma:studio
```
