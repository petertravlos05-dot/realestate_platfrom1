'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { FiHome, FiUsers, FiMessageSquare, FiLogOut, FiCheck, FiX, FiUser, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { FaGift, FaUser, FaBuilding, FaHeadset, FaSearch, FaComments, FaEnvelope, FaExchangeAlt, FaPaperPlane, FaTimes, FaSave, FaRocket, FaCreditCard } from 'react-icons/fa';
import PropertyModal from './components/PropertyModal';
import { default as TransactionModal } from './components/TransactionModal';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiClient, fetchFromBackend, uploadToBackend } from '@/lib/api/client';

type StageType = 'PENDING' | 'MEETING_SCHEDULED' | 'DEPOSIT_PAID' | 'FINAL_SIGNING' | 'COMPLETED' | 'CANCELLED';

// Σταθερές για το admin modal
const categoryLabels = {
  PROPERTY_INQUIRY: 'Ερώτηση για Ακίνητο',
  TRANSACTION_ISSUE: 'Πρόβλημα με Συναλλαγή',
  TECHNICAL_SUPPORT: 'Τεχνική Υποστήριξη',
  ACCOUNT_ISSUE: 'Πρόβλημα με Λογαριασμό',
  PAYMENT_ISSUE: 'Πρόβλημα με Πληρωμή',
  GENERAL: 'Γενικό Ερώτημα'
};

const priorityLabels = {
  LOW: 'Χαμηλή',
  MEDIUM: 'Μεσαία',
  HIGH: 'Υψηλή',
  URGENT: 'Επείγον'
};

const categories = [
  { id: 'GENERAL', label: 'Γενικό Ερώτημα' },
  { id: 'PROPERTY_INQUIRY', label: 'Ερώτηση για Ακίνητο' },
  { id: 'TRANSACTION_ISSUE', label: 'Πρόβλημα με Συναλλαγή' },
  { id: 'TECHNICAL_SUPPORT', label: 'Τεχνική Υποστήριξη' },
  { id: 'ACCOUNT_ISSUE', label: 'Πρόβλημα με Λογαριασμό' },
  { id: 'PAYMENT_ISSUE', label: 'Πρόβλημα με Πληρωμή' }
];

const priorities = [
  { id: 'LOW', label: 'Χαμηλή' },
  { id: 'MEDIUM', label: 'Μεσαία' },
  { id: 'HIGH', label: 'Υψηλή' },
  { id: 'URGENT', label: 'Επείγον' }
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  referralInfo?: {
    hasReferral: boolean;
    referrerName?: string;
    referralCode?: string;
  };
  isReferrer?: boolean;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  propertyCount: number;
  lastPropertyDate: string;
  lastPropertyStatus: string;
  referralInfo?: {
    hasReferral: boolean;
    referrerName?: string;
    referralCode?: string;
  };
  properties?: SellerProperty[];
}

interface Property {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested' | 'unavailable';
  isVerified: boolean;
  removalRequested?: boolean;
  createdAt: string;
  type: string;
  propertyType: string;
  location: string;
  city: string;
  street: string;
  number: string;
  size: number;
  area: number;
  images: string[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  owner: {
    id: string;
    email: string;
  };
  updatedAt: string;
  transaction?: {
    progress: {
      stage: string;
      updatedAt: string;
    };
  };
  uploadMethod: string;
  assignmentType: string;
}

interface SellerProperty {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested' | 'unavailable';
  isVerified: boolean;
  createdAt: string;
  type?: string;
  propertyType?: string;
  location?: string;
  city?: string;
  street?: string;
  number?: string;
  size?: number;
  area?: number;
  images?: string[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  owner?: {
    id: string;
    email: string;
  };
  updatedAt: string;
  transaction?: {
    progress: {
      stage: string;
      updatedAt: string;
    };
  };
  uploadMethod?: string;
  assignmentType?: string;
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: 'PROPERTY_INQUIRY' | 'TRANSACTION_ISSUE' | 'TECHNICAL_SUPPORT' | 'ACCOUNT_ISSUE' | 'PAYMENT_ISSUE' | 'GENERAL';
  selectedRole?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  property?: {
    id: string;
    title: string;
  };
  transaction?: {
    id: string;
    stage?: string;
    property: {
      id: string;
      title: string;
    };
  };
  messages: SupportMessage[];
}

interface SupportMessage {
  id: string;
  content: string;
  createdAt: string;
  isFromAdmin: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  metadata?: {
    isMultipleChoice?: boolean;
    options?: string[];
  } | null;
}

interface Update {
  id: string;
  text: string;
  date: string;
  message: string;
  recipient?: 'buyer' | 'seller' | 'agent';
  category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
  isUnread: boolean;
  stage: string;
  createdAt?: string;
}

interface TransactionProgress {
  stage: string;
  updatedAt: string;
  notifications: Update[];
}

interface Transaction {
  id: string;
  buyer: {
    name: string;
    email: string;
    phone?: string;
  };
  seller: {
    name: string;
    email: string;
    phone?: string;
  };
  agent?: {
    name: string;
    email: string;
    phone?: string;
  };
  property: {
    id: string;
    title: string;
    status: string;
    images: string[];
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    features: string[];
  };
  status: string;
  createdAt: string;
  progress: TransactionProgress;
}

// Mapping για όλα τα στάδια συναλλαγής
const transactionStageLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Αναμονή για ραντεβού', color: 'bg-yellow-100 text-yellow-800' },
  INITIAL_CONTACT: { label: 'Πρώτη επικοινωνία', color: 'bg-blue-100 text-blue-800' },
  MEETING_SCHEDULED: { label: 'Έγινε ραντεβού', color: 'bg-blue-100 text-blue-800' },
  PROPERTY_VIEWING: { label: 'Επισκόπηση ακινήτου', color: 'bg-indigo-100 text-indigo-800' },
  OFFER_NEGOTIATION: { label: 'Διαπραγμάτευση προσφοράς', color: 'bg-purple-100 text-purple-800' },
  CONTRACT_PREPARATION: { label: 'Προετοιμασία συμβολαίου', color: 'bg-orange-100 text-orange-800' },
  CONTRACT_SIGNING: { label: 'Υπογραφή συμβολαίου', color: 'bg-green-100 text-green-800' },
  DEPOSIT_PAID: { label: 'Έγινε προκαταβολή', color: 'bg-green-100 text-green-800' },
  PAYMENT_PROCESSING: { label: 'Επεξεργασία πληρωμής', color: 'bg-teal-100 text-teal-800' },
  PROPERTY_TRANSFER: { label: 'Μεταφορά ακινήτου', color: 'bg-cyan-100 text-cyan-800' },
  FINAL_SIGNING: { label: 'Τελική υπογραφή', color: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Ολοκληρώθηκε', color: 'bg-purple-100 text-purple-800' },
  CANCELLED: { label: 'Ακυρώθηκε', color: 'bg-red-100 text-red-800' },
};

// Επιλογές φιλτραρίσματος για στάδια συναλλαγής
const transactionStageFilterOptions = [
  { value: 'all', label: 'Όλα τα στάδια' },
  { value: 'PENDING', label: 'Αναμονή για ραντεβού' },
  { value: 'INITIAL_CONTACT', label: 'Πρώτη επικοινωνία' },
  { value: 'MEETING_SCHEDULED', label: 'Έγινε ραντεβού' },
  { value: 'PROPERTY_VIEWING', label: 'Επισκόπηση ακινήτου' },
  { value: 'OFFER_NEGOTIATION', label: 'Διαπραγμάτευση προσφοράς' },
  { value: 'CONTRACT_PREPARATION', label: 'Προετοιμασία συμβολαίου' },
  { value: 'CONTRACT_SIGNING', label: 'Υπογραφή συμβολαίου' },
  { value: 'DEPOSIT_PAID', label: 'Έγινε προκαταβολή' },
  { value: 'PAYMENT_PROCESSING', label: 'Επεξεργασία πληρωμής' },
  { value: 'PROPERTY_TRANSFER', label: 'Μεταφορά ακινήτου' },
  { value: 'FINAL_SIGNING', label: 'Τελική υπογραφή' },
  { value: 'COMPLETED', label: 'Ολοκληρώθηκε' },
  { value: 'CANCELLED', label: 'Ακυρώθηκε' },
];

interface VisitSchedulingSettings {
  presenceType?: 'platform_only' | 'seller_and_platform';
  schedulingType?: 'seller_availability' | 'buyer_proposal';
  availability?: {
    days: string[];
    timeSlots: string[];
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/admin/login');
    },
  });
  const { sendStageCompletionNotification } = useNotifications();

  // Debug logs για το session
  console.log('=== AdminDashboard: Session debug ===', {
    status,
    hasSession: !!session,
    userRole: session?.user?.role,
    userId: session?.user?.id
  });

