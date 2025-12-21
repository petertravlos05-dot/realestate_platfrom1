'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaEnvelopeOpen, FaReply, FaTrash, FaCheckCircle, FaExclamationCircle, FaClock, FaBuilding, FaExchangeAlt, FaUser, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { fetchFromBackend } from '@/lib/api/client';

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
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const categoryLabels = {
  PROPERTY_INQUIRY: 'Ερώτηση για Ακίνητο',
  TRANSACTION_ISSUE: 'Πρόβλημα με Συναλλαγή',
  TECHNICAL_SUPPORT: 'Τεχνική Υποστήριξη',
  ACCOUNT_ISSUE: 'Πρόβλημα με Λογαριασμό',
  PAYMENT_ISSUE: 'Πρόβλημα με Πληρωμή',
  GENERAL: 'Γενικό Ερώτημα'
};

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
};

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800'
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
  { id: 'all', label: 'Όλα' },
  { id: 'PROPERTY_INQUIRY', label: 'Ερωτήσεις Ακινήτων' },
  { id: 'TRANSACTION_ISSUE', label: 'Προβλήματα Συναλλαγών' },
  { id: 'TECHNICAL_SUPPORT', label: 'Τεχνική Υποστήριξη' },
  { id: 'ACCOUNT_ISSUE', label: 'Προβλήματα Λογαριασμού' },
  { id: 'PAYMENT_ISSUE', label: 'Προβλήματα Πληρωμών' },
  { id: 'GENERAL', label: 'Γενικά' }
];

const statuses = [
  { id: 'all', label: 'Όλα' },
  { id: 'OPEN', label: 'Ανοιχτά' },
  { id: 'IN_PROGRESS', label: 'Σε Εξέλιξη' },
  { id: 'RESOLVED', label: 'Επιλυμένα' },
  { id: 'CLOSED', label: 'Κλειστά' }
];

export default function Messages() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [selectedCategory, selectedStatus]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`/api/support/tickets?${params.toString()}`);
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
      const response = await fetch(`/api/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(prev => prev ? { ...prev, messages: data.messages } : null);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetchFromBackend('/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          content: replyText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...prev.messages, data.message]
        } : null);
        setReplyText('');
        toast.success('Η απάντηση στάλθηκε!');
        fetchTickets(); // Refresh tickets list
      } else {
        toast.error('Σφάλμα στην αποστολή της απάντησης');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Σφάλμα στην αποστολή της απάντησης');
    } finally {
      setSendingReply(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.ticket);
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? data.ticket : ticket
        ));
        toast.success('Η κατάσταση ενημερώθηκε!');
      } else {
        toast.error('Σφάλμα στην ενημέρωση της κατάστασης');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Σφάλμα στην ενημέρωση της κατάστασης');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (ticket.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (ticket.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Κέντρο Υποστήριξης</h2>
            
            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-4">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    ${selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {statuses.map(status => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    ${selectedStatus === status.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                type="text"
                placeholder="Αναζήτηση μηνυμάτων..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Messages List */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-1 border-r">
              <div className="divide-y">
                {filteredTickets.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <FaEnvelope className="mx-auto text-4xl text-gray-300 mb-4" />
                    <p>Δεν βρέθηκαν μηνύματα</p>
                  </div>
                ) : (
                  filteredTickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchTicketMessages(ticket.id);
                      }}
                      className={`
                        w-full p-4 text-left hover:bg-gray-50
                        ${selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            {ticket.status === 'OPEN' && (
                              <FaEnvelope className="text-blue-600 mr-2" />
                            )}
                            {ticket.status === 'IN_PROGRESS' && (
                              <FaClock className="text-yellow-600 mr-2" />
                            )}
                            {ticket.status === 'RESOLVED' && (
                              <FaCheckCircle className="text-green-600 mr-2" />
                            )}
                            {ticket.status === 'CLOSED' && (
                              <FaEnvelopeOpen className="text-gray-600 mr-2" />
                            )}
                            <span className="font-medium text-gray-900 truncate">
                              {ticket.title}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[ticket.status]}`}>
                              {statusLabels[ticket.status]}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[ticket.priority]}`}>
                              {priorityLabels[ticket.priority]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {ticket.user?.name || 'Unknown User'} ({(ticket.selectedRole || ticket.user?.role) === 'BUYER' 
                              ? 'Αγοραστής' 
                              : (ticket.selectedRole || ticket.user?.role) === 'SELLER'
                              ? 'Πωλητής'
                              : (ticket.selectedRole || ticket.user?.role) === 'AGENT'
                              ? 'Μεσίτης'
                              : (ticket.selectedRole || ticket.user?.role) || 'Άγνωστος Ρόλος'})
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(ticket.updatedAt)}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {ticket._count.messages} μηνύματα
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message Details */}
            <div className="lg:col-span-2 p-6">
              {selectedTicket ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedTicket.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {categoryLabels[selectedTicket.category]}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                        className="px-3 py-1 border rounded text-sm"
                      >
                        <option value="OPEN">Ανοιχτό</option>
                        <option value="IN_PROGRESS">Σε Εξέλιξη</option>
                        <option value="RESOLVED">Επιλύθηκε</option>
                        <option value="CLOSED">Κλειστό</option>
                      </select>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedTicket.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedTicket.user?.email || 'No email'} • 
                          <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                            (selectedTicket.selectedRole || selectedTicket.user?.role) === 'BUYER' 
                              ? 'text-blue-700 bg-blue-100' 
                              : (selectedTicket.selectedRole || selectedTicket.user?.role) === 'SELLER'
                              ? 'text-green-700 bg-green-100'
                              : (selectedTicket.selectedRole || selectedTicket.user?.role) === 'AGENT'
                              ? 'text-purple-700 bg-purple-100'
                              : 'text-gray-500 bg-gray-100'
                          }`}>
                            {(selectedTicket.selectedRole || selectedTicket.user?.role) === 'BUYER' 
                              ? 'Αγοραστής' 
                              : (selectedTicket.selectedRole || selectedTicket.user?.role) === 'SELLER'
                              ? 'Πωλητής'
                              : (selectedTicket.selectedRole || selectedTicket.user?.role) === 'AGENT'
                              ? 'Μεσίτης'
                              : (selectedTicket.selectedRole || selectedTicket.user?.role) || 'Άγνωστος Ρόλος'}
                          </span>
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(selectedTicket.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                    {selectedTicket.property && (
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <FaBuilding className="mr-2" />
                        <span>Ακίνητο: {selectedTicket.property.title}</span>
                      </div>
                    )}
                    {selectedTicket.transaction && (
                      <div className="mt-1 flex items-center text-sm text-gray-600">
                        <FaExchangeAlt className="mr-2" />
                        <span>Συναλλαγή: {selectedTicket.transaction.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-gray-900">Συνομιλία</h4>
                    {selectedTicket.messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isFromAdmin
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium">
                                {message.isFromAdmin ? 'Admin' : message.user?.name || 'Unknown User'}
                              </span>
                                                          {!message.isFromAdmin && (selectedTicket.selectedRole || message.user?.role) && (
                              <span className={`text-xs px-1 py-0.5 rounded-full ${
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
                            </div>
                            <span className="text-xs opacity-75">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Απάντηση
                    </h4>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Γράψτε την απάντησή σας..."
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleReply(selectedTicket.id)}
                        disabled={!replyText.trim() || sendingReply}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <FaPaperPlane className="mr-2" />
                        {sendingReply ? 'Αποστολή...' : 'Αποστολή Απάντησης'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    Επιλέξτε ένα μήνυμα για να δείτε τα περιεχόμενά του
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 