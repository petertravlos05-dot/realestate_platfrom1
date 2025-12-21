# Λεπτομερή Στοιχεία Εταιρείας - Εγγραφή

## Επισκόπηση Αλλαγών

Έχω προσαρμόσει πλήρως τα στοιχεία εγγραφής για να συμπεριλάβουν όλα τα λεπτομερή στοιχεία που ζητήσατε για την εταιρεία.

## Νέα Fields για Εταιρεία

### 1. **Βασικά Στοιχεία Εταιρείας**

#### **Όνομα Εταιρείας**
- **Field**: `companyName`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaBuilding

#### **Διακριτικός Τίτλος**
- **Field**: `companyTitle`
- **Required**: Όχι (προαιρετικό)
- **Type**: Text input
- **Icon**: FaBuilding
- **Placeholder**: "Εισάγετε τον διακριτικό τίτλο της εταιρείας"

#### **ΑΦΜ Εταιρείας**
- **Field**: `companyTaxId`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaBuilding
- **Placeholder**: "Εισάγετε τον ΑΦΜ της εταιρείας"

#### **ΔΟΥ Εταιρείας**
- **Field**: `companyDou`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaBuilding
- **Placeholder**: "Εισάγετε τη ΔΟΥ της εταιρείας"

### 2. **Στοιχεία Επικοινωνίας Εταιρείας**

#### **Τηλέφωνο Εταιρείας**
- **Field**: `companyPhone`
- **Required**: Ναι
- **Type**: Tel input
- **Icon**: FaPhone
- **Placeholder**: "Εισάγετε το τηλέφωνο της εταιρείας"

#### **Email Εταιρείας**
- **Field**: `companyEmail`
- **Required**: Ναι
- **Type**: Email input
- **Icon**: FaEnvelope
- **Placeholder**: "Εισάγετε το email της εταιρείας"

#### **Έδρα Εταιρείας**
- **Field**: `companyHeadquarters`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaBuilding
- **Layout**: Full width (`md:col-span-2`)
- **Placeholder**: "Εισάγετε την έδρα της εταιρείας"

### 3. **Επιπλέον Στοιχεία**

#### **Website**
- **Field**: `companyWebsite`
- **Required**: Όχι (προαιρετικό)
- **Type**: URL input
- **Icon**: FaBuilding
- **Placeholder**: "https://www.example.com"

#### **Ωράριο Λειτουργίας**
- **Field**: `companyWorkingHours`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaBuilding
- **Placeholder**: "π.χ. Δευτέρα-Παρασκευή 09:00-17:00"

### 4. **Υπεύθυνος Επικοινωνίας**

#### **Ονοματεπώνυμο Υπευθύνου**
- **Field**: `contactPersonName`
- **Required**: Ναι
- **Type**: Text input
- **Icon**: FaUser
- **Placeholder**: "Εισάγετε το ονοματεπώνυμο του υπευθύνου"

#### **Email Υπευθύνου**
- **Field**: `contactPersonEmail`
- **Required**: Ναι
- **Type**: Email input
- **Icon**: FaEnvelope
- **Placeholder**: "Εισάγετε το email του υπευθύνου"

#### **Τηλέφωνο Υπευθύνου**
- **Field**: `contactPersonPhone`
- **Required**: Ναι
- **Type**: Tel input
- **Icon**: FaPhone
- **Placeholder**: "Εισάγετε το τηλέφωνο του υπευθύνου"

### 5. **Λογότυπο Εταιρείας**

#### **File Upload**
- **Field**: `companyLogo`
- **Required**: Όχι (προαιρετικό)
- **Type**: File input
- **Accept**: `image/*`
- **Layout**: Full width (`md:col-span-2`)
- **Help Text**: "Αποδεκτές μορφές: JPG, PNG, GIF. Μέγιστο μέγεθος: 5MB"

## Layout και Design

### **Grid Layout**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Most fields in 2-column grid */}
  
  {/* Full width fields */}
  <div className="md:col-span-2">
    {/* Company Headquarters, Contact Person Section, Logo Upload */}
  </div>
