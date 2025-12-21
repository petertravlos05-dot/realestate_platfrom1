import uuid
from django.db import models
from django.contrib.auth.models import User
import random



# Μοντέλο για τους Πωλητές (Ιδιοκτήτες Ακινήτων)
class Seller(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, unique=True)
    tax_id = models.CharField(max_length=20, unique=True, null=True, blank=True)  # ΑΦΜ
    iban = models.CharField(max_length=34, unique=True, null=True, blank=True)  # IBAN για πληρωμές
    handle_visits = models.BooleanField(default=True, help_text="Επιλέξτε αν επιθυμείτε να αναλάβετε εσείς τις επισκέψεις.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

import uuid  # Για δημιουργία μοναδικών ID
# Μοντέλο για τους Μεσίτες
class Agent(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, unique=True)
    tax_id = models.CharField(max_length=20, unique=True, null=True, blank=True)  # ΑΦΜ
    iban = models.CharField(max_length=34, unique=True, null=True, blank=True)  # IBAN για πληρωμές
    commission = models.FloatField(default=2.5)  # Προμήθεια %
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Μοναδικό ID που θα χρησιμοποιεί ο μεσίτης
    agent_id = models.UUIDField(primary_key=True,default=uuid.uuid4, unique=True, editable=False)

    def __str__(self):
         return f"{self.agent_id} - {self.name}"
    
    # Μοντέλο για τους Αγοραστές
class Buyer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, unique=True)
    identification_number = models.CharField(max_length=50, null=True, blank=True)  # Νέο πεδίο για αριθμό ταυτότητας
    agent = models.ForeignKey(Agent, on_delete=models.SET_NULL, null=True, blank=True)  # Σύνδεση με Μεσίτη
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id} - {self.name}"
    
