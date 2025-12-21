import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaHome, FaCalendarAlt, FaHandshake, FaFileContract, FaMoneyBillWave, FaCheckCircle, FaExclamationCircle, FaClock, FaComment, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaEuroSign, FaExpand, FaCompress, FaBell, FaFileAlt, FaCheckDouble, FaSearch, FaChevronRight, FaChevronLeft, FaChartLine, FaUserTie } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import debug from 'debug';
import { fetchFromBackend } from '@/lib/api/client';

// Initialize debug logger
const log = debug('app:LeadDetailsModal');

// Enable logging
if (typeof window !== 'undefined') {
  debug.enable('app:LeadDetailsModal');
}

export interface Update {
  id: number;
  text: string;
  date: string;
  category: 'appointment' | 'offer' | 'contract' | 'payment' | 'completion' | 'general';
  isUnread: boolean;
  stage: string;
}

interface LeadDetailsModalProps {
  id?: string;
  lead?: {
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
    agent: any | null;
  };
  propertyTitle?: string;
  property?: {
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
  agent?: any;
  updates?: Update[];
  currentStage?: string;
  onClose: () => void;
  onUpdateStatus?: (status: string) => void;
  onAddNote?: (note: string) => void;
}

interface Stage {
  id: string;
  title: string;
  icon: IconType;
  description: string;
  date?: string;
}

const stages: Stage[] = [
  { 
    id: 'PENDING', 
    title: '🔍 Αναμονή για ραντεβού', 
    icon: FaSearch,
    description: "Αναζήτηση και επιλογή του κατάλληλου ακινήτου που ταιριάζει στις ανάγκες σας."
  },
  { 
    id: 'MEETING_SCHEDULED', 
    title: '📅 Έγινε ραντεβού', 
    icon: FaCalendarAlt,
    description: "Προγραμματισμός ραντεβού για επίσκεψη και επιθεώρηση του ακινήτου."
  },
  { 
    id: 'DEPOSIT_PAID', 
    title: '💰 Έγινε προκαταβολή', 
    icon: FaMoneyBillWave,
    description: "Καταβολή προκαταβολής για το κλείδωμα του ακινήτου και εξασφάλιση της συναλλαγής."
  },
  { 
    id: 'FINAL_SIGNING', 
    title: '📄 Τελική υπογραφή', 
    icon: FaFileContract,
    description: "Διεξαγωγή νομικού και τεχνικού ελέγχου από εξειδικευμένους δικηγόρους."
  },
  { 
    id: 'COMPLETED', 
    title: '✅ Ολοκληρώθηκε', 
    icon: FaCheckCircle,
    description: "Τελική ολοκλήρωση της συναλλαγής και μεταβίβαση του ακινήτου στον νέο ιδιοκτήτη."
  },
  { 
    id: 'CANCELLED', 
    title: '❌ Ακυρώθηκε', 
    icon: FaTimes,
    description: "Η συναλλαγή έχει ακυρωθεί."
  }
];

// Custom logger function
const serverLog = async (type: string, data: any) => {
  try {
    await fetchFromBackend('/admin/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString(),
        component: 'LeadDetailsModal'
      })
    });
  } catch (error) {
    console.error('Failed to send log:', error);
  }
};

