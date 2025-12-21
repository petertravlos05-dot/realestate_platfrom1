import urllib.request as urllib_request
from django.forms import ValidationError # type: ignore
from rest_framework import generics # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework import status # type: ignore
from django.http import HttpResponse # type: ignore
from .models import Seller, Agent, Property, Lead, Transaction, Buyer, VisitAvailability, VisitRequest, SupportTicket, SupportMessage, AgentBuyerAssociation, OTPRecord, TransactionProgress
from .serializers import SellerSerializer, BuyerSerializer, AgentSerializer, PropertySerializer, TransactionSerializer, VisitAvailabilitySerializer, VisitRequestSerializer, VisitRequestCancellationSerializer, SupportTicketSerializer, SupportMessageSerializer, AgentBuyerAssociationSerializer, TemporaryAssociationSerializer, TransactionProgressSerializer
import random
from django.contrib.auth.models import User # type: ignore
from .permissions import IsVerifiedAgent
from rest_framework.permissions import AllowAny # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from .serializers import LeadSerializer
import random
from rest_framework.views import APIView # type: ignore
from datetime import timedelta
from django.utils import timezone # type: ignore
from django.shortcuts import get_object_or_404 # type: ignore
from django.views.decorators.csrf import csrf_exempt # type: ignore
from rest_framework.decorators import api_view, permission_classes # type: ignore
from rest_framework import status # type: ignore
from django.contrib.auth.models import User # type: ignore
from rest_framework import serializers # type: ignore
from rest_framework.exceptions import ValidationError # type: ignore
from datetime import timedelta
from django.utils import timezone # type: ignore
from rest_framework.authtoken.views import ObtainAuthToken # type: ignore
from rest_framework.authtoken.models import Token # type: ignore




