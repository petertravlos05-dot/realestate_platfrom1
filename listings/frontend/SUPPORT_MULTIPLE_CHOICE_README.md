# Support Center - Μηνύματα Πολλαπλής Επιλογής

## Επισκόπηση

Η νέα λειτουργικότητα επιτρέπει στους admins να στέλνουν μηνύματα με προκαθορισμένες επιλογές απάντησης στους buyers. Όταν ο admin στέλνει ένα τέτοιο μήνυμα, ο buyer μπορεί να απαντήσει μόνο επιλέγοντας από τις διαθέσιμες επιλογές, χωρίς να μπορεί να γράψει δικό του μήνυμα.

## Πώς Λειτουργεί

### Για τον Admin

1. **Στο Admin Dashboard**, στο tab "Μηνύματα"
2. **Επιλέγει ένα ticket** για να απαντήσει
3. **Ενεργοποιεί το checkbox** "Μήνυμα με προκαθορισμένες απαντήσεις (πολλαπλή επιλογή)"
4. **Προσθέτει τουλάχιστον 2 επιλογές** απάντησης
5. **Γράφει το κύριο μήνυμα** και στέλνει

### Για τον Buyer

1. **Στο Buyer Dashboard**, στο tab "Μηνύματα"
2. **Βλέπει το μήνυμα** από τον admin με τις επιλογές
3. **Επιλέγει μια απάντηση** από τις διαθέσιμες επιλογές
4. **Πατάει "Αποστολή"** για να στείλει την επιλεγμένη απάντηση
5. **Δεν μπορεί να γράψει** δικό του μήνυμα μέχρι να επιλέξει
6. **Μετά την επιλογή**, μπορεί να προσθέσει επιπλέον σχόλια (προαιρετικό)

## Τεχνική Υλοποίηση

### Database Schema

```sql
-- SupportMessage table
CREATE TABLE SupportMessage (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  ticketId TEXT NOT NULL,
  userId TEXT NOT NULL,
  isFromAdmin BOOLEAN DEFAULT FALSE,
  metadata TEXT, -- JSON string για πολλαπλές επιλογές
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Metadata Structure

```json
{
  "isMultipleChoice": true,
  "options": [
    "Επιλογή 1",
    "Επιλογή 2",
    "Επιλογή 3"
  ]
}
```

### API Endpoints

#### POST /api/support/messages
```javascript
{
  "ticketId": "ticket_id",
  "content": "Το μήνυμα",
  "isMultipleChoice": true,
  "options": ["Επιλογή 1", "Επιλογή 2"]
}
```

#### POST /api/admin/send-message
```javascript
{
  "userId": "target_user_id",
  "content": "Το μήνυμα",
  "isMultipleChoice": true,
  "options": ["Επιλογή 1", "Επιλογή 2"]
}
```

### Frontend Logic

#### SupportCenter Component

```javascript
// Έλεγχος αν το μήνυμα είναι πολλαπλής επιλογής
const isMultipleChoiceMessage = (message) => {
  return message.metadata && message.metadata.isMultipleChoice && message.metadata.options;
};

// Έλεγχος αν υπάρχει μήνυμα πολλαπλής επιλογής που δεν έχει απαντηθεί
const hasUnansweredMultipleChoiceMessage = () => {
  if (!selectedTicket || !selectedTicket.messages || selectedTicket.messages.length === 0) {
    return false;
  }

  const adminMessages = selectedTicket.messages.filter(msg => msg.isFromAdmin);
  if (adminMessages.length === 0) {
    return false;
  }

  const lastAdminMessage = adminMessages[adminMessages.length - 1];
  
  if (!isMultipleChoiceMessage(lastAdminMessage)) {
    return false;
  }

  const lastAdminMessageIndex = selectedTicket.messages.findIndex(msg => msg.id === lastAdminMessage.id);
  const hasReplyAfter = selectedTicket.messages.some((msg, index) => 
    index > lastAdminMessageIndex && !msg.isFromAdmin
  );

  return !hasReplyAfter;
};

// Έλεγχος αν το textarea πρέπει να είναι απενεργοποιημένο
const isTextareaDisabled = () => {
  return hasUnansweredMultipleChoiceMessage();
};

