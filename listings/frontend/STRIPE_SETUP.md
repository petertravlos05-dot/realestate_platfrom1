# Stripe Setup Instructions

## 1. Stripe Account Setup

1. Δημιουργήστε λογαριασμό στο [Stripe](https://stripe.com)
2. Πηγαίνετε στο Dashboard > Developers > API keys
3. Αντιγράψτε τα API keys

## 2. Environment Variables

Προσθέστε τις παρακάτω μεταβλητές στο `.env` αρχείο σας:

```env
# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

## 3. Stripe Products & Prices Setup

### Δημιουργία Products στο Stripe Dashboard:

1. **Basic Plan**
   - Product Name: "Basic Plan"
   - Price: €29.99/month, €79.99/quarter
   - Price IDs: `price_basic_monthly`, `price_basic_quarterly`

2. **Pro Plan**
   - Product Name: "Pro Plan"
   - Price: €59.99/month, €159.99/quarter
   - Price IDs: `price_pro_monthly`, `price_pro_quarterly`

3. **Enterprise Plan**
   - Product Name: "Enterprise Plan"
   - Price: €99.99/month, €269.99/quarter
   - Price IDs: `price_enterprise_monthly`, `price_enterprise_quarterly`

### Ενημέρωση Database:

Αφού δημιουργήσετε τα products στο Stripe, ενημερώστε τη βάση δεδομένων:

```sql
UPDATE subscription_plans 
SET stripe_price_id = 'price_basic_monthly', 
    stripe_price_id_quarterly = 'price_basic_quarterly' 
WHERE name = 'Basic';

UPDATE subscription_plans 
SET stripe_price_id = 'price_pro_monthly', 
    stripe_price_id_quarterly = 'price_pro_quarterly' 
WHERE name = 'Pro';

UPDATE subscription_plans 
SET stripe_price_id = 'price_enterprise_monthly', 
    stripe_price_id_quarterly = 'price_enterprise_quarterly' 
WHERE name = 'Enterprise';
```

## 4. Webhook Setup

1. Πηγαίνετε στο Stripe Dashboard > Developers > Webhooks
2. Προσθέστε endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Επιλέξτε events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Αντιγράψτε το webhook secret

## 5. Testing

Χρησιμοποιήστε τα test cards του Stripe:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`
