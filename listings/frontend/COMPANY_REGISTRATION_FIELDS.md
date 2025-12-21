# Αλλαγές Στοιχείων Εγγραφής για Εταιρεία

## Επισκόπηση Αλλαγών

Έχω προσαρμόσει τα στοιχεία εγγραφής για να διαφοροποιούνται ανάλογα με τον τύπο χρήστη (Ιδιώτης vs Μεσιτική Εταιρεία).

## Αλλαγές Frontend

### 1. **Δυναμικός Τίτλος Section**
- **Ιδιώτης**: "Στοιχεία Εγγραφής"
- **Εταιρεία**: "Στοιχεία Εταιρείας"

### 2. **Name Field**
- **Ιδιώτης**: "Ονοματεπώνυμο"
- **Εταιρεία**: "Όνομα Επικοινωνίας"
- **Placeholder**: Αλλάζει ανάλογα με τον τύπο

### 3. **Company Name Field**
- **Ιδιώτης**: "Όνομα Εταιρείας (προαιρετικό)" - optional
- **Εταιρεία**: "Όνομα Εταιρείας" - required

### 4. **Νέα Fields για Εταιρεία**

#### **ΑΦΜ Εταιρείας**
- **Field**: `companyTaxId`
- **Label**: "ΑΦΜ Εταιρείας"
- **Type**: Text input
- **Required**: Ναι (μόνο για εταιρεία)
- **Icon**: FaBuilding
- **Placeholder**: "Εισάγετε τον ΑΦΜ της εταιρείας"

#### **Διεύθυνση Εταιρείας**
- **Field**: `companyAddress`
- **Label**: "Διεύθυνση Εταιρείας"
- **Type**: Text input
- **Required**: Ναι (μόνο για εταιρεία)
- **Icon**: FaBuilding
- **Placeholder**: "Εισάγετε τη διεύθυνση της εταιρείας"
- **Layout**: `md:col-span-2` (πλήρες πλάτος)

### 5. **Conditional Rendering**
```tsx
{userType === 'COMPANY' && (
  // ΑΦΜ και Διεύθυνση fields
)}
```

## Αλλαγές Backend

### 1. **API Route Updates**
- **File**: `listings/frontend/src/app/api/auth/register/route.ts`
- **Νέα Fields**: `companyTaxId`, `companyAddress`
- **Validation**: Επιπλέον validation για εταιρεία

### 2. **Validation Logic**
```typescript
// Validate company-specific requirements
if (userType && userType.toUpperCase() === 'COMPANY') {
  if (!companyName) {
    return NextResponse.json(
      { error: 'Το όνομα εταιρείας είναι υποχρεωτικό για εταιρείες' },
      { status: 400 }
    );
  }
  if (!companyTaxId) {
    return NextResponse.json(
      { error: 'Ο ΑΦΜ εταιρείας είναι υποχρεωτικός για εταιρείες' },
      { status: 400 }
    );
  }
  if (!companyAddress) {
    return NextResponse.json(
      { error: 'Η διεύθυνση εταιρείας είναι υποχρεωτική για εταιρείες' },
      { status: 400 }
    );
  }
}
```

### 3. **Database Schema Updates**
- **File**: `listings/frontend/prisma/schema.prisma`
- **Νέα Fields**:
  - `companyTaxId String?`
  - `companyAddress String?`

### 4. **Migration**
- **Migration Name**: `add_company_fields`
- **Status**: Εφαρμοσμένη επιτυχώς

## User Experience

### **Ιδιώτης Εγγραφή**
1. **Name**: Ονοματεπώνυμο
2. **Email**: Email
3. **Phone**: Τηλέφωνο
4. **Company Name**: Προαιρετικό
5. **Password**: Κωδικός
6. **Confirm Password**: Επιβεβαίωση

### **Εταιρεία Εγγραφή**
1. **Name**: Όνομα Επικοινωνίας
2. **Email**: Email
3. **Phone**: Τηλέφωνο
4. **Company Name**: Υποχρεωτικό
5. **ΑΦΜ**: Υποχρεωτικό
6. **Διεύθυνση**: Υποχρεωτικό
7. **Password**: Κωδικός
8. **Confirm Password**: Επιβεβαίωση

## Visual Design

### **Layout**
- **Grid**: 2-column layout για τα fields
- **Company Address**: Full width (`md:col-span-2`)
- **Consistent Styling**: Ίδια styling με τα υπόλοιπα fields

### **Icons**
- **ΑΦΜ**: FaBuilding
- **Διεύθυνση**: FaBuilding
- **Consistent**: Ίδια icon theme με τα υπόλοιπα fields

### **Validation**
- **Real-time**: Client-side validation
- **Server-side**: Backend validation με ελληνικά error messages
- **User-friendly**: Clear error messages

## Technical Implementation

### **State Management**
```typescript
const [userType, setUserType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
```

### **Form Data**
```typescript
const data = {
  name: formData.get('name')?.toString() || '',
  email: formData.get('email')?.toString() || '',
  password: password,
  phone: formData.get('phone')?.toString() || '',
  companyName: formData.get('companyName')?.toString() || '',
  companyTaxId: formData.get('companyTaxId')?.toString() || '',
  companyAddress: formData.get('companyAddress')?.toString() || '',
  role: 'SELLER',
  userType: userType,
};
```

### **Database Fields**
```prisma
model User {
  // ... existing fields
  companyName        String?
  companyTaxId       String?
  companyAddress     String?
  userType           String @default("INDIVIDUAL")
  // ... rest of fields
}
```

## Files Modified

1. **Frontend**:
   - `listings/frontend/src/app/seller/auth/register/page.tsx`

2. **Backend**:
   - `listings/frontend/src/app/api/auth/register/route.ts`

3. **Database**:
   - `listings/frontend/prisma/schema.prisma`

4. **Migration**:
   - `listings/frontend/prisma/migrations/20250906101802_add_company_fields/`

## Testing

### **Test Cases**
1. **Ιδιώτης Εγγραφή**: Όλα τα fields optional εκτός από τα βασικά
2. **Εταιρεία Εγγραφή**: Όλα τα company fields required
3. **Validation**: Server-side validation για missing fields
4. **Database**: Νέα fields αποθηκεύονται σωστά

### **Error Handling**
- **Client-side**: Real-time validation
- **Server-side**: Comprehensive validation με ελληνικά messages
- **User-friendly**: Clear error messages για κάθε field

## Next Steps

1. **Testing**: Δοκιμή της νέας ροής εγγραφής
2. **UI Polish**: Επιπλέον styling improvements αν χρειάζεται
3. **Documentation**: Ενημέρωση user documentation
4. **Admin Panel**: Προσθήκη των νέων fields στο admin panel
