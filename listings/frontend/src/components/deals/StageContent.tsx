'use client';

import { DealRoom } from '@/lib/api/deals';
import { SSEEvent } from '@/lib/realtime/sseClient';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import ProfessionalsTab from './tabs/ProfessionalsTab';
import DocumentsTab from './tabs/DocumentsTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import { FaUserTie, FaFileAlt, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';

interface StageContentProps {
  deal: DealRoom;
  sseEvents: SSEEvent[];
  onRefresh: () => void;
}

/**
 * StageContent - Renders stage-specific content
 * 
 * Determines current stage and shows appropriate UI:
 * - Stage 2-3: Professional selection
 * - Stage 4: Document review
 * - Stage 5: Appointments
 * - Always available: Chat
 */
export default function StageContent({ deal, sseEvents, onRefresh }: StageContentProps) {
  const { userId } = useCurrentUser();
  const userRole = deal.participants?.find((p) => p.userId === userId)?.role;
  const isBuyer = userRole === 'BUYER';

  // Determine current stage (same logic as PurchaseGuideStepper)
  const getCurrentStage = (): number => {
    if (deal.status === 'CLOSED') return 6;
    if (deal.status === 'CANCELLED') return 0;

    const hasAcceptedLawyer = deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER'
    );
    const hasAcceptedNotary = deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY'
    );
    const hasDocuments = deal.documents && deal.documents.length > 0;
    const hasUpcomingAppointment = deal.appointments?.some(
      (a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
    );

    if (!hasAcceptedLawyer) return 2;
    if (!hasAcceptedNotary) return 3;
    if (!hasDocuments || deal.documents?.some((d) => d.status === 'REQUESTED')) return 4;
    if (!hasUpcomingAppointment) return 5;
    return 5;
  };

  const currentStage = getCurrentStage();
  const hasAcceptedLawyer = deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER'
  );
  const hasAcceptedNotary = deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY'
  );

  // Render stage-specific content
  const renderStageContent = () => {
    switch (currentStage) {
      case 1:
        return (
          <div className="p-8 text-center">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Συναλλαγή Δημιουργήθηκε
            </h2>
            <p className="text-gray-600 mb-6">
              Η συναλλαγή σας έχει δημιουργηθεί επιτυχώς. Ξεκινήστε επιλέγοντας δικηγόρο.
            </p>
            <div className="mt-8">
              <ProfessionalsTab deal={deal} onRefresh={onRefresh} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FaUserTie className="text-blue-600" />
                Επίλεξε Δικηγόρο
              </h2>
              <p className="text-gray-600">
                Επίλεξε έναν δικηγόρο για να σε βοηθήσει στη συναλλαγή. Ο δικηγόρος θα
                εξετάσει τα έγγραφα και θα σε καθοδηγήσει στη διαδικασία.
              </p>
            </div>
            <ProfessionalsTab deal={deal} onRefresh={onRefresh} />
          </div>
        );

      case 3:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FaUserTie className="text-blue-600" />
                Επίλεξε Συμβολαιογράφο
              </h2>
              <p className="text-gray-600">
                Επίλεξε συμβολαιογράφο για να ολοκληρώσεις τη συναλλαγή. Ο συμβολαιογράφος
                θα προετοιμάσει τα έγγραφα υπογραφής.
              </p>
            </div>
            <ProfessionalsTab deal={deal} onRefresh={onRefresh} />
          </div>
        );

      case 4:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FaFileAlt className="text-blue-600" />
                Εξέταση Εγγράφων
              </h2>
              <p className="text-gray-600">
                Ανέβασε τα απαραίτητα έγγραφα και περιμένε την έγκριση από τον δικηγόρο.
              </p>
            </div>
            <DocumentsTab deal={deal} onRefresh={onRefresh} />
          </div>
        );

      case 5:
        return (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FaCalendarAlt className="text-blue-600" />
                Ραντεβού / Υπογραφή
              </h2>
              <p className="text-gray-600">
                Προγραμμάτισε ραντεβού με τον συμβολαιογράφο για την υπογραφή των
                εγγράφων.
              </p>
            </div>
            <AppointmentsTab deal={deal} onRefresh={onRefresh} />
          </div>
        );

      case 6:
        return (
          <div className="p-8 text-center">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Συναλλαγή Ολοκληρώθηκε</h2>
            <p className="text-gray-600">
              Συγχαρητήρια! Η συναλλαγή ολοκληρώθηκε επιτυχώς.
            </p>
          </div>
        );

      default:
        return (
          <div className="p-8 text-center">
            <p className="text-gray-600">Καλώς ήρθατε στη συναλλαγή</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stage Content */}
      <div className="flex-1 overflow-y-auto p-6">{renderStageContent()}</div>
    </div>
  );
}