</div>
```

### **Section Organization**
1. **Βασικά Στοιχεία**: Όνομα, Τίτλος, ΑΦΜ, ΔΟΥ
2. **Επικοινωνία**: Τηλέφωνο, Email, Έδρα
3. **Επιπλέον**: Website, Ωράριο
4. **Υπεύθυνος**: Ξεχωριστό section με border
5. **Λογότυπο**: File upload στο τέλος

### **Visual Hierarchy**
- **Section Headers**: "Υπεύθυνος Επικοινωνίας" με border-bottom
- **Consistent Icons**: FaBuilding, FaPhone, FaEnvelope, FaUser
- **Responsive Design**: 2-column grid σε desktop, 1-column σε mobile

## Backend Implementation

### **API Route Updates**
- **File**: `listings/frontend/src/app/api/auth/register/route.ts`
- **Νέα Fields**: Όλα τα company fields
- **Validation**: Comprehensive validation για κάθε field

### **Validation Logic**
```typescript
// Validate company-specific requirements
if (userType && userType.toUpperCase() === 'COMPANY') {
  // Required fields validation
  if (!companyName) return error('Το όνομα εταιρείας είναι υποχρεωτικό');
  if (!companyTaxId) return error('Ο ΑΦΜ εταιρείας είναι υποχρεωτικός');
  if (!companyDou) return error('Η ΔΟΥ εταιρείας είναι υποχρεωτική');
  if (!companyPhone) return error('Το τηλέφωνο εταιρείας είναι υποχρεωτικό');
  if (!companyEmail) return error('Το email εταιρείας είναι υποχρεωτικό');
  if (!companyHeadquarters) return error('Η έδρα εταιρείας είναι υποχρεωτική');
  if (!companyWorkingHours) return error('Το ωράριο λειτουργίας είναι υποχρεωτικό');
  if (!contactPersonName) return error('Το ονοματεπώνυμο υπευθύνου είναι υποχρεωτικό');
  if (!contactPersonEmail) return error('Το email υπευθύνου είναι υποχρεωτικό');
  if (!contactPersonPhone) return error('Το τηλέφωνο υπευθύνου είναι υποχρεωτικό');
}
```

### **Database Schema**
```prisma
model User {
  // ... existing fields
  companyName        String?
  companyTitle       String?
  companyTaxId       String?
  companyDou         String?
  companyPhone       String?
  companyEmail       String?
  companyHeadquarters String?
  companyWebsite     String?
  companyWorkingHours String?
  contactPersonName  String?
  contactPersonEmail String?
  contactPersonPhone String?
  companyLogo        String?
  userType           String @default("INDIVIDUAL")
  // ... rest of fields
}
```

## User Experience

### **Form Flow**
1. **Επιλογή Τύπου**: Ιδιώτης vs Εταιρεία
2. **Συνδρομητικά Πλάνα**: (μόνο για εταιρεία)
3. **Στοιχεία Εταιρείας**: Όλα τα νέα fields
4. **Password**: Κωδικός και επιβεβαίωση

### **Conditional Rendering**
- **Ιδιώτης**: Μόνο βασικά fields
- **Εταιρεία**: Όλα τα company fields + validation

### **Error Handling**
- **Client-side**: Real-time validation
- **Server-side**: Comprehensive validation με ελληνικά messages
- **User-friendly**: Clear error messages για κάθε field

## Technical Details

### **Form Data Structure**
```typescript
const data = {
  // Basic fields
  name: formData.get('name')?.toString() || '',
  email: formData.get('email')?.toString() || '',
  password: password,
  phone: formData.get('phone')?.toString() || '',
  
  // Company fields
  companyName: formData.get('companyName')?.toString() || '',
  companyTitle: formData.get('companyTitle')?.toString() || '',
  companyTaxId: formData.get('companyTaxId')?.toString() || '',
  companyDou: formData.get('companyDou')?.toString() || '',
  companyPhone: formData.get('companyPhone')?.toString() || '',
  companyEmail: formData.get('companyEmail')?.toString() || '',
  companyHeadquarters: formData.get('companyHeadquarters')?.toString() || '',
  companyWebsite: formData.get('companyWebsite')?.toString() || '',
  companyWorkingHours: formData.get('companyWorkingHours')?.toString() || '',
  contactPersonName: formData.get('contactPersonName')?.toString() || '',
  contactPersonEmail: formData.get('contactPersonEmail')?.toString() || '',
  contactPersonPhone: formData.get('contactPersonPhone')?.toString() || '',
  companyLogo: formData.get('companyLogo')?.toString() || '',
  
  // System fields
  role: 'SELLER',
  userType: userType,
};
```

### **Migration**
- **Migration Name**: `add_detailed_company_fields`
- **Status**: Εφαρμοσμένη επιτυχώς
- **Prisma Client**: Regenerated

## Files Modified

1. **Frontend**:
   - `listings/frontend/src/app/seller/auth/register/page.tsx`

2. **Backend**:
   - `listings/frontend/src/app/api/auth/register/route.ts`

3. **Database**:
   - `listings/frontend/prisma/schema.prisma`

4. **Migration**:
   - `listings/frontend/prisma/migrations/20250906125452_add_detailed_company_fields/`

## Testing Checklist

### **Ιδιώτης Εγγραφή**
- [ ] Μόνο βασικά fields εμφανίζονται
- [ ] Company fields κρυμμένα
- [ ] Εγγραφή λειτουργεί κανονικά

### **Εταιρεία Εγγραφή**
- [ ] Όλα τα company fields εμφανίζονται
- [ ] Required fields validation
- [ ] File upload για λογότυπο
- [ ] Contact person section
- [ ] Εγγραφή με όλα τα στοιχεία

### **Validation**
- [ ] Client-side validation
- [ ] Server-side validation
- [ ] Error messages στα ελληνικά
- [ ] Required fields enforcement

## Next Steps

1. **Testing**: Δοκιμή της νέας ροής εγγραφής
2. **File Upload**: Υλοποίηση file upload για λογότυπο
3. **Admin Panel**: Προσθήκη των νέων fields στο admin panel
4. **User Profile**: Εμφάνιση των company details στο profile
5. **Search/Filter**: Χρήση των company fields για αναζήτηση
