'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isEngineer } from '@/lib/utils/dealRole';
import CardSection from './ui/CardSection';
import { FaCheckCircle, FaLock, FaWrench, FaFileAlt, FaClipboardCheck, FaBalanceScale, FaPenFancy } from 'react-icons/fa';

interface EngineersDealGuideProps {
  deal: DealRoom;
  sseEvents?: any[];
}

type EngineerGuideStep = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  locked: boolean;
};

/**
 * Συμπαγής αριστερός οδηγός (ίδιο pattern με SellersPurchaseGuide compact / BuyersPurchaseGuide).
 * Μόνο για μηχανικό που έχει αποδεχτεί αίτημα από τον πωλητή (πώληση).
 */
export default function EngineersDealGuide({ deal, sseEvents = [] }: EngineersDealGuideProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const sellerId = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;

  const isSellersEngineer =
    !!userId &&
    isEngineer(deal, userId) &&
    !!deal.requests?.some(
      (r) =>
        r.status === 'ACCEPTED' &&
        r.type === 'ENGINEER' &&
        r.requestedById === sellerId &&
        r.professional?.user?.id === userId
    );

  const isRent = (() => {
    const a = (deal.property as any)?.amenities;
    if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
      return String(a.listingType || a.transactionType).toLowerCase() === 'rent';
    }
    return false;
  })();

  const { steps, completedCount, currentStep } = useMemo((): {
    steps: EngineerGuideStep[];
    completedCount: number;
    currentStep: number;
  } => {
    if (!isSellersEngineer) {
      return { steps: [], completedCount: 0, currentStep: 1 };
    }

    const hasNotaryApproval =
      !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

    const engineerApprovedSellerDocs =
      !!deal.engineerApprovedSellerDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'engineer_approved_seller_documents');
    const lawyerApprovedSellerDocs =
      !!deal.lawyerApprovedSellerDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'lawyer_approved_seller_documents');

    const normalizeCategory = (value?: string) =>
      (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const engineerSellerFolderDocsCount = (deal.documents || []).filter((d) => {
      if (d.requestedFromRole !== 'SELLER') return false;
      const category = normalizeCategory(d.category);
      const isHtkCategory =
        category.includes('ηλεκτρονικη ταυτοτητα κτηριου') ||
        category.startsWith('ητκ') ||
        category.includes('htk');
      return !isHtkCategory && (d.status === 'UPLOADED' || d.status === 'APPROVED');
    }).length;

    const engineerStep1ManualCompletion =
      typeof window !== 'undefined' && sessionStorage.getItem(`engineerGuideStep1_${deal.id}`) === 'true';
    const engineerStep1Completed = engineerStep1ManualCompletion || engineerSellerFolderDocsCount > 0;
    const engineerStep2Completed = engineerStep1Completed && engineerApprovedSellerDocs;
    const engineerStep3Completed = engineerStep2Completed && lawyerApprovedSellerDocs;
    const engineerStep4Completed = engineerStep3Completed && hasNotaryApproval;
    const hasBuyerPurchaseConfirmation = !!deal.buyerSigningConfirmed;
    const hasSellerPurchaseConfirmation = !!deal.sellerSigningConfirmed;
    const isPurchaseCompletedByBothSides = hasBuyerPurchaseConfirmation && hasSellerPurchaseConfirmation;
    const engineerStep5Completed =
      engineerStep4Completed &&
      (isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED');

    const completed = [
      engineerStep1Completed,
      engineerStep2Completed,
      engineerStep3Completed,
      engineerStep4Completed,
      engineerStep5Completed,
    ];
    const completedCount = completed.filter(Boolean).length;
    let cur = 1;
    if (!engineerStep1Completed) cur = 1;
    else if (!engineerStep2Completed) cur = 2;
    else if (!engineerStep3Completed) cur = 3;
    else if (!engineerStep4Completed) cur = 4;
    else if (!engineerStep5Completed) cur = 5;
    else cur = 6;

    const completedBools = [
      engineerStep1Completed,
      engineerStep2Completed,
      engineerStep3Completed,
      engineerStep4Completed,
      engineerStep5Completed,
    ];

    return {
      steps: completedBools.map((completed, i) => {
        const id = i + 1;
        return {
          ...STEP_DEFS[i],
          id,
          completed,
          active: !completed && cur === id,
          locked: !completed && cur < id,
        };
      }),
      completedCount,
      currentStep: Math.min(cur, 5),
    };
  }, [deal, sseEvents, isSellersEngineer]);

  if (!isSellersEngineer || isRent) {
    return null;
  }

  const handleStepClick = (stepId: number, locked: boolean) => {
    if (locked) return;
    switch (stepId) {
      case 1:
      case 2:
        router.push(`/deals/${deal.id}?tab=documents`);
        break;
      default:
        router.push(`/deals/${deal.id}?tab=overview`);
        break;
    }
  };

  const stepIcons = [
    <FaFileAlt key="1" className="text-xs" />,
    <FaWrench key="2" className="text-xs" />,
    <FaClipboardCheck key="3" className="text-xs" />,
    <FaBalanceScale key="4" className="text-xs" />,
    <FaPenFancy key="5" className="text-xs" />,
  ];

  return (
    <CardSection title="Οδηγός Μηχανικού">
      <p className="text-xs text-gray-600 mb-5 font-medium">
        Ακολουθήστε τα βήματα — ίδια μορφή με τον οδηγό αγοραστή στην αριστερή στήλη
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
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm'
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
                      : isActive
                      ? 'bg-gradient-to-b from-blue-400 to-blue-300'
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
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
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
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : isLocked ? 'text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    Βήμα {index + 1}: {stage.title}
                  </h3>
                  <p
                    className={`text-[11px] leading-relaxed mt-0.5 ${
                      isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : isLocked ? 'text-gray-400' : 'text-gray-600'
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
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-blue-900">Πρόοδος</span>
          <span className="text-sm font-extrabold text-blue-700">{Math.round((completedCount / 5) * 100)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 5) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-blue-800/80 mt-2">
          Τρέχον βήμα: {currentStep} από 5 — λεπτομέρειες και ενέργειες στο tab Επισκόπηση.
        </p>
      </div>
    </CardSection>
  );
}

const STEP_DEFS = [
  {
    title: 'Άντληση στοιχείων από Φάκελο Πωλητή',
    description: 'Μελετήστε τίτλους και ΚΑΕΚ από τον φάκελο πωλητή πριν τη σύνταξη ΗΤΚ.',
  },
  {
    title: 'Ανάρτηση & ολοκλήρωση ΗΤΚ',
    description: 'Ανεβάστε ΗΤΚ και τεχνικά στο tab Φάκελοι Συναλλαγής, μετά «Ολοκλήρωση Φακέλου ΗΤΚ».',
  },
  {
    title: 'Έλεγχος από δικηγόρους',
    description: 'Αναμονή νομικού ελέγχου ΗΤΚ και τίτλων από τους δικηγόρους.',
  },
  {
    title: 'Έλεγχος συμβολαιογράφου',
    description: 'Ο συμβολαιογράφος επιβεβαιώνει πληρότητα για το συμβόλαιο.',
  },
  {
    title: 'Ολοκλήρωση διαδικασίας',
    description: 'Μετάβαση σε υπογραφές και κλείσιμο συναλλαγής.',
  },
] as const;
