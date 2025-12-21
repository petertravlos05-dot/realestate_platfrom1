# Support Center - Επιλογή Ρόλου

## Επισκόπηση

Η νέα λειτουργικότητα επιλογής ρόλου στο SupportCenter επιτρέπει στους χρήστες να επιλέγουν τον ρόλο με τον οποίο θέλουν να στείλουν μήνυμα στον admin, πριν επιλέξουν συγκεκριμένο ακίνητο ή συναλλαγή.

## Χαρακτηριστικά

### Επιλογή Ρόλου
- **Αγοραστής (Buyer)**: Επιτρέπει την επιλογή από ακίνητα που έχει εκδηλώσει ενδιαφέρον (όπως φαίνονται στο buyer dashboard)
- **Πωλητής (Seller)**: Επιτρέπει την επιλογή από ακίνητα που έχει καταχωρήσει (όπως φαίνονται στο seller dashboard)
- **Μεσιτευόμενος (Agent)**: Επιτρέπει την επιλογή από συναλλαγές που είναι agent και φαίνονται μόνο στο agent dashboard

### Ροή Εργασίας
1. Ο χρήστης πατάει "Νέο Μήνυμα" στο SupportCenter
2. Επιλέγει τον ρόλο (Buyer/Seller/Agent) από τα κουμπιά
3. Το σύστημα φορτώνει αυτόματα τα σχετικά δεδομένα για τον επιλεγμένο ρόλο:
   - **Buyer**: Ακίνητα που έχει εκδηλώσει ενδιαφέρον
   - **Seller**: Ακίνητα που έχει καταχωρήσει
   - **Agent**: Συναλλαγές που είναι agent (όχι ακίνητα)
4. Ο χρήστης συμπληρώνει τα υπόλοιπα πεδία (τίτλος, περιγραφή, κλπ.)
5. Επιλέγει προαιρετικά συγκεκριμένο ακίνητο ή συναλλαγή από τη λίστα του ρόλου του

## Τεχνική Υλοποίηση

### State Management
```typescript
const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | 'agent' | ''>('');
const [roleSpecificProperties, setRoleSpecificProperties] = useState<Property[]>([]);
const [roleSpecificTransactions, setRoleSpecificTransactions] = useState<Transaction[]>([]);
```

### API Endpoint
- **GET /api/support/user-data?role={role}**: Φορτώνει δεδομένα βάσει ρόλου
- Υποστηρίζει query parameter `role` για επιλογή ρόλου
- Επιστρέφει properties και transactions για τον επιλεγμένο ρόλο

### UI Components
- **Role Selection Buttons**: Τρία κουμπιά με εικονίδια και χρώματα για κάθε ρόλο
- **Conditional Fields**: Τα πεδία εμφανίζονται μόνο μετά την επιλογή ρόλου
- **Dynamic Dropdowns**: Λίστες ακινήτων και συναλλαγών που αλλάζουν βάσει ρόλου

## Χρήση

### Για Χρήστες
1. Ανοίξτε το SupportCenter στο dashboard σας
2. Πατήστε "Νέο Μήνυμα"
3. Επιλέξτε τον ρόλο με τον οποίο θέλετε να επικοινωνήσετε
4. Συμπληρώστε τα υπόλοιπα πεδία
5. Επιλέξτε προαιρετικά συγκεκριμένο ακίνητο ή συναλλαγή
6. Πατήστε "Δημιουργία Ερωτήματος"

### Για Developers
- Η λειτουργικότητα είναι ενσωματωμένη στο `SupportCenter.tsx`
- Το API endpoint βρίσκεται στο `/api/support/user-data/route.ts`
- Χρησιμοποιεί το υπάρχον Prisma schema

## Πλεονεκτήματα

1. **Καλύτερη Οργάνωση**: Οι χρήστες μπορούν να διαχωρίσουν τα θέματα βάσει ρόλου
2. **Σχετικότητα**: Εμφανίζονται μόνο τα σχετικά ακίνητα και συναλλαγές
3. **Ευκολία Χρήσης**: Διαισθητική επιλογή ρόλου με οπτικά στοιχεία
4. **Ευελιξία**: Οι χρήστες μπορούν να αλλάξουν ρόλο ανά πάσα στιγμή

## Σχετικά Αρχεία

- `src/components/support/SupportCenter.tsx` - Κύριο component
- `src/app/api/support/user-data/route.ts` - API endpoint
- `src/app/dashboard/buyer/page.tsx` - Buyer dashboard integration
- `src/app/dashboard/seller/page.tsx` - Seller dashboard integration
- `src/app/dashboard/agent/page.tsx` - Agent dashboard integration 