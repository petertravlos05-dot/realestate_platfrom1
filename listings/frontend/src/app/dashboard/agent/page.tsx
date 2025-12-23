'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { FaUsers, FaCalendarAlt, FaChartBar, FaBuilding, FaPhone, FaEnvelope, FaUserTie, FaHome, FaSignOutAlt, FaSearch, FaCopy, FaLink, FaShare, FaExternalLinkAlt, FaEllipsisH, FaPlus, FaCog, FaBell, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaUser, FaChevronDown, FaExchangeAlt, FaSort, FaSortUp, FaSortDown, FaGift, FaCoins, FaComments, FaUserCircle, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
import LeadDetailsModal from '@/components/leads/LeadDetailsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Update } from '@/components/leads/LeadDetailsModal';
import AddInterestedBuyerModal from '@/components/leads/AddInterestedBuyerModal';
import AgentNotificationBell from '@/components/notifications/AgentNotificationBell';
import SupportCenter from '@/components/support/SupportCenter';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

interface TransactionNotification {
  id: string;
  message: string;
  recipient: 'buyer' | 'seller' | 'agent';
  stage: string;
  category: 'appointment' | 'payment' | 'contract' | 'completion' | 'general' | 'offer';
  createdAt: string;
  isUnread: boolean;
}

interface TransactionUpdate {
  type: 'transaction_update';
  data: {
    id: string;
    progress: {
      stage: string;
      updatedAt: string;
      notifications: TransactionNotification[];
    };
    property: {
      id: string;
    };
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  connectionDate: string;
  lastContact: string;
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    type: string;
    status: string;
    images: string[];
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    features?: string[];
  };
  status: string;
  transactionId: string;
  notes: string | null;
  transaction?: {
    id: string;
    createdAt: string;
    agent?: {
      name: string;
      email: string;
      phone?: string;
    };
    progress: {
      stage: string;
      updatedAt: string;
      notifications: TransactionNotification[];
    };
  };
}

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  type: string;
  status: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AgentDashboard() {
  const { data: session } = useSession();
  console.log('Session in AgentDashboard:', session);
  console.log('User ID in AgentDashboard:', session?.user?.id);
  const [activeTab, setActiveTab] = useState<'clients' | 'properties' | 'statistics' | 'support'>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReferralLink, setShowReferralLink] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const referralLink = `https://realestate.com/connect/agent/${session?.user?.id}`;
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isAddBuyerModalOpen, setIsAddBuyerModalOpen] = useState(false);
  const [connectionIdForOtp, setConnectionIdForOtp] = useState<string>('');
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loadingReferralStats, setLoadingReferralStats] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      if (!session?.user) {
        console.log('No session found');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching clients for user:', session.user);
        const { data } = await apiClient.get('/agents/clients');
        
        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }
        
        setClients(deduplicateClients(data));
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchClients();
    }
  }, [session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch referral stats when profile menu opens
  const fetchReferralStats = async () => {
    if (!session?.user?.id) return;
    
    setLoadingReferralStats(true);
    try {
      const { data } = await apiClient.get(`/referrals/stats?userId=${session.user.id}`);
      setReferralStats(data);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoadingReferralStats(false);
    }
  };

  // Event listener για το AgentNotificationBell
  useEffect(() => {
    const handleOpenLeadDetailsModal = (event: CustomEvent) => {
      const { transactionId, buyerId, propertyId, buyerName, propertyTitle, stage } = event.detail;
      
      // Δημιουργούμε ένα client object για το LeadDetailsModal
      const clientData: Client = {
        id: buyerId || '',
        name: buyerName || 'Άγνωστος Πελάτης',
        email: '',
        phone: null,
        connectionDate: new Date().toISOString(),
        lastContact: new Date().toISOString(),
        property: {
          id: propertyId || '',
          title: propertyTitle || 'Άγνωστο Ακίνητο',
          price: 0,
          location: '',
          type: '',
          status: '',
          images: []
        },
        status: stage || 'PENDING',
        transactionId: transactionId || '',
        notes: null,
        transaction: {
          id: transactionId || '',
          createdAt: new Date().toISOString(),
          progress: {
            stage: stage || 'PENDING',
            updatedAt: new Date().toISOString(),
            notifications: []
          }
        }
      };

      setSelectedClient(clientData);
      setShowLeadDetails(true);
    };

    window.addEventListener('openLeadDetailsModal', handleOpenLeadDetailsModal as EventListener);
    
    return () => {
      window.removeEventListener('openLeadDetailsModal', handleOpenLeadDetailsModal as EventListener);
    };
  }, []);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  // Helper function to check if client is new (connected within last 7 days)
  const isNewClient = (connectionDate: string) => {
    return new Date(connectionDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  };

  // Sort clients function
  const sortClients = (clients: Client[]) => {
    if (!sortConfig) return clients;
    
    return [...clients].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stage':
          aValue = a.transaction?.progress?.stage || a.status;
          bValue = b.transaction?.progress?.stage || b.status;
          break;
        case 'connectionDate':
          aValue = new Date(a.connectionDate);
          bValue = new Date(b.connectionDate);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Handle sort click
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Remove sorting
        }
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="ml-1 text-blue-600" />
      : <FaSortDown className="ml-1 text-blue-600" />;
  };

  // Filter and sort clients
  const filteredAndSortedClients = sortClients(
    clients.filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.property.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleUpdateLeadStatus = async (newStatus: string) => {
    if (!selectedClient) return;

    console.log('[DEBUG] handleUpdateLeadStatus - Starting update for client:', {
      clientId: selectedClient.id,
      transactionId: selectedClient.transactionId,
      currentStage: selectedClient.transaction?.progress?.stage,
      newStage: newStatus
    });

    try {
      const { data: updatedTransaction } = await apiClient.put(`/admin/transactions/${selectedClient.transactionId}/stage`, { stage: newStatus });
      console.log('[DEBUG] handleUpdateLeadStatus - Received updated transaction:', {
        id: updatedTransaction.id,
        stage: updatedTransaction.progress?.stage,
        previousStage: selectedClient.transaction?.progress?.stage
      });
      
      // Update the selected client with new transaction data
      setSelectedClient(prev => {
        if (!prev) return null;
        return {
          ...prev,
          transaction: {
            ...prev.transaction,
            id: prev.transaction?.id || '',
            createdAt: prev.transaction?.createdAt || '',
            progress: updatedTransaction.progress
          }
        };
      });

      // Refresh clients list
      const updatedClients = await fetchClientsData();
      setClients(updatedClients);
    } catch (err) {
      console.error('[DEBUG] handleUpdateLeadStatus - Error updating status:', err);
    }
  };

  const handleAddLeadNote = async (note: string) => {
    if (!selectedClient) return;

    try {
      await apiClient.post(`/admin/transactions/${selectedClient.transactionId}/notes`, { note });

      // Update the selected client with new note
      setSelectedClient(prev => {
        if (!prev) return null;
        return {
          ...prev,
          notes: note
        };
      });

      // Refresh clients list
      const updatedClients = await fetchClientsData();
      setClients(updatedClients);
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    // Could add a toast notification here
  };

  // Add SSE connection
  useEffect(() => {
    if (!session?.user) return;

    const eventSource = new EventSource('/api/admin/transactions/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as TransactionUpdate;
      
      if (data.type === 'transaction_update') {
        setClients(prevClients => 
          prevClients.map(client => {
            if (client.transactionId === data.data.id) {
              return {
                ...client,
                transaction: {
                  id: data.data.id,
                  createdAt: client.transaction?.createdAt || client.connectionDate,
                  agent: client.transaction?.agent,
                  progress: {
                    stage: data.data.progress.stage,
                    updatedAt: data.data.progress.updatedAt,
                    notifications: data.data.progress.notifications.map(n => ({
                      id: n.id,
                      message: n.message,
                      recipient: n.recipient,
                      stage: n.stage,
                      category: n.category,
                      createdAt: n.createdAt,
                      isUnread: n.isUnread
                    }))
                  }
                }
              };
            }
            return client;
          })
        );

        // Show notification
        if (data.data.progress.notifications.some(n => 
          n.recipient === 'agent' && n.isUnread
        )) {
          toast.success('Νέα ενημέρωση συναλλαγής', {
            duration: 5000,
            position: 'bottom-right',
          });
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session]);

  // Add fetchClientsData function
  const fetchClientsData = async () => {
    try {
      const { data } = await apiClient.get('/agents/clients');
      return data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  };

  // Add polling effect for transaction updates
  useEffect(() => {
    if (!selectedClient?.transactionId) return;

    const pollTransaction = async () => {
      try {
        const { data: transaction } = await apiClient.get(`/admin/transactions/${selectedClient.transactionId}`);
        
        setSelectedClient(prev => {
          if (!prev) return null;
          return {
            ...prev,
            transaction: {
              ...prev.transaction,
              ...transaction,
              progress: transaction.progress
            }
          };
        });
      } catch (error) {
        console.error('Error polling transaction:', error);
      }
    };

    // Initial poll
    pollTransaction();

    // Set up polling interval
    const interval = setInterval(pollTransaction, 5000);

    // Cleanup
    return () => clearInterval(interval);
  }, [selectedClient?.transactionId]);

  const handleLeadClick = async (lead: any) => {
    console.log('[DEBUG] handleLeadClick - Selected lead:', {
      leadId: lead.id,
      transactionId: lead.transactionId,
      currentStage: lead.transaction?.progress?.stage
    });

    try {
      // Fetch property details
      const { data: propertyData } = await apiClient.get(`/properties/${lead.propertyId}`);

      // Fetch transaction details if transactionId exists
      let transactionData = null;
      if (lead.transactionId) {
        console.log('[DEBUG] handleLeadClick - Fetching transaction details for ID:', lead.transactionId);
        try {
          const { data } = await apiClient.get(`/admin/transactions/${lead.transactionId}`);
          transactionData = data;
          console.log('[DEBUG] handleLeadClick - Received transaction details:', {
            id: transactionData.id,
            stage: transactionData.progress?.stage
          });
        } catch (error) {
          console.error('[DEBUG] handleLeadClick - Failed to fetch transaction:', error);
        }
      }

      // Update selected client with all details
      const updatedLead = {
        ...lead,
        property: propertyData,
        transaction: {
          ...transactionData,
          progress: {
            ...transactionData?.progress,
            stage: transactionData?.stage || transactionData?.progress?.stage || lead.transaction?.progress?.stage
          }
        }
      };

      console.log('[DEBUG] handleLeadClick - Setting selected client with updated data:', {
        leadId: updatedLead.id,
        transactionId: updatedLead.transactionId,
        stage: updatedLead.transaction?.progress?.stage,
        transactionStage: transactionData?.stage
      });

      setSelectedClient(updatedLead);
      setShowLeadDetails(true);
    } catch (error) {
      console.error('[DEBUG] handleLeadClick - Error:', error);
    }
  };

  // Συνάρτηση deduplication
  function deduplicateClients(clients: Client[]): Client[] {
    // Ταξινόμηση με βάση createdAt (ή όποιο πεδίο είναι το πιο πρόσφατο)
    const sorted = [...clients].sort((a, b) => new Date(b.transaction?.createdAt || '').getTime() - new Date(a.transaction?.createdAt || '').getTime());
    const seen = new Set();
    const unique: Client[] = [];
    for (const client of sorted) {
      const key = `${client.property.id}_${client.email}`;
      if (!seen.has(key)) {
        unique.push(client);
        seen.add(key);
      }
    }
    return unique;
  }

  const handleLeadDeleted = (leadId: string) => {
    setClients((prev: Client[]) => prev.filter((client: Client) => client.transactionId !== leadId));
  };

  // Fetch properties από το /api/properties (όπως στη σελίδα agent/properties)
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data } = await apiClient.get('/properties');
        if (Array.isArray(data)) {
          setAllProperties(data);
        }
      } catch (err) {
        setAllProperties([]);
      }
    };
    fetchProperties();
  }, []);

  // Προσθήκη helper για refresh clients
  const refreshClients = async () => {
    try {
      const { data } = await apiClient.get('/agents/clients');
      if (Array.isArray(data)) {
        setClients(deduplicateClients(data));
      }
    } catch (err) {
      setClients([]);
    }
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/dashboard/buyer');
    } else if (role === 'SELLER') {
      router.push('/dashboard/seller');
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = '/agent';
  };

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
              <Link href="/agent" className="flex items-center space-x-3 group">
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
                  Agent Mode
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
                      href="/dashboard/buyer"
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group"
                      onClick={() => handleRoleChange('BUYER')}
                    >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                      Buyer Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Αναζήτηση και αγορά ακινήτων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
                    </Link>
                        
                    <Link
                      href="/dashboard/seller"
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 group"
                      onClick={() => handleRoleChange('SELLER')}
                    >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                      Seller Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση ακινήτων και πωλήσεων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    </Link>
                  </div>
                      
                      {/* Footer */}
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-blue-600">Agent Mode</span>
                        </p>
                      </div>
                    </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/agent"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="/agent/properties"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaBuilding className="mr-2" />
                Ακίνητα
              </Link>
              <Link
                href="/agent/contact"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/agent/about"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <Link
                    href="/agent"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-all duration-300"
                    title="Επιστροφή στην Αρχική"
                  >
                    <FaHome className="w-4 h-4" />
                  </Link>
                  <AgentNotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => {
                        const newShowProfileMenu = !showProfileMenu;
                        setShowProfileMenu(newShowProfileMenu);
                        if (newShowProfileMenu && !referralStats) {
                          fetchReferralStats();
                        }
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md"
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{session?.user?.name || 'Χρήστης'}</p>
                          <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        {/* Referral Points Section */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                              <FaGift className="mr-2 text-blue-600" />
                              Referral Πόντοι
                            </h3>
                            <div className="flex items-center space-x-2">
                              {loadingReferralStats ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <button
                                  onClick={fetchReferralStats}
                                  className="text-blue-600 hover:text-blue-700 transition-colors"
                                  title="Ανανέωση πόντων"
                                >
                                  <FaExternalLinkAlt className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {referralStats ? (
                            <div className="space-y-3">
                              {/* Total Points Display */}
                              <Link href="/agent/profile" className="block">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-3 text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-blue-100 mb-1">Συνολικοί Πόντοι</p>
                                      <p className="text-2xl font-bold">
                                        {referralStats.totalPoints?.toLocaleString() || 0}
                                      </p>
                                      <p className="text-xs text-blue-200">
                                        Αξία: €{((referralStats.totalPoints || 0) * 0.1).toFixed(0)}
                                      </p>
                                    </div>
                                    <FaCoins className="text-3xl text-blue-200 opacity-80" />
                                  </div>
                                </div>
                              </Link>
                          
                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Πρόοδος προς επόμενο επίπεδο</span>
                              <span>{(referralStats.totalPoints || 0)} / 2,000</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(((referralStats.totalPoints || 0) / 2000) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {Math.max(2000 - (referralStats.totalPoints || 0), 0)} πόντους ακόμα
                            </p>
                          </div>
                          
                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 rounded p-2 text-center">
                              <p className="font-semibold text-gray-800">
                                {referralStats.referrals?.filter((r: any) => r.type === 'referrer').length || 0}
                              </p>
                              <p className="text-gray-500">Ενεργά Referrals</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2 text-center">
                              <p className="font-semibold text-gray-800">
                                {referralStats.points?.length || 0}
                              </p>
                              <p className="text-gray-500">Συναλλαγές</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <FaGift className="text-2xl text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Φόρτωση πόντων...</p>
                        </div>
                      )}
                    </div>
                    
                        {/* Menu Items */}
                        <Link
                          href="/agent/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                        >
                          <FaCog className="mr-3 text-blue-500" />
                          Ρυθμίσεις
                        </Link>
                        <Link
                          href="/agent/messages"
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
                    href="/agent/auth/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-300"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/agent/auth/register"
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-16 pt-20">
        {/* Quick Stats */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaUsers className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Συνολικοί Πελάτες</h3>
                <p className="text-2xl font-bold text-gray-900">{filteredAndSortedClients.length}</p>
                <p className="text-xs text-green-600 mt-1">+{Math.floor(filteredAndSortedClients.length * 0.05)}% από τον προηγούμενο μήνα</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaBuilding className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Ενεργές Διαπραγματεύσεις</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAndSortedClients.filter(c => c.status === 'ACTIVE').length}
                </p>
                <p className="text-xs text-green-600 mt-1">{filteredAndSortedClients.filter(c => c.status === 'ACTIVE' && new Date(c.connectionDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} νέες αυτήν την εβδομάδα</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FaCalendarAlt className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Επόμενα Ραντεβού</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAndSortedClients.filter(c => c.status === 'ACTIVE' && new Date(c.lastContact) > new Date()).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredAndSortedClients.filter(c => c.status === 'ACTIVE' && new Date(c.lastContact).toDateString() === new Date().toDateString()).length} σήμερα, 
                  {filteredAndSortedClients.filter(c => c.status === 'ACTIVE' && new Date(c.lastContact).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()).length} αύριο
                </p>
              </div>
        </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaChartBar className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Ολοκληρωμένες Συναλλαγές</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAndSortedClients.filter(c => c.status === 'COMPLETED').length}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  €{filteredAndSortedClients
                    .filter(c => c.status === 'COMPLETED')
                    .reduce((sum, client) => sum + (client.property?.price || 0), 0)
                    .toLocaleString()} σε προμήθειες
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Referral Link Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-sm p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Start Promoting Properties</h2>
            <button 
              onClick={() => setShowReferralLink(!showReferralLink)}
              className="text-white/80 hover:text-white"
            >
              {showReferralLink ? <FaEllipsisH /> : <FaLink />}
            </button>
          </div>
          {showReferralLink && (
            <div className="mt-4">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm flex items-center justify-between">
                <p className="text-white text-sm truncate">{referralLink}</p>
                <button 
                  onClick={copyReferralLink}
                  className="ml-2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <FaCopy className="w-4 h-4" />
                </button>
            </div>
              <p className="mt-2 text-white/80 text-sm">
                Μοιραστείτε αυτό το link με υποψήφιους αγοραστές για να συνδεθείτε μαζί τους
              </p>
            </div>
          )}
          <div className="mt-4">
            <Link 
              href="/agent/properties"
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              <FaBuilding className="mr-2" />
              Browse Properties
            </Link>
          </div>
        </motion.div>

        {/* Tabs and Content Container */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeTab === 'clients'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUsers className="w-4 h-4 mr-2" />
              Πελάτες
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex items-center py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeTab === 'properties'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaBuilding className="w-4 h-4 mr-2" />
              Ακίνητα
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex items-center py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeTab === 'statistics'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaChartBar className="w-4 h-4 mr-2" />
              Στατιστικά
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`flex items-center py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeTab === 'support'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaComments className="w-4 h-4 mr-2" />
              Υποστήριξη
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Clients Tab Content */}
            <div className={activeTab === 'clients' ? 'block' : 'hidden'}>
              {/* Search Controls */}
              <div className="flex justify-between mb-6">
                <div className="relative w-full max-w-md">
                  <input
                    type="text"
                    placeholder="Αναζήτηση leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
                <button
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-colors"
                  onClick={() => setIsAddBuyerModalOpen(true)}
                >
                  <FaPlus className="w-4 h-4 mr-2" />
                  Προσθήκη Ενδιαφερόμενου
                </button>
              </div>

              {/* Clients List */}
                {filteredAndSortedClients.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-12 text-center border border-dashed border-gray-300">
                  <FaUsers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν έχετε leads ακόμα</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Μοιραστείτε το referral link σας με υποψήφιους αγοραστές ή προσθέστε τους χειροκίνητα
                  </p>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                    <FaShare className="mr-2 -ml-1 h-4 w-4" />
                    Μοιραστείτε το link σας
                  </button>
                  </div>
                ) : (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Όνομα
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ακίνητο
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('stage')}
                        >
                          <div className="flex items-center">
                            Στάδιο Συναλλαγής
                            {getSortIcon('stage')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('connectionDate')}
                        >
                          <div className="flex items-center">
                            Ημερομηνία Σύνδεσης
                            {getSortIcon('connectionDate')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ενέργειες
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedClients.map((client: Client) => (
                        <tr 
                        key={client.id}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            isNewClient(client.connectionDate) ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                          }`}
                        onClick={() => setSelectedClient(client)}
                      >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium">{client.name?.[0]}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 flex items-center">
                                  {client.name}
                                  {isNewClient(client.connectionDate) && (
                                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                      Νέος
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{client.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{client.property?.title || 'Μη διαθέσιμο'}</div>
                            <div className="text-sm text-gray-500">€{client.property?.price?.toLocaleString() || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              // Προτεραιότητα: transaction.progress.stage > client.status
                              const stage = client.transaction?.progress?.stage || client.status;
                              let label = '';
                              let color = '';
                              switch (stage) {
                                case 'PENDING':
                                case 'pending':
                                  label = 'Αναμονή για ραντεβού';
                                  color = 'bg-yellow-100 text-yellow-800';
                                  break;
                                case 'MEETING_SCHEDULED':
                                case 'viewing_scheduled':
                                  label = 'Έγινε ραντεβού';
                                  color = 'bg-blue-100 text-blue-800';
                                  break;
                                case 'DEPOSIT_PAID':
                                  label = 'Έγινε προκαταβολή';
                                  color = 'bg-green-100 text-green-800';
                                  break;
                                case 'FINAL_SIGNING':
                                case 'offer_made':
                                  label = 'Τελική υπογραφή';
                                  color = 'bg-indigo-100 text-indigo-800';
                                  break;
                                case 'COMPLETED':
                                case 'completed':
                                  label = 'Ολοκληρώθηκε';
                                  color = 'bg-purple-100 text-purple-800';
                                  break;
                                case 'CANCELLED':
                                case 'rejected':
                                  label = 'Ακυρώθηκε';
                                  color = 'bg-red-100 text-red-800';
                                  break;
                                case 'accepted':
                                  label = 'Αποδεκτή';
                                  color = 'bg-green-100 text-green-800';
                                  break;
                                default:
                                  label = stage;
                                  color = 'bg-gray-100 text-gray-800';
                              }
                              return (
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
                                  {label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(client.connectionDate).toLocaleDateString('el-GR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                              }}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              Προβολή
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Edit client:', client.id);
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Επεξεργασία
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Properties Tab Content */}
            <div className={activeTab === 'properties' ? 'block' : 'hidden'}>
              {filteredAndSortedClients.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {filteredAndSortedClients.map((client: Client) => (
                        <li key={client.transactionId} className="hover:bg-gray-50 transition-colors">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                                  {client.property?.images?.[0] ? (
                                    <img 
                                      src={client.property.images[0]} 
                                      alt={client.property.title} 
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                      <FaBuilding className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <h4 className="text-lg font-medium text-gray-900">{client.property?.title || 'Μη διαθέσιμο'}</h4>
                                  <p className="text-sm text-gray-500">{client.property?.location || 'Μη διαθέσιμο'}</p>
                                  <div className="mt-1 flex items-center">
                                    <span className="text-sm font-medium text-blue-600">€{client.property?.price?.toLocaleString() || '-'}</span>
                                    <span className="ml-2 text-xs text-gray-500">•</span>
                                    <span className="ml-2 text-xs text-gray-500">{client.property?.type || 'Μη διαθέσιμο'}</span>
                                    <span className="ml-2 text-xs text-gray-500">•</span>
                                    <span className="ml-2 text-xs text-gray-500">{client.property?.status || 'Μη διαθέσιμο'}</span>
                              </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${client.status === 'COMPLETED' 
                                    ? 'bg-green-100 text-green-800' 
                                    : client.status === 'ACTIVE' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-100 text-gray-800'}`}
                                >
                                  {client.status === 'COMPLETED' 
                                    ? 'Ολοκληρώθηκε' 
                                    : client.status === 'ACTIVE' 
                                      ? 'Ενεργή' 
                                      : client.status}
                                </span>
                                <Link 
                                  href={`/agent/properties/${client.property?.id}`}
                                  className="ml-4 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  <FaExternalLinkAlt className="h-5 w-5" />
                                </Link>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  <FaUser className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  {client.name}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                  <FaEnvelope className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  {client.email}
                                </p>
                          </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <FaCalendarAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <p>
                                  Σύνδεση: {new Date(client.connectionDate).toLocaleDateString('el-GR')}
                                </p>
                          </div>
                        </div>
                      </div>
                        </li>
                    ))}
                    </ul>
                  </div>
              </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center border border-dashed border-gray-300">
                  <FaBuilding className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ακίνητα που Προωθείτε</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Δεν έχετε ακόμη συνδέσει ακίνητα με πελάτες. Επιλέξτε ακίνητα για προώθηση στους πελάτες σας.
                  </p>
                  <Link 
                    href="/agent/properties"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#001f3f] hover:bg-[#00284d]"
                  >
                    <FaExternalLinkAlt className="mr-2 -ml-1 h-4 w-4" />
                    Προβολή Όλων των Ακινήτων
                  </Link>
            </div>
              )}
            </div>

            {/* Statistics Tab Content */}
            <div className={activeTab === 'statistics' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Συναλλαγές ανά Μήνα</h3>
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">Διάγραμμα Συναλλαγών</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Προμήθειες</h3>
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">Διάγραμμα Προμηθειών</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Συνολική Απόδοση</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-700">Συνολικές Προμήθειες</h4>
                      <p className="text-2xl font-bold text-green-800 mt-2">
                        €{filteredAndSortedClients
                          .filter(c => c.status === 'COMPLETED')
                          .reduce((sum, client) => sum + (client.property?.price || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-700">Ποσοστό Επιτυχίας</h4>
                      <p className="text-2xl font-bold text-blue-800 mt-2">
                        {filteredAndSortedClients.length > 0 
                          ? Math.round((filteredAndSortedClients.filter(c => c.status === 'COMPLETED').length / filteredAndSortedClients.length) * 100) 
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-700">Μέσος Χρόνος Ολοκλήρωσης</h4>
                      <p className="text-2xl font-bold text-purple-800 mt-2">
                        {filteredAndSortedClients.filter(c => c.status === 'COMPLETED').length > 0
                          ? Math.round(filteredAndSortedClients
                              .filter(c => c.status === 'COMPLETED')
                              .reduce((sum, client) => {
                                const connectionDate = new Date(client.connectionDate);
                                const lastContact = new Date(client.lastContact);
                                return sum + (lastContact.getTime() - connectionDate.getTime()) / (1000 * 60 * 60 * 24);
                              }, 0) / filteredAndSortedClients.filter(c => c.status === 'COMPLETED').length)
                          : 0} ημέρες
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Tab Content */}
            <div className={activeTab === 'support' ? 'block' : 'hidden'}>
              <SupportCenter 
                userProperties={clients.map(c => ({
                  id: c.property?.id || '',
                  title: c.property?.title || '',
                  address: c.property?.location || ''
                }))}
                userTransactions={clients
                  .filter(c => c.transaction)
                  .map(c => ({
                    id: c.transaction!.id,
                    status: c.transaction!.progress.stage,
                    property: {
                      id: c.property?.id || '',
                      title: c.property?.title || ''
                    }
                  }))}
              />
            </div>
          </div>
        </motion.div>
      </main>


      {selectedClient && (
        <LeadDetailsModal
          id={selectedClient.transactionId}
          lead={{
            id: selectedClient.transactionId,
            status: selectedClient.transaction?.progress?.stage || 'PENDING',
            createdAt: selectedClient.transaction?.createdAt || selectedClient.connectionDate,
            updatedAt: selectedClient.transaction?.progress?.updatedAt || selectedClient.lastContact,
            notes: selectedClient.notes,
            buyer: {
              name: selectedClient.name,
              email: selectedClient.email,
              phone: selectedClient.phone
            },
            agent: selectedClient.transaction?.agent || null
          }}
          propertyTitle={selectedClient.property?.title || ''}
          property={{
            id: selectedClient.property?.id || '',
            title: selectedClient.property?.title || '',
            location: selectedClient.property?.location || '',
            price: selectedClient.property?.price || 0,
            bedrooms: selectedClient.property?.bedrooms || 0,
            bathrooms: selectedClient.property?.bathrooms || 0,
            area: selectedClient.property?.area || 0,
            features: selectedClient.property?.features || [],
            images: selectedClient.property?.images || []
          }}
          updates={selectedClient.transaction?.progress?.notifications?.map((n: TransactionNotification): Update => ({
            id: typeof n.id === 'string' ? parseInt(n.id) : Number(n.id),
            text: n.message,
            date: new Date(n.createdAt).toLocaleDateString('el-GR'),
            category: n.category,
            isUnread: n.isUnread,
            stage: n.stage
          })) || []}
          currentStage={selectedClient.transaction?.progress?.stage || 'PENDING'}
          onClose={() => setSelectedClient(null)}
          onUpdateStatus={handleUpdateLeadStatus}
          onAddNote={handleAddLeadNote}
        />
      )}

      <AddInterestedBuyerModal
        open={isAddBuyerModalOpen}
        onClose={() => setIsAddBuyerModalOpen(false)}
        onSuccess={async (connectionId) => {
          setConnectionIdForOtp(connectionId);
          setIsAddBuyerModalOpen(false);
          await refreshClients();
          toast.success('Ο ενδιαφερόμενος προστέθηκε επιτυχώς!');
        }}
        agentId={session?.user?.id || ''}
        propertyId={''}
        properties={allProperties.map(p => ({ id: p.id, title: p.title }))}
      />
    </div>
  );
} 