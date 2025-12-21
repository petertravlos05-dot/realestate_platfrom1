from rest_framework import serializers
from .models import Seller, Agent, Property, Lead, Transaction, Buyer, VisitAvailability, VisitRequest, SupportTicket, SupportMessage, AgentBuyerAssociation, OTPRecord, TransactionProgress

# Serializer για τους Πωλητές
class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = ['id', 'name', 'email', 'phone', 'tax_id', 'iban', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def create(self, validated_data):
        # Περιμένουμε να περάσει το user ως επιπλέον παράμετρος στο save()
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User must be provided.")
        return Seller.objects.create(user=user, **validated_data)


# Serializer για τους Μεσίτες
class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = [ 'name', 'email', 'phone', 'tax_id', 'iban', 'commission', 'created_at','agent_id','is_verified']
        read_only_fields = ['id', 'created_at', 'user']

    def create(self, validated_data):
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError("User is required for Agent creation.")
        # Δημιουργούμε το Agent record με το user
        return Agent.objects.create(user=user, **validated_data)
        


# Serializer για τους Αγοραστές
class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['id', 'name', 'email', 'phone', 'identification_number', 'created_at', 'agent']

# Δημιουργούμε ένα νέο Serializer για το μοντέλο Property
class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ['title', 'description', 'price','id','seller','is_verified','is_reserved','is_sold', 'created_at']
        # ή συγκεκριμένα fields, π.χ.: ['id', 'title', 'description', 'price', 'location', ...]
        read_only_fields = ['id', 'seller', 'is_verified', 'is_reserved', 'is_sold', 'created_at']


# listings/serializers.py
from rest_framework import serializers
from .models import Lead

class LeadSerializer(serializers.ModelSerializer):
    agent = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Lead
        fields = [
            'id', 'agent', 'buyer', 'property',
            'interested', 'locked_until',
            'otp_code', 'otp_verified',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at','agent','otp_code','otp_verified']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            'id', 'property', 'buyer', 'agent',
            'status', 'deposit_amount', 'deposit_paid',
            'final_contract_doc', 'proof_of_payment_doc',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status',
            'deposit_paid'
        ]
class VisitAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitAvailability
        fields = ['id', 'property', 'available_date', 'created_at']
        read_only_fields = ['id', 'created_at', 'property']

class VisitRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitRequest
        fields = ['id', 'property', 'buyer', 'handler', 'scheduled_date', 'status','cancellation_reason', 'delegated', 'buyer_notes', 'seller_notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'buyer', 'handler','delegated', 'created_at', 'updated_at']

class VisitRequestCancellationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitRequest
        fields = ['status', 'cancellation_reason']
        # Δεν ορίζουμε τα πεδία ως read-only για να μπορέσουμε να ενημερώσουμε το status

class SupportTicketSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(source='buyer.user.username', read_only=True)
    
    class Meta:
        model = SupportTicket
        fields = ['id', 'buyer', 'buyer_username', 'property', 'subject', 'description', 'status', 'created_at', 'updated_at']
        # Ορισμένα πεδία καθορίζονται read-only ώστε να μην μπορούν να αλλάξουν από τον client
        read_only_fields = ['id', 'buyer', 'status', 'created_at', 'updated_at']

class SupportMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = SupportMessage
        fields = ['id', 'ticket', 'sender', 'sender_username', 'content', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_username', 'created_at']

class AgentBuyerAssociationSerializer(serializers.ModelSerializer):
    buyer_details = BuyerSerializer(source='buyer', read_only=True)
    property_details = PropertySerializer(source='property', read_only=True)
    class Meta:
        model = AgentBuyerAssociation
        fields = ['id', 'buyer','buyer_details', 'agent', 'property','property_details', 'accepted', 'lock_until', 'created_at']
        read_only_fields = ['id', 'buyer', 'agent', 'property', 'created_at', 'lock_until']

class OTPRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPRecord
        fields = ['id', 'buyer', 'otp', 'created_at', 'is_verified']
        read_only_fields = ['id', 'buyer', 'otp', 'created_at', 'is_verified']

from rest_framework import serializers
from .models import AgentBuyerAssociation

class TemporaryAssociationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentBuyerAssociation
        fields = ['id', 'agent', 'property', 'temp_buyer_name', 'temp_buyer_identification_number', 'created_at']
        read_only_fields = ['id', 'agent', 'property', 'created_at']

class TransactionProgressSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = TransactionProgress
        fields = ['id', 'transaction', 'status', 'comment', 'created_at', 'created_by', 'created_by_name']
        read_only_fields = ['id', 'created_at', 'created_by']