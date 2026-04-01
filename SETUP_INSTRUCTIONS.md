# Οδηγίες Εγκατάστασης και Εκτέλεσης

## 1. Backend Setup

### Βήμα 1: Εγκατάσταση Dependencies
```bash
cd backend
npm install
```

### Βήμα 2: Ρύθμιση Environment Variables

**Δημιουργήστε το `.env` file από το `.env.example`:**

```bash
cd backend
cp .env.example .env
```

Στη συνέχεια, επεξεργαστείτε το `.env` file και συμπληρώστε τις τιμές:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/realestate_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

**Σημαντικό:** 
- Αλλάξτε το `DATABASE_URL` με τα δικά σας credentials της PostgreSQL database.
- Το `JWT_SECRET` **ΠΡΕΠΕΙ** να είναι τουλάχιστον 32 χαρακτήρες για ασφάλεια.
- Για να δημιουργήσετε έναν ισχυρό JWT_SECRET, δείτε: `backend/GENERATE_JWT_SECRET.md`
- **ΠΡΟΣΟΧΗ:** Το backend δεν θα ξεκινήσει αν το JWT_SECRET είναι μικρότερο από 32 χαρακτήρες!
- **ΜΗΝ** commit-άρετε το `.env` file στο git - είναι ήδη στο `.gitignore`

### Βήμα 3: Prisma Setup
```bash
cd backend
npm run prisma:generate
```

Αν χρειάζεται να τρέξετε migrations:
```bash
npm run prisma:migrate
```

### Βήμα 4: Εκκίνηση Backend
```bash
cd backend
npm run dev
```

Το backend θα τρέξει στο **http://localhost:3001**

## 2. Frontend Setup

### Βήμα 1: Ρύθμιση Environment Variables

**Δημιουργήστε το `.env.local` file από το `.env.example`:**

```bash
cd listings/frontend
cp .env.example .env.local
```

Στη συνέχεια, επεξεργαστείτε το `.env.local` file και συμπληρώστε τις τιμές:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/realestate_db?schema=public
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

**Σημαντικό:**
- Το `JWT_SECRET` πρέπει να είναι **το ίδιο** με το backend JWT_SECRET
- Το `DATABASE_URL` πρέπει να είναι **το ίδιο** με το backend DATABASE_URL
- Αν δεν ορίσετε `NEXT_PUBLIC_API_URL`, το frontend θα χρησιμοποιήσει το default `http://localhost:3001`
- **ΜΗΝ** commit-άρετε το `.env.local` file στο git

### Βήμα 2: Εκκίνηση Frontend
```bash
cd listings/frontend
npm install  # αν δεν έχετε κάνει ήδη
npm run dev
```

Το frontend θα τρέξει στο **http://localhost:3000**

## 3. Έλεγχος Σύνδεσης

1. **Backend Health Check:**
   - Ανοίξτε browser: http://localhost:3001/health
   - Θα πρέπει να δείτε: `{ "status": "ok", "timestamp": "..." }`

2. **Frontend:**
   - Ανοίξτε browser: http://localhost:3000
   - Το frontend θα συνδέεται αυτόματα με το backend

## 4. Troubleshooting

### Backend δεν ξεκινάει:
- Ελέγξτε αν το PORT 3001 είναι διαθέσιμο
- Ελέγξτε το `.env` file
- Ελέγξτε αν η database είναι running και το `DATABASE_URL` είναι σωστό

### Frontend δεν συνδέεται με Backend:
- Ελέγξτε αν το backend τρέχει στο port 3001
- Ελέγξτε το `NEXT_PUBLIC_API_URL` στο `.env.local`
- Ελέγξτε τα browser console για CORS errors

### Database Errors:
- Βεβαιωθείτε ότι η PostgreSQL database είναι running
- Ελέγξτε το `DATABASE_URL` στο backend `.env`
- Τρέξτε `npm run prisma:generate` στο backend directory

## 5. Production Deployment

Για deployment στο Render ή άλλο platform:

### Backend:
1. Set environment variables στο Render
2. Build: `npm run build`
3. Start: `npm start`

### Frontend:
1. Set `NEXT_PUBLIC_API_URL` στο environment variables
2. Build: `npm run build`
3. Start: `npm start`

## Σημαντικές Σημειώσεις

- Το backend και το frontend πρέπει να τρέχουν **ταυτόχρονα**
- Το backend πρέπει να ξεκινήσει **πρώτο**
- Όλα τα API calls από το frontend πηγαίνουν στο `http://localhost:3001/api`
- Το authentication token αποθηκεύεται στο `localStorage` ως `token`

