# Μοντέλο για τα Ακίνητα
class Property(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ('apartment', 'Διαμέρισμα'),
        ('house', 'Μονοκατοικία'),
        ('villa', 'Βίλα'),
        ('commercial', 'Επαγγελματικός Χώρος'),
        ('plot', 'Οικόπεδο'),
    ]

    CONDITION_CHOICES = [
        ('underConstruction', 'Υπό κατασκευή'),
        ('renovated', 'Ανακαινισμένο'),
        ('needsRenovation', 'Χρήζει ανακαίνισης'),
    ]

    HEATING_TYPE_CHOICES = [
        ('autonomous', 'Αυτόνομη'),
        ('central', 'Κεντρική'),
        ('heatpump', 'Αντλία Θερμότητας'),
    ]

    HEATING_SYSTEM_CHOICES = [
        ('gas', 'Φυσικό Αέριο'),
        ('oil', 'Πετρέλαιο'),
        ('electricity', 'Ρεύμα'),
    ]

    WINDOW_TYPE_CHOICES = [
        ('pvc', 'PVC'),
        ('wooden', 'Ξύλινα'),
        ('aluminum', 'Αλουμινίου'),
    ]

    WINDOW_INSULATION_CHOICES = [
        ('insulated', 'Μονωτικά'),
        ('non_insulated', 'Μη Μονωτικά'),
    ]

    FLOORING_CHOICES = [
        ('tiles', 'Πλακάκι'),
        ('wooden', 'Παρκέ'),
        ('marble', 'Μάρμαρο'),
    ]

    ENERGY_CLASS_CHOICES = [
        ('A+', 'A+'), ('A', 'A'), ('B+', 'B+'), ('B', 'B'),
        ('C', 'C'), ('D', 'D'), ('E', 'E'), ('F', 'F'), ('G', 'G'),
    ]

    POOL_TYPE_CHOICES = [
        ('private', 'Ιδιωτική'),
        ('shared', 'Κοινόχρηστη'),
        ('none', 'Χωρίς Πισίνα'),
    ]

    STORAGE_TYPE_CHOICES = [
        ('internal', 'Εσωτερική'),
        ('external', 'Εξωτερική'),
        ('none', 'Χωρίς Αποθήκη'),
    ]

    ELEVATOR_TYPE_CHOICES = [
        ('passenger', 'Κοινού'),
        ('freight', 'Φορτίου'),
        ('both', 'Και τα δύο'),
        ('none', 'Χωρίς Ανελκυστήρα'),
    ]

    # Βασικά στοιχεία
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    short_description = models.TextField(null=True, blank=True)
    full_description = models.TextField()
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    renovation_year = models.IntegerField(null=True, blank=True)

    # Βασικά χαρακτηριστικά
    area = models.DecimalField(max_digits=10, decimal_places=2)
    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.IntegerField(null=True, blank=True)
    floor = models.CharField(max_length=20, null=True, blank=True)
    parking_spaces = models.IntegerField(null=True, blank=True)
    garden = models.BooleanField(default=False)
    multiple_floors = models.BooleanField(default=False)

    # Εμπορικά χαρακτηριστικά
    commercial_type = models.CharField(max_length=20, null=True, blank=True)
    rooms = models.IntegerField(null=True, blank=True)

    # Χαρακτηριστικά οικοπέδου
    plot_category = models.CharField(max_length=20, null=True, blank=True)
    plot_ownership_type = models.CharField(max_length=20, null=True, blank=True)

    # Χαρακτηριστικά
    heating_type = models.CharField(max_length=20, choices=HEATING_TYPE_CHOICES, null=True, blank=True)
    heating_system = models.CharField(max_length=20, choices=HEATING_SYSTEM_CHOICES, null=True, blank=True)
    windows = models.CharField(max_length=20, choices=WINDOW_TYPE_CHOICES, null=True, blank=True)
    windows_type = models.CharField(max_length=20, choices=WINDOW_INSULATION_CHOICES, null=True, blank=True)
    flooring = models.CharField(max_length=20, choices=FLOORING_CHOICES, null=True, blank=True)
    energy_class = models.CharField(max_length=2, choices=ENERGY_CLASS_CHOICES, null=True, blank=True)

    # Επιπλέον χαρακτηριστικά
    elevator = models.BooleanField(default=False)
    furnished = models.BooleanField(default=False)
    security_door = models.BooleanField(default=False)
    alarm = models.BooleanField(default=False)
    disabled_access = models.BooleanField(default=False)
    soundproofing = models.BooleanField(default=False)
    thermal_insulation = models.BooleanField(default=False)
    pool = models.CharField(max_length=20, choices=POOL_TYPE_CHOICES, null=True, blank=True)
    balcony_area = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    has_balcony = models.BooleanField(default=False)

    # Χαρακτηριστικά οικοπέδου
    plot_area = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    building_coefficient = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    coverage_ratio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    facade_length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sides = models.IntegerField(null=True, blank=True)
    buildable_area = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    building_permit = models.BooleanField(default=False)
    road_access = models.CharField(max_length=20, null=True, blank=True)
    terrain = models.CharField(max_length=20, null=True, blank=True)
    shape = models.CharField(max_length=20, null=True, blank=True)
    suitability = models.CharField(max_length=20, null=True, blank=True)

    # Εμπορικά χαρακτηριστικά
    storage_type = models.CharField(max_length=20, choices=STORAGE_TYPE_CHOICES, null=True, blank=True)
    elevator_type = models.CharField(max_length=20, choices=ELEVATOR_TYPE_CHOICES, null=True, blank=True)
    fireproof_door = models.BooleanField(default=False)

    # Τοποθεσία
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    neighborhood = models.CharField(max_length=100, null=True, blank=True)
    street = models.CharField(max_length=100)
    number = models.CharField(max_length=20)
    postal_code = models.CharField(max_length=10, null=True, blank=True)
    coordinates = models.JSONField(null=True, blank=True)

    # Τιμή
    price = models.DecimalField(max_digits=12, decimal_places=2)
    price_per_square_meter = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    negotiable = models.BooleanField(default=False)
    additional_price_notes = models.TextField(null=True, blank=True)

    # Συστημικά πεδία
    is_verified = models.BooleanField(default=False)
    is_reserved = models.BooleanField(default=False)
    is_sold = models.BooleanField(default=False)
    images = models.JSONField(default=list)  # Λίστα με URLs εικόνων
    keywords = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Σχέσεις
    agent = models.ForeignKey(Agent, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.property_type} ({self.city})"

    def calculate_price_per_square_meter(self):
        if self.price and self.area:
            return self.price / self.area
        return None

    def save(self, *args, **kwargs):
        if self.price and self.area:
            self.price_per_square_meter = self.calculate_price_per_square_meter()
        super().save(*args, **kwargs)

