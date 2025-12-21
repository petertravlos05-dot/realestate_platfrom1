# Σύνδεση με Email Εταιρείας

## Επισκόπηση Αλλαγών

Έχω ενημερώσει το σύστημα σύνδεσης για να επιτρέπει στους χρήστες να συνδέονται με το email της εταιρείας τους, εκτός από το προσωπικό email.

## Αλλαγές Backend

### **NextAuth Configuration**
- **File**: `listings/frontend/src/lib/auth.ts`
- **Function**: `authorize` function στο CredentialsProvider

### **Login Logic**
```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  // First try to find user by main email
  let user = await prisma.user.findUnique({
    where: {
      email: credentials.email,
    },
  });

  // If not found, try to find by company email
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        companyEmail: credentials.email,
      },
    });
  }

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email, // Always return the main email for session
    name: user.name,
    role: user.role as UserRole,
  };
}
```

### **Search Strategy**
1. **Primary Search**: Ψάχνει στο `email` field (κύριο email)
2. **Fallback Search**: Αν δεν βρει, ψάχνει στο `companyEmail` field
3. **Session Data**: Πάντα επιστρέφει το κύριο email για το session

## Αλλαγές Frontend

### **Login Page Updates**
- **File**: `listings/frontend/src/app/seller/auth/login/page.tsx`

### **UI Improvements**
```tsx
{/* Email Field */}
<div>
  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
    Email
  </label>
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <FaEnvelope className="h-5 w-5 text-gray-400" />
    </div>
    <input
      id="email"
      name="email"
      type="email"
      autoComplete="email"
      required
      className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
               bg-white/70 backdrop-blur-sm transition-all duration-200"
      placeholder="Email προσωπικό ή εταιρείας"
    />
  </div>
  <p className="text-xs text-gray-500 mt-1">
    Μπορείτε να συνδεθείτε με το προσωπικό σας email ή το email της εταιρείας
  </p>
</div>
```

### **Updated Description**
```tsx
<p className="text-xl text-gray-600 leading-relaxed">
  Συνδεθείτε στον λογαριασμό σας για να διαχειριστείτε τα ακίνητά σας και να παρακολουθήσετε τους ενδιαφερομένους. Μπορείτε να συνδεθείτε με το προσωπικό σας email ή το email της εταιρείας.
</p>
```

## User Experience

### **Login Options**
Οι χρήστες μπορούν τώρα να συνδέονται με:

1. **Προσωπικό Email**: Το κύριο email που χρησιμοποιήθηκε κατά την εγγραφή
2. **Email Εταιρείας**: Το email της εταιρείας που εισήχθη στο companyEmail field

### **Seamless Experience**
- **Same Password**: Χρησιμοποιεί τον ίδιο κωδικό για και τα δύο emails
- **Same Session**: Το session περιέχει πάντα το κύριο email
- **No Confusion**: Ο χρήστης δεν χρειάζεται να θυμάται ποιο email να χρησιμοποιήσει

## Technical Implementation

### **Database Query Strategy**
```sql
-- Primary query
SELECT * FROM users WHERE email = 'user@example.com'

-- Fallback query (if primary fails)
SELECT * FROM users WHERE companyEmail = 'company@example.com'
```

### **Session Management**
- **Session Email**: Πάντα το κύριο email (`user.email`)
- **User Identification**: Βασίζεται στο `user.id`
- **Role Access**: Διατηρείται το `user.role`

### **Security Considerations**
- **Password Validation**: Ο ίδιος κωδικός για και τα δύο emails
- **Session Consistency**: Πάντα το ίδιο user object
- **No Duplicate Sessions**: Ένας χρήστης = ένα session

## Use Cases

### **Individual Users**
- Συνδέονται με το προσωπικό email
- Κανονική λειτουργία

### **Company Users**
- **Option 1**: Σύνδεση με προσωπικό email (contact person email)
- **Option 2**: Σύνδεση με company email
- **Flexibility**: Μπορούν να επιλέξουν το πιο βολικό

### **Admin/Support**
- Μπορούν να συνδέονται με οποιοδήποτε email του χρήστη
- Ευκολότερη υποστήριξη

## Testing Scenarios

### **Test Case 1: Individual User**
1. **Register**: Με προσωπικό email
2. **Login**: Με προσωπικό email
3. **Expected**: Successful login

### **Test Case 2: Company User - Personal Email**
1. **Register**: Εταιρεία με contact person email
2. **Login**: Με contact person email
3. **Expected**: Successful login

### **Test Case 3: Company User - Company Email**
1. **Register**: Εταιρεία με company email
2. **Login**: Με company email
3. **Expected**: Successful login

### **Test Case 4: Invalid Email**
1. **Login**: Με email που δεν υπάρχει
2. **Expected**: Login failure

### **Test Case 5: Wrong Password**
1. **Login**: Με σωστό email αλλά λάθος password
2. **Expected**: Login failure

## Benefits

### **1. User Flexibility**
- **Multiple Login Options**: Προσωπικό ή company email
- **No Confusion**: Clear instructions στο UI
- **Same Experience**: Ίδια λειτουργία για όλους

### **2. Business Logic**
- **Company Workflow**: Εταιρείες μπορούν να χρησιμοποιούν company email
- **Personal Access**: Contact person μπορεί να χρησιμοποιεί προσωπικό email
- **Team Access**: Πολλοί μπορούν να έχουν πρόσβαση με company email

### **3. Technical Benefits**
- **Backward Compatible**: Δεν επηρεάζει υπάρχοντες χρήστες
- **Efficient Queries**: Optimized database queries
- **Secure**: Same security model

## Files Modified

1. **Backend**: `listings/frontend/src/lib/auth.ts`
   - Updated authorize function
   - Added company email search

2. **Frontend**: `listings/frontend/src/app/seller/auth/login/page.tsx`
   - Updated UI text and placeholders
   - Added help text

## Next Steps

1. **Testing**: Δοκιμή με διαφορετικούς τύπους χρηστών
2. **Documentation**: Ενημέρωση user documentation
3. **Admin Panel**: Προσθήκη company email στο admin view
4. **Analytics**: Tracking ποιο email χρησιμοποιείται περισσότερο
