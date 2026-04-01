'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaCheckCircle, FaCircle, FaLock, FaUserTie, FaFileAlt, FaCalendarAlt, FaCheck } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import CardSection from './ui/CardSection';

interface PurchaseGuideStepperProps {
  deal: DealRoom;
}

/**
 * PurchaseGuideStepper - Stage-based purchase guide
 * 
 * Shows the buyer's journey through the purchase process:
 * 1. Deal Created
 * 2. Choose Lawyer
 * 3. Choose Notary
 * 4. Document Review
 * 5. Appointments / Signing
 * 6. Completion
 */
export default function PurchaseGuideStepper({ deal }: PurchaseGuideStepperProps) {
  const { userId } = useCurrentUser();
  const userRole = deal.participants?.find((p) => p.userId === userId)?.role;
  const isBuyer = userRole === 'BUYER';

  // Determine current stage
  const getCurrentStage = (): number => {
    if (deal.status === 'CLOSED') return 6; // Completion
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

    if (!hasAcceptedLawyer) return 2; // Choose Lawyer
    if (!hasAcceptedNotary) return 3; // Choose Notary
    if (!hasDocuments || deal.documents?.some((d) => d.status === 'REQUESTED')) return 4; // Document Review
    if (!hasUpcomingAppointment) return 5; // Appointments
    return 5; // Appointments / Signing
  };

  const currentStage = getCurrentStage();

  const stages = [
    {
      id: 1,
      title: 'Συναλλαγή Δημιουργήθηκε',
      description: 'Η συναλλαγή έχει δημιουργηθεί',
      icon: <FaCheckCircle />,
      completed: currentStage > 1,
      active: currentStage === 1,
    },
    {
      id: 2,
      title: 'Επίλεξε Δικηγόρο',
      description: 'Επίλεξε δικηγόρο για τη συναλλαγή',
      icon: <FaUserTie />,
      completed: currentStage > 2,
      active: currentStage === 2,
      locked: currentStage < 2,
    },
    {
      id: 3,
      title: 'Επίλεξε Συμβολαιογράφο',
      description: 'Επίλεξε συμβολαιογράφο για τη συναλλαγή',
      icon: <FaUserTie />,
      completed: currentStage > 3,
      active: currentStage === 3,
      locked: currentStage < 3,
    },
    {
      id: 4,
      title: 'Εξέταση Εγγράφων',
      description: 'Ανέβασε και εξέτασε τα έγγραφα',
      icon: <FaFileAlt />,
      completed: currentStage > 4,
      active: currentStage === 4,
      locked: currentStage < 4,
    },
    {
      id: 5,
      title: 'Ραντεβού / Υπογραφή',
      description: 'Προγραμμάτισε ραντεβού για υπογραφή',
      icon: <FaCalendarAlt />,
      completed: currentStage > 5,
      active: currentStage === 5,
      locked: currentStage < 5,
    },
    {
      id: 6,
      title: 'Ολοκλήρωση',
      description: 'Η συναλλαγή ολοκληρώθηκε',
      icon: <FaCheck />,
      completed: deal.status === 'CLOSED',
      active: deal.status === 'CLOSED',
      locked: currentStage < 6,
    },
  ];

  if (!isBuyer) {
    return (
      <CardSection title="Στάδια Συναλλαγής">
        <p className="text-sm text-gray-500">Μόνο για αγοραστές</p>
      </CardSection>
    );
  }

  return (
    <CardSection title="Οδηγός Αγοράς">
      <p className="text-xs text-gray-600 mb-4">
        Ακολούθησε τα βήματα για να ολοκληρώσεις την αγορά
      </p>

      <div className="space-y-0.5">
        {stages.map((stage, index) => {
          const isCompleted = stage.completed;
          const isActive = stage.active;
          const isLocked = stage.locked;

          return (
            <div
              key={stage.id}
              className={`
                relative p-3 rounded-md transition-all
                ${
                  isActive
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : isLocked
                    ? 'bg-gray-50 border border-gray-200 opacity-60'
                    : 'bg-white border border-gray-200'
                }
              `}
            >
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`
                    absolute left-5 top-10 w-0.5 h-6
                    ${isCompleted ? 'bg-green-400' : isActive ? 'bg-blue-300' : 'bg-gray-300'}
                  `}
                />
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : isLocked
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-gray-200 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? <FaCheckCircle className="text-sm" /> : isLocked ? <FaLock className="text-sm" /> : <span className="text-sm">{stage.icon}</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`
                      font-semibold mb-0.5 text-sm
                      ${
                        isActive
                          ? 'text-blue-900'
                          : isCompleted
                          ? 'text-green-900'
                          : isLocked
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      }
                    `}
                  >
                    {stage.title}
                  </h3>
                  <p
                    className={`
                      text-xs leading-tight
                      ${
                        isActive
                          ? 'text-blue-700'
                          : isCompleted
                          ? 'text-green-700'
                          : isLocked
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }
                    `}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-blue-900">Πρόοδος</span>
          <span className="text-xs font-bold text-blue-900">
            {Math.round((currentStage / 6) * 100)}%
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(currentStage / 6) * 100}%` }}
          />
        </div>
      </div>
    </CardSection>
  );
}

