# Support Messaging System - Κέντρο Υποστήριξης

## Επισκόπηση

Το νέο Support Messaging System επιτρέπει στους χρήστες (buyers, sellers, agents) να επικοινωνούν αποκλειστικά με τον Admin για οποιοδήποτε θέμα αφορά ένα ακίνητο ή μια συναλλαγή.

## Χαρακτηριστικά

### Για Χρήστες (Buyers, Sellers, Agents)
- **Κέντρο Υποστήριξης**: Προσβάσιμο μέσω του dashboard κάθε ρόλου
- **Δημιουργία Tickets**: Δημιουργία νέων support tickets με κατηγοριοποίηση
- **Συνομιλία με Admin**: Real-time messaging με τον admin
- **Σύνδεση με Ακίνητα/Συναλλαγές**: Επιλογή συγκεκριμένου ακινήτου ή συναλλαγής
- **Κατηγοριοποίηση**: Διαφορετικές κατηγορίες για διαφορετικά θέματα

### Για Admin
- **Διαχείριση Tickets**: Προβολή και διαχείριση όλων των support tickets
- **Φιλτράρισμα**: Φιλτράρισμα ανά κατηγορία και κατάσταση
- **Απάντηση**: Απάντηση σε tickets και ενημέρωση κατάστασης
- **Στατιστικά**: Προβολή στατιστικών για όλα τα tickets

## Δομή Βάσης Δεδομένων

### SupportTicket Model
```prisma
model SupportTicket {
  id          String   @id @default(cuid())
  title       String
  description String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  category    TicketCategory
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  propertyId  String?
  property    Property? @relation(fields: [propertyId], references: [id])
  transactionId String?
  transaction Transaction? @relation(fields: [transactionId], references: [id])
  
  messages    SupportMessage[]
}
```

### SupportMessage Model
```prisma
model SupportMessage {
  id        String   @id @default(cuid())
  content   String
  isFromAdmin Boolean @default(false)
  createdAt DateTime @default(now())
  
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

### Enums
```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketCategory {
  PROPERTY_INQUIRY
  TRANSACTION_ISSUE
  TECHNICAL_SUPPORT
  ACCOUNT_ISSUE
  PAYMENT_ISSUE
  GENERAL
}
```

## API Endpoints

### Support Tickets
- `GET /api/support/tickets` - Λήψη όλων των tickets
- `POST /api/support/tickets` - Δημιουργία νέου ticket
- `GET /api/support/tickets/[id]` - Λήψη συγκεκριμένου ticket
- `PATCH /api/support/tickets/[id]` - Ενημέρωση ticket (μόνο admin)

### Support Messages
- `GET /api/support/messages?ticketId=[id]` - Λήψη μηνυμάτων για ticket
- `POST /api/support/messages` - Δημιουργία νέου μηνύματος

### User Data
- `GET /api/support/user-data` - Λήψη properties και transactions του χρήστη

## Χρήση

### Για Χρήστες

1. **Πρόσβαση στο Κέντρο Υποστήριξης**:
   - Buyer Dashboard: Tab "Μηνύματα"
   - Seller Dashboard: Tab "Υποστήριξη"
   - Agent Dashboard: Tab "Υποστήριξη"

2. **Δημιουργία Νέου Ticket**:
   - Κάντε κλικ στο "Νέο Μήνυμα"
   - Συμπληρώστε το θέμα και την περιγραφή
   - Επιλέξτε κατηγορία και προτεραιότητα
   - Προαιρετικά, επιλέξτε συγκεκριμένο ακίνητο ή συναλλαγή

3. **Συνομιλία**:
   - Επιλέξτε ένα ticket για να δείτε τη συνομιλία
   - Γράψτε μήνυμα και πατήστε "Αποστολή"

### Για Admin

1. **Πρόσβαση στο Admin Panel**:
   - Πλοήγηση στο `/admin/messages`

2. **Διαχείριση Tickets**:
   - Φιλτράρισμα ανά κατηγορία και κατάσταση
   - Αναζήτηση με κείμενο
   - Επιλογή ticket για προβολή λεπτομερειών

3. **Απάντηση**:
   - Επιλέξτε ticket
   - Γράψτε απάντηση
   - Ενημερώστε την κατάσταση του ticket

## Κατηγορίες Tickets

- **PROPERTY_INQUIRY**: Ερωτήσεις για συγκεκριμένο ακίνητο
- **TRANSACTION_ISSUE**: Προβλήματα με συναλλαγές
- **TECHNICAL_SUPPORT**: Τεχνικά προβλήματα
- **ACCOUNT_ISSUE**: Προβλήματα με λογαριασμό
- **PAYMENT_ISSUE**: Προβλήματα με πληρωμές
- **GENERAL**: Γενικά ερωτήματα

## Καταστάσεις Tickets

- **OPEN**: Ανοιχτό ticket
- **IN_PROGRESS**: Σε εξέλιξη
- **RESOLVED**: Επιλύθηκε
- **CLOSED**: Κλειστό

## Προτεραιότητες

- **LOW**: Χαμηλή προτεραιότητα
- **MEDIUM**: Μεσαία προτεραιότητα
- **HIGH**: Υψηλή προτεραιότητα
- **URGENT**: Επείγον

## Ασφάλεια

- Χρήστες μπορούν να δουν μόνο τα δικά τους tickets
- Admin μπορεί να δει όλα τα tickets
- Μόνο admin μπορεί να ενημερώσει την κατάσταση των tickets
- Όλα τα μηνύματα αποθηκεύονται με αναφορά στον αποστολέα

## Testing

Για να δοκιμάσετε το σύστημα:

```bash
cd listings/frontend
node test-support-system.js
```

## Εγκατάσταση

1. Εκτελέστε το migration:
```bash
npx prisma migrate dev --name add_support_messaging_system
```

2. Ενημερώστε το Prisma client:
```bash
npx prisma generate
```

3. Επανεκκινήστε τον development server:
```bash
npm run dev
```

## Σημειώσεις

- Το σύστημα είναι πλήρως responsive
- Υποστηρίζει real-time updates
- Όλα τα μηνύματα αποθηκεύονται με timestamp
- Το UI είναι φιλικό και εύκολο στη χρήση
- Υποστηρίζει όλους τους ρόλους χρηστών (BUYER, SELLER, AGENT, ADMIN) 