'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isLawyer } from '@/lib/utils/dealRole';
import CardSection from './ui/CardSection';
import { FaCheckCircle, FaLock, FaUserTie, FaFileAlt, FaFolderOpen, FaBalanceScale, FaHourglassHalf, FaGavel, FaPenFancy } from 'react-icons/fa';
import { useDealRoomTheme } from './useDealRoomTheme';

interface BuyersLawyerSidebarGuideProps {
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
 * Αριστερή στήλη: συνοπτικά βήματα δικηγόρου αγοραστή (ίδια λογική με OverviewTab, όπως ο οδηγός αγοραστή).
 */
export default function BuyersLawyerSidebarGuide({ deal, sseEvents = [] }: BuyersLawyerSidebarGuideProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { isProfessionalContext } = useDealRoomTheme();

  const sellerId = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;

  const isBuyersLawyer =
    !!userId &&
    isLawyer(deal, userId) &&
    !!deal.requests?.some(
      (r) =>
        r.status === 'ACCEPTED' &&
        r.type === 'LAWYER' &&
        r.requestedById === deal.buyerId &&
        r.professional?.user?.id === userId
    );

  const hasSellerLawyerInDeal = !!deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
  );

  const sellerLawyerPendingSellerDocsForGate = (deal.documents || []).filter(
    (d) => d.requestedFromRole === 'SELLER' && d.status === 'REQUESTED'
  ).length;
  const sellerLawyerUploadedSellerDocsForGate = (deal.documents || []).filter(
    (d) => d.requestedFromRole === 'SELLER' && (d.status === 'UPLOADED' || d.status === 'APPROVED')
  ).length;
  const sellerLawyerGuideStep1DoneForBuyer =
    sellerLawyerUploadedSellerDocsForGate > 0 && sellerLawyerPendingSellerDocsForGate === 0;
  const buyerLawyerStep3ApproveUnlocked =
    !hasSellerLawyerInDeal || sellerLawyerGuideStep1DoneForBuyer;

