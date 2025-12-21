'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaEnvelopeOpen, FaReply, FaTrash, FaCheckCircle, FaExclamationCircle, FaClock, FaBuilding, FaExchangeAlt, FaUser, FaPaperPlane, FaPlus, FaTimes, FaHeadset, FaSearch, FaPhone, FaVideo, FaEllipsisH, FaComments, FaRocket, FaLightbulb, FaShieldAlt, FaCog, FaCreditCard, FaQuestionCircle, FaExpand, FaCompress, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

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
  createdByUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  property?: {
    id: string;
    title: string;
    address: string;
  };
  transaction?: {
    id: string;
    status: string;
  };
  messages: SupportMessage[];
  _count: {
    messages: number;
  };
}

interface SupportMessage {
  id: string;
  content: string;
  isFromAdmin: boolean;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Property {
  id: string;
  title: string;
  address: string;
}

interface Transaction {
  id: string;
  status: string;
  property: {
    id: string;
    title: string;
  };
}

interface SupportCenterProps {
  userProperties?: Property[];
  userTransactions?: Transaction[];
  selectedTicketId?: string | null;
}

const categoryLabels = {
  PROPERTY_INQUIRY: 'Ερώτηση για Ακίνητο',
  TRANSACTION_ISSUE: 'Πρόβλημα με Συναλλαγή',
  TECHNICAL_SUPPORT: 'Τεχνική Υποστήριξη',
  ACCOUNT_ISSUE: 'Πρόβλημα με Λογαριασμό',
  PAYMENT_ISSUE: 'Πρόβλημα με Πληρωμή',
  GENERAL: 'Γενικό Ερώτημα'
};

const categoryIcons = {
  PROPERTY_INQUIRY: FaBuilding,
  TRANSACTION_ISSUE: FaExchangeAlt,
  TECHNICAL_SUPPORT: FaCog,
  ACCOUNT_ISSUE: FaUser,
  PAYMENT_ISSUE: FaCreditCard,
  GENERAL: FaQuestionCircle
};

const priorityColors = {
  LOW: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200'
};

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusLabels = {
  OPEN: 'Ανοιχτό',
  IN_PROGRESS: 'Σε Εξέλιξη',
  RESOLVED: 'Επιλύθηκε',
  CLOSED: 'Κλειστό'
};

const priorityLabels = {
  LOW: 'Χαμηλή',
  MEDIUM: 'Μεσαία',
  HIGH: 'Υψηλή',
  URGENT: 'Επείγον'
};

const categories = [
  { id: 'GENERAL', label: 'Γενικό Ερώτημα', icon: FaQuestionCircle },
  { id: 'PROPERTY_INQUIRY', label: 'Ερώτηση για Ακίνητο', icon: FaBuilding },
  { id: 'TRANSACTION_ISSUE', label: 'Πρόβλημα με Συναλλαγή', icon: FaExchangeAlt },
  { id: 'TECHNICAL_SUPPORT', label: 'Τεχνική Υποστήριξη', icon: FaCog },
  { id: 'ACCOUNT_ISSUE', label: 'Πρόβλημα με Λογαριασμό', icon: FaUser },
  { id: 'PAYMENT_ISSUE', label: 'Πρόβλημα με Πληρωμή', icon: FaCreditCard }
];

const priorities = [
  { id: 'LOW', label: 'Χαμηλή', color: 'text-emerald-600' },
  { id: 'MEDIUM', label: 'Μεσαία', color: 'text-amber-600' },
  { id: 'HIGH', label: 'Υψηλή', color: 'text-orange-600' },
  { id: 'URGENT', label: 'Επείγον', color: 'text-red-600' }
];

export default function SupportCenter({ userProperties = [], userTransactions = [], selectedTicketId }: SupportCenterProps) {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'GENERAL' as keyof typeof categoryLabels,
    priority: 'MEDIUM' as keyof typeof priorityLabels,
    propertyId: '',
    transactionId: '',
    selectedRole: ''
  });
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  
  // Νέα state για επιλογή ρόλου
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | 'agent' | ''>('');
  const [roleSpecificProperties, setRoleSpecificProperties] = useState<Property[]>([]);
  const [roleSpecificTransactions, setRoleSpecificTransactions] = useState<Transaction[]>([]);

  // Helper function to determine if user started the conversation
  const isUserStartedConversation = () => {
    if (!selectedTicket || !session?.user) return true;
    
    // Check if the ticket was created by a user (not admin)
    // This determines if we should show the initial message
    // If createdByUser is not available, fallback to user role
    const creatorRole = selectedTicket.createdByUser?.role || selectedTicket.user?.role;
    return creatorRole !== 'admin' && creatorRole !== 'ADMIN';
  };

  // Νέα συνάρτηση για φόρτωση δεδομένων βάσει ρόλου
  const loadRoleSpecificData = async (role: 'buyer' | 'seller' | 'agent') => {
    try {
      const response = await fetch(`/api/support/user-data?role=${role}`);
      if (response.ok) {
        const data = await response.json();
        setRoleSpecificProperties(data.properties || []);
        setRoleSpecificTransactions(data.transactions || []);
      } else {
        console.error('Failed to load role-specific data');
        setRoleSpecificProperties([]);
        setRoleSpecificTransactions([]);
      }
    } catch (error) {
      console.error('Error loading role-specific data:', error);
      setRoleSpecificProperties([]);
      setRoleSpecificTransactions([]);
    }
  };

  // Συνάρτηση για επαναφορά του form όταν κλείνει το modal
  const resetNewTicketForm = () => {
    setNewTicket({
      title: '',
      description: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      propertyId: '',
      transactionId: '',
      selectedRole: ''
    });
    setSelectedRole('');
    setRoleSpecificProperties([]);
    setRoleSpecificTransactions([]);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Ελέγχουμε αν υπάρχει selectedTicketId και ανοίγουμε το συγκεκριμένο ticket
  useEffect(() => {
    if (selectedTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
        fetchTicketMessages(ticket.id);
      }
    }
  }, [selectedTicketId, tickets]);

  // Κλείνουμε το μεγεθυμένο chat όταν αλλάζει το selectedTicket
  useEffect(() => {
    if (!selectedTicket) {
      setIsChatExpanded(false);
    }
  }, [selectedTicket]);

  // Keyboard shortcuts για το μεγεθυμένο chat
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isChatExpanded) {
        setIsChatExpanded(false);
      }
    };

    if (isChatExpanded) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatExpanded]);

  const fetchTickets = async () => {
    try {
      const response = await fetchFromBackend('/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      } else {
        toast.error('Σφάλμα στη φόρτωση των μηνυμάτων');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Σφάλμα στη φόρτωση των μηνυμάτων');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const response = await fetchFromBackend(`/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(prev => prev ? { ...prev, messages: data.messages } : null);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || (!replyText.trim() && !selectedOption)) return;

    try {
      setSendingReply(true);
      const content = selectedOption || replyText;
      
      const { data } = await apiClient.post('/support/messages', {
        ticketId: selectedTicket.id,
        content: content
      });

      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, data.message]
      } : null);
      setReplyText('');
      setSelectedOption('');
      toast.success('Το μήνυμα στάλθηκε επιτυχώς');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Σφάλμα κατά την αποστολή του μηνύματος');
    } finally {
      setSendingReply(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const isMultipleChoiceMessage = (message: SupportMessage) => {
    return message.metadata && message.metadata.isMultipleChoice && message.metadata.options;
  };

  // Νέα συνάρτηση για έλεγχο αν υπάρχει μήνυμα πολλαπλής επιλογής που δεν έχει απαντηθεί
  const hasUnansweredMultipleChoiceMessage = () => {
    if (!selectedTicket || !selectedTicket.messages || selectedTicket.messages.length === 0) {
      return false;
    }

    // Βρίσκουμε το τελευταίο μήνυμα από τον admin
    const adminMessages = selectedTicket.messages.filter(msg => msg.isFromAdmin);
    if (adminMessages.length === 0) {
      return false;
    }

    const lastAdminMessage = adminMessages[adminMessages.length - 1];
    
    // Ελέγχουμε αν είναι μήνυμα πολλαπλής επιλογής
    if (!isMultipleChoiceMessage(lastAdminMessage)) {
      return false;
    }

    // Ελέγχουμε αν υπάρχει απάντηση μετά από αυτό το μήνυμα
    const lastAdminMessageIndex = selectedTicket.messages.findIndex(msg => msg.id === lastAdminMessage.id);
    const hasReplyAfter = selectedTicket.messages.some((msg, index) => 
      index > lastAdminMessageIndex && !msg.isFromAdmin
    );

    return !hasReplyAfter;
  };

  // Νέα συνάρτηση για έλεγχο αν το textarea πρέπει να είναι απενεργοποιημένο
  const isTextareaDisabled = () => {
    return hasUnansweredMultipleChoiceMessage();
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim() || !selectedRole) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία και επιλέξτε ρόλο');
      return;
    }

    try {
      const { data } = await apiClient.post('/support/tickets', newTicket);
      setTickets(prev => [data.ticket, ...prev]);
      setShowNewTicketForm(false);
      resetNewTicketForm();
      toast.success('Το ticket δημιουργήθηκε επιτυχώς');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Σφάλμα κατά τη δημιουργία του ticket');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('el-GR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.property?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[700px] flex flex-col border border-gray-100">
      {/* Enhanced Header */}
      <div className="p-6 border-b bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <FaHeadset className="text-2xl" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold">Live Chat Support</h2>
              <p className="text-indigo-100 text-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>Επικοινωνήστε άμεσα με την ομάδα μας</span>
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewTicketForm(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 backdrop-blur-sm border border-white border-opacity-30"
          >
            <FaPlus className="text-sm" />
            <span className="font-medium">Νέο Μήνυμα</span>
          </motion.button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Enhanced Conversations List */}
        <div className={`${isChatExpanded ? 'hidden' : 'w-1/3'} border-r bg-gradient-to-b from-gray-50 to-white flex flex-col transition-all duration-300`}>
          <div className="p-4 border-b bg-white flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Αναζήτηση συνομιλιών..."
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none text-sm transition-all duration-300"
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 text-center text-gray-500"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaEnvelope className="text-2xl text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Δεν υπάρχουν συνομιλίες</p>
                <p className="text-xs text-gray-400">Ξεκινήστε μια νέα συνομιλία</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredTickets.map((ticket, index) => {
                  const CategoryIcon = categoryIcons[ticket.category];
                  return (
                    <motion.button
                      key={ticket.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchTicketMessages(ticket.id);
                      }}
                      className={`w-full p-4 text-left transition-all duration-300 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                        selectedTicket?.id === ticket.id ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                          ticket.status === 'OPEN' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                          ticket.status === 'RESOLVED' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                          'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          <CategoryIcon className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {ticket.property?.title || ticket.title || 'Γενικό Ερώτημα'}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {formatDate(ticket.updatedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {ticket.user?.name || 'Unknown User'} • {ticket.title}
                          </p>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
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
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs rounded-full border ${statusColors[ticket.status]}`}>
                              {statusLabels[ticket.status]}
                            </span>
                            <span className={`px-3 py-1 text-xs rounded-full border ${priorityColors[ticket.priority]}`}>
                              {priorityLabels[ticket.priority]}
                            </span>
                            {ticket._count.messages > 0 && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {ticket._count.messages} μηνύματα
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Enhanced Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedTicket ? (
            <>
              {/* Enhanced Chat Header */}
              <div className="p-6 border-b bg-white flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                    <FaShieldAlt className="text-lg" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">
                      Admin Υποστήριξης
                    </h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-green-600 font-medium">Online</span>
                      </div>
                      <span>•</span>
                      <span>Επικοινωνείτε με την ομάδα υποστήριξης</span>
                      <span>•</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {formatDate(selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-full">
                      <FaClock className="inline mr-1" />
                      Απάντηση συνήθως σε λιγότερο από 1 ώρα
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsChatExpanded(!isChatExpanded)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 relative group"
                      title={isChatExpanded ? "Σμίκρυνση (ESC)" : "Μεγέθυνση"}
                    >
                      {isChatExpanded ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                        {isChatExpanded ? "Σμίκρυνση (ESC)" : "Μεγέθυνση chat"}
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                      {/* Indicator για διαθέσιμη μεγέθυνση */}
                      {!isChatExpanded && selectedTicket && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"
                        />
                      )}
                    </motion.button>
                    {isChatExpanded && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsChatExpanded(false)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                        title="Επιστροφή στη λίστα"
                      >
                        <FaComments className="w-5 h-5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white min-h-0">
                {/* Initial Message - Show only if user started the conversation */}
                {isUserStartedConversation() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end mb-6"
                  >
                    <div className="flex items-start space-x-4 max-w-2xl flex-row-reverse space-x-reverse">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                        {selectedTicket.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-sm font-bold text-white">
                            {selectedTicket.user?.name || 'Unknown User'}
                          </span>
                          {(selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
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
                          <span className="text-xs text-blue-100 bg-blue-600 bg-opacity-50 px-2 py-1 rounded-full">
                            {formatDate(selectedTicket.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-white mb-3 font-semibold">{selectedTicket.title}</p>
                        <p className="text-sm text-blue-100 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                        {(selectedTicket.property || selectedTicket.transaction) && (
                          <div className="mt-4 pt-4 border-t border-blue-400 border-opacity-50">
                            {selectedTicket.property && (
                              <div className="flex items-center text-xs text-blue-200 mb-2">
                                <FaBuilding className="mr-2" />
                                <span>Ακίνητο: {selectedTicket.property.title}</span>
                              </div>
                            )}
                            {selectedTicket.transaction && (
                              <div className="flex items-center text-xs text-blue-200">
                                <FaExchangeAlt className="mr-2" />
                                <span>Συναλλαγή: {selectedTicket.transaction.status}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Conversation Messages */}
                <AnimatePresence>
                  {(selectedTicket.messages ?? []).map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'} mb-6`}
                    >
                      <div className={`flex items-start space-x-4 max-w-2xl ${message.isFromAdmin ? '' : 'flex-row-reverse space-x-reverse'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                          message.isFromAdmin 
                            ? 'bg-gradient-to-br from-gray-500 to-gray-600' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          {message.isFromAdmin ? 'A' : (message.user?.name?.charAt(0) || 'U')}
                        </div>
                        <div className={`rounded-2xl p-4 shadow-lg ${
                          message.isFromAdmin
                            ? 'bg-white text-gray-900 border-2 border-gray-100'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                        }`}>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-sm font-bold">
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
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.isFromAdmin 
                                ? 'text-gray-500 bg-gray-100' 
                                : 'text-blue-100 bg-blue-600 bg-opacity-50'
                            }`}>
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                            message.isFromAdmin ? 'text-gray-700' : 'text-white'
                          }`}>
                            {message.content}
                          </p>
                          
                          {/* Εμφάνιση επιλογών πολλαπλής επιλογής */}
                          {isMultipleChoiceMessage(message) && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Επιλέξτε μια απάντηση:</p>
                              <div className="space-y-2">
                                {message.metadata.options.map((option: string, index: number) => (
                                  <button
                                    key={index}
                                    onClick={() => handleOptionSelect(option)}
                                    className={`w-full text-left p-2 rounded-lg border transition-colors ${
                                      selectedOption === option
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="text-sm">{option}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Enhanced Message Input */}
              <div className="p-6 border-t bg-white flex-shrink-0">
                {/* Εμφάνιση επιλεγμένης απάντησης */}
                {selectedOption && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-700">Επιλεγμένη απάντηση:</span>
                        <span className="text-sm text-blue-600">{selectedOption}</span>
                      </div>
                      <button
                        onClick={() => setSelectedOption('')}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaTimes className="text-sm" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Εμφάνιση μηνύματος όταν το textarea είναι απενεργοποιημένο */}
                {isTextareaDisabled() && !selectedOption && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FaInfoCircle className="text-amber-600 text-sm" />
                      <span className="text-sm font-medium text-amber-700">
                        Παρακαλώ επιλέξτε μια απάντηση από τις παραπάνω επιλογές και πατήστε "Αποστολή".
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        isTextareaDisabled() 
                          ? "Επιλέξτε μια απάντηση και πατήστε 'Αποστολή'..." 
                          : selectedOption 
                            ? "Προσθέστε επιπλέον σχόλια (προαιρετικό)..." 
                            : "Γράψτε το μήνυμά σας..."
                      }
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none resize-none transition-all duration-300"
                      rows={3}
                      disabled={isTextareaDisabled()}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendReply}
                    disabled={(!replyText.trim() && !selectedOption) || sendingReply}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-3 shadow-lg"
                  >
                    {sendingReply ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <FaPaperPlane className="text-sm" />
                        <span className="font-medium">Αποστολή</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center text-gray-500"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaComments className="text-4xl text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Επιλέξτε μια συνομιλία</h3>
                <p className="text-gray-500 max-w-md">
                  Επιλέξτε μια συνομιλία από τη λίστα για να δείτε τα μηνύματα και να επικοινωνήσετε με την ομάδα υποστήριξης
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Expanded Chat Modal */}
      <AnimatePresence>
        {isChatExpanded && selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-4/5 h-4/5 max-w-5xl flex flex-col overflow-hidden"
            >
              {/* Expanded Chat Header */}
              <div className="p-4 border-b bg-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-blue-500">
                      <FaShieldAlt className="text-base" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        Admin Υποστήριξης
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-green-600 font-medium">Online</span>
                        <span>•</span>
                        <span>{formatDate(selectedTicket.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsChatExpanded(false)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300"
                      title="Κλείσιμο"
                    >
                      <FaTimes className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Expanded Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white min-h-0">
                {/* Initial Message - Show only if user started the conversation */}
                {isUserStartedConversation() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end mb-6"
                  >
                    <div className="flex items-start space-x-3 max-w-2xl flex-row-reverse space-x-reverse">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-blue-500">
                        {selectedTicket.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="bg-blue-500 text-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-bold text-white">
                            {selectedTicket.user?.name || 'Unknown User'}
                          </span>
                          {(selectedTicket.selectedRole || selectedTicket.user?.role || selectedTicket.createdByUser?.role) && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
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
                          <span className="text-xs text-blue-100 bg-blue-600 bg-opacity-50 px-2 py-1 rounded-full">
                            {formatDate(selectedTicket.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-white mb-2 font-semibold">{selectedTicket.title}</p>
                        <p className="text-sm text-blue-100 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                        {(selectedTicket.property || selectedTicket.transaction) && (
                          <div className="mt-3 pt-2 border-t border-blue-400 border-opacity-50">
                            {selectedTicket.property && (
                              <div className="flex items-center text-xs text-blue-200 mb-1">
                                <FaBuilding className="mr-1" />
                                <span>Ακίνητο: {selectedTicket.property.title}</span>
                              </div>
                            )}
                            {selectedTicket.transaction && (
                              <div className="flex items-center text-xs text-blue-200">
                                <FaExchangeAlt className="mr-1" />
                                <span>Συναλλαγή: {selectedTicket.transaction.status}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Conversation Messages */}
                <AnimatePresence>
                  {(selectedTicket.messages ?? []).map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'} mb-4`}
                    >
                      <div className={`flex items-start space-x-3 max-w-2xl ${message.isFromAdmin ? '' : 'flex-row-reverse space-x-reverse'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                          message.isFromAdmin 
                            ? 'bg-gray-500' 
                            : 'bg-blue-500'
                        }`}>
                          {message.isFromAdmin ? 'A' : (message.user?.name?.charAt(0) || 'U')}
                        </div>
                        <div className={`rounded-lg p-3 shadow-sm ${
                          message.isFromAdmin
                            ? 'bg-white text-gray-900 border border-gray-200'
                            : 'bg-blue-500 text-white'
                        }`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-bold">
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
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.isFromAdmin 
                                ? 'text-gray-500 bg-gray-100' 
                                : 'text-blue-100 bg-blue-600 bg-opacity-50'
                            }`}>
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                            message.isFromAdmin ? 'text-gray-700' : 'text-white'
                          }`}>
                            {message.content}
                          </p>
                          
                          {/* Εμφάνιση επιλογών πολλαπλής επιλογής */}
                          {isMultipleChoiceMessage(message) && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Επιλέξτε μια απάντηση:</p>
                              <div className="space-y-2">
                                {message.metadata.options.map((option: string, index: number) => (
                                  <button
                                    key={index}
                                    onClick={() => handleOptionSelect(option)}
                                    className={`w-full text-left p-2 rounded-lg border transition-colors ${
                                      selectedOption === option
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="text-sm">{option}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Expanded Message Input */}
              <div className="p-4 border-t bg-white flex-shrink-0">
                {/* Εμφάνιση επιλεγμένης απάντησης */}
                {selectedOption && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-blue-700">Επιλεγμένη απάντηση:</span>
                        <span className="text-xs text-blue-600">{selectedOption}</span>
                      </div>
                      <button
                        onClick={() => setSelectedOption('')}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Εμφάνιση μηνύματος όταν το textarea είναι απενεργοποιημένο */}
                {isTextareaDisabled() && !selectedOption && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FaInfoCircle className="text-amber-600 text-xs" />
                      <span className="text-xs font-medium text-amber-700">
                        Παρακαλώ επιλέξτε μια απάντηση από τις παραπάνω επιλογές και πατήστε "Αποστολή".
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        isTextareaDisabled() 
                          ? "Επιλέξτε μια απάντηση και πατήστε 'Αποστολή'..." 
                          : selectedOption 
                            ? "Προσθέστε επιπλέον σχόλια (προαιρετικό)..." 
                            : "Γράψτε το μήνυμά σας..."
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none transition-all duration-300 text-sm"
                      rows={3}
                      disabled={isTextareaDisabled()}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendReply}
                    disabled={(!replyText.trim() && !selectedOption) || sendingReply}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 shadow-sm"
                  >
                    {sendingReply ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <FaPaperPlane className="text-sm" />
                        <span className="font-medium text-sm">Αποστολή</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced New Ticket Modal */}
      <AnimatePresence>
        {showNewTicketForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <FaRocket className="text-white text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Νέο Ερώτημα</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowNewTicketForm(false);
                    resetNewTicketForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Επιλογή Ρόλου */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Επιλέξτε Ρόλο *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'buyer', label: 'Αγοραστής', icon: '🏠', color: 'from-blue-500 to-blue-600' },
                      { id: 'seller', label: 'Πωλητής', icon: '💰', color: 'from-green-500 to-green-600' },
                      { id: 'agent', label: 'Μεσιτευόμενος', icon: '🤝', color: 'from-purple-500 to-purple-600' }
                    ].map((role) => (
                      <motion.button
                        key={role.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          const selectedRoleValue = role.id as 'buyer' | 'seller' | 'agent';
                          setSelectedRole(selectedRoleValue);
                          setNewTicket(prev => ({ ...prev, selectedRole: selectedRoleValue.toUpperCase() }));
                          await loadRoleSpecificData(selectedRoleValue);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          selectedRole === role.id
                            ? `border-transparent bg-gradient-to-r ${role.color} text-white shadow-lg`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{role.icon}</div>
                          <div className="text-sm font-medium">{role.label}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Πεδία που εμφανίζονται μόνο μετά την επιλογή ρόλου */}
                {selectedRole && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Τίτλος *
                      </label>
                      <input
                        type="text"
                        value={newTicket.title}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                        placeholder="Σύντομος τίτλος του ερωτήματος"
                      />
                    </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Περιγραφή *
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
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
                      value={newTicket.category}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as keyof typeof categoryLabels }))}
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
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as keyof typeof priorityLabels }))}
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
                {(selectedRole === 'buyer' || selectedRole === 'seller') && roleSpecificProperties.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Σχετικό Ακίνητο (προαιρετικό)
                    </label>
                    <select
                      value={newTicket.propertyId}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, propertyId: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                    >
                      <option value="">Επιλέξτε ακίνητο...</option>
                      {roleSpecificProperties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Εμφάνιση πεδίου συναλλαγής μόνο για agent */}
                {selectedRole === 'agent' && roleSpecificTransactions.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Σχετική Συναλλαγή (προαιρετικό)
                    </label>
                    <select
                      value={newTicket.transactionId}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, transactionId: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-300"
                    >
                      <option value="">Επιλέξτε συναλλαγή...</option>
                      {roleSpecificTransactions.map(transaction => (
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowNewTicketForm(false);
                      resetNewTicketForm();
                    }}
                    className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Ακύρωση
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateTicket}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg"
                  >
                    Δημιουργία Ερωτήματος
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 