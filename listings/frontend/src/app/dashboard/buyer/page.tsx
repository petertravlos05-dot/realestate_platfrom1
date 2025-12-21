'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { FaHome, FaUser, FaSignOutAlt, FaBuilding, FaUserTie, FaPhone, FaEnvelope, FaCalendarAlt, FaChartBar, FaSearch, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaInfoCircle, FaQuestionCircle, FaCog, FaComments, FaExchangeAlt, FaChartLine, FaHeart, FaChevronDown, FaCalendar, FaTrash, FaExclamationCircle, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaStar, FaBell, FaUserCircle, FaEye, FaUsers, FaEllipsisV } from 'react-icons/fa';
import TransactionProgressModal from '@/components/TransactionProgressModal';
import ViewingScheduleModal from '@/components/ViewingScheduleModal';
import PropertyDetailsModal from '@/components/properties/PropertyDetailsModal';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Property } from '@/types/property';
import LeadDetailsModal from '@/components/leads/LeadDetailsModal';
import { toast } from 'react-hot-toast';
import AppointmentManagementModal from '@/components/AppointmentManagementModal';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import SupportCenter from '@/components/support/SupportCenter';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

interface Update {
  id: number;
  text: string;
  date: string;
  message: string;
  recipient: 'buyer' | 'seller' | 'agent';
  category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
  isUnread: boolean;
  stage: string;
  createdAt: string;
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
  appointment?: {
    id: string;
    date: Date;
    status: 'pending' | 'completed' | 'cancelled';
  };
}

interface PropertyWithTransaction extends Property {
  transaction?: Transaction;
}

interface TransactionUpdate {
  type: 'transaction_update';
  data: Transaction;
}

interface LeadProps {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  buyer: {
    name: string;
    email: string;
    phone: string | null;
  };
  agent: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  stage: string;
  updates: Update[];
}

const transactionStageLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Αναμονή για ραντεβού', color: 'bg-yellow-100 text-yellow-800' },
  MEETING_SCHEDULED: { label: 'Έγινε ραντεβού', color: 'bg-blue-100 text-blue-800' },
  DEPOSIT_PAID: { label: 'Έγινε προκαταβολή', color: 'bg-green-100 text-green-800' },
  FINAL_SIGNING: { label: 'Τελική υπογραφή', color: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Ολοκληρώθηκε', color: 'bg-purple-100 text-purple-800' },
  CANCELLED: { label: 'Ακυρώθηκε', color: 'bg-red-100 text-red-800' }
};

const getTransactionStage = (property: PropertyWithTransaction) => {
  const stage = property.transaction?.progress.stage || 'PENDING';
  // Αν το στάδιο είναι CANCELLED αλλά το transaction είναι ενεργό, εμφανίζουμε PENDING
  const effectiveStage = (stage === 'CANCELLED' && property.transaction?.status === 'INTERESTED') ? 'PENDING' : stage;
  return transactionStageLabels[effectiveStage] || transactionStageLabels.PENDING;
};

