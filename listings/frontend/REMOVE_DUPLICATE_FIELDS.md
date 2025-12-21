# Αφαίρεση Διπλών Πεδίων - Εγγραφή Εταιρείας

## Επισκόπηση Αλλαγών

Έχω αφαιρέσει τα διπλά πεδία "Όνομα Επικοινωνίας", "Email" και "Τηλέφωνο" από την αρχή του form για εταιρείες, αφού τα ίδια πεδία υπάρχουν και στο section "Υπεύθυνος Επικοινωνίας".

## Αλλαγές Frontend

### **Πριν (Πρόβλημα)**
```
Στοιχεία Εταιρείας:
├── Όνομα Επικοινωνίας (διπλό)
├── Email (διπλό)
├── Τηλέφωνο (διπλό)
├── Όνομα Εταιρείας
├── ΑΦΜ
├── ΔΟΥ
├── ...
└── Υπεύθυνος Επικοινωνίας:
    ├── Ονοματεπώνυμο Υπευθύνου (διπλό)
    ├── Email Υπευθύνου (διπλό)
    └── Τηλέφωνο Υπευθύνου (διπλό)
```

### **Μετά (Λύση)**
```
Στοιχεία Εταιρείας:
├── Όνομα Εταιρείας
├── Διακριτικός Τίτλος
├── ΑΦΜ
├── ΔΟΥ
├── Τηλέφωνο Εταιρείας
├── Email Εταιρείας
├── Έδρα Εταιρείας
├── Website
├── Ωράριο Λειτουργίας
└── Υπεύθυνος Επικοινωνίας:
    ├── Ονοματεπώνυμο Υπευθύνου
    ├── Email Υπευθύνου
    └── Τηλέφωνο Υπευθύνου
```

## Conditional Rendering

### **Ιδιώτης Εγγραφή**
```tsx
{userType === 'INDIVIDUAL' && (
  <>
    {/* Name Field */}
    <div>
      <label>Ονοματεπώνυμο</label>
      <input name="name" required />
    </div>
    
    {/* Email Field */}
    <div>
      <label>Email</label>
      <input name="email" type="email" required />
    </div>
    
    {/* Phone Field */}
    <div>
      <label>Τηλέφωνο</label>
      <input name="phone" type="tel" required />
    </div>
  </>
)}
```

### **Εταιρεία Εγγραφή**
```tsx
{userType === 'COMPANY' && (
  <>
    {/* Company Fields */}
    <div>Όνομα Εταιρείας</div>
    <div>ΑΦΜ</div>
    <div>ΔΟΥ</div>
    {/* ... άλλα company fields */}
    
    {/* Contact Person Section */}
    <div className="md:col-span-2">
      <h4>Υπεύθυνος Επικοινωνίας</h4>
    </div>
    <div>Ονοματεπώνυμο Υπευθύνου</div>
    <div>Email Υπευθύνου</div>
    <div>Τηλέφωνο Υπευθύνου</div>
  </>
)}
```

## Backend Logic

### **Form Data Handling**
```typescript
const data = {
  // For individual users, use the basic fields
  // For company users, use the contact person fields as the main user data
  name: userType === 'COMPANY' 
    ? formData.get('contactPersonName')?.toString() || ''
    : formData.get('name')?.toString() || '',
  email: userType === 'COMPANY'
    ? formData.get('contactPersonEmail')?.toString() || ''
    : formData.get('email')?.toString() || '',
  phone: userType === 'COMPANY'
    ? formData.get('contactPersonPhone')?.toString() || ''
    : formData.get('phone')?.toString() || '',
  // ... rest of company fields
};
```

### **Validation Logic**
```typescript
// For individual users, validate basic fields
if (userType && userType.toUpperCase() === 'INDIVIDUAL') {
  if (!name) return error('Το ονοματεπώνυμο είναι υποχρεωτικό');
  if (!email) return error('Το email είναι υποχρεωτικό');
  if (!phone) return error('Το τηλέφωνο είναι υποχρεωτικό');
}

// For company users, validate company-specific fields
if (userType && userType.toUpperCase() === 'COMPANY') {
  if (!companyName) return error('Το όνομα εταιρείας είναι υποχρεωτικό');
  if (!contactPersonName) return error('Το ονοματεπώνυμο υπευθύνου είναι υποχρεωτικό');
  // ... άλλες validations
}
```

## User Experience

### **Ιδιώτης Εγγραφή**
```
Ονοματεπώνυμο → Email → Τηλέφωνο → [Προαιρετικό Company Name] → Password
```

### **Εταιρεία Εγγραφή**
```
Όνομα Εταιρείας → Διακριτικός Τίτλος → ΑΦΜ → ΔΟΥ → 
Τηλέφωνο Εταιρείας → Email Εταιρείας → Έδρα → 
Website → Ωράριο → 
Υπεύθυνος Επικοινωνίας (Όνομα, Email, Τηλέφωνο) → 
Λογότυπο → Password
```

## Technical Benefits

### **1. Καθαρή Δομή**
- **Χωρίς διπλά πεδία**: Κάθε στοιχείο εμφανίζεται μόνο μία φορά
- **Λογική οργάνωση**: Company fields και contact person fields ξεχωριστά
- **Καθαρή UX**: Ο χρήστης δεν μπερδεύεται με διπλά πεδία

### **2. Σωστή Data Mapping**
- **Ιδιώτης**: Βασικά πεδία → user data
- **Εταιρεία**: Contact person fields → user data, company fields → company data

### **3. Validation**
- **Conditional validation**: Διαφορετική validation για κάθε τύπο χρήστη
- **Clear error messages**: Ελληνικά error messages για κάθε πεδίο

## Files Modified

1. **Frontend**: `listings/frontend/src/app/seller/auth/register/page.tsx`
   - Conditional rendering για basic fields
   - Updated form data handling

2. **Backend**: `listings/frontend/src/app/api/auth/register/route.ts`
   - Updated validation logic
   - Conditional field validation

## Testing

### **Ιδιώτης Εγγραφή**
- [ ] Εμφανίζονται μόνο τα βασικά πεδία
- [ ] Company fields κρυμμένα
- [ ] Εγγραφή λειτουργεί κανονικά

### **Εταιρεία Εγγραφή**
- [ ] Δεν εμφανίζονται τα βασικά πεδία στην αρχή
- [ ] Εμφανίζονται όλα τα company fields
- [ ] Contact person section με τα σωστά πεδία
- [ ] Εγγραφή με contact person data ως main user data

### **Validation**
- [ ] Individual validation για ιδιώτες
- [ ] Company validation για εταιρείες
- [ ] Error messages στα ελληνικά

## Benefits

1. **Καθαρή UX**: Χωρίς διπλά πεδία
2. **Λογική οργάνωση**: Company data και contact person data ξεχωριστά
3. **Σωστή data mapping**: Contact person data → main user data για εταιρείες
4. **Comprehensive validation**: Διαφορετική validation για κάθε τύπο
5. **Professional appearance**: Clean, organized form structure
