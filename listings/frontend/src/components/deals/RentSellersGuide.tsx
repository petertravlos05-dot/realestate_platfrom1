'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DealRoom } from '@/lib/api/deals';
import { FaCheckCircle, FaCircle, FaCalendarAlt, FaHandshake, FaFileAlt, FaFilePdf, FaInfoCircle, FaArrowRight, FaEuroSign, FaDownload, FaTimesCircle, FaExternalLinkAlt, FaLock } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { uploadDocument, reviewDocument, downloadDocument } from '@/lib/api/dealDocuments';
import { notifyRentTenant, confirmRentCompletion, submitRentMyAadeDeclaration } from '@/lib/api/deals';
import CardSection from './ui/CardSection';
import { OfferModalContent } from './SellersPurchaseGuide';
import { toast } from 'react-hot-toast';

interface RentSellersGuideProps {
  deal: DealRoom;
  sseEvents?: any[];
  onRefresh?: () => void;
  embedded?: boolean;
  compact?: boolean;
}

function getIsRent(deal: DealRoom): boolean {
  const a = (deal.property as any)?.amenities;
  if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
    return String(a.listingType || a.transactionType).toLowerCase() === 'rent';
  }
  return false;
}

export default function RentSellersGuide({ deal, sseEvents = [], onRefresh, embedded, compact = false }: RentSellersGuideProps) {
  const router = useRouter();
  const isRent = getIsRent(deal);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [showMyAadeModal, setShowMyAadeModal] = useState(false);
  const [myAadeDeclarationNumber, setMyAadeDeclarationNumber] = useState('');
  const [showContractUploadRef, setShowContractUploadRef] = useState(false);
  const [showStep4ActionsModal, setShowStep4ActionsModal] = useState(false);
  const [showNotifyConfirmModal, setShowNotifyConfirmModal] = useState(false);
  const [isNotifyingTenant, setIsNotifyingTenant] = useState(false);
  const [isApprovingDoc, setIsApprovingDoc] = useState(false);
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [isSubmittingMyAade, setIsSubmittingMyAade] = useState(false);

  const listingPrice = deal.property?.price ? Math.round(Number(deal.property.price)) : 0;
  const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
  const pendingBuyerOffer = deal.offers?.find(o => o.role === 'BUYER' && o.status === 'PENDING');
  const hasBuyerOffer = deal.offers?.some(o => o.role === 'BUYER');

  const isBasicDocumentsApproved = (): boolean => {
    const buyerDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER') || [];
    const idDoc = buyerDocs.find(d => d.category.toLowerCase().includes('ταυτότητα') || d.category.toLowerCase().includes('identity'));
    const afmDoc = buyerDocs.find(d => d.category.toLowerCase().includes('αφμ') || d.category.toLowerCase().includes('tax'));
    return !!(idDoc?.status === 'APPROVED' && afmDoc?.status === 'APPROVED');
  };

  const contractDraft = deal.documents?.find(d =>
    (d.category.toLowerCase().includes('μισθωτήριο') || d.category.toLowerCase().includes('συμβόλαιο')) &&
    (d.status === 'UPLOADED' || d.status === 'APPROVED') && d.fileName
  );
  const buyerSignedContract = deal.documents?.find(d =>
    d.category.toLowerCase().includes('υπογεγραμμένο') && (d.status === 'UPLOADED' || d.status === 'APPROVED')
  );
  const bothSignedContract = deal.documents?.find(d =>
    d.category.toLowerCase().includes('τελικ') && (d.status === 'UPLOADED' || d.status === 'APPROVED')
  );
  // Tenant's signed PDF uploaded (pending approval) or approved by landlord
  const tenantSignedDoc = deal.documents?.find(d =>
    d.category.toLowerCase().includes('υπογεγραμμένο') &&
    d.uploadedById === deal.buyerId &&
    (d.status === 'UPLOADED' || d.status === 'APPROVED')
  );
  const tenantSignedApproved = tenantSignedDoc?.status === 'APPROVED';
  const landlordNotifiedGovGr = !!(deal.rentSigningMetadata as any)?.landlordNotifiedTenantGovGrAt;
  const rentMyAadeSubmitted = typeof window !== 'undefined' && sessionStorage.getItem(`rentSellerMyAadeSubmitted_${deal.id}`) === 'true';
  const rentCompletion = deal.rentCompletionMetadata as { buyerMyAadeConfirmedAt?: string; sellerCompletionConfirmedAt?: string; buyerCompletionConfirmedAt?: string; sellerMyAadeDeclarationNumber?: string } | null | undefined;
  const buyerMyAadeConfirmed = !!rentCompletion?.buyerMyAadeConfirmedAt;
  const sellerCompletionConfirmed = !!rentCompletion?.sellerCompletionConfirmedAt;
  const buyerCompletionConfirmed = !!rentCompletion?.buyerCompletionConfirmedAt;
  const dealClosed = deal.status === 'CLOSED' || (sellerCompletionConfirmed && buyerCompletionConfirmed);

  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (dealClosed) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(t);
    }
  }, [dealClosed]);

  const rentSigningProposal = deal.rentSigningProposal as { startAt?: string; endAt?: string; formattedDate?: string; formattedTime?: string } | null;
  const proposalFromSse = sseEvents?.find((e: any) => e.type === 'rent_signing_proposal')?.metadata;

  const step1Done = hasBuyerOffer || hasAcceptedOffer;
  const step2Done = hasAcceptedOffer;
  const step3Done = isBasicDocumentsApproved();
  // Βήμα 4 ολοκληρώνεται ΜΟΝΟ όταν ο ιδιοκτήτης εγκρίνει το "Υπογεγραμμένο Μισθωτήριο Συμφωνητικό" από το tab Έγγραφα & Ενέργειες
  const step4Done = !!tenantSignedApproved || !!bothSignedContract;
  const step5Done = step4Done;
  const step5MyAadeDone = rentMyAadeSubmitted || !!rentCompletion?.sellerMyAadeDeclarationNumber || dealClosed;
  const step6Done = dealClosed;

  const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : !step4Done ? 4 : !step5MyAadeDone ? 5 : 6;

  const isStepLocked = (stepNum: number): boolean => {
    if (stepNum === 1) return false;
    if (stepNum === 2) return !step1Done;
    if (stepNum === 3) return !step2Done;
    if (stepNum === 4) return !step3Done;
    if (stepNum === 5) return !step4Done;
    if (stepNum === 6) return !step5MyAadeDone;
    return false;
  };

  const stepIcons = [
    <FaCalendarAlt key="1" />,
    <FaHandshake key="2" />,
    <FaFileAlt key="3" />,
    <FaFileAlt key="4" />,
    <FaFilePdf key="5" />,
    <FaCheckCircle key="6" />,
  ];

  const steps = [
    {
      id: 1,
      title: 'Κανονισμός Ραντεβού',
      description: 'Κανονίστε το ραντεβού προβολής με τον ενοικιαστή',
      instructions: ['Πηγαίνετε στο tab Ραντεβού', 'Εγκρίνετε ή απορρίψτε τα αιτήματα ραντεβού'],
      actionLabel: 'Δείτε Ραντεβού',
      completed: step1Done,
      active: currentStep === 1,
      action: () => router.push(`/deals/${deal.id}?tab=appointments`),
    },
    {
      id: 2,
      title: 'Αξιολόγηση Ενδιαφέροντος & Προσφοράς',
      description: hasAcceptedOffer ? 'Η προσφορά έχει γίνει αποδεκτή' : pendingBuyerOffer
        ? 'Ο ενοικιαστής έκανε προσφορά. Αξιολογήστε την.'
        : !hasBuyerOffer
        ? 'Αναμένετε τον ενοικιαστή να κάνει προσφορά ή να αποδεχτεί την αρχική τιμή'
        : 'Αξιολογήστε την προσφορά του ενοικιαστή',
      instructions: hasAcceptedOffer ? [] : pendingBuyerOffer
        ? ['Μπορείτε να αποδεχτείτε, να κάνετε αντιπρόταση ή να απορρίψετε']
        : [],
      actionLabel: hasAcceptedOffer ? undefined : pendingBuyerOffer ? 'Αξιολόγηση Προσφοράς' : undefined,
      completed: step2Done,
      active: currentStep === 2,
      action: () => setShowOfferModal(true),
    },
    {
      id: 3,
      title: 'Έλεγχος Ταυτοποίησης (KYC)',
      description: 'Εγκρίνετε την Ταυτότητα και το Αποδεικτικό ΑΦΜ του ενοικιαστή',
      instructions: [
        'Πηγαίνετε στο tab Έγγραφα & Ενέργειες',
        'Δίπλα από Ταυτότητα και ΑΦΜ που ανέβασε ο ενοικιαστής, πατήστε Έγκριση ή Απόρριψη',
        'Μόλις εγκρίνετε και τα δύο, το βήμα ολοκληρώνεται',
      ],
      actionLabel: 'Έλεγχος Εγγράφων Ενοικιαστή',
      completed: step3Done,
      active: currentStep === 3,
      action: () => router.push(`/deals/${deal.id}?tab=documents`),
    },
    {
      id: 4,
      title: 'Προετοιμασία & Υπογραφή Συμφωνητικού',
      description: rentSigningProposal || proposalFromSse
        ? `Ο ενοικιαστής πρότεινε δια ζώσης: ${(rentSigningProposal?.formattedDate || proposalFromSse?.formattedDate) ?? ''} ${(rentSigningProposal?.formattedTime || proposalFromSse?.formattedTime) ?? ''}`
        : buyerSignedContract
        ? 'Ο ενοικιαστής υπέγραψε ψηφιακά. Ελέγξτε το έγγραφο και εγκρίνετε το ή ανεβάστε το τελικό PDF εδώ.'
        : 'Ανεβάστε το μισθωτήριο και ξεκινήστε τη διαδικασία ψηφιακής υπογραφής.',
      instructions: rentSigningProposal || proposalFromSse ? [] : buyerSignedContract ? [] : [
        'Για Ηλεκτρονική Υπογραφή (Gov.gr): Μεταβείτε στο docs.gov.gr (Ψηφιακή Βεβαίωση Ιδιωτικού Συμφωνητικού). Επιλέξτε "Νέο συμφωνητικό", ανεβάστε το PDF του συμβολαίου, εισάγετε το ΑΦΜ του ενοικιαστή και προσθέστε την υπογραφή σας.',
        'Πατήστε το κουμπί «Ειδοποίηση Ενοικιαστή» παρακάτω, ώστε να ενημερωθεί για να μπει στο gov.gr (στις Εκκρεμότητες) και να το υπογράψει.',
        'Μόλις το υπογράψει και ο ενοικιαστής, κατεβάστε το τελικό αρχείο και ανεβάστε το εδώ.',
        'Για Δια ζώσης: Κανονίστε ημερομηνία και ώρα με τον ενοικιαστή για τη φυσική υπογραφή του συμβολαίου.',
      ],
      actionLabel: rentSigningProposal || proposalFromSse
        ? 'Επιβεβαίωση Ραντεβού Υπογραφής'
        : buyerSignedContract
        ? 'Τελική Υπογραφή Συμβολαίου'
        : 'Ενέργειες Βήματος 4',
      completed: step4Done,
      active: currentStep === 4,
      action: () => {
        if (rentSigningProposal || proposalFromSse) {
          if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
          onRefresh?.();
          toast.success('Το βήμα ολοκληρώθηκε.');
        } else if (buyerSignedContract) {
          setShowContractUploadRef(true);
        } else {
          setShowStep4ActionsModal(true);
        }
      },
    },
    {
      id: 5,
      title: 'Κατάθεση Μισθωτηρίου (myAADE)',
      description: 'Υποβάλετε τη δήλωση μίσθωσης στην Εφορία για να κατοχυρωθεί νομικά η ενοικίαση.',
      instructions: [
        'Συγκεντρώστε τα απαιτούμενα στοιχεία (ΑΤΑΚ ακινήτου, Ενεργειακό Πιστοποιητικό, ΑΦΜ ενοικιαστή).',
        'Μεταβείτε στην πλατφόρμα της ΑΑΔΕ (Δηλώσεις Μίσθωσης Ακινήτων).',
        'Καταθέστε τα στοιχεία της μίσθωσης.',
        'Επιστρέψτε εδώ και καταχωρήστε τον Αριθμό Δήλωσης για να ειδοποιηθεί ο ενοικιαστής να κάνει Αποδοχή.',
      ],
      actionLabel: 'Υποβολή στο TaxisNet',
      completed: step5MyAadeDone,
      active: currentStep === 5,
      action: () => setShowMyAadeModal(true),
    },
    {
      id: 6,
      title: 'Επιβεβαίωση Ολοκλήρωσης & Παράδοση Κλειδιών',
      description: 'Επιβεβαιώστε την ολοκλήρωση της ενοικίασης',
      instructions: [
        'Ο ενοικιαστής πρέπει πρώτα να κάνει "Αποδοχή" του μισθωτηρίου στο myAADE',
        'Προχωρήστε στην παράδοση των κλειδιών του ακινήτου στον νέο ενοικιαστή',
        'Πατήστε το παρακάτω κουμπί για να επιβεβαιώσετε την επιτυχή ολοκλήρωση',
        'Σημαντικό: Το Deal θα κλείσει οριστικά στην πλατφόρμα μόνο όταν και οι δύο πλευρές πατήσουν την ολοκλήρωση',
        'Μόλις επιβεβαιώσουν και τα δύο μέρη, η διαδικασία ολοκληρώνεται με επιτυχία!',
      ],
      actionLabel: 'Επιβεβαίωση Ολοκλήρωσης Deal',
      completed: step6Done,
      active: currentStep === 6 && !step6Done,
      action: async () => {
        setIsConfirmingCompletion(true);
        try {
          const res = await confirmRentCompletion(deal.id, 'SELLER');
          toast.success(res.message);
          onRefresh?.();
          if (res.dealClosed) setShowMyAadeModal(false);
        } catch (e: any) {
          toast.error(e?.message || 'Σφάλμα επιβεβαίωσης');
        } finally {
          setIsConfirmingCompletion(false);
        }
      },
      actionDisabled: !buyerMyAadeConfirmed,
      actionDisabledMessage: 'Αναμονή αποδοχής myAADE από ενοικιαστή',
    },
  ];

  const handleStepClick = (stage: typeof steps[0]) => {
    if (dealClosed || isStepLocked(stage.id)) return;
    const stepWithExtras = stage as typeof stage & { actionDisabled?: boolean };
    if (stepWithExtras.actionDisabled) return;
    if (stage.action && typeof stage.action === 'function') stage.action();
  };

  const completedStepsCount = steps.filter(s => s.completed).length;

  // Main content: compact or full layout (ομοίως με SellersPurchaseGuide - χωρίς έξτρα banner όταν ολοκληρωθεί)
  const mainContent = compact ? (
    <CardSection title="Οδηγός Ενοικίασης Ακινήτου">
        <p className="text-xs text-gray-600 mb-5 font-medium">
          Ακολουθήστε τα βήματα για να ολοκληρώσετε την ενοικίαση
        </p>
        <div className="space-y-1">
          {steps.map((stage, index) => {
            const isCompleted = stage.completed;
            const isActive = stage.active;
            const isLocked = isStepLocked(stage.id);
            const stepWithExtras = stage as typeof stage & { actionDisabled?: boolean };
            const isDisabled = stepWithExtras.actionDisabled;
            return (
              <div
                key={stage.id}
                onClick={() => !isLocked && !isDisabled && !dealClosed && handleStepClick(stage)}
                className={`
                  relative p-3 rounded-lg transition-all group
                  ${isLocked || isDisabled ? 'cursor-not-allowed' : dealClosed ? 'cursor-default' : 'cursor-pointer'}
                  ${
                    dealClosed && isCompleted
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                      : isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm'
                      : isCompleted
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                      : isLocked || isDisabled
                      ? 'bg-gray-50 border-2 border-gray-200 opacity-60'
                      : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                  }
                `}
              >
                {index < steps.length - 1 && (
                  <div className={`absolute left-5 top-10 w-0.5 h-5 z-0 ${
                    isCompleted ? 'bg-gradient-to-b from-green-400 to-green-300' :
                    isActive ? 'bg-gradient-to-b from-blue-400 to-blue-300' : 'bg-gray-300'
                  }`} />
                )}
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                    isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' :
                    isLocked || isDisabled ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? <FaCheckCircle className="text-xs" /> : isLocked || isDisabled ? <FaLock className="text-xs" /> : stepIcons[index]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-xs ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : isLocked || isDisabled ? 'text-gray-400' : 'text-gray-800'
                    }`}>
                      Βήμα {index + 1}: {stage.title}
                    </h3>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${
                      isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : isLocked || isDisabled ? 'text-gray-400' : 'text-gray-600'
                    }`}>
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
            <span className="text-sm font-extrabold text-blue-700">{completedStepsCount} / 6 βήματα</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(completedStepsCount / 6) * 100}%` }} />
          </div>
        </div>
      </CardSection>
    ) : (
    <>
      {!embedded && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Οδηγός Ενοικίασης Ακινήτου</h2>
          <p className="text-gray-600">Ακολουθήστε τα βήματα για να ολοκληρώσετε την ενοικίαση</p>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Πρόοδος</span>
          <span className="text-sm font-bold text-blue-600">
            {steps.filter(s => s.completed).length} / 6 βήματα
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(steps.filter(s => s.completed).length / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isActive = step.active;
          const stepWithExtras = step as typeof step & { actionDisabled?: boolean; actionDisabledMessage?: string };
          return (
            <div
              key={step.id}
              onClick={() => isActive && !stepWithExtras.actionDisabled && 'action' in step && step.action && typeof step.action === 'function' && step.action()}
              className={`rounded-xl border-2 p-6 transition-all duration-200 ${
                isActive ? 'border-blue-500 bg-blue-50 shadow-lg cursor-pointer' : isCompleted ? 'border-green-300 bg-green-50 cursor-default' : 'border-gray-200 bg-white cursor-default'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {isCompleted ? <FaCheckCircle /> : step.id}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-lg font-bold ${isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'}`}>
                      Βήμα {step.id}: {step.title}
                    </h3>
                    {isCompleted && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">ΟΛΟΚΛΗΡΩΘΗΚΕ</span>}
                    {isActive && <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">ΤΡΕΧΟΝ ΒΗΜΑ</span>}
                  </div>
                  <p className="text-gray-600 mb-4">{step.description}</p>
                  {step.instructions && step.instructions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaInfoCircle className="text-blue-500" />
                        Πώς να προχωρήσετε:
                      </h4>
                      <ul className="space-y-2">
                        {step.instructions.map((instruction, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <FaCircle className="text-[6px] text-blue-500 mt-2 flex-shrink-0" />
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {isActive && step.actionLabel && (
                    <>
                      {stepWithExtras.actionDisabled ? (
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium">
                          {stepWithExtras.actionDisabledMessage || step.actionLabel}
                        </div>
                      ) : sellerCompletionConfirmed && !step6Done ? (
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-800 rounded-lg font-medium">
                          Αναμονή επιβεβαίωσης από τον άλλο
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            typeof step.action === 'function' && step.action();
                          }}
                          disabled={isConfirmingCompletion && step.id === 6}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isConfirmingCompletion && step.id === 6 ? 'Αποστολή...' : step.actionLabel}
                          <FaArrowRight />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Confetti + μήνυμα ολοκλήρωσης όταν το ακίνητο ενοικιάστηκε */}
      {dealClosed && (
        <>
          {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden">
            {Array.from({ length: 150 }).map((_, i) => {
              const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
              const color = colors[Math.floor(Math.random() * colors.length)];
              const startX = Math.random() * 100;
              const rotation = Math.random() * 360;
              const delay = Math.random() * 1.5;
              const duration = 3 + Math.random() * 2;
              const drift = (Math.random() - 0.5) * 400;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    backgroundColor: color,
                    width: `${6 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 8}px`,
                    left: `${startX}%`,
                    top: '-20px',
                  }}
                  initial={{ y: 0, rotate: 0, opacity: 1, x: 0 }}
                  animate={{
                    y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                    rotate: rotation + 720,
                    opacity: [1, 1, 0.8, 0],
                    x: [0, drift * 0.3, drift * 0.7, drift],
                  }}
                  transition={{ duration, delay, ease: [0.5, 0, 0.5, 1] }}
                />
              );
            })}
          </div>
          )}
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-lg">
            <div className="flex items-center gap-4">
              <FaCheckCircle className="text-green-600 text-4xl flex-shrink-0" />
              <div>
                <h3 className="text-2xl font-bold text-green-900">Το ακίνητο ενοικιάστηκε! Συγχαρητήρια! 🎉</h3>
                <p className="text-green-800 mt-1">Η ενοικίαση ολοκληρώθηκε επιτυχώς. Και οι δύο πλευρές έχουν επιβεβαιώσει την ολοκλήρωση.</p>
              </div>
            </div>
          </div>
        </>
      )}
      {mainContent}
      {showOfferModal && (
        <OfferModalContent
          deal={deal}
          counterAmount={counterAmount}
          setCounterAmount={setCounterAmount}
          counterMessage={counterMessage}
          setCounterMessage={setCounterMessage}
          isSubmittingOffer={isSubmittingOffer}
          setIsSubmittingOffer={setIsSubmittingOffer}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); onRefresh?.(); }}
          onRefresh={onRefresh}
        />
      )}

      {showMyAadeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Βήμα 5: Κατάθεση Μισθωτηρίου (myAADE)</h3>
              <button onClick={() => setShowMyAadeModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <h4 className="font-semibold text-gray-900 mb-3">Οδηγίες Υποβολής:</h4>
            <p className="text-sm text-gray-600 mb-3">Βεβαιωθείτε ότι έχετε πρόχειρα:</p>
            <ul className="space-y-1 mb-4">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 font-bold">•</span>
                <span>Το ΑΦΜ του ενοικιαστή (μπορείτε να το βρείτε στο tab &quot;Έγγραφα&quot;).</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 font-bold">•</span>
                <span>Τον ΑΤΑΚ του ακινήτου σας.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 font-bold">•</span>
                <span>Τον αριθμό του Πιστοποιητικού Ενεργειακής Απόδοσης (ΠΕΑ).</span>
              </li>
            </ul>

            <a
              href="https://myaade.gov.gr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium mb-4"
            >
              <FaExternalLinkAlt /> Μετάβαση στην πύλη myAADE
            </a>

            <div className="space-y-3 text-sm text-gray-700 mb-4">
              <p><strong>Εκεί θα πρέπει να πατήσουν:</strong> «Εφαρμογές» → «Πολίτες» → Γράμμα &quot;Δ&quot; → «Δηλώσεις Μίσθωσης Ακινήτων».</p>

              <p><strong>1. Ξεκινήστε τη Δήλωση</strong><br />Μέσα στην εφαρμογή, πατήστε το κουμπί «Υποβολή Δήλωσης» (ή το εικονίδιο &quot;➕&quot; για δημιουργία νέας).</p>

              <p><strong>2. Συμπληρώστε τις 3 ενότητες:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1 text-gray-600">
                <li><strong>Στοιχεία Μίσθωσης:</strong> Βάλτε την ημερομηνία έναρξης/λήξης και το ποσό του μηνιαίου ενοικίου.</li>
                <li><strong>Στοιχεία Ακινήτου:</strong> Εισάγετε τον ΑΤΑΚ του ακινήτου σας και τον Αριθμό Πρωτοκόλλου του Ενεργειακού Πιστοποιητικού (ΠΕΑ).</li>
                <li><strong>Στοιχεία Μισθωτών:</strong> Πατήστε προσθήκη και γράψτε το ΑΦΜ του ενοικιαστή (το σύστημα θα εμφανίσει το όνομά του αυτόματα).</li>
              </ul>

              <p><strong>3. Ολοκλήρωση</strong><br />Πατήστε «Αποθήκευση» και στη συνέχεια «Οριστικοποίηση» για να κατατεθεί η δήλωση.</p>

              <p><strong>4. Αντιγραφή Αριθμού</strong><br />Μόλις οριστικοποιηθεί, θα εμφανιστεί στην οθόνη (και στο PDF) ο «Αριθμός Δήλωσης». Αντιγράψτε τον, επιστρέψτε εδώ και επικολλήστε τον παρακάτω:</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Καταχωρήστε τον Αριθμό Δήλωσης Μίσθωσης:</label>
              <input
                type="text"
                value={myAadeDeclarationNumber}
                onChange={(e) => setMyAadeDeclarationNumber(e.target.value)}
                placeholder="π.χ. 123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowMyAadeModal(false)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium" disabled={isSubmittingMyAade}>
                Ακύρωση
              </button>
              <button
                onClick={async () => {
                  if (!myAadeDeclarationNumber?.trim()) {
                    toast.error('Εισάγετε τον Αριθμό Δήλωσης');
                    return;
                  }
                  setIsSubmittingMyAade(true);
                  try {
                    await submitRentMyAadeDeclaration(deal.id, myAadeDeclarationNumber.trim());
                    if (typeof window !== 'undefined') sessionStorage.setItem(`rentSellerMyAadeSubmitted_${deal.id}`, 'true');
                    setShowMyAadeModal(false);
                    setMyAadeDeclarationNumber('');
                    onRefresh?.();
                    toast.success('Το βήμα ολοκληρώθηκε.');
                  } catch (e: any) {
                    toast.error(e?.message || 'Σφάλμα υποβολής');
                  } finally {
                    setIsSubmittingMyAade(false);
                  }
                }}
                disabled={isSubmittingMyAade}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium disabled:opacity-60"
              >
                {isSubmittingMyAade ? 'Υποβολή...' : 'Επιβεβαίωση Υποβολής'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStep4ActionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Βήμα 4: Προετοιμασία & Υπογραφή Συμφωνητικού</h3>
              <button onClick={() => setShowStep4ActionsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            {landlordNotifiedGovGr ? (
              /* Landlord έχει ήδη ειδοποιήσει – αναμονή ή έγκριση εγγράφου */
              <div className="space-y-4">
                {tenantSignedApproved ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FaCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Το βήμα ολοκληρώθηκε</h4>
                        <p className="text-sm text-green-800">Το υπογεγραμμένο συμβόλαιο εγκρίθηκε. Ο ενοικιαστής και εσείς ολοκληρώσατε τη διαδικασία υπογραφής.</p>
                      </div>
                    </div>
                  </div>
                ) : tenantSignedDoc ? (
                  /* Ο ενοικιαστής ανέβασε το PDF – εμφάνιση και έγκριση */
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Ο ενοικιαστής ανέβασε το υπογεγραμμένο PDF</h4>
                      <p className="text-sm text-blue-800 mb-3">{tenantSignedDoc.fileName}</p>
                      <button
                        onClick={() => downloadDocument(tenantSignedDoc.id, tenantSignedDoc.fileName)}
                        className="inline-flex items-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        <FaDownload /> Λήψη PDF
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">Ελέγξτε το έγγραφο και εγκρίνετε το ή ζητήστε διορθώσεις. Το έγγραφο φαίνεται και στο tab Έγγραφα & Ενέργειες.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setIsApprovingDoc(true);
                          try {
                            await reviewDocument(tenantSignedDoc.id, { status: 'APPROVED' });
                            toast.success('Το έγγραφο εγκρίθηκε. Το βήμα ολοκληρώθηκε.');
                            onRefresh?.();
                          } catch (err: any) {
                            toast.error(err?.message || 'Σφάλμα έγκρισης');
                          } finally {
                            setIsApprovingDoc(false);
                          }
                        }}
                        disabled={isApprovingDoc}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                      >
                        <FaCheckCircle /> {isApprovingDoc ? 'Εγκρίνεται...' : 'Έγκριση'}
                      </button>
                      <button
                        onClick={async () => {
                          const note = prompt('Παρακαλώ εισάγετε τον λόγο απόρριψης:');
                          if (note !== null) {
                            setIsApprovingDoc(true);
                            try {
                              await reviewDocument(tenantSignedDoc.id, { status: 'CHANGES_REQUESTED', note });
                              toast.success('Ζητήθηκε επανεποπτεία από τον ενοικιαστή.');
                              onRefresh?.();
                            } catch (err: any) {
                              toast.error(err?.message || 'Σφάλμα');
                            } finally {
                              setIsApprovingDoc(false);
                            }
                          }
                        }}
                        disabled={isApprovingDoc}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                      >
                        <FaTimesCircle /> Απόρριψη
                      </button>
                    </div>
                    <button onClick={() => router.push(`/deals/${deal.id}?tab=documents`)} className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                      Μετάβαση στο tab Έγγραφα & Ενέργειες
                    </button>
                  </div>
                ) : (
                  /* Αναμονή – ο ενοικιαστής δεν έχει ανεβάσει ακόμα */
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">Αναμονή εγγράφου</h4>
                    <p className="text-sm text-amber-800">
                      Η ειδοποίηση στάλθηκε στον ενοικιαστή. Αναμένετε να ανεβάσει το υπογεγραμμένο τελικό PDF του συμβολαίου. Όταν το ανεβάσει, θα εμφανιστεί εδώ καθώς και στο tab «Έγγραφα & Ενέργειες».
                    </p>
                    <button onClick={onRefresh} className="mt-4 w-full py-2 px-4 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 font-medium">
                      Ανανέωση
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Δεν έχει ειδοποιήσει ακόμα – κουμπιά Μετάβαση και Ειδοποίηση */
              <>
                <p className="text-gray-600 mb-6">
                  Αφού ολοκληρώσετε τη διαδικασία στο docs.gov.gr (ανέβασμα PDF, εισαγωγή ΑΦΜ ενοικιαστή, υπογραφή σας), πατήστε «Ειδοποίηση Ενοικιαστή» για να ενημερωθεί.
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="https://docs.gov.gr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <FaFilePdf /> Μετάβαση στο docs.gov.gr
                  </a>
                  <button
                    onClick={() => setShowNotifyConfirmModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                  >
                    Ειδοποίηση Ενοικιαστή
                  </button>
                </div>
              </>
            )}

            <button onClick={() => setShowStep4ActionsModal(false)} className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
              Κλείσιμο
            </button>
          </div>
        </div>
      )}

      {showNotifyConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Επιβεβαίωση Ειδοποίησης</h3>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900">
                Πατώντας το κουμπί επιβεβαιώνετε ότι έχετε ολοκληρώσει τη διαδικασία από την πλευρά σας μέσω του docs.gov.gr (ανέβασμα του συμβολαίου, εισαγωγή ΑΦΜ ενοικιαστή και υπογραφή σας).
              </p>
              <p className="text-sm text-amber-900 mt-2 font-medium">
                Θα ανημερωθεί ο ενοικιαστής και θα περιμένετε να ανεβάσει το υπογεγραμμένο τελικό PDF του συμβολαίου.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotifyConfirmModal(false)}
                disabled={isNotifyingTenant}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Ακύρωση
              </button>
              <button
                onClick={async () => {
                  setIsNotifyingTenant(true);
                  try {
                    await notifyRentTenant(deal.id);
                    toast.success('Η ειδοποίηση στάλθηκε στον ενοικιαστή.');
                    setShowNotifyConfirmModal(false);
                    onRefresh?.();
                    /* Δεν κλείνουμε το Step 4 modal - μένει ανοιχτό και δείχνει το μήνυμα αναμονής */
                  } catch (err: any) {
                    toast.error(err?.message || 'Σφάλμα αποστολής ειδοποίησης');
                  } finally {
                    setIsNotifyingTenant(false);
                  }
                }}
                disabled={isNotifyingTenant}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {isNotifyingTenant ? 'Αποστολή...' : 'Επιβεβαίωση'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractUploadRef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Τελική Υπογραφή Συμβολαίου</h3>
              <button onClick={() => setShowContractUploadRef(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Οδηγίες:</h4>
              <p className="text-sm text-blue-800 mb-2">
                Κατεβάστε το υπογεγραμμένο PDF από τον ενοικιαστή, μεταβείτε στο docs.gov.gr, προσθέστε τη δική σας ψηφιακή υπογραφή, και ανεβάστε το τελικό αρχείο εδώ.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ανεβάστε το τελικό PDF (με τις δύο υπογραφές)</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('category', 'Τελικό Μισθωτήριο Συμφωνητικό (Υπογεγραμμένο)');
                    await uploadDocument(deal.id, fd);
                    toast.success('Το έγγραφο ανέβηκε επιτυχώς.');
                    if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                    setShowContractUploadRef(false);
                    onRefresh?.();
                  } catch {
                    toast.error('Σφάλμα ανεβάσματος');
                  }
                  e.target.value = '';
                }}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>
            <button onClick={() => setShowContractUploadRef(false)} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
              Κλείσιμο
            </button>
          </div>
        </div>
      )}
    </>
  );
}
