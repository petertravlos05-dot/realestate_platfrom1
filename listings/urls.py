from django.urls import path
from .views import SellerRegisterView, BuyerRegisterView, AgentRegisterAPIView
from .views import SellerListView, BuyerListView, PropertyListView
from .views import LeadCreateAPIView
from .views import LeadVerifyOTPAPIView
from .views import CustomAuthToken
from .views import PropertyCreateView, SellerDashboardView
from rest_framework.authtoken.views import obtain_auth_token
from .views import LeadUpdateStatusAPIView
from .views import (PropertyInterestView, pay_deposit, upload_contract, finalize_transaction, BuyerTransactionsListView, VisitAvailabilityCreateView, VisitRequestCreateView, SellerVisitRequestListView, VisitRequestUpdateView, CancelVisitRequestByBuyerView, CancelVisitRequestBySellerView, AdminCancelVisitRequestView
, SupportTicketCreateView, SupportTicketListView, SupportMessageCreateView, SupportMessageListView, BuyerRegisterFromAgentView,BuyerAgentAssociationResponseView,GenerateOTPView,VerifyOTPView,AgentDashboardView, CreateTemporaryAssociationView, TransactionProgressView )
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Εγγραφή χρηστών
    path('register/seller/', SellerRegisterView.as_view(), name='register_seller'),
    path('register/buyer/', BuyerRegisterView.as_view(), name='register_buyer'),
    path('register/agent/', AgentRegisterAPIView.as_view(), name='register_agent'),
    path('properties/', PropertyListView.as_view(), name='property-list'),
    path('api-token-auth/', CustomAuthToken.as_view(), name='api_token_auth'),
    path('leads/create/', LeadCreateAPIView.as_view(), name='lead-create'),
    path('leads/verify_otp/', LeadVerifyOTPAPIView.as_view(), name='lead-verify-otp'),
    path('leads/update_status/', LeadUpdateStatusAPIView.as_view()), 
    # Νέο endpoint για εγγραφή αγοραστή με agent_id
    path('seller/dashboard/', SellerDashboardView.as_view(), name='seller_dashboard'),
    path('register/buyer/from_agent/<str:agent_id>/<int:property_id>/', BuyerRegisterFromAgentView.as_view(), name='register_buyer_from_agent'),
    # Λίστες χρηστών
    path('agent/dashboard/', AgentDashboardView.as_view(), name='agent_dashboard'),
    path('sellers/', SellerListView.as_view(), name='list_sellers'),
    path('buyers/', BuyerListView.as_view(), name='list_buyers'),
    path('agents/', PropertyListView.as_view(), name='list_agents'),
    path('transactions/<int:transaction_id>/pay_deposit/', pay_deposit, name='pay_deposit'),
    path('transactions/<int:transaction_id>/upload_contract/', upload_contract, name='upload_contract'),
    path('transactions/<int:transaction_id>/finalize/', finalize_transaction, name='finalize_transaction'),
    path('transactions/<int:transaction_id>/progress/', TransactionProgressView.as_view(), name='transaction-progress'),
    path('properties/<int:property_id>/interest/', PropertyInterestView.as_view(), name='property-interest'),
    # Αν θέλεις και agent_id εδώ:
    # path('properties/<int:property_id>/interest/<uuid:agent_id>/', PropertyInterestView.as_view(), ...)
    path('properties/create/', PropertyCreateView.as_view(), name='create_property'),
    path('transactions/<int:transaction_id>/pay_deposit/', pay_deposit, name='pay-deposit'),
    path('transactions/<int:transaction_id>/upload_contract/', upload_contract, name='upload-contract'),
    path('transactions/<int:transaction_id>/finalize/', finalize_transaction, name='finalize-transaction'),
    path('buyer/agent_association/<int:association_id>/response/', BuyerAgentAssociationResponseView.as_view(), name='buyer_agent_association_response'),
    path('buyer/transactions/', BuyerTransactionsListView.as_view(), name='buyer-transactions'),
    # ... κ.λπ.
    # Endpoint για δημιουργία temporary association από Agent (manual entry)
    path('agent/associations/temporary/', CreateTemporaryAssociationView.as_view(), name='create_temporary_association'),
    path('visit_availability/create/', VisitAvailabilityCreateView.as_view(), name='create_visit_availability'),
    path('visit_requests/create/', VisitRequestCreateView.as_view(), name='create_visit_request'),
    path('seller/visit_requests/', SellerVisitRequestListView.as_view(), name='seller_visit_requests'),
    path('visit_requests/<int:pk>/update/', VisitRequestUpdateView.as_view(), name='update_visit_request'),
    path('visit_requests/<int:pk>/cancel/by_buyer/', CancelVisitRequestByBuyerView.as_view(), name='cancel_visit_request_by_buyer'),
    path('visit_requests/<int:pk>/cancel/by_seller/', CancelVisitRequestBySellerView.as_view(), name='cancel_visit_request_by_seller'),
    path('visit_requests/<int:pk>/cancel/admin/', AdminCancelVisitRequestView.as_view(), name='admin_cancel_visit_request'),
    path('support/tickets/create/', SupportTicketCreateView.as_view(), name='support_ticket_create'),
    path('support/tickets/', SupportTicketListView.as_view(), name='support_ticket_list'),
    path('support/messages/create/', SupportMessageCreateView.as_view(), name='support_message_create'),
    path('support/messages/', SupportMessageListView.as_view(), name='support_message_list'),
    # OTP Endpoints
    path('otp/generate/', GenerateOTPView.as_view(), name='generate_otp'),
    path('otp/verify/', VerifyOTPView.as_view(), name='verify_otp'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

