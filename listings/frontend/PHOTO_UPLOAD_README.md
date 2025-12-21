# Σύστημα Ανέβασματος Φωτογραφιών

## Επισκόπηση

Το σύστημα ανέβασματος φωτογραφιών έχει διορθωθεί και τώρα αποθηκεύει τις φωτογραφίες τοπικά στο `/public/uploads/properties/` directory αντί να χρησιμοποιεί placeholder URLs.

## Πώς λειτουργεί

### 1. Κατά τη διάρκεια της καταχώρησης ακινήτου

Όταν ο χρήστης ανεβάζει φωτογραφίες στη σελίδα `add-listing`, οι φωτογραφίες:

1. Μετατρέπονται σε buffer
2. Αποθηκεύονται στο `/public/uploads/properties/` directory με μοναδικό όνομα
3. Οι URLs των φωτογραφιών αποθηκεύονται στη βάση δεδομένων στο πεδίο `images`

### 2. Εμφάνιση φωτογραφιών

Οι φωτογραφίες εμφανίζονται στις σελίδες λεπτομερειών ακινήτου μέσω του Next.js Image component.

## Αρχιτεκτονική

### API Endpoints

- `POST /api/properties` - Καταχώρηση ακινήτου με φωτογραφίες
- `POST /api/test-photo` - Test endpoint για ανέβασμα φωτογραφίας

### Αρχεία

- `src/app/api/properties/route.ts` - Κύριο API endpoint για καταχώρηση ακινήτου
- `src/app/api/test-photo/route.ts` - Test endpoint
- `src/app/test-photo/page.tsx` - Test page για δοκιμή ανεβάσματος

### Configuration

- `next.config.js` - Next.js configuration για εικόνες
- `public/uploads/properties/` - Directory για αποθήκευση φωτογραφιών

## Δοκιμή του συστήματος

1. Εκκινήστε τον development server:
   ```bash
   npm run dev
   ```

2. Επισκεφθείτε τη σελίδα test:
   ```
   http://localhost:3004/test-photo
   ```

3. Δοκιμάστε να ανεβάσετε μια φωτογραφία

4. Επισκεφθείτε τη σελίδα καταχώρησης ακινήτου:
   ```
   http://localhost:3004/add-listing
   ```

## Προβλήματα που διορθώθηκαν

1. **Placeholder URLs**: Αντικαταστάθηκαν με πραγματικές φωτογραφίες
2. **S3 Configuration**: Απλοποιήθηκε σε τοπική αποθήκευση
3. **Next.js Image Optimization**: Προσθήκη `unoptimized: true` για τοπικές εικόνες

## Επόμενα βήματα

Για production, συνιστάται:

1. Χρήση cloud storage (AWS S3, Cloudinary, κλπ.)
2. Image optimization και compression
3. CDN για καλύτερη απόδοση
4. Backup strategy για φωτογραφίες

## Troubleshooting

### Φωτογραφίες δεν εμφανίζονται

1. Ελέγξτε αν το `/public/uploads/properties/` directory υπάρχει
2. Ελέγξτε τα permissions του directory
3. Ελέγξτε τα console logs για σφάλματα

### Σφάλμα κατά το ανέβασμα

1. Ελέγξτε το μέγεθος του αρχείου
2. Ελέγξτε τον τύπο του αρχείου (μόνο εικόνες)
3. Ελέγξτε τα console logs για σφάλματα 