'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaUsers, FaChartBar, FaPlus, FaEye, FaCalendarAlt, FaBuilding, FaUserTie, FaPhone, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaSearch, FaUser, FaSignOutAlt, FaCog, FaComments, FaExchangeAlt, FaQuestionCircle, FaInfoCircle, FaCheck, FaTimes, FaCaretDown, FaMapMarkerAlt, FaTrash, FaCrown, FaCreditCard } from 'react-icons/fa';
import PropertyAvailabilityEditor from '@/components/properties/PropertyAvailabilityEditor';
import LeadDetailsModal from '@/components/leads/LeadDetailsModal';
import PropertyDetailsModal from '@/components/properties/PropertyDetailsModal';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PropertyProgressModal from '@/components/properties/PropertyProgressModal';
import VisitSchedulingModal from '@/components/properties/VisitSchedulingModal';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import AddInterestedBuyerModal from '@/components/leads/AddInterestedBuyerModal';
import VerifyOtpModal from '@/components/leads/VerifyOtpModal';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
import SupportCenter from '@/components/support/SupportCenter';
import RemovePropertyModal from '@/components/properties/RemovePropertyModal';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

interface Update {
  id: number;
  text: string;
  date: string;
  message?: string;
  category: 'appointment' | 'offer' | 'contract' | 'payment' | 'completion' | 'general';
  isUnread: boolean;
  stage: string;
  createdAt?: string;
}

interface Appointment {
  _id: string;
  id: string;
  propertyId: string;
  propertyTitle: string;
  buyerId: string;
  buyer: {
    name: string;
    email: string;
  };
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  submittedByBuyer: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  status: 'pending' | 'contacted' | 'viewing_scheduled' | 'offer_made' | 'completed' | 'rejected' | 'accepted';
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  updates: Update[];
  stage: string;
  transaction?: {
    id: string;
    status: string;
    stage: string;
    createdAt: string;
    progress: {
      stage: string;
      updatedAt: string;
      notifications: {
        id: string;
        message: string;
        recipient: 'buyer' | 'seller' | 'agent';
        stage: string;
        category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
        createdAt: string;
        isUnread: boolean;
      }[];
    };
  };
}

interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  stats?: {
    interestedCount: number;
    viewingCount: number;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface PropertyWithLeads {
  _id: string;
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  price: number;
  status: string;
  propertyType: string;
  type: 'plot' | 'apartment' | 'house' | 'commercial' | 'villa';
  images: string[];
  location: string;
  state: string;
  city: string;
  street: string;
  number: string;
  postalCode: string;
  area: number;
  features: string[];
  bedrooms: number;
  bathrooms: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  removalRequested?: boolean;
  uploadMethod?: 'self' | 'lawyer';
  lawyerInfo?: {
    name: string;
    email: string;
    phone: string;
    taxId?: string;
  };
  assignmentType?: 'platform' | 'self';
  assignmentDocument?: {
    id: string;
    type: 'assignment' | 'contract';
    fileUrl?: string;
    uploadedAt?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  leads: Lead[];
  stats: {
    views: number;
    interestedCount: number;
    viewingCount: number;
    lastViewed: Date | null;
  };
  transaction?: {
    id: string;
    progress: {
      stage: string;
      updatedAt: string;
      notifications: Update[];
    };
    property: {
      id: string;
      title: string;
      location: string;
      price: number;
      bedrooms: number;
      bathrooms: number;
      area: number;
      features: string[];
      images: string[];
    };
  };
}

interface TransactionUpdate {
  type: 'transaction_update';
  data: {
    id: string;
    progress: {
      stage: string;
      updatedAt: string;
      notifications: {
        id: string;
        message: string;
        recipient: 'buyer' | 'seller' | 'agent';
        stage: string;
        category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
        createdAt: string;
        isUnread: boolean;
      }[];
    };
    property: {
      id: string;
    };
  };
}

interface LeadDetailsModalProps {
  lead: Lead;
  property: PropertyWithLeads;
  propertyTitle: string;
  updates: {
    stage: string;
    timestamp: string;
    message: string;
  }[];
  currentStage: string;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
}

interface VisitSchedulingSettings {
  presenceType: 'platform_only' | 'seller_and_platform';
  schedulingType: 'seller_availability' | 'buyer_proposal';
  availability?: {
    days: string[];
    timeSlots: string[];
  };
}

export default function SellerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'listings' | 'leads' | 'analytics' | 'appointments' | 'support'>('listings');
  const [properties, setProperties] = useState<PropertyWithLeads[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLeads | null>(null);
  const [isAvailabilityEditorOpen, setIsAvailabilityEditorOpen] = useState(false);
  const [isPropertyDetailsModalOpen, setIsPropertyDetailsModalOpen] = useState(false);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<PropertyWithLeads | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedPropertyForLead, setSelectedPropertyForLead] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isSubscriptionDetailsModalOpen, setIsSubscriptionDetailsModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedPropertyForProgress, setSelectedPropertyForProgress] = useState<PropertyWithLeads | null>(null);
  const [isVisitSchedulingModalOpen, setIsVisitSchedulingModalOpen] = useState(false);
  const [selectedPropertyForScheduling, setSelectedPropertyForScheduling] = useState<PropertyWithLeads | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [visitSettings, setVisitSettings] = useState<VisitSchedulingSettings | undefined>(undefined);
  const [modalInitialSettings, setModalInitialSettings] = useState<VisitSchedulingSettings | undefined>(undefined);
  const [localModalSettings, setLocalModalSettings] = useState<VisitSchedulingSettings | undefined>(undefined);
  const [isAddBuyerModalOpen, setIsAddBuyerModalOpen] = useState(false);
  const [isVerifyOtpModalOpen, setIsVerifyOtpModalOpen] = useState(false);
  const [selectedPropertyIdForBuyer, setSelectedPropertyIdForBuyer] = useState<string>('');
  const [connectionIdForOtp, setConnectionIdForOtp] = useState<string>('');
  const [hasNewAppointmentNotification, setHasNewAppointmentNotification] = useState(false);
  const [hasSeenAppointmentNotification, setHasSeenAppointmentNotification] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenAppointmentNotification') === 'true';
    }
    return false;
  });
  const [hasNewInterestNotification, setHasNewInterestNotification] = useState(false);
  const [hasSeenInterestNotification, setHasSeenInterestNotification] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenInterestNotification') === 'true';
    }
    return false;
  });

  // State για highlight του κουμπιού προόδου
  const [propertiesWithProgressNotification, setPropertiesWithProgressNotification] = useState<Set<string>>(new Set());

  // State για highlight των κουμπιών που δεν έχουν πατηθεί ποτέ
  const [propertiesWithUnclickedProgressButtons, setPropertiesWithUnclickedProgressButtons] = useState<Set<string>>(new Set());
  const [propertiesWithUnclickedAppointmentButtons, setPropertiesWithUnclickedAppointmentButtons] = useState<Set<string>>(new Set());

  // State για το modal αφαίρεσης ακινητού
  const [isRemovePropertyModalOpen, setIsRemovePropertyModalOpen] = useState(false);
  const [selectedPropertyForRemoval, setSelectedPropertyForRemoval] = useState<PropertyWithLeads | null>(null);
  const [isRemovingProperty, setIsRemovingProperty] = useState(false);

  // State για sorting των ενδιαφερομένων
  const [leadsSortField, setLeadsSortField] = useState<'property' | 'buyer' | 'stage' | 'date'>('date');
  const [leadsSortDirection, setLeadsSortDirection] = useState<'asc' | 'desc'>('desc');

  // State για sorting των ραντεβού
  const [appointmentsSortField, setAppointmentsSortField] = useState<'property' | 'buyer' | 'date' | 'status'>('date');
  const [appointmentsSortDirection, setAppointmentsSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Φίλτρα για τους ενδιαφερομένους
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Φίλτρα για τα ραντεβού
  const [selectedAppointmentPropertyFilter, setSelectedAppointmentPropertyFilter] = useState<string>('all');
  const [showAppointmentFilters, setShowAppointmentFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Συνάρτηση για να προσδιορίσω τη σειρά των σταδίων
  const getStageOrder = (stage: string) => {
    switch (stage?.toUpperCase()) {
      case 'PENDING':
      case 'pending':
        return 1; // Αναμονή για ραντεβού
      case 'MEETING_SCHEDULED':
      case 'viewing_scheduled':
        return 2; // Έγινε ραντεβού
      case 'DEPOSIT_PAID':
        return 3; // Έγινε προκαταβολή
      case 'FINAL_SIGNING':
      case 'offer_made':
        return 4; // Τελική υπογραφή
      case 'COMPLETED':
      case 'completed':
      case 'accepted':
        return 5; // Ολοκληρώθηκε
      case 'CANCELLED':
      case 'rejected':
        return 6; // Ακυρώθηκε
      default:
        return 0;
    }
  };

  // Συνάρτηση για το sorting των ενδιαφερομένων
  const handleLeadsSort = (field: 'property' | 'buyer' | 'stage' | 'date') => {
    if (leadsSortField === field) {
      // Αν κάνουμε κλικ στην ίδια στήλη, αλλάζουμε την κατεύθυνση
      setLeadsSortDirection(leadsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Αν κάνουμε κλικ σε διαφορετική στήλη, την κάνουμε την νέα στήλη sorting με desc
      setLeadsSortField(field);
      setLeadsSortDirection('desc');
    }
  };

  // Συνάρτηση για το sorting των ραντεβού
  const handleAppointmentsSort = (field: 'property' | 'buyer' | 'date' | 'status') => {
    if (appointmentsSortField === field) {
      // Αν κάνουμε κλικ στην ίδια στήλη, αλλάζουμε την κατεύθυνση
      setAppointmentsSortDirection(appointmentsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Αν κάνουμε κλικ σε διαφορετική στήλη, την κάνουμε την νέα στήλη sorting με desc
      setAppointmentsSortField(field);
      setAppointmentsSortDirection('desc');
    }
  };

  // Συνάρτηση για να πάρω το filtered και sorted array των ενδιαφερομένων
  const getFilteredAndSortedLeads = () => {
    let allLeads = properties.flatMap(property =>
      property.leads.map(lead => ({ ...lead, property }))
    );

    // Εφαρμογή φίλτρων
    if (selectedStageFilter !== 'all') {
      allLeads = allLeads.filter(lead => {
        const stage = lead.transaction?.progress?.stage || lead.status || 'pending';
        return stage.toLowerCase() === selectedStageFilter.toLowerCase();
      });
    }

    if (selectedPropertyFilter !== 'all') {
      allLeads = allLeads.filter(lead => lead.property.id === selectedPropertyFilter);
    }

    // Sorting
    return allLeads.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (leadsSortField) {
        case 'property':
          aValue = a.property.title.toLowerCase();
          bValue = b.property.title.toLowerCase();
          break;
        case 'buyer':
          aValue = a.buyer.name.toLowerCase();
          bValue = b.buyer.name.toLowerCase();
          break;
        case 'stage':
          aValue = getStageOrder(a.transaction?.progress?.stage || a.status);
          bValue = getStageOrder(b.transaction?.progress?.stage || b.status);
          break;
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (leadsSortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Συνάρτηση για να πάρω το sorted array των ενδιαφερομένων (παραμένει για συμβατότητα)
  const getSortedLeads = () => {
    return getFilteredAndSortedLeads();
  };

  // Συναρτήσεις για τα φίλτρα
  const handleStageFilterChange = (stage: string) => {
    setSelectedStageFilter(stage);
  };

  const handlePropertyFilterChange = (propertyId: string) => {
    setSelectedPropertyFilter(propertyId);
  };

  const clearFilters = () => {
    setSelectedStageFilter('all');
    setSelectedPropertyFilter('all');
  };

  const getStageLabel = (stage: string) => {
    switch (stage?.toUpperCase()) {
      case 'PENDING':
      case 'pending':
        return 'Αναμονή για ραντεβού';
      case 'MEETING_SCHEDULED':
      case 'viewing_scheduled':
        return 'Έγινε ραντεβού';
      case 'DEPOSIT_PAID':
        return 'Έγινε προκαταβολή';
      case 'FINAL_SIGNING':
      case 'offer_made':
        return 'Τελική υπογραφή';
      case 'COMPLETED':
      case 'completed':
      case 'accepted':
        return 'Ολοκληρώθηκε';
      case 'CANCELLED':
      case 'rejected':
        return 'Ακυρώθηκε';
      default:
        return stage || 'Άγνωστο';
    }
  };

  // Συναρτήσεις για τα φίλτρα των ραντεβού
  const handleAppointmentPropertyFilterChange = (propertyId: string) => {
    setSelectedAppointmentPropertyFilter(propertyId);
  };

  const clearAppointmentFilters = () => {
    setSelectedAppointmentPropertyFilter('all');
  };

  const getFilteredAppointments = () => {
    let filtered = appointments;
    
    if (selectedAppointmentPropertyFilter !== 'all') {
      filtered = filtered.filter(appointment => 
        properties.some(property => 
          property.id === selectedAppointmentPropertyFilter && 
          property.title === appointment.propertyTitle
        )
      );
    }
    
    return filtered;
  };

  const getAppointmentsForDate = (date: Date) => {
    const filtered = getFilteredAppointments();
    return filtered.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === date.toDateString();
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('el-GR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Προηγούμενος μήνας
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Τρέχων μήνας
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({ date: currentDate, isCurrentMonth: true });
    }
    
    // Επόμενος μήνας
    const remainingDays = 42 - days.length; // 6 εβδομάδες * 7 μέρες
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  // Συνάρτηση για να πάρω το sorted array των ραντεβού
  const getSortedAppointments = () => {
    const filtered = getFilteredAppointments();
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (appointmentsSortField) {
        case 'property':
          aValue = a.propertyTitle.toLowerCase();
          bValue = b.propertyTitle.toLowerCase();
          break;
        case 'buyer':
          aValue = a.buyer.name.toLowerCase();
          bValue = b.buyer.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (appointmentsSortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    // Event listener για το άνοιγμα του AppointmentDetailsModal από ειδοποιήσεις
    const handleOpenAppointmentModal = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { appointmentId, propertyId, buyerId } = customEvent.detail;
      
      // Ανοίγουμε το tab ραντεβού
      setActiveTab('appointments');
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει το tab
      setHasNewAppointmentNotification(false);
      setHasSeenAppointmentNotification(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenAppointmentNotification', 'true');
      }
      
      try {
        // Πρώτα προσπαθούμε να βρούμε το ραντεβού στα υπάρχοντα appointments
        let appointment = appointments.find(a => 
          a.id === appointmentId || 
          a._id === appointmentId
        );
        
        // Αν δεν βρέθηκε στα υπάρχοντα, κάνουμε fetch από το API
        if (!appointment) {
          // Πρώτα δοκιμάζουμε το appointments API
          let appointmentData = null;
          try {
            const { data } = await apiClient.get(`/seller/appointments/${appointmentId}`);
            appointmentData = data;
          } catch (e) {
            // Αν δεν βρέθηκε, δοκιμάζουμε το viewing-requests API
            try {
              const { data } = await apiClient.get(`/viewing-requests/${appointmentId}`);
              appointmentData = data;
            } catch (e2) {
              // Both failed
            }
          }
          
          if (appointmentData) {
            
            // Δημιουργούμε το location string από τα πεδία του property
            const location = appointmentData.property ? 
              [appointmentData.property.state, appointmentData.property.city, appointmentData.property.street]
                .filter(Boolean)
                .join(', ') : '';
            
            // Δημιουργούμε το appointment object
            appointment = {
              _id: appointmentData.id,
              id: appointmentData.id,
              propertyId: appointmentData.propertyId,
              propertyTitle: appointmentData.property?.title || '',
              buyerId: appointmentData.buyerId,
              buyer: {
                name: appointmentData.buyer?.name || '',
                email: appointmentData.buyer?.email || ''
              },
              date: appointmentData.date,
              time: appointmentData.time || (appointmentData.date ? new Date(appointmentData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
              status: appointmentData.status,
              notes: '', // ViewingRequest doesn't have notes field
              submittedByBuyer: true,
              createdAt: appointmentData.createdAt,
              updatedAt: appointmentData.updatedAt
            };
          }
        }

        if (!appointment) {
          toast.error('Δεν βρέθηκε το ραντεβού');
          return;
        }

        // Βρίσκουμε το property ή δημιουργούμε ένα fallback
        const property = properties.find(p => p._id === propertyId) || {
          _id: propertyId,
          title: appointment.propertyTitle,
          price: 0,
          location: ''
        };

        // Ορίζουμε το selectedAppointment για να ανοίξει το modal
        setSelectedAppointment(appointment);
        
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        toast.error('Σφάλμα κατά την ανάκτηση των στοιχείων του ραντεβού');
      }
    };

    // Event listener για νέες ειδοποιήσεις ραντεβού
    const handleNewAppointmentNotification = () => {
      if (!hasSeenAppointmentNotification) {
        setHasNewAppointmentNotification(true);
      }
    };

    // Event listener για νέες ειδοποιήσεις ενδιαφέροντος
    const handleNewInterestNotification = () => {
      if (!hasSeenInterestNotification) {
        setHasNewInterestNotification(true);
      }
    };

    // Event listener για το άνοιγμα του LeadDetailsModal από ειδοποιήσεις
    const handleOpenLeadModal = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { leadId, transactionId, buyerId, agentId, propertyId } = customEvent.detail;
      
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNewInterestNotification(false);
      setHasSeenInterestNotification(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenInterestNotification', 'true');
      }
      
      // Ανοίγουμε το tab ενδιαφερόμενων
      handleTabChange('leads');
      
      try {
        // Βρίσκουμε το property που ανήκει στο lead
        let property = properties.find(p => 
          p._id === propertyId || 
          p.id === propertyId
        );
        
        // Αν δεν βρέθηκε με ID, προσπαθούμε με το όνομα του ακινήτου
        if (!property && propertyId) {
          property = properties.find(p => 
            p.title.toLowerCase().includes(propertyId.toLowerCase()) ||
            p.title.toLowerCase() === propertyId.toLowerCase()
          );
        }
        
        if (!property) {
          toast.error('Δεν βρέθηκε το ακίνητο');
          return;
        }

        // Βρίσκουμε το lead στο property με διάφορους τρόπους
        let lead = null;
        
        // Πρώτα προσπαθούμε με leadId
        if (leadId) {
          lead = property.leads.find(l => l.id === leadId);
        }
        
        // Αν δεν βρέθηκε, προσπαθούμε με transactionId
        if (!lead && transactionId) {
          lead = property.leads.find(l => l.transaction?.id === transactionId);
        }
        
        // Αν δεν βρέθηκε, προσπαθούμε με buyerId
        if (!lead && buyerId) {
          lead = property.leads.find(l => l.buyer?.id === buyerId);
        }
        
        // Αν δεν βρέθηκε, προσπαθούμε με email του buyer
        if (!lead && buyerId) {
          // Υποθέτουμε ότι το buyerId μπορεί να είναι email
          lead = property.leads.find(l => 
            l.buyer?.email?.toLowerCase() === buyerId.toLowerCase()
          );
        }
        
        // Αν ακόμα δεν βρέθηκε, παίρνουμε τον πιο πρόσφατο lead για αυτό το property
        if (!lead && property.leads.length > 0) {
          lead = property.leads.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        }

        if (!lead) {
          toast.error('Δεν βρέθηκε ο ενδιαφερόμενος');
          return;
        }

        // Ορίζουμε το selectedLead και selectedProperty για να ανοίξει το modal
        setSelectedLead(lead);
        setSelectedProperty(property);
        setSelectedPropertyForLead(property.title);
        
      } catch (error) {
        console.error('Error opening lead details modal:', error);
        toast.error('Σφάλμα κατά την ανάκτηση των στοιχείων του ενδιαφερομένου');
      }
    };

    // Event listener για το άνοιγμα του PropertyProgressModal από ειδοποιήσεις
    const handleOpenPropertyProgressModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { propertyId, propertyTitle, stage } = customEvent.detail;
      
      // Ανοίγουμε το tab ακινήτων
      handleTabChange('listings');
      
      try {
        // Βρίσκουμε το property
        const property = properties.find(p => 
          p._id === propertyId || 
          p.id === propertyId
        );
        
        if (!property) {
          toast.error('Δεν βρέθηκε το ακίνητο');
          return;
        }

        // Ορίζουμε το selectedPropertyForProgress για να ανοίξει το modal
        setSelectedPropertyForProgress(property);
        setIsProgressModalOpen(true);
        
        toast.success(`Το βήμα "${stage}" ολοκληρώθηκε επιτυχώς!`);
        
      } catch (error) {
        console.error('Error opening property progress modal:', error);
        toast.error('Σφάλμα κατά την ανάκτηση των στοιχείων του ακινήτου');
      }
    };

    // Event listener για ειδοποιήσεις ολοκλήρωσης σταδίου από admin
    const handleStageCompletionNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { propertyId, stage, message } = customEvent.detail;
      
      // Προσθέτουμε το propertyId στο set των properties με ειδοποίηση προόδου
      setPropertiesWithProgressNotification(prev => new Set(prev).add(propertyId));
      
      // Ανοίγουμε το tab ακινήτων
      handleTabChange('listings');
      
      try {
        // Βρίσκουμε το property
        const property = properties.find(p => 
          p._id === propertyId || 
          p.id === propertyId
        );
        
        if (!property) {
          toast.error('Δεν βρέθηκε το ακίνητο');
          return;
        }

        // Ορίζουμε το selectedPropertyForProgress για να ανοίξει το modal
        setSelectedPropertyForProgress(property);
        setIsProgressModalOpen(true);
        
        // Αφαιρούμε το highlight από το κουμπί προόδου αφού ανοίξει το modal
        setPropertiesWithProgressNotification(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          newSet.delete(property.id);
          newSet.delete(property._id);
          return newSet;
        });
        
        toast.success(message || `Το στάδιο "${stage}" ολοκληρώθηκε επιτυχώς!`);
        
      } catch (error) {
        console.error('Error handling stage completion notification:', error);
        toast.error('Σφάλμα κατά την ανάκτηση των στοιχείων του ακινήτου');
      }
    };

    // Event listener για ειδοποιήσεις "Ολοκλήρωση Βήματος" από το SellerNotificationBell
    const handleStageCompletionFromBell = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { propertyTitle, stage } = customEvent.detail;
      
      console.log('=== Stage Completion from Bell ===', { propertyTitle, stage });
      
      // Βρίσκουμε το property με βάση τον τίτλο
      let property = properties.find(p => 
        p.title.toLowerCase().includes(propertyTitle.toLowerCase()) ||
        p.title.toLowerCase() === propertyTitle.toLowerCase()
      );
      
      // Αν δεν βρέθηκε, δοκιμάζουμε με partial match
      if (!property) {
        property = properties.find(p => 
          propertyTitle.toLowerCase().includes(p.title.toLowerCase()) ||
          p.title.toLowerCase().includes(propertyTitle.toLowerCase())
        );
      }
      
      // Αν ακόμα δεν βρέθηκε, δοκιμάζουμε με fuzzy match
      if (!property) {
        const cleanPropertyTitle = propertyTitle.replace(/[^\w\s]/g, '').toLowerCase().trim();
        property = properties.find(p => {
          const cleanTitle = p.title.replace(/[^\w\s]/g, '').toLowerCase().trim();
          return cleanTitle.includes(cleanPropertyTitle) || cleanPropertyTitle.includes(cleanTitle);
        });
      }
      
      if (property) {
        console.log('Found property for stage completion:', {
          propertyId: property.id,
          propertyTitle: property.title,
          extractedTitle: propertyTitle
        });
        // Προσθέτουμε το propertyId στο set των properties με ειδοποίηση προόδου
        setPropertiesWithProgressNotification(prev => {
          const newSet = new Set(prev);
          newSet.add(property.id);
          newSet.add(property._id);
          return newSet;
        });
      } else {
        console.log('Property not found for stage completion:', {
          searchedTitle: propertyTitle,
          availableProperties: properties.map(p => p.title)
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('openAppointmentDetailsModal', handleOpenAppointmentModal);
    window.addEventListener('newAppointmentNotification', handleNewAppointmentNotification);
    window.addEventListener('newInterestNotification', handleNewInterestNotification);
    window.addEventListener('openLeadDetailsModal', handleOpenLeadModal);
    window.addEventListener('openPropertyProgressModal', handleOpenPropertyProgressModal);
    window.addEventListener('stageCompletionNotification', handleStageCompletionNotification);
    window.addEventListener('stageCompletionFromBell', handleStageCompletionFromBell);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('openAppointmentDetailsModal', handleOpenAppointmentModal);
      window.removeEventListener('newAppointmentNotification', handleNewAppointmentNotification);
      window.removeEventListener('newInterestNotification', handleNewInterestNotification);
      window.removeEventListener('openLeadDetailsModal', handleOpenLeadModal);
      window.removeEventListener('openPropertyProgressModal', handleOpenPropertyProgressModal);
      window.removeEventListener('stageCompletionNotification', handleStageCompletionNotification);
      window.removeEventListener('stageCompletionFromBell', handleStageCompletionFromBell);
    };
  }, [properties]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchFromBackend('/seller/leads');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch data');
        }

        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // useEffect για να ελέγχω ποια properties δεν έχουν πατηθεί τα κουμπιά τους
  useEffect(() => {
    if (properties.length > 0) {
      const unclickedProgressProperties = new Set<string>();
      const unclickedAppointmentProperties = new Set<string>();
      
      properties.forEach(property => {
        const progressClicked = localStorage.getItem(`progress_clicked_${property.id}`);
        const appointmentsClicked = localStorage.getItem(`appointments_clicked_${property.id}`);
        
        // Αν δεν έχει πατηθεί το κουμπί προόδου
        if (!progressClicked) {
          unclickedProgressProperties.add(property.id);
          unclickedProgressProperties.add(property._id);
        }
        
        // Αν δεν έχει πατηθεί το κουμπί ραντεβού
        if (!appointmentsClicked) {
          unclickedAppointmentProperties.add(property.id);
          unclickedAppointmentProperties.add(property._id);
        }
      });
      
      setPropertiesWithUnclickedProgressButtons(unclickedProgressProperties);
      setPropertiesWithUnclickedAppointmentButtons(unclickedAppointmentProperties);
    }
  }, [properties]);

  // useEffect για να ελέγχω το localStorage και να ενημερώνω το state
  useEffect(() => {
    const checkLocalStorage = () => {
      if (properties.length > 0) {
        const unclickedProgressProperties = new Set<string>();
        const unclickedAppointmentProperties = new Set<string>();
        
        properties.forEach(property => {
          const progressClicked = localStorage.getItem(`progress_clicked_${property.id}`);
          const progressClickedById = localStorage.getItem(`progress_clicked_${property._id}`);
          const appointmentsClicked = localStorage.getItem(`appointments_clicked_${property.id}`);
          const appointmentsClickedById = localStorage.getItem(`appointments_clicked_${property._id}`);
          
          console.log(`Property ${property.id} (${property._id}): progress_clicked = ${progressClicked || progressClickedById}, appointments_clicked = ${appointmentsClicked || appointmentsClickedById}`);
          
          // Αν δεν έχει πατηθεί το κουμπί προόδου
          if (!progressClicked && !progressClickedById) {
            unclickedProgressProperties.add(property.id);
            unclickedProgressProperties.add(property._id);
          }
          
          // Αν δεν έχει πατηθεί το κουμπί ραντεβού
          if (!appointmentsClicked && !appointmentsClickedById) {
            unclickedAppointmentProperties.add(property.id);
            unclickedAppointmentProperties.add(property._id);
          }
        });
        
        console.log('Unclicked progress properties:', Array.from(unclickedProgressProperties));
        console.log('Unclicked appointment properties:', Array.from(unclickedAppointmentProperties));
        
        setPropertiesWithUnclickedProgressButtons(unclickedProgressProperties);
        setPropertiesWithUnclickedAppointmentButtons(unclickedAppointmentProperties);
      }
    };

    // Ελέγχουμε το localStorage αρχικά
    checkLocalStorage();
  }, [properties]);

  // useEffect για να διαβάζω το tab parameter από το URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['listings', 'leads', 'appointments', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam as 'listings' | 'leads' | 'appointments' | 'analytics');
    }
  }, []);

  const fetchAppointments = async () => {
    if (!session?.user) return;
    
    try {
      const { data } = await apiClient.get('/seller/appointments');
      
      if (data.appointments) {
        const mappedAppointments = data.appointments.map((a: any) => {
          console.log('Appointment status from API:', a.status); // Debug log
          return {
            _id: a.id || a._id,
            id: a.id || a._id,
            propertyId: a.propertyId,
            propertyTitle: a.property?.title || '',
            buyerId: a.buyerId,
            buyer: {
              name: a.buyer?.name || '',
              email: a.buyer?.email || ''
            },
            date: a.date,
            time: a.time || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
            status: a.status,
            notes: a.notes || '',
            submittedByBuyer: true,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt
          };
        });
        
        setAppointments(mappedAppointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  useEffect(() => {
    // Κάνε fetch τα ραντεβού όταν:
    // 1. Φορτώνεται το component
    // 2. Αλλάζει το activeTab σε 'appointments'
    // 3. Αλλάζει το session (για να ενημερωθούν τα ραντεβού μετά από login/logout)
    if (activeTab === 'appointments' || !appointments.length) {
      fetchAppointments();
    }
  }, [activeTab, session, appointments.length]);

  // Προσθήκη useEffect για να ενημερώνονται τα ραντεβού όταν γίνεται κάποια ενέργεια
  useEffect(() => {
    // Κάνε fetch τα ραντεβού όταν:
    // 1. Αλλάζει το activeTab σε 'appointments'
    // 2. Αλλάζει το session
    // 3. Αλλάζει το selectedAppointment (για να ενημερωθούν τα ραντεβού μετά από κάποια ενέργεια στο modal)
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, [activeTab, session, selectedAppointment]);

  // Add conversion function
  const convertNotificationToUpdate = (notification: any, index: number): Update => ({
    id: index + 1,
    text: notification.text || notification.message || '',
    date: notification.date || (notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('el-GR') : new Date().toLocaleDateString('el-GR')),
    category: (notification.category || 'general') as Update['category'],
    isUnread: notification.isUnread || false,
    stage: notification.stage || 'pending'
  });

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plans } = await apiClient.get('/subscription-plans');
        setSubscriptionPlans(plans);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      }
    };

    fetchPlans();
  }, []);

  // Fetch subscription info
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        // Fetch user profile from backend to get userType
        let userType = 'INDIVIDUAL';
        try {
          const userResponse = await fetchFromBackend('/user/profile');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userType = userData?.userType || 'INDIVIDUAL';
          }
        } catch (userError) {
          console.error('Error fetching user profile:', userError);
        }

        const { data: subscription } = await apiClient.get('/subscriptions');
        
        if (subscription) {
          setSubscriptionInfo({
            ...subscription,
            userType: subscription.userType || userType,
            planName: subscription.plan?.name,
            price: subscription.plan?.price,
            billingCycle: subscription.billingCycle,
            status: subscription.status?.toLowerCase(),
            expiresAt: subscription.currentPeriodEnd,
            plan: subscription.plan // Include full plan details
          });
        } else {
          // No subscription found, set basic info
          setSubscriptionInfo({
            userType: userType,
            status: 'none',
            planName: null
          });
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);
        // Set basic info on error
        setSubscriptionInfo({
          userType: 'INDIVIDUAL',
          status: 'none',
          planName: null
        });
      }
    };

    if (session?.user) {
      fetchSubscriptionInfo();
    }
  }, [session?.user]);

  // Update the useEffect for SSE
  useEffect(() => {
    if (!session?.user) return;

    const eventSource = new EventSource('/api/admin/transactions/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as TransactionUpdate;
      
      if (data.type === 'transaction_update') {
        console.log('=== SSE Update Received ===', {
          transactionId: data.data.id,
          stage: data.data.progress.stage,
          timestamp: new Date().toISOString()
        });

        setProperties(prevProperties => 
          prevProperties.map(property => ({
            ...property,
            leads: property.leads.map(lead => {
              if (lead.transaction?.id === data.data.id) {
                console.log('=== Updating Lead Transaction ===', {
                  leadId: lead.id,
                  transactionId: data.data.id,
                  stage: data.data.progress.stage
                });
                return {
                  ...lead,
                  transaction: {
                    ...lead.transaction,
                    progress: {
                      stage: data.data.progress.stage,
                      updatedAt: data.data.progress.updatedAt,
                      notifications: data.data.progress.notifications
                    }
                  }
                };
              }
              return lead;
            })
          }))
        );

        // Update selectedLead if it's the one being updated
        if (selectedLead?.transaction?.id === data.data.id) {
          console.log('=== Updating Selected Lead ===', {
            leadId: selectedLead.id,
            transactionId: data.data.id,
            stage: data.data.progress.stage
          });
          setSelectedLead(prev => {
            if (!prev) return null;
            return {
              ...prev,
              transaction: {
                ...prev.transaction!,
                progress: {
                  stage: data.data.progress.stage,
                  updatedAt: data.data.progress.updatedAt,
                  notifications: data.data.progress.notifications
                }
              }
            };
          });
        }

        toast.success('Η συναλλαγή ενημερώθηκε');
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session, selectedLead]);

  const updateLeadStatus = async (leadId: string, status: string, notes: string) => {
    try {
      await apiClient.put('/seller/leads', { leadId, status, notes });

      // Refresh the data
      const updatedResponse = await fetchFromBackend('/seller/leads');
      const updatedData = await updatedResponse.json();
      setProperties(updatedData);
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  // Filter and sort properties
  const filteredProperties = properties
    .filter(property => {
      const query = searchQuery.toLowerCase();
      return (
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Update the handleLeadClick function
  const handleLeadClick = async (lead: Lead, propertyTitle: string) => {
    console.log('=== Lead Click Debug START ===');
    console.log('Lead details:', {
      leadId: lead.id,
      transactionId: lead.transaction?.id,
      status: lead.status,
      stage: lead.transaction?.progress?.stage,
      buyerId: lead.buyer?.id,
      agentId: lead.agent?.id,
      timestamp: new Date().toISOString()
    });

    try {
      // Βρίσκουμε το property στο οποίο ανήκει το lead
      const property = properties.find(p => 
        p.leads.some(l => l.id === lead.id || l.transaction?.id === lead.transaction?.id)
      );
      
      console.log('Found property:', property ? {
        id: property.id,
        title: property.title,
        userId: property.userId,
        leadsCount: property.leads.length,
        hasTransaction: !!property.transaction
      } : 'NO_PROPERTY_FOUND');
      
      if (!property) {
        console.error('Property not found for lead:', lead.id);
        toast.error('Δεν βρέθηκε το ακίνητο για αυτόν τον ενδιαφερόμενο');
        return;
      }
      
      // Ορίζουμε το selectedProperty
      setSelectedProperty(property);

      // Αν υπάρχει transaction, κάνε fetch τα τελευταία progress/notifications
      let updatedTransaction = lead.transaction;
      if (lead.transaction?.id) {
        console.log('Fetching transaction data for ID:', lead.transaction.id);
        try {
          const { data: transactionData } = await apiClient.get(`/seller/transactions/${lead.transaction.id}`);
          console.log('Transaction response status: 200');
          console.log('Fresh transaction data:', {
            id: transactionData.id,
            stage: transactionData.progress?.stage,
            status: transactionData.status,
            hasNotifications: !!transactionData.progress?.notifications?.length,
            timestamp: new Date().toISOString()
          });
          updatedTransaction = {
            ...lead.transaction,
            progress: transactionData.progress
          };
        } catch (error) {
          console.error('Failed to fetch transaction data:', error);
        }
      } else {
        console.log('No transaction ID found for lead');
      }

      const updatedLead = {
        ...lead,
        transaction: updatedTransaction,
        notes: lead.notes || '',
        updates: updatedTransaction?.progress?.notifications?.map((n) => {
          return {
            id: typeof n.id === 'string' ? parseInt(n.id) : Number(n.id),
            text: n.message,
            date: new Date(n.createdAt).toLocaleDateString('el-GR'),
            category: n.category,
            isUnread: n.isUnread,
            stage: n.stage
          };
        }) || []
      };

      setSelectedLead(updatedLead);
      setSelectedPropertyForLead(propertyTitle);
      
      console.log('=== Lead Click Debug END ===');
    } catch (error) {
      console.error('Error in handleLeadClick:', error);
      toast.error('Σφάλμα κατά την ανάκτηση των δεδομένων');
    }
  };

  const handleUpdateLeadStatus = async (newStatus: string) => {
    if (!selectedLead) return;

    try {
      await updateLeadStatus(selectedLead.id, newStatus, selectedLead.notes || '');
      setSelectedLead(null);
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  const handleAddLeadNote = async (note: string) => {
    if (!selectedLead) return;

    try {
      const updatedNotes = selectedLead.notes ? `${selectedLead.notes}, ${note}` : note;
      await updateLeadStatus(selectedLead.id, selectedLead.status, updatedNotes);
      setSelectedLead({
        ...selectedLead,
        notes: updatedNotes
      });
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    }
  };

  // Add this function to handle progress button click
  const handleProgressClick = (property: PropertyWithLeads) => {
    setSelectedPropertyForProgress(property);
    setIsProgressModalOpen(true);
    
    // Αποθηκεύουμε ότι το κουμπί προόδου έχει πατηθεί
    localStorage.setItem(`progress_clicked_${property.id}`, 'true');
    localStorage.setItem(`progress_clicked_${property._id}`, 'true');
    console.log('Saved progress_clicked for property:', property.id, property._id);
    
    // Αφαιρούμε το highlight από το κουμπί προόδου για αυτό το property
    setPropertiesWithProgressNotification(prev => {
      const newSet = new Set(prev);
      newSet.delete(property.id);
      newSet.delete(property._id);
      return newSet;
    });
    
    // Αφαιρούμε το property από τα unclicked progress buttons
    setPropertiesWithUnclickedProgressButtons(prev => {
      const newSet = new Set(prev);
      newSet.delete(property.id);
      newSet.delete(property._id);
      return newSet;
    });
  };

  const handleVisitSchedulingClick = async (property: PropertyWithLeads) => {
    try {
      const { data } = await apiClient.get(`/seller/properties/${property.id}/visit-settings`);
      
      const settings: VisitSchedulingSettings = {
        presenceType: data.presenceType || 'platform_only',
        schedulingType: data.schedulingType || 'seller_availability',
        availability: {
          days: data.availableDays || [],
          timeSlots: data.timeSlots || []
        }
      };
      
      setSelectedPropertyForScheduling(property);
      setLocalModalSettings(settings);
      setIsVisitSchedulingModalOpen(true);
      
      // Αποθηκεύουμε ότι το κουμπί ραντεβού έχει πατηθεί
      localStorage.setItem(`appointments_clicked_${property.id}`, 'true');
      localStorage.setItem(`appointments_clicked_${property._id}`, 'true');
      console.log('Saved appointments_clicked for property:', property.id, property._id);
      
      // Αφαιρούμε το property από τα unclicked appointment buttons
      setPropertiesWithUnclickedAppointmentButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(property.id);
        newSet.delete(property._id);
        return newSet;
      });
    } catch (error) {
      console.error('Error fetching visit settings:', error);
      toast.error('Σφάλμα κατά την ανάκτηση των ρυθμίσεων επισκέψεων');
    }
  };

  const handleSaveVisitSettings = async (settings: VisitSchedulingSettings) => {
    if (!selectedPropertyForScheduling) return;

    // LOG πριν το fetch
    console.log('handleSaveVisitSettings - στέλνω fetch:', {
      url: `/api/seller/properties/${selectedPropertyForScheduling.id}/visit-settings`,
      settings
    });

    try {
      const { data: result } = await apiClient.put(`/seller/properties/${selectedPropertyForScheduling.id}/visit-settings`, settings);
      console.log('Απάντηση από το backend API:', result);

      toast.success('Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς');
    } catch (error) {
      console.error('Error saving visit settings:', error);
      toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την αποθήκευση των ρυθμίσεων');
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      console.log('Updating appointment:', appointmentId, action);
      const { data } = await apiClient.put(`/seller/appointments/${appointmentId}/status`, { status: action === 'approve' ? 'ACCEPTED' : 'REJECTED' });
      console.log('Update response:', data);

      // Ενημέρωση του state με το νέο status (σύγκριση και σε id και _id)
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          (app.id === appointmentId || app._id === appointmentId)
            ? { ...app, status: action === 'approve' ? 'accepted' : 'rejected' }
            : app
        )
      );

      // Refetch τα ραντεβού για σιγουριά
      fetchAppointments();

      toast.success(`Το ραντεβού ${action === 'approve' ? 'εγκρίθηκε' : 'απορρίφθηκε'} επιτυχώς`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Σφάλμα κατά την ενημέρωση του ραντεβού');
    }
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleAppointmentStatusChange = async (appointmentId: string, status: 'accepted' | 'rejected') => {
    try {
      await apiClient.put(`/seller/appointments/${appointmentId}/status`, { status: status.toUpperCase() });

      // Ενημέρωση του state με το νέο status
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          app.id === appointmentId
            ? { ...app, status }
            : app
        )
      );

      toast.success(`Το ραντεβού ${status === 'accepted' ? 'εγκρίθηκε' : 'απορρίφθηκε'} επιτυχώς`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Σφάλμα κατά την ενημέρωση του ραντεβού');
    }
  };

  // Helper function για label και χρώμα status ραντεβού
  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { label: 'Εκκρεμεί', color: 'bg-green-100 text-green-800' };
      case 'accepted':
        return { label: 'Εγκρίθηκε', color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: 'Απορρίφθηκε', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleLeadDeleted = (leadId: string) => {
    setProperties((prev: any[]) => prev.map(property => ({
      ...property,
      leads: property.leads?.filter((lead: any) => lead.id !== leadId)
    })));
  };

  // Συνάρτηση για να προσδιορίσω αν ένας ενδιαφερόμενος είναι νέος (τις τελευταίες 24 ώρες)
  const isNewLead = (createdAt: string) => {
    const leadDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24; // Νέος αν είναι μικρότερο ή ίσο με 24 ώρες
  };

  // Συνάρτηση για να προσδιορίσω αν ένα ραντεβού είναι νέο (τις τελευταίες 24 ώρες)
  const isNewAppointment = (createdAt: string) => {
    const appointmentDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - appointmentDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24; // Νέο αν είναι μικρότερο ή ίσο με 24 ώρες
  };

  // Συνάρτηση για να προσδιορίσω αν πρέπει να εφαρμοστεί blur στα στοιχεία του ενδιαφερομένου
  const shouldBlurLeadInfo = (stage: string) => {
    const stageOrder = getStageOrder(stage);
    // Blur αν το στάδιο είναι μικρότερο από "έγινε προκαταβολή" (stageOrder < 3)
    // Δηλαδή blur για: Αναμονή για ραντεβού, Έγινε ραντεβού
    // Κανονική εμφάνιση για: Έγινε προκαταβολή, Τελική υπογραφή, Ολοκληρώθηκε
    return stageOrder < 3;
  };

  // Συνάρτηση για αλλαγή tab
  const handleTabChange = (tab: 'listings' | 'leads' | 'analytics' | 'appointments' | 'support') => {
    setActiveTab(tab);
    // Αφαιρούμε το highlight όταν ο χρήστης πατάει το tab ραντεβού
    if (tab === 'appointments') {
      setHasNewAppointmentNotification(false);
      setHasSeenAppointmentNotification(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenAppointmentNotification', 'true');
      }
    }
    // Αφαιρούμε το highlight όταν ο χρήστης πατάει το tab ενδιαφερόμενων
    if (tab === 'leads') {
      setHasNewInterestNotification(false);
      setHasSeenInterestNotification(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenInterestNotification', 'true');
      }
    }
  };

  // Συνάρτηση για αφαίρεση ακινητού από την πλατφόρμα
  const handleRemoveProperty = (property: PropertyWithLeads) => {
    setSelectedPropertyForRemoval(property);
    setIsRemovePropertyModalOpen(true);
  };

  // Συνάρτηση για επιβεβαίωση αφαίρεσης ακινητού
  const handleConfirmRemoveProperty = async () => {
    if (!selectedPropertyForRemoval) return;

    setIsRemovingProperty(true);
    try {
      await apiClient.post(`/properties/${selectedPropertyForRemoval.id}/request-removal`);
      toast.success('Η αίτηση αφαίρεσης ακινητού στάλθηκε επιτυχώς!');
      
      // Ενημερώνουμε το local state
      setProperties(prevProperties => 
        prevProperties.map(prop => 
          prop.id === selectedPropertyForRemoval.id 
            ? { ...prop, removalRequested: true }
            : prop
        )
      );
      
      setIsRemovePropertyModalOpen(false);
      setSelectedPropertyForRemoval(null);
    } catch (error) {
      console.error('Σφάλμα κατά την αφαίρεση ακινητού:', error);
      toast.error('Σφάλμα κατά την αποστολή της αίτησης');
    } finally {
      setIsRemovingProperty(false);
    }
  };

  const handleStripeCheckout = async (planId: string) => {
    try {
      const { data } = await apiClient.post('/stripe/create-checkout-session', {
        planId,
        billingCycle,
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Σφάλμα κατά τη δημιουργία της πληρωμής');
      }
    } catch (error) {
      toast.error('Σφάλμα κατά τη σύνδεση με το σύστημα πληρωμών');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Σφάλμα</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            {/* Logo - Left */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mr-2 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <FaHome className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
              </Link>
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="px-3 py-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full hover:from-green-700 hover:to-emerald-800 transition-all duration-300 flex items-center space-x-1 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span>Seller Mode</span>
                  <FaCaretDown className="w-3 h-3" />
                </button>
                {isRoleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 border border-white/20 z-50">
                    <div 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 cursor-pointer rounded-lg mx-2"
                      onClick={() => handleRoleChange('BUYER')}
                    >
                      <FaExchangeAlt className="mr-2 text-green-500" />
                      <span className="text-green-600 font-medium">Buyer Mode</span>
                    </div>
                    <div 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer rounded-lg mx-2"
                      onClick={() => handleRoleChange('AGENT')}
                    >
                      <FaExchangeAlt className="mr-2 text-blue-500" />
                      <span className="text-blue-600 font-medium">Agent Mode</span>
                    </div>
                    <div className="border-t border-gray-100 my-1 mx-2"></div>
                    <Link
                      href="/"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 rounded-lg mx-2"
                    >
                      <FaExchangeAlt className="mr-2 text-gray-500" />
                      Επιλογή Ρόλου
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation - Center */}
            <div className="flex-1 flex justify-center">
              <nav className="flex items-center space-x-10">
                <Link href="/seller/properties" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Ακίνητα
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Σχετικά
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Επικοινωνία
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </nav>
            </div>

            {/* Icons - Right */}
            <div className="flex items-center space-x-3">
              <Link
                href="/seller"
                className="p-2 text-gray-600 hover:text-green-600 transition-all duration-300 rounded-lg hover:bg-green-50"
              >
                <FaHome className="w-5 h-5" />
              </Link>
              <SellerNotificationBell />
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-all duration-300 p-1.5 rounded-lg hover:bg-green-50"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-white" />
                  </div>
                  <FaCaretDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 border border-white/20 z-50"
                    >
                      <Link
                        href="/dashboard/seller/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaCog className="mr-3 text-green-500" />
                        Ρυθμίσεις
                      </Link>
                      <Link
                        href="/dashboard/seller/messages"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaComments className="mr-3 text-green-500" />
                        Μηνύματα
                      </Link>
                      <Link
                        href="/seller/how-it-works#faq"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaQuestionCircle className="mr-3 text-green-500" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <div className="border-t border-gray-100 my-1 mx-2"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaExchangeAlt className="mr-3 text-gray-500" />
                        Αλλαγή Ρόλων
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaSignOutAlt className="mr-3" />
                        Αποσύνδεση
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Καλώς ήρθατε, {session?.user?.name}</h1>
              <p className="mt-2 text-gray-600">Διαχειριστείτε τα ακίνητά σας και παρακολουθήστε τις δραστηριότητες των ενδιαφερομένων.</p>
            </div>
            
            {/* Subscription Info */}
            {subscriptionInfo && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`rounded-xl shadow-lg border p-4 min-w-[280px] cursor-pointer transition-all duration-200 hover:shadow-xl ${
                  subscriptionInfo.userType === 'INDIVIDUAL' || !subscriptionInfo.planName
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 hover:from-yellow-100 hover:to-amber-100'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => {
                  // If user has an active subscription plan, show details
                  if (subscriptionInfo.planName && subscriptionInfo.status === 'active') {
                    setIsSubscriptionDetailsModalOpen(true);
                  } 
                  // If user is individual or has no plan, show subscription selection
                  else if (subscriptionInfo.userType === 'INDIVIDUAL' || !subscriptionInfo.planName) {
                    setIsSubscriptionModalOpen(true);
                  }
                  // For any other case (trial, etc.), show details
                  else {
                    setIsSubscriptionDetailsModalOpen(true);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Συνδρομή</h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    subscriptionInfo.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : subscriptionInfo.status === 'trial'
                      ? 'bg-blue-100 text-blue-800'
                      : subscriptionInfo.userType === 'COMPANY'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {subscriptionInfo.status === 'active' ? 'Ενεργή' : 
                     subscriptionInfo.status === 'trial' ? 'Δοκιμαστική' : 
                     subscriptionInfo.userType === 'COMPANY' ? 'Απαιτείται' : 'Δωρεάν'}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">
                    {subscriptionInfo.planName || (subscriptionInfo.userType === 'COMPANY' ? 'Χωρίς Συνδρομή' : 'Δωρεάν')}
                  </p>
                  {subscriptionInfo.planName && (
                    <p className="text-sm text-gray-600">
                      €{subscriptionInfo.price}/{subscriptionInfo.billingCycle === 'MONTHLY' ? 'μήνα' : 'τρίμηνο'}
                    </p>
                  )}
                  {subscriptionInfo.expiresAt && (
                    <p className="text-xs text-gray-500">
                      Λήγει: {new Date(subscriptionInfo.expiresAt).toLocaleDateString('el-GR')}
                    </p>
                  )}
                  {subscriptionInfo.userType === 'COMPANY' && !subscriptionInfo.planName && (
                    <p className="text-xs text-red-600">
                      Χρειάζεται συνδρομή για καταχώρηση ακινήτων
                    </p>
                  )}
                </div>
                
                {subscriptionInfo.userType === 'COMPANY' && subscriptionInfo.status !== 'active' && (
                  <Link
                    href="/seller/auth/register"
                    className="mt-3 w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-center block"
                  >
                    Επιλέξτε Πλάνο
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Subscription Warning for Companies */}
        {subscriptionInfo && subscriptionInfo.userType === 'COMPANY' && !subscriptionInfo.planName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <FaInfoCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">
                    Ενεργή Συνδρομή Απαιτείται
                  </h3>
                  <p className="text-amber-800 mb-4">
                    Για να καταχωρήσετε ακίνητα στην πλατφόρμα, χρειάζεται να έχετε ενεργή συνδρομή. 
                    Επιλέξτε ένα από τα διαθέσιμα πλάνα για να ξεκινήσετε να πουλάτε τα ακίνητά σας.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/seller/auth/register"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <FaCrown className="mr-2" />
                      Επιλέξτε Συνδρομητικό Πλάνο
                    </Link>
                    <Link
                      href="/seller/how-it-works#subscription"
                      className="inline-flex items-center px-6 py-3 border border-amber-300 text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-200"
                    >
                      <FaQuestionCircle className="mr-2" />
                      Μάθετε Περισσότερα
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Συνολικά Ακίνητα</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{properties.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FaBuilding className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ενεργοί Ενδιαφερόμενοι</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {properties.reduce((sum, prop) => sum + prop.leads.length, 0)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FaUsers className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Συνολικές Προβολές</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {properties.reduce((sum, prop) => sum + (prop.stats?.views || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FaEye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 mb-8"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('listings')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'listings'
                    ? 'bg-white text-green-600 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ακίνητα
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('leads')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 relative ${
                  activeTab === 'leads'
                    ? 'bg-white text-green-600 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                } ${
                  hasNewInterestNotification && activeTab !== 'leads'
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 border-yellow-300'
                    : ''
                }`}
              >
                Ενδιαφερόμενοι
                {hasNewInterestNotification && activeTab !== 'leads' && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"
                  />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('appointments')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 relative ${
                  activeTab === 'appointments'
                    ? 'bg-white text-green-600 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                } ${
                  hasNewAppointmentNotification && activeTab !== 'appointments'
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 border-yellow-300'
                    : ''
                }`}
              >
                Ραντεβού
                {hasNewAppointmentNotification && activeTab !== 'appointments' && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"
                  />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabChange('support')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'support'
                    ? 'bg-white text-green-600 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Υποστήριξη
              </motion.button>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 bg-white/80 backdrop-blur-sm"
              >
                <option value="date">Ημερομηνία</option>
                <option value="status">Κατάσταση</option>
              </select>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/add-listing"
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <FaPlus className="mr-2" />
                  Νέο Ακίνητο
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'listings' && (
              <motion.div
                key="listings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl border-2 border-dashed border-gray-300"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <FaBuilding className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Δεν βρέθηκαν ακίνητα</h3>
                      <p className="text-gray-500 text-center mb-6">Προσθέστε το πρώτο σας ακίνητο για να ξεκινήσετε</p>
                      
                      {/* Subscription Info for Companies */}
                      {subscriptionInfo && subscriptionInfo.userType === 'COMPANY' && subscriptionInfo.planName && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md">
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <FaBuilding className="w-4 h-4 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-blue-900">{subscriptionInfo.planName} Πλάνο</h4>
                          </div>
                          <p className="text-blue-700 text-center">
                            Απομένουν <span className="font-bold text-blue-900">
                              {subscriptionInfo.plan?.maxProperties ? 
                                Math.max(0, subscriptionInfo.plan.maxProperties - properties.length) : 
                                'Απεριόριστες'
                              }
                            </span> καταχωρήσεις ακινήτων
                          </p>
                          {subscriptionInfo.plan?.maxProperties && (
                            <div className="mt-3">
                              <div className="flex justify-between text-sm text-blue-600 mb-1">
                                <span>Χρήση</span>
                                <span>{properties.length} / {subscriptionInfo.plan.maxProperties}</span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min((properties.length / subscriptionInfo.plan.maxProperties) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          href="/add-listing"
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                          <FaPlus className="mr-2" />
                          Προσθήκη Ακινήτου
                        </Link>
                      </motion.div>
                    </motion.div>
                  ) : (
                    filteredProperties.map((property, index) => (
                      <motion.div
                        key={property.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300"
                      >
                        {property.images && property.images[0] && (
                          <div className="relative h-48">
                            <Image
                              src={property.images[0]}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{property.title}</h3>
                          <p className="text-gray-600 mb-4 flex items-center">
                            <FaMapMarkerAlt className="w-4 h-4 mr-2 text-green-500" />
                            {property.location}
                          </p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                              {property.price.toLocaleString('el-GR')} €
                            </span>
                            <div className="flex items-center space-x-2">
                              {property.removalRequested && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300">
                                  Αφαίρεση Ζητήθηκε
                                </span>
                              )}
                              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                property.status === 'available' 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                  : property.status === 'unavailable'
                                  ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                                  : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800'
                              }`}>
                                {property.status === 'available' 
                                  ? 'Διαθέσιμο' 
                                  : property.status === 'unavailable'
                                  ? 'Αφαιρέθηκε'
                                  : 'Μη Διαθέσιμο'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                            <div className="flex items-center">
                              <FaEye className="mr-2 text-green-500" />
                              {property.stats?.views || 0} προβολές
                            </div>
                            <div className="flex items-center">
                              <FaUsers className="mr-2 text-green-500" />
                              {property.leads.length} ενδιαφερόμενοι
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mb-3">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleProgressClick(property)}
                              className={`flex-1 px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                propertiesWithProgressNotification.has(property.id) || propertiesWithProgressNotification.has(property._id)
                                  ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 hover:from-yellow-200 hover:to-amber-200'
                                  : (propertiesWithUnclickedProgressButtons.has(property.id) || propertiesWithUnclickedProgressButtons.has(property._id))
                                    ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 hover:from-yellow-200 hover:to-amber-200'
                                    : 'border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50'
                              }`}
                            >
                              Πρόοδος
                              {(propertiesWithProgressNotification.has(property.id) || propertiesWithProgressNotification.has(property._id)) && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-2 inline-block w-2 h-2 bg-yellow-500 rounded-full"
                                />
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleVisitSchedulingClick(property)}
                              className={`flex-1 px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                (propertiesWithUnclickedAppointmentButtons.has(property.id) || propertiesWithUnclickedAppointmentButtons.has(property._id))
                                  ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 hover:from-yellow-200 hover:to-amber-200'
                                  : 'border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50'
                              }`}
                            >
                              <FaCalendarAlt className="inline-block mr-2" />
                              Ραντεβού
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedPropertyForDetails(property);
                                setIsPropertyDetailsModalOpen(true);
                              }}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 border border-transparent rounded-xl text-sm font-medium text-white hover:from-green-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                            >
                              <FaEye className="inline-block mr-2" />
                              Προβολή
                            </motion.button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <motion.button
                              whileHover={{ scale: (property.removalRequested || property.status === 'unavailable') ? 1 : 1.05 }}
                              whileTap={{ scale: (property.removalRequested || property.status === 'unavailable') ? 1 : 0.95 }}
                              onClick={() => !property.removalRequested && property.status !== 'unavailable' && handleRemoveProperty(property)}
                              disabled={property.removalRequested || property.status === 'unavailable'}
                              className={`w-full px-4 py-3 border border-transparent rounded-xl text-sm font-medium transition-all duration-200 ${
                                property.status === 'unavailable'
                                  ? 'bg-red-300 text-red-600 cursor-not-allowed'
                                  : property.removalRequested
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                              }`}
                            >
                              <FaTrash className="inline-block mr-2" />
                              {property.status === 'unavailable' 
                                ? 'Αφαιρέθηκε από την πλατφόρμα' 
                                : property.removalRequested 
                                ? 'Αφαίρεση Ζητήθηκε' 
                                : 'Αφαίρεση από Πλατφόρμα'}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div className="font-bold text-xl">
                      Ενδιαφερόμενοι 
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({getSortedLeads().length} συνολικά)
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Κάντε κλικ στις επικεφαλίδες για να ταξινομήσετε
                    </div>
                  </div>
                  
                  {/* Επεξήγηση για το blur effect */}
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">
                          🔒 Προστασία Πλατφόρμας
                        </h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          Τα ονόματα και emails των ενδιαφερομένων εμφανίζονται ως <span className="font-medium">••••••••</span> 
                          μέχρι να προχωρήσει η συναλλαγή στο στάδιο <span className="font-semibold">"Έγινε Προκαταβολή"</span>. 
                          Αυτό προστατεύει την πλατφόρμα από την περίπτωση να επικοινωνήσετε απευθείας με τον αγοραστή 
                          και να παρακάμψετε την πλατφόρμα πριν την προκαταβολή.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Φίλτρα για τους ενδιαφερομένους */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                            showFilters 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                          </svg>
                          <span>Φίλτρα</span>
                          {(selectedStageFilter !== 'all' || selectedPropertyFilter !== 'all') && (
                            <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                              {[selectedStageFilter, selectedPropertyFilter].filter(f => f !== 'all').length}
                            </span>
                          )}
                        </button>
                        
                        {(selectedStageFilter !== 'all' || selectedPropertyFilter !== 'all') && (
                          <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            Καθαρισμός
                          </button>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Εμφανίζονται {getFilteredAndSortedLeads().length} από {properties.flatMap(prop => prop.leads).length} ενδιαφερόμενοι
                      </div>
                    </div>
                    
                    {/* Dropdown φίλτρων */}
                    {showFilters && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Φίλτρο σταδίου */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Στάδιο Συναλλαγής
                          </label>
                          <select
                            value={selectedStageFilter}
                            onChange={(e) => handleStageFilterChange(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">Όλα τα στάδια</option>
                            <option value="pending">Αναμονή για ραντεβού</option>
                            <option value="meeting_scheduled">Έγινε ραντεβού</option>
                            <option value="deposit_paid">Έγινε προκαταβολή</option>
                            <option value="final_signing">Τελική υπογραφή</option>
                            <option value="completed">Ολοκληρώθηκε</option>
                            <option value="cancelled">Ακυρώθηκε</option>
                          </select>
                        </div>
                        
                        {/* Φίλτρο ακινήτου */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ακίνητο
                          </label>
                          <select
                            value={selectedPropertyFilter}
                            onChange={(e) => handlePropertyFilterChange(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">Όλα τα ακίνητα</option>
                            {properties.map(property => (
                              <option key={property.id} value={property.id}>
                                {property.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  {properties.some(property => property.leads.length > 0) ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-green-50">
                          <tr>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleLeadsSort('property')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ακίνητο</span>
                                {leadsSortField === 'property' && (
                                  <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleLeadsSort('buyer')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ενδιαφερόμενος</span>
                                {leadsSortField === 'buyer' && (
                                  <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleLeadsSort('stage')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Στάδιο Συναλλαγής</span>
                                {leadsSortField === 'stage' && (
                                  <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleLeadsSort('date')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ημερομηνία</span>
                                {leadsSortField === 'date' && (
                                  <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Ενέργειες
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSortedLeads().map((lead, index) => (
                            <tr
                              key={lead.id}
                              className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${
                                isNewLead(lead.createdAt) ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500' : ''
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{lead.property.title}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <FaMapMarkerAlt className="w-3 h-3 mr-1 text-green-500" />
                                  {lead.property.location}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const stage = lead.transaction?.progress?.stage || lead.status || 'pending';
                                  const shouldBlur = shouldBlurLeadInfo(stage);
                                  
                                  return (
                                    <>
                                      <div className={`text-sm font-bold text-gray-900 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                                        {shouldBlur ? '••••••••' : lead.buyer.name}
                                      </div>
                                      <div className={`text-sm text-gray-500 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                                        {shouldBlur ? '••••••••••••••••••••••••••••••••' : lead.buyer.email}
                                      </div>
                                      {shouldBlur && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                            🔒 Κρυφά
                                          </span>
                                        </div>
                                      )}
                                      {isNewLead(lead.createdAt) && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-200 to-amber-200 text-yellow-900">
                                            ΝΕΟΣ
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  // Προτεραιότητα: transaction.progress.stage > lead.status
                                  const stage = lead.transaction?.progress?.stage || lead.status || 'pending';
                                  const stageOrder = getStageOrder(stage);
                                  
                                  // Καλύτερα labels στα ελληνικά με σωστά χρώματα
                                  const getStageDisplay = (stage: string) => {
                                    switch (stage?.toUpperCase()) {
                                      case 'PENDING':
                                      case 'pending':
                                        return {
                                          label: 'Αναμονή για ραντεβού',
                                          color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800'
                                        };
                                      case 'MEETING_SCHEDULED':
                                      case 'viewing_scheduled':
                                        return {
                                          label: 'Έγινε ραντεβού',
                                          color: 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800'
                                        };
                                      case 'DEPOSIT_PAID':
                                        return {
                                          label: 'Έγινε προκαταβολή',
                                          color: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800'
                                        };
                                      case 'FINAL_SIGNING':
                                      case 'offer_made':
                                        return {
                                          label: 'Τελική υπογραφή',
                                          color: 'bg-gradient-to-r from-yellow-100 to-lime-100 text-yellow-800'
                                        };
                                      case 'COMPLETED':
                                      case 'completed':
                                      case 'accepted':
                                        return {
                                          label: 'Ολοκληρώθηκε',
                                          color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                        };
                                      case 'CANCELLED':
                                      case 'rejected':
                                        return {
                                          label: 'Ακυρώθηκε',
                                          color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800'
                                        };
                                      default:
                                        return {
                                          label: stage || 'Άγνωστο',
                                          color: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700'
                                        };
                                    }
                                  };
                                  
                                  const stageDisplay = getStageDisplay(stage);
                                  
                                  return (
                                    <div className="flex items-center">
                                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${stageDisplay.color}`}>
                                        {stageDisplay.label}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(lead.createdAt).toLocaleDateString('el-GR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleLeadClick(lead, lead.property.title)}
                                  className="text-green-600 hover:text-green-800 font-bold transition-colors duration-200"
                                >
                                  Προβολή
                                </motion.button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaUsers className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν υπάρχουν ενδιαφερόμενοι</h3>
                      <p className="text-gray-500">Όταν κάποιος ενδιαφερθεί για τα ακίνητά σας, θα εμφανιστούν εδώ.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'appointments' && (
              <motion.div
                key="appointments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div className="font-bold text-xl">
                      Ραντεβού Προβολής
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({appointments.length} συνολικά)
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Κάντε κλικ στις επικεφαλίδες για να ταξινομήσετε
                    </div>
                  </div>
                  
                  {/* Επεξήγηση για το blur effect στα ραντεβού */}
                  <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800 mb-1">
                          🔒 Προστασία Πλατφόρμας - Ραντεβού
                        </h4>
                        <p className="text-sm text-green-700 leading-relaxed">
                          Τα ονόματα και emails των ενδιαφερομένων στα ραντεβού εμφανίζονται ως <span className="font-medium">••••••••</span> 
                          μέχρι να προχωρήσει η συναλλαγή στο στάδιο <span className="font-semibold">"Έγινε Προκαταβολή"</span>. 
                          Αυτό προστατεύει την πλατφόρμα από την περίπτωση να επικοινωνήσετε απευθείας με τον αγοραστή 
                          και να παρακάμψετε την πλατφόρμα πριν την προκαταβολή.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Φίλτρα για τα ραντεβού */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowAppointmentFilters(!showAppointmentFilters)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                            showAppointmentFilters 
                              ? 'bg-green-600 text-white shadow-lg' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                          </svg>
                          <span>Φίλτρα</span>
                          {selectedAppointmentPropertyFilter !== 'all' && (
                            <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                              1
                            </span>
                          )}
                        </button>
                        
                        {selectedAppointmentPropertyFilter !== 'all' && (
                          <button
                            onClick={clearAppointmentFilters}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            Καθαρισμός
                          </button>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Εμφανίζονται {getFilteredAppointments().length} από {appointments.length} ραντεβού
                      </div>
                    </div>
                    
                    {/* Dropdown φίλτρων ραντεβού */}
                    {showAppointmentFilters && (
                      <div className="mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ακίνητο
                          </label>
                          <select
                            value={selectedAppointmentPropertyFilter}
                            onChange={(e) => handleAppointmentPropertyFilterChange(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="all">Όλα τα ακίνητα</option>
                            {properties.map(property => (
                              <option key={property.id} value={property.id}>
                                {property.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Κουμπί για το ημερολόγιο */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowCalendar(!showCalendar)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                            showCalendar 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{showCalendar ? 'Κλείσιμο Ημερολογίου' : 'Άνοιγμα Ημερολογίου'}</span>
                        </button>
                        
                        {showCalendar && (
                          <button
                            onClick={() => setShowCalendar(false)}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            Κλείσιμο
                          </button>
                        )}
                      </div>
                      
                      {showCalendar && (
                        <div className="text-sm text-gray-500">
                          Ημερολόγιο ανοιχτό
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Ημερολόγιο με ραντεβού - Conditional Rendering */}
                  {showCalendar && (
                    <div className="px-6 py-4 border-b border-gray-100">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">Ημερολόγιο Ραντεβού</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="text-lg font-medium text-gray-800 min-w-[200px] text-center">
                            {formatDate(selectedDate)}
                          </span>
                          <button
                            onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Ημερολόγιο */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Ημέρες της εβδομάδας */}
                        <div className="grid grid-cols-7 gap-px bg-gray-200">
                          {['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'].map(day => (
                            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                              {day}
                            </div>
                          ))}
                        </div>
                        
                        {/* Ημέρες του μήνα */}
                        <div className="grid grid-cols-7 gap-px bg-gray-200">
                          {getDaysInMonth(selectedDate).map((dayInfo, index) => {
                            const appointmentsForDay = getAppointmentsForDate(dayInfo.date);
                            const isToday = dayInfo.date.toDateString() === new Date().toDateString();
                            const isSelected = dayInfo.date.toDateString() === selectedDate.toDateString();
                            
                            return (
                              <div
                                key={index}
                                className={`min-h-[80px] p-2 text-sm ${
                                  dayInfo.isCurrentMonth 
                                    ? 'bg-white' 
                                    : 'bg-gray-50 text-gray-400'
                                } ${
                                  isToday 
                                    ? 'ring-2 ring-blue-500' 
                                    : ''
                                } ${
                                  isSelected 
                                    ? 'bg-blue-50' 
                                    : ''
                                }`}
                              >
                                <div className="text-right mb-1">
                                  <span className={`${
                                    isToday 
                                      ? 'bg-blue-500 text-white px-2 py-1 rounded-full text-xs' 
                                      : ''
                                  }`}>
                                    {dayInfo.date.getDate()}
                                  </span>
                                </div>
                                
                                {/* Ραντεβού για τη συγκεκριμένη ημέρα */}
                                {appointmentsForDay.map((appointment, appIndex) => {
                                  const { label, color } = getStatusLabel(appointment.status);
                                  return (
                                    <div
                                      key={appIndex}
                                      className={`mb-1 p-1 rounded text-xs border ${color}`}
                                      title={`${appointment.propertyTitle} - ${appointment.buyer.name} (${label})`}
                                    >
                                      <div className="font-medium truncate">
                                        {appointment.propertyTitle}
                                      </div>
                                      <div className="text-xs opacity-75">
                                        {new Date(appointment.date).toLocaleTimeString('el-GR', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                </div>
              )}
                  {appointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-green-50">
                          <tr>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleAppointmentsSort('property')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ακίνητο</span>
                                {appointmentsSortField === 'property' && (
                                  <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleAppointmentsSort('buyer')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ενδιαφερόμενος</span>
                                {appointmentsSortField === 'buyer' && (
                                  <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleAppointmentsSort('date')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Ημερομηνία & Ώρα</span>
                                {appointmentsSortField === 'date' && (
                                  <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                              onClick={() => handleAppointmentsSort('status')}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Κατάσταση</span>
                                {appointmentsSortField === 'status' && (
                                  <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Ενέργειες
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSortedAppointments().map((appointment, index) => (
                            <tr
                              key={appointment.id}
                              className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${
                                isNewAppointment(appointment.createdAt) ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500' : ''
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{appointment.propertyTitle}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  // Βρίσκουμε το αντίστοιχο lead για να προσδιορίσουμε το στάδιο
                                  const relatedLead = properties.flatMap(prop => prop.leads).find(lead => 
                                    lead.buyer?.id === appointment.buyerId || 
                                    lead.buyer?.email === appointment.buyer.email
                                  );
                                  const stage = relatedLead?.transaction?.progress?.stage || relatedLead?.stage || 'pending';
                                  const shouldBlur = shouldBlurLeadInfo(stage);
                                  
                                  return (
                                    <>
                                      <div className={`text-sm font-bold text-gray-900 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                                        {shouldBlur ? '••••••••' : appointment.buyer.name}
                                      </div>
                                      <div className={`text-sm text-gray-500 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                                        {shouldBlur ? '••••••••••••••••••••••••••••••••' : appointment.buyer.email}
                                      </div>
                                      {shouldBlur && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                                            🔒 Κρυφά
                                          </span>
                                        </div>
                                      )}
                                      {isNewAppointment(appointment.createdAt) && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-200 to-amber-200 text-yellow-900">
                                            ΝΕΟ
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">
                                  {new Date(appointment.date).toLocaleDateString('el-GR')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {appointment.time}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const { label, color } = getStatusLabel(appointment.status);
                                  return (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                                {appointment.status === 'pending' && (
                                  <div className="flex space-x-2 mt-2">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleAppointmentAction(appointment.id, 'approve')}
                                      className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded transition-colors duration-200"
                                    >
                                      Έγκριση
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                                      className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors duration-200"
                                    >
                                      Απόρριψη
                                    </motion.button>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleViewAppointment(appointment)}
                                  className="text-green-600 hover:text-green-800 font-bold transition-colors duration-200"
                                >
                                  Προβολή
                                </motion.button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaCalendarAlt className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν υπάρχουν ραντεβού</h3>
                      <p className="text-gray-500">Όταν προγραμματιστούν ραντεβού για τα ακίνητά σας, θα εμφανιστούν εδώ.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <SupportCenter 
                  userProperties={properties.map(p => ({
                    id: p.id,
                    title: p.title,
                    address: `${p.city}, ${p.street} ${p.number}`
                  }))}
                  userTransactions={properties
                    .filter(p => p.transaction)
                    .map(p => ({
                      id: p.transaction!.id,
                      status: p.transaction!.progress.stage,
                      property: {
                        id: p.id,
                        title: p.title
                      }
                    }))}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Modals */}
        <AnimatePresence>
          {selectedPropertyForDetails && (
            <PropertyDetailsModal
              isOpen={isPropertyDetailsModalOpen}
              onClose={() => {
                setIsPropertyDetailsModalOpen(false);
                setSelectedPropertyForDetails(null);
              }}
              property={{
                id: selectedPropertyForDetails.id,
                title: selectedPropertyForDetails.title,
                fullDescription: selectedPropertyForDetails.fullDescription,
                propertyType: selectedPropertyForDetails.propertyType,
                status: selectedPropertyForDetails.status,
                location: selectedPropertyForDetails.location,
                price: selectedPropertyForDetails.price,
                bedrooms: selectedPropertyForDetails.bedrooms,
                bathrooms: selectedPropertyForDetails.bathrooms,
                area: selectedPropertyForDetails.area,
                features: selectedPropertyForDetails.features,
                images: selectedPropertyForDetails.images,
                state: selectedPropertyForDetails.state,
                city: selectedPropertyForDetails.city,
                street: selectedPropertyForDetails.street,
                number: selectedPropertyForDetails.number,
                postalCode: selectedPropertyForDetails.postalCode,
                createdAt: new Date(selectedPropertyForDetails.createdAt),
                updatedAt: new Date(selectedPropertyForDetails.updatedAt),
                userId: selectedPropertyForDetails.userId,
                user: selectedPropertyForDetails.user,
                stats: {
                  views: selectedPropertyForDetails.stats.views,
                  interestedCount: selectedPropertyForDetails.stats.interestedCount,
                  viewingCount: selectedPropertyForDetails.stats.viewingCount,
                  lastViewed: selectedPropertyForDetails.stats.lastViewed 
                    ? new Date(selectedPropertyForDetails.stats.lastViewed)
                    : undefined
                }
              }}
            />
          )}

          {selectedLead && selectedProperty && (
            <LeadDetailsModal
              lead={{
                id: selectedLead.transaction?.id || selectedLead.id,
                status: selectedLead.transaction?.progress?.stage || selectedLead.status,
                createdAt: selectedLead.transaction?.createdAt || selectedLead.createdAt,
                updatedAt: selectedLead.transaction?.progress?.updatedAt || selectedLead.updatedAt,
                notes: selectedLead.notes,
                buyer: selectedLead.buyer,
                agent: selectedLead.agent
              }}
              propertyTitle={selectedProperty.title}
              property={{
                id: selectedProperty.id,
                title: selectedProperty.title,
                location: selectedProperty.location,
                price: selectedProperty.price,
                bedrooms: selectedProperty.bedrooms,
                bathrooms: selectedProperty.bathrooms,
                area: selectedProperty.area,
                features: selectedProperty.features,
                images: selectedProperty.images
              }}
              updates={selectedLead.transaction?.progress?.notifications?.map((n) => ({
                id: typeof n.id === 'string' ? parseInt(n.id) : Number(n.id),
                text: n.message,
                date: new Date(n.createdAt).toLocaleDateString('el-GR'),
                category: n.category,
                isUnread: n.isUnread,
                stage: n.stage
              })) || []}
              currentStage={(() => {
                const stage = selectedLead.transaction?.progress?.stage || selectedLead.status || 'pending';
                console.log('Seller Dashboard - Lead stage calculation:', {
                  leadId: selectedLead.id,
                  transactionId: selectedLead.transaction?.id,
                  transactionStatus: selectedLead.transaction?.status || 'N/A',
                  transactionStage: selectedLead.transaction?.stage || 'N/A',
                  progressStage: selectedLead.transaction?.progress?.stage || 'N/A',
                  leadStatus: selectedLead.status,
                  calculatedStage: stage
                });
                
                // Αν το transaction είναι ενεργό (INTERESTED), εμφανίζουμε PENDING ανεξάρτητα από το stage
                if (selectedLead.transaction?.status === 'INTERESTED') {
                  console.log('Forcing PENDING stage for INTERESTED transaction');
                  return 'PENDING';
                }
                // Αν το transaction είναι ενεργό αλλά το στάδιο είναι CANCELLED, εμφανίζουμε PENDING
                if (selectedLead.transaction?.status === 'INTERESTED' && stage === 'CANCELLED') {
                  return 'PENDING';
                }
                // Αν το transaction.stage είναι CANCELLED αλλά το status είναι INTERESTED, εμφανίζουμε PENDING
                if (selectedLead.transaction?.stage === 'CANCELLED' && selectedLead.transaction?.status === 'INTERESTED') {
                  return 'PENDING';
                }
                return stage;
              })()}
              onClose={() => {
                setSelectedLead(null);
              }}
              onUpdateStatus={handleUpdateLeadStatus}
              onAddNote={handleAddLeadNote}
            />
          )}

          {selectedPropertyForProgress && (
            <PropertyProgressModal
              isOpen={isProgressModalOpen}
              onClose={() => {
                setIsProgressModalOpen(false);
                setSelectedPropertyForProgress(null);
                
                // Αφαιρούμε το highlight από το κουμπί προόδου όταν κλείνει το modal
                if (selectedPropertyForProgress) {
                  setPropertiesWithProgressNotification(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedPropertyForProgress.id);
                    newSet.delete(selectedPropertyForProgress._id);
                    return newSet;
                  });
                }
              }}
              propertyId={selectedPropertyForProgress?.id || ''}
              propertyTitle={selectedPropertyForProgress?.title || ''}
              propertyType={selectedPropertyForProgress?.type || 'house'}
            />
          )}

          {selectedPropertyForScheduling && (
            <VisitSchedulingModal
              isOpen={isVisitSchedulingModalOpen}
              onClose={() => {
                setIsVisitSchedulingModalOpen(false);
                setSelectedPropertyForScheduling(null);
                setLocalModalSettings(undefined);
              }}
              propertyId={selectedPropertyForScheduling.id}
              onSave={async (settings) => {
                await handleSaveVisitSettings(settings);
                setIsVisitSchedulingModalOpen(false);
                setSelectedPropertyForScheduling(null);
                setLocalModalSettings(undefined);
              }}
              initialSettings={localModalSettings}
            />
          )}

          {selectedAppointment && (
            <AppointmentDetailsModal
              appointment={selectedAppointment}
              property={properties.find(p => p._id === selectedAppointment.propertyId) || {
                _id: selectedAppointment.propertyId,
                title: selectedAppointment.propertyTitle,
                price: 0,
                location: ''
              }}
              buyer={{
                _id: selectedAppointment.buyerId,
                name: selectedAppointment.buyer.name,
                email: selectedAppointment.buyer.email
              }}
              onClose={() => setSelectedAppointment(null)}
              onStatusChange={handleAppointmentStatusChange}
            />
          )}
        </AnimatePresence>
        <AddInterestedBuyerModal
          open={isAddBuyerModalOpen}
          onClose={() => setIsAddBuyerModalOpen(false)}
          onSuccess={(connectionId) => {
            setConnectionIdForOtp(connectionId);
            setIsAddBuyerModalOpen(false);
            setIsVerifyOtpModalOpen(true);
          }}
          agentId={session?.user?.id || ''}
          propertyId={selectedPropertyIdForBuyer || (properties.length === 1 ? properties[0].id : '')}
          properties={properties.map(p => ({ id: p.id, title: p.title }))}
        />
        <VerifyOtpModal
          open={isVerifyOtpModalOpen}
          onClose={() => setIsVerifyOtpModalOpen(false)}
          connectionId={connectionIdForOtp}
          onSuccess={() => {
            setIsVerifyOtpModalOpen(false);
            // Refresh leads/properties
            router.refresh();
            toast.success('Η σύνδεση επιβεβαιώθηκε επιτυχώς!');
          }}
        />
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-gradient-to-r from-green-900 to-emerald-900 text-white py-12 mt-16"
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-white/80">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <h3 className="text-xl font-bold mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/properties" className="text-white/80 hover:text-white transition-colors duration-200">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white/80 hover:text-white transition-colors duration-200">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white/80 hover:text-white transition-colors duration-200">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-white">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <h3 className="text-xl font-bold mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaFacebook className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaTwitter className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaInstagram className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaLinkedin className="w-6 h-6" />
                </motion.a>
              </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="border-t border-white/20 mt-8 pt-8 text-center text-white"
          >
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>

      {/* Remove Property Modal */}
      <RemovePropertyModal
        isOpen={isRemovePropertyModalOpen}
        onClose={() => {
          setIsRemovePropertyModalOpen(false);
          setSelectedPropertyForRemoval(null);
        }}
        onConfirm={handleConfirmRemoveProperty}
        propertyTitle={selectedPropertyForRemoval?.title || ''}
        isLoading={isRemovingProperty}
      />

      {/* Subscription Plans Modal */}
      <AnimatePresence>
        {isSubscriptionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsSubscriptionModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Επιλέξτε Συνδρομητικό Πλάνο</h2>
                    <p className="text-gray-600">Επιλέξτε το πλάνο που ταιριάζει καλύτερα στις ανάγκες σας</p>
                  </div>
                  <button
                    onClick={() => setIsSubscriptionModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                    <FaTimes className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center mb-8">
                  <div className="bg-gray-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('MONTHLY')}
                      className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        billingCycle === 'MONTHLY'
                          ? 'bg-white text-gray-900 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Μηνιαία
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('QUARTERLY')}
                      className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        billingCycle === 'QUARTERLY'
                          ? 'bg-white text-gray-900 shadow-md'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Τριμηνιαία
                      <span className="ml-2 bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                        -10%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {subscriptionPlans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`relative group cursor-pointer ${
                        selectedPlan === plan.id
                          ? 'transform scale-105'
                          : 'hover:scale-102'
                      } transition-all duration-300`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                        selectedPlan === plan.id
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl'
                          : plan.name === 'Pro'
                          ? 'border-emerald-300 bg-gradient-to-br from-white to-emerald-50/50 shadow-lg hover:shadow-xl'
                          : 'border-gray-200 bg-white shadow-lg hover:shadow-xl hover:border-gray-300'
                      }`}>
                        
                        {/* Popular Badge */}
                        {plan.name === 'Pro' && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                              ⭐ Δημοφιλές
                            </span>
                          </div>
                        )}
                        
                        {/* Plan Icon */}
                        <div className="text-center mb-6">
                          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                            plan.name === 'Basic' 
                              ? 'bg-blue-100 text-blue-600' 
                              : plan.name === 'Pro'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                            {plan.name === 'Basic' && <FaUser className="w-8 h-8" />}
                            {plan.name === 'Pro' && <FaCrown className="w-8 h-8" />}
                            {plan.name === 'Enterprise' && <FaBuilding className="w-8 h-8" />}
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                          {plan.description && (
                            <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div className="text-center mb-6">
                          <div className="flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-900">
                              €{billingCycle === 'QUARTERLY' ? plan.priceQuarterly : plan.price}
                            </span>
                            <div className="ml-2">
                              <div className="text-sm text-gray-500">
                                /{billingCycle === 'QUARTERLY' ? 'τρίμηνο' : 'μήνα'}
                              </div>
                              {billingCycle === 'QUARTERLY' && (
                                <div className="text-xs text-green-600 font-medium">
                                  Εξοικονόμηση 10%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Features */}
                        <div className="space-y-3 mb-8">
                          <div className="flex items-center text-sm text-gray-700">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <FaCheck className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="font-medium">{plan.maxProperties} ακίνητα</span>
                          </div>
                          {plan.benefits.map((benefit: string, benefitIndex: number) => (
                            <div key={benefitIndex} className="flex items-center text-sm text-gray-600">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <FaCheck className="w-3 h-3 text-green-600" />
                              </div>
                              {benefit}
                            </div>
                          ))}
                        </div>
                        
                        {/* Select Button */}
                        <button
                          type="button"
                          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                            selectedPlan === plan.id
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                              : plan.name === 'Pro'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          {selectedPlan === plan.id ? '✓ Επιλεγμένο' : 'Επιλογή'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Payment Section */}
                {selectedPlan && (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Έτοιμοι να ξεκινήσετε;
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <button
                        type="button"
                        onClick={() => handleStripeCheckout(selectedPlan)}
                        className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <FaCreditCard className="mr-3" />
                        Πληρωμή με Stripe
                      </button>
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-gray-600">
                          Ασφαλής πληρωμή με Stripe
                        </p>
                        <p className="text-xs text-gray-500">
                          Μπορείτε να ακυρώσετε οποιαδήποτε στιγμή
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription Details Modal */}
      <AnimatePresence>
        {isSubscriptionDetailsModalOpen && subscriptionInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsSubscriptionDetailsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Λεπτομέρειες Συνδρομής</h2>
                    <p className="text-gray-600">Πληροφορίες για το τρέχον πλάνο σας</p>
                  </div>
                  <button
                    onClick={() => setIsSubscriptionDetailsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                    <FaTimes className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Subscription Info */}
                <div className="space-y-6">
                  {/* Plan Details */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{subscriptionInfo.planName}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        subscriptionInfo.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {subscriptionInfo.status === 'active' ? 'Ενεργή' : 'Δοκιμαστική'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Τιμή</p>
                        <p className="text-2xl font-bold text-gray-900">
                          €{subscriptionInfo.price}/{subscriptionInfo.billingCycle === 'MONTHLY' ? 'μήνα' : 'τρίμηνο'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Λήγει</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {subscriptionInfo.expiresAt ? new Date(subscriptionInfo.expiresAt).toLocaleDateString('el-GR') : 'Δεν καθορίστηκε'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Benefits */}
                  {subscriptionInfo.plan && subscriptionInfo.plan.benefits && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Υπηρεσίες που περιλαμβάνονται</h4>
                      <div className="space-y-3">
                        {subscriptionInfo.plan.benefits.map((benefit: string, index: number) => (
                          <div key={index} className="flex items-center">
                            <FaCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Usage Stats */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Χρήση</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Ακίνητα που έχετε καταχωρήσει</p>
                        <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Μέγιστος αριθμός ακινήτων</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {subscriptionInfo.plan?.maxProperties || 'Απεριόριστα'}
                        </p>
                      </div>
                    </div>
                    
                    {subscriptionInfo.plan?.maxProperties && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Χρήση</span>
                          <span>{properties.length} / {subscriptionInfo.plan.maxProperties}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((properties.length / subscriptionInfo.plan.maxProperties) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        setIsSubscriptionDetailsModalOpen(false);
                        setIsSubscriptionModalOpen(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                    >
                      Αλλαγή Πλάνου
                    </button>
                    <button
                      onClick={() => setIsSubscriptionDetailsModalOpen(false)}
                      className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 