export default function BuyerDashboard() {
  const { data: session } = useSession();
  const [properties, setProperties] = useState<PropertyWithTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithTransaction | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'favorites' | 'messages' | 'support'>('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [leadDetailsModalOpen, setLeadDetailsModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean, property: any | null }>({ open: false, property: null });
  const [newProgressNotifications, setNewProgressNotifications] = useState<Set<string>>(new Set());
  const [newAppointmentNotifications, setNewAppointmentNotifications] = useState<Set<string>>(new Set());
  const { addNotification, notifications, markAsRead } = useNotifications();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<{ show: boolean; property: any | null }>({ show: false, property: null });

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = '/buyer';
  };

  const fetchData = async () => {
    try {
      console.log('=== Fetching Buyer Dashboard Data ===');
      
      const [connectionsRes, propertiesRes] = await Promise.all([
        fetchFromBackend('/buyer-agent/connections'),
        fetchFromBackend('/buyer/interested-properties')
      ]);

      console.log('API Responses:', {
        connectionsStatus: connectionsRes.status,
        connectionsOk: connectionsRes.ok,
        propertiesStatus: propertiesRes.status,
        propertiesOk: propertiesRes.ok
      });

      if (!connectionsRes.ok || !propertiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const connectionsData = await connectionsRes.json();
      const propertiesData = await propertiesRes.json();

      console.log('Raw API Data:', {
        connectionsCount: connectionsData.length,
        propertiesCount: propertiesData.properties?.length || 0
      });

      console.log('Fetched Data:', {
        connections: {
          count: connectionsData.length,
          hasTransactions: connectionsData.some((c: any) => c.transaction)
        },
        properties: {
          count: propertiesData.properties.length,
          hasTransactions: propertiesData.properties.some((p: any) => p.transaction)
        }
      });

      // Συνδυασμός properties από leads και connections
      const uniqueProperties = propertiesData.properties.reduce((acc: any[], property: any) => {
        const connection = connectionsData.find((c: any) => c.id === property.id);
        // Εμφανίζεται μόνο αν υπάρχει lead ή connection
        if (connection || property) {
          const existingProperty = acc.find((p: any) => p.id === property.id);
          if (!existingProperty) {
            return [...acc, {
              ...property,
              agent: connection?.agent || property.agent,
              transaction: property.transaction || connection?.transaction
            }];
          }
          // Αν υπάρχει ήδη το property, συνδυάζουμε τις πληροφορίες
          const updatedProperty = {
            ...existingProperty,
            agent: connection?.agent || existingProperty.agent || property.agent,
            transaction: property.transaction || existingProperty.transaction
          };
          return [...acc.filter((p: any) => p.id !== property.id), updatedProperty];
        }
        return acc;
      }, []);

      // Προσθέτουμε τα properties από τα connections που δεν υπάρχουν ήδη
      connectionsData.forEach((connection: any) => {
        const existingProperty = uniqueProperties.find((p: any) => p.id === connection.id);
        if (!existingProperty) {
          uniqueProperties.push(connection);
        }
      });
      
      console.log('Combined Properties:', {
        total: uniqueProperties.length,
        withTransactions: uniqueProperties.filter((p: any) => p.transaction).length,
        withAgents: uniqueProperties.filter((p: any) => p.agent).length,
        transactionIds: uniqueProperties
          .filter((p: any) => p.transaction)
          .map((p: any) => ({
            propertyId: p.id,
            transactionId: p.transaction?.id,
            hasAgent: !!p.agent
          }))
      });

      setProperties(uniqueProperties);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
      
      const newProgressFromStorage = JSON.parse(localStorage.getItem('newProgressNotifications') || '[]');
      setNewProgressNotifications(new Set(newProgressFromStorage));
      
      const newAppointmentsFromStorage = JSON.parse(localStorage.getItem('newAppointmentNotifications') || '[]');
      setNewAppointmentNotifications(new Set(newAppointmentsFromStorage));
    }
  }, [session]);

  // Ελέγχουμε τα URL parameters για tab και ticketId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const ticketIdParam = urlParams.get('ticketId');
      
      if (tabParam && ['properties', 'favorites', 'messages', 'support'].includes(tabParam)) {
        setActiveTab(tabParam as 'properties' | 'favorites' | 'messages' | 'support');
      }
      
      if (ticketIdParam) {
        setSelectedTicketId(ticketIdParam);
      }
    }
  }, []);

  // Add event listener for opening lead details modal
  useEffect(() => {
    // Αν είναι ανοιχτό το AppointmentManagementModal ή υπάρχει openAppointment στο URL, μην ανοίγεις το LeadDetailsModal
    if (isAppointmentModalOpen) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openAppointment')) return;
    }
    const handleOpenLeadDetailsModal = (event: CustomEvent) => {
      const { leadId, transactionId, stage } = event.detail;
      // Find the property with the matching transaction
      const property = properties.find(p => p.transaction?.id === transactionId);
      if (property) {
        setSelectedProperty(property);
        setLeadDetailsModalOpen(true);
      }
    };
    window.addEventListener('openLeadDetailsModal', handleOpenLeadDetailsModal as EventListener);
    return () => {
      window.removeEventListener('openLeadDetailsModal', handleOpenLeadDetailsModal as EventListener);
    };
  }, [properties, isAppointmentModalOpen]);

  // Setup SSE connection for real-time updates
  useEffect(() => {
    if (!session?.user) return;

    const eventSource = new EventSource('/api/admin/transactions/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as TransactionUpdate;
      
      if (data.type === 'transaction_update') {
        setProperties(prevProperties => 
          prevProperties.map(property => {
            if (property.transaction?.id === data.data.id) {
              const oldStage = property.transaction.progress.stage;
              const newStage = data.data.progress.stage;
              
              if (oldStage !== newStage) {
                const stageLabels = {
                  PENDING: 'Αναμονή για ραντεβού',
                  MEETING_SCHEDULED: 'Έγινε ραντεβού',
                  DEPOSIT_PAID: 'Έγινε προκαταβολή',
                  FINAL_SIGNING: 'Τελική υπογραφή',
                  COMPLETED: 'Ολοκληρώθηκε',
                  CANCELLED: 'Ακυρώθηκε'
                };

                addNotification({
                  type: newStage === 'CANCELLED' ? 'error' : 'success',
                  title: 'Ενημέρωση Συναλλαγής',
                  message: `Η συναλλαγή για το ακίνητο "${property.title}" προχώρησε στο στάδιο: ${stageLabels[newStage as keyof typeof stageLabels]}`,
                  metadata: {
                    leadId: property.transaction?.id,
                    transactionId: property.transaction?.id,
                    stage: newStage,
                    shouldOpenModal: true
                  }
                });

                const updatedTransaction = {
                  ...property.transaction,
                  ...data.data,
                  progress: {
                    ...data.data.progress,
                    notifications: [
                      ...(data.data.progress.notifications || []),
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        message: `Η συναλλαγή προχώρησε στο στάδιο: ${stageLabels[newStage as keyof typeof stageLabels]}`,
                        recipient: 'buyer' as const,
                        stage: newStage,
                        category: 'general' as const,
                        createdAt: new Date().toISOString(),
                        isUnread: true
                      }
                    ]
                  }
                };

                return {
                  ...property,
                  transaction: updatedTransaction
                };
              }

              return {
                ...property,
                transaction: {
                  ...property.transaction,
                  ...data.data
                }
              };
            }
            return property;
          })
        );

        if (selectedProperty?.transaction?.id === data.data.id) {
          setSelectedProperty(prev => {
            if (!prev) return null;
            return {
              ...prev,
              transaction: {
                ...prev.transaction!,
                ...data.data
              }
            };
          });
        }
      }
    };

    return () => {
      eventSource.close();
    };
  }, [session, addNotification]);

  // Κλείσιμο του role menu όταν κάνουμε κλικ εκτός
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Κλείσιμο του dropdown menu όταν κάνουμε κλικ εκτός
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      setOpenDropdown(null);
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleViewProgress = async (property: PropertyWithTransaction) => {
    console.log('=== Opening LeadDetailsModal Debug ===', {
      property: {
        id: property.id,
        title: property.title,
        hasTransaction: !!property.transaction
      },
      transaction: property.transaction ? {
        id: property.transaction.id,
        stage: property.transaction.progress.stage,
        updatedAt: property.transaction.progress.updatedAt
      } : 'NO_TRANSACTION'
    });

    // Έλεγχος αν υπάρχει transaction
    if (!property.transaction?.id) {
      console.log('No transaction found for property, showing error modal');
      setSelectedProperty(property);
      setLeadDetailsModalOpen(true);
      return;
    }

    try {
      // Fetch fresh data for the property and its transaction
      const { data } = await apiClient.get('/buyer/interested-properties');
      
      // Find the updated property
      const updatedProperty = data.properties.find(
        (p: PropertyWithTransaction) => p.id === property.id
      );

      if (updatedProperty && updatedProperty.transaction?.id) {
        console.log('=== Updated Property Data ===', {
          id: updatedProperty.id,
          transactionId: updatedProperty.transaction.id,
          transactionStage: updatedProperty.transaction.progress.stage,
          timestamp: new Date().toISOString()
        });
        setSelectedProperty(updatedProperty);
      } else {
        console.log('Property not found in updated data or no transaction');
        setSelectedProperty(property);
      }
    } catch (error) {
      console.error('Error fetching updated property data:', error);
      setSelectedProperty(property);
    }

    setLeadDetailsModalOpen(true);
  };

  // Βοηθητική συνάρτηση για unread ενδιαφέροντος (Διαχείριση Ραντεβού)
  const hasUnreadInterest = (property: PropertyWithTransaction) => {
    if (newAppointmentNotifications.has(property.id)) {
      return true;
    }
    return notifications.some(
      n => n.propertyId === property.id && n.type === 'INTERESTED' && !n.isRead
    );
  };

  const handleAddToInterested = async (property: PropertyWithTransaction) => {
    try {
      await apiClient.post('/buyer/interested-properties', { propertyId: property.id });

      await fetchData();
      // Ειδοποίηση ενδιαφέροντος
      addNotification({
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: '✅ Το ακίνητο προστέθηκε στα ενδιαφερόμενα.',
        metadata: property.transaction ? {
          leadId: property.transaction.id,
          transactionId: property.transaction.id,
          shouldOpenModal: false
        } : undefined
      });
      // Ειδοποίηση για ραντεβού
      addNotification({
        type: 'success',
        title: 'Προσθήκη Ακινήτου',
        message: '✅ Το ακίνητο προστέθηκε επιτυχώς στα ενδιαφερόμενα.',
        action: {
          label: 'Κλείστε ραντεβού',
          onClick: () => {
            setSelectedProperty(property);
            setIsAppointmentModalOpen(true);
          },
        },
      });
    } catch (error) {
      console.error('Error adding property to interested:', error);
      addNotification({
        type: 'error',
        title: 'Σφάλμα',
        message: 'Σφάλμα κατά την προσθήκη του ακινήτου στα ενδιαφερόμενα.',
      });
    }
  };

  const handleAppointmentUpdate = async (status: string, additionalData?: any) => {
    try {
      await apiClient.post(`/appointments/${selectedProperty?.id}`, {
        status,
        ...additionalData
      });

      await fetchData();

      let notificationTitle = '';
      let notificationMessage = '';
      let formattedDate = '';
      if (additionalData?.date) {
        formattedDate = new Date(additionalData.date).toLocaleDateString('el-GR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      switch (status) {
        case 'custom_date':
        case 'scheduled':
          notificationTitle = 'Αίτημα Ραντεβού Στάλθηκε';
          notificationMessage = `Το αίτημά σας για ραντεβού ${formattedDate ? 'στις ' + formattedDate : ''} στάλθηκε στον πωλητή ${selectedProperty?.user?.name || 'του ακινήτου'} και αναμένει έγκριση.`;
          break;
        case 'accepted':
          notificationTitle = 'Ραντεβού Εγκρίθηκε';
          notificationMessage = 'Το ραντεβού σας εγκρίθηκε από τον πωλητή.';
          break;
        case 'rejected':
          notificationTitle = 'Ραντεβού Απορρίφθηκε';
          notificationMessage = 'Το ραντεβού σας απορρίφθηκε από τον πωλητή.';
          break;
        case 'cancelled':
          notificationTitle = 'Ραντεβού Ακυρώθηκε';
          notificationMessage = 'Το ραντεβού σας ακυρώθηκε.';
          break;
        case 'completed':
          notificationTitle = 'Ραντεβού Ολοκληρώθηκε';
          notificationMessage = 'Το ραντεβού σας ολοκληρώθηκε επιτυχώς.';
          break;
        default:
          notificationTitle = 'Ενημέρωση Ραντεβού';
          notificationMessage = 'Το ραντεβού σας ενημερώθηκε.';
      }

      addNotification({
        type: status === 'rejected' ? 'error' : status === 'custom_date' ? 'info' : 'success',
        title: notificationTitle,
        message: notificationMessage,
        metadata: selectedProperty?.transaction ? {
          leadId: selectedProperty.transaction.id,
          transactionId: selectedProperty.transaction.id,
          stage: selectedProperty.transaction.progress.stage,
          shouldOpenModal: true,
          propertyId: selectedProperty?.id
        } : {
          propertyId: selectedProperty?.id,
          recipient: 'buyer'
        }
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      addNotification({
        type: 'error',
        title: 'Σφάλμα',
        message: 'Σφάλμα κατά την ενημέρωση του ραντεβού.',
      });
    }
  };

  const handleCancelInterest = async (property: any) => {
    try {
      console.log('=== Cancelling Interest ===', {
        propertyId: property.id,
        propertyTitle: property.title,
        timestamp: new Date().toISOString()
      });

      await apiClient.delete(`/buyer/interested-properties/${property.id}`);

      await fetchData();
      
      addNotification({
        type: 'info',
        title: 'Ακύρωση Ενδιαφέροντος',
        message: 'Το ενδιαφέρον σας για το ακίνητο ακυρώθηκε επιτυχώς.',
        metadata: property.transaction ? {
          leadId: property.transaction.id,
          transactionId: property.transaction.id,
          stage: property.transaction.progress.stage,
          shouldOpenModal: false
        } : undefined
      });
    } catch (error: any) {
      console.error('Error canceling interest:', error);
      addNotification({
        type: 'error',
        title: 'Σφάλμα',
        message: `Σφάλμα κατά την ακύρωση του ενδιαφέροντος: ${error?.message || 'Άγνωστο σφάλμα'}`,
      });
    }
  };

  const handleCancelInterestClick = (property: any) => {
    setShowCancelConfirmation({ show: true, property });
  };

  // Filter properties based on search query
  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Βοηθητική συνάρτηση για unread stage update (Πρόοδος)
  const hasUnreadStageUpdate = (property: PropertyWithTransaction) => {
    if (newProgressNotifications.has(property.id)) {
      return true;
    }
    return notifications.some(
      n =>
        n.propertyId === property.id &&
        (n.type as string) === 'STAGE_UPDATE' &&
        !n.isRead
    );
  };

  // Διαχείριση URL parameters για tabs και modals
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Διαχείριση tab parameter
      const tabParam = params.get('tab');
      if (tabParam && ['properties', 'favorites', 'messages', 'support'].includes(tabParam)) {
        setActiveTab(tabParam as 'properties' | 'favorites' | 'messages' | 'support');
      }
      
      // Διαχείριση ticketId parameter για support messages
      const ticketIdParam = params.get('ticketId');
      if (ticketIdParam) {
        setSelectedTicketId(ticketIdParam);
      }
      
      // Διαχείριση openAppointment parameter
      const openAppointmentId = params.get('openAppointment');
      if (openAppointmentId && properties.length > 0) {
        // Ψάχνουμε πρώτα με propertyId
        let property = properties.find(p => p.id === openAppointmentId);
        
        // Αν δεν βρέθηκε, ψάχνουμε με transactionId (leadId)
        if (!property) {
          property = properties.find(p => p.transaction?.id === openAppointmentId);
        }
        
        if (property) {
          setSelectedProperty(property);
          setIsAppointmentModalOpen(true);
          // Καθαρίζουμε το query param για να μην ξανανοίγει
          params.delete('openAppointment');
          const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
          window.history.replaceState({}, '', newUrl);
        }
        // Επιστρέφουμε εδώ ώστε να μην ανοίξει το LeadDetailsModal ταυτόχρονα
        return;
      }
    }
    
    // Listener για custom event
    const handler = (event: any) => {
      const { propertyId } = event.detail || {};
      if (propertyId && properties.length > 0) {
        // Ψάχνουμε πρώτα με propertyId
        let property = properties.find(p => p.id === propertyId);
        
        // Αν δεν βρέθηκε, ψάχνουμε με transactionId (leadId)
        if (!property) {
          property = properties.find(p => p.transaction?.id === propertyId);
        }
        
        if (property) {
          setSelectedProperty(property);
          setIsAppointmentModalOpen(true);
        }
      }
    };
    window.addEventListener('openAppointmentModal', handler);
    
    // Listener για updateBuyerDashboard event
    const updateDashboardHandler = (event: any) => {
      const { tab, ticketId } = event.detail || {};
      if (tab && ['properties', 'favorites', 'messages', 'support'].includes(tab)) {
        setActiveTab(tab as 'properties' | 'favorites' | 'messages' | 'support');
      }
      if (ticketId) {
        setSelectedTicketId(ticketId);
      }
    };
    window.addEventListener('updateBuyerDashboard', updateDashboardHandler);
    
    return () => {
      window.removeEventListener('openAppointmentModal', handler);
      window.removeEventListener('updateBuyerDashboard', updateDashboardHandler);
    };
  }, [properties]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/buyer" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </Link>
              
              <div className="relative" ref={roleMenuRef}>
                <button 
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-md hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                >
                  <FaUserCircle className="mr-2" />
                  Buyer Mode
                  <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                {isRoleMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl py-3 border border-gray-100 z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <FaExchangeAlt className="mr-2 text-blue-500" />
                          Αλλαγή Ρόλου
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                    </div>
                      
                      {/* Options */}
                      <div className="py-2">
                    <Link
                      href="/agent"
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                      onClick={() => handleSignOut()}
                    >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      Agent Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση πελατών και ακινήτων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                    </Link>
                        
                    <Link
                      href="/seller"
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group"
                      onClick={() => handleSignOut()}
                    >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                      Seller Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση ακινήτων και πωλήσεων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
                    </Link>
                  </div>
                      
                      {/* Footer */}
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-blue-600">Buyer Mode</span>
                        </p>
                      </div>
                    </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/buyer"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="/properties"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaSearch className="mr-2" />
                Ακίνητα
              </Link>
              <Link
                href="/buyer/contact"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/buyer/about"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
              <Link
                href="/buyer/how-it-works"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <Link
                    href="/buyer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-all duration-300"
                    title="Επιστροφή στην Αρχική"
                  >
                    <FaHome className="w-4 h-4" />
                  </Link>
                  <NotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md"
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{session?.user?.name || 'Χρήστης'}</p>
                          <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        <Link
                          href="/dashboard/buyer/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                        >
                          <FaCog className="mr-3 text-blue-500" />
                          Ρυθμίσεις
                        </Link>
                        <Link
                          href="/dashboard/buyer/messages"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                        >
                          <FaComments className="mr-3 text-blue-500" />
                          Μηνύματα
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                        >
                          <FaExchangeAlt className="mr-3 text-blue-500" />
                          Αλλαγή Ρόλων
                        </Link>
                        <button
                          onClick={() => handleSignOut()}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Αποσύνδεση
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/buyer/auth/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-300"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/buyer/auth/register"
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Καλώς ήρθατε, {session?.user?.name}!
              </h1>
              <p className="text-gray-600 text-lg">
                Διαχειριστείτε τα ακίνητα και τις προτιμήσεις σας
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Ενεργός</span>
              </div>
              <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all duration-300">
                <FaCog className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Συνδεδεμένα Ακίνητα</p>
                <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaBuilding className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ενεργές Συναλλαγές</p>
                <p className="text-2xl font-bold text-gray-900">
                  {properties.filter(p => p.transaction).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaChartLine className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Αγαπημένα</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FaHeart className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-8 px-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FaBuilding className="w-4 h-4" />
                  <span>Ακίνητα</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === 'favorites'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FaHeart className="w-4 h-4" />
                  <span>Αγαπημένα</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FaComments className="w-4 h-4" />
                  <span>Μηνύματα</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === 'support'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FaEnvelope className="w-4 h-4" />
                  <span>Υποστήριξη</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Enhanced Tab Content */}
          <div className="p-8">
            {activeTab === 'properties' && (
              <div>
                {/* Enhanced Search Bar */}
                <div className="mb-8">
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      placeholder="Αναζήτηση ακινήτων..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 pr-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Enhanced Properties Grid */}
                {properties.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaHome className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Δεν έχετε συνδεδεμένα ακίνητα
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      Ξεκινήστε την αναζήτησή σας για να βρείτε το ιδανικό ακίνητο
                    </p>
                    <Link
                      href="/properties"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md"
                    >
                      <FaSearch className="mr-2" />
                      Αναζήτηση Ακινήτων
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProperties.map((property: any, index: number) => (
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
                              src={property.images[0] || '/images/placeholder.jpg'}
                              alt={property.title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            
                            {/* Test Cancel Button */}
                            <div className="absolute top-3 right-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelInterestClick(property);
                                }}
                                className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 shadow-lg"
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
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
                            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                              property.status === 'available'
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                            }`}>
                              {property.status === 'available' ? 'Διαθέσιμο' : 'Μη Διαθέσιμο'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                            <div className="flex items-center">
                              <FaEye className="mr-2 text-green-500" />
                              {property.stats?.views || 0} προβολές
                            </div>
                            <div className="flex items-center">
                              <FaUsers className="mr-2 text-green-500" />
                              {property.stats?.interestedCount || 0} ενδιαφερόμενοι
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                await handleViewProgress(property);
                                setNewProgressNotifications(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(property.id);
                                  return newSet;
                                });
                                const newProgressFromStorage = JSON.parse(localStorage.getItem('newProgressNotifications') || '[]');
                                const updatedStorage = newProgressFromStorage.filter((id: string) => id !== property.id);
                                localStorage.setItem('newProgressNotifications', JSON.stringify(updatedStorage));
                                const notif = notifications.find(
                                  n =>
                                    n.propertyId === property.id &&
                                    (n.type as string) === 'STAGE_UPDATE' && 
                                    !n.isRead
                                );
                                if (notif) {
                                  await markAsRead(notif.id);
                                }
                              }}
                              className={`flex-1 px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                hasUnreadStageUpdate(property)
                                  ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 hover:from-yellow-200 hover:to-amber-200'
                                  : 'border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50'
                              }`}
                            >
                              Πρόοδος
                              {hasUnreadStageUpdate(property) && (
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
                              onClick={async () => {
                                setSelectedProperty(property);
                                setIsAppointmentModalOpen(true);
                                setNewAppointmentNotifications(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(property.id);
                                  return newSet;
                                });
                                const newAppointmentsFromStorage = JSON.parse(localStorage.getItem('newAppointmentNotifications') || '[]');
                                const updatedStorage = newAppointmentsFromStorage.filter((id: string) => id !== property.id);
                                localStorage.setItem('newAppointmentNotifications', JSON.stringify(updatedStorage));
                                const notif = notifications.find(
                                  n =>
                                    n.propertyId === property.id &&
                                    n.type === 'INTERESTED' &&
                                    !n.isRead
                                );
                                if (notif) {
                                  await markAsRead(notif.id);
                                }
                              }}
                              className={`flex-1 px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                hasUnreadInterest(property)
                                  ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 shadow-lg border-2 hover:from-yellow-200 hover:to-amber-200'
                                  : 'border-gray-300 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50'
                              }`}
                            >
                              <FaCalendar className="inline-block mr-2" />
                              Ραντεβού
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                window.location.href = `/buyer/properties/${property.id}`;
                              }}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 border border-transparent rounded-xl text-sm font-medium text-white hover:from-green-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                            >
                              <FaInfoCircle className="inline-block mr-2" />
                              Λεπτομέρειες
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCancelInterest(property)}
                              className="flex-1 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all duration-200"
                            >
                              <FaTrash className="inline-block mr-2" />
                              Ακύρωση
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaHeart className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Δεν έχετε αγαπημένα ακίνητα
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Ξεκινήστε την αναζήτησή σας για να προσθέσετε αγαπημένα
                </p>
                <Link
                  href="/properties"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-md"
                >
                  <FaSearch className="mr-2" />
                  Αναζήτηση Ακινήτων
                </Link>
              </div>
            )}

            {activeTab === 'messages' && (
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
                selectedTicketId={selectedTicketId}
              />
            )}

            {activeTab === 'support' && (
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
                selectedTicketId={selectedTicketId}
              />
            )}
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </div>
              <p className="text-gray-600">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/properties" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-2 text-blue-500" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-2 text-blue-500" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-blue-500" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Keep all existing modals unchanged */}
      {selectedProperty && (
        <>
          <TransactionProgressModal
            isOpen={showProgressModal}
            onClose={() => {
              setShowProgressModal(false);
              setSelectedProperty(null);
            }}
            transactionId={selectedProperty.transaction?.id || ''}
            buyerName={session?.user?.name || ''}
            propertyTitle={selectedProperty.title}
          />
          <PropertyDetailsModal
            property={selectedProperty}
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedProperty(null);
            }}
          />
          <AppointmentManagementModal
            isOpen={isAppointmentModalOpen}
            onClose={() => setIsAppointmentModalOpen(false)}
            propertyId={selectedProperty.id}
            existingAppointment={selectedProperty.transaction?.appointment}
            onAppointmentUpdate={handleAppointmentUpdate}
            sellerInfo={{
              name: selectedProperty.user?.name || '',
              phone: selectedProperty.user?.phone || '',
              email: selectedProperty.user?.email || ''
            }}
          />
          {selectedProperty && leadDetailsModalOpen && (
            selectedProperty.transaction?.id ? (
              <LeadDetailsModal
                lead={{
                  id: selectedProperty.transaction.id,
                  status: selectedProperty.transaction.progress.stage || 'pending',
                  createdAt: selectedProperty.transaction.createdAt || new Date().toISOString(),
                  updatedAt: selectedProperty.transaction.progress?.updatedAt || new Date().toISOString(),
                  notes: null,
                  buyer: {
                    name: session?.user?.name || '',
                    email: session?.user?.email || '',
                    phone: null
                  },
                  agent: selectedProperty.transaction.agent || null
                }}
                propertyTitle={selectedProperty.title}
                property={{
                  id: selectedProperty.id,
                  title: selectedProperty.title,
                  location: selectedProperty.city + ', ' + selectedProperty.street + ' ' + selectedProperty.number,
                  price: selectedProperty.price,
                  bedrooms: selectedProperty.bedrooms || 0,
                  bathrooms: selectedProperty.bathrooms || 0,
                  area: selectedProperty.area,
                  features: selectedProperty.keywords || [],
                  images: selectedProperty.images
                }}
                updates={selectedProperty.transaction.progress.notifications?.map((n, index) => ({
                  id: index + 1,
                  text: n.message,
                  date: new Date(n.createdAt).toLocaleDateString('el-GR'),
                  category: n.category as 'appointment' | 'offer' | 'contract' | 'payment' | 'completion' | 'general',
                  isUnread: n.isUnread,
                  stage: n.stage
                })) || []}
                currentStage={selectedProperty.transaction.progress.stage === 'CANCELLED' ? 'PENDING' : selectedProperty.transaction.progress.stage || 'pending'}
                onClose={() => {
                  setLeadDetailsModalOpen(false);
                  setSelectedProperty(null);
                }}
              />
            ) : (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md mx-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaExclamationCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h2 className="text-xl font-bold mb-4 text-gray-900">Δεν βρέθηκε συναλλαγή</h2>
                  <p className="text-gray-600 mb-6">
                    Δεν βρέθηκε ενεργή συναλλαγή για αυτό το ακίνητο. Αυτό μπορεί να συμβεί αν:
                  </p>
                  <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
                    <li>• Η συναλλαγή ακυρώθηκε πρόσφατα</li>
                    <li>• Το ενδιαφέρον ακυρώθηκε και δεν έχει επαναφερθεί</li>
                    <li>• Υπάρχει τεχνικό πρόβλημα με τη βάση δεδομένων</li>
                  </ul>
                  <div className="flex space-x-3">
                    <button
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => {
                        setLeadDetailsModalOpen(false);
                        setSelectedProperty(null);
                        // Ανανέωση των δεδομένων
                        fetchData();
                      }}
                    >
                      Ανανέωση
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setLeadDetailsModalOpen(false);
                        setSelectedProperty(null);
                      }}
                    >
                      Κλείσιμο
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Enhanced Confirmation Modal */}
      {confirmCancel.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-4 text-gray-900">Επιβεβαίωση Ακύρωσης</h2>
              <p className="mb-6 text-gray-600">
                Πρόκειται να ακυρώσετε μια ενεργή συναλλαγή που βρίσκεται σε προχωρημένο στάδιο.<br />
                Είστε σίγουρος ότι θέλετε να συνεχίσετε;
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleCancelInterest(confirmCancel.property)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-300 font-medium"
                >Ναι, ακύρωση</button>
                <button
                  onClick={() => setConfirmCancel({ open: false, property: null })}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium"
                >Άκυρο</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Interest Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirmation.show && showCancelConfirmation.property && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCancelConfirmation({ show: false, property: null })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.3 
              }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <FaTrash className="w-8 h-8 text-red-600" />
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold mb-4 text-gray-900"
              >
                Ακύρωση Ενδιαφέροντος
              </motion.h2>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 text-gray-600"
              >
                <p className="mb-3">
                  Είστε σίγουρος ότι θέλετε να ακυρώσετε το ενδιαφέρον σας για το ακίνητο
                </p>
                <p className="mb-4">
                  <strong className="text-gray-900">"{showCancelConfirmation.property.title}"</strong>
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <FaExclamationCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Σημαντική Ενημέρωση:</p>
                      <p>
                        Αν ξαναεκδηλώσετε ενδιαφέρον για αυτό το ακίνητο, η διαδικασία θα γίνει 
                        <strong className="text-yellow-900"> με τον μεσίτη {showCancelConfirmation.property.user?.name || 'του ακινήτου'}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex space-x-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    await handleCancelInterest(showCancelConfirmation.property);
                    setShowCancelConfirmation({ show: false, property: null });
                  }}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-300 font-medium"
                >
                  Ναι, ακύρωση
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCancelConfirmation({ show: false, property: null })}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium"
                >
                  Άκυρο
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 