  const { steps, completedCount, currentStep } = useMemo((): {
    steps: GuideStepRow[];
    completedCount: number;
    currentStep: number;
  } => {
    if (!isBuyersLawyer) {
      return { steps: [], completedCount: 0, currentStep: 1 };
    }

    const hasBuyerPurchaseConfirmation = !!deal.buyerSigningConfirmed;
    const hasSellerPurchaseConfirmation = !!deal.sellerSigningConfirmed;
    const isPurchaseCompletedByBothSides = hasBuyerPurchaseConfirmation && hasSellerPurchaseConfirmation;

    const hasNotaryApproval =
      !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

    const lawyerApprovedSellerDocs =
      !!deal.lawyerApprovedSellerDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'lawyer_approved_seller_documents');

    const sellerLawyerApprovedBuyerFolder =
      sseEvents?.some((e: any) => e.type === 'lawyer_approved_buyer_progress') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`) === 'true');

    const buyerLawyerStep1Completed =
      !!deal.lawyerApprovedBasicDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit');

    const buyerLawyerStep2Completed =
      !!deal.buyerLawyerCompletedBuyerFolderAt ||
      sseEvents?.some((e: any) => e.type === 'buyer_lawyer_completed_buyer_folder') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`buyerLawyerGuideStep2_${deal.id}`) === 'true');

    const buyerLawyerStep3Completed = lawyerApprovedSellerDocs;

    const buyerLawyerStep4CompletionSignal =
      sellerLawyerApprovedBuyerFolder ||
      (!hasSellerLawyerInDeal &&
        typeof window !== 'undefined' &&
        sessionStorage.getItem(`buyerLawyerStep4NoSellerLawyer_${deal.id}`) === 'true');

    const buyerLawyerStep4Completed =
      buyerLawyerStep1Completed &&
      buyerLawyerStep2Completed &&
      buyerLawyerStep3Completed &&
      buyerLawyerStep4CompletionSignal;

    const buyerLawyerStep5Completed = hasNotaryApproval;
    const buyerLawyerStep6Completed =
      isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED';

    const completedFlags = [
      buyerLawyerStep1Completed,
      buyerLawyerStep2Completed,
      buyerLawyerStep3Completed,
      buyerLawyerStep4Completed,
      buyerLawyerStep5Completed,
      buyerLawyerStep6Completed,
    ];

    const buyerLawyerCurrentStep = !buyerLawyerStep1Completed
      ? 1
      : !buyerLawyerStep2Completed
        ? 2
        : !buyerLawyerStep3Completed
          ? 3
          : !buyerLawyerStep4Completed
            ? 4
            : !buyerLawyerStep5Completed
              ? 5
              : !buyerLawyerStep6Completed
                ? 6
                : 7;

    return buildSteps(completedFlags, buyerLawyerCurrentStep);
  }, [deal, sseEvents, isBuyersLawyer, hasSellerLawyerInDeal]);

  if (!isBuyersLawyer) {
    return null;
  }

  const activeRing = isProfessionalContext
    ? 'bg-gradient-to-r from-teal-50 to-slate-50 border-2 border-teal-500 shadow-sm'
    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm';
  const activeCircle = isProfessionalContext
    ? 'bg-gradient-to-br from-teal-500 to-slate-700 text-white'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white';
  const activeTitle = isProfessionalContext ? 'text-teal-900' : 'text-blue-900';
  const activeDesc = isProfessionalContext ? 'text-teal-800' : 'text-blue-700';
  const progressBar = isProfessionalContext
    ? 'from-teal-600 to-slate-700'
    : 'from-blue-600 to-indigo-600';
  const progressBox = isProfessionalContext
    ? 'from-teal-50 to-slate-50 border-teal-200'
    : 'from-blue-50 to-indigo-50 border-blue-200';
  const progressText = isProfessionalContext ? 'text-teal-900' : 'text-blue-900';
  const progressSub = isProfessionalContext ? 'text-teal-800/80' : 'text-blue-800/80';

  const handleStepClick = (stepId: number, locked: boolean) => {
    if (locked) return;
    if (stepId === 1 || stepId === 4 || stepId === 5) {
      router.push(`/deals/${deal.id}?tab=overview`);
    } else if (stepId === 2 || stepId === 3) {
      router.push(`/deals/${deal.id}?tab=documents`);
    } else if (stepId === 6) {
      router.push(`/deals/${deal.id}?tab=appointments`);
    }
  };

  const stepIcons = [
    <FaFileAlt key="1" className="text-xs" />,
    <FaFolderOpen key="2" className="text-xs" />,
    <FaBalanceScale key="3" className="text-xs" />,
    <FaHourglassHalf key="4" className="text-xs" />,
    <FaGavel key="5" className="text-xs" />,
    <FaPenFancy key="6" className="text-xs" />,
  ];

  return (
    <CardSection title="Οδηγός Δικηγόρου Αγοραστή">
      <p className="text-xs text-gray-600 mb-4 font-medium flex items-center gap-2">
        <FaUserTie className={isProfessionalContext ? 'text-teal-600' : 'text-indigo-600'} />
        Συνοπτικά βήματα — λεπτομέρειες και ενέργειες στο tab Επισκόπηση
      </p>
      <div className="space-y-1">
        {steps.map((stage, index) => {
          const isCompleted = stage.completed;
          const isActive = stage.active;
          const isLocked = stage.locked;
          const step3AwaitingSellerLawyerStep1 =
            stage.id === 3 && isActive && !isCompleted && !buyerLawyerStep3ApproveUnlocked;
          return (
            <div
              key={stage.id}
              onClick={() => handleStepClick(stage.id, isLocked)}
              className={`
                  relative p-3 rounded-lg transition-all group
                  ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${
                    step3AwaitingSellerLawyerStep1
                      ? 'bg-amber-50 border-2 border-amber-400 shadow-sm'
                      : isActive
                        ? activeRing
                        : isCompleted
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                          : isLocked
                            ? 'bg-gray-50 border-2 border-gray-200 opacity-60'
                            : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                  }
                `}
            >
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-5 z-0 ${
                    isCompleted
                      ? 'bg-gradient-to-b from-green-400 to-green-300'
                      : step3AwaitingSellerLawyerStep1
                        ? 'bg-gradient-to-b from-amber-400 to-amber-300'
                        : isActive
                          ? isProfessionalContext
                            ? 'bg-gradient-to-b from-teal-400 to-slate-400'
                            : 'bg-gradient-to-b from-blue-400 to-blue-300'
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
                          : step3AwaitingSellerLawyerStep1
                            ? 'bg-amber-500 text-white'
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
                      step3AwaitingSellerLawyerStep1
                        ? 'text-amber-950'
                        : isActive
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
                      step3AwaitingSellerLawyerStep1
                        ? 'text-amber-900'
                        : isActive
                          ? activeDesc
                          : isCompleted
                            ? 'text-green-700'
                            : isLocked
                              ? 'text-gray-400'
                              : 'text-gray-600'
                    }`}
                  >
                    {stage.description}
                    {step3AwaitingSellerLawyerStep1 && (
                      <span className="block mt-1 font-medium text-amber-950">
                        Αναμονή: Βήμα 1 δικηγόρου πωλητή (φάκελος πωλητή).
                      </span>
                    )}
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
          <span className={`text-sm font-extrabold ${isProfessionalContext ? 'text-teal-700' : 'text-blue-700'}`}>
            {Math.round((completedCount / 6) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className={`bg-gradient-to-r ${progressBar} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${(completedCount / 6) * 100}%` }}
          />
        </div>
        <p className={`text-[10px] mt-2 ${progressSub}`}>
          {completedCount >= 6
            ? 'Όλα τα βήματα ολοκληρώθηκαν.'
            : `Τρέχον βήμα: ${Math.min(currentStep, 6)} από 6`}
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
  return { steps, completedCount, currentStep: Math.min(cur, 7) };
}

const STEP_DEFS = [
  {
    title: 'Βασικά έγγραφα & προκαταβολή',
    description: 'Επιβεβαίωση βασικών εγγράφων για ιδιωτικό και προκαταβολή.',
  },
  {
    title: 'Φάκελος αγοραστή',
    description: 'Ολοκλήρωση συλλογής εγγράφων πελάτη — ξεκλειδώνει έλεγχο από δικηγόρο πωλητή.',
  },
  {
    title: 'Έλεγχος φακέλου πωλητή & ΗΤΚ',
    description: 'Νομικός έλεγχος τίτλων και τεχνικών εγγράφων.',
  },
  {
    title: 'Έγκριση δικηγόρου πωλητή',
    description: 'Αναμονή έγκρισης φακέλου αγοραστή από την άλλη πλευρά (αν υπάρχει).',
  },
  {
    title: 'Συμβολαιογράφος',
    description: 'Έλεγχος εγγράφων από συμβολαιογράφο πριν την υπογραφή.',
  },
  {
    title: 'Υπογραφή συμβολαίων',
    description: 'Παράσταση στο ραντεβού τελικής υπογραφής.',
  },
] as const;