// Add new UI components
const ModernCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-xl shadow-lg p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const ModernButton = ({ children, onClick, variant = 'primary', className = '' }: { 
  children: React.ReactNode; 
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium transition-all duration-200
      ${variant === 'primary' ? 'bg-[#001f3f] text-white hover:bg-[#00284d]' : ''}
      ${variant === 'secondary' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : ''}
      ${variant === 'outline' ? 'border border-[#001f3f] text-[#001f3f] hover:bg-[#001f3f] hover:text-white' : ''}
      ${className}
    `}
  >
    {children}
  </motion.button>
);

const ModernBadge = ({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'success' | 'warning' | 'error' }) => (
  <span className={`
    px-3 py-1 rounded-full text-sm font-medium
    ${variant === 'info' ? 'bg-blue-100 text-blue-800' : ''}
    ${variant === 'success' ? 'bg-green-100 text-green-800' : ''}
    ${variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : ''}
    ${variant === 'error' ? 'bg-red-100 text-red-800' : ''}
  `}>
    {children}
  </span>
);

export default function LeadDetailsModal(props: LeadDetailsModalProps) {
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localStage, setLocalStage] = useState(props.currentStage || 'pending');
  const [transactionData, setTransactionData] = useState<any>(null);
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [loading, setLoading] = useState(!!props.id);

  // Βοηθητική συνάρτηση για να προσδιορίσω αν πρέπει να εφαρμοστεί blur στα στοιχεία του ενδιαφερομένου
  const shouldBlurLeadInfo = (stage: string) => {
    const stageOrder = {
      'PENDING': 0,
      'MEETING_SCHEDULED': 1,
      'DEPOSIT_PAID': 2,
      'FINAL_SIGNING': 3,
      'COMPLETED': 4,
      'CANCELLED': 5
    };
    const currentStageOrder = stageOrder[stage as keyof typeof stageOrder] || 0;
    // Blur αν το στάδιο είναι μικρότερο από "έγινε προκαταβολή" (stageOrder < 2)
    // Δηλαδή blur για: pending, meeting_scheduled
    // Κανονική εμφάνιση για: deposit_paid, final_signing, completed
    return currentStageOrder < 2;
  };

  // Αν υπάρχει id, κάνε fetch τα δεδομένα
  useEffect(() => {
    if (props.id) {
      setLoading(true);
      fetch(`/api/admin/transactions/${props.id}`)
        .then(res => res.json())
        .then(data => {
          setFetchedData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [props.id]);

  // Χρησιμοποίησε τα δεδομένα από το transactionData αν υπάρχουν, αλλιώς τα props
  const lead = transactionData?.lead || fetchedData?.lead || props.lead;
  const property = transactionData?.property || fetchedData?.property || props.property;
  const propertyTitle = transactionData?.property?.title || fetchedData?.propertyTitle || props.propertyTitle;
  const updates = transactionData?.progress?.notifications?.map((n: any, index: number) => ({
    id: index + 1,
    text: n.message,
    date: new Date(n.createdAt).toLocaleDateString('el-GR'),
    category: n.category,
    isUnread: n.isUnread,
    stage: n.stage
  })) || fetchedData?.updates || props.updates || [];
  const currentStage = transactionData?.progress?.stage || fetchedData?.progress?.stage || props.currentStage || 'pending';
  const agent = lead?.agent || property?.agent || props.agent;

  // Log initial data
  useEffect(() => {
    console.log('=== LeadDetailsModal Mount ===', {
      leadId: lead?.id,
      initialStage: currentStage,
      status: lead?.status,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Fetch transaction data directly from backend
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!props.id) {
        console.log('No transaction ID available');
        return;
      }

      try {
        console.log('=== Fetching Transaction Data ===', {
          transactionId: props.id,
          currentLocalStage: localStage,
          timestamp: new Date().toISOString()
        });

        const response = await fetch(`/api/admin/transactions/${props.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transaction data');
        }

        const data = await response.json();
        console.log('=== Received Transaction Data ===', {
          id: data.id,
          stage: data.progress?.stage,
          currentLocalStage: localStage,
          updatedAt: data.progress?.updatedAt,
          timestamp: new Date().toISOString()
        });

        setTransactionData(data);
        
        // Ενημερώνουμε το localStage αν υπάρχει νέο stage
        if (data.progress?.stage && data.progress.stage !== localStage) {
          console.log('Updating stage from', localStage, 'to', data.progress.stage);
          setLocalStage(data.progress.stage);
        }
      } catch (error) {
        console.error('Error fetching transaction data:', error);
      }
    };

    // Initial fetch
    fetchTransactionData();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchTransactionData, 5000);
    return () => clearInterval(interval);
  }, [props.id]);

  // Χρησιμοποιούμε το transactionData για το rendering
  const effectiveStage = (() => {
    const stage = transactionData?.progress?.stage || fetchedData?.progress?.stage || localStage;
    // Αν το transaction είναι ενεργό (INTERESTED), εμφανίζουμε PENDING ανεξάρτητα από το stage
    if (transactionData?.status === 'INTERESTED') {
      return 'PENDING';
    }
    // Αν το transaction είναι ενεργό αλλά το στάδιο είναι CANCELLED, εμφανίζουμε PENDING
    if (transactionData?.status === 'INTERESTED' && stage === 'CANCELLED') {
      return 'PENDING';
    }
    // Αν το transaction.stage είναι CANCELLED αλλά το status είναι INTERESTED, εμφανίζουμε PENDING
    if (transactionData?.stage === 'CANCELLED' && transactionData?.status === 'INTERESTED') {
      return 'PENDING';
    }
    return stage;
  })();
  const effectiveUpdates = transactionData?.progress?.notifications || [];
  const effectiveLead = transactionData?.buyer || props.lead;
  const effectiveProperty = transactionData?.property || props.property;
  const effectiveAgent = transactionData?.agent || props.agent;

  // Update stage status calculation
  const getStageStatus = (stageId: string) => {
    const stageOrder = {
      'PENDING': 0,
      'MEETING_SCHEDULED': 1,
      'DEPOSIT_PAID': 2,
      'FINAL_SIGNING': 3,
      'COMPLETED': 4,
      'CANCELLED': 5
    };

    console.log('=== Stage Status Calculation ===', {
      stageId,
      effectiveStage,
      timestamp: new Date().toISOString()
    });

    // Αν το transaction είναι ενεργό (INTERESTED), χρησιμοποιούμε PENDING ανεξάρτητα από το stage
    const displayStage = (() => {
      if (transactionData?.status === 'INTERESTED') {
        return 'PENDING';
      }
      if (effectiveStage === 'CANCELLED' && transactionData?.status === 'INTERESTED') {
        return 'PENDING';
      }
      if (transactionData?.stage === 'CANCELLED' && transactionData?.status === 'INTERESTED') {
        return 'PENDING';
      }
      return effectiveStage;
    })();

    if (displayStage === 'CANCELLED') {
      return stageId === 'CANCELLED' ? 'completed' : 'cancelled';
    }

    const currentStageIndex = stageOrder[displayStage as keyof typeof stageOrder] || 0;
    const targetStageIndex = stageOrder[stageId as keyof typeof stageOrder];

    if (targetStageIndex < currentStageIndex) {
      return 'completed';
    } else if (targetStageIndex === currentStageIndex) {
      return 'in-progress';
    } else {
      return 'pending';
    }
  };

  // Log initial mount
  useEffect(() => {
    console.log('=== LeadDetailsModal IDs ===', {
      leadId: lead?.id || 'NO_LEAD_ID',
      propertyId: property?.id,
      currentStage,
      timestamp: new Date().toISOString()
    });
  }, [lead?.id, property?.id, currentStage]);

  // Log initial data when component mounts
  useEffect(() => {
    serverLog('INITIAL_DATA', {
      lead: {
        id: lead?.id,
        status: lead?.status,
        createdAt: lead?.createdAt,
        updatedAt: lead?.updatedAt,
        buyerInfo: lead?.buyer,
        agentInfo: lead?.agent,
        notes: lead?.notes
      },
      property: {
        title: propertyTitle,
        details: {
          id: property?.id,
          location: property?.location,
          price: property?.price,
          bedrooms: property?.bedrooms,
          bathrooms: property?.bathrooms,
          area: property?.area,
          featuresCount: property?.features?.length,
          imagesCount: property?.images?.length
        }
      },
      updates: {
        totalUpdates: updates.length,
        updatesByCategory: {
          appointment: updates.filter((u: any) => u.category === 'appointment').length,
          offer: updates.filter((u: any) => u.category === 'offer').length,
          contract: updates.filter((u: any) => u.category === 'contract').length,
          payment: updates.filter((u: any) => u.category === 'payment').length,
          completion: updates.filter((u: any) => u.category === 'completion').length,
          general: updates.filter((u: any) => u.category === 'general').length
        },
        unreadUpdates: updates.filter((u: any) => u.isUnread).length
      },
      currentStage
    });
  }, [currentStage, updates.length]);

  // Ομαδοποίηση ενημερώσεων ανά κατηγορία
  const updatesByCategory = {
    appointment: (updates || []).filter((update: any) => update.category === 'appointment'),
    offer: (updates || []).filter((update: any) => update.category === 'offer'),
    contract: (updates || []).filter((update: any) => update.category === 'contract'),
    payment: (updates || []).filter((update: any) => update.category === 'payment'),
    completion: (updates || []).filter((update: any) => update.category === 'completion'),
    general: (updates || []).filter((update: any) => update.category === 'general')
  };

  // Φιλτράρισμα ενημερώσεων βάσει ενεργού tab και αναζήτησης
  const filteredUpdates = activeTab === 'all' 
    ? updates 
    : updates.filter((update: any) => update.category === activeTab);

  const searchedUpdates = searchQuery.trim() === '' 
    ? filteredUpdates 
    : filteredUpdates.filter((update: any) => 
        update.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        update.date.includes(searchQuery)
      );

  // Εμφάνιση μόνο των πιο πρόσφατων ενημερώσεων ανά κατηγορία
  const recentUpdates = {
    appointment: updatesByCategory.appointment.slice(0, 2),
    offer: updatesByCategory.offer.slice(0, 2),
    contract: updatesByCategory.contract.slice(0, 2),
    payment: updatesByCategory.payment.slice(0, 2),
    completion: updatesByCategory.completion.slice(0, 2),
    general: updatesByCategory.general.slice(0, 2)
  };

  // Επιλογή ενημερώσεων για εμφάνιση (πρόσφατες ή φιλτραρισμένες)
  const displayUpdates = isFullscreen ? searchedUpdates : 
    activeTab === 'all' 
      ? Object.values(recentUpdates).flat().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)
      : recentUpdates[activeTab as keyof typeof recentUpdates];

  // Υπολογισμός συνολικού αριθμού ενημερώσεων ανά κατηγορία
  const updatesCount = {
    all: updates.length,
    appointment: updatesByCategory.appointment.length,
    offer: updatesByCategory.offer.length,
    contract: updatesByCategory.contract.length,
    payment: updatesByCategory.payment.length,
    completion: updatesByCategory.completion.length,
    general: updatesByCategory.general.length
  };

  // Υπολογισμός μη αναγνωσμένων ενημερώσεων ανά κατηγορία
  const unreadCount = {
    all: updates.filter((u: any) => u.isUnread).length,
    appointment: updatesByCategory.appointment.filter((u: any) => u.isUnread).length,
    offer: updatesByCategory.offer.filter((u: any) => u.isUnread).length,
    contract: updatesByCategory.contract.filter((u: any) => u.isUnread).length,
    payment: updatesByCategory.payment.filter((u: any) => u.isUnread).length,
    completion: updatesByCategory.completion.filter((u: any) => u.isUnread).length,
    general: updatesByCategory.general.filter((u: any) => u.isUnread).length
  };

  // Εικονίδια για κάθε κατηγορία
  const categoryIcons = {
    all: <FaBell className="w-4 h-4" />,
    appointment: <FaCalendarAlt className="w-4 h-4" />,
    offer: <FaHandshake className="w-4 h-4" />,
    contract: <FaFileContract className="w-4 h-4" />,
    payment: <FaMoneyBillWave className="w-4 h-4" />,
    completion: <FaCheckDouble className="w-4 h-4" />,
    general: <FaComment className="w-4 h-4" />
  };

  // Ετικέτες για κάθε κατηγορία
  const categoryLabels = {
    all: 'Όλες',
    appointment: 'Ραντεβού',
    offer: 'Προσφορά',
    contract: 'Συμβόλαιο',
    payment: 'Πληρωμή',
    completion: 'Ολοκλήρωση',
    general: 'Γενικές'
  };

  // Χρώματα για κάθε κατηγορία
  const categoryColors = {
    all: 'bg-blue-100 text-blue-800',
    appointment: 'bg-purple-100 text-purple-800',
    offer: 'bg-orange-100 text-orange-800',
    contract: 'bg-indigo-100 text-indigo-800',
    payment: 'bg-green-100 text-green-800',
    completion: 'bg-teal-100 text-teal-800',
    general: 'bg-gray-100 text-gray-800'
  };

  // Add logging for updates filtering
  useEffect(() => {
    console.log('=== Updates Filtering Debug ===');
    console.log('Current filter state:', {
      activeTab,
      searchQuery,
      isFullscreen,
      filteredUpdatesCount: filteredUpdates.length,
      displayUpdatesCount: displayUpdates.length
    });
  }, [activeTab, searchQuery, isFullscreen]);

  // Add debug log for each render update
  useEffect(() => {
    console.log('=== Component Update Debug ===');
    console.log('Component updated with:', {
      localStage,
      currentStage,
      leadStatus: lead?.status,
      timestamp: new Date().toISOString()
    });
  });

  useEffect(() => {
    console.log('LeadDetailsModal mounted/updated:', {
      currentStage,
      leadStatus: lead?.status
    });
  }, [currentStage, lead?.status]);

  // Add polling effect for transaction updates
  useEffect(() => {
    if (!props.id) return;

    console.log('[DEBUG] LeadDetailsModal - Polling started for transaction:', props.id);
    console.log('[DEBUG] LeadDetailsModal - Current stage:', effectiveStage);

    const pollTransaction = async () => {
      try {
        console.log('[DEBUG] LeadDetailsModal - Polling transaction:', props.id);
        const response = await fetch(`/api/admin/transactions/${props.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transaction');
        }
        
        const transaction = await response.json();
        console.log('[DEBUG] LeadDetailsModal - Received transaction update:', {
          id: transaction.id,
          stage: transaction.progress?.stage,
          previousStage: effectiveStage
        });
        
        setTransactionData(transaction);
        
        // Ενημερώνουμε το localStage αν υπάρχει νέο stage
        if (transaction.progress?.stage && transaction.progress.stage !== localStage) {
          console.log('Updating stage from', localStage, 'to', transaction.progress.stage);
          setLocalStage(transaction.progress.stage);
        }
      } catch (error) {
        console.error('[DEBUG] LeadDetailsModal - Error polling transaction:', error);
      }
    };

    // Initial poll
    pollTransaction();

    // Set up polling interval
    const interval = setInterval(pollTransaction, 5000);

    // Cleanup
    return () => {
      console.log('[DEBUG] LeadDetailsModal - Polling stopped for transaction:', props.id);
      clearInterval(interval);
    };
  }, [props.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 max-w-none max-h-none rounded-none' : ''
        }`}
      >
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-[#001f3f] to-[#003366] text-white p-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">Λεπτομέρειες Ενδιαφερόμενου</h2>
            <ModernBadge variant="info">
              {currentStage}
            </ModernBadge>
          </div>
          <div className="flex items-center space-x-3">
            <ModernButton
              onClick={() => setIsFullscreen(!isFullscreen)}
              variant="outline"
              className="text-white border-white hover:bg-white/10 px-3 py-1.5 text-sm flex items-center"
            >
              {isFullscreen ? (
                <>
                  <FaCompress className="w-3.5 h-3.5" />
                  <span className="ml-1.5">Συμπαγής</span>
                </>
              ) : (
                <>
                  <FaExpand className="w-3.5 h-3.5" />
                  <span className="ml-1.5">Πλήρης</span>
                </>
              )}
            </ModernButton>
            <ModernButton
              onClick={props.onClose}
              variant="outline"
              className="text-white border-white hover:bg-white/10"
            >
              <FaTimes className="w-5 h-5" />
            </ModernButton>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto">
          <Tab.Group>
            <Tab.List className="flex space-x-2 mb-6">
              <Tab
                className={({ selected }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selected
                      ? 'bg-[#001f3f] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`
                }
              >
                <FaUser className="inline-block mr-2" />
                Πληροφορίες
              </Tab>
              <Tab
                className={({ selected }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selected
                      ? 'bg-[#001f3f] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`
                }
              >
                <FaBell className="inline-block mr-2" />
                Ενημερώσεις
              </Tab>
              <Tab
                className={({ selected }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selected
                      ? 'bg-[#001f3f] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`
                }
              >
                <FaChartLine className="inline-block mr-2" />
                Πρόοδος
              </Tab>
            </Tab.List>

            <Tab.Panels>
              <Tab.Panel>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Buyer Info Card */}
                  <ModernCard>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Στοιχεία Αγοραστή</h3>
                    </div>
                    
                    {/* Επεξήγηση για το blur effect */}
                    {shouldBlurLeadInfo(effectiveStage) && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-blue-700 leading-relaxed">
                              <span className="font-medium">🔒 Προστασία Πλατφόρμας:</span> Τα στοιχεία εμφανίζονται ως <span className="font-medium">••••••••</span> 
                              μέχρι να προχωρήσει η συναλλαγή στο στάδιο <span className="font-semibold">"Έγινε Προκαταβολή"</span>.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Όνομα:</span>
                        <span className={`font-medium ${shouldBlurLeadInfo(effectiveStage) ? 'blur-sm select-none' : ''}`}>
                          {shouldBlurLeadInfo(effectiveStage) ? '••••••••' : lead?.buyer.name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Email:</span>
                        <span className={`font-medium ${shouldBlurLeadInfo(effectiveStage) ? 'blur-sm select-none' : ''}`}>
                          {shouldBlurLeadInfo(effectiveStage) ? '••••••••••••••••••••••••••••••••' : lead?.buyer.email}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Τηλέφωνο:</span>
                        <span className={`font-medium ${shouldBlurLeadInfo(effectiveStage) ? 'blur-sm select-none' : ''}`}>
                          {shouldBlurLeadInfo(effectiveStage) ? '••••••••••••••••••••••••••••••••' : (lead?.buyer.phone || 'Δεν έχει δοθεί')}
                        </span>
                      </div>
                      {shouldBlurLeadInfo(effectiveStage) && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                            🔒 Τα στοιχεία είναι κρυφά μέχρι να προχωρήσει η συναλλαγή
                          </span>
                        </div>
                      )}
                    </div>
                  </ModernCard>

                  {/* Property Info Card */}
                  <ModernCard>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <FaHome className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Ακίνητο</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Τίτλος:</span>
                        <span className="font-medium">{propertyTitle}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Τοποθεσία:</span>
                        <span className="font-medium">{property?.location}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Τιμή:</span>
                        <span className="font-medium">{property?.price}€</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <FaBed className="text-gray-500 mr-2" />
                          <span>{property?.bedrooms} Υ/Δ</span>
                        </div>
                        <div className="flex items-center">
                          <FaBath className="text-gray-500 mr-2" />
                          <span>{property?.bathrooms} Μπάνια</span>
                        </div>
                        <div className="flex items-center">
                          <FaRulerCombined className="text-gray-500 mr-2" />
                          <span>{property?.area}m²</span>
                        </div>
                      </div>
                    </div>
                  </ModernCard>

                  {/* Agent Info Card - Only shown if agent exists */}
                  {agent && (
                    <ModernCard>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <FaUserTie className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Στοιχεία Μεσίτη</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <span className="text-gray-600 w-24">Όνομα:</span>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-gray-600 w-24">Email:</span>
                          <span className="font-medium">{agent.email}</span>
                        </div>
                        {agent.phone && (
                          <div className="flex items-center">
                            <span className="text-gray-600 w-24">Τηλέφωνο:</span>
                            <span className="font-medium">{agent.phone}</span>
                          </div>
                        )}
                        <div className="mt-4 flex space-x-3">
                          <ModernButton
                            onClick={() => window.location.href = `mailto:${agent.email}`}
                            variant="outline"
                            className="flex-1 flex items-center justify-center"
                          >
                            <FaEnvelope className="w-4 h-4 mr-2" />
                            Αποστολή Email
                          </ModernButton>
                          {agent.phone && (
                            <ModernButton
                              onClick={() => window.location.href = `tel:${agent.phone}`}
                              variant="outline"
                              className="flex-1 flex items-center justify-center"
                            >
                              <FaPhone className="w-4 h-4 mr-2" />
                              Κλήση
                            </ModernButton>
                          )}
                        </div>
                      </div>
                    </ModernCard>
                  )}
                </div>
              </Tab.Panel>

              <Tab.Panel>
                <ModernCard>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Ενημερώσεις</h3>
                    {isFullscreen && (
                      <div className="relative w-64">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Αναζήτηση ενημερώσεων..."
                          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
                        />
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {displayUpdates.map((update: Update) => (
                      <motion.div
                        key={update.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-lg border-l-4 ${
                          update.isUnread ? 'border-[#001f3f] bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-500">{update.date}</span>
                          <ModernBadge variant={update.category === 'appointment' ? 'info' : 'success'}>
                            {update.category}
                          </ModernBadge>
                        </div>
                        <p className="text-gray-800">{update.text}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <div className="flex">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Προσθέστε σημείωση..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
                      />
                      <ModernButton
                        onClick={() => {
                          if (newNote.trim() === '') return;
                          if (props.onAddNote) {
                            props.onAddNote(newNote);
                          }
                          setNewNote('');
                        }}
                        className="rounded-l-none"
                      >
                        Προσθήκη
                      </ModernButton>
                    </div>
                  </div>
                </ModernCard>
              </Tab.Panel>

              <Tab.Panel>
                <ModernCard>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaChartLine className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Πρόοδος Συναλλαγής</h3>
                  </div>

                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200 rounded-full"></div>
                    
                    <div className="space-y-8">
                      {stages.map((stage, index) => (
                        <motion.div
                          key={stage.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start group"
                        >
                          <div
                            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                              getStageStatus(stage.id) === 'completed'
                                ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                : getStageStatus(stage.id) === 'in-progress'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 animate-pulse'
                                : getStageStatus(stage.id) === 'cancelled'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {React.createElement(stage.icon, { className: 'w-6 h-6' })}
                          </div>

                          <div className="ml-6 flex-1">
                            <div className="flex items-center">
                              <h4
                                className={`font-semibold text-lg ${
                                  getStageStatus(stage.id) === 'completed'
                                    ? 'text-green-600'
                                    : getStageStatus(stage.id) === 'in-progress'
                                    ? 'text-blue-600'
                                    : getStageStatus(stage.id) === 'cancelled'
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {stage.title}
                              </h4>
                            </div>
                            <p className="mt-2 text-gray-600">{stage.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </ModernCard>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </motion.div>
    </motion.div>
  );
} 