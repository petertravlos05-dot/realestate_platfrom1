'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle, FaCalendarAlt, FaHeart, FaDollarSign, FaShieldAlt, FaTrash, FaComments } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter, usePathname } from 'next/navigation';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Ελέγχουμε αν είμαστε στη σελίδα buyer property details
  const isBuyerPropertyDetails = pathname && pathname.startsWith('/buyer/properties/');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleNotificationClick = (notification: any) => {
    console.log('DEBUG: handleNotificationClick', notification);
    markAsRead(notification.id);
    setIsOpen(false);

    // Ειδική διαχείριση για ειδοποιήσεις "Αίτημα Ραντεβού Στάλθηκε", "Ενημέρωση Ραντεβού" και παρόμοιες
    if (
      (notification.title === 'Αίτημα Ραντεβού Στάλθηκε' ||
       notification.title === 'Ενημέρωση Ραντεβού' ||
       notification.title === 'Ραντεβού Ακυρώθηκε' ||
       (notification.type === 'info' && notification.title?.includes('Αίτημα Ραντεβού')) ||
       (notification.type === 'info' && notification.title?.includes('Πρόταση Ραντεβού'))
      ) &&
      (notification.metadata?.propertyId || notification.metadata?.leadId)
    ) {
      console.log('DEBUG: OPEN AppointmentManagementModal', notification.metadata.propertyId || notification.metadata.leadId);
      const propertyId = notification.metadata?.propertyId || notification.metadata?.leadId;
      if (window.location.pathname !== '/dashboard/buyer') {
        window.location.href = `/dashboard/buyer?openAppointment=${propertyId}`;
      } else {
        window.dispatchEvent(new CustomEvent('openAppointmentModal', {
          detail: {
            propertyId: propertyId
          }
        }));
      }
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις ραντεβού (επιβεβαίωση, απόρριψη, αίτημα)
    const isAppointmentNotification = (
      notification.type === 'APPOINTMENT_ACCEPTED' ||
      notification.type === 'APPOINTMENT_REJECTED' ||
      notification.type === 'CUSTOM_APPOINTMENT_REQUEST' ||
      (notification.type === 'error' && notification.title?.includes('Ραντεβού Απορρίφθηκε')) ||
      (notification.type === 'success' && notification.title?.includes('Ραντεβού Επιβεβαιώθηκε'))
    );

    if (isAppointmentNotification && notification.metadata?.propertyId) {
      console.log('DEBUG: OPEN AppointmentManagementModal (other types)', notification.metadata.propertyId);
      if (window.location.pathname !== '/dashboard/buyer') {
        window.location.href = `/dashboard/buyer?openAppointment=${notification.metadata.propertyId}`;
      } else {
        window.dispatchEvent(new CustomEvent('openAppointmentModal', {
          detail: {
            propertyId: notification.metadata.propertyId
          }
        }));
      }
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις ενδιαφέροντος του buyer
    if (notification.type === 'INTERESTED' && notification.title === 'Εκδήλωση Ενδιαφέροντος') {
      console.log('DEBUG: INTERESTED notification, redirect to dashboard/buyer');
      router.push('/dashboard/buyer');
      return;
    }

    // Ειδική διαχείριση για ειδοποιήσεις support messages
    if (notification.type === 'SUPPORT_MESSAGE' && notification.metadata?.ticketId) {
      console.log('DEBUG: SUPPORT_MESSAGE notification, redirect to dashboard/buyer with messages tab');
      
      // Ελέγχουμε αν είμαστε ήδη στο buyer dashboard
      if (window.location.pathname === '/dashboard/buyer') {
        // Αν είμαστε ήδη στο dashboard, ενημερώνουμε τα URL parameters και προκαλούμε επαναφόρτωση του state
        const newUrl = '/dashboard/buyer?tab=messages&ticketId=' + notification.metadata.ticketId;
        window.history.pushState({}, '', newUrl);
        
        // Προκαλούμε custom event για να ενημερώσουμε το dashboard
        window.dispatchEvent(new CustomEvent('updateBuyerDashboard', {
          detail: {
            tab: 'messages',
            ticketId: notification.metadata.ticketId
          }
        }));
      } else {
        // Αν δεν είμαστε στο dashboard, πηγαίνουμε εκεί
        router.push('/dashboard/buyer?tab=messages&ticketId=' + notification.metadata.ticketId);
      }
      return;
    }
    
    // Ειδική διαχείριση για ειδοποιήσεις με leadId (LeadDetailsModal)
    if (notification.metadata?.leadId && !notification.title?.includes('Ραντεβού')) {
      console.log('DEBUG: OPEN LeadDetailsModal', notification.metadata.leadId);
      router.push(`/dashboard/buyer?leadId=${notification.metadata.leadId}`);
      
      if (notification.metadata.shouldOpenModal) {
        window.dispatchEvent(new CustomEvent('openLeadDetailsModal', {
          detail: {
            leadId: notification.metadata.leadId,
            transactionId: notification.metadata.transactionId,
            stage: notification.metadata.stage
          }
        }));
      }
      return;
    }
    
    if (notification.action) {
      notification.action.onClick();
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-5 h-5";
    
    switch (type) {
      case 'success':
      case 'APPOINTMENT_ACCEPTED':
        return (
          <div className="w-10 h-10 rounded-full notification-success flex items-center justify-center shadow-lg notification-icon">
            <FaCheck className={`${iconClasses} text-white`} />
          </div>
        );
      case 'error':
      case 'APPOINTMENT_REJECTED':
        return (
          <div className="w-10 h-10 rounded-full notification-error flex items-center justify-center shadow-lg notification-icon">
            <FaTimes className={`${iconClasses} text-white`} />
          </div>
        );
      case 'info':
      case 'CUSTOM_APPOINTMENT_REQUEST':
        return (
          <div className="w-10 h-10 rounded-full notification-info flex items-center justify-center shadow-lg notification-icon">
            <FaInfoCircle className={`${iconClasses} text-white`} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-full notification-warning flex items-center justify-center shadow-lg notification-icon">
            <FaExclamationTriangle className={`${iconClasses} text-white`} />
          </div>
        );
      case 'INTERESTED':
        return (
          <div className="w-10 h-10 rounded-full notification-interest flex items-center justify-center shadow-lg notification-icon">
            <FaHeart className={`${iconClasses} text-white`} />
          </div>
        );
      case 'SUPPORT_MESSAGE':
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg notification-icon">
            <FaComments className={`${iconClasses} text-white`} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg notification-icon">
            <FaBell className={`${iconClasses} text-white`} />
          </div>
        );
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
    <div className="relative notification-bell" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-all duration-200 ${
          isBuyerPropertyDetails 
            ? isScrolled
              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              : 'text-white hover:text-white hover:bg-white/20'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span 
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg border-2 border-white notification-badge"
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
            className="absolute right-0 mt-3 w-96 notification-dropdown rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FaBell className="w-5 h-5 mr-2" />
                  Ειδοποιήσεις
                </h3>
                <div className="flex items-center space-x-3">
                  {unreadCount > 0 && (
                    <span className="glass text-white px-2 py-1 rounded-full text-xs font-medium">
                      {unreadCount} μη διαβασμένες
                    </span>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="text-white hover:text-red-200 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                      title="Διαγραφή όλων των ειδοποιήσεων"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto notification-scroll">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FaBell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Δεν έχετε ειδοποιήσεις</p>
                  <p className="text-gray-400 text-sm mt-1">Όταν λάβετε νέες ειδοποιήσεις, θα εμφανιστούν εδώ</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer notification-item transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                      !notification.isRead ? 'notification-unread bg-gradient-to-r from-blue-50 to-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-red-50"
                              title="Διαγραφή ειδοποίησης"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-400 font-medium notification-time">
                            {getTimeAgo(notification.createdAt)}
                          </p>
                          {notification.action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action?.onClick();
                              }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
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
            {notifications.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    notifications.forEach(n => !n.isRead && markAsRead(n.id));
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