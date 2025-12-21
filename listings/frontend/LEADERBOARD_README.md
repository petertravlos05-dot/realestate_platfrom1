# 🏆 Referral Leaderboard System

## Επισκόπηση

Το Referral Leaderboard System επιτρέπει στους agents να δουν τη θέση τους σε σχέση με άλλους agents στην πλατφόρμα, βασισμένο στους πόντους που έχουν κερδίσει μέσω του referral system.

## Χαρακτηριστικά

### Για Agents
- **Προβολή Top 10 Agents**: Λίστα με τους καλύτερους agents με βάση τους πόντους
- **Προσωπική Θέση**: Εμφάνιση της θέσης του τρέχοντος agent
- **Στατιστικά**: Πόντοι, referrals, και ακίνητα ανά agent
- **Real-time Updates**: Ανανέωση δεδομένων σε πραγματικό χρόνο

### UI Features
- **Ranking Badges**: Χρυσά, ασημένια, και χάλκινα μετάλλια για τις πρώτες 3 θέσεις
- **Gradient Backgrounds**: Διαφορετικά χρώματα για κάθε θέση
- **Agent Profiles**: Προβολή εικόνας, ονόματος και email
- **Στατιστικά**: Πόντοι, referrals, και ακίνητα σε εύκολη προβολή

## Δομή Βάσης Δεδομένων

### Referral Model
```prisma
model Referral {
  id            String   @id @default(cuid())
  referrerId    String   // Ο agent που κάνει το referral
  referredId    String   // Ο χρήστης που εγγράφεται
  referralCode  String   @unique
  isActive      Boolean  @default(true)
  totalPoints   Int      @default(0)
  propertiesAdded Int    @default(0)
  totalArea     Float    @default(0)
  // ... άλλα πεδία
}
```

### ReferralPoints Model
```prisma
model ReferralPoints {
  id          String   @id @default(cuid())
  referralId  String
  userId      String   // Ο χρήστης στον οποίο ανήκουν οι πόντοι
  points      Int
  reason      String   // "registration", "property_added", κλπ.
  // ... άλλα πεδία
}
```

## API Endpoints

### Leaderboard API
- **`GET /api/referrals/leaderboard`** - Λήψη top 10 agents και θέσης τρέχοντος χρήστη

#### Response Format
```json
{
  "leaderboard": [
    {
      "id": "user_id",
      "name": "Agent Name",
      "email": "agent@email.com",
      "role": "AGENT",
      "image": "profile_image_url",
      "totalPoints": 15000,
      "totalReferrals": 5,
      "propertiesAdded": 3,
      "lastActivity": "2024-01-15T10:30:00Z",
      "rank": 1
    }
  ],
  "currentUser": {
    "id": "current_user_id",
    "name": "Current User Name",
    "totalPoints": 8000,
    "totalReferrals": 3,
    "propertiesAdded": 2,
    "rank": 5
  },
  "totalAgents": 25
}
```

## SQL Queries

### Top 10 Agents Query
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.image,
  COALESCE(SUM(rp.points), 0) as "totalPoints",
  COUNT(DISTINCT r.id) as "totalReferrals",
  COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
  MAX(rp."createdAt") as "lastActivity"
FROM users u
LEFT JOIN referral_points rp ON u.id = rp."userId"
LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
WHERE u.role = 'AGENT' AND u.id != ${currentUserId}
GROUP BY u.id, u.name, u.email, u.role, u.image
HAVING COALESCE(SUM(rp.points), 0) > 0
ORDER BY "totalPoints" DESC, "totalReferrals" DESC
LIMIT 10
```

### Current User Rank Query
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.image,
  COALESCE(SUM(rp.points), 0) as "totalPoints",
  COUNT(DISTINCT r.id) as "totalReferrals",
  COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
  MAX(rp."createdAt") as "lastActivity",
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(rp.points), 0) DESC, COUNT(DISTINCT r.id) DESC) as "rank"
FROM users u
LEFT JOIN referral_points rp ON u.id = rp."userId"
LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
WHERE u.role = 'AGENT'
GROUP BY u.id, u.name, u.email, u.role, u.image
HAVING u.id = ${currentUserId}
```

## Χρήση στη Σελίδα Agent Profile

