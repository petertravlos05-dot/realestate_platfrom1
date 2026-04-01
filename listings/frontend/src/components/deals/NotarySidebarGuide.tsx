'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isNotary } from '@/lib/utils/dealRole';
import CardSection from './ui/CardSection';
import { FaCheckCircle, FaLock, FaUserTie, FaFileAlt, FaCalendarAlt, FaHandshake } from 'react-icons/fa';
import { useDealRoomTheme } from './useDealRoomTheme';

interface NotarySidebarGuideProps {
  deal: DealRoom;
  sseEvents?: any[];
}

type GuideStepRow = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  locked: boolean;
};

/**
 * Αριστερή στήλη: συνοπτικά βήματα συμβολαιογράφου (ίδια λογική με OverviewTab → Βήματα Συμβολαιογράφου).
 */
export default function NotarySidebarGuide({ deal, sseEvents = [] }: NotarySidebarGuideProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { isProfessionalContext } = useDealRoomTheme();

  const isNotaryRole = !!userId && isNotary(deal, userId);

  const { steps, completedCount, currentStep } = useMemo((): {
    steps: GuideStepRow[];
    completedCount: number;
    currentStep: number;
  } => {
    if (!isNotaryRole) {
      return { steps: [], completedCount: 0, currentStep: 1 };
    }

    const hasNotaryApproval =
      !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

    const confirmedSigningAppointment = deal.appointments?.find(
      (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );

    const hasBuyerPurchaseConfirmation = !!deal.buyerSigningConfirmed;
    const hasSellerPurchaseConfirmation = !!deal.sellerSigningConfirmed;
    const isPurchaseCompletedByBothSides = hasBuyerPurchaseConfirmation && hasSellerPurchaseConfirmation;

    const step1Done = hasNotaryApproval;
    const step2Done = !!confirmedSigningAppointment;
    const step3Done = isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED';

    const completedFlags = [step1Done, step2Done, step3Done];

    const cur = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4;

    return buildSteps(completedFlags, cur);
  }, [deal, sseEvents, isNotaryRole]);

  if (!isNotaryRole) {
    return null;
  }

  const activeRing = isProfessionalContext
    ? 'bg-gradient-to-r from-teal-50 to-slate-50 border-2 border-teal-500 shadow-sm'
    : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-500 shadow-sm';
  const activeCircle = isProfessionalContext
    ? 'bg-gradient-to-br from-teal-500 to-slate-700 text-white'
    : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white';
  const activeTitle = isProfessionalContext ? 'text-teal-900' : 'text-purple-900';
  const activeDesc = isProfessionalContext ? 'text-teal-800' : 'text-purple-800';
  const progressBar = isProfessionalContext
    ? 'from-teal-600 to-slate-700'
    : 'from-purple-600 to-indigo-600';
  const progressBox = isProfessionalContext
    ? 'from-teal-50 to-slate-50 border-teal-200'
    : 'from-purple-50 to-indigo-50 border-purple-200';
  const progressText = isProfessionalContext ? 'text-teal-900' : 'text-purple-900';
  const progressSub = isProfessionalContext ? 'text-teal-800/80' : 'text-purple-800/80';

  const handleStepClick = (stepId: number, locked: boolean) => {
    if (locked) return;
    if (stepId === 1 || stepId === 3) {
      router.push(`/deals/${deal.id}?tab=overview`);
    } else if (stepId === 2) {
      router.push(`/deals/${deal.id}?tab=appointments`);
    }
  };

  const stepIcons = [
    <FaFileAlt key="1" className="text-xs" />,
    <FaCalendarAlt key="2" className="text-xs" />,
    <FaHandshake key="3" className="text-xs" />,
  ];

  const totalSteps = 3;

  return (
    <CardSection title="Οδηγός Συμβολαιογράφου">
      <p className="text-xs text-gray-600 mb-4 font-medium flex items-center gap-2">
        <FaUserTie className={isProfessionalContext ? 'text-teal-600' : 'text-purple-600'} />
        Συνοπτικά βήματα — λεπτομέρειες και ενέργειες στο tab Επισκόπηση
      </p>
      <div className="space-y-1">
        {steps.map((stage, index) => {
          const isCompleted = stage.completed;
          const isActive = stage.active;
          const isLocked = stage.locked;
          return (
            <div
              key={stage.id}
              onClick={() => handleStepClick(stage.id, isLocked)}
              className={`
                  relative p-3 rounded-lg transition-all group
                  ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${
                    isActive
                      ? activeRing
                      : isCompleted
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                        : isLocked
                          ? 'bg-gray-50 border-2 border-gray-200 opacity-60'
                          : 'bg-white border-2 border-gray-200 hover:border-purple-300'
                  }
                `}
            >
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-5 z-0 ${
                    isCompleted
                      ? 'bg-gradient-to-b from-green-400 to-green-300'
                      : isActive
                        ? isProfessionalContext
                          ? 'bg-gradient-to-b from-teal-400 to-slate-400'
                          : 'bg-gradient-to-b from-purple-400 to-indigo-300'
                        : 'bg-gray-300'
                  }`}
                />
              )}
              <div className="flex items-start gap-3 relative z-10">
                <div
                  className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
                      ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : isActive
                            ? activeCircle
                            : isLocked
                              ? 'bg-gray-300 text-gray-500'
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500'
                      }
                    `}
                >
                  {isCompleted ? <FaCheckCircle className="text-xs" /> : isLocked ? <FaLock className="text-xs" /> : stepIcons[index]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-bold text-xs ${
                      isActive
                        ? activeTitle
                        : isCompleted
                          ? 'text-green-900'
                          : isLocked
                            ? 'text-gray-400'
                            : 'text-gray-800'
                    }`}
                  >
                    Βήμα {index + 1}: {stage.title}
                  </h3>
                  <p
                    className={`text-[11px] leading-relaxed mt-0.5 ${
                      isActive
                        ? activeDesc
                        : isCompleted
                          ? 'text-green-700'
                          : isLocked
                            ? 'text-gray-400'
                            : 'text-gray-600'
                    }`}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-4 p-3 bg-gradient-to-r rounded-lg border-2 ${progressBox}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold ${progressText}`}>Πρόοδος</span>
          <span className={`text-sm font-extrabold ${isProfessionalContext ? 'text-teal-700' : 'text-purple-700'}`}>
            {Math.round((completedCount / totalSteps) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className={`bg-gradient-to-r ${progressBar} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${(completedCount / totalSteps) * 100}%` }}
          />
        </div>
        <p className={`text-[10px] mt-2 ${progressSub}`}>
          {completedCount >= totalSteps
            ? 'Όλα τα βήματα ολοκληρώθηκαν.'
            : `Τρέχον βήμα: ${Math.min(currentStep, totalSteps)} από ${totalSteps}`}
        </p>
      </div>
    </CardSection>
  );
}

function buildSteps(completedFlags: boolean[], cur: number): {
  steps: GuideStepRow[];
  completedCount: number;
  currentStep: number;
} {
  const completedCount = completedFlags.filter(Boolean).length;
  const steps: GuideStepRow[] = STEP_DEFS.map((def, i) => {
    const id = i + 1;
    const completed = completedFlags[i];
    const active = cur === id;
    const locked = !completed && cur < id;
    return { ...def, id, completed, active, locked };
  });
  return { steps, completedCount, currentStep: Math.min(cur, 4) };
}

const STEP_DEFS = [
  {
    title: 'Επιβεβαίωση εγγράφων',
    description: 'Έλεγχος και έγκριση εγγράφων πριν την υπογραφή (λογική όπως στο Βήμα 1 της Επισκόπησης).',
  },
  {
    title: 'Ραντεβού υπογραφής',
    description: 'Διαθέσιμες ώρες, έγκριση προτάσεων — tab Ραντεβού.',
  },
  {
    title: 'Ολοκλήρωση αγοραπωλησίας',
    description: 'Αναμονή επιβεβαίωσης αγοραστή και πωλητή μετά την υπογραφή.',
  },
] as const;
