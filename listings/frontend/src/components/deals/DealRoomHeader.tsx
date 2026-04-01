'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaMapMarkerAlt, FaEuroSign, FaCircle, FaChevronRight, FaTimes, FaExternalLinkAlt, FaQuestionCircle, FaUser, FaUserTie, FaHandshake, FaWrench } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getUserRoleInDeal, isBuyer, isSeller } from '@/lib/utils/dealRole';
import { isBuyerPurchaseGuideStep6Completed } from '@/lib/utils/buyerProgress';
import { useDealRoomTheme } from './useDealRoomTheme';

interface DealRoomHeaderProps {
  deal: DealRoom;
  onRefresh: () => void;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  onNextStepClick?: () => void;
  onCancelDeal?: () => void;
  cancelDealLoading?: boolean;
  onClose?: () => void; // For modal/drawer close
}

function getIsRent(deal: DealRoom): boolean {
  const a = (deal.property as any)?.amenities;
  if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
    return String(a.listingType || a.transactionType).toLowerCase() === 'rent';
  }
  return false;
}

export default function DealRoomHeader({ 
  deal, 
  onRefresh, 
  connectionStatus,
  onNextStepClick,
  onCancelDeal,
  cancelDealLoading = false,
  onClose
}: DealRoomHeaderProps) {
  const property = deal.property;
  const { userId } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from') ?? null;
  const dealsListHref = fromParam === 'agent' || fromParam === 'seller'
    ? `/deals?from=${fromParam}&tab=${fromParam === 'agent' ? 'overview' : 'deals'}`
    : '/deals';
  const isBuyerContext = fromParam !== 'agent' && fromParam !== 'seller';
  const isSellerContext = fromParam === 'seller';
  const { isProfessionalContext } = useDealRoomTheme();
  const accentGradient = isProfessionalContext
    ? 'from-slate-900 to-slate-800'
    : isSellerContext
    ? 'from-green-600 to-emerald-700'
    : isBuyerContext
    ? 'from-blue-800 to-slate-700'
    : 'from-blue-600 to-indigo-600';
  const accentHover = isProfessionalContext
    ? 'hover:from-slate-800 hover:to-slate-700'
    : isSellerContext
    ? 'hover:from-green-700 hover:to-emerald-800'
    : isBuyerContext
    ? 'hover:from-blue-900 hover:to-slate-800'
    : 'hover:from-blue-700 hover:to-indigo-700';
  const accentFocusRing = isProfessionalContext ? 'focus:ring-teal-500' : isSellerContext ? 'focus:ring-green-500' : 'focus:ring-blue-500';

  // Determine user role based on property ownership
  const userRole = getUserRoleInDeal(deal, userId);
  const isBuyerRole = isBuyer(deal, userId);
  const isSellerRole = isSeller(deal, userId);

  // Helper functions to check step completion (matching BuyersPurchaseGuide logic)
  const isStep1Completed = (): boolean => {
    if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) return true;
    const step1Skipped = typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true';
    if (step1Skipped) return true;
    // Fallback: if they have lawyer + accepted offer, they must have completed step 1
    const hasLawyer = deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
    const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
    if (hasLawyer && hasAcceptedOffer) return true;
    
    // Check if there's a confirmed appointment that has passed
    const hasPastConfirmedAppointment = deal.appointments?.some(
      a => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
    ) || false;
    
    return hasPastConfirmedAppointment;
  };

  const isBasicDocumentsApproved = (): boolean => {
    if (deal.lawyerApprovedBasicDocumentsAt) return true;

    if (typeof window !== 'undefined') {
      const storedApproval = sessionStorage.getItem(`basicDocsApproved_${deal.id}`);
      if (storedApproval === 'true') {
        return true;
      }
    }

    const basicDocumentCategories = [
      'Ταυτότητα',
      'ΑΦΜ',
      'Απόδειξη Εισοδήματος',
      'Στοιχεία Τραπεζικού Λογαριασμού',
      'IDENTITY',
      'TAX_ID',
      'INCOME_PROOF',
      'BANK_ACCOUNT',
    ];

    const buyerDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER') || [];
    const basicDocs = buyerDocs.filter(d =>
      basicDocumentCategories.some(cat =>
        d.category.toLowerCase().includes(cat.toLowerCase())
      )
    );

    const allApproved = basicDocs.length > 0 && basicDocs.every(d => d.status === 'APPROVED');
    return allApproved;
  };

  const getCurrentStep = (): number => {
    // Load decisions - prefer deal (persisted), fallback to sessionStorage
    const interestDecision = deal.buyerConfirmedInterestAt ? 'continue' : (typeof window !== 'undefined' 
      ? sessionStorage.getItem(`interestDecision_${deal.id}`) 
      : null);
    const step1Skipped = !!deal.buyerSkippedViewingAt || (typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true');
    const depositPaymentClicked = typeof window !== 'undefined' && 
      sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';

    // If user chose to reschedule, go back to step 1
    if (interestDecision === 'reschedule') {
      return 1;
    }

    // If user chose to cancel, stay at step 2
    if (interestDecision === 'cancel') {
      return 2;
    }

    // Check if lawyer is already chosen
    const hasLawyer = deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'LAWYER'
    );
    
    // If user chose to continue, proceed to lawyer selection
    if (interestDecision === 'continue') {
      if (hasLawyer) {
        // Continue to check lawyer process below
      } else {
        return 3; // CHOOSE_LAWYER
      }
    }
    
    // Check if step 1 is completed (past appointment or skipped)
    const step1Completed = isStep1Completed();
    
    // If lawyer is already chosen, skip to lawyer process
    if (hasLawyer) {
      // Continue to check lawyer process below
    } else {
      // If user chose to continue, never go back to step 1
      if (interestDecision === 'continue') {
        return 3; // CHOOSE_LAWYER
      }
      
      // If step 1 is completed but no interest decision, show step 2
      if (step1Completed && interestDecision === null) {
        return 2; // CONFIRM_INTEREST
      }
      
      // If step 1 is not completed and not skipped, stay at step 1
      if (!step1Completed && !step1Skipped) {
        return 1; // VIEWING_APPOINTMENT
      }
      
      // If step 1 is completed or skipped, proceed to step 2
      return 2; // CONFIRM_INTEREST
    }

    // Step 4: Check deposit payment
    const step2Completed = interestDecision === 'continue';
    const step3Completed = hasLawyer;
    
    // If steps 2 or 3 are not completed, return the first incomplete step
    if (!step2Completed) {
      return 2; // CONFIRM_INTEREST
    }
    if (!step3Completed) {
      return 3; // CHOOSE_LAWYER
    }
    
    // Check if lawyer has approved basic documents for deposit payment
    const basicDocumentsApproved = isBasicDocumentsApproved();
    
    // If basic documents haven't been approved yet, stay at lawyer process step
    if (!basicDocumentsApproved) {
      return 5; // LAWYER_PROCESS
    }
    
    // Only show step 4 (DEPOSIT_PAYMENT) if basic documents approved and payment not clicked
    if (basicDocumentsApproved && !depositPaymentClicked) {
      return 4; // DEPOSIT_PAYMENT
    }
    
    if (!isBuyerPurchaseGuideStep6Completed(deal, undefined)) {
      return 5; // LAWYER_PROCESS
    }

    const hasNotary = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
    );
    if (!hasNotary) {
      return 6; // CHOOSE_NOTARY
    }
    
    // Step 7: Check notary process (completes buyer & seller step 5)
    const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
    
    if (!hasNotaryApproval) {
      return 7; // NOTARY_PROCESS
    }
    
    // Step 8: Check signing
    const confirmedSigningAppointment = deal.appointments?.find(
      (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    if (confirmedSigningAppointment) {
      const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
      const now = new Date();
      const signingCompleted = appointmentEndTime <= now;
      if (!signingCompleted) {
        return 8; // FINAL_SIGNING
      }
    } else {
      return 8; // FINAL_SIGNING
    }
    
    // Step 9: Confirm signing completion
    if (!deal.buyerSigningConfirmed && deal.status !== 'CLOSED') {
      return 9; // CONFIRM_SIGNING_COMPLETION
    }
    
    // Step 10: Completed
    return 10; // COMPLETED
  };

  // Helper: build deal URL with optional tab and openModal
  const buildDealUrl = (tab: string, openModal?: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (openModal) params.set('openModal', openModal);
    if (fromParam) params.set('from', fromParam);
    return `/deals/${deal.id}?${params.toString()}`;
  };

  const navTo = (tab: string, openModal?: string) => {
    router.replace(buildDealUrl(tab, openModal));
  };

  // Compute next step CTA – για buyer: ανοίγει το modal του αντιστοίχου βήματος αντί να αλλάζει tab
  const getNextStepCTA = () => {
    // No next-step action for terminal statuses
    if (deal.status === 'CANCELLED' || deal.status === 'CLOSED' || deal.status === 'COMPLETED' || deal.status === 'CLOSED_PROPERTY_SOLD' || deal.propertySoldToAnother) {
      return null;
    }

    // Seller-specific CTA
    if (isSellerRole) {
      const pendingAppointments = deal.appointments?.filter(a => a.status === 'REQUESTED').length || 0;
      const pendingDocuments = deal.documents?.filter(d => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER').length || 0;
      
      if (pendingAppointments > 0) {
        return {
          label: `Εξετάστε Ραντεβού (${pendingAppointments})`,
          action: () => navTo('appointments'),
        };
      }
      
      if (pendingDocuments > 0) {
        return {
          label: `Εξετάστε Έγγραφα (${pendingDocuments})`,
          action: () => navTo('documents'),
        };
      }
      
      return null;
    }
    
    if (!isBuyerRole) return null;

    const currentStep = getCurrentStep();

    // Step 1: Book Appointment – ανοίγει modal αίτησης ραντεβού
    if (currentStep === 1) {
      return {
        label: 'Κλείσε Ραντεβού',
        action: () => navTo('appointments', 'requestAppointment'),
      };
    }

    // Step 2: Confirm Interest – ανοίγει modal επιβεβαίωσης ενδιαφέροντος
    if (currentStep === 2) {
      return {
        label: 'Επιβεβαίωσε Ενδιαφέρον',
        action: () => navTo('overview', 'interest'),
      };
    }

    // Step 3: Choose Lawyer – πηγαίνει στο tab επαγγελματιών
    if (currentStep === 3) {
      return {
        label: 'Επίλεξε Δικηγόρο',
        action: () => navTo('professionals'),
      };
    }

    // Step 4: Pay Deposit – ανοίγει modal πληρωμής προκαταβολής
    if (currentStep === 4) {
      return {
        label: 'Πλήρωσε Προκαταβολή',
        action: () => navTo('overview', 'deposit'),
      };
    }

    // Step 5: Lawyer Process
    if (currentStep === 5) {
      return {
        label: 'Ολοκλήρωσε με Δικηγόρο',
        action: () => navTo('documents'),
      };
    }

    // Step 6: Choose Notary
    if (currentStep === 6) {
      return {
        label: 'Επίλεξε Συμβολαιογράφο',
        action: () => navTo('professionals'),
      };
    }

    // Step 7: Notary Process
    if (currentStep === 7) {
      return {
        label: 'Ολοκλήρωσε με Συμβολαιογράφο',
        action: () => navTo('chat'),
      };
    }

    // Step 8: Final Signing – ανοίγει modal προγραμματισμού υπογραφής
    if (currentStep === 8) {
      return {
        label: 'Ολοκλήρωσε Υπογραφή',
        action: () => navTo('overview', 'signing'),
      };
    }

    // Step 9: Confirm Signing Completion – ανοίγει modal επιβεβαίωσης ολοκλήρωσης
    if (currentStep === 9) {
      return {
        label: 'Επιβεβαίωσε Ολοκλήρωση',
        action: () => navTo('overview', 'confirmSigning'),
      };
    }

    // Check for pending documents
    const pendingDocs = deal.documents?.filter(
      (d) => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
    );
    if (pendingDocs && pendingDocs.length > 0) {
      return {
        label: `Ανέβασε Έγγραφα (${pendingDocs.length})`,
        action: () => navTo('documents'),
      };
    }

    // Default: open chat
    return {
      label: 'Άνοιξε Συνομιλία',
      action: () => navTo('chat'),
    };
  };

  const nextStep = getNextStepCTA();
  const isInteractionLocked = deal.status === 'CANCELLED' || deal.propertySoldToAnother;

  // Get status label – για buyer: Ενεργό, Σε Αναμονή, Ακυρωμένο. Αλλού: κλασικά labels
  const getStatusLabel = () => {
    if (deal.status === 'CLOSED') return 'Ολοκληρωμένο';
    if (deal.status === 'CANCELLED') return 'Ακυρωμένο';
    if (deal.status === 'CLOSED_PROPERTY_SOLD' || deal.propertySoldToAnother) return 'Σε Αναμονή';
    if (isProfessionalContext && deal.status === 'DRAFT') return 'Ενεργό';
    if (isBuyerRole && (deal.status === 'ACTIVE' || deal.status === 'DRAFT')) return 'Ενεργό';
    if (deal.status === 'ACTIVE') {
      if (deal.documents?.some((d) => d.status === 'REQUESTED')) return 'Αναμονή Εγγράφων';
      return 'Σε Εξέλιξη';
    }
    return 'Σχέδιο';
  };

  const getDealStage = () => {
    const hasConfirmedAppointment = deal.appointments?.some((a) => a.status === 'CONFIRMED');
    const hasLawyer = deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'LAWYER');
    const hasNotary = deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY');
    
    if (!hasConfirmedAppointment) return 'Ραντεβού';
    if (!hasLawyer) return 'Επιλογή Δικηγόρου';
    if (!hasNotary) return 'Επιλογή Συμβολαιογράφου';
    return 'Σε Εξέλιξη';
  };

  // Participants grouped by role
  const participants = deal.participants || [];
  const buyer = participants.find((p) => p.role === 'BUYER');
  const seller = participants.find((p) => p.role === 'SELLER');
  const agent = participants.find((p) => p.role === 'AGENT');
  const buyerId = deal.buyerId || buyer?.userId;
  const sellerId = deal.sellerId || seller?.userId;

  // All professionals (lawyers, notaries, engineers) - show both buyer's and seller's
  const lawyers = (deal.requests || []).filter((r) => r.status === 'ACCEPTED' && r.type === 'LAWYER');
  const notaries = (deal.requests || []).filter((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY');
  const engineers = (deal.requests || []).filter((r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER');

  const getProfessionalSide = (requestedById?: string) => {
    if (requestedById === buyerId) return 'Δικηγόρος αγοραστή';
    if (requestedById === sellerId) return 'Δικηγόρος πωλητή';
    return 'Δικηγόρος';
  };
  const getNotarySide = (requestedById?: string) => {
    if (requestedById === buyerId) return 'Συμβολαιογράφος αγοραστή';
    if (requestedById === sellerId) return 'Συμβολαιογράφος πωλητή';
    return 'Συμβολαιογράφος';
  };
  const getEngineerSide = (requestedById?: string) => {
    if (requestedById === buyerId) return 'Μηχανικός αγοραστή';
    if (requestedById === sellerId) return 'Μηχανικός πωλητή';
    return 'Πολιτικός Μηχανικός';
  };

    return (
      <div className={`backdrop-blur-sm shadow-md ${isProfessionalContext ? 'bg-white border-b border-slate-200' : 'bg-white/95 border-b border-gray-200'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Breadcrumb */}
        <nav className="py-2.5 text-xs text-gray-600 flex items-center gap-1.5">
          {isInteractionLocked ? (
            <span className="text-gray-500 font-medium">Αρχική</span>
          ) : (
            <Link href="/" className="hover:text-gray-900 transition-colors font-medium">Αρχική</Link>
          )}
          <FaChevronRight className="text-[10px] text-gray-400" />
          {isInteractionLocked ? (
            <span className="text-gray-500 font-medium">Συναλλαγές</span>
          ) : (
            <Link href={dealsListHref} className="hover:text-gray-900 transition-colors font-medium">Συναλλαγές</Link>
          )}
          <FaChevronRight className="text-[10px] text-gray-400" />
          <span className="text-gray-900 font-semibold truncate">{property?.title || 'Συναλλαγή'}</span>
        </nav>

        {/* Header Row */}
        <div className="py-4 border-t border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Property Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Property Title + Location */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate leading-tight mb-1">
                    {property?.title || 'Ακίνητο'}
                  </h1>
                  {property && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FaMapMarkerAlt className="text-gray-400 text-xs flex-shrink-0" />
                      <span className="truncate">
                        {property.street} {property.number}, {property.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price + Accepted Offer */}
                {property && (
                  <div className="flex flex-col items-start gap-0.5 flex-shrink-0">
                    <div className={`flex items-baseline gap-1.5 text-lg font-bold text-gray-900 bg-gradient-to-r ${accentGradient} bg-clip-text text-transparent`}>
                      <FaEuroSign className="text-gray-600" />
                      <span>
                        {Number(property.price || 0).toLocaleString('el-GR')}
                        {getIsRent(deal) && <span className="text-base font-medium">/μήνα</span>}
                      </span>
                    </div>
                    {(() => {
                      const acceptedOffer = deal.offers?.find(o => o.status === 'ACCEPTED');
                      if (!acceptedOffer?.amount) return null;
                      const amount = Number(acceptedOffer.amount);
                      const suffix = getIsRent(deal) ? '/μήνα' : '';
                      return (
                        <div className="text-sm font-medium text-emerald-700">
                          Αποδεκτή προσφορά: €{amount.toLocaleString('el-GR')}{suffix}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Status & Stage Chips */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                      deal.status === 'CLOSED'
                        ? isProfessionalContext
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
                        : deal.status === 'CANCELLED'
                        ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
                        : deal.status === 'CLOSED_PROPERTY_SOLD' || deal.propertySoldToAnother
                        ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200'
                        : deal.status === 'ACTIVE' || deal.status === 'DRAFT'
                        ? isProfessionalContext
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    {getStatusLabel()}
                  </span>
                  {(deal.status === 'ACTIVE' || deal.status === 'DRAFT') && !deal.propertySoldToAnother && (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${isProfessionalContext ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {getDealStage()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Connection Status – hidden for buyer */}
              {!isBuyerRole && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200"
                  title={
                    connectionStatus === 'connected'
                      ? 'Συνδεδεμένο'
                      : connectionStatus === 'reconnecting'
                      ? 'Επανασύνδεση...'
                      : 'Αποσυνδεδεμένο'
                }
                >
                  <FaCircle
                    className={`text-[10px] ${
                      connectionStatus === 'connected'
                        ? 'text-green-500'
                        : connectionStatus === 'reconnecting'
                        ? 'text-yellow-500 animate-pulse'
                        : 'text-gray-400'
                    }`}
                  />
                  <span className="text-xs text-gray-600 hidden lg:inline">
                    {connectionStatus === 'connected'
                      ? 'Συνδεδεμένο'
                      : connectionStatus === 'reconnecting'
                      ? 'Επανασύνδεση...'
                      : 'Αποσυνδεδεμένο'}
                  </span>
                </div>
              )}

              {/* Secondary Actions */}
              {!isInteractionLocked && (
              <div className="hidden md:flex items-center gap-1 border-r border-gray-200 pr-3 mr-2">
                {property && (
                  <Link
                    href={isBuyerRole ? `/buyer/properties/${property.id}` : `/properties/${property.id}`}
                    target="_blank"
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    title="Άνοιγμα ακινήτου"
                    aria-label="Άνοιγμα ακινήτου"
                  >
                    <FaExternalLinkAlt className="text-sm" />
                  </Link>
                )}
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                  title="Βοήθεια"
                  aria-label="Βοήθεια"
                >
                  <FaQuestionCircle className="text-sm" />
                </button>
              </div>
              )}

              {/* Primary CTA */}
              {(nextStep || (isBuyerRole && onCancelDeal && !deal.propertySoldToAnother && deal.status !== 'CANCELLED' && deal.status !== 'CLOSED' && deal.status !== 'COMPLETED' && deal.status !== 'CLOSED_PROPERTY_SOLD')) && (
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {nextStep && (
                    <button
                      onClick={nextStep.action}
                      className={`px-5 py-2.5 bg-gradient-to-r ${accentGradient} text-white rounded-xl ${accentHover} text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentFocusRing}`}
                    >
                      <span className="hidden sm:inline">{nextStep.label}</span>
                      <span className="sm:hidden">Επόμενο</span>
                      <FaChevronRight className="text-xs" />
                    </button>
                  )}
                  {isBuyerRole && onCancelDeal && !deal.propertySoldToAnother && deal.status !== 'CANCELLED' && deal.status !== 'CLOSED' && deal.status !== 'COMPLETED' && deal.status !== 'CLOSED_PROPERTY_SOLD' && (
                    <button
                      type="button"
                      onClick={onCancelDeal}
                      disabled={cancelDealLoading}
                      className="text-[11px] sm:text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {cancelDealLoading ? 'Ακύρωση...' : 'Ακύρωση συναλλαγής'}
                    </button>
                  )}
                </div>
              )}

              {/* Close Button (for modal) */}
              {onClose && !isInteractionLocked && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="Κλείσιμο"
                  aria-label="Κλείσιμο"
                >
                  <FaTimes className="text-sm" />
                </button>
              )}
            </div>
          </div>

          {/* Participants Row */}
          {(buyer || seller || agent || lawyers.length > 0 || notaries.length > 0 || engineers.length > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Συμμετέχοντες:</span>
                {buyer && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                    <FaUser className="text-[10px]" />
                    {buyer.user.name}
                  </span>
                )}
                {seller && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                    <FaUser className="text-[10px]" />
                    {seller.user.name}
                  </span>
                )}
                {agent && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                    <FaUser className="text-[10px]" />
                    {agent.user.name}
                  </span>
                )}
                {lawyers.map((lawyer) => (
                  <span
                    key={lawyer.id}
                    title={getProfessionalSide(lawyer.requestedById ?? lawyer.requestedBy?.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-help bg-indigo-50 text-indigo-700 border-indigo-200"
                  >
                    <FaUserTie className="text-[10px]" />
                    {lawyer.professional?.displayName || 'Δικηγόρος'}
                  </span>
                ))}
                {notaries.map((notary) => (
                  <span
                    key={notary.id}
                    title={getNotarySide(notary.requestedById ?? notary.requestedBy?.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-help bg-teal-50 text-teal-700 border-teal-200"
                  >
                    <FaHandshake className="text-[10px]" />
                    {notary.professional?.displayName || 'Συμβολαιογράφος'}
                  </span>
                ))}
                {engineers.map((eng) => (
                  <span
                    key={eng.id}
                    title={getEngineerSide(eng.requestedById ?? eng.requestedBy?.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-help bg-amber-50 text-amber-700 border-amber-200"
                  >
                    <FaWrench className="text-[10px]" />
                    {eng.professional?.displayName || 'Πολιτικός Μηχανικός'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