### Προσθήκη στο Referrals Tab
Το leaderboard εμφανίζεται στο κάτω μέρος του "Rewards" tab στη σελίδα agent profile.

### State Management
```typescript
const [leaderboardData, setLeaderboardData] = useState<any>(null);
const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
```

### Fetch Function
```typescript
const fetchLeaderboard = async () => {
  if (!session?.user?.id) return;
  
  setLoadingLeaderboard(true);
  try {
    const response = await fetch('/api/referrals/leaderboard');
    if (response.ok) {
      const data = await response.json();
      setLeaderboardData(data);
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  } finally {
    setLoadingLeaderboard(false);
  }
};
```

## Κατατάξεις και Rewards

### Ranking System
1. **1η Θέση**: 🥇 Χρυσό μετάλλιο + "1η θέση!" badge
2. **2η Θέση**: 🥈 Ασημένιο μετάλλιο + "2η θέση!" badge  
3. **3η Θέση**: 🥉 Χάλκινο μετάλλιο + "3η θέση!" badge
4. **4η-10η Θέση**: Αριθμός θέσης

### Visual Design
- **1η Θέση**: Χρυσό gradient background
- **2η Θέση**: Γκρι gradient background
- **3η Θέση**: Χάλκινο gradient background
- **4η-10η Θέση**: Γκρι background με hover effect

## Ασφάλεια

- **Authentication Required**: Μόνο authenticated users μπορούν να δουν το leaderboard
- **Role Check**: Μόνο agents εμφανίζονται στο leaderboard
- **Current User Exclusion**: Ο τρέχων χρήστης δεν εμφανίζεται στη λίστα top 10
- **Data Privacy**: Μόνο βασικά στοιχεία (όνομα, email) εμφανίζονται

## Testing

### Test Script
```bash
cd listings/frontend
node test-leaderboard.js
```

### Test Features
- Δημιουργία test agents
- Προσθήκη πόντων με διαφορετικές τιμές
- Επιβεβαίωση ranking algorithm
- Έλεγχος current user position
- Συνολικός αριθμός agents

## Performance

### Optimization
- **LIMIT 10**: Περιορισμός αποτελεσμάτων
- **Indexes**: Χρήση indexes για γρήγορη αναζήτηση
- **Caching**: Εφαρμογή caching για συχνά ζητούμενα δεδομένα
- **Lazy Loading**: Φόρτωση μόνο όταν απαιτείται

### Database Indexes
```sql
-- Προτεινόμενα indexes για καλύτερη απόδοση
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_referral_points_user_id ON referral_points(user_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
```

## Επεκτάσεις

### Μελλοντικά Features
- **Monthly/Yearly Leaderboards**: Διαφορετικές περιόδους
- **Categories**: Leaderboards ανά περιοχή ή ειδικότητα
- **Achievements**: Badges και achievements για υψηλές θέσεις
- **Notifications**: Ειδοποιήσεις για αλλαγές θέσης
- **Export**: Εξαγωγή leaderboard σε PDF/Excel

### Analytics
- **Trend Analysis**: Προσθήκη γραφημάτων τάσεων
- **Historical Data**: Ιστορικά δεδομένα θέσεων
- **Performance Metrics**: Πρόσθετα στατιστικά

## Troubleshooting

### Συχνά Προβλήματα

1. **Empty Leaderboard**
   - Έλεγχος αν υπάρχουν agents με πόντους
   - Έλεγχος role των χρηστών

2. **Incorrect Rankings**
   - Έλεγχος SQL query για σωστή σειρά
   - Έλεγχος για διπλές εγγραφές

3. **Performance Issues**
   - Έλεγχος database indexes
   - Εφαρμογή caching

### Debug Commands
```bash
# Έλεγχος agents με πόντους
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findMany({ where: { role: 'AGENT' }, include: { referralPoints: true } }).then(console.log);"

# Έλεγχος referrals
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.referral.findMany().then(console.log);"
```

## Σημειώσεις

- Το leaderboard ενημερώνεται σε πραγματικό χρόνο
- Μόνο agents με τουλάχιστον 1 πόντο εμφανίζονται
- Σε περίπτωση ισοπαλίας, προηγείται αυτός με περισσότερα referrals
- Το σύστημα είναι scalable και μπορεί να χειριστεί μεγάλο αριθμό agents 