// Έλεγχος αν το κουμπί αποστολής πρέπει να είναι απενεργοποιημένο
const isSendButtonDisabled = () => {
  return (!replyText.trim() && !selectedOption) || sendingReply;
};
```

## UI/UX Features

### Για τον Buyer

1. **Εμφάνιση Επιλογών**: Οι επιλογές εμφανίζονται ως κουμπιά κάτω από το μήνυμα του admin
2. **Επιλογή Απάντησης**: Ο buyer κάνει κλικ σε μια επιλογή για να την επιλέξει
3. **Αποστολή Απάντησης**: Το κουμπί "Αποστολή" ενεργοποιείται μόλις επιλεγεί μια απάντηση και μπορεί να στείλει αμέσως
4. **Απενεργοποίηση Textarea**: Το πεδίο εισαγωγής κειμένου απενεργοποιείται μέχρι να επιλεγεί μια απάντηση
5. **Ενημερωτικό Μήνυμα**: Εμφανίζεται ένα κίτρινο μήνυμα που καθοδηγεί τον buyer να επιλέξει και να στείλει
6. **Επιπλέον Σχόλια**: Μετά την επιλογή, ο buyer μπορεί να προσθέσει επιπλέον σχόλια (προαιρετικό)

### Για τον Admin

1. **Checkbox Ενεργοποίησης**: Επιλογή για να ενεργοποιήσει τις πολλαπλές επιλογές
2. **Διαδραστικά Πεδία**: Προσθήκη/αφαίρεση επιλογών με κουμπιά
3. **Validation**: Τουλάχιστον 2 επιλογές απαιτούνται
4. **Προεπισκόπηση**: Προβολή του πώς θα φαίνεται το μήνυμα στον buyer

## Validation Rules

1. **Ελάχιστος Αριθμός Επιλογών**: Τουλάχιστον 2 επιλογές απαιτούνται
2. **Μη Κενές Επιλογές**: Όλες οι επιλογές πρέπει να έχουν περιεχόμενο
3. **Μοναδικότητα**: Κάθε επιλογή πρέπει να είναι μοναδική
4. **Μέγιστος Αριθμός**: Προτεινόμενο όριο 10 επιλογών

## Error Handling

1. **Network Errors**: Εμφάνιση toast μηνυμάτων για σφάλματα δικτύου
2. **Validation Errors**: Εμφάνιση σφαλμάτων validation πριν την αποστολή
3. **Database Errors**: Graceful handling σφαλμάτων βάσης δεδομένων

## Testing

### Unit Tests

```javascript
// Test για έλεγχο μηνύματος πολλαπλής επιλογής
test('should detect multiple choice message', () => {
  const message = {
    metadata: {
      isMultipleChoice: true,
      options: ['Option 1', 'Option 2']
    }
  };
  expect(isMultipleChoiceMessage(message)).toBe(true);
});

// Test για έλεγχο μη απαντημένου μηνύματος
test('should detect unanswered multiple choice message', () => {
  const ticket = {
    messages: [
      { id: '1', isFromAdmin: true, metadata: { isMultipleChoice: true, options: ['A', 'B'] } }
    ]
  };
  expect(hasUnansweredMultipleChoiceMessage(ticket)).toBe(true);
});
```

### Integration Tests

1. **Admin στέλνει μήνυμα πολλαπλής επιλογής**
2. **Buyer βλέπει τις επιλογές**
3. **Buyer επιλέγει απάντηση**
4. **Textarea ενεργοποιείται μετά την επιλογή**
5. **Buyer στέλνει επιπλέον σχόλια**

## Future Enhancements

1. **Rich Text Options**: Επιλογές με εικόνες ή emojis
2. **Conditional Logic**: Διαφορετικές επιλογές βάσει προηγούμενων απαντήσεων
3. **Analytics**: Στατιστικά για τις πιο δημοφιλείς επιλογές
4. **Templates**: Προκαθορισμένα templates για συχνές ερωτήσεις
5. **Multi-language Support**: Υποστήριξη για πολλαπλές γλώσσες

## Troubleshooting

### Συχνά Προβλήματα

1. **Επιλογές δεν εμφανίζονται**: Ελέγξτε αν το metadata είναι σωστά αποθηκευμένο
2. **Textarea δεν απενεργοποιείται**: Ελέγξτε τη λογική `hasUnansweredMultipleChoiceMessage`
3. **Απάντηση δεν αποθηκεύεται**: Ελέγξτε τα API endpoints και τα validation rules

### Debug Steps

1. Ελέγξτε τα browser console logs
2. Ελέγξτε τα network requests
3. Ελέγξτε τη βάση δεδομένων για τα metadata
4. Ελέγξτε τη λογική του frontend component

## Συμπέρασμα

Η λειτουργικότητα των μηνυμάτων πολλαπλής επιλογής βελτιώνει σημαντικά την εμπειρία χρήστη στο Support Center, επιτρέποντας πιο δομημένες και αποδοτικές συνομιλίες μεταξύ admins και buyers. 