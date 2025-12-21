'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchFromBackend, apiClient } from '@/lib/api/client';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'INTERESTED' | 'STAGE_UPDATE' | string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: string;
  isRead: boolean;
  propertyId?: string;
  metadata?: {
    leadId?: string;
    transactionId?: string;
    stage?: string;
    shouldOpenModal?: boolean;
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  clearNotifications: () => void;
  fetchNotifications: () => Promise<void>;
  sendStageCompletionNotification: (propertyId: string, stage: string, sellerId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      console.log('=== NotificationContext: Fetching notifications ===');
      const res = await fetchFromBackend('/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      console.log('=== NotificationContext: Fetched notifications ===');
      console.log('Notifications count:', data.length);
      console.log('Notifications:', data);
      
      // Ελέγχουμε ειδικά για SUPPORT_MESSAGE ειδοποιήσεις
      const supportMessages = data.filter((n: any) => n.type === 'SUPPORT_MESSAGE');
      console.log('=== SUPPORT_MESSAGE notifications ===');
      console.log('Support message count:', supportMessages.length);
      console.log('Support messages:', supportMessages);
      
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Polling για να ενημερώνουμε τις ειδοποιήσεις κάθε 5 δευτερόλεπτα
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Add notification to backend and local state
  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    try {
      // Εμφάνιση toast notification άμεσα
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {notification.type === 'success' && (
                  <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notification.type === 'warning' && (
                  <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
              </div>
            </div>
          </div>
          {notification.action && (
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  notification.action?.onClick();
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
      ), {
        duration: 5000,
      });
      // Αποστολή στο backend
      const { data: saved } = await apiClient.post('/notifications', {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata,
      });
      // Ενημέρωση τοπικού state
      setNotifications(prev => [saved, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  // Mark notification as read (backend + local)
  const markAsRead = async (id: string) => {
    try {
      await apiClient.put('/notifications', { notificationId: id });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Delete single notification
  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/notifications?id=${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    try {
      await apiClient.delete('/notifications');
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  // Send stage completion notification to seller
  const sendStageCompletionNotification = async (propertyId: string, stage: string, sellerId: string) => {
    try {
      console.log('=== NotificationContext: Sending stage completion notification ===', {
        propertyId,
        stage,
        sellerId
      });

      const stageLabels: Record<string, string> = {
        'PENDING': 'Αναμονή για ραντεβού',
        'MEETING_SCHEDULED': 'Έγινε ραντεβού',
        'DEPOSIT_PAID': 'Έγινε προκαταβολή',
        'FINAL_SIGNING': 'Τελική υπογραφή',
        'COMPLETED': 'Ολοκληρώθηκε',
        'CANCELLED': 'Ακυρώθηκε'
      };

      const stageLabel = stageLabels[stage.toUpperCase()] || stage;

      console.log('=== NotificationContext: Making API call ===', {
        url: '/api/admin/notifications/send-stage-completion',
        body: {
          propertyId,
          stage,
          sellerId,
          message: `Το στάδιο "${stageLabel}" ολοκληρώθηκε επιτυχώς!`
        }
      });

      const result = await apiClient.post('/admin/notifications/send-stage-completion', {
        propertyId,
        stage,
        sellerId,
        message: `Το στάδιο "${stageLabel}" ολοκληρώθηκε επιτυχώς!`
      });
      console.log('=== NotificationContext: API success response ===', result);

      console.log('=== Stage completion notification sent successfully ===');
    } catch (error) {
      console.error('Error sending stage completion notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        deleteNotification,
        deleteAllNotifications,
        clearNotifications,
        fetchNotifications,
        sendStageCompletionNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 