# Μοντέλο για τις Συναλλαγές (Αγοραπωλησίες)
class Transaction(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE)
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE)
    agent = models.ForeignKey(Agent, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.buyer.name} bought {self.property.title}"

# listings/models.py

class Lead(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='leads')
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='leads')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='leads')

    # interested = True/False: Αν ο αγοραστής ενδιαφέρθηκε ή όχι.
    interested = models.BooleanField(default=False)

    # locked_until: μέχρι πότε κλειδώνεται (αν δεν ενδιαφέρθηκε).
    locked_until = models.DateTimeField(null=True, blank=True)

    # OTP: για επιβεβαίωση προφορικής επαφής.
    otp_code = models.CharField(max_length=10, null=True, blank=True)
    otp_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lead: {self.agent} -> {self.buyer} / {self.property}"
    
class Transaction(models.Model):
    STATUS_CHOICES = [
        ('PRE_DEPOSIT', 'Pre Deposit'),     # Δεν έχει πληρώσει προκαταβολή ακόμα
        ('DEPOSIT_PAID', 'Deposit Paid'),   # Έχει πληρώσει προκαταβολή
        ('FINALIZED', 'Finalized'),         # Οριστική ολοκλήρωση (συμβόλαιο υπογεγραμμένο)
        ('CANCELLED', 'Cancelled'),         # Ακυρώθηκε η διαδικασία
    ]

    property = models.ForeignKey("listings.Property", on_delete=models.CASCADE)
    buyer = models.ForeignKey("listings.Buyer", on_delete=models.CASCADE)
    agent = models.ForeignKey("listings.Agent", on_delete=models.SET_NULL, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRE_DEPOSIT')
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deposit_paid = models.BooleanField(default=False)

    final_contract_doc = models.FileField(upload_to='contracts/', null=True, blank=True)
    proof_of_payment_doc = models.FileField(upload_to='payment_proofs/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transaction #{self.id} for Property {self.property} by Buyer {self.buyer}"

    def pay_deposit(self, amount):
        """Μέθοδος για να σημειώσουμε ότι ο buyer πλήρωσε την προκαταβολή."""
        self.deposit_paid = True
        self.deposit_amount = amount
        self.status = 'DEPOSIT_PAID'
        self.save()

    def finalize(self):
        """Μέθοδος για την οριστική ολοκλήρωση της συναλλαγής."""
        self.status = 'FINALIZED'
        self.save()
        # Mπορείς εδώ να καλέσεις και άλλες συναρτήσεις που πληρώνουν τον Μεσίτη κ.λπ.

class VisitAvailability(models.Model):
    property = models.ForeignKey('Property', on_delete=models.CASCADE, related_name='availabilities')
    available_date = models.DateTimeField(help_text="Η διαθέσιμη ημερομηνία/ώρα για επίσκεψη")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.property.title} available at {self.available_date}"
    
class VisitRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED_BY_BUYER', 'Cancelled by Buyer'),
        ('CANCELLED_BY_SELLER', 'Cancelled by Seller'),
    ]
    
    property = models.ForeignKey('Property', on_delete=models.CASCADE, related_name='visit_requests')
    buyer = models.ForeignKey('Buyer', on_delete=models.CASCADE, related_name='visit_requests')
    # Ο handler θα οριστεί αυτόματα: αν ο Seller handle_visits=True, τότε handler = seller.user, αλλιώς μπορεί να μείνει null (ή να οριστεί default collaborator)
    handler = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_visit_requests')
    scheduled_date = models.DateTimeField(help_text="Η ημερομηνία/ώρα που επιλέγει ο αγοραστής από τις διαθέσιμες επιλογές")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    cancellation_reason = models.TextField(blank=True, help_text="Αιτιολόγηση ακύρωσης (εάν υπάρξει)")
    delegated = models.BooleanField(default=False, help_text="True αν το αίτημα πρέπει να χειριστείται από τους διαχειριστές (όταν ο Seller δεν αναλαμβάνει τις επισκέψεις)")
    buyer_notes = models.TextField(blank=True, help_text="Σημειώσεις του αγοραστή")
    seller_notes = models.TextField(blank=True, help_text="Σημειώσεις του Seller/Handler")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"VisitRequest #{self.id} for Property {self.property.id} by Buyer {self.buyer.id}"
    