# API για την εγγραφή Πωλητών (Sellers)
class SellerRegisterView(generics.CreateAPIView):
    permission_classes = []  # Επιτρέπουμε πρόσβαση χωρίς authentication για εγγραφή
    queryset = Seller.objects.all()
    serializer_class = SellerSerializer
    def create(self, request, *args, **kwargs):
        # Λαμβάνουμε τα βασικά στοιχεία για τον Django User
        
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        if not username or not password:
            return Response({"detail": "Username and password are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "This username is already taken."},
                            status=status.HTTP_400_BAD_REQUEST)
        # Δημιουργούμε τον Django User
        user = User.objects.create_user(username=username, password=password, email=email)
        
        # Ετοιμάζουμε τα δεδομένα για το Seller
        seller_data = {
            "name": request.data.get('name'),
            "email": email,
            "phone": request.data.get('phone')
        }
        serializer = self.get_serializer(data=request.data, context={'user': user})
        serializer.is_valid(raise_exception=True)
        seller = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class SellerDashboardView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        seller = getattr(self.request.user, 'seller', None)
        if not seller:
            return Transaction.objects.none()
        # Επιστρέφει όλες τις συναλλαγές για ακίνητα που ανήκουν σε αυτόν τον πωλητή
        return Transaction.objects.filter(property__seller=seller).order_by('-created_at')
    
class PropertyCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PropertySerializer
    
    def perform_create(self, serializer):
        seller = getattr(self.request.user, 'seller', None)
        if not seller:
            raise serializers.ValidationError("Only sellers can create properties.")
        serializer.save(seller=seller)

# API για την εγγραφή Αγοραστών (Buyers)
class BuyerRegisterView(generics.CreateAPIView):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
         # Δημιουργούμε τον Django User για τον Buyer
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        if not username or not password:
            return Response({"detail": "Username & password required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({"detail": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create_user(username=username, password=password, email=email)
        # Δημιουργούμε τον Buyer
        buyer_data = {
            "name": request.data.get('name'),
            "email": email,
            "phone": request.data.get('phone'),
            "identification_number": request.data.get('identification_number')
        }
        serializer = self.get_serializer(data=buyer_data)
        serializer.is_valid(raise_exception=True)
        buyer = serializer.save(user=user)
         # Ελέγχουμε αν υπάρχει AgentBuyerAssociation με matching στοιχεία (π.χ., temp_buyer_name και temp_buyer_identification_number)
        from .models import AgentBuyerAssociation
        if buyer.name and buyer.identification_number:
            associations = AgentBuyerAssociation.objects.filter(
                buyer__isnull=True,
                temp_buyer_name=buyer.name,
                temp_buyer_identification_number=buyer.identification_number
            )
            for assoc in associations:
                assoc.buyer = buyer
                assoc.save()
        
        return Response(BuyerSerializer(buyer).data, status=status.HTTP_201_CREATED)
        # Λαμβάνουμε το agent_id από τα URL kwargs ή το request data
        agent_id = self.kwargs.get("agent_id") or self.request.data.get("agent_id")
        print(f"Received agent_id: {agent_id}")  # Δοκιμαστική εκτύπωση
        agent = None
        if agent_id:
            # Αναζήτηση του Agent με βάση το primary key (pk)
            agent = Agent.objects.filter(agent_id=agent_id).first()
            print(f"Agent found: {agent}")  # Δοκιμαστική εκτύπωση
        # Αποθήκευση του Buyer με τον κατάλληλο agent
        serializer.save(agent=agent)

# API για την εγγραφή Μεσιτών (Agents)
class AgentRegisterAPIView(generics.CreateAPIView):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer
    permission_classes = [AllowAny]
    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')

        if not username or not password:
            return Response({"detail": "Username & password required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Έλεγχος αν υπάρχει ήδη ο χρήστης με το ίδιο username
        if User.objects.filter(username=username).exists():
            return Response({"detail": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)


        # Δημιουργούμε τον Django User
        user = User.objects.create_user(username=username, password=password, email=email)

        # Ετοιμάζουμε τα πεδία του Agent
        agent_data = {
            "name": request.data.get('name'),
            "email": email,
            "phone": request.data.get('phone'),
            "tax_id": request.data.get('tax_id'),
            "iban": request.data.get('iban'),
            "commission": request.data.get('commission')
        }
        serializer = self.get_serializer(data=agent_data,context={'user': user})
        serializer.is_valid(raise_exception=True)
        agent = serializer.save()

        return Response(AgentSerializer(agent).data, status=status.HTTP_201_CREATED)


# Απλό view για την αρχική σελίδα
def home(request):
    return HttpResponse("Καλώς ήρθατε στην πλατφόρμα αγοραπωλησίας ακινήτων!")

# List views (προαιρετικά, ανάλογα με τις ανάγκες)
class SellerListView(generics.ListAPIView):
    queryset = Seller.objects.all()
    serializer_class = SellerSerializer

class BuyerListView(generics.ListAPIView):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer

class AgentListView(generics.ListAPIView):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer

class PropertyListView(generics.ListAPIView):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated, IsVerifiedAgent]

class LeadCreateAPIView(generics.CreateAPIView):
    """
    Ενδεικτικό endpoint:  μεσίτης δημιουργεί ένα Lead (προφορική επαφή).
    """
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, IsVerifiedAgent]

    def perform_create(self, serializer):
        """
        Αυτόματα το agent που κάνει το αίτημα, 
        αποθηκεύουμε στο lead ως agent.
        """
        agent = self.request.user.agent
        buyer = serializer.validated_data['buyer']
        property_ = serializer.validated_data['property']
        existing_leads = Lead.objects.filter(buyer=buyer, property=property_, locked_until__isnull=False, locked_until__gte=timezone.now())
        if existing_leads.exists():
            raise ValidationError({"detail": "This buyer is locked for this property."})
    # generate OTP κλπ.
        lead=serializer.save(agent=agent)
         # Παράγουμε έναν απλό 6-ψήφιο αριθμό
        otp = str(random.randint(100000, 999999))
        lead.otp_code = otp
        lead.save()
        
        # Εδώ θα μπορούσες να στείλεις email/SMS στον buyer
        print(f"DEBUG: OTP for lead {lead.id} is {otp}")

class LeadVerifyOTPAPIView(APIView):
        permission_classes = [IsAuthenticated, IsVerifiedAgent]

        def post(self, request):
            lead_id = request.data.get('lead_id')
            otp_code = request.data.get('otp_code')

            if not lead_id or not otp_code:
                return Response({"detail": "lead_id and otp_code are required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                lead = Lead.objects.get(pk=lead_id)
            except Lead.DoesNotExist:
                return Response({"detail": "Lead not found"}, status=status.HTTP_404_NOT_FOUND)

        # Ελέγχουμε αν αυτό το lead ανήκει στον ίδιο μεσίτη (ή αν θες να επιτρέψεις σε οποιονδήποτε agent να κάνει verify)
            if lead.agent != request.user.agent:
                return Response({"detail": "Not your lead"}, status=status.HTTP_403_FORBIDDEN)

        # Ταιριάζει το OTP;
            if lead.otp_code == otp_code:
                lead.otp_verified = True
                lead.save()
                return Response({"detail": "OTP verified successfully"}, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "Invalid OTP code"}, status=status.HTTP_400_BAD_REQUEST)
            
class LeadUpdateStatusAPIView(APIView):
    permission_classes = [IsAuthenticated, IsVerifiedAgent]

    def post(self, request):
        lead_id = request.data.get('lead_id')
        status_ = request.data.get('status')  # 'interested' ή 'not_interested'

        lead = Lead.objects.get(pk=lead_id, agent=request.user.agent)
        if status_ == 'interested':
            lead.interested = True
            lead.locked_until = None
        else:
            lead.interested = False
            # Κλειδώνουμε για 3 μήνες
            lead.locked_until = timezone.now() + timedelta(days=90)

        lead.save()
        return Response({"detail": "Status updated"}, status=status.HTTP_200_OK)
    

class PropertyInterestView(APIView):
    """
    Ο αγοραστής δηλώνει "Ενδιαφέρομαι" για ένα ακίνητο.
    Συνήθως ο buyer έχει συνδεθεί (IsAuthenticated).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, property_id, agent_id=None):
        # 1. Βρίσκουμε το Property
        prop = get_object_or_404(Property, pk=property_id)
        
        # 2. Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
        if prop.user == request.user:
            return Response({
                "detail": "Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 3. Υποθέτουμε ότι ο request.user έχει buyer
        buyer = getattr(request.user, 'buyer', None)
        if not buyer:
            return Response({"detail": "You are not a Buyer"}, status=status.HTTP_403_FORBIDDEN)

        # 4. Agent (αν ήρθε από link μεσίτη)
        agent = None
        if agent_id:
            agent = Agent.objects.filter(pk=agent_id).first()

        # 5. Δημιουργούμε/ενημερώνουμε ένα Lead (αν το θες)
        # ...

        # 6. Δημιουργούμε το Transaction σε κατάσταση PRE_DEPOSIT (αν δεν υπάρχει ήδη)
        #    Μπορείς να ελέγξεις αν υπάρχει ήδη Transaction για (buyer, property) κ.λπ.
        transaction, created = Transaction.objects.get_or_create(
            property=prop,
            buyer=buyer,
            defaults={
                'agent': agent,
                'status': 'PRE_DEPOSIT'
            }
        )
        if not created:
            # Αν υπάρχει ήδη, απλώς μπορούμε να ενημερώσουμε τον agent κ.λπ.
            if agent:
                transaction.agent = agent
            transaction.status = 'PRE_DEPOSIT'
            transaction.save()

        # 7. Επιστρέφουμε το Transaction
        serializer = TransactionSerializer(transaction)
        return Response({
            "message": "Interest recorded successfully",
            "transaction": serializer.data
        }, status=status.HTTP_200_OK)
    
class BuyerTransactionsListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # μόνο τα transaction του buyer
        buyer = getattr(self.request.user, 'buyer', None)
        if not buyer:
            return Transaction.objects.none()
        return Transaction.objects.filter(buyer=buyer).order_by('-created_at')
    
# ΒΗΜΑ 5: Πληρωμή Προκαταβολής
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_deposit(request, transaction_id):
    transaction = get_object_or_404(Transaction, pk=transaction_id)
    buyer = getattr(request.user, 'buyer', None)
    if not buyer or transaction.buyer != buyer:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
    if transaction.status != 'PRE_DEPOSIT':
        return Response({"detail": "Wrong status"}, status=status.HTTP_400_BAD_REQUEST)

    amount = request.data.get('amount', None)
    if amount is None:
        return Response({"detail": "Missing amount"}, status=status.HTTP_400_BAD_REQUEST)

    transaction.pay_deposit(amount)
    transaction.property.is_reserved = True
    transaction.property.save()
    return Response({"detail": "Deposit paid", "transaction": TransactionSerializer(transaction).data},
                    status=status.HTTP_200_OK)

# ΒΗΜΑ 6.1: Upload Συμβολαίου / Απόδειξης Πληρωμής
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_contract(request, transaction_id):
    transaction = get_object_or_404(Transaction, pk=transaction_id)
    buyer = getattr(request.user, 'buyer', None)
    if not buyer or transaction.buyer != buyer:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    final_contract = request.FILES.get('final_contract_doc')
    proof_payment = request.FILES.get('proof_of_payment_doc')

    if final_contract:
        transaction.final_contract_doc = final_contract
    if proof_payment:
        transaction.proof_of_payment_doc = proof_payment

    transaction.save()
    return Response({"detail": "Documents uploaded", "transaction": TransactionSerializer(transaction).data},
                    status=status.HTTP_200_OK)

# ΒΗΜΑ 6.2 & 7: Οριστική Ολοκλήρωση + Πληρωμή Μεσίτη
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_transaction(request, transaction_id):
    transaction = get_object_or_404(Transaction, pk=transaction_id)
    # μπορούμε να επιτρέψουμε admin ή buyer, εδώ για απλότητα μόνο buyer
    buyer = getattr(request.user, 'buyer', None)
    if not buyer or transaction.buyer != buyer:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    if transaction.status != 'DEPOSIT_PAID':
        return Response({"detail": "Transaction not in DEPOSIT_PAID state"}, status=status.HTTP_400_BAD_REQUEST)

    transaction.finalize()
    transaction.property.is_sold = True
    transaction.property.save()

    # Πληρωμή Μεσίτη (demo)
    if transaction.agent:
        pay_commission_to_agent(transaction)

    return Response({"detail": "Transaction finalized", "transaction": TransactionSerializer(transaction).data},
                    status=status.HTTP_200_OK)

def pay_commission_to_agent(transaction):
    agent = transaction.agent
    if not agent:
        return
    # Π.χ. απλώς εκτυπώνουμε (demo). Στην πράξη καλείς τραπεζικό API
    print(f"Paying {transaction.deposit_amount}€ to agent {agent.name} (IBAN={agent.iban})")

class VisitAvailabilityCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisitAvailabilitySerializer

    def perform_create(self, serializer):
        seller = getattr(self.request.user, 'seller', None)
        if not seller:
            raise serializers.ValidationError("Only sellers can set availability.")
        property_id = self.request.data.get('property')
        if not property_id:
            raise serializers.ValidationError("Property ID is required.")
        try:
            property_instance = Property.objects.get(pk=property_id, seller=seller)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found or you are not the owner.")
        serializer.save(property=property_instance)

class VisitRequestCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisitRequestSerializer

    def perform_create(self, serializer):
        buyer = getattr(self.request.user, 'buyer', None)
        if not buyer:
            raise serializers.ValidationError("Only buyers can request a visit.")
        property_id = self.request.data.get('property')
        if not property_id:
            raise serializers.ValidationError("Property ID is required.")
        try:
            property_instance = Property.objects.get(pk=property_id)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found.")
        
        # Ελέγχουμε αν ο Seller του property επιθυμεί να αναλάβει τις επισκέψεις
        seller = property_instance.seller
        handler = seller.user if seller.handle_visits else None
        serializer.save(buyer=buyer, property=property_instance, handler=handler)

class SellerVisitRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisitRequestSerializer

    def get_queryset(self):
        seller = getattr(self.request.user, 'seller', None)
        if not seller:
            return VisitRequest.objects.none()
        return VisitRequest.objects.filter(property__seller=seller).order_by('-created_at')
    
class VisitRequestUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VisitRequestSerializer
    queryset = VisitRequest.objects.all()

    def update(self, request, *args, **kwargs):
        visit_request = self.get_object()
        seller = getattr(request.user, 'seller', None)
        if not seller or visit_request.property.seller != seller:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        data = {
            "status": request.data.get("status", visit_request.status),
            "seller_notes": request.data.get("seller_notes", visit_request.seller_notes)
        }
        serializer = self.get_serializer(visit_request, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
class CancelVisitRequestByBuyerView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class =VisitRequestCancellationSerializer
    def patch(self, request, pk):
        from .models import VisitRequest
        visit_request = get_object_or_404(VisitRequest, pk=pk)
        buyer = getattr(request.user, 'buyer', None)
        if not buyer or visit_request.buyer != buyer:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        
        # Έλεγχος εάν η ακύρωση γίνεται τουλάχιστον 1 ημέρα πριν την scheduled_date
        if timezone.now() > visit_request.scheduled_date - timedelta(days=1):
            return Response({"detail": "Cancellation period has expired. You must cancel at least 1 day before the scheduled visit."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Ενημέρωση του VisitRequest: ορίζουμε το status και προσθέτουμε αιτιολόγηση
        serializer = VisitRequestCancellationSerializer(visit_request, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status='CANCELLED_BY_BUYER')
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class CancelVisitRequestBySellerView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from .models import VisitRequest
        visit_request = get_object_or_404(VisitRequest, pk=pk)
        seller = getattr(request.user, 'seller', None)
        if not seller or visit_request.property.seller != seller:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        
        # Εδώ αντί για αυτόματη ακύρωση, μπορούμε να θέσουμε ένα flag ή status "CANCELLED_BY_SELLER" αλλά
        # ενημερώνουμε ότι πρέπει να επικοινωνήσει με τους διαχειριστές.
        # Εναλλακτικά, μπορούμε να επιστρέψουμε μήνυμα ότι η ακύρωση θα πρέπει να γίνει μέσω επικοινωνίας με το support.
        return Response({"detail": "Please contact platform support to cancel a scheduled visit."}, status=status.HTTP_403_FORBIDDEN)
    
class AdminCancelVisitRequestView(APIView):
    # Συνήθως αυτό το endpoint θα προστατεύεται με ειδικό permission (π.χ. IsAdminUser)
    permission_classes = [IsAuthenticated]  # Εδώ θα προσθέσεις επιπλέον admin permission σε παραγωγή

    def patch(self, request, pk):
        from .models import VisitRequest
        visit_request = get_object_or_404(VisitRequest, pk=pk)
        serializer = VisitRequestCancellationSerializer(visit_request, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Ο admin επιβεβαιώνει την ακύρωση, οπότε θέτουμε status σε CANCELLED_BY_SELLER (αν πρόκειται για Seller cancellation)
        serializer.save(status='CANCELLED_BY_SELLER')
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class SupportTicketCreateView(generics.CreateAPIView):
    """
    Endpoint για να ανοίξει ένας Buyer ένα Support Ticket.
    Ο συνδεδεμένος Buyer ορίζει το subject και την περιγραφή (description).
    Αν το ticket αφορά και συγκεκριμένο Property, αυτό το πεδίο μπορεί να συμπεριληφθεί.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupportTicketSerializer

    def perform_create(self, serializer):
        buyer = getattr(self.request.user, 'buyer', None)
        if not buyer:
            raise serializers.ValidationError("Only buyers can create support tickets.")
        serializer.save(buyer=buyer)

class SupportTicketListView(generics.ListAPIView):
    """
    Επιστρέφει όλα τα Support Tickets που έχει ανοίξει ο συνδεδεμένος Buyer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupportTicketSerializer

    def get_queryset(self):
        buyer = getattr(self.request.user, 'buyer', None)
        if not buyer:
            return SupportTicket.objects.none()
        return SupportTicket.objects.filter(buyer=buyer).order_by('-created_at')
    
class SupportMessageCreateView(generics.CreateAPIView):
    """
    Endpoint για αποστολή μηνύματος σε ένα Support Ticket.
    Ο αποστολέας καθορίζεται αυτόματα από το request.user.
    Το πεδίο ticket ορίζεται ως parameter στο σώμα ή στο URL.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupportMessageSerializer

    def perform_create(self, serializer):
        # Ελέγχουμε αν υπάρχει το ticket στο σώμα
        ticket_id = self.request.data.get('ticket')
        if not ticket_id:
            raise serializers.ValidationError("Ticket ID is required.")
        # Μπορείς επίσης να προσθέσεις επιπλέον έλεγχο αν ο Buyer που στέλνει μήνυμα έχει ανοίξει αυτό το ticket,
        # ή αν ο admin στέλνει μήνυμα, κλπ.
        serializer.save(sender=self.request.user)

class SupportMessageListView(generics.ListAPIView):
    """
    Επιστρέφει όλα τα μηνύματα για ένα συγκεκριμένο Support Ticket.
    Το ticket ID θα ληφθεί ως query parameter (π.χ. ?ticket=1) ή μπορεί να οριστεί στο URL.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SupportMessageSerializer

    def get_queryset(self):
        ticket_id = self.request.query_params.get('ticket')
        if not ticket_id:
            return SupportMessage.objects.none()
        return SupportMessage.objects.filter(ticket__id=ticket_id).order_by('created_at')
    
class BuyerRegisterFromAgentView(generics.CreateAPIView):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Εξαγωγή βασικών στοιχείων για τη δημιουργία του Django User
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        
        if not username or not password:
            return Response({"detail": "Username & password required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({"detail": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Δημιουργία του Django User
        user = User.objects.create_user(username=username, password=password, email=email)
        
        # Προετοιμασία δεδομένων για το Buyer
        buyer_data = {
            "name": request.data.get('name'),
            "email": email,
            "phone": request.data.get('phone')
        }
        serializer = self.get_serializer(data=buyer_data)
        serializer.is_valid(raise_exception=True)
        buyer = serializer.save(user=user)
        
        # Λήψη agent_id και property_id από το URL
        agent_id = self.kwargs.get("agent_id")
        property_id = self.kwargs.get("property_id")
        
        # Αναζήτηση του Agent βάσει του πεδίου agent_id (που είναι UUIDField)
        agent = Agent.objects.filter(agent_id=agent_id).first()
        if not agent:
            raise serializers.ValidationError({"agent_id": "Invalid agent_id provided."})
        
        # Αναζήτηση του Property βάσει του property_id (πρέπει να είναι ακέραιος)
        property_obj = Property.objects.filter(pk=property_id).first()
        if not property_obj:
            raise serializers.ValidationError({"property_id": "Invalid property_id provided."})
        
        # Δημιουργία της συσχέτισης μεταξύ Buyer, Agent και Property
        AgentBuyerAssociation.objects.create(buyer=buyer, agent=agent, property=property_obj)
        
        # Επιστροφή του Response με τα δεδομένα του Buyer
        return Response(BuyerSerializer(buyer).data, status=status.HTTP_201_CREATED)

class BuyerAgentAssociationResponseView(APIView):
    """
    Επιτρέπει στον buyer να δηλώσει αν αποδέχεται (accepted=True) ή απορρίπτει (accepted=False) 
    την συσχέτιση με τον agent για τη συγκεκριμένη ιδιοκτησία.
    Αν απορρίψει, το ακίνητο θα "κλειδώσει" για 2 εβδομάδες.
    URL: /api/buyer/agent_association/<association_id>/response/
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, association_id):
        try:
            association = AgentBuyerAssociation.objects.get(id=association_id, buyer=request.user.buyer)
        except AgentBuyerAssociation.DoesNotExist:
            return Response({"detail": "Association not found."}, status=status.HTTP_404_NOT_FOUND)
        
        accepted = request.data.get("accepted")
        if accepted is None:
            return Response({"detail": "Field 'accepted' is required."}, status=status.HTTP_400_BAD_REQUEST)
        if accepted is False:
            # Εάν ο buyer απορρίψει, ορίζουμε lock για 2 εβδομάδες
            association.lock_until = timezone.now() + timedelta(weeks=2)
        association.accepted = accepted
        association.save()
        from .serializers import AgentBuyerAssociationSerializer  # Εισάγουμε εδώ αν δεν έχει ήδη εισαχθεί
        serializer = AgentBuyerAssociationSerializer(association)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class GenerateOTPView(APIView):
    """
    Δημιουργεί και αποθηκεύει ένα OTP για έναν Buyer.
    Request Body πρέπει να περιέχει "buyer_id".
    """
    permission_classes = [IsAuthenticated]  # Μπορεί να περιοριστεί σε ρόλους (π.χ., Agent ή admin)
    
    def post(self, request):
        buyer_id = request.data.get("buyer_id")
        if not buyer_id:
            return Response({"detail": "buyer_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            buyer = Buyer.objects.get(id=buyer_id)
        except Buyer.DoesNotExist:
            return Response({"detail": "Buyer not found."}, status=status.HTTP_404_NOT_FOUND)
        otp_code = str(random.randint(100000, 999999))
        otp_record = OTPRecord.objects.create(buyer=buyer, otp=otp_code)
        # TODO: Στείλε OTP μέσω SMS/email. Για τώρα επιστρέφουμε το otp.
        return Response({"detail": "OTP generated", "otp": otp_code}, status=status.HTTP_201_CREATED)
    
class VerifyOTPView(APIView):
    """
    Επιβεβαιώνει το OTP για έναν Buyer.
    Request Body πρέπει να περιέχει "buyer_id" και "otp".
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        buyer_id = request.data.get("buyer_id")
        otp_input = request.data.get("otp")
        if not buyer_id or not otp_input:
            return Response({"detail": "buyer_id and otp are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            otp_record = OTPRecord.objects.filter(buyer_id=buyer_id, otp=otp_input, is_verified=False).latest('created_at')
        except OTPRecord.DoesNotExist:
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
        otp_record.is_verified = True
        otp_record.save()
        return Response({"detail": "OTP verified successfully."}, status=status.HTTP_200_OK)
    
class AgentDashboardView(APIView):
    """
    Επιστρέφει όλα τα AgentBuyerAssociation records για τον Agent που είναι συνδεδεμένος.
    Αυτό επιτρέπει στον Agent να δει όλους τους Buyers που εγγράφηκαν μέσω των links του,
    μαζί με τις πληροφορίες της ιδιοκτησίας και το αν ο buyer έχει αποδεχτεί ή όχι τη συσχέτιση.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        agent = get_object_or_404(Agent, user=request.user)
        
        # Get all transactions for this agent
        transactions = Transaction.objects.filter(agent=agent)
        
        # Get unique buyers from transactions
        buyers = Buyer.objects.filter(transaction__in=transactions).distinct()
        
        data = []
        for buyer in buyers:
            # Get the latest transaction for this buyer
            latest_transaction = transactions.filter(buyer=buyer).order_by('-created_at').first()
            
            if latest_transaction:
                data.append({
                    'id': buyer.id,
                    'name': buyer.name,
                    'email': buyer.email,
                    'transactionId': latest_transaction.id,
                    'propertyTitle': latest_transaction.property.title,
                    'status': latest_transaction.status
                })
        
        return Response(data)
    
class CreateTemporaryAssociationView(generics.CreateAPIView):
    """
    Endpoint για δημιουργία temporary association από Agent, όταν εισάγει χειροκίνητα στοιχεία ενός
    ενδιαφερόμενου Buyer που δεν έχει εγγραφεί ακόμα.
    
    Απαιτούμενα πεδία στο request body:
      - property: το ID του ακινήτου
      - temp_buyer_name: το όνομα του πιθανού αγοραστή
      - temp_buyer_identification_number: ο αριθμός ταυτότητας (ή άλλο στοιχείο ταυτοποίησης)
    
    Ο συνδεδεμένος χρήστης (μέσω του token) πρέπει να είναι Agent.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TemporaryAssociationSerializer

    def create(self, request, *args, **kwargs):
        # Ελέγχουμε αν ο συνδεδεμένος χρήστης είναι Agent.
        # Εφόσον στο μοντέλο δεν έχει οριστεί related_name, χρησιμοποιούμε request.user.agent.
        agent = getattr(request.user, 'agent', None)
        if not agent:
            return Response({"detail": "User is not associated with an Agent account."}, status=status.HTTP_403_FORBIDDEN)
        
        # Λήψη των απαραίτητων πεδίων από το request body.
        property_id = request.data.get("property")
        temp_buyer_name = request.data.get("temp_buyer_name")
        temp_buyer_identification_number = request.data.get("temp_buyer_identification_number")
        
        if not property_id or not temp_buyer_name or not temp_buyer_identification_number:
            return Response({"detail": "Property, temp_buyer_name, and temp_buyer_identification_number are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Αναζήτηση του Property record
        property_obj = Property.objects.filter(pk=property_id).first()
        if not property_obj:
            return Response({"detail": "Invalid property_id provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Δημιουργία του temporary association
        association = AgentBuyerAssociation.objects.create(
            agent=agent,
            property=property_obj,
            temp_buyer_name=temp_buyer_name,
            temp_buyer_identification_number=temp_buyer_identification_number
        )
        
        serializer = self.get_serializer(association)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Ελέγχουμε τον ρόλο
        if Buyer.objects.filter(user=user).exists():
            role = "buyer"
        elif Seller.objects.filter(user=user).exists():
            role = "seller"
        elif Agent.objects.filter(user=user).exists():
            role = "agent"
        else:
            role = "unknown"

        print(f"DEBUG: User {user.username} authenticated with role: {role}")

        return Response({
            'token': token.key,
            'role': role
        })

class TransactionProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        transaction = get_object_or_404(Transaction, pk=transaction_id)
        progress = TransactionProgress.objects.filter(transaction=transaction)
        serializer = TransactionProgressSerializer(progress, many=True)
        return Response(serializer.data)

    def post(self, request, transaction_id):
        if not request.user.is_staff:
            return Response({"detail": "Only admin can update transaction progress"}, status=status.HTTP_403_FORBIDDEN)
            
        transaction = get_object_or_404(Transaction, pk=transaction_id)
        serializer = TransactionProgressSerializer(data={
            'transaction': transaction_id,
            'status': request.data.get('status'),
            'comment': request.data.get('comment'),
            'created_by': request.user.id
        })
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