  const [activeTab, setActiveTab] = useState('listings');
  const [users, setUsers] = useState<User[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [companies, setCompanies] = useState<User[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<User | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalTab, setCompanyModalTab] = useState<'details' | 'subscription'>('details');
  const [companySubscription, setCompanySubscription] = useState<any>(null);
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    planName: '',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    currentPeriodStart: '',
    currentPeriodEnd: ''
  });
  const [listings, setListings] = useState<Property[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [newMessageData, setNewMessageData] = useState({
    userId: '',
    propertyId: '',
    content: ''
  });
  
  // Νέα state για το admin modal
  const [selectedUserForTicket, setSelectedUserForTicket] = useState<User | null>(null);
  const [selectedRoleForTicket, setSelectedRoleForTicket] = useState<'buyer' | 'seller' | 'agent' | ''>('');
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as 'PROPERTY_INQUIRY' | 'TRANSACTION_ISSUE' | 'TECHNICAL_SUPPORT' | 'ACCOUNT_ISSUE' | 'PAYMENT_ISSUE' | 'GENERAL',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    propertyId: '',
    transactionId: '',
    selectedRole: ''
  });
  const [userSpecificProperties, setUserSpecificProperties] = useState<Property[]>([]);
  const [userSpecificTransactions, setUserSpecificTransactions] = useState<Transaction[]>([]);
  const [isCreatingMessage, setIsCreatingMessage] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cancelledTransactions, setCancelledTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'unavailable'>('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userReferralStats, setUserReferralStats] = useState<any>(null);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [newPoints, setNewPoints] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>('');
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [isUpdatingTicketStatus, setIsUpdatingTicketStatus] = useState(false);
  
  // State για το status modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<SupportTicket | null>(null);
  const [isUpdatingStatusFromModal, setIsUpdatingStatusFromModal] = useState(false);
  
  // Φίλτρα για μηνύματα
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState<'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('all');
  const [messagePriorityFilter, setMessagePriorityFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('all');
  const [messageCategoryFilter, setMessageCategoryFilter] = useState<'all' | 'PROPERTY_INQUIRY' | 'TRANSACTION_ISSUE' | 'TECHNICAL_SUPPORT' | 'ACCOUNT_ISSUE' | 'PAYMENT_ISSUE' | 'GENERAL'>('all');
  const [messageTransactionStageFilter, setMessageTransactionStageFilter] = useState<string>('all');
  
  // State για πολλαπλές επιλογές στο chat area
  const [isReplyMultipleChoice, setIsReplyMultipleChoice] = useState(false);
  const [replyOptions, setReplyOptions] = useState(['', '']);
  
  // State για αποθήκευση μηνυμάτων
  const [isSaveMessageModalOpen, setIsSaveMessageModalOpen] = useState(false);
  const [isSavedMessagesModalOpen, setIsSavedMessagesModalOpen] = useState(false);
  const [savedMessageTitle, setSavedMessageTitle] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  // State για τα ραντεβού
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentFilters, setAppointmentFilters] = useState({
    search: '',
    status: 'all',
    propertyId: 'all',
    buyerId: 'all',
    sellerId: 'all'
  });
  const [appointmentFilterOptions, setAppointmentFilterOptions] = useState({
    properties: [],
    buyers: [],
    sellers: []
  });

  // State για τις ρυθμίσεις των ραντεβού
  const [selectedAppointmentForSettings, setSelectedAppointmentForSettings] = useState<any>(null);
  const [isAppointmentSettingsModalOpen, setIsAppointmentSettingsModalOpen] = useState(false);
  const [appointmentSettings, setAppointmentSettings] = useState<VisitSchedulingSettings | null>(null);
  const [appointmentSettingsLoading, setAppointmentSettingsLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user?.id) {
      router.push('/admin/login');
      return;
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    fetchData();
  }, [activeTab, session, status]);

  // Φορτώνουμε τα μηνύματα όταν αλλάζει το tab ή τα φίλτρα
  useEffect(() => {
    if (activeTab === 'messages' && session?.user?.id) {
      fetchSupportTickets().then(setSupportTickets).catch(console.error);
    }
  }, [messageSearchQuery, messageStatusFilter, messagePriorityFilter, messageCategoryFilter, messageTransactionStageFilter, activeTab, session]);

  // Φορτώνουμε τα ραντεβού όταν αλλάζει το tab ή τα φίλτρα
  useEffect(() => {
    if (activeTab === 'appointments' && session?.user?.id) {
      fetchAppointments().catch(console.error);
    }
  }, [appointmentFilters, activeTab, session]);

  const fetchUsers = async () => {
    const { data: users } = await apiClient.get('/admin/users');
    
    // Φέρνουμε τα referral δεδομένα για κάθε χρήστη
    const usersWithReferrals = await Promise.all(
      users.map(async (user: User) => {
        try {
          const referralResponse = await apiClient.get(`/referrals/user-referral?userId=${user.id}`);
          const statsResponse = await apiClient.get(`/referrals/stats?userId=${user.id}`);
          
          let referralInfo: { hasReferral: boolean; referrerName?: string; referralCode?: string } = { hasReferral: false };
          let isReferrer = false;
          
          try {
            const referralData = referralResponse.data;
            referralInfo = {
              hasReferral: referralData.hasReferral,
              referrerName: referralData.referrerName,
              referralCode: referralData.referralCode
            };
          } catch (e) {}
          
          try {
            const statsData = statsResponse.data;
            isReferrer = statsData.referrals && statsData.referrals.some((r: any) => r.type === 'referrer');
          } catch (e) {}
          
          return {
            ...user,
            referralInfo,
            isReferrer
          };
        } catch (error) {
          console.error(`Error fetching referral for user ${user.id}:`, error);
          return {
            ...user,
            referralInfo: { hasReferral: false },
            isReferrer: false
          };
        }
      })
    );
    
    return usersWithReferrals;
  };

  const fetchCompanies = async () => {
    const { data: companies } = await apiClient.get('/admin/companies');
    
    // Φέρνουμε τα referral δεδομένα για κάθε εταιρεία
    const companiesWithReferrals = await Promise.all(
      companies.map(async (company: User) => {
        try {
          const referralResponse = await fetch(`/api/referrals/user-referral?userId=${company.id}`);
          const statsResponse = await fetch(`/api/referrals/stats?userId=${company.id}`);
          
          let referralInfo: { hasReferral: boolean; referrerName?: string; referralCode?: string } = { hasReferral: false };
          let isReferrer = false;
          
          if (referralResponse.ok) {
            const referralData = await referralResponse.json();
            referralInfo = {
              hasReferral: referralData.hasReferral,
              referrerName: referralData.referrerName,
              referralCode: referralData.referralCode
            };
          }
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            isReferrer = statsData.referrals && statsData.referrals.some((r: any) => r.type === 'referrer');
          }
          
          return {
            ...company,
            referralInfo,
            isReferrer
          };
        } catch (error) {
          console.error(`Error fetching referral for company ${company.id}:`, error);
          return {
            ...company,
            referralInfo: { hasReferral: false },
            isReferrer: false
          };
        }
      })
    );
    
    return companiesWithReferrals;
  };

  const fetchSellers = async () => {
    const { data: sellers } = await apiClient.get('/admin/sellers');
    
    // Φέρνουμε τα referral δεδομένα και τα ακίνητα για κάθε πωλητή
    const sellersWithDetails = await Promise.all(
      sellers.map(async (seller: Seller) => {
        try {
          // Φέρνουμε τα referral δεδομένα
          const referralResponse = await fetch(`/api/referrals/user-referral?userId=${seller.id}`);
          let referralInfo: { hasReferral: boolean; referrerName?: string; referralCode?: string } = { hasReferral: false };
          
          if (referralResponse.ok) {
            const referralData = await referralResponse.json();
            referralInfo = {
              hasReferral: referralData.hasReferral,
              referrerName: referralData.referrerName,
              referralCode: referralData.referralCode
            };
          }
          
          // Φέρνουμε τα ακίνητα του πωλητή
          const propertiesResponse = await fetch(`/api/admin/sellers/${seller.id}/properties`);
          let properties: SellerProperty[] = [];
          
          if (propertiesResponse.ok) {
            const propertiesData = await propertiesResponse.json();
            properties = propertiesData;
          }
          
          return {
            ...seller,
            referralInfo,
            properties
          };
        } catch (error) {
          console.error(`Error fetching details for seller ${seller.id}:`, error);
          return {
            ...seller,
            referralInfo: { hasReferral: false },
            properties: []
          };
        }
      })
    );
    
    return sellersWithDetails;
  };

  const fetchListings = async () => {
    const { data } = await apiClient.get('/admin/listings');
    return data;
  };

  const fetchSupportTickets = async () => {
    const params = new URLSearchParams();
    if (messageSearchQuery) params.append('search', messageSearchQuery);
    if (messageStatusFilter !== 'all') params.append('status', messageStatusFilter);
    if (messagePriorityFilter !== 'all') params.append('priority', messagePriorityFilter);
    if (messageCategoryFilter !== 'all') params.append('category', messageCategoryFilter);
    if (messageTransactionStageFilter !== 'all') params.append('transactionStage', messageTransactionStageFilter);
    
    const response = await fetch(`/api/admin/messages?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch support tickets');
    }
    return response.json();
  };

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const params = new URLSearchParams();
      if (appointmentFilters.search) params.append('search', appointmentFilters.search);
      if (appointmentFilters.status !== 'all') params.append('status', appointmentFilters.status);
      if (appointmentFilters.propertyId !== 'all') params.append('propertyId', appointmentFilters.propertyId);
      if (appointmentFilters.buyerId !== 'all') params.append('buyerId', appointmentFilters.buyerId);
      if (appointmentFilters.sellerId !== 'all') params.append('sellerId', appointmentFilters.sellerId);
      
      const { data } = await apiClient.get(`/admin/appointments?${params.toString()}`);
      setAppointments(data.appointments);
      setAppointmentFilterOptions(data.filters);
      return data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Σφάλμα κατά την ανάκτηση των ραντεβού');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleAppointmentStatusChange = async (appointmentId: string, status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') => {
    try {
      await apiClient.put(`/admin/appointments/${appointmentId}/status`, { status });

      // Ενημέρωση του state με το νέο status
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          app.id === appointmentId
            ? { ...app, status }
            : app
        )
      );

      const statusMessages = {
        'ACCEPTED': 'εγκρίθηκε',
        'REJECTED': 'απορρίφθηκε',
        'CANCELLED': 'ακυρώθηκε'
      };
      toast.success(`Το ραντεβού ${statusMessages[status]} επιτυχώς`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Σφάλμα κατά την ενημέρωση του ραντεβού');
    }
  };

  const fetchTransactions = async () => {
    try {
      const [activeResponse, cancelledResponse] = await Promise.all([
        apiClient.get('/admin/transactions?cancelled=false'),
        apiClient.get('/admin/transactions?cancelled=true')
      ]);

      const activeData = activeResponse.data;
      const cancelledData = cancelledResponse.data;

      setTransactions(deduplicateTransactions(activeData));
      setCancelledTransactions(deduplicateTransactions(cancelledData));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersData, sellersData, companiesData, listingsData] = await Promise.all([
        fetchUsers(),
        fetchSellers(),
        fetchCompanies(),
        fetchListings()
      ]);

      setUsers(usersData);
      setSellers(sellersData);
      setCompanies(companiesData);
      setListings(listingsData);
      
      // Αρχικοποιούμε με κενή λίστα - τα μηνύματα θα φορτωθούν όταν αλλάξουμε στο messages tab
      setSupportTickets([]);
      
      await fetchTransactions();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/admin/login');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApproveProperty = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Failed to approve property');
      
      const data = await res.json();
      toast.success(data.message || 'Το ακίνητο εγκρίθηκε επιτυχώς');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to approve property');
      toast.error('Σφάλμα κατά την έγκριση του ακινήτου');
    }
  };

  const handleRejectProperty = async (id: string) => {
    try {
      const { data } = await apiClient.put(`/admin/listings/${id}/reject`);
      toast.success(data?.message || 'Το ακίνητο απορρίφθηκε');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to reject property');
      toast.error('Σφάλμα κατά την απόρριψη του ακινήτου');
    }
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (status: string, message?: string) => {
    if (!selectedProperty) return;

    try {
      const endpoint = status === 'info_requested' 
        ? `/admin/listings/${selectedProperty.id}/request-info`
        : `/admin/listings/${selectedProperty.id}/${status}`;

      await apiClient.put(endpoint, { message });
      
      // Refresh the listings data
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update property status');
    }
  };

  const handlePropertyEdit = async (data: any) => {
    if (!selectedProperty) return;

    try {
      const res = await fetch(`/api/admin/listings/${selectedProperty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Failed to update property');
      
      // Refresh the listings data
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to update property');
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (!selectedProperty) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });

    try {
      const res = await fetch(`/api/admin/listings/${selectedProperty.id}/images`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to upload images');
      
      // Refresh the listings data
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to upload images');
    }
  };

  const handleMarkUnavailable = async () => {
    if (!selectedProperty) return;

    try {
      await apiClient.put(`/admin/listings/${selectedProperty.id}/unavailable`);
      
      // Refresh the listings data
      fetchData();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to mark property as unavailable');
    }
  };

  const handleCompleteChanges = async (propertyId: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/listings/${propertyId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to complete changes');
      }

      // Refresh the properties list
      fetchData();
    } catch (error) {
      console.error('Error completing changes:', error);
      throw error;
    }
  };

  const handleToggleOwnership = async () => {
    if (!selectedProperty) return;

    try {
      const action = selectedProperty.status === 'unavailable' ? 'restore' : 'remove';
      const { data: updatedProperty } = await apiClient.put(`/admin/listings/${selectedProperty.id}/toggle-ownership`, { action });

      // Ανανεώνουμε τα δεδομένα και το selectedProperty
      await fetchData();
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to toggle ownership');
    }
  };

  const handleToggleRemovalRequest = async () => {
    if (!selectedProperty) return;

    try {
      const action = selectedProperty.removalRequested ? 'cancel' : 'approve';
      const { data: updatedProperty } = await apiClient.put(`/admin/listings/${selectedProperty.id}/toggle-removal-request`, { action });

      // Ανανεώνουμε τα δεδομένα και το selectedProperty
      await fetchData();
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to toggle removal request');
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleSellerClick = (seller: Seller) => {
    setSelectedSeller(seller);
    setIsSellerModalOpen(true);
  };

  const handleCompanyClick = async (company: User) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
    setCompanyModalTab('details');
    setIsEditingSubscription(false);
    
    // Φέρνουμε τα δεδομένα της συνδρομής
    try {
      console.log('=== Fetching subscription for company ===', {
        companyId: company.id,
        companyName: company.name
      });
      
      const { data: subscriptionData } = await apiClient.get(`/subscriptions?userId=${company.id}`);
      console.log('=== Subscription Data ===', subscriptionData);
      setCompanySubscription(subscriptionData);
      
      // Προετοιμάζουμε το form με τα υπάρχοντα δεδομένα
      if (subscriptionData) {
        setSubscriptionForm({
          planName: subscriptionData.plan?.name || '',
          status: subscriptionData.status || 'ACTIVE',
          billingCycle: subscriptionData.billingCycle || 'MONTHLY',
          currentPeriodStart: subscriptionData.currentPeriodStart ? 
            new Date(subscriptionData.currentPeriodStart).toISOString().split('T')[0] : '',
          currentPeriodEnd: subscriptionData.currentPeriodEnd ? 
            new Date(subscriptionData.currentPeriodEnd).toISOString().split('T')[0] : ''
        });
      } else {
        // Αν δεν υπάρχει συνδρομή, αρχικοποιούμε με default values
        setCompanySubscription(null);
        setSubscriptionForm({
          planName: '',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodStart: '',
          currentPeriodEnd: ''
        });
      }
    } catch (error) {
      console.error('Error fetching company subscription:', error);
      setCompanySubscription(null);
      setSubscriptionForm({
        planName: '',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: '',
        currentPeriodEnd: ''
      });
    }
  };

  const refreshSubscriptionData = async () => {
    if (!selectedCompany) return;
    
    try {
      console.log('=== Refreshing subscription data ===', {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name
      });
      
      const { data: subscriptionData } = await apiClient.get(`/subscriptions?userId=${selectedCompany.id}`);
      console.log('=== Refresh Subscription Data ===', subscriptionData);
      setCompanySubscription(subscriptionData);
      
      if (subscriptionData) {
        setSubscriptionForm({
          planName: subscriptionData.plan?.name || '',
          status: subscriptionData.status || 'ACTIVE',
          billingCycle: subscriptionData.billingCycle || 'MONTHLY',
          currentPeriodStart: subscriptionData.currentPeriodStart ? 
            new Date(subscriptionData.currentPeriodStart).toISOString().split('T')[0] : '',
          currentPeriodEnd: subscriptionData.currentPeriodEnd ? 
            new Date(subscriptionData.currentPeriodEnd).toISOString().split('T')[0] : ''
        });
      }
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedCompany) return;

    try {
      const { data: result } = await apiClient.put('/admin/update-subscription', {
        userId: selectedCompany.id,
        planName: subscriptionForm.planName,
        status: subscriptionForm.status,
        interval: subscriptionForm.billingCycle === 'QUARTERLY' ? 'quarter' : 'month',
        currentPeriodStart: subscriptionForm.currentPeriodStart,
        currentPeriodEnd: subscriptionForm.currentPeriodEnd
      });
      
      // Ανανεώνουμε τα δεδομένα της συνδρομής
      console.log('=== Updating subscription successful, refreshing data ===');
      await refreshSubscriptionData();
      
      setIsEditingSubscription(false);
      toast.success('Η συνδρομή ενημερώθηκε επιτυχώς!');
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(error.response?.data?.error || 'Σφάλμα κατά την ενημέρωση της συνδρομής');
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
    setIsEditingPoints(false);
    setNewPoints(0);
    setPointsReason('');
    
    // Φέρνουμε τα referral stats του χρήστη
    try {
      const { data: stats } = await apiClient.get(`/referrals/stats?userId=${user.id}`);
      setUserReferralStats(stats);
    } catch (error) {
      console.error('Error fetching user referral stats:', error);
    }
  };

  const handleUpdateUserPoints = async () => {
    if (!selectedUser || !newPoints || !pointsReason) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }

    setIsUpdatingPoints(true);
    try {
      await apiClient.post(`/admin/users/${selectedUser.id}/points`, {
        points: newPoints,
        reason: pointsReason,
      });

      // Ανανεώνουμε τα stats με καθυστέρηση για να βεβαιωθούμε ότι η βάση έχει ενημερωθεί
      setTimeout(async () => {
        try {
          const statsResponse = await fetch(`/api/referrals/stats?userId=${selectedUser.id}`);
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            setUserReferralStats(stats);
          }
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
      }, 500);

      const action = newPoints > 0 ? 'προστέθηκαν' : 'αφαιρέθηκαν';
      const pointsText = Math.abs(newPoints) === 1 ? 'πόντος' : 'πόντους';
      toast.success(`${Math.abs(newPoints)} ${pointsText} ${action} επιτυχώς`);
      setIsEditingPoints(false);
      setNewPoints(0);
      setPointsReason('');
    } catch (error) {
      console.error('Error updating points:', error);
      toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την ενημέρωση των πόντων');
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const handleUpdateTransactionStage = async (stage: string) => {
    if (!selectedTransaction) {
      console.error('No transaction selected');
      toast.error('Παρακαλώ επιλέξτε μια συναλλαγή πρώτα');
      return;
    }
    
    try {
      const transactionId = selectedTransaction.id;
      console.log('=== AdminDashboard: Selected transaction ===', selectedTransaction);
      console.log('=== AdminDashboard: Updating transaction stage ===', { transactionId, stage });
      console.log('=== AdminDashboard: Transaction seller ===', {
        seller: selectedTransaction.seller,
        hasSeller: !!selectedTransaction.seller,
        sellerKeys: selectedTransaction.seller ? Object.keys(selectedTransaction.seller) : []
      });
      console.log('=== AdminDashboard: Transaction property ===', {
        property: selectedTransaction.property,
        hasProperty: !!selectedTransaction.property,
        propertyKeys: selectedTransaction.property ? Object.keys(selectedTransaction.property) : []
      });
      
      // Έλεγχος εγκυρότητας του ID
      if (!transactionId) {
        console.error('Invalid transaction ID:', transactionId);
        toast.error('Μη έγκυρο ID συναλλαγής. Παρακαλώ ανανεώστε τη σελίδα.');
        return;
      }

      await apiClient.put(`/admin/transactions/${transactionId}/stage`, {
        stage
      });

      // Αποστολή ειδοποίησης στον seller
      if (selectedTransaction.seller && selectedTransaction.property) {
        try {
          console.log('=== Sending stage completion notification ===', {
            propertyId: selectedTransaction.property.id,
            propertyIdType: typeof selectedTransaction.property.id,
            propertyObject: selectedTransaction.property,
            stage: stage,
            sellerEmail: selectedTransaction.seller.email,
            sellerEmailType: typeof selectedTransaction.seller.email
          });
          
          await sendStageCompletionNotification(
            selectedTransaction.property.id,
            stage,
            selectedTransaction.seller.email // Χρησιμοποιούμε email για τον seller
          );
          console.log('Stage completion notification sent to seller successfully');
        } catch (notificationError) {
          console.error('Error sending stage completion notification:', notificationError);
          // Δεν σταματάμε την εκτέλεση αν αποτύχει η ειδοποίηση
        }
      } else {
        console.log('=== Cannot send notification - missing seller or property ===', {
          hasSeller: !!selectedTransaction.seller,
          hasProperty: !!selectedTransaction.property,
          seller: selectedTransaction.seller,
          property: selectedTransaction.property
        });
      }

      // Ενημέρωση της λίστας των transactions
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction stage:', error);
      toast.error('Σφάλμα κατά την ενημέρωση του σταδίου');
    }
  };

  const handleSendTransactionNotification = async (recipient: 'buyer' | 'seller' | 'agent', message: string, messageStage: string) => {
    if (!selectedTransaction) return;

    try {
      const response = await fetch(`/api/admin/transactions/${selectedTransaction.id}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient,
          message,
          stage: messageStage,
          category: getCategoryForStage(messageStage)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const updatedTransaction = await response.json();

      // Update the local state with the new notification
      setTransactions(prevTransactions => 
        prevTransactions.map(transaction => 
          transaction.id === selectedTransaction.id 
            ? { 
                ...transaction, 
                progress: { 
                  ...transaction.progress,
                  notifications: [
                    ...transaction.progress.notifications,
                    updatedTransaction.notifications[updatedTransaction.notifications.length - 1]
                  ]
                } 
              }
            : transaction
        )
      );

      // Update the selected transaction state
      setSelectedTransaction(prev => 
        prev ? { 
          ...prev, 
          progress: { 
            ...prev.progress,
            notifications: [
              ...prev.progress.notifications,
              updatedTransaction.notifications[updatedTransaction.notifications.length - 1]
            ]
          } 
        } : null
      );

      toast.success('Η ειδοποίηση στάλθηκε επιτυχώς');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Σφάλμα κατά την αποστολή της ειδοποίησης');
    }
  };

  // Συνάρτηση για φόρτωση δεδομένων βάσει χρήστη και ρόλου
  const loadUserSpecificData = async (userId: string, role: 'buyer' | 'seller' | 'agent') => {
    try {
      const { data } = await apiClient.get(`/support/user-data?userId=${userId}&role=${role}`);
      if (data) {
        setUserSpecificProperties(data.properties || []);
        setUserSpecificTransactions(data.transactions || []);
      } else {
        console.error('Failed to load user-specific data');
        setUserSpecificProperties([]);
        setUserSpecificTransactions([]);
      }
    } catch (error) {
      console.error('Error loading user-specific data:', error);
      setUserSpecificProperties([]);
      setUserSpecificTransactions([]);
    }
  };

  // Συνάρτηση για επαναφορά του admin form
  const resetAdminTicketForm = () => {
    setNewTicketData({
      title: '',
      description: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      propertyId: '',
      transactionId: '',
      selectedRole: ''
    });
    setSelectedUserForTicket(null);
    setSelectedRoleForTicket('');
    setUserSpecificProperties([]);
    setUserSpecificTransactions([]);
  };

  const handleCreateNewMessage = async () => {
    if (!newMessageData.userId || !newMessageData.content) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    setIsCreatingMessage(true);
    try {
      const { data } = await apiClient.post('/admin/send-message', newMessageData);
      
      // Refresh tickets list
      const updatedTickets = await fetchSupportTickets();
      setSupportTickets(updatedTickets);
      
      // Reset form
      setNewMessageData({
        userId: '',
        propertyId: '',
        content: ''
      });
      
      setIsNewMessageModalOpen(false);
      toast.success('Το μήνυμα στάλθηκε επιτυχώς');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Σφάλμα κατά την αποστολή του μηνύματος');
    } finally {
      setIsCreatingMessage(false);
    }
  };

  // Νέα συνάρτηση για δημιουργία ticket από admin
  const handleCreateTicketAsAdmin = async () => {
    if (!selectedUserForTicket || !newTicketData.title.trim() || !newTicketData.description.trim() || !selectedRoleForTicket) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία και επιλέξτε χρήστη και ρόλο');
      return;
    }

    setIsCreatingMessage(true);
    try {
      const ticketData = {
        ...newTicketData,
        userId: selectedUserForTicket.id,
        selectedRole: selectedRoleForTicket.toUpperCase()
      };

      const { data } = await apiClient.post('/support/tickets', ticketData);
      
      if (data) {
        // Refresh tickets list
        const updatedTickets = await fetchSupportTickets();
        setSupportTickets(updatedTickets);
        
        // Reset form
        resetAdminTicketForm();
        setIsNewMessageModalOpen(false);
        toast.success('Το ticket δημιουργήθηκε επιτυχώς');
      } else {
        toast.error('Σφάλμα κατά τη δημιουργία του ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Σφάλμα κατά τη δημιουργία του ticket');
    } finally {
      setIsCreatingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    setIsUpdatingTicketStatus(true);
    try {
      const response = await fetch(`/api/admin/messages/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }

      const data = await response.json();
      
      // Update the selected ticket with the full updated data
      if (data.ticket) {
        setSelectedTicket(data.ticket);
      }
      
      // Refresh tickets list
      const updatedTickets = await fetchSupportTickets();
      setSupportTickets(updatedTickets);
      
      const statusLabels = {
        'OPEN': 'Ανοιχτό',
        'IN_PROGRESS': 'Σε εξέλιξη', 
        'RESOLVED': 'Επιλύθηκε',
        'CLOSED': 'Κλειστό'
      };
      
      toast.success(`✅ Η κατάσταση άλλαξε σε: ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('❌ Σφάλμα κατά την ενημέρωση της κατάστασης');
    } finally {
      setIsUpdatingTicketStatus(false);
    }
  };

  const handleUpdateTicketStatusFromModal = async (ticketId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
    setIsUpdatingStatusFromModal(true);
    try {
      const { data } = await apiClient.patch(`/admin/messages/${ticketId}/status`, { status: newStatus });
      
      // Update the selected ticket with the full updated data
      if (data.ticket) {
        setSelectedTicket(data.ticket);
      }
      
      // Refresh tickets list
      const updatedTickets = await fetchSupportTickets();
      setSupportTickets(updatedTickets);
      
      // Κλείνουμε το modal
      setIsStatusModalOpen(false);
      setSelectedTicketForStatus(null);

      const statusLabels = {
        'OPEN': 'Ανοιχτό',
        'IN_PROGRESS': 'Σε εξέλιξη', 
        'RESOLVED': 'Επιλύθηκε',
        'CLOSED': 'Κλειστό'
      };
      
      toast.success(`✅ Η κατάσταση άλλαξε σε: ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('❌ Σφάλμα κατά την ενημέρωση της κατάστασης');
    } finally {
      setIsUpdatingStatusFromModal(false);
    }
  };

  const handleOpenStatusModal = (ticket: SupportTicket, event: React.MouseEvent) => {
    event.stopPropagation(); // Αποτρέπουμε το click στο button
    setSelectedTicketForStatus(ticket);
    setIsStatusModalOpen(true);
  };

  // Functions για πολλαπλές επιλογές στο chat area
  const handleAddReplyOption = () => {
    setReplyOptions(prev => [...prev, '']);
  };

  const handleRemoveReplyOption = (index: number) => {
    setReplyOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateReplyOption = (index: number, value: string) => {
    setReplyOptions(prev => prev.map((option, i) => i === index ? value : option));
  };

  // Functions για αποθήκευση μηνυμάτων
  const handleSaveMessage = async () => {
    if (!savedMessageTitle.trim()) {
      toast.error('Παρακαλώ συμπληρώστε τον τίτλο του μηνύματος');
      return;
    }

    setIsSavingMessage(true);
    try {
      const savedMessages = getSavedMessages();
      const newMessage = {
        id: Date.now().toString(),
        title: savedMessageTitle,
        content: replyContent,
        isMultipleChoice: isReplyMultipleChoice,
        options: isReplyMultipleChoice ? replyOptions.filter(option => option.trim()) : [],
        createdAt: new Date().toISOString()
      };
      
      savedMessages.push(newMessage);
      localStorage.setItem('adminSavedMessages', JSON.stringify(savedMessages));
      
      setSavedMessageTitle('');
      setIsSaveMessageModalOpen(false);
      toast.success('Το μήνυμα αποθηκεύθηκε επιτυχώς');
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Σφάλμα κατά την αποθήκευση του μηνύματος');
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleLoadSavedMessage = (savedMessage: any) => {
    setReplyContent(savedMessage.content);
    setIsReplyMultipleChoice(savedMessage.isMultipleChoice || false);
    setReplyOptions(savedMessage.options || ['', '']);
    setIsSavedMessagesModalOpen(false);
  };

  const getSavedMessages = () => {
    try {
      const saved = localStorage.getItem('adminSavedMessages');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved messages:', error);
      return [];
    }
  };

  // Helper function to determine notification category based on stage
  const getCategoryForStage = (stage: string): string => {
    switch (stage.toUpperCase()) {
      case 'PENDING':
      case 'MEETING_SCHEDULED':
        return 'APPOINTMENT';
      case 'DEPOSIT_PAID':
        return 'PAYMENT';
      case 'FINAL_SIGNING':
        return 'CONTRACT';
      case 'COMPLETED':
        return 'COMPLETION';
      case 'CANCELLED':
        return 'GENERAL';
      default:
        return 'GENERAL';
    }
  };

  // Συνάρτηση deduplication
  function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
    const seen = new Set();
    const unique: Transaction[] = [];
    for (const t of transactions) {
      const key = `${t.property.id}_${t.buyer.email}_${t.agent?.email || ''}`;
      if (!seen.has(key)) {
        unique.push(t);
        seen.add(key);
      }
    }
    return unique;
  }

  const filteredListings = listings.filter(listing => 
    statusFilter === 'all' ? true : listing.status === statusFilter
  );

  // Helper function για να ελέγχει αν ο χρήστης έχει referral ως referred ή referrer
  const hasAnyReferral = (user: User, userReferralStats: any) => {
    // Έχει referral ως referred
    if (user.referralInfo?.hasReferral) return true;
    // Έχει referral ως referrer (δηλαδή έχει φέρει άλλους)
    if (userReferralStats?.referrals && userReferralStats.referrals.some((r: any) => r.type === 'referrer')) return true;
    return false;
  };

  // Χρησιμοποιούμε τα supportTickets απευθείας αφού το φιλτράρισμα γίνεται server-side
  const filteredSupportTickets = supportTickets;

  // Συνάρτηση για την ανάκτηση των ρυθμίσεων των ραντεβού
  const fetchAppointmentSettings = async (propertyId: string) => {
    setAppointmentSettingsLoading(true);
    try {
      const response = await fetch(`/api/seller/properties/${propertyId}/visit-settings`);
      if (response.ok) {
        const data = await response.json();
        setAppointmentSettings(data);
      } else {
        setAppointmentSettings(null);
      }
    } catch (error) {
      console.error('Error fetching appointment settings:', error);
      setAppointmentSettings(null);
    } finally {
      setAppointmentSettingsLoading(false);
    }
  };

  // Συνάρτηση για το άνοιγμα του modal των ρυθμίσεων
  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointmentForSettings(appointment);
    setIsAppointmentSettingsModalOpen(true);
    fetchAppointmentSettings(appointment.property.id);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'sellers':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Διαχείριση Πωλητών</h2>
            {sellers.length === 0 ? (
              <p className="text-gray-600">Δεν υπάρχουν εγγεγραμμένοι πωλητές.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Όνομα</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Αριθμός Ακινήτων</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τελευταία Καταχώρηση</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sellers.map((seller) => (
                      <tr 
                        key={seller.id}
                        onClick={() => handleSellerClick(seller)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">{seller.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{seller.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{seller.propertyCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(seller.lastPropertyDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            seller.lastPropertyStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            seller.lastPropertyStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {seller.lastPropertyStatus === 'pending' ? 'Εκκρεμεί' :
                             seller.lastPropertyStatus === 'approved' ? 'Εγκρίθηκε' : 'Απορρίφθηκε'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setActiveTab('listings')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Προβολή Ακινήτων
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'listings':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Διαχείριση Ακινήτων</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-md ${
                    statusFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Όλα
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 rounded-md ${
                    statusFilter === 'pending' 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Εκκρεμεί
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`px-3 py-1 rounded-md ${
                    statusFilter === 'approved' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Εγκεκριμένα
                </button>
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1 rounded-md ${
                    statusFilter === 'rejected' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Απορριφθέντα
                </button>
                <button
                  onClick={() => setStatusFilter('unavailable')}
                  className={`px-3 py-1 rounded-md ${
                    statusFilter === 'unavailable' 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Μη διαθέσιμα
                </button>
              </div>
            </div>
            {filteredListings.length === 0 ? (
              <p className="text-gray-600">Δεν υπάρχουν ακίνητα προς έγκριση αυτή τη στιγμή.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τίτλος</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τιμή</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ιδιοκτήτης</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Ιδιοκτήτη</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredListings.map((listing) => (
                      <tr 
                        key={listing.id}
                        onClick={() => handlePropertyClick(listing)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">{listing.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{listing.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{listing.price.toLocaleString('el-GR')} €</td>
                        <td className="px-6 py-4 whitespace-nowrap">{listing.user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{listing.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                            listing.status === 'info_requested' ? 'bg-blue-100 text-blue-800' :
                            listing.status === 'unavailable' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {listing.status === 'pending' ? 'Εκκρεμεί' :
                             listing.status === 'approved' ? 'Εγκρίθηκε' :
                             listing.status === 'info_requested' ? 'Ζητήθηκαν πληροφορίες' :
                             listing.status === 'unavailable' ? 'Μη διαθέσιμο' :
                             'Απορρίφθηκε'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            listing.isVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {listing.isVerified ? '✓ Επιβεβαιωμένο' : '✗ Μη Επιβεβαιωμένο'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(listing.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!listing.isVerified && listing.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveProperty(listing.id);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Έγκριση ακινήτου"
                              >
                                <FiCheck className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectProperty(listing.id);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Απόρριψη ακινήτου"
                              >
                                <FiX className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                          {listing.isVerified && (
                            <span className="text-green-600 font-medium">Επιβεβαιωμένο</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'companies':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Διαχείριση Εταιρειών</h2>
            {companies.length === 0 ? (
              <p className="text-gray-600">Δεν υπάρχουν εγγεγραμμένες εταιρείες.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Όνομα Εταιρείας</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τύπος</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία Εγγραφής</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((company) => (
                      <tr 
                        key={company.id}
                        onClick={() => handleCompanyClick(company)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Μεσιτική Εταιρεία
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(company.createdAt).toLocaleDateString('el-GR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {company.referralInfo?.hasReferral ? (
                            <div className="flex flex-col">
                              <span className="text-green-600 font-medium">✓ Έχει Referral</span>
                              {company.referralInfo.referrerName && (
                                <span className="text-xs text-gray-500">Από: {company.referralInfo.referrerName}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {company.isReferrer && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Referrer
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'users':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Διαχείριση Χρηστών</h2>
            {users.length === 0 ? (
              <p className="text-gray-600">Δεν υπάρχουν εγγεγραμμένοι χρήστες.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Όνομα</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ρόλος</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Εγγραφή</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr 
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Διαχειριστής' :
                             user.role === 'agent' ? 'Μεσίτης' : 'Χρήστης'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.referralInfo?.hasReferral ? (
                            <div className="text-sm">
                              <span className="text-green-600 font-medium">Έχει Referral</span>
                              {user.referralInfo.referrerName && (
                                <div className="text-gray-500 text-xs">
                                  Από: {user.referralInfo.referrerName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-medium">Δεν έχει Referral</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isReferrer ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ Είναι Referrer
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Δεν είναι Referrer
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'messages':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[800px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <FaHeadset className="text-2xl" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Admin Support Center</h2>
                    <p className="text-blue-100 text-sm">Διαχείριση αιτημάτων υποστήριξης</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsNewMessageModalOpen(true)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <FaPaperPlane className="text-sm" />
                    <span>Στείλε Μήνυμα</span>
                  </button>
                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {filteredSupportTickets.length} / {supportTickets.length} αιτήματα
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Conversations List */}
              <div className="w-1/2 border-r bg-gray-50">
                <div className="p-3 border-b bg-white space-y-3">
                  {/* Αναζήτηση */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Αναζήτηση αιτημάτων..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  </div>

                  {/* Φίλτρα */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Φιλτράρισμα κατάστασης */}
                    <select
                      value={messageStatusFilter}
                      onChange={(e) => setMessageStatusFilter(e.target.value as any)}
                      className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Όλες οι καταστάσεις</option>
                      <option value="OPEN">Ανοιχτά</option>
                      <option value="IN_PROGRESS">Σε εξέλιξη</option>
                      <option value="RESOLVED">Επιλυμένα</option>
                      <option value="CLOSED">Κλειστά</option>
                    </select>

                    {/* Φιλτράρισμα προτεραιότητας */}
                    <select
                      value={messagePriorityFilter}
                      onChange={(e) => setMessagePriorityFilter(e.target.value as any)}
                      className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Όλες οι προτεραιότητες</option>
                      <option value="LOW">Χαμηλή</option>
                      <option value="MEDIUM">Μεσαία</option>
                      <option value="HIGH">Υψηλή</option>
                      <option value="URGENT">Επείγουσα</option>
                    </select>

                    {/* Φιλτράρισμα κατηγορίας */}
                    <select
                      value={messageCategoryFilter}
                      onChange={(e) => setMessageCategoryFilter(e.target.value as any)}
                      className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Όλες οι κατηγορίες</option>
                      <option value="PROPERTY_INQUIRY">Ερωτήσεις ακινήτων</option>
                      <option value="TRANSACTION_ISSUE">Προβλήματα συναλλαγών</option>
                      <option value="TECHNICAL_SUPPORT">Τεχνική υποστήριξη</option>
                      <option value="ACCOUNT_ISSUE">Προβλήματα λογαριασμού</option>
                      <option value="PAYMENT_ISSUE">Προβλήματα πληρωμών</option>
                      <option value="GENERAL">Γενικά</option>
                    </select>

                    {/* Φιλτράρισμα στάδιου συναλλαγής */}
                    <select
                      value={messageTransactionStageFilter}
                      onChange={(e) => setMessageTransactionStageFilter(e.target.value)}
                      className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      {transactionStageFilterOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="overflow-y-auto h-full max-h-[calc(800px-120px)]">
                  {filteredSupportTickets.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FaEnvelope className="mx-auto text-4xl text-gray-300 mb-4" />
                      <p className="text-sm">Δεν βρέθηκαν αιτήματα</p>
                      <p className="text-xs text-gray-400 mt-1">Δοκιμάστε να αλλάξετε τα φίλτρα</p>
                    </div>
                  ) : (
                    filteredSupportTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`w-full p-4 text-left hover:bg-white transition-colors border-b border-gray-100 ${
                          selectedTicket?.id === ticket.id ? 'bg-white shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            ticket.status === 'OPEN' ? 'bg-red-500' :
                            ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                            ticket.status === 'RESOLVED' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}>
                            {ticket.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {ticket.property?.title || ticket.title || 'Γενικό Ερώτημα'}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {formatDate(ticket.createdAt)}
                                </span>
                                <button
                                  onClick={(e) => handleOpenStatusModal(ticket, e)}
                                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                  title="Αλλαγή κατάστασης"
                                >
                                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsTicketModalOpen(true);
                              }}
                              className="w-full text-left"
                            >
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {ticket.user?.name || 'Unknown User'} • {ticket.title}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'BUYER' 
                                    ? 'text-blue-700 bg-blue-100' 
                                    : (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'SELLER'
                                    ? 'text-green-700 bg-green-100'
                                    : (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'AGENT'
                                    ? 'text-purple-700 bg-purple-100'
                                    : 'text-gray-500 bg-gray-100'
                                }`}>
                                  {(ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'BUYER' 
                                    ? 'Αγοραστής' 
                                    : (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'SELLER'
                                    ? 'Πωλητής'
                                    : (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) === 'AGENT'
                                    ? 'Μεσίτης'
                                    : (ticket.selectedRole || ticket.user?.role || ticket.createdByUser?.role) || 'Άγνωστος Ρόλος'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  ticket.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                                  ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                  ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {ticket.status === 'OPEN' ? 'Ανοιχτό' :
                                   ticket.status === 'IN_PROGRESS' ? 'Σε εξέλιξη' :
                                   ticket.status === 'RESOLVED' ? 'Επιλύθηκε' :
                                   'Κλειστό'}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                  ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {ticket.priority === 'URGENT' ? 'Επείγον' :
                                   ticket.priority === 'HIGH' ? 'Υψηλό' :
                                   ticket.priority === 'MEDIUM' ? 'Μεσαίο' :
                                   'Χαμηλό'}
                                </span>
                                {ticket.transaction?.stage && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    transactionStageLabels[ticket.transaction.stage.toUpperCase()]?.color || 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transactionStageLabels[ticket.transaction.stage.toUpperCase()]?.label || ticket.transaction.stage}
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Preview Area */}
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FaComments className="mx-auto text-6xl text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Επιλέξτε ένα αίτημα</h3>
                  <p className="text-sm text-gray-500">Επιλέξτε ένα αίτημα από τη λίστα για να δείτε τα μηνύματα</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Διαχείριση Συναλλαγών</h2>
            {transactions.length === 0 && cancelledTransactions.length === 0 ? (
              <p className="text-gray-600">Δεν υπάρχουν συναλλαγές.</p>
            ) : (
              <div className="space-y-8">
                {/* Active Transactions */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Ενεργές Συναλλαγές</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Αγοραστής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πωλητής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Μεσίτης</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τίτλος Ακινήτου</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση Ακινήτου</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Στάδιο Συναλλαγής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => (
                          <tr 
                            key={transaction.id}
                            onClick={() => handleTransactionClick(transaction)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.buyer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.seller.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {transaction.agent ? transaction.agent.name : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.property.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                transaction.property.status === 'approved' ? 'bg-green-100 text-green-800' :
                                transaction.property.status === 'unavailable' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.property.status === 'pending' ? 'Εκκρεμεί' :
                                 transaction.property.status === 'approved' ? 'Διαθέσιμο' :
                                 transaction.property.status === 'unavailable' ? 'Μη διαθέσιμο' :
                                 'Απορρίφθηκε'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transactionStageLabels[transaction.progress.stage?.toUpperCase()]?.color || 'bg-gray-100 text-gray-800'
                              }`}>
                                {transactionStageLabels[transaction.progress.stage?.toUpperCase()]?.label || 'Άγνωστο'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{formatDate(transaction.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cancelled Transactions */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Ακυρωμένες Συναλλαγές</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Αγοραστής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πωλητής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Μεσίτης</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Τίτλος Ακινήτου</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση Ακινήτου</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Στάδιο Συναλλαγής</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cancelledTransactions.map((transaction) => (
                          <tr 
                            key={transaction.id}
                            onClick={() => handleTransactionClick(transaction)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.buyer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.seller.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {transaction.agent ? transaction.agent.name : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{transaction.property.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                transaction.property.status === 'approved' ? 'bg-green-100 text-green-800' :
                                transaction.property.status === 'unavailable' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.property.status === 'pending' ? 'Εκκρεμεί' :
                                 transaction.property.status === 'approved' ? 'Διαθέσιμο' :
                                 transaction.property.status === 'unavailable' ? 'Μη διαθέσιμο' :
                                 'Απορρίφθηκε'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transactionStageLabels[transaction.progress.stage?.toUpperCase()]?.color || 'bg-gray-100 text-gray-800'
                              }`}>
                                {transactionStageLabels[transaction.progress.stage?.toUpperCase()]?.label || 'Άγνωστο'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{formatDate(transaction.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'appointments':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Διαχείριση Ραντεβού</h2>
              <button
                onClick={() => fetchAppointments()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Ανανέωση
              </button>
            </div>
            
            {/* Στατιστικά */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                <div className="text-sm text-blue-600">Σύνολο Ραντεβού</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {appointments.filter(a => a.status === 'PENDING').length}
                </div>
                <div className="text-sm text-yellow-600">Εκκρεμεί</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {appointments.filter(a => a.status === 'ACCEPTED').length}
                </div>
                <div className="text-sm text-green-600">Εγκεκριμένα</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {appointments.filter(a => a.status === 'REJECTED').length}
                </div>
                <div className="text-sm text-red-600">Απορριφθέντα</div>
              </div>
            </div>

            {/* Φίλτρα */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Αναζήτηση */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Αναζήτηση</label>
                  <input
                    type="text"
                    placeholder="Ακίνητο, αγοραστής, πωλητής..."
                    value={appointmentFilters.search}
                    onChange={(e) => setAppointmentFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Κατάσταση */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Κατάσταση</label>
                  <select
                    value={appointmentFilters.status}
                    onChange={(e) => setAppointmentFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Όλες</option>
                    <option value="PENDING">Εκκρεμεί</option>
                    <option value="ACCEPTED">Εγκεκριμένο</option>
                    <option value="REJECTED">Απορριφθέν</option>
                    <option value="CANCELLED">Ακυρωμένο</option>
                    <option value="COMPLETED">Ολοκληρωμένο</option>
                  </select>
                </div>

                {/* Ακίνητο */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ακίνητο</label>
                  <select
                    value={appointmentFilters.propertyId}
                    onChange={(e) => setAppointmentFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Όλα</option>
                    {appointmentFilterOptions.properties.map((property: any) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Αγοραστής */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Αγοραστής</label>
                  <select
                    value={appointmentFilters.buyerId}
                    onChange={(e) => setAppointmentFilters(prev => ({ ...prev, buyerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Όλοι</option>
                    {appointmentFilterOptions.buyers.map((buyer: any) => (
                      <option key={buyer.id} value={buyer.id}>
                        {buyer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Πωλητής */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Πωλητής</label>
                  <select
                    value={appointmentFilters.sellerId}
                    onChange={(e) => setAppointmentFilters(prev => ({ ...prev, sellerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Όλοι</option>
                    {appointmentFilterOptions.sellers.map((seller: any) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Λίστα ραντεβού */}
            {appointmentsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-gray-600">Δεν βρέθηκαν ραντεβού.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ακίνητο</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Αγοραστής</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Πωλητής</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημερομηνία</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ώρα</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ημ/νία Δημιουργίας</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleAppointmentClick(appointment)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{appointment.property.title}</div>
                            <div className="text-sm text-gray-500">{appointment.property.city}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{appointment.buyer.name}</div>
                            <div className="text-sm text-gray-500">{appointment.buyer.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{appointment.property.user.name}</div>
                            <div className="text-sm text-gray-500">{appointment.property.user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(appointment.date).toLocaleDateString('el-GR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              appointment.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              appointment.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                              appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status === 'PENDING' ? 'Εκκρεμεί' :
                               appointment.status === 'ACCEPTED' ? 'Εγκεκριμένο' :
                               appointment.status === 'REJECTED' ? 'Απορριφθέν' :
                               appointment.status === 'CANCELLED' ? 'Ακυρωμένο' :
                               appointment.status === 'COMPLETED' ? 'Ολοκληρωμένο' :
                               'Άγνωστο'}
                            </span>
                            
                            {/* Κουμπιά Έγκρισης/Απόρριψης για Εκκρεμή Ραντεβού */}
                            {appointment.status === 'PENDING' && (
                              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleAppointmentStatusChange(appointment.id, 'ACCEPTED')}
                                  className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded transition-colors duration-200"
                                >
                                  Έγκριση
                                </button>
                                <button
                                  onClick={() => handleAppointmentStatusChange(appointment.id, 'REJECTED')}
                                  className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors duration-200"
                                >
                                  Απόρριψη
                                </button>
                              </div>
                            )}
                            
                            {/* Κουμπί Ακύρωσης για Εγκεκριμένα Ραντεβού */}
                            {appointment.status === 'ACCEPTED' && (
                              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleAppointmentStatusChange(appointment.id, 'CANCELLED')}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded transition-colors duration-200"
                                >
                                  Ακύρωση
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(appointment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg h-screen fixed">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          </div>
          <nav className="mt-4">
            <button
              onClick={() => setActiveTab('listings')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'listings' ? 'bg-gray-100' : ''
              }`}
            >
              <FiHome className="mr-2" />
              Ακίνητα
            </button>
            <button
              onClick={() => setActiveTab('sellers')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'sellers' ? 'bg-gray-100' : ''
              }`}
            >
              <FiUser className="mr-2" />
              Πωλητές
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'users' ? 'bg-gray-100' : ''
              }`}
            >
              <FiUsers className="mr-2" />
              Χρήστες
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'companies' ? 'bg-gray-100' : ''
              }`}
            >
              <FaBuilding className="mr-2" />
              Εταιρείες
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'messages' ? 'bg-gray-100' : ''
              }`}
            >
              <FiMessageSquare className="mr-2" />
              Μηνύματα
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'transactions' ? 'bg-gray-100' : ''
              }`}
            >
              <FiDollarSign className="mr-2" />
              Συναλλαγές
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                activeTab === 'appointments' ? 'bg-gray-100' : ''
              }`}
            >
              <FiCalendar className="mr-2" />
              Ραντεβού
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 mt-auto"
            >
              <FiLogOut className="mr-2" />
              Αποσύνδεση
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="ml-64 flex-1 p-8">
          {renderContent()}
        </div>
      </div>

      {/* Property Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
          onStatusChange={handleStatusChange}
          onSave={handlePropertyEdit}
          onUploadImages={handleImageUpload}
          onMarkUnavailable={handleMarkUnavailable}
          onCompleteChanges={(data) => handleCompleteChanges(selectedProperty.id, data)}
          onToggleOwnership={handleToggleOwnership}
          onToggleRemovalRequest={handleToggleRemovalRequest}
        />
      )}

      {/* Transaction Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setSelectedTransaction(null);
          }}
          onUpdateStage={handleUpdateTransactionStage}
          onSendNotification={handleSendTransactionNotification}
        />
      )}

      {/* Appointment Settings Modal */}
      {isAppointmentSettingsModalOpen && selectedAppointmentForSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Ρυθμίσεις Ραντεβού - {selectedAppointmentForSettings.property.title}
                </h2>
                <button
                  onClick={() => {
                    setIsAppointmentSettingsModalOpen(false);
                    setSelectedAppointmentForSettings(null);
                    setAppointmentSettings(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              {appointmentSettingsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : appointmentSettings ? (
                <div className="space-y-6">
                  {/* Πληροφορίες Ακινήτου */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Πληροφορίες Ακινήτου</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Τίτλος:</span>
                        <p className="text-gray-900">{selectedAppointmentForSettings.property.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Πόλη:</span>
                        <p className="text-gray-900">{selectedAppointmentForSettings.property.city}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Πωλητής:</span>
                        <p className="text-gray-900">{selectedAppointmentForSettings.property.user.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Email Πωλητή:</span>
                        <p className="text-gray-900">{selectedAppointmentForSettings.property.user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ρυθμίσεις Ραντεβού */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-3">Ρυθμίσεις Ραντεβού</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-blue-700">Τύπος Προσέλευσης:</span>
                        <p className="text-blue-900">
                          {appointmentSettings.presenceType === 'platform_only' ? 'Μόνο Πλατφόρμα' :
                           appointmentSettings.presenceType === 'seller_and_platform' ? 'Πωλητής και Πλατφόρμα' :
                           'Δεν έχει οριστεί'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-700">Τύπος Προγραμματισμού:</span>
                        <p className="text-blue-900">
                          {appointmentSettings.schedulingType === 'seller_availability' ? 'Διαθεσιμότητα Πωλητή' :
                           appointmentSettings.schedulingType === 'buyer_proposal' ? 'Πρόταση Αγοραστή' :
                           'Δεν έχει οριστεί'}
                        </p>
                      </div>
                    </div>

                    {/* Διαθεσιμότητα */}
                    {appointmentSettings.availability && appointmentSettings.availability.days && appointmentSettings.availability.days.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-blue-700">Διαθεσιμές Ημέρες:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {appointmentSettings.availability.days.map((day, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {appointmentSettings.availability && appointmentSettings.availability.timeSlots && appointmentSettings.availability.timeSlots.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-blue-700">Διαθεσιμές Ώρες:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {appointmentSettings.availability.timeSlots.map((time, index) => (
                            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Πληροφορίες Ραντεβού */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-3">Πληροφορίες Ραντεβού</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-green-700">Ημερομηνία:</span>
                        <p className="text-green-900">
                          {new Date(selectedAppointmentForSettings.date).toLocaleDateString('el-GR')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Ώρα:</span>
                        <p className="text-green-900">{selectedAppointmentForSettings.time}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Αγοραστής:</span>
                        <p className="text-green-900">{selectedAppointmentForSettings.buyer.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Email Αγοραστή:</span>
                        <p className="text-green-900">{selectedAppointmentForSettings.buyer.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Δεν βρέθηκαν ρυθμίσεις ραντεβού για αυτό το ακίνητο.</p>
                  <p className="text-sm text-gray-400 mt-2">Ο πωλητής δεν έχει ορίσει ειδικές ρυθμίσεις.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {selectedTicket && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isTicketModalOpen ? '' : 'hidden'}`}>
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[90vh] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    selectedTicket.status === 'OPEN' ? 'bg-red-500' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                    selectedTicket.status === 'RESOLVED' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`}>
                    {selectedTicket.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedTicket.user?.name || 'Unknown User'}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-blue-100">
                      {(selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'BUYER' 
                            ? 'text-blue-700 bg-blue-100' 
                            : (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'SELLER'
                            ? 'text-green-700 bg-green-100'
                            : (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'AGENT'
                            ? 'text-purple-700 bg-purple-100'
                            : 'text-gray-500 bg-gray-100'
                        }`}>
                          {(selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'BUYER' 
                            ? 'Αγοραστής' 
                            : (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'SELLER'
                            ? 'Πωλητής'
                            : (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) === 'AGENT'
                            ? 'Μεσίτης'
                            : (selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role)}
                        </span>
                      )}
                      <span>•</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedTicket.status === 'OPEN' ? 'bg-red-500 text-white' :
                        selectedTicket.status === 'IN_PROGRESS' ? 'bg-yellow-500 text-white' :
                        selectedTicket.status === 'RESOLVED' ? 'bg-green-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {selectedTicket.status === 'OPEN' ? 'Ανοιχτό' :
                         selectedTicket.status === 'IN_PROGRESS' ? 'Σε εξέλιξη' :
                         selectedTicket.status === 'RESOLVED' ? 'Επιλύθηκε' :
                         'Κλειστό'}
                      </span>
                      <span>•</span>
                      <span>{selectedTicket.category === 'GENERAL' ? 'Γενικό' :
                              selectedTicket.category === 'PROPERTY_INQUIRY' ? 'Ερώτημα ακινήτου' :
                              selectedTicket.category === 'TRANSACTION_ISSUE' ? 'Πρόβλημα συναλλαγής' :
                              selectedTicket.category === 'TECHNICAL_SUPPORT' ? 'Τεχνική υποστήριξη' :
                              selectedTicket.category === 'ACCOUNT_ISSUE' ? 'Πρόβλημα λογαριασμού' :
                              selectedTicket.category === 'PAYMENT_ISSUE' ? 'Πρόβλημα πληρωμής' :
                              'Άλλο'}</span>
                      <span>•</span>
                      <span>{formatDate(selectedTicket.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Status Change Dropdown */}
                  <div className="relative">
                    <div className="text-xs text-blue-100 mb-1">Κατάσταση:</div>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                      disabled={isUpdatingTicketStatus}
                      className="px-3 py-1 bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-lg text-sm focus:ring-2 focus:ring-white focus:border-transparent disabled:opacity-50 min-w-[120px]"
                      title="Αλλαγή κατάστασης αιτήματος"
                    >
                      <option value="OPEN">🔴 Ανοιχτό</option>
                      <option value="IN_PROGRESS">🟡 Σε εξέλιξη</option>
                      <option value="RESOLVED">🟢 Επιλύθηκε</option>
                      <option value="CLOSED">⚫ Κλειστό</option>
                    </select>
                    {isUpdatingTicketStatus && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-600 bg-opacity-50 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsTicketModalOpen(false);
                      setSelectedTicket(null);
                      setReplyContent('');
                    }}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* Initial Message - Show only if user started the conversation */}
              {(() => {
                const creatorRole = selectedTicket.createdByUser?.role || selectedTicket.user?.role;
                return creatorRole !== 'admin' && creatorRole !== 'ADMIN';
              })() ? (
                <div className="flex justify-end mb-4">
                  <div className="flex items-start space-x-3 max-w-2xl flex-row-reverse space-x-reverse">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium bg-blue-600">
                      {(selectedTicket.createdByUser?.name || selectedTicket.user?.name)?.charAt(0) || 'U'}
                    </div>
                    <div className="bg-blue-600 text-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-white">
                          {selectedTicket.createdByUser?.name || selectedTicket.user?.name || 'Unknown User'}
                        </span>
                        {(selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'BUYER' 
                              ? 'text-blue-700 bg-blue-100' 
                              : (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'SELLER'
                              ? 'text-green-700 bg-green-100'
                              : (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'AGENT'
                              ? 'text-purple-700 bg-purple-100'
                              : 'text-gray-500 bg-gray-100'
                          }`}>
                            {(selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'BUYER' 
                              ? 'Αγοραστής' 
                              : (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'SELLER'
                              ? 'Πωλητής'
                              : (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role) === 'AGENT'
                              ? 'Μεσίτης'
                              : (selectedTicket.selectedRole || selectedTicket.createdByUser?.role || selectedTicket.user?.role)}
                          </span>
                        )}
                        <span className="text-xs text-blue-100">
                          {formatDate(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white mb-2 font-medium">{selectedTicket.title}</p>
                      <p className="text-sm text-blue-100 whitespace-pre-wrap">{selectedTicket.description}</p>
                      {(selectedTicket.property || selectedTicket.transaction) && (
                        <div className="mt-3 pt-3 border-t border-blue-500">
                          {selectedTicket.property && (
                            <div className="flex items-center text-xs text-blue-200 mb-1">
                              <FaBuilding className="mr-2" />
                              <span>Ακίνητο: {selectedTicket.property.title}</span>
                            </div>
                          )}
                          {selectedTicket.transaction && (
                            <div className="flex items-center text-xs text-blue-200">
                              <FaExchangeAlt className="mr-2" />
                              <span>Συναλλαγή: {selectedTicket.transaction.property.title}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Conversation Messages */}
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'} mb-4`}
                  >
                    <div className={`flex items-start space-x-3 max-w-2xl ${message.isFromAdmin ? '' : 'flex-row-reverse space-x-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                        message.isFromAdmin ? 'bg-gray-500' : 'bg-blue-600'
                      }`}>
                        {message.isFromAdmin ? 'A' : (message.user?.name?.charAt(0) || 'U')}
                      </div>
                      <div className={`rounded-lg p-3 shadow-sm ${
                        message.isFromAdmin
                          ? 'bg-gray-200 text-gray-900 border'
                          : 'bg-blue-600 text-white'
                      }`}>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.isFromAdmin ? 'Admin' : message.user?.name || 'Unknown User'}
                          </span>
                                                      {!message.isFromAdmin && (selectedTicket.selectedRole || message.user?.role) && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                (selectedTicket.selectedRole || message.user?.role) === 'BUYER' 
                                  ? 'text-blue-700 bg-blue-100' 
                                  : (selectedTicket.selectedRole || message.user?.role) === 'SELLER'
                                  ? 'text-green-700 bg-green-100'
                                  : (selectedTicket.selectedRole || message.user?.role) === 'AGENT'
                                  ? 'text-purple-700 bg-purple-100'
                                  : 'text-gray-500 bg-gray-100'
                              }`}>
                                {(selectedTicket.selectedRole || message.user?.role) === 'BUYER' 
                                  ? 'Αγοραστής' 
                                  : (selectedTicket.selectedRole || message.user?.role) === 'SELLER'
                                  ? 'Πωλητής'
                                  : (selectedTicket.selectedRole || message.user?.role) === 'AGENT'
                                  ? 'Μεσίτης'
                                  : (selectedTicket.selectedRole || message.user?.role)}
                              </span>
                            )}
                          <span className={`text-xs ${message.isFromAdmin ? 'text-gray-500' : 'text-blue-100'}`}>
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${message.isFromAdmin ? 'text-gray-700' : 'text-white'}`}>
                          {message.content}
                        </p>
                        
                        {/* Εμφάνιση επιλογών πολλαπλής επιλογής */}
                        {message.metadata?.isMultipleChoice && message.metadata?.options && (
                          <div className="mt-3 space-y-2">
                            <p className={`text-xs font-medium ${message.isFromAdmin ? 'text-gray-600' : 'text-blue-100'}`}>
                              Επιλογές απάντησης:
                            </p>
                            <div className="space-y-1">
                              {message.metadata.options.map((option, index) => (
                                <div
                                  key={index}
                                  className={`px-3 py-2 rounded-lg border text-sm ${
                                    message.isFromAdmin 
                                      ? 'bg-gray-100 text-gray-700 border-gray-200' 
                                      : 'bg-blue-500 text-white border-blue-400'
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FaComments className="mx-auto text-4xl text-gray-300 mb-4" />
                  <p>Δεν υπάρχουν μηνύματα ακόμα.</p>
                  <p className="text-sm">Ξεκινήστε τη συνομιλία στέλνοντας μια απάντηση.</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="space-y-4">
                {/* Multiple Choice Checkbox */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="replyMultipleChoice"
                    checked={isReplyMultipleChoice}
                    onChange={(e) => setIsReplyMultipleChoice(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="replyMultipleChoice" className="text-sm font-medium text-gray-700">
                    Μήνυμα με προκαθορισμένες απαντήσεις (πολλαπλή επιλογή)
                  </label>
                </div>

                {/* Multiple Choice Options */}
                {isReplyMultipleChoice && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-gray-700">
                      Επιλογές Απαντήσεων *
                    </label>
                    {replyOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleUpdateReplyOption(index, e.target.value)}
                          placeholder={`Επιλογή ${index + 1}`}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {replyOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReplyOption(index)}
                            className="px-2 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Διαγραφή επιλογής"
                          >
                            <FaTimes className="text-sm" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddReplyOption}
                      className="w-full px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>+</span>
                      <span>Προσθήκη Επιλογής</span>
                    </button>
                    <p className="text-xs text-gray-500">
                      * Τουλάχιστον 2 επιλογές απαιτούνται. Οι χρήστες θα μπορούν μόνο να επιλέξουν από αυτές τις απαντήσεις.
                    </p>
                  </div>
                )}

                {/* Message Input Area */}
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Γράψτε την απάντησή σας..."
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => setIsSaveMessageModalOpen(true)}
                      disabled={!replyContent.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      title="Αποθήκευση μηνύματος"
                    >
                      <FaSave className="text-sm" />
                      <span className="text-xs">Αποθήκευση</span>
                    </button>
                    <button
                      onClick={() => setIsSavedMessagesModalOpen(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                      title="Προβολή αποθηκευμένων μηνυμάτων"
                    >
                      <FaComments className="text-sm" />
                      <span className="text-xs">Αποθηκευμένα</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!replyContent.trim()) return;
                        
                        // Validate multiple choice options if enabled
                        if (isReplyMultipleChoice) {
                          const validOptions = replyOptions.filter(option => option.trim());
                          if (validOptions.length < 2) {
                            toast.error('Πρέπει να προσθέσετε τουλάχιστον 2 επιλογές για μήνυμα πολλαπλής επιλογής');
                            return;
                          }
                        }
                        
                        setIsSendingReply(true);
                        try {
                          const { data } = await apiClient.post('/support/messages', {
                            ticketId: selectedTicket.id,
                            content: replyContent,
                            isMultipleChoice: isReplyMultipleChoice,
                            options: isReplyMultipleChoice ? replyOptions.filter(option => option.trim()) : []
                          });
                          
                          // Update the ticket with the new message
                          setSelectedTicket(prev => prev ? {
                            ...prev,
                            messages: [...prev.messages, data.message]
                          } : null);
                          
                          // Refresh the tickets list to get updated data
                          const updatedTickets = await fetchSupportTickets();
                          setSupportTickets(updatedTickets);
                          
                          setReplyContent('');
                          setIsReplyMultipleChoice(false);
                          setReplyOptions(['', '']);
                          toast.success('Η απάντηση στάλθηκε επιτυχώς');
                        } catch (error) {
                          console.error('Error sending reply:', error);
                          toast.error('Σφάλμα κατά την αποστολή της απάντησης');
                        } finally {
                          setIsSendingReply(false);
                        }
                      }}
                      disabled={!replyContent.trim() || isSendingReply}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {isSendingReply ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FaPaperPlane className="text-sm" />
                          <span className="text-sm">Αποστολή</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced New Ticket Modal for Admin */}
      {isNewMessageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FaRocket className="text-white text-lg" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Νέο Ερώτημα ως Admin</h3>
              </div>
              <button
                onClick={() => {
                  setIsNewMessageModalOpen(false);
                  resetAdminTicketForm();
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Επιλογή Χρήστη */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Επιλέξτε Χρήστη *
                </label>
                <select
                  value={selectedUserForTicket?.id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    setSelectedUserForTicket(user || null);
                    setSelectedRoleForTicket('');
                    setUserSpecificProperties([]);
                    setUserSpecificTransactions([]);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                >
                  <option value="">Επιλέξτε χρήστη...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Επιλογή Ρόλου */}
              {selectedUserForTicket && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Επιλέξτε Ρόλο για το Χρήστη *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'buyer', label: 'Αγοραστής', icon: '🏠', color: 'from-blue-500 to-blue-600' },
                      { id: 'seller', label: 'Πωλητής', icon: '💰', color: 'from-green-500 to-green-600' },
                      { id: 'agent', label: 'Μεσιτευόμενος', icon: '🤝', color: 'from-purple-500 to-purple-600' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={async () => {
                          const selectedRoleValue = role.id as 'buyer' | 'seller' | 'agent';
                          setSelectedRoleForTicket(selectedRoleValue);
                          setNewTicketData(prev => ({ ...prev, selectedRole: selectedRoleValue.toUpperCase() }));
                          if (selectedUserForTicket) {
                            await loadUserSpecificData(selectedUserForTicket.id, selectedRoleValue);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          selectedRoleForTicket === role.id
                            ? `border-transparent bg-gradient-to-r ${role.color} text-white shadow-lg`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{role.icon}</div>
                          <div className="text-sm font-medium">{role.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Πεδία που εμφανίζονται μετά την επιλογή χρήστη και ρόλου */}
              {selectedUserForTicket && selectedRoleForTicket && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Τίτλος *
                    </label>
                    <input
                      type="text"
                      value={newTicketData.title}
                      onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      placeholder="Σύντομος τίτλος του ερωτήματος"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Περιγραφή *
                    </label>
                    <textarea
                      value={newTicketData.description}
                      onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none resize-none transition-all duration-300"
                      rows={4}
                      placeholder="Περιγράψτε αναλυτικά το ερώτημά σας..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Κατηγορία
                      </label>
                      <select
                        value={newTicketData.category}
                        onChange={(e) => setNewTicketData(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      >
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Προτεραιότητα
                      </label>
                      <select
                        value={newTicketData.priority}
                        onChange={(e) => setNewTicketData(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      >
                        {priorities.map(priority => (
                          <option key={priority.id} value={priority.id}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Εμφάνιση πεδίου ακινήτου μόνο για buyer και seller */}
                  {(selectedRoleForTicket === 'buyer' || selectedRoleForTicket === 'seller') && userSpecificProperties.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Σχετικό Ακίνητο (προαιρετικό)
                      </label>
                      <select
                        value={newTicketData.propertyId}
                        onChange={(e) => setNewTicketData(prev => ({ ...prev, propertyId: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      >
                        <option value="">Επιλέξτε ακίνητο...</option>
                        {userSpecificProperties.map(property => (
                          <option key={property.id} value={property.id}>
                            {property.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Εμφάνιση πεδίου συναλλαγής μόνο για agent */}
                  {selectedRoleForTicket === 'agent' && userSpecificTransactions.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Σχετική Συναλλαγή (προαιρετικό)
                      </label>
                      <select
                        value={newTicketData.transactionId}
                        onChange={(e) => setNewTicketData(prev => ({ ...prev, transactionId: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      >
                        <option value="">Επιλέξτε συναλλαγή...</option>
                        {userSpecificTransactions.map(transaction => (
                          <option key={transaction.id} value={transaction.id}>
                            {transaction.property.title} - {transaction.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  onClick={() => {
                    setIsNewMessageModalOpen(false);
                    resetAdminTicketForm();
                  }}
                  className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleCreateTicketAsAdmin}
                  disabled={isCreatingMessage || !selectedUserForTicket || !selectedRoleForTicket || !newTicketData.title.trim() || !newTicketData.description.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreatingMessage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <FaPaperPlane className="text-sm" />
                      <span>Δημιουργία Ερωτήματος</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && selectedTicketForStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Αλλαγή Κατάστασης Αιτήματος</h3>
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setSelectedTicketForStatus(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Αίτημα:</strong> {selectedTicketForStatus.property?.title || selectedTicketForStatus.title || 'Γενικό Ερώτημα'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Χρήστης:</strong> {selectedTicketForStatus.user?.name || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Τρέχουσα κατάσταση:</strong> 
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  selectedTicketForStatus.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                  selectedTicketForStatus.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  selectedTicketForStatus.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTicketForStatus.status === 'OPEN' ? 'Ανοιχτό' :
                   selectedTicketForStatus.status === 'IN_PROGRESS' ? 'Σε εξέλιξη' :
                   selectedTicketForStatus.status === 'RESOLVED' ? 'Επιλύθηκε' :
                   'Κλειστό'}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleUpdateTicketStatusFromModal(selectedTicketForStatus.id, 'OPEN')}
                disabled={isUpdatingStatusFromModal || selectedTicketForStatus.status === 'OPEN'}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                  selectedTicketForStatus.status === 'OPEN'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                } ${isUpdatingStatusFromModal ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">Ανοιχτό</span>
                </div>
                {selectedTicketForStatus.status === 'OPEN' && (
                  <FiCheck className="text-red-600" />
                )}
              </button>

              <button
                onClick={() => handleUpdateTicketStatusFromModal(selectedTicketForStatus.id, 'IN_PROGRESS')}
                disabled={isUpdatingStatusFromModal || selectedTicketForStatus.status === 'IN_PROGRESS'}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                  selectedTicketForStatus.status === 'IN_PROGRESS'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                } ${isUpdatingStatusFromModal ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Σε εξέλιξη</span>
                </div>
                {selectedTicketForStatus.status === 'IN_PROGRESS' && (
                  <FiCheck className="text-yellow-600" />
                )}
              </button>

              <button
                onClick={() => handleUpdateTicketStatusFromModal(selectedTicketForStatus.id, 'RESOLVED')}
                disabled={isUpdatingStatusFromModal || selectedTicketForStatus.status === 'RESOLVED'}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                  selectedTicketForStatus.status === 'RESOLVED'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                } ${isUpdatingStatusFromModal ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Επιλύθηκε</span>
                </div>
                {selectedTicketForStatus.status === 'RESOLVED' && (
                  <FiCheck className="text-green-600" />
                )}
              </button>

              <button
                onClick={() => handleUpdateTicketStatusFromModal(selectedTicketForStatus.id, 'CLOSED')}
                disabled={isUpdatingStatusFromModal || selectedTicketForStatus.status === 'CLOSED'}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center justify-between ${
                  selectedTicketForStatus.status === 'CLOSED'
                    ? 'bg-gray-50 border-gray-200 text-gray-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${isUpdatingStatusFromModal ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="font-medium">Κλειστό</span>
                </div>
                {selectedTicketForStatus.status === 'CLOSED' && (
                  <FiCheck className="text-gray-600" />
                )}
              </button>
            </div>

            {isUpdatingStatusFromModal && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Ενημέρωση κατάστασης...</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setSelectedTicketForStatus(null);
                }}
                disabled={isUpdatingStatusFromModal}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Ακύρωση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Message Modal */}
      {isSaveMessageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Αποθήκευση Μηνύματος</h3>
              <button
                onClick={() => setIsSaveMessageModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Τίτλος Μηνύματος *
              </label>
              <input
                type="text"
                value={savedMessageTitle}
                onChange={(e) => setSavedMessageTitle(e.target.value)}
                placeholder="Εισάγετε τίτλο για το μήνυμα..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Προεπισκόπηση Μηνύματος
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-700 mb-2">{replyContent}</p>
                {isReplyMultipleChoice && replyOptions.filter(option => option.trim()).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Επιλογές:</p>
                    <div className="space-y-1">
                      {replyOptions.filter(option => option.trim()).map((option, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsSaveMessageModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleSaveMessage}
                disabled={isSavingMessage}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSavingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaSave className="text-sm" />
                    <span>Αποθήκευση</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Messages Modal */}
      {isSavedMessagesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Αποθηκευμένα Μηνύματα</h3>
              <button
                onClick={() => setIsSavedMessagesModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3">
              {getSavedMessages().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaComments className="mx-auto text-4xl text-gray-300 mb-4" />
                  <p>Δεν υπάρχουν αποθηκευμένα μηνύματα.</p>
                  <p className="text-sm">Αποθηκεύστε μηνύματα για γρήγορη πρόσβαση.</p>
                </div>
              ) : (
                getSavedMessages().map((savedMessage: any) => (
                  <div
                    key={savedMessage.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleLoadSavedMessage(savedMessage)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{savedMessage.title}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(savedMessage.createdAt).toLocaleDateString('el-GR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{savedMessage.content}</p>
                    {savedMessage.isMultipleChoice && savedMessage.options && savedMessage.options.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {savedMessage.options.map((option: string, index: number) => (
                          <span
                            key={index}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSavedMessagesModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {isCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Λεπτομέρειες Εταιρείας</h2>
                <button
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setCompanyModalTab('details')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      companyModalTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Λεπτομέρειες
                  </button>
                  <button
                    onClick={() => {
                      setCompanyModalTab('subscription');
                      refreshSubscriptionData();
                    }}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      companyModalTab === 'subscription'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Συνδρομή
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {companyModalTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Βασικές Πληροφορίες */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Βασικές Πληροφορίες</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Όνομα Εταιρείας</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCompany.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCompany.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τύπος Χρήστη</label>
                      <p className="mt-1 text-sm text-gray-900">COMPANY</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ρόλος</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedCompany.role}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ημερομηνία Εγγραφής</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedCompany.createdAt).toLocaleDateString('el-GR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Referral Πληροφορίες */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Referral Πληροφορίες</h3>
                    
                    {selectedCompany.referralInfo?.hasReferral ? (
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ Έχει Referral
                          </span>
                        </div>
                        
                        {selectedCompany.referralInfo.referrerName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Από:</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedCompany.referralInfo.referrerName}</p>
                          </div>
                        )}
                        
                        {selectedCompany.referralInfo.referralCode && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Κωδικός Referral:</label>
                            <p className="mt-1 text-sm text-gray-900 font-mono">{selectedCompany.referralInfo.referralCode}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Δεν έχει Referral
                        </span>
                      </div>
                    )}

                    {selectedCompany.isReferrer && (
                      <div className="mt-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          🎯 Είναι Referrer
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {companyModalTab === 'subscription' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Συνδρομητικά Στοιχεία</h3>
                    <button
                      onClick={() => setIsEditingSubscription(!isEditingSubscription)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      {isEditingSubscription ? 'Ακύρωση' : 'Επεξεργασία'}
                    </button>
                  </div>
                  
                  {isEditingSubscription ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Συνδρομή Form */}
                        <div className="space-y-4">
                          <h4 className="text-md font-semibold text-gray-800">Συνδρομή</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Πλάνο</label>
                            <select
                              value={subscriptionForm.planName}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, planName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Επιλέξτε πλάνο</option>
                              <option value="Free">Δωρεάν</option>
                              <option value="Basic">Basic</option>
                              <option value="Pro">Pro</option>
                              <option value="Enterprise">Enterprise</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Κατάσταση</label>
                            <select
                              value={subscriptionForm.status}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, status: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ACTIVE">Ενεργή</option>
                              <option value="TRIAL">Δοκιμαστική</option>
                              <option value="CANCELLED">Ακυρωμένη</option>
                              <option value="PAST_DUE">Εκπρόθεσμη</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Συχνότητα</label>
                            <select
                              value={subscriptionForm.billingCycle}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, billingCycle: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="MONTHLY">Μηνιαία</option>
                              <option value="QUARTERLY">Τριμηνιαία</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Έναρξη Περιόδου</label>
                            <input
                              type="date"
                              value={subscriptionForm.currentPeriodStart}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, currentPeriodStart: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Λήξη Περιόδου</label>
                            <input
                              type="date"
                              value={subscriptionForm.currentPeriodEnd}
                              onChange={(e) => setSubscriptionForm({...subscriptionForm, currentPeriodEnd: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Πληρωμές Form */}
                        <div className="space-y-4">
                          <h4 className="text-md font-semibold text-gray-800">Πληρωμές</h4>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Προεπιλεγμένα Πλάνα</h5>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span>Free:</span>
                                <span>€0</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Basic:</span>
                                <span>€29.99</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pro:</span>
                                <span>€59.99</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Enterprise:</span>
                                <span>€99.99</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Η τιμή καθορίζεται από το επιλεγμένο πλάνο
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={() => setIsEditingSubscription(false)}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Ακύρωση
                        </button>
                        <button
                          onClick={handleUpdateSubscription}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Αποθήκευση
                        </button>
                      </div>
                    </div>
                  ) : (
                    companySubscription ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(() => { console.log('=== Modal rendering subscription data ===', companySubscription); return null; })()}
                        {/* Συνδρομή */}
                        <div className="space-y-4">
                          <h4 className="text-md font-semibold text-gray-800">Συνδρομή</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Τύπος Χρήστη</label>
                            <p className="mt-1 text-sm text-gray-900">{companySubscription.userType || 'N/A'}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Πλάνο</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {companySubscription.plan?.name ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  {companySubscription.plan.name}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Δωρεάν
                                </span>
                              )}
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Κατάσταση</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {companySubscription.status ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  companySubscription.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800'
                                    : companySubscription.status === 'TRIAL'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {companySubscription.status === 'ACTIVE' ? 'Ενεργή' : 
                                   companySubscription.status === 'TRIAL' ? 'Δοκιμαστική' : 
                                   companySubscription.status}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Δεν έχει συνδρομή
                                </span>
                              )}
                            </p>
                          </div>

                          {companySubscription.currentPeriodStart && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Έναρξη Περιόδου</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {new Date(companySubscription.currentPeriodStart).toLocaleDateString('el-GR')}
                              </p>
                            </div>
                          )}

                          {companySubscription.currentPeriodEnd && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Λήξη Περιόδου</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {new Date(companySubscription.currentPeriodEnd).toLocaleDateString('el-GR')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Πληρωμές */}
                        <div className="space-y-4">
                          <h4 className="text-md font-semibold text-gray-800">Πληρωμές</h4>
                          
                          {companySubscription.plan?.price && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Ποσό</label>
                              <p className="mt-1 text-sm text-gray-900">€{companySubscription.plan.price}</p>
                            </div>
                          )}

                          {companySubscription.currency && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Νόμισμα</label>
                              <p className="mt-1 text-sm text-gray-900">{companySubscription.currency.toUpperCase()}</p>
                            </div>
                          )}

                          {companySubscription.billingCycle && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Συχνότητα</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {companySubscription.billingCycle === 'MONTHLY' ? 'Μηνιαία' : 
                                 companySubscription.billingCycle === 'QUARTERLY' ? 'Τριμηνιαία' : 
                                 companySubscription.billingCycle}
                              </p>
                            </div>
                          )}

                          {companySubscription.cancelAtPeriodEnd !== undefined && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Ακύρωση</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {companySubscription.cancelAtPeriodEnd ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    Θα ακυρωθεί στο τέλος της περιόδου
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Ενεργή συνδρομή
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {(() => { console.log('=== Modal showing no subscription data ===', { companySubscription }); return null; })()}
                        <div className="text-gray-400 mb-4">
                          <FaGift className="mx-auto text-4xl" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Δεν υπάρχουν δεδομένα συνδρομής</h4>
                        <p className="text-gray-600">Η εταιρεία δεν έχει ενεργή συνδρομή ή τα δεδομένα δεν είναι διαθέσιμα.</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Ενέργειες */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ενέργειες</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      // TODO: Implement send message functionality
                      console.log('Send message to company:', selectedCompany.id);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaComments className="inline mr-2" />
                    Στείλε Μήνυμα
                  </button>
                  
                  <button
                    onClick={() => {
                      // TODO: Implement view properties functionality
                      console.log('View company properties:', selectedCompany.id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FaBuilding className="inline mr-2" />
                    Προβολή Ακινήτων
                  </button>
                  
                  <button
                    onClick={() => {
                      // TODO: Implement view subscription functionality
                      console.log('View company subscription:', selectedCompany.id);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <FaGift className="inline mr-2" />
                    Προβολή Συνδρομής
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 