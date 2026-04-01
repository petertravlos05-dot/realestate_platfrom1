'use client';

import { useState, useEffect } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { SSEEvent } from '@/lib/realtime/sseClient';
import { FaComments, FaFileAlt, FaCalendarAlt, FaUserTie, FaCircle, FaInfoCircle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import CardSection from './ui/CardSection';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isSeller } from '@/lib/utils/dealRole';
import { getBuyerProgressMessage } from '@/lib/utils/buyerProgress';
import { apiClient } from '@/lib/api/client';
import { useSession } from 'next-auth/react';

interface ActivityFeedProps {
  deal: DealRoom;
  sseEvents: SSEEvent[];
  onRefresh: () => void;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  action?: () => void;
  icon: React.ReactNode;
}

export default function ActivityFeed({ deal, sseEvents, onRefresh }: ActivityFeedProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { data: session } = useSession();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [propertyAppointments, setPropertyAppointments] = useState<any[]>([]);
  const isSellerRole = isSeller(deal, userId);

  // Fetch property appointments for buyer progress (seller view)
  useEffect(() => {
    if (!isSellerRole || !deal.propertyId || !deal.buyerId) return;

    const fetchPropertyAppointments = async () => {
      try {
        const response = await apiClient.get(`/seller/appointments`, {
          params: {
            propertyId: deal.propertyId,
            buyerId: deal.buyerId,
          },
        });
        
        if (response.data.appointments) {
          setPropertyAppointments(response.data.appointments);
        }
      } catch (error) {
        console.error('Error fetching property appointments:', error);
      }
    };

    fetchPropertyAppointments();
    const interval = setInterval(fetchPropertyAppointments, 10000);
    
    return () => clearInterval(interval);
  }, [deal.propertyId, deal.buyerId, deal.updatedAt, isSellerRole]);

  // Translate SSE events to human-readable activities
  useEffect(() => {
    const newActivities = sseEvents
      .slice(-30) // Keep last 30 events
      .map((event): ActivityItem | null => {
        const timestamp = new Date(event.at);

        switch (event.type) {
          case 'message_sent':
            return {
              id: `msg-${event.threadId}-${event.at}`,
              type: 'message_sent',
              message: 'Νέο μήνυμα στη συνομιλία',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=chat`),
              icon: <FaComments className="text-blue-600" />,
            };

          case 'document_requested':
            return {
              id: `doc-req-${event.docId}-${event.at}`,
              type: 'document_requested',
              message: 'Ζητήθηκε έγγραφο',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=documents`),
              icon: <FaFileAlt className="text-yellow-600" />,
            };

          case 'document_uploaded':
            return {
              id: `doc-up-${event.docId}-${event.at}`,
              type: 'document_uploaded',
              message: 'Ανέβηκε έγγραφο',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=documents`),
              icon: <FaFileAlt className="text-blue-600" />,
            };

          case 'document_reviewed':
            return {
              id: `doc-rev-${event.docId}-${event.at}`,
              type: 'document_reviewed',
              message: 'Ολοκληρώθηκε έλεγχος εγγράφου',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=documents`),
              icon: <FaFileAlt className="text-green-600" />,
            };

          case 'appointment_requested':
            return {
              id: `apt-req-${event.appointmentId}-${event.at}`,
              type: 'appointment_requested',
              message: 'Αιτήθηκε ραντεβού',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=appointments`),
              icon: <FaCalendarAlt className="text-yellow-600" />,
            };

          case 'appointment_confirmed':
            return {
              id: `apt-conf-${event.appointmentId}-${event.at}`,
              type: 'appointment_confirmed',
              message: 'Ραντεβού επιβεβαιώθηκε',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=appointments`),
              icon: <FaCalendarAlt className="text-green-600" />,
            };

          case 'appointment_cancelled':
            return {
              id: `apt-canc-${event.appointmentId}-${event.at}`,
              type: 'appointment_cancelled',
              message: 'Ραντεβού ακυρώθηκε',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=appointments`),
              icon: <FaCalendarAlt className="text-red-600" />,
            };

          case 'professional_requested':
            return {
              id: `prof-req-${event.requestId}-${event.at}`,
              type: 'professional_requested',
              message: 'Αιτήθηκε επαγγελματίας',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=professionals`),
              icon: <FaUserTie className="text-yellow-600" />,
            };

          case 'professional_accepted':
            return {
              id: `prof-acc-${event.requestId}-${event.at}`,
              type: 'professional_accepted',
              message: 'Επαγγελματίας αποδέχτηκε',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=professionals`),
              icon: <FaUserTie className="text-green-600" />,
            };

          case 'professional_declined':
            return {
              id: `prof-dec-${event.requestId}-${event.at}`,
              type: 'professional_declined',
              message: 'Επαγγελματίας απέρριψε',
              timestamp,
              action: () => router.push(`/deals/${deal.id}?tab=professionals`),
              icon: <FaUserTie className="text-red-600" />,
            };

          default:
            return null;
        }
      })
      .filter((item): item is ActivityItem => item !== null);

    // Add buyer progress message for sellers (most recent)
    if (isSellerRole && deal.buyerId) {
      const buyerProgress = getBuyerProgressMessage(deal, propertyAppointments);
      const progressActivity: ActivityItem = {
        id: `buyer-progress-${deal.id}-${Date.now()}`,
        type: 'buyer_progress',
        message: buyerProgress.message,
        timestamp: new Date(),
        action: () => router.push(`/deals/${deal.id}?tab=overview`),
        icon: <FaInfoCircle className="text-blue-600" />,
      };
      newActivities.unshift(progressActivity); // Add at the beginning
    }

    // Sort by timestamp (most recent first)
    newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setActivities(newActivities);
  }, [sseEvents, deal.id, deal.updatedAt, deal.buyerId, propertyAppointments, isSellerRole, router]);

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'τώρα';
    if (diffMins < 60) return `πριν ${diffMins} λεπτά`;
    if (diffHours < 24) return `πριν ${diffHours} ώρες`;
    if (diffDays < 7) return `πριν ${diffDays} ημέρες`;
    return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
  };

  // Limit to last 10 activities
  const displayActivities = activities.slice(0, 10);

  return (
    <CardSection title="Πρόσφατη Δραστηριότητα">
      {displayActivities.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <FaCircle className="text-gray-400 text-xl" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Δεν υπάρχει δραστηριότητα</p>
          <p className="text-xs text-gray-500">Οι ενημερώσεις θα εμφανίζονται εδώ</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {displayActivities.map((activity) => (
            <button
              key={activity.id}
              onClick={activity.action}
              className="w-full text-left p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent hover:border-gray-200"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 text-lg p-2 rounded-lg bg-gray-50 group-hover:bg-white transition-colors">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </CardSection>
  );
}