class SupportTicket(models.Model):
    # Ο αγοραστής ανοίγει το ticket, και προαιρετικά μπορεί να σχετίζεται με ένα συγκεκριμένο Property
    buyer = models.ForeignKey('Buyer', on_delete=models.CASCADE, related_name='support_tickets')
    property = models.ForeignKey('Property', on_delete=models.CASCADE, related_name='support_tickets', null=True, blank=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=[('OPEN', 'Open'), ('CLOSED', 'Closed')], default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ticket #{self.id} by Buyer {self.buyer.id} - {self.subject}"


class SupportMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, help_text="Ο αποστολέας του μηνύματος (Buyer ή Admin)")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message #{self.id} on Ticket #{self.ticket.id} by {self.sender.username}"
    

class AgentBuyerAssociation(models.Model):
    """
    Καταγράφει τη συσχέτιση ενός αγοραστή με έναν μεσίτη για μια συγκεκριμένη ιδιοκτησία.
    Το πεδίο 'accepted' δείχνει:
      - True: ο αγοραστής έχει αποδεχτεί τον μεσίτη για την ιδιοκτησία.
      - False: ο αγοραστής έχει απορρίψει τη συσχέτιση.
      - Null: δεν έχει αποφασιστεί ακόμα.
    Εάν απορριφθεί, το 'lock_until' ορίζει μέχρι πότε το ακίνητο θα είναι "κλειδωμένο" για αυτόν τον αγοραστή.
    """
    buyer = models.ForeignKey('Buyer', on_delete=models.CASCADE, related_name='agent_associations',null=True, blank=True)
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, related_name='buyer_associations')
    property = models.ForeignKey('Property', on_delete=models.CASCADE, related_name='agent_buyer_associations')
    accepted = models.BooleanField(null=True, help_text="True αν ο αγοραστής αποδέχθηκε, False αν απορρίφθηκε, Null αν δεν έχει αποφασιστεί.")
    lock_until = models.DateTimeField(null=True, blank=True, help_text="Αν απορριφθεί, το ακίνητο 'κλειδώνεται' για αυτόν τον αγοραστή μέχρι αυτήν την ημερομηνία.")
    temp_buyer_name = models.CharField(max_length=100, null=True, blank=True)
    temp_buyer_identification_number = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Association (Buyer {self.buyer.id}, Agent {self.agent.id}, Property {self.property.id})"

class OTPRecord(models.Model):
    buyer = models.ForeignKey('Buyer', on_delete=models.CASCADE, related_name='otp_records')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for Buyer {self.buyer.id}: {self.otp}"

class TransactionProgress(models.Model):
    STATUS_CHOICES = [
        ('INQUIRY', 'Inquiry'),
        ('APPOINTMENT_SCHEDULED', 'Appointment Scheduled'),
        ('APPOINTMENT_COMPLETED', 'Appointment Completed'),
        ('DOCUMENT_CHECK', 'Document Check'),
        ('PRE_DEPOSIT', 'Pre Deposit'),
        ('CONTRACT_SIGNING', 'Contract Signing'),
        ('COMPLETED', 'Completed'),
    ]

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='progress')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, related_name='progress_updates')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Progress update for Transaction #{self.transaction.id} - {self.status}"