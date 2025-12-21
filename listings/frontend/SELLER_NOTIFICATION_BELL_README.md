# SellerNotificationBell - Οδηγίες Χρήσης

## Περιγραφή
Το `SellerNotificationBell` είναι ένα εξειδικευμένο component για ειδοποιήσεις που εμφανίζεται στις σελίδες των sellers. Εμφανίζεται πάνω δεξιά στο navigation bar και δείχνει μόνο τις ειδοποιήσεις που είναι σχετικές με sellers.

## Τοποθεσίες όπου εμφανίζεται
- `http://localhost:3004/seller` - Seller Landing Page
- `http://localhost:3004/seller/properties` - Seller Properties Page  
- `http://localhost:3004/dashboard/seller` - Seller Dashboard

## Τύποι Ειδοποιήσεων που Υποστηρίζονται

### 1. SELLER_INTEREST
- **Περιγραφή**: Όταν ένας buyer δείχνει ενδιαφέρον για ένα ακίνητο
- **Icon**: Καρδιά (πράσινη)
- **Παράδειγμα**: "Ο χρήστης Γιώργος ενδιαφέρθηκε για το ακίνητό σας 'Διαμέρισμα στο Κέντρο'"

### 2. SELLER_APPOINTMENT
- **Περιγραφή**: Όταν δημιουργείται νέο ραντεβού
- **Icon**: Ημερολόγιο (μπλε)
- **Παράδειγμα**: "Νέο ραντεβού για το ακίνητό σας 'Διαμέρισμα στο Κέντρο' με τον Γιώργο στις 15/01/2024 στις 14:00"

### 3. SELLER_OFFER
- **Περιγραφή**: Όταν ένας buyer κάνει προσφορά
- **Icon**: Ευρώ (κίτρινο)
- **Παράδειγμα**: "Ο Γιώργος έκανε προσφορά €150,000 για το ακίνητό σας 'Διαμέρισμα στο Κέντρο'"

### 4. SELLER_TRANSACTION
- **Περιγραφή**: Ενημερώσεις για την πορεία της συναλλαγής
- **Icon**: Επιτυχία (μωβ)
- **Παράδειγμα**: "Η συναλλαγή για το 'Διαμέρισμα στο Κέντρο' προχώρησε στο στάδιο 'Υπογραφή Συμβολαίου'"

### 5. SELLER_GENERAL
- **Περιγραφή**: Γενικές ειδοποιήσεις για sellers
- **Icon**: Πληροφορίες (γκρι)
- **Παράδειγμα**: "Το ακίνητό σας 'Διαμέρισμα στο Κέντρο' εμφανίστηκε σε 50 αναζητήσεις σήμερα"

## API Endpoints

### 1. Λήψη Seller Notifications
```http
GET /api/notifications/seller
```

### 2. Δημιουργία Seller Notification
```http
POST /api/notifications/seller
Content-Type: application/json

{
  "type": "SELLER_INTEREST",
  "message": "Ο Γιώργος έδειξε ενδιαφέρον για το ακίνητό σας",
  "metadata": {
    "propertyId": "123",
    "buyerName": "Γιώργος",
    "propertyTitle": "Διαμέρισμα στο Κέντρο",
    "recipient": "seller"
  },
  "title": "Νέο Ενδιαφέρον"
}
```

### 3. Δημιουργία Ραντεβού με Ειδοποίηση
```http
POST /api/seller/appointments/create
Content-Type: application/json

{
  "propertyId": "123",
  "buyerId": "456",
  "date": "2024-01-15",
  "time": "14:00"
}
```

## Utility Functions

### Δημιουργία Ειδοποιήσεων
```typescript
import { 
  createSellerInterestNotification,
  createSellerAppointmentNotification,
  createSellerOfferNotification,
  createSellerTransactionNotification,
  createSellerGeneralNotification
} from '@/lib/utils/sellerNotifications';

// Ενδιαφέρον
await createSellerInterestNotification(
  propertyId,
  buyerName,
  propertyTitle
);

// Ραντεβού
await createSellerAppointmentNotification(
  appointmentId,
  buyerName,
  propertyTitle,
  date,
  time
);

// Προσφορά
await createSellerOfferNotification(
  leadId,
  buyerName,
  propertyTitle,
  offerAmount
);

// Συναλλαγή
await createSellerTransactionNotification(
  transactionId,
  propertyTitle,
  stage,
  message
);

// Γενική ειδοποίηση
await createSellerGeneralNotification(
  message,
  title,
  metadata
);
```

## Χρήση στο Code

### 1. Import το Component
```typescript
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
```

### 2. Προσθήκη στο Navigation
```typescript
<div className="flex items-center space-x-4">
  <SellerNotificationBell />
  <Link href="/dashboard/seller">Dashboard</Link>
  {/* Άλλα navigation items */}
</div>
```

## Αυτόματη Δημιουργία Ειδοποιήσεων

### Όταν ένας Buyer δείχνει Ενδιαφέρον
Το API endpoint `/api/buyer/properties/[property_id]/express-interest` αυτόματα δημιουργεί ειδοποίηση τύπου `SELLER_INTEREST` για τον seller.

### Όταν δημιουργείται Ραντεβού
Το API endpoint `/api/seller/appointments/create` αυτόματα δημιουργεί ειδοποίηση τύπου `SELLER_APPOINTMENT` για τον seller.

## Διαφορά από το Κανονικό NotificationBell

| Χαρακτηριστικό | NotificationBell | SellerNotificationBell |
|----------------|------------------|------------------------|
| Εμφάνιση | Όλες οι σελίδες | Μόνο σελίδες sellers |
| Φιλτράρισμα | Όλες οι ειδοποιήσεις | Μόνο seller ειδοποιήσεις |
| Τύποι | Όλοι οι τύποι | SELLER_* τύποι μόνο |
| Routing | Buyer dashboard | Seller dashboard |
| Τίτλος | "Ειδοποιήσεις" | "Ειδοποιήσεις Πωλητή" |

## Προσαρμογές

### Προσθήκη Νέου Τύπου Ειδοποίησης
1. Προσθήκη του τύπου στο `SellerNotificationBell.tsx`
2. Προσθήκη icon στο `getNotificationIcon()`
3. Προσθήκη τίτλου στο `getNotificationTitle()`
4. Προσθήκη φιλτραρίσματος στο `sellerNotifications.filter()`

### Προσθήκη σε Νέα Σελίδα
1. Import το component
2. Προσθήκη στο navigation section
3. Τοποθέτηση πάνω δεξιά

## Troubleshooting

### Ειδοποίησεις δεν εμφανίζονται
1. Έλεγχος αν ο χρήστης είναι seller
2. Έλεγχος αν υπάρχουν ειδοποιήσεις τύπου SELLER_*
3. Έλεγχος του NotificationContext

### Linter Errors
1. Έλεγχος των imports
2. Έλεγχος των types
3. Έλεγχος του Prisma schema

## Παραδείγματα Χρήσης

### Στο Seller Dashboard
```typescript
// Όταν ένας buyer κάνει προσφορά
if (offerReceived) {
  await createSellerOfferNotification(
    lead.id,
    buyer.name,
    property.title,
    offer.amount
  );
}
```

### Στο Properties Page
```typescript
// Όταν δημιουργείται νέο ραντεβού
if (appointmentCreated) {
  await createSellerAppointmentNotification(
    appointment.id,
    buyer.name,
    property.title,
    appointment.date,
    appointment.time
  );
}
``` 