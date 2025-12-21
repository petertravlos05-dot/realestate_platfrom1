# Σύστημα Συνδρομητικών Πλάνων - Οδηγίες Χρήσης

## Επισκόπηση

Το σύστημα συνδρομητικών πλάνων επιτρέπει στους χρήστες να εγγραφούν ως:
- **Ιδιώτες**: Μπορούν να καταχωρούν ακίνητα χωρίς περιορισμούς
- **Μεσιτικές Εταιρείες**: Χρειάζονται συνδρομητικό πλάνο για να καταχωρούν ακίνητα

## Χαρακτηριστικά

### 1. Σελίδα Εγγραφής (`/seller/auth/register`)

#### Επιλογή Τύπου Χρήστη
- **Ιδιώτης**: Εμφανίζονται τα κανονικά πεδία εγγραφής
- **Μεσιτική Εταιρεία**: Εμφανίζονται τα συνδρομητικά πλάνα

#### Συνδρομητικά Πλάνα
- **Basic**: €29.99/μήνα, €79.99/τρίμηνο - 10 ακίνητα
- **Pro**: €59.99/μήνα, €159.99/τρίμηνο - 50 ακίνητα  
- **Enterprise**: €99.99/μήνα, €269.99/τρίμηνο - 200 ακίνητα

#### Πληρωμή
- Stripe Checkout integration
- Μηνιαία ή τριμηνιαία χρέωση
- Δυνατότητα εγγραφής χωρίς άμεση πληρωμή

### 2. Έλεγχος Συνδρομής (`/add-listing`)

#### Για Ιδιώτες
- Επιτρέπεται προσθήκη ακινήτων χωρίς περιορισμούς

#### Για Μεσιτικές Εταιρείες
- **Χωρίς συνδρομή**: Εμφανίζεται μήνυμα που ζητά συνδρομή
- **Με συνδρομή**: Επιτρέπεται προσθήκη μέχρι το όριο του πλάνου
- **Όριο φτάσει**: Εμφανίζεται μήνυμα για αναβάθμιση πλάνου

## API Endpoints

### Συνδρομητικά Πλάνα
- `GET /api/subscription-plans` - Λήψη πλάνων
- `POST /api/subscription-plans` - Δημιουργία πλάνου (admin)

### Συνδρομές
- `GET /api/subscriptions` - Λήψη συνδρομής χρήστη
- `POST /api/subscriptions` - Δημιουργία συνδρομής

### Stripe
- `POST /api/stripe/create-checkout-session` - Δημιουργία checkout session
- `POST /api/stripe/webhook` - Webhook για Stripe events

### Χρήστης
- `GET /api/user/profile` - Λήψη προφίλ χρήστη

## Database Schema

### SubscriptionPlan
```sql
- id: String (Primary Key)
- name: String (Basic, Pro, Enterprise)
- description: String
- price: Float (μηνιαία τιμή)
- priceQuarterly: Float (τριμηνιαία τιμή)
- maxProperties: Int (μέγιστος αριθμός ακινήτων)
- benefits: String[] (λίστα benefits)
- stripePriceId: String (Stripe Price ID μηνιαία)
- stripePriceIdQuarterly: String (Stripe Price ID τριμηνιαία)
- isActive: Boolean
```

### Subscription
```sql
- id: String (Primary Key)
- userId: String (Foreign Key)
- planId: String (Foreign Key)
- status: String (ACTIVE, CANCELLED, EXPIRED, PENDING)
- billingCycle: String (MONTHLY, QUARTERLY)
- stripeSubscriptionId: String
- stripeCustomerId: String
- currentPeriodStart: DateTime
- currentPeriodEnd: DateTime
- cancelAtPeriodEnd: Boolean
```

### User (Ενημερωμένο)
```sql
- userType: String (INDIVIDUAL, COMPANY)
- subscription: Subscription (One-to-One relation)
```

## Stripe Setup

### 1. Environment Variables
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 2. Products & Prices στο Stripe
Δημιουργήστε τα παρακάτω products στο Stripe Dashboard:

**Basic Plan**
- Monthly: €29.99
- Quarterly: €79.99

**Pro Plan**  
- Monthly: €59.99
- Quarterly: €159.99

**Enterprise Plan**
- Monthly: €99.99
- Quarterly: €269.99

### 3. Webhook Events
Ρυθμίστε webhook για τα παρακάτω events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Testing

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Scenarios
1. **Ιδιώτης**: Εγγραφή και προσθήκη ακινήτου
2. **Εταιρεία χωρίς συνδρομή**: Εγγραφή και προσπάθεια προσθήκης ακινήτου
3. **Εταιρεία με συνδρομή**: Πληρωμή και προσθήκη ακινήτου
4. **Όριο ακινήτων**: Προσθήκη ακινήτων μέχρι το όριο

## Deployment Notes

1. Ρυθμίστε τις Stripe environment variables
2. Δημιουργήστε τα products στο Stripe Dashboard
3. Ενημερώστε τη βάση δεδομένων με τα Stripe Price IDs
4. Ρυθμίστε το webhook endpoint
5. Δοκιμάστε τη ροή πληρωμής

## Support

Για ερωτήσεις ή προβλήματα, επικοινωνήστε με την ομάδα ανάπτυξης.
