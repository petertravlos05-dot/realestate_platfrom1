'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle, FaCalendarAlt, FaHeart, FaDollarSign, FaShieldAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';

export default function SellerNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead } = useNotifications();
  const router = useRouter();
  const [hasNotifiedAboutAppointment, setHasNotifiedAboutAppointment] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenAppointmentNotification') === 'true';
    }
    return false;
  });
  const [hasNotifiedAboutInterest, setHasNotifiedAboutInterest] = useState(() => {
    // Ελέγχουμε το localStorage κατά την αρχικοποίηση
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasSeenInterestNotification') === 'true';
    }
    return false;
  });

  // Φιλτράρουμε τις ειδοποιήσεις που είναι σχετικές με sellers
  const sellerNotifications = notifications.filter(n => 
    n.type === 'SELLER_INTEREST' || 
    n.type === 'SELLER_APPOINTMENT' || 
    n.type === 'SELLER_OFFER' || 
    n.type === 'SELLER_TRANSACTION' ||
    n.type === 'SELLER_GENERAL' ||
    n.type === 'PROPERTY_INTEREST' ||
    n.type === 'APPOINTMENT_REQUEST' ||
    n.type === 'CUSTOM_APPOINTMENT_REQUEST' ||
    n.type === 'APPOINTMENT_ACCEPTED' ||
    n.type === 'APPOINTMENT_REJECTED' ||
    n.type === 'PROPERTY_PROGRESS_COMPLETED' ||
    n.type === 'STAGE_UPDATE' ||
    n.type === 'PROGRESS_UPDATE' ||
    n.type === 'property_removed' ||
    n.type === 'removal_approved' ||
    n.type === 'removal_cancelled' ||
    n.metadata?.recipient === 'seller'
  );

  // Debug logs
  console.log('=== SellerNotificationBell Debug ===');
  console.log('All notifications count:', notifications.length);
  console.log('All notifications:', notifications);
  console.log('Seller notifications count:', sellerNotifications.length);
  console.log('Seller notifications:', sellerNotifications);

  const unreadCount = sellerNotifications.filter(n => !n.isRead).length;

  // Ελέγχουμε αν υπάρχουν νέες ειδοποιήσεις ραντεβού
  useEffect(() => {
    const hasNewAppointmentNotification = sellerNotifications.some(n => 
      (n.type === 'CUSTOM_APPOINTMENT_REQUEST' || n.type === 'APPOINTMENT_REQUEST') && 
      !n.isRead
    );
    
    if (hasNewAppointmentNotification && !hasNotifiedAboutAppointment) {
      // Στέλνουμε event για να highlight το tab ραντεβού
      window.dispatchEvent(new CustomEvent('newAppointmentNotification'));
      setHasNotifiedAboutAppointment(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenAppointmentNotification', 'true');
      }
    } else if (!hasNewAppointmentNotification) {
      // Reset το flag όταν δεν υπάρχουν μη διαβασμένες ειδοποιήσεις ραντεβού
      setHasNotifiedAboutAppointment(false);
      // Αφαιρούμε από το localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasSeenAppointmentNotification');
      }
    }
  }, [sellerNotifications, hasNotifiedAboutAppointment]);

  // Ελέγχουμε αν υπάρχουν νέες ειδοποιήσεις ενδιαφέροντος
  useEffect(() => {
    const hasNewInterestNotification = sellerNotifications.some(n => 
      (n.type === 'PROPERTY_INTEREST' || n.type === 'SELLER_INTEREST') && 
      !n.isRead
    );
    
    if (hasNewInterestNotification && !hasNotifiedAboutInterest) {
      // Στέλνουμε event για να highlight το tab ενδιαφερόμενων
      window.dispatchEvent(new CustomEvent('newInterestNotification'));
      setHasNotifiedAboutInterest(true);
      // Αποθηκεύουμε στο localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenInterestNotification', 'true');
      }
    } else if (!hasNewInterestNotification) {
      // Reset το flag όταν δεν υπάρχουν μη διαβασμένες ειδοποιήσεις ενδιαφέροντος
      setHasNotifiedAboutInterest(false);
      // Αφαιρούμε από το localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasSeenInterestNotification');
      }
    }
  }, [sellerNotifications, hasNotifiedAboutInterest]);

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
    
    // Ειδική διαχείριση για ειδοποιήσεις ενδιαφέροντος
    if (notification.type === 'PROPERTY_INTEREST' && notification.metadata?.leadId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutInterest(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenInterestNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για το συγκεκριμένο ενδιαφέρον
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          leadId: notification.metadata.leadId,
          transactionId: notification.metadata.transactionId,
          buyerId: notification.metadata.buyerId,
          agentId: notification.metadata.agentId,
          propertyId: notification.propertyId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις ενδιαφέροντος από χρήστες (SELLER_INTEREST)
    if (notification.type === 'SELLER_INTEREST' && notification.metadata?.leadId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutInterest(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenInterestNotification', 'true');
      }
      
      // Ανοίγουμε το LeadDetailsModal για το συγκεκριμένο ενδιαφέρον
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          leadId: notification.metadata.leadId,
          transactionId: notification.metadata.transactionId,
          buyerId: notification.metadata.buyerId,
          agentId: notification.metadata.agentId,
          propertyId: notification.propertyId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις ραντεβού
    if (notification.type === 'CUSTOM_APPOINTMENT_REQUEST' && notification.metadata?.viewingRequestId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutAppointment(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenAppointmentNotification', 'true');
      }
      
      // Ανοίγουμε το AppointmentDetailsModal για το συγκεκριμένο ραντεβού
      window.dispatchEvent(new CustomEvent('openAppointmentDetailsModal', {
        detail: {
          appointmentId: notification.metadata.viewingRequestId,
          propertyId: notification.propertyId,
          buyerId: notification.metadata.buyerId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις αιτήματος ραντεβού (APPOINTMENT_REQUEST)
    if (notification.type === 'APPOINTMENT_REQUEST' && notification.metadata?.viewingRequestId) {
      // Αφαιρούμε το highlight αφού ο χρήστης πατάει την ειδοποίηση
      setHasNotifiedAboutAppointment(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenAppointmentNotification', 'true');
      }
      
      // Ανοίγουμε το AppointmentDetailsModal για το συγκεκριμένο ραντεβού
      window.dispatchEvent(new CustomEvent('openAppointmentDetailsModal', {
        detail: {
          appointmentId: notification.metadata.viewingRequestId,
          propertyId: notification.propertyId,
          buyerId: notification.metadata.buyerId
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις "Ολοκλήρωση Βήματος" (PROPERTY_PROGRESS_COMPLETED)
    if (notification.type === 'PROPERTY_PROGRESS_COMPLETED' && notification.propertyId) {
      // Πηγαίνουμε στην σελίδα seller dashboard
      router.push('/dashboard/seller');
      
      // Ανοίγουμε το PropertyProgressModal για το συγκεκριμένο ακίνητο
      window.dispatchEvent(new CustomEvent('openPropertyProgressModal', {
        detail: {
          propertyId: notification.propertyId,
          propertyTitle: notification.metadata?.propertyTitle || '',
          stage: notification.metadata?.stage || ''
        }
      }));
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις "Ολοκλήρωση Σταδίου" (STAGE_UPDATE, PROGRESS_UPDATE)
    if ((notification.type === 'STAGE_UPDATE' || notification.type === 'PROGRESS_UPDATE') && notification.propertyId) {
      // Πηγαίνουμε στην σελίδα seller dashboard
      router.push('/dashboard/seller');
      
      // Ανοίγουμε το LeadDetailsModal για το συγκεκριμένο ακίνητο
      window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
        detail: {
          leadId: notification.metadata?.leadId,
          transactionId: notification.metadata?.transactionId,
          buyerId: notification.metadata?.buyerId,
          agentId: notification.metadata?.agentId,
          propertyId: notification.propertyId
        }
      }));
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις "Ολοκλήρωση Βήματος" (PROPERTY_PROGRESS_COMPLETED) - γενική περίπτωση
    if (notification.type === 'PROPERTY_PROGRESS_COMPLETED') {
      // Πηγαίνουμε στην σελίδα seller dashboard
      router.push('/dashboard/seller');
      
      // Εξάγουμε τον τίτλο του ακινήτου από το μήνυμα
      let propertyTitle = notification.metadata?.propertyTitle || '';
      let stage = notification.metadata?.stage || '';
      
      if (!propertyTitle && notification.message) {
        // Παράδειγμα μηνύματος: "Το βήμα "Έλεγχος Πλατφόρμας" για το ακίνητό σας "ΕΦΑΡΜΟΓΗ ΠΑΓΚΡΑΤΙ " ολοκληρώθηκε επιτυχώς."
        const message = notification.message;
        const propertyMatch = message.match(/"([^"]+)"/g);
        if (propertyMatch && propertyMatch.length >= 2) {
          stage = propertyMatch[0].replace(/"/g, ''); // Πρώτο quoted string είναι το stage
          propertyTitle = propertyMatch[1].replace(/"/g, ''); // Δεύτερο quoted string είναι το property title
        }
      }
      
      console.log('=== PROPERTY_PROGRESS_COMPLETED Notification ===', {
        originalMessage: notification.message,
        extractedPropertyTitle: propertyTitle,
        extractedStage: stage,
        metadata: notification.metadata
      });
      
      // Στέλνουμε event για να highlight το κουμπί προόδου
      window.dispatchEvent(new CustomEvent('stageCompletionFromBell', {
        detail: {
          propertyTitle: propertyTitle,
          stage: stage
        }
      }));
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις sellers
    if ((notification.type === 'SELLER_INTEREST' || 
         notification.type === 'SELLER_APPOINTMENT' || 
         notification.type === 'SELLER_OFFER' || 
         notification.type === 'SELLER_TRANSACTION' ||
         notification.type === 'SELLER_GENERAL' ||
         notification.type === 'APPOINTMENT_REQUEST' ||
         notification.type === 'APPOINTMENT_ACCEPTED' ||
         notification.type === 'APPOINTMENT_REJECTED') ||
        notification.metadata?.recipient === 'seller') {
      router.push('/dashboard/seller');
      return;
    }
    
    if (notification.metadata?.leadId) {
      router.push(`/dashboard/seller?leadId=${notification.metadata.leadId}`);
      
      if (notification.metadata.shouldOpenModal) {
        window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
          detail: {
            leadId: notification.metadata.leadId,
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
      case 'SELLER_INTEREST':
      case 'PROPERTY_INTEREST':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg">
            <FaHeart className={`${iconClasses} text-white`} />
          </div>
        );
      case 'SELLER_APPOINTMENT':
      case 'APPOINTMENT_REQUEST':
      case 'CUSTOM_APPOINTMENT_REQUEST':
      case 'APPOINTMENT_ACCEPTED':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
            <FaCalendarAlt className={`${iconClasses} text-white`} />
          </div>
        );
      case 'APPOINTMENT_REJECTED':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
            <FaTimes className={`${iconClasses} text-white`} />
          </div>
        );
      case 'PROPERTY_PROGRESS_COMPLETED':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <FaCheck className={`${iconClasses} text-white`} />
          </div>
        );
      case 'STAGE_UPDATE':
      case 'PROGRESS_UPDATE':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
            <FaCheck className={`${iconClasses} text-white`} />
          </div>
        );
      case 'SELLER_OFFER':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <FaDollarSign className={`${iconClasses} text-white`} />
          </div>
        );
      case 'SELLER_TRANSACTION':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
            <FaShieldAlt className={`${iconClasses} text-white`} />
          </div>
        );
      case 'property_removed':
      case 'removal_approved':
      case 'removal_cancelled':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
            <FaExclamationTriangle className={`${iconClasses} text-white`} />
          </div>
        );
      case 'SELLER_GENERAL':
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
      case 'SELLER_INTEREST':
      case 'PROPERTY_INTEREST':
        return 'Νέο Ενδιαφέρον';
      case 'SELLER_APPOINTMENT':
      case 'APPOINTMENT_REQUEST':
      case 'CUSTOM_APPOINTMENT_REQUEST':
        return 'Νέο Αίτημα Ραντεβού';
      case 'APPOINTMENT_ACCEPTED':
        return 'Ραντεβού Εγκρίθηκε';
      case 'APPOINTMENT_REJECTED':
        return 'Ραντεβού Απορρίφθηκε';
      case 'PROPERTY_PROGRESS_COMPLETED':
        return 'Ολοκλήρωση Βήματος';
      case 'STAGE_UPDATE':
      case 'PROGRESS_UPDATE':
        return 'Ολοκλήρωση Σταδίου';
      case 'SELLER_OFFER':
        return 'Νέα Προσφορά';
      case 'SELLER_TRANSACTION':
        return 'Ενημέρωση Συναλλαγής';
      case 'property_removed':
        return 'Ακίνητο Αφαιρέθηκε';
      case 'removal_approved':
        return 'Αίτηση Αφαίρεσης Εγκρίθηκε';
      case 'removal_cancelled':
        return 'Αίτηση Αφαίρεσης Ακυρώθηκε';
      case 'SELLER_GENERAL':
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
        className="relative p-3 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-full transition-all duration-200 hover:bg-gray-100"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span 
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg border-2 border-white"
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
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FaBell className="w-5 h-5 mr-2" />
                  Ειδοποιήσεις Πωλητή
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
              {sellerNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FaBell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Δεν έχετε ειδοποιήσεις</p>
                  <p className="text-gray-400 text-sm mt-1">Όταν λάβετε νέες ειδοποιήσεις, θα εμφανιστούν εδώ</p>
                </div>
              ) : (
                sellerNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 ${
                      !notification.isRead ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500' : ''
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
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 ml-2"></div>
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
                              className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
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
            {sellerNotifications.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    sellerNotifications.forEach(n => !n.isRead && markAsRead(n.id));
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