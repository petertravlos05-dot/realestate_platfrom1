'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle, FaCalendarAlt, FaHeart, FaDollarSign, FaShieldAlt, FaUserTie } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';

export default function AgentNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead } = useNotifications();
  const router = useRouter();
  const [hasNotifiedAboutClient, setHasNotifiedAboutClient] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenClientNotification') === 'true';
    }
    return false;
  });
  const [hasNotifiedAboutTransaction, setHasNotifiedAboutTransaction] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenTransactionNotification') === 'true';
    }
    return false;
  });

  // Φιλτράρουμε τις ειδοποιήσεις που είναι σχετικές με agents
  const agentNotifications = notifications.filter(n => 
    n.type === 'AGENT_CLIENT' || 
    n.type === 'AGENT_CLIENT_CONNECTION' ||
    n.type === 'AGENT_LEAD_ADDED' ||
    n.type === 'AGENT_STAGE_UPDATE' ||
    n.type === 'AGENT_TRANSACTION' || 
    n.type === 'AGENT_APPOINTMENT' || 
    n.type === 'AGENT_OFFER' ||
    n.type === 'AGENT_GENERAL' ||
    n.type === 'BUYER_AGENT_CONNECTION' ||
    n.type === 'TRANSACTION_UPDATE' ||
    n.type === 'STAGE_COMPLETION' ||
    n.type === 'CLIENT_INTEREST' ||
    n.metadata?.recipient === 'agent'
  );

  // Debug logs
  console.log('=== AgentNotificationBell Debug ===');
  console.log('All notifications count:', notifications.length);
  console.log('All notifications:', notifications);
  console.log('Agent notifications count:', agentNotifications.length);
  console.log('Agent notifications:', agentNotifications);

  const unreadCount = agentNotifications.filter(n => !n.isRead).length;

  // Ελέγχουμε αν υπάρχουν νέες ειδοποιήσεις πελατών
  useEffect(() => {
    const hasNewClientNotification = agentNotifications.some(n => 
      (n.type === 'AGENT_CLIENT' || n.type === 'BUYER_AGENT_CONNECTION' || n.type === 'AGENT_CLIENT_CONNECTION' || n.type === 'AGENT_LEAD_ADDED') && 
      !n.isRead
    );
    
    if (hasNewClientNotification && !hasNotifiedAboutClient) {
      // Στέλνουμε event για να highlight το tab πελατών
      window.dispatchEvent(new CustomEvent('newClientNotification'));
      setHasNotifiedAboutClient(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenClientNotification', 'true');
      }
    } else if (!hasNewClientNotification) {
      // Reset το flag όταν δεν υπάρχουν μη διαβασμένες ειδοποιήσεις πελατών
      setHasNotifiedAboutClient(false);
      // Αφαιρούμε από το localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasSeenClientNotification');
      }
    }
  }, [agentNotifications, hasNotifiedAboutClient]);

  // Ελέγχουμε αν υπάρχουν νέες ειδοποιήσεις συναλλαγών
  useEffect(() => {
    const hasNewTransactionNotification = agentNotifications.some(n => 
      (n.type === 'AGENT_TRANSACTION' || n.type === 'AGENT_STAGE_UPDATE' || n.type === 'TRANSACTION_UPDATE' || n.type === 'STAGE_COMPLETION') && 
      !n.isRead
    );
    
    if (hasNewTransactionNotification && !hasNotifiedAboutTransaction) {
      // Στέλνουμε event για να highlight το tab στατιστικών
      window.dispatchEvent(new CustomEvent('newTransactionNotification'));
      setHasNotifiedAboutTransaction(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenTransactionNotification', 'true');
      }
    } else if (!hasNewTransactionNotification) {
      // Reset το flag όταν δεν υπάρχουν μη διαβασμένες ειδοποιήσεις συναλλαγών
      setHasNotifiedAboutTransaction(false);
      // Αφαιρούμε από το localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasSeenTransactionNotification');
      }
    }
  }, [agentNotifications, hasNotifiedAboutTransaction]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    setIsOpen(false);
    
    // Ειδική διαχείριση για ειδοποιήσεις πελατών
    if (notification.type === 'AGENT_CLIENT' && notification.metadata?.clientId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutClient(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenClientNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για τον συγκεκριμένο πελάτη
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          clientId: notification.metadata.clientId,
          transactionId: notification.metadata.transactionId,
          buyerId: notification.metadata.buyerId,
          propertyId: notification.propertyId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις σύνδεσης buyer-agent
    if (notification.type === 'BUYER_AGENT_CONNECTION' && notification.metadata?.connectionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutClient(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenClientNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για τη συγκεκριμένη σύνδεση
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          connectionId: notification.metadata.connectionId,
          buyerId: notification.metadata.buyerId,
          propertyId: notification.propertyId
        }
      }));
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις νέας σύνδεσης πελάτη
    if (notification.type === 'AGENT_CLIENT_CONNECTION' && notification.metadata?.transactionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutClient(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenClientNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για τη συγκεκριμένη σύνδεση
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          transactionId: notification.metadata.transactionId,
          buyerId: notification.metadata.buyerId,
          propertyId: notification.propertyId,
          buyerName: notification.metadata.buyerName,
          propertyTitle: notification.metadata.propertyTitle,
          stage: 'PENDING'
        }
      }));
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις προσθήκης ενδιαφερόμενου
    if (notification.type === 'AGENT_LEAD_ADDED' && notification.metadata?.transactionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutClient(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenClientNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για τον νέο ενδιαφερόμενο
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          transactionId: notification.metadata.transactionId,
          buyerId: notification.metadata.buyerId,
          propertyId: notification.propertyId,
          buyerName: notification.metadata.buyerName,
          propertyTitle: notification.metadata.propertyTitle,
          leadId: notification.metadata.leadId,
          stage: 'PENDING'
        }
      }));
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις ενημέρωσης σταδίου
    if (notification.type === 'AGENT_STAGE_UPDATE' && notification.metadata?.transactionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutTransaction(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenTransactionNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για την ενημέρωση σταδίου
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          transactionId: notification.metadata.transactionId,
          stage: notification.metadata.stage,
          stageInGreek: notification.metadata.stageInGreek,
          buyerId: notification.metadata.buyerId,
          buyerName: notification.metadata.buyerName,
          propertyId: notification.propertyId,
          propertyTitle: notification.metadata.propertyTitle,
          leadId: notification.metadata.leadId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις συναλλαγών
    if (notification.type === 'AGENT_TRANSACTION' && notification.metadata?.transactionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutTransaction(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenTransactionNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για τη συγκεκριμένη συναλλαγή
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          transactionId: notification.metadata.transactionId,
          clientId: notification.metadata.clientId,
          stage: notification.metadata.stage
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις ολοκλήρωσης σταδίου
    if (notification.type === 'STAGE_COMPLETION' && notification.metadata?.transactionId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutTransaction(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenTransactionNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για το συγκεκριμένο στάδιο
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          transactionId: notification.metadata.transactionId,
          stage: notification.metadata.stage,
          clientId: notification.metadata.clientId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις agents
    if ((notification.type === 'AGENT_CLIENT' || 
         notification.type === 'AGENT_TRANSACTION' || 
         notification.type === 'AGENT_APPOINTMENT' || 
         notification.type === 'AGENT_OFFER' ||
         notification.type === 'AGENT_GENERAL' ||
         notification.type === 'BUYER_AGENT_CONNECTION' ||
         notification.type === 'TRANSACTION_UPDATE' ||
         notification.type === 'STAGE_COMPLETION' ||
         notification.type === 'CLIENT_INTEREST') ||
        notification.metadata?.recipient === 'agent') {
      router.push('/dashboard/agent');
      return;
    }
    
    if (notification.metadata?.clientId) {
      router.push(`/dashboard/agent?clientId=${notification.metadata.clientId}`);
      
      if (notification.metadata.shouldOpenModal) {
        window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
          detail: {
            clientId: notification.metadata.clientId,
            transactionId: notification.metadata.transactionId,
            stage: notification.metadata.stage
          }
        }));
      }
    } else if (notification.action) {
      notification.action.onClick();
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-5 h-5";
    
    switch (type) {
      case 'AGENT_CLIENT':
      case 'AGENT_CLIENT_CONNECTION':
      case 'AGENT_LEAD_ADDED':
      case 'BUYER_AGENT_CONNECTION':
      case 'CLIENT_INTEREST':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
            <FaUserTie className={`${iconClasses} text-white`} />
          </div>
        );
      case 'AGENT_APPOINTMENT':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
            <FaCalendarAlt className={`${iconClasses} text-white`} />
          </div>
        );
      case 'AGENT_OFFER':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <FaDollarSign className={`${iconClasses} text-white`} />
          </div>
        );
      case 'AGENT_TRANSACTION':
      case 'AGENT_STAGE_UPDATE':
      case 'TRANSACTION_UPDATE':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg">
            <FaShieldAlt className={`${iconClasses} text-white`} />
          </div>
        );
      case 'STAGE_COMPLETION':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <FaCheck className={`${iconClasses} text-white`} />
          </div>
        );
      case 'AGENT_GENERAL':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg">
            <FaInfoCircle className={`${iconClasses} text-white`} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg">
            <FaBell className={`${iconClasses} text-white`} />
          </div>
        );
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'AGENT_CLIENT':
        return 'Νέος Πελάτης';
      case 'AGENT_CLIENT_CONNECTION':
        return 'Νέα Σύνδεση Πελάτη';
      case 'AGENT_LEAD_ADDED':
        return 'Επιτυχημένη Προσθήκη';
      case 'BUYER_AGENT_CONNECTION':
        return 'Νέα Σύνδεση';
      case 'CLIENT_INTEREST':
        return 'Ενδιαφέρον Πελάτη';
      case 'AGENT_APPOINTMENT':
        return 'Νέο Ραντεβού';
      case 'AGENT_OFFER':
        return 'Νέα Προσφορά';
      case 'AGENT_TRANSACTION':
      case 'AGENT_STAGE_UPDATE':
      case 'TRANSACTION_UPDATE':
        return 'Ενημέρωση Συναλλαγής';
      case 'STAGE_COMPLETION':
        return 'Ολοκλήρωση Σταδίου';
      case 'AGENT_GENERAL':
        return 'Γενική Ειδοποίηση';
      default:
        return 'Νέα Ειδοποίηση';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Τώρα';
    if (diffInMinutes < 60) return `${diffInMinutes} λεπτά πριν`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ώρες πριν`;
    return `${Math.floor(diffInMinutes / 1440)} ημέρες πριν`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-full transition-all duration-200 hover:bg-gray-100"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span 
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-purple-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FaBell className="w-5 h-5 mr-2" />
                  Ειδοποιήσεις Μεσίτη
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {unreadCount} μη διαβασμένες
                  </span>
                )}
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {agentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FaBell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Δεν έχετε ειδοποιήσεις</p>
                  <p className="text-gray-400 text-sm mt-1">Όταν λάβετε νέες ειδοποιήσεις, θα εμφανιστούν εδώ</p>
                </div>
              ) : (
                agentNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 ${
                      !notification.isRead ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title || getNotificationTitle(notification.type)}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 ml-2"></div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-400 font-medium">
                            {getTimeAgo(notification.createdAt)}
                          </p>
                          {notification.action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action?.onClick();
                              }}
                              className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors duration-200"
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {agentNotifications.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    agentNotifications.forEach(n => !n.isRead && markAsRead(n.id));
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium"
                >
                  Σημειώστε όλες ως διαβασμένες
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 