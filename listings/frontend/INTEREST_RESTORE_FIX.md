# Διόρθωση Προβλήματος Επαναφοράς Ενδιαφέροντος

## Το Πρόβλημα

Όταν ένας χρήστης ακυρώνει το ενδιαφέρον του για ένα ακίνητο από το buyer dashboard και μετά ξαναεκδηλώνει ενδιαφέρον, εμφανιζόταν το μήνυμα "δεν βρέθηκε συναλλαγή για αυτό το ακίνητο" όταν προσπαθούσε να δει την πρόοδο.

### Αιτία του Προβλήματος

1. **Ακύρωση Ενδιαφέροντος**: Όταν ακυρώνεται το ενδιαφέρον, το transaction γίνεται `CANCELLED` και `interestCancelled: true`
2. **Επαναφορά Ενδιαφέροντος**: Όταν ξαναεκδηλώνεται ενδιαφέρον, δημιουργείτο ένα **νέο** transaction με διαφορετικό ID
3. **LeadDetailsModal**: Το modal ψάχνει το παλιό transaction ID που δεν υπάρχει πλέον

## Η Λύση

### 1. Επαναφορά Ακυρωμένων Transactions

Τροποποιήθηκε ο κώδικας ώστε όταν ξαναεκδηλώνεται ενδιαφέρον:

- **Έλεγχος για ακυρωμένα transactions**: Ψάχνει για transactions με `status: 'CANCELLED'` και `interestCancelled: true`
- **Επαναφορά**: Αν βρεθεί ακυρωμένο transaction, το επαναφέρει αντί να δημιουργεί νέο
- **Διατήρηση ID**: Το ίδιο transaction ID διατηρείται, οπότε το LeadDetailsModal λειτουργεί σωστά

### 2. Ενημερωμένα Endpoints

#### `/api/buyer/interested-properties` (POST)
```javascript
// Έλεγχος αν υπάρχει ακυρωμένο transaction
const cancelledTransaction = await prisma.transaction.findFirst({
  where: {
    propertyId,
    buyerId: session.user.id,
    status: 'CANCELLED',
    interestCancelled: true
  }
});

if (cancelledTransaction) {
  // Επαναφορά του ακυρωμένου transaction
  transaction = await prisma.transaction.update({
    where: { id: cancelledTransaction.id },
    data: {
      status: 'INTERESTED',
      stage: 'PENDING',
      interestCancelled: false
    }
  });
}
```

#### `/api/buyer/properties/[property_id]/express-interest` (POST)
Παρόμοια λογική εφαρμόστηκε και σε αυτό το endpoint.

### 3. Βελτιωμένο Error Handling

Ενημερώθηκε το μήνυμα σφάλματος στο buyer dashboard:

- **Περιγραφικό μήνυμα**: Εξηγεί πιθανές αιτίες του προβλήματος
- **Κουμπί ανανέωσης**: Επιτρέπει στον χρήστη να ανανεώσει τα δεδομένα
- **Καλύτερο UI**: Πιο φιλικό και κατανοητό μήνυμα σφάλματος

### 4. Σωστή Εμφάνιση Σταδίου

Επιλύθηκε το πρόβλημα με την εμφάνιση του σταδίου:

- **Επαναφορά Progress**: Όταν επαναφέρεται transaction, ενημερώνεται και το τελευταίο progress entry
- **Σωστό Στάδιο**: Εμφανίζεται "Αναμονή για ραντεβού" (PENDING) αντί για "Ακυρώθηκε" (CANCELLED)
- **Συνέπεια UI**: Το στάδιο εμφανίζεται σωστά τόσο στις κάρτες όσο και στο LeadDetailsModal
- **Seller Dashboard**: Επιλύθηκε το ίδιο πρόβλημα και στο seller dashboard
- **Επιπλέον Έλεγχοι**: Προστέθηκαν επιπλέον έλεγχοι για transaction.stage και transaction.status
- **Debug Logging**: Προστέθηκε debug logging για καλύτερη παρακολούθηση του προβλήματος
- **Απλοποίηση Λογικής**: Αν το transaction.status είναι INTERESTED, εμφανίζεται πάντα PENDING
- **Επιπλέον Debug Logging**: Προστέθηκε logging για καλύτερη παρακολούθηση του προβλήματος
- **Αποφυγή Caching**: Προστέθηκε `cache: 'no-store'` για να αποφύγουμε caching issues
- **Βελτίωση Μηνύματος Ακύρωσης**: Το μήνυμα ακύρωσης ενδιαφέροντος τώρα αναφέρει ότι η επαναφορά θα γίνει με τον προηγούμενο μεσίτη

### 5. Ενημερωμένο GET Endpoint

Τροποποιήθηκε το query για να επιστρέφει και επαναφερμένα transactions:

```javascript
transactions: {
  where: {
    buyerId: userId,
    OR: [
      { NOT: { status: 'CANCELLED' } },
      { AND: [{ status: 'CANCELLED' }, { interestCancelled: false }] }
    ]
  }
}
```

## Οφέλη της Λύσης

1. **Διατήρηση Ιστορικού**: Το ίδιο transaction ID διατηρείται
2. **Σωστή Λειτουργία**: Το LeadDetailsModal λειτουργεί σωστά μετά την επαναφορά
3. **Καλύτερη Εμπειρία Χρήστη**: Δεν εμφανίζονται πλέον σφάλματα
4. **Συνέπεια Δεδομένων**: Διατηρείται η ιστορικότητα των συναλλαγών

## Testing

Για να ελέγξετε τη λύση:

1. Εκδηλώστε ενδιαφέρον για ένα ακίνητο
2. Ακυρώστε το ενδιαφέρον
3. Ξαναεκδηλώστε ενδιαφέρον
4. Πατήστε "Πρόοδος" - θα πρέπει να λειτουργεί σωστά

## Αρχεία που Τροποποιήθηκαν

- `listings/frontend/src/app/api/buyer/interested-properties/route.ts`
- `listings/frontend/src/app/api/buyer/properties/[property_id]/express-interest/route.ts`
- `listings/frontend/src/app/dashboard/buyer/page.tsx`
- `listings/frontend/src/app/api/seller/leads/route.ts`
- `listings/frontend/src/app/dashboard/seller/page.tsx`
- `listings/frontend/src/components/leads/LeadDetailsModal.tsx`
