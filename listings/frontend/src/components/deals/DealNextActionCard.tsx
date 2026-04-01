'use client';

import { useState, useEffect } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { FaChevronRight, FaInfoCircle } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CardSection from './ui/CardSection';
import { apiClient } from '@/lib/api/client';

interface DealNextActionCardProps {
  deal: DealRoom;
}

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  date: string;
  time: string;
}

/**
 * DealNextActionCard - Shows what the buyer needs to do next
 */
import { isBuyer, isNotary } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from './useDealRoomTheme';

export default function DealNextActionCard({ deal }: DealNextActionCardProps) {
  const { userId } = useCurrentUser();
  const { accentGradient, accentHover, accentIcon } = useDealRoomTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const isBuyerRole = isBuyer(deal, userId);
  const isNotaryRole = isNotary(deal, userId);
  
  // Don't show for notaries (they have their own steps in OverviewTab)
  if (isNotaryRole) {
    return null;
  }
  const [propertyAppointments, setPropertyAppointments] = useState<ViewingRequest[]>([]);

  // Fetch property appointments (ViewingRequests) for this deal
  useEffect(() => {
    if (!isBuyerRole || !deal.propertyId || !session?.user?.id) return;

    const fetchPropertyAppointments = async () => {
      try {
        const response = await apiClient.get(`/seller/appointments`, {
          params: {
            propertyId: deal.propertyId,
            buyerId: session.user.id,
          },
        });
        
        if (response.data.appointments) {
          setPropertyAppointments(response.data.appointments);
        }
      } catch (error) {
        console.error('Error fetching property appointments:', error);
        // If error, still use deal.appointments as fallback
      }
    };

    fetchPropertyAppointments();
    
    // Listen for appointment updates from AppointmentsTab
    const handleAppointmentsUpdated = (event: CustomEvent) => {
      if (event.detail?.propertyId === deal.propertyId) {
        fetchPropertyAppointments();
      }
    };
    
    window.addEventListener('appointmentsUpdated', handleAppointmentsUpdated as EventListener);
    
    // Refresh every 10 seconds to catch updates
    const interval = setInterval(fetchPropertyAppointments, 10000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('appointmentsUpdated', handleAppointmentsUpdated as EventListener);
    };
  }, [deal.propertyId, deal.id, deal.updatedAt, session?.user?.id, isBuyerRole]);

  // Determine next action based on current step
  const getNextAction = () => {
    if (!isBuyerRole) return null;

    // Step 2: Book appointment
    // Check both property appointments (ViewingRequests) and deal appointments
    const hasConfirmedPropertyAppointment = propertyAppointments.some(
      (a) => a.status === 'ACCEPTED'
    );
    const hasConfirmedDealAppointment = deal.appointments?.some(
      (a) => a.status === 'CONFIRMED'
    );
    const hasConfirmedAppointment = hasConfirmedPropertyAppointment || hasConfirmedDealAppointment;
    
    if (!hasConfirmedAppointment) {
      return {
        title: 'Κλείσε Ραντεβού',
        description: 'Προγραμμάτισε ραντεβού για να δεις το ακίνητο',
        action: () => router.push(`/deals/${deal.id}?tab=appointments`),
        actionLabel: 'Κλείσε Ραντεβού',
      };
    }

    // Step 3: Confirm interest (heuristic: if no documents yet)
    const hasPastPropertyAppointment = propertyAppointments.some(
      (a) => a.status === 'ACCEPTED' && new Date(`${a.date}T${a.time}`) < new Date()
    );
    const hasPastDealAppointment = deal.appointments?.some(
      (a) => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
    );
    const hasPastAppointment = hasPastPropertyAppointment || hasPastDealAppointment;
    
    if (hasPastAppointment && (!deal.documents || deal.documents.length === 0)) {
      return {
        title: 'Επιβεβαίωσε Ενδιαφέρον',
        description: 'Επιβεβαίωσε ότι θέλεις να συνεχίσεις μετά το ραντεβού',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        actionLabel: 'Επιβεβαίωσε Ενδιαφέρον',
      };
    }

    // Step 4: Choose lawyer
    const hasLawyer = deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER'
    );
    if (!hasLawyer) {
      return {
        title: 'Επίλεξε Δικηγόρο',
        description: 'Επίλεξε δικηγόρο για να συνεχίσει η διαδικασία',
        action: () => router.push(`/deals/${deal.id}?tab=professionals`),
        actionLabel: 'Επίλεξε Δικηγόρο',
      };
    }

    // Step 5: Pay deposit
    const hasDocumentsInReview = deal.documents?.some(
      (d) => d.status === 'UPLOADED' || d.status === 'APPROVED'
    );
    // TODO: Add explicit deposit paid check
    if (!hasDocumentsInReview) {
      return {
        title: 'Πληρωμή Προκαταβολής',
        description: 'Πλήρωσε την προκαταβολή για να προχωρήσει η συναλλαγή',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        actionLabel: 'Πληρωμή Προκαταβολής',
      };
    }

    // Step 6: Choose notary
    const hasNotary = deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY'
    );
    if (!hasNotary) {
      return {
        title: 'Επίλεξε Συμβολαιογράφο',
        description: 'Επίλεξε συμβολαιογράφο για την ολοκλήρωση',
        action: () => router.push(`/deals/${deal.id}?tab=professionals`),
        actionLabel: 'Επίλεξε Συμβολαιογράφο',
      };
    }

    // Step 7: Signing
    const allDocsApproved = deal.documents && deal.documents.length > 0 && 
      deal.documents.every((d) => d.status === 'APPROVED');
    if (!allDocsApproved) {
      return {
        title: 'Ολοκλήρωση Εγγράφων',
        description: 'Ολοκλήρωσε την υπογραφή των συμβολαίων',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        actionLabel: 'Δες Έγγραφα',
      };
    }

    // Step 8: Completion
    if (deal.status === 'CLOSED') {
      return {
        title: 'Ολοκλήρωση',
        description: 'Η συναλλαγή ολοκληρώθηκε επιτυχώς!',
        action: null,
        actionLabel: null,
      };
    }

    // Default: Check documents or appointments
    const pendingDocs = deal.documents?.filter(
      (d) => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
    );
    if (pendingDocs && pendingDocs.length > 0) {
      return {
        title: `Ανέβασε Έγγραφα (${pendingDocs.length})`,
        description: `${pendingDocs.length} έγγραφα σε αναμονή ανέβασματος`,
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        actionLabel: 'Ανέβασε Έγγραφα',
      };
    }

    return {
      title: 'Σε Εξέλιξη',
      description: 'Η συναλλαγή προχωράει κανονικά',
      action: () => router.push(`/deals/${deal.id}?tab=overview`),
      actionLabel: 'Δες Λεπτομέρειες',
    };
  };

  const nextAction = getNextAction();

  // Don't show for notaries or if not a buyer or no next action
  if (isNotaryRole || !isBuyerRole || !nextAction) {
    return null;
  }

  return (
    <CardSection>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center`}>
              <FaInfoCircle className="text-white text-sm" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Τι πρέπει να κάνεις τώρα</h2>
          </div>
          <p className="text-base font-semibold text-gray-800 mb-2">{nextAction.title}</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-5 leading-relaxed">{nextAction.description}</p>

      {nextAction.action && (
        <div className="flex gap-3">
          <button
            onClick={nextAction.action}
            className={`flex-1 px-5 py-3 bg-gradient-to-r ${accentGradient} text-white rounded-xl ${accentHover} font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {nextAction.actionLabel}
            <FaChevronRight className="text-xs" />
          </button>
          <button
            onClick={() => router.push(`/deals/${deal.id}?tab=overview`)}
            className="px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Δες Λεπτομέρειες
          </button>
        </div>
      )}
    </CardSection>
  );
}

