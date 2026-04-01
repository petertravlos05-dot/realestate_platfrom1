'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { DealRoom, confirmRentBuyerMyAade, confirmRentCompletion, completeBuyerDepositStep } from '@/lib/api/deals';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCheckCircle, 
  FaCircle, 
  FaChevronRight, 
  FaChevronDown,
  FaUser,
  FaUserTie, 
  FaFileAlt, 
  FaCalendarAlt, 
  FaComments,
  FaHome,
  FaHandshake,
  FaEuroSign,
  FaFileContract,
  FaInfoCircle,
  FaArrowRight,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaUsers,
  FaClock,
  FaChevronLeft,
  FaFilePdf,
  FaExternalLinkAlt,
  FaDownload
} from 'react-icons/fa';
import { format, isSameDay, isToday, isPast, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { el } from 'date-fns/locale';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { isBuyer, isSeller, isAgent, isLawyer, isNotary } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from '../useDealRoomTheme';
import {
  getSellerProgressForBuyer,
  getSellerRentProgressForBuyer,
  getBuyerProgressForSeller,
  getBuyerRentProgressForSeller,
  isBuyerPurchaseGuideStep6Completed,
} from '@/lib/utils/buyerProgress';
import { toast } from 'react-hot-toast';
import { fetchFromBackend, apiClient } from '@/lib/api/client';
import DealConfirmDialog from '../ui/DealConfirmDialog';
import { notifyDealSigningAppointmentsChanged } from '@/lib/api/dealAppointments';
import OfferPriceSlider from '../ui/OfferPriceSlider';
import { listDocuments, uploadDocument, downloadDocument, DealDocument } from '@/lib/api/dealDocuments';

interface ActionsTabProps {
  deal: DealRoom;
  onRefresh: () => void;
  isBuyerFromGreece?: boolean;
  sseEvents?: any[];
  openModal?: string; // από header CTA: interest | deposit | signing | confirmSigning
}

type BuyerStep = 
  | 'VIEWING_APPOINTMENT'           // Βήμα 1: Κλείσιμο ραντεβού για να δει το ακίνητο
  | 'CONFIRM_INTEREST'              // Βήμα 2: Επιβεβαίωση ενδιαφέροντος
  | 'MAKE_OFFER'                    // Βήμα 3: Κάνε προσφορά στον πωλητή
  | 'CHOOSE_LAWYER'                 // Βήμα 4: Επιλογή δικηγόρου
  | 'DEPOSIT_PAYMENT'               // Βήμα 5: Προκαταβολή & Ιδιωτικό Συμφωνητικό
  | 'LAWYER_PROCESS'                // Βήμα 6: Διαδικασία με δικηγόρο (εξειδικευμένα έγγραφα)
  | 'CHOOSE_NOTARY'                 // Βήμα 7: Επιλογή συμβολαιογράφου
  | 'NOTARY_PROCESS'                // Βήμα 8: Διαδικασία με συμβολαιογράφο
  | 'FINAL_SIGNING'                 // Βήμα 9: Υπογραφή συμβολαίων
  | 'CONFIRM_SIGNING_COMPLETION'    // Βήμα 10: Επιβεβαίωση ολοκλήρωσης υπογραφής
  | 'COMPLETED';                    // Ολοκληρωμένη

type LawyerStep =
  | 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT' // Βήμα 1: Επιβεβαίωση βασικών εγγράφων για προκαταβολή
  | 'REVIEW_DOCUMENTS_AND_ACTIONS'  // Βήμα 2: Έλεγχος εγγράφων και ενεργειών
  | 'WAIT_FOR_NOTARY_SELECTION'    // Βήμα 3: Αναμονή επιλογής συμβολαιογράφου
  | 'SEND_DOCUMENTS_TO_NOTARY'     // Βήμα 4: Αποστολή εγγράφων στον συμβολαιογράφο
  | 'WAIT_FOR_SIGNING_APPOINTMENT' // Βήμα 5: Αναμονή κανονισμού υπογραφής
  | 'COMPLETED';

type RentStep =
  | 'RENT_VIEWING'
  | 'RENT_OFFER'
  | 'RENT_DOCUMENTS'
  | 'RENT_DEPOSIT'
  | 'RENT_CONTRACT'
  | 'RENT_MYAADE'
  | 'RENT_COMPLETION';

interface StepInfo {
  id: BuyerStep | LawyerStep | RentStep;
  title: string;
  description: string;
  instructions?: string[];
  actionLabel?: string;
  action?: () => void;
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

function getIsRent(deal: DealRoom): boolean {
  const a = (deal.property as any)?.amenities;
  if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
    return String(a.listingType || a.transactionType).toLowerCase() === 'rent';
  }
  return false;
}

export default function ActionsTab({ deal, onRefresh, isBuyerFromGreece = true, sseEvents = [], openModal }: ActionsTabProps) {
  const { userId } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accentGradient, accentHover } = useDealRoomTheme();
  const isRent = getIsRent(deal);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCancelDealConfirmModal, setShowCancelDealConfirmModal] = useState(false);
  const [cancelDealLoading, setCancelDealLoading] = useState(false);
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [showSkipStep1Modal, setShowSkipStep1Modal] = useState(false);
  const [buyerGuideOpen, setBuyerGuideOpen] = useState(() => {
    if (typeof window === 'undefined' || !deal?.id) return true;
    const stored = localStorage.getItem(`deal-${deal.id}-buyer-guide-open`);
    return stored === null ? true : stored === '1';
  });
  const toggleBuyerGuide = () => {
    setBuyerGuideOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && deal?.id) {
        localStorage.setItem(`deal-${deal.id}-buyer-guide-open`, next ? '1' : '0');
      }
      return next;
    });
  };
  const [sellerProgressOpen, setSellerProgressOpen] = useState(() => {
    if (typeof window === 'undefined' || !deal?.id) return true;
    const stored = localStorage.getItem(`deal-${deal.id}-seller-progress-open`);
    return stored === null ? true : stored === '1';
  });
  const [agentBuyerStepsOpen, setAgentBuyerStepsOpen] = useState(true);
  const [agentSellerStepsOpen, setAgentSellerStepsOpen] = useState(true);
  const [agentPropertyAppointments, setAgentPropertyAppointments] = useState<any[]>([]);
  const toggleSellerProgress = () => {
    setSellerProgressOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && deal?.id) {
        localStorage.setItem(`deal-${deal.id}-seller-progress-open`, next ? '1' : '0');
      }
      return next;
    });
  };
  const [showDepositPaymentModal, setShowDepositPaymentModal] = useState(false);
  const [depositStepSubmitting, setDepositStepSubmitting] = useState(false);
  const [showRentContractModal, setShowRentContractModal] = useState(false);
  const [showRentMyAadeModal, setShowRentMyAadeModal] = useState(false);
  const [rentContractSigningMethod, setRentContractSigningMethod] = useState<'electronic' | 'in-person' | null>(null);
  const [rentContractDocuments, setRentContractDocuments] = useState<DealDocument[]>([]);
  const [rentContractLoadingDocs, setRentContractLoadingDocs] = useState(false);
  const [rentContractUploading, setRentContractUploading] = useState(false);
  const [rentSigningProposalDate, setRentSigningProposalDate] = useState<Date | null>(null);
  const [rentSigningProposalTime, setRentSigningProposalTime] = useState('');
  const [rentSigningProposalSaving, setRentSigningProposalSaving] = useState(false);
  const [showBasicDocumentsConfirmationModal, setShowBasicDocumentsConfirmationModal] = useState(false);
  const [showLawyerApprovalConfirmationModal, setShowLawyerApprovalConfirmationModal] = useState(false);
  const [isNotaryApproving, setIsNotaryApproving] = useState(false);
  const [showSigningAppointmentModal, setShowSigningAppointmentModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [requestedAppointments, setRequestedAppointments] = useState<any[]>([]);
  const [sellerSigningProposals, setSellerSigningProposals] = useState<any[]>([]);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);
  const [buyerRejectSellerProposalTargetId, setBuyerRejectSellerProposalTargetId] = useState<string | null>(null);
  const [isBuyerApprovingSellerProposal, setIsBuyerApprovingSellerProposal] = useState<string | null>(null);
  const [isBuyerRejectingSellerProposal, setIsBuyerRejectingSellerProposal] = useState<string | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isRequestingAppointment, setIsRequestingAppointment] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfirmSigningModal, setShowConfirmSigningModal] = useState(false);
  const [isConfirmingSigning, setIsConfirmingSigning] = useState(false);
  const [showCancelAppointmentModal, setShowCancelAppointmentModal] = useState(false);
  const [isCancellingAppointment, setIsCancellingAppointment] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(true);
  const [showBuyerOfferModal, setShowBuyerOfferModal] = useState(false);
  const [buyerOfferAmount, setBuyerOfferAmount] = useState('');
  const [buyerOfferMessage, setBuyerOfferMessage] = useState('');
  const [isSubmittingBuyerOffer, setIsSubmittingBuyerOffer] = useState(false);
  const [rentInterestDecision, setRentInterestDecision] = useState<'continue' | 'reschedule' | 'cancel' | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`rentInterestDecision_${deal.id}`);
      return saved as 'continue' | 'reschedule' | 'cancel' | null;
    }
    return null;
  });
  const [showOfferConfirmation, setShowOfferConfirmation] = useState(false);
  const [buyerOfferSubmitted, setBuyerOfferSubmitted] = useState(false);
  const [isAcceptingSellerOffer, setIsAcceptingSellerOffer] = useState(false);
  const [isRejectingSellerOffer, setIsRejectingSellerOffer] = useState(false);
  const [showBuyerCounterForm, setShowBuyerCounterForm] = useState(false);
  const [isConfirmingRentCompletion, setIsConfirmingRentCompletion] = useState(false);
  const [rentMyAadeConfirmedLocal, setRentMyAadeConfirmedLocal] = useState(false);

  // Άνοιγμα modal από header CTA (openModal param στο URL)
  useEffect(() => {
    if (!openModal || !searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('openModal');
    const qs = params.toString();
    const clearUrl = `/deals/${deal.id}${qs ? `?${qs}` : ''}`;
    if (openModal === 'interest') {
      setShowInterestModal(true);
      router.replace(clearUrl, { scroll: false });
    } else if (openModal === 'deposit') {
      setShowDepositPaymentModal(true);
      router.replace(clearUrl, { scroll: false });
    } else if (openModal === 'signing') {
      setShowSigningAppointmentModal(true);
      router.replace(clearUrl, { scroll: false });
    } else if (openModal === 'confirmSigning') {
      setShowConfirmSigningModal(true);
      router.replace(clearUrl, { scroll: false });
    }
  }, [openModal, deal.id, router, searchParams]);

  // Initialize offer amount to listing price when buyer offer modal opens
  useEffect(() => {
    if (showBuyerOfferModal && deal.property?.price) {
      const listingPrice = Math.round(Number(deal.property.price));
      setBuyerOfferAmount(String(listingPrice));
    }
  }, [showBuyerOfferModal, deal.property?.price]);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('[useEffect] showLawyerApprovalConfirmationModal changed to:', showLawyerApprovalConfirmationModal);
  }, [showLawyerApprovalConfirmationModal]);

  // Sync SSE event to sessionStorage for lawyer approval
  useEffect(() => {
    if (sseEvents && sseEvents.length > 0) {
      const hasLawyerApprovalEvent = sseEvents.some(
        (e: any) => e.type === 'lawyer_approved_buyer_progress'
      );
      
      if (hasLawyerApprovalEvent && typeof window !== 'undefined') {
        const storageKey = `lawyerApprovedBuyerProgress_${deal.id}`;
        const currentValue = sessionStorage.getItem(storageKey);
        if (currentValue !== 'true') {
          console.log('[useEffect] Syncing SSE event to sessionStorage');
          sessionStorage.setItem(storageKey, 'true');
          setLawyerApprovalKey(prev => prev + 1);
        }
      }
    }
  }, [sseEvents, deal.id]);

  // Force re-render when lawyer approval is stored in sessionStorage
  // Initialize lawyerApprovalKey based on existing sessionStorage value
  const [lawyerApprovalKey, setLawyerApprovalKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const approved = sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true';
      return approved ? 1 : 0;
    }
    return 0;
  });
  
  useEffect(() => {
    const checkLawyerApproval = () => {
      if (typeof window !== 'undefined') {
        const approved = sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true';
        if (approved && lawyerApprovalKey === 0) {
          // If approved but key is still 0, update it to trigger re-render
          setLawyerApprovalKey(1);
        }
      }
    };
    
    // Check on mount
    checkLawyerApproval();
    
    // Check periodically (in case it was set from another tab/window)
    const interval = setInterval(checkLawyerApproval, 500);
    
    return () => clearInterval(interval);
  }, [deal.id, lawyerApprovalKey]);

  // Force re-render when notary approval is stored (DB, sessionStorage)
  const [notaryApprovalKey, setNotaryApprovalKey] = useState(() => {
    if (deal.notaryApprovedDocumentsAt) return 1;
    if (typeof window !== 'undefined') {
      const approved = sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true';
      return approved ? 1 : 0;
    }
    return 0;
  });
  
  useEffect(() => {
    const checkNotaryApproval = () => {
      const approved = !!deal.notaryApprovedDocumentsAt ||
        (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
      if (approved && notaryApprovalKey === 0) {
        setNotaryApprovalKey(1);
      } else if (!approved && notaryApprovalKey === 1) {
        setNotaryApprovalKey(0);
      }
    };
    
    checkNotaryApproval();
    const interval = setInterval(checkNotaryApproval, 500);
    
    return () => clearInterval(interval);
  }, [deal.id, deal.notaryApprovedDocumentsAt, notaryApprovalKey]);

  // Sync SSE event to sessionStorage for notary approval
  useEffect(() => {
    if (sseEvents && sseEvents.length > 0) {
      const hasNotaryApprovalEvent = sseEvents.some(
        (e: any) => e.type === 'notary_approved_documents'
      );
      
      if (hasNotaryApprovalEvent && typeof window !== 'undefined') {
        const storageKey = `notaryApprovedDocuments_${deal.id}`;
        const currentValue = sessionStorage.getItem(storageKey);
        if (currentValue !== 'true') {
          sessionStorage.setItem(storageKey, 'true');
          setNotaryApprovalKey(prev => prev + 1);
        }
      }

      // Check for appointment confirmation events
      const hasAppointmentConfirmed = sseEvents.some(
        (e: any) => e.type === 'appointment_confirmed'
      );
      
      if (hasAppointmentConfirmed) {
        // Refresh to get updated appointment status
        onRefresh();
      }
    }
  }, [sseEvents, deal.id, onRefresh]);
  
  // Track if buyer completed step 5 (deposit modal): sessionStorage + DB (buyerCompletedDepositStepAt)
  const [depositPaymentClicked, setDepositPaymentClicked] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`depositPaymentClicked_${deal.id}`);
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (deal.buyerCompletedDepositStepAt) {
      setDepositPaymentClicked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`depositPaymentClicked_${deal.id}`, 'true');
      }
    } else if (typeof window !== 'undefined') {
      setDepositPaymentClicked(sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true');
    } else {
      setDepositPaymentClicked(false);
    }
  }, [deal.buyerCompletedDepositStepAt, deal.id]);

  // Save depositPaymentClicked to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (depositPaymentClicked) {
        sessionStorage.setItem(`depositPaymentClicked_${deal.id}`, 'true');
      } else {
        sessionStorage.removeItem(`depositPaymentClicked_${deal.id}`);
      }
    }
  }, [depositPaymentClicked, deal.id]);
  
  // Load interestDecision: prefer deal.buyerConfirmedInterestAt (persisted), fallback to sessionStorage
  const [interestDecision, setInterestDecision] = useState<'continue' | 'reschedule' | 'cancel' | null>(() => {
    if (deal.buyerConfirmedInterestAt) return 'continue';
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`interestDecision_${deal.id}`);
      return saved as 'continue' | 'reschedule' | 'cancel' | null;
    }
    return null;
  });
  
  const [step1Skipped, setStep1Skipped] = useState(() => {
    if (deal.buyerSkippedViewingAt) return true;
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`step1Skipped_${deal.id}`);
      return saved === 'true';
    }
    return false;
  });
  
  const appointmentsRef = useRef<string>('');
  
  // Save interestDecision to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (interestDecision) {
        sessionStorage.setItem(`interestDecision_${deal.id}`, interestDecision);
      } else {
        sessionStorage.removeItem(`interestDecision_${deal.id}`);
      }
    }
  }, [interestDecision, deal.id]);
  
  // Save step1Skipped to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`step1Skipped_${deal.id}`, String(step1Skipped));
    }
  }, [step1Skipped, deal.id]);

  // Save rentInterestDecision to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isRent) {
      if (rentInterestDecision) {
        sessionStorage.setItem(`rentInterestDecision_${deal.id}`, rentInterestDecision);
      } else {
        sessionStorage.removeItem(`rentInterestDecision_${deal.id}`);
      }
    }
  }, [rentInterestDecision, deal.id, isRent]);

  // Sync state from deal when it loads/refreshes (e.g. after API returns persisted values)
  useEffect(() => {
    if (deal.buyerConfirmedInterestAt) setInterestDecision('continue');
    if (deal.buyerSkippedViewingAt) setStep1Skipped(true);
  }, [deal.buyerConfirmedInterestAt, deal.buyerSkippedViewingAt]);
  
  // When lawyer basic-doc approval *newly* arrives (false → true), reset deposit so buyer must confirm again.
  // Do NOT reset on full page load when approval was already true (that cleared sessionStorage and broke refresh).
  const lawyerBasicApprovalPrevRef = useRef<boolean | null>(null);
  useEffect(() => {
    lawyerBasicApprovalPrevRef.current = null;
  }, [deal.id]);

  useEffect(() => {
    const hasBasicDocumentsApproval =
      !!deal.lawyerApprovedBasicDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit') ||
      false;

    if (lawyerBasicApprovalPrevRef.current === null) {
      lawyerBasicApprovalPrevRef.current = hasBasicDocumentsApproval;
      return;
    }

    if (!isRent && hasBasicDocumentsApproval && !lawyerBasicApprovalPrevRef.current) {
      setDepositPaymentClicked(false);
    }
    lawyerBasicApprovalPrevRef.current = hasBasicDocumentsApproval;
  }, [sseEvents, deal.id, deal.lawyerApprovedBasicDocumentsAt, isRent]);

  const isBuyerRole = isBuyer(deal, userId);

  // Restore signing method from sessionStorage when rent contract modal opens
  useEffect(() => {
    if (showRentContractModal && isRent && isBuyerRole) {
      const saved = typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigningMethod_${deal.id}`);
      if (saved === 'electronic' || saved === 'in-person') {
        setRentContractSigningMethod(saved);
        if (saved === 'electronic') {
          setRentContractLoadingDocs(true);
          listDocuments(deal.id)
            .then((docs) => setRentContractDocuments(docs))
            .catch(() => toast.error('Σφάλμα φόρτωσης εγγράφων'))
            .finally(() => setRentContractLoadingDocs(false));
        }
      }
    }
  }, [showRentContractModal, isRent, isBuyerRole, deal.id]);

  // Reset interest decision and step1Skipped when a new confirmed appointment is added (after reschedule)
  useEffect(() => {
    if (interestDecision === 'reschedule' && deal.appointments) {
      // Create a string representation of appointments to detect changes
      const appointmentsKey = deal.appointments.map(a => `${a.id}-${a.status}-${a.startAt}`).join(',');
      
      // Only check if appointments have actually changed
      if (appointmentsKey !== appointmentsRef.current) {
        appointmentsRef.current = appointmentsKey;
        
        const hasNewConfirmedAppointment = deal.appointments.some(
          a => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
        );
        if (hasNewConfirmedAppointment) {
          // Reset decision so user can proceed to step 2 again
          setInterestDecision(null);
          setStep1Skipped(false);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`interestDecision_${deal.id}`);
            sessionStorage.setItem(`step1Skipped_${deal.id}`, 'false');
          }
        }
      }
    } else if (interestDecision !== 'reschedule') {
      // Reset ref when not in reschedule mode
      appointmentsRef.current = '';
    }
  }, [deal.appointments, interestDecision]);
  const isSellerRole = isSeller(deal, userId);
  const isAgentRole = isAgent(deal, userId);

  // Fetch property appointments for agent view (buyer progress)
  useEffect(() => {
    if (!isAgentRole || !deal.propertyId || !deal.buyerId) return;
    const fetchAppts = async () => {
      try {
        const res = await apiClient.get(`/seller/appointments`, { params: { propertyId: deal.propertyId, buyerId: deal.buyerId } });
        if (res.data?.appointments) setAgentPropertyAppointments(res.data.appointments);
      } catch (e) {
        console.error('Error fetching property appointments:', e);
      }
    };
    fetchAppts();
    const iv = setInterval(fetchAppts, 10000);
    return () => clearInterval(iv);
  }, [isAgentRole, deal.propertyId, deal.buyerId, deal.updatedAt]);
  
  // Debug: Log modal state changes
  useEffect(() => {
    console.log('[Confirm Signing Modal] State changed:', showConfirmSigningModal, 'isBuyerRole:', isBuyerRole, 'isSellerRole:', isSellerRole);
  }, [showConfirmSigningModal, isBuyerRole, isSellerRole]);
  
  // Inline lawyer check (temporary until dealRole.ts is saved)
  const isLawyerRole = (() => {
    if (!userId || !deal) return false;
    const participant = deal.participants?.find((p) => p.userId === userId);
    if (participant && participant.role === 'LAWYER') return true;
    const lawyerRequest = deal.requests?.find(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.professional?.user?.id === userId
    );
    return !!lawyerRequest;
  })();
  
  const isNotaryRole = (() => {
    if (!userId || !deal) return false;
    const participant = deal.participants?.find((p) => p.userId === userId);
    if (participant && participant.role === 'NOTARY') return true;
    const notaryRequest = deal.requests?.find(
      (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id === userId
    );
    return !!notaryRequest;
  })();
  
  const [isApproving, setIsApproving] = useState(false);

  // Check if step 1 is completed (has past confirmed appointment or buyer skipped)
  const isStep1Completed = (): boolean => {
    if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) return true;
    if (step1Skipped) return true;
    // Fallback: if buyer has chosen lawyer + accepted offer, they must have completed step 1
    const hasBuyerLawyer = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
    );
    const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
    if (hasBuyerLawyer && hasAcceptedOffer) return true;
    
    // Check if there's a confirmed appointment that has passed
    const hasPastConfirmedAppointment = deal.appointments?.some(
      a => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
    ) || false;
    
    return hasPastConfirmedAppointment;
  };

  function isBasicDocumentsApproved(): boolean {
    // Lawyer completed step 1 (Ολοκλήρωση) = approval for buyer to pay deposit
    if (deal.lawyerApprovedBasicDocumentsAt) return true;

    const hasBasicDocumentsApprovalFromSSE = sseEvents?.some(
      (e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit'
    ) || false;

    if (hasBasicDocumentsApprovalFromSSE) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`basicDocsApproved_${deal.id}`, 'true');
      }
      return true;
    }

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
    if (allApproved && typeof window !== 'undefined') {
      sessionStorage.setItem(`basicDocsApproved_${deal.id}`, 'true');
    }
    return allApproved;
  }

  // Determine current step based on deal state
  const getCurrentStep = (): BuyerStep => {
    if (!isBuyerRole) return 'COMPLETED';

    // If user chose to reschedule, go back to step 1
    if (interestDecision === 'reschedule') {
      return 'VIEWING_APPOINTMENT';
    }

    // If user chose to cancel, stay at current step (or handle cancellation)
    if (interestDecision === 'cancel') {
      return 'CONFIRM_INTEREST';
    }

    // Check if BUYER has chosen a lawyer (not seller's lawyer)
    const hasBuyerLawyer = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
    );
    
    // Step 3 completed only when seller accepted buyer's offer OR buyer accepted seller's counter-offer
    const isOfferAgreed = deal.offers?.some((o) => o.status === 'ACCEPTED') || false;
    if (interestDecision === 'continue') {
    // If buyer has chosen lawyer, skip to lawyer process
    if (hasBuyerLawyer) {
      // Continue to check lawyer process below
    } else if (!isOfferAgreed) {
        return 'MAKE_OFFER';
      } else {
        return 'CHOOSE_LAWYER';
      }
    }
    
    // Check if step 1 is completed (past appointment or skipped)
    const step1Completed = isStep1Completed();
    
    // If buyer has chosen lawyer, skip to lawyer process
    if (hasBuyerLawyer) {
      // Continue to check lawyer process below
    } else {
      // IMPORTANT: If user chose to continue, never go back to step 1
      if (interestDecision === 'continue') {
        return isOfferAgreed ? 'CHOOSE_LAWYER' : 'MAKE_OFFER';
      }
      
      // If step 1 is completed but no interest decision, show step 2
      if (step1Completed && interestDecision === null) {
        return 'CONFIRM_INTEREST';
      }
      
      // If step 1 is not completed and not skipped, stay at step 1
      if (!step1Completed && !step1Skipped) {
        return 'VIEWING_APPOINTMENT';
      }
      
      // If step 1 is completed or skipped, proceed to step 2
      return 'CONFIRM_INTEREST';
    }

    // Step 3: Check if lawyer is chosen (already checked above, but keeping for clarity)
    // This step is already passed if we got here

    // Step 3 (Make Offer): Completed only when seller accepted buyer's offer OR buyer accepted seller's counter-offer
    // Step 4 (Deposit): CRITICAL - can ONLY be current if steps 2, 3, 4 are completed
    // Step 2 completed = interestDecision === 'continue'
    // Step 3 completed = isOfferAgreed (not just buyer sent offer)
    // Step 4 (Choose Lawyer) completed = hasLawyer
    const step2Completed = interestDecision === 'continue';
    const step3Completed = isOfferAgreed;
    
    if (!step2Completed) {
      return 'CONFIRM_INTEREST';
    }
    if (!step3Completed) {
      return 'MAKE_OFFER';
    }
    if (!hasBuyerLawyer) {
      return 'CHOOSE_LAWYER';
    }
    
    // Now check Step 5 (Deposit) vs Step 6 (Lawyer process)
    // Step 6 can ONLY be current after Step 5 is done (deposit paid, private agreement signed)
    const basicDocumentsApproved = isBasicDocumentsApproved();
    
    // If basic documents haven't been approved yet, current step is DEPOSIT_PAYMENT (Βήμα 5)
    // but in "waiting for basic docs" state - user must upload docs and wait for lawyer approval first
    if (!basicDocumentsApproved) {
      return 'DEPOSIT_PAYMENT';
    }
    
    // Only show DEPOSIT_PAYMENT as current if:
    // 1. Steps 2 and 3 are completed (already checked above)
    // 2. Basic documents have been approved by lawyer
    // 3. Buyer hasn't clicked the payment button yet
    // IMPORTANT: Step 4 must be completed (button clicked) before moving to step 5
    if (basicDocumentsApproved && !depositPaymentClicked) {
      return 'DEPOSIT_PAYMENT';
    }
    
    // If buyer has clicked the payment button, continue to next step
    // (Step 4 is now completed)

    // Βήμα 6 (διαδικασία με δικηγόρο): ίδια λογική με OverviewTab / BuyersPurchaseGuide
    if (!isBuyerPurchaseGuideStep6Completed(deal, sseEvents)) {
      return 'LAWYER_PROCESS';
    }

    const hasBuyerNotaryFromDeal = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
    );
    const hasBuyerNotary = !!hasBuyerNotaryFromDeal;
    
    if (!hasBuyerNotary) {
      return 'CHOOSE_NOTARY';
    }

    // Step 7: Check notary process
    const notary = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'NOTARY');
    
    // Check if notary has approved documents - this is REQUIRED to move past step 7 (completes buyer & seller step 5)
    const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
    
    // If notary has not approved, stay in NOTARY_PROCESS step
    if (!hasNotaryApproval) {
      return 'NOTARY_PROCESS';
    }

    // Step 8: Check final signing
    const confirmedSigningAppointment = deal.appointments?.find(
      a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    
    if (!confirmedSigningAppointment) {
      return 'FINAL_SIGNING';
    }

    // Check if appointment time has passed
    const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
    const now = new Date();
    
    if (appointmentEndTime <= now) {
      // Appointment time has passed, check if buyer has confirmed signing completion
      const buyerConfirmed = deal.buyerSigningConfirmed || false;
      if (!buyerConfirmed) {
        return 'CONFIRM_SIGNING_COMPLETION';
      }
      
      // Check if seller has also confirmed
      const sellerConfirmed = deal.sellerSigningConfirmed || false;
      if (buyerConfirmed && sellerConfirmed) {
        return 'COMPLETED';
      }
      
      // Buyer confirmed but seller hasn't yet
      return 'CONFIRM_SIGNING_COMPLETION';
    }

    // Appointment is scheduled but hasn't happened yet
    return 'FINAL_SIGNING';
  };

  // Recalculate currentStep when lawyerApprovalKey or notaryApprovalKey changes (forces re-render when approval is stored)
  // Also recalculate when appointments change (for step 8 completion check)
  const currentStep = useMemo(() => {
    return getCurrentStep();
  }, [deal, deal.appointments, sseEvents, interestDecision, step1Skipped, depositPaymentClicked, lawyerApprovalKey, notaryApprovalKey]);

  // Check if appointment time has passed and refresh if needed
  useEffect(() => {
    const confirmedAppointment = deal.appointments?.find(
      a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    
    if (confirmedAppointment) {
      const appointmentEndTime = new Date(confirmedAppointment.endAt);
      const now = new Date();
      
      // If appointment time hasn't passed yet, set up a timer to refresh when it does
      if (appointmentEndTime > now) {
        const timeUntilEnd = appointmentEndTime.getTime() - now.getTime();
        const timer = setTimeout(() => {
          onRefresh();
        }, timeUntilEnd + 1000); // Refresh 1 second after appointment ends
        
        return () => clearTimeout(timer);
      }
    }
  }, [deal.appointments, onRefresh]);

  const handleConfirmInterest = async (decision: 'continue' | 'reschedule' | 'cancel') => {
    if (decision === 'cancel') {
      setShowInterestModal(false);
      setShowCancelDealConfirmModal(true);
      return;
    }

    setInterestDecision(decision);
    setShowInterestModal(false);
    
    try {
      if (decision === 'continue') {
        await fetchFromBackend(`/deals/${deal.id}/buyer-confirm-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmed: true }),
        });
        onRefresh();
        router.push(`/deals/${deal.id}?tab=professionals`);
        toast.success('Συνεχίζουμε με την επιλογή δικηγόρου');
      } else if (decision === 'reschedule') {
        setStep1Skipped(false);
        await fetchFromBackend(`/deals/${deal.id}/buyer-skip-viewing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipped: false }),
        });
        await fetchFromBackend(`/deals/${deal.id}/buyer-confirm-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmed: false }),
        });
        onRefresh();
        router.push(`/deals/${deal.id}?tab=appointments`);
        toast.success('Μπορείτε να κλείσετε νέο ραντεβού');
      }
    } catch (e) {
      console.error('Failed to persist interest decision:', e);
      if (decision === 'continue') router.push(`/deals/${deal.id}?tab=professionals`);
      else if (decision === 'reschedule') router.push(`/deals/${deal.id}?tab=appointments`);
    }
  };

  const handleCancelDealLikeHeader = async () => {
    if (!deal?.property?.id) {
      toast.error('Δεν βρέθηκε το ακίνητο της συναλλαγής');
      return;
    }
    setCancelDealLoading(true);
    try {
      await apiClient.delete(`/buyer/interested-properties/${deal.property.id}`);
      toast.success('Το ενδιαφέρον σας για το ακίνητο ακυρώθηκε επιτυχώς.');
      setShowCancelDealConfirmModal(false);
      router.push('/deals?tab=deals');
    } catch (error: any) {
      console.error('Error canceling interest from step 2 modal:', error);
      toast.error(`Σφάλμα κατά την ακύρωση του ενδιαφέροντος: ${error?.message || 'Άγνωστο σφάλμα'}`);
    } finally {
      setCancelDealLoading(false);
    }
  };

  const refreshSigningAppointmentModalData = async () => {
    const dealSellerId = deal.sellerId || deal.participants?.find((p: { role?: string }) => p.role === 'SELLER')?.userId;
    const appointmentsResponse = await fetchFromBackend(`/deals/${deal.id}/appointments`);
    if (!appointmentsResponse.ok) return;
    const appointmentsData = await appointmentsResponse.json();
    const all = appointmentsData.appointments || [];
    const requested = all.filter(
      (a: any) =>
        a.status === 'REQUESTED' &&
        a.bookedById === userId &&
        a.type === 'IN_PERSON' &&
        a.note !== 'AVAILABLE_SLOT'
    );
    const sellerProposals = all.filter(
      (a: any) =>
        a.status === 'REQUESTED' &&
        a.type === 'IN_PERSON' &&
        a.note !== 'AVAILABLE_SLOT' &&
        dealSellerId &&
        a.bookedById === dealSellerId
    );
    const confirmed = all.find(
      (a: any) =>
        a.status === 'CONFIRMED' &&
        a.type === 'IN_PERSON' &&
        a.note !== 'AVAILABLE_SLOT'
    );
    setRequestedAppointments(requested);
    setSellerSigningProposals(sellerProposals);
    setConfirmedAppointment(confirmed || null);
  };

  const handleBuyerApproveSellerProposalInModal = async (appointmentId: string) => {
    setIsBuyerApprovingSellerProposal(appointmentId);
    try {
      const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${appointmentId}/buyer-approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η πρόταση εγκρίθηκε. Ο συμβολαιογράφος θα την επιβεβαιώσει.');
      notifyDealSigningAppointmentsChanged(deal.id);
      await refreshSigningAppointmentModalData();
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Σφάλμα');
    } finally {
      setIsBuyerApprovingSellerProposal(null);
    }
  };

  const handleScheduleSigning = async () => {
    setShowSigningAppointmentModal(true);
    setIsLoadingAvailability(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/notary/availability`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      }
      await refreshSigningAppointmentModalData();
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Reset states when modal closes
  useEffect(() => {
    if (!showSigningAppointmentModal) {
      setCustomDate(null);
      setCustomStartTime('');
      setCustomEndTime('');
      setShowDatePicker(false);
      setCalendarMonth(new Date());
      setSellerSigningProposals([]);
      setBuyerRejectSellerProposalTargetId(null);
    }
  }, [showSigningAppointmentModal]);

  const handleConfirmSigningCompletion = async () => {
    setIsConfirmingSigning(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/confirm-signing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = 'Σφάλμα κατά την επιβεβαίωση';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[Confirm Signing] Success:', result);

      const waitingFor = isBuyerRole ? 'πωλητή' : 'αγοραστή';
      toast.success(`Η επιβεβαίωση αποθηκεύτηκε. Περιμένετε την επιβεβαίωση από τον ${waitingFor}.`);
      setShowConfirmSigningModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('[Confirm Signing] Exception:', error);
      toast.error(error.message || 'Σφάλμα κατά την επιβεβαίωση');
    } finally {
      setIsConfirmingSigning(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!confirmedAppointment) return;
    
    setIsCancellingAppointment(true);
    try {
      const response = await fetchFromBackend(`/appointments/${confirmedAppointment.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = 'Σφάλμα κατά την ακύρωση του ραντεβού';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[Cancel Appointment] Success:', result);

      toast.success('Το ραντεβού ακυρώθηκε επιτυχώς.');
      setShowCancelAppointmentModal(false);
      setShowSigningAppointmentModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('[Cancel Appointment] Exception:', error);
      toast.error(error.message || 'Σφάλμα κατά την ακύρωση του ραντεβού');
    } finally {
      setIsCancellingAppointment(false);
    }
  };

  const handleSkipStep1 = () => {
    setShowSkipStep1Modal(true);
  };

  const confirmSkipStep1 = async () => {
    setStep1Skipped(true);
    setShowSkipStep1Modal(false);
    try {
      await fetchFromBackend(`/deals/${deal.id}/buyer-skip-viewing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: true }),
      });
      onRefresh();
      if (isRent) {
        toast.success('Το βήμα 1 ολοκληρώθηκε. Μπορείτε τώρα να κάνετε προσφορά για την ενοικίαση.');
      }
    } catch (e) {
      console.error('Failed to persist skip viewing:', e);
    }
    // For sale: move to step 2 (confirm interest modal). For rent: step 2 is offer, no modal.
    if (!isRent) {
      setShowInterestModal(true);
    }
  };

  const handleRentInterestDecision = async (decision: 'continue' | 'reschedule' | 'cancel') => {
    setRentInterestDecision(decision);
    try {
      if (decision === 'continue') {
        await fetchFromBackend(`/deals/${deal.id}/buyer-confirm-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmed: true }),
        });
        onRefresh();
        toast.success('Επιβεβαίωσατε το ενδιαφέρον σας. Μπορείτε τώρα να κάνετε προσφορά.');
      } else if (decision === 'reschedule') {
        setStep1Skipped(false);
        await fetchFromBackend(`/deals/${deal.id}/buyer-skip-viewing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipped: false }),
        });
        await fetchFromBackend(`/deals/${deal.id}/buyer-confirm-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmed: false }),
        });
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`rentInterestDecision_${deal.id}`);
        }
        setRentInterestDecision(null);
        onRefresh();
        router.push(`/deals/${deal.id}?tab=appointments`);
        toast.success('Μπορείτε να κλείσετε νέο ραντεβού');
      } else {
        await fetchFromBackend(`/deals/${deal.id}/buyer-confirm-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmed: false }),
        });
        onRefresh();
        toast.error('Η διαδικασία ακυρώθηκε');
      }
    } catch (e) {
      console.error('Failed to persist rent interest decision:', e);
      toast.error('Σφάλμα κατά την αποθήκευση');
    }
  };

  const steps: StepInfo[] = [
    {
      id: 'VIEWING_APPOINTMENT',
      title: 'Βήμα 1: Κλείσιμο Ραντεβού (Προαιρετικό)',
      description: 'Κλείστε ραντεβού για να δείτε το ακίνητο',
      instructions: [
        'Πηγαίνετε στο tab "Ραντεβού"',
        'Επιλέξτε ημερομηνία και ώρα που σας βολεύει',
        'Αναμένετε την επιβεβαίωση από τον πωλητή ή τον μεσίτη',
        'Σημείωση: Μπορείτε να προχωρήσετε στην επιβεβαίωση ενδιαφέροντος για το ακίνητο χωρίς να έχετε κλείσει ραντεβού'
      ],
      actionLabel: 'Κλείστε Ραντεβού',
      action: () => router.push(`/deals/${deal.id}?tab=appointments`),
      status: currentStep === 'VIEWING_APPOINTMENT' ? 'active' : 
              (interestDecision === 'reschedule' ? 'pending' :
              (isStep1Completed() ? 'completed' : 'pending'))
    },
    {
      id: 'CONFIRM_INTEREST',
      title: 'Βήμα 2: Επιβεβαίωση Ενδιαφέροντος',
      description: 'Αποφασίστε αν θέλετε να συνεχίσετε με την αγορά',
      instructions: [
        'Μετά το ραντεβού, επιλέξτε πώς θέλετε να προχωρήσετε',
        'Μπορείτε να επιλέξετε:',
        '• Θέλω να προχωρήσω με τη συναλλαγή - Συνεχίζετε με την αγορά',
        '• Θέλω να κλείσω άλλο ραντεβού - Δεν είστε ακόμα σίγουροι',
        '• Δεν ενδιαφέρομαι να προχωρήσω - Ακυρώνετε τη διαδικασία'
      ],
      actionLabel: 'Επιβεβαιώστε Ενδιαφέρον',
      action: () => setShowInterestModal(true),
      status: currentStep === 'CONFIRM_INTEREST' ? 'active' :
              (interestDecision === 'continue' ? 'completed' :
              ['MAKE_OFFER', 'CHOOSE_LAWYER', 'LAWYER_PROCESS', 'DEPOSIT_PAYMENT', 'CHOOSE_NOTARY', 'NOTARY_PROCESS', 'FINAL_SIGNING', 'COMPLETED'].includes(currentStep) ? 'completed' : 'pending')
    },
    {
      id: 'MAKE_OFFER',
      title: 'Βήμα 3: Κάνε Προσφορά',
      description: 'Στείλε την προσφορά σου στον πωλητή για το ακίνητο',
      instructions: [
        'Προσδιορίστε το ποσό που θέλετε να προσφέρετε',
        'Μπορείτε να προσθέσετε προαιρετικό μήνυμα στον πωλητή',
        'Ο πωλητής θα δει την προσφορά σας και μπορεί να την αποδεχτεί, να κάνει αντιπρόταση ή να την απορρίψει',
        'Μόλις συμφωνηθεί η τιμή, μπορείτε να προχωρήσετε στην επιλογή δικηγόρου'
      ],
      actionLabel: 'Κάνε Προσφορά',
      action: () => setShowBuyerOfferModal(true),
      status: currentStep === 'MAKE_OFFER' ? 'active' :
              (deal.offers?.some((o) => o.status === 'ACCEPTED') ? 'completed' :
              ['CHOOSE_LAWYER', 'LAWYER_PROCESS', 'DEPOSIT_PAYMENT', 'CHOOSE_NOTARY', 'NOTARY_PROCESS', 'FINAL_SIGNING', 'COMPLETED'].includes(currentStep) ? 'completed' : 'pending')
    },
    {
      id: 'CHOOSE_LAWYER',
      title: 'Βήμα 4: Επιλογή Δικηγόρου',
      description: 'Επιλέξτε δικηγόρο για να σας καθοδηγήσει στη διαδικασία',
      instructions: [
        'Πηγαίνετε στο tab "Επαγγελματίες"',
        'Αναζητήστε δικηγόρους στην περιοχή του ακινήτου',
        'Κλείστε ραντεβού με τον δικηγόρο που σας ενδιαφέρει',
        'Μετά το ραντεβού, ο δικηγόρος θα σας στείλει αίτημα συμμετοχής',
        'Αποδεχτείτε το αίτημα για να τον προσθέσετε στη συναλλαγή'
      ],
      actionLabel: 'Επιλέξτε Δικηγόρο',
      action: () => router.push(`/deals/${deal.id}?tab=professionals`),
      status: currentStep === 'CHOOSE_LAWYER' ? 'active' :
              ['DEPOSIT_PAYMENT', 'LAWYER_PROCESS', 'CHOOSE_NOTARY', 'NOTARY_PROCESS', 'FINAL_SIGNING', 'COMPLETED'].includes(currentStep) ? 'completed' : 'pending'
    },
    {
      id: 'DEPOSIT_PAYMENT',
      title: 'Βήμα 5: Προκαταβολή & Ιδιωτικό Συμφωνητικό',
      description: 'Πληρώστε την προκαταβολή για να κλειδώσετε το ακίνητο',
      instructions: [
        'Ο δικηγόρος έχει επιβεβαιώσει ότι τα βασικά έγγραφα είναι οκ',
        'Τώρα μπορείτε να προχωρήσετε στην πληρωμή προκαταβολής',
        'Η προκαταβολή εξασφαλίζει ότι το ακίνητο δεν θα πουληθεί σε άλλον',
        'Το ποσό καθορίζεται από τον πωλητή (συνήθως 10-20% της αξίας)',
        'Μετά την πληρωμή, υπογράφεται το ιδιωτικό συμφωνητικό'
      ],
      actionLabel: 'Πληρώστε Προκαταβολή',
      action: () => {
        // Always open the payment modal - it will check if approval exists inside
        setShowDepositPaymentModal(true);
      },
      status: (() => {
        // CRITICAL: Step 5 (Deposit) can only be active/completed if steps 2, 3, 4 are completed
        // Step 2: interestDecision === 'continue'
        // Step 3: offer agreed
        // Step 4: lawyer is chosen
        const step2Completed = interestDecision === 'continue';
        const step3Completed = deal.offers?.some((o) => o.status === 'ACCEPTED') || false;
        const hasBuyerLawyer = deal.buyerId && deal.requests?.some(
          r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
        );
        const step4Completed = !!hasBuyerLawyer;
        
        // If steps 2, 3 or 4 are not completed, step 5 (deposit) should be pending (locked)
        if (!step2Completed || !step3Completed || !step4Completed) {
          return 'pending';
        }
        
        // Check if basic documents have been approved by lawyer
        const basicDocumentsApproved = isBasicDocumentsApproved();
        
        // CRITICAL: Only mark as completed if buyer has explicitly clicked the payment button
        if (depositPaymentClicked) {
          return 'completed';
        }
        
        // IMPORTANT: Step 4 should be active ONLY if:
        // 1. Steps 2 and 3 are completed (already checked above)
        // 2. Lawyer has approved basic documents OR buyer can proceed to payment
        // Once lawyer approves, the buyer can click the payment button
        if (basicDocumentsApproved && !depositPaymentClicked) {
          return 'active';
        }
        
        // If lawyer hasn't approved yet, Step 5 is still active (current step)
        // User must upload basic docs and wait for lawyer - then they can pay
        if (!basicDocumentsApproved) {
          return 'active';
        }
        
        // Fallback
        return 'pending';
      })()
    },
    {
      id: 'LAWYER_PROCESS',
      title: 'Βήμα 6: Προετοιμασία Φακέλου & Νομικός Έλεγχος',
      description: 'Ολοκληρώστε τα έγγραφά σας και αναμένετε τους δικηγόρους να ελέγξουν τη νομιμότητα του ακινήτου.',
      instructions: [
        'Πηγαίνετε στο tab "Έγγραφα" και αναρτήστε τα εξειδικευμένα έγγραφα ή εκτελέστε τις ενέργειες που σας έχει ζητήσει ο δικηγόρος σας.',
        'Παράλληλα, ο δικηγόρος σας διενεργεί τον αυστηρό Νομικό Έλεγχο (Έλεγχος Τίτλων και ΗΤΚ) στα έγγραφα του πωλητή για να διασφαλίσει την επένδυσή σας.',
        'Εάν ο πωλητής διαθέτει τον δικό του δικηγόρο, οι δύο νομικοί θα διασταυρώσουν τα στοιχεία και θα εγκρίνουν αμοιβαία τους φακέλους της συναλλαγής.',
        'Μόλις ο νομικός έλεγχος ολοκληρωθεί επιτυχώς (και από τις δύο πλευρές, εφόσον απαιτείται), το βήμα θα ολοκληρωθεί αυτόματα.',
        'Στη συνέχεια, θα ανάψει το πράσινο φως για να προχωρήσετε στην επιλογή Συμβολαιογράφου.'
      ],
      actionLabel: 'Δείτε Έγγραφα & Ενέργειες',
      action: () => router.push(`/deals/${deal.id}?tab=documents`),
      status: (() => {
        const hasLawyerApprovalFromSSE = sseEvents?.some((e: any) => e.type === 'lawyer_approved_buyer_progress') || false;
        const hasLawyerApprovalFromStorage = typeof window !== 'undefined' && sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true';
        let hasLawyerApproval = hasLawyerApprovalFromSSE || hasLawyerApprovalFromStorage;
        const hasBuyerNotaryCheck = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId);
        if (hasBuyerNotaryCheck && !hasLawyerApproval) hasLawyerApproval = true;
        if (!hasLawyerApproval) {
          const buyerDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER') || [];
          const allDocsApproved = buyerDocs.length > 0 && buyerDocs.every(d => d.status === 'APPROVED');
          const pendingDocs = buyerDocs.filter(d => d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED').length;
          const basicDocumentsApproved = isBasicDocumentsApproved();
          const buyerCompletedDeposit = typeof window !== 'undefined' && sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';
          if (allDocsApproved && pendingDocs === 0 && basicDocumentsApproved && buyerCompletedDeposit) hasLawyerApproval = true;
        }
        if (hasLawyerApproval) return 'completed';
        if (currentStep === 'LAWYER_PROCESS') return 'active';
        if (['CHOOSE_NOTARY', 'NOTARY_PROCESS', 'FINAL_SIGNING', 'COMPLETED'].includes(currentStep)) return 'completed';
        return 'pending';
      })()
    },
    {
      id: 'CHOOSE_NOTARY',
      title: 'Βήμα 7: Επιλογή Συμβολαιογράφου',
      description: 'Επιλέξτε συμβολαιογράφο για την υπογραφή των συμβολαίων',
      instructions: [
        'Πηγαίνετε στο tab "Επαγγελματίες"',
        'Αναζητήστε συμβολαιογράφους στην περιοχή',
        'Κλείστε ραντεβού με τον συμβολαιογράφο',
        'Αποδεχτείτε το αίτημα συμμετοχής του συμβολαιογράφου'
      ],
      actionLabel: 'Επιλέξτε Συμβολαιογράφο',
      action: () => router.push(`/deals/${deal.id}?tab=professionals`),
      status: (() => {
        // Check if BUYER has chosen notary (not seller's notary)
        const hasBuyerNotaryForStep = deal.buyerId && deal.requests?.some(
          r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
        );
        
        if (hasBuyerNotaryForStep) {
          return 'completed';
        }
        
        if (currentStep === 'CHOOSE_NOTARY') {
          return 'active';
        }
        
        return 'pending';
      })()
    },
    {
      id: 'NOTARY_PROCESS',
      title: 'Βήμα 8: Διαδικασία με Συμβολαιογράφο',
      description: 'Αναμονή έγκρισης εγγράφων από τον συμβολαιογράφο',
      instructions: [
        'Ο συμβολαιογράφος θα ζητήσει τα απαραίτητα έγγραφα από τον δικηγόρο',
        'Μετά την έγκριση των εγγράφων από τον συμβολαιογράφο, θα προχωρήσετε στο επόμενο βήμα',
        'Θα ενημερωθείτε όταν ο συμβολαιογράφος εγκρίνει τα έγγραφα'
      ],
      actionLabel: 'Επικοινωνήστε με τον Συμβολαιογράφο',
      action: () => router.push(`/deals/${deal.id}?tab=chat`),
      status: (() => {
        const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
          sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
          (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

        // Only mark as completed if notary has explicitly approved
        if (hasNotaryApproval) {
          return 'completed';
        }
        if (currentStep === 'NOTARY_PROCESS') {
          return 'active';
        }
        // Don't mark as completed just because we moved to next step - must have explicit approval
        return 'pending';
      })()
    },
    {
      id: 'FINAL_SIGNING',
      title: 'Βήμα 9: Υπογραφή Συμβολαίων',
      description: (() => {
        const c = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
        return c ? 'Έχετε επιβεβαιωμένο ραντεβού για την υπογραφή των συμβολαίων.' : 'Κανονίστε την ημερομηνία και ώρα για την υπογραφή';
      })(),
      instructions: (() => {
        const c = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
        return c ? [] : [
          'Ο συμβολαιογράφος θα κανονίσει σε συνεννόηση με όλους τους συμμετέχοντες',
          'Θα συμμετέχουν: εσείς, ο πωλητής, οι δικηγόροι και ο συμβολαιογράφος',
          'Η συνάντηση θα γίνει στο γραφείο του συμβολαιογράφου',
          'Εκείνη την ημέρα θα μεταφερθεί το πλήρες ποσό στον πωλητή'
        ];
      })(),
      actionLabel: (() => {
        const c = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
        return c ? undefined : 'Κανονίστε Υπογραφή';
      })(),
      action: () => handleScheduleSigning(),
      status: (() => {
        const confirmedSigningAppointment = deal.appointments?.find(
          a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
        );
        
        if (confirmedSigningAppointment) {
          const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
          const now = new Date();
          
          // If appointment time has passed, mark as completed
          if (appointmentEndTime <= now) {
            return 'completed';
          }
          
          // Appointment is scheduled but hasn't happened yet
          if (currentStep === 'FINAL_SIGNING') {
            return 'active';
          }
          return 'completed'; // Scheduled but waiting
        }
        
        if (currentStep === 'FINAL_SIGNING') {
          return 'active';
        }
        if (currentStep === 'CONFIRM_SIGNING_COMPLETION' || currentStep === 'COMPLETED') {
          return 'completed';
        }
        return 'pending';
      })()
    },
    {
      id: 'CONFIRM_SIGNING_COMPLETION',
      title: 'Βήμα 10: Επιβεβαίωση Ολοκλήρωσης Υπογραφής',
      description: 'Επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν επιτυχώς',
      instructions: [
        'Εάν τα συμβολαία έχουν υπογραφεί επιτυχώς, πατήστε το κουμπί παρακάτω',
        'Το deal θα ολοκληρωθεί μόνο όταν και εσείς και ο πωλητής επιβεβαιώσετε την ολοκλήρωση',
        'Μετά την επιβεβαίωση, θα εμφανιστεί μήνυμα συγχαρητηρίων'
      ],
      actionLabel: 'Επιβεβαιώστε Ολοκλήρωση',
      action: () => setShowConfirmSigningModal(true),
      status: (() => {
        const confirmedSigningAppointment = deal.appointments?.find(
          a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
        );
        
        if (!confirmedSigningAppointment) {
          return 'pending';
        }
        
        const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
        const now = new Date();
        
        if (appointmentEndTime <= now) {
          const buyerConfirmed = deal.buyerSigningConfirmed || false;
          if (buyerConfirmed) {
            return 'completed';
          }
          if (currentStep === 'CONFIRM_SIGNING_COMPLETION') {
            return 'active';
          }
          return 'pending';
        }
        
        return 'pending';
      })()
    }
  ];

  // Rent flow: 6 steps (no lawyer/notary)
  const getRentCurrentStep = (): RentStep => {
    if (deal.status === 'CLOSED') return 'RENT_COMPLETION';
    const step1Done = isStep1Completed();
    // If user chose reschedule, go back to step 1
    if (rentInterestDecision === 'reschedule') return 'RENT_VIEWING';
    const step2Done = !!(deal.offers?.some((o) => o.role === 'BUYER'));
    const step3Done = isBasicDocumentsApproved();
    const step4Done = typeof window !== 'undefined' && sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';
    const tenantSignedApprovedByLandlord = deal.documents?.some((d) =>
      d.category.toLowerCase().includes('υπογεγραμμένο') &&
      d.uploadedById === deal.buyerId &&
      d.status === 'APPROVED'
    );
    const step5Done = tenantSignedApprovedByLandlord ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigned_${deal.id}`) === 'true');
    const rentCompletion = deal.rentCompletionMetadata as { buyerMyAadeConfirmedAt?: string; buyerCompletionConfirmedAt?: string; sellerCompletionConfirmedAt?: string } | null | undefined;
    const step6Done = !!rentCompletion?.buyerMyAadeConfirmedAt || rentMyAadeConfirmedLocal || (typeof window !== 'undefined' && sessionStorage.getItem(`rentMyAadeAccepted_${deal.id}`) === 'true');
    const dealClosed = (deal.status as string) === 'CLOSED' || (!!rentCompletion?.buyerCompletionConfirmedAt && !!rentCompletion?.sellerCompletionConfirmedAt);
    if (!step1Done) return 'RENT_VIEWING';
    if (!step2Done) return 'RENT_OFFER';
    if (!step3Done) return 'RENT_DOCUMENTS';
    if (!step4Done) return 'RENT_DEPOSIT';
    if (!step5Done) return 'RENT_CONTRACT';
    if (!step6Done) return 'RENT_MYAADE';
    if (!dealClosed) return 'RENT_COMPLETION';
    return 'RENT_COMPLETION';
  };

  const rentCurrentStep = getRentCurrentStep();

  // Sync signing method and load documents when Step 5 is active (Overview tab)
  const isRentStep5Active = isRent && isBuyerRole && rentCurrentStep === 'RENT_CONTRACT';
  useEffect(() => {
    if (isRentStep5Active) {
      const saved = typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigningMethod_${deal.id}`);
      if (saved === 'electronic' || saved === 'in-person') {
        setRentContractSigningMethod(saved);
      }
      if (saved === 'electronic') {
        listDocuments(deal.id)
          .then((docs) => setRentContractDocuments(docs))
          .catch(() => {});
      }
    }
  }, [isRentStep5Active, deal.id]);

  const rentSteps: StepInfo[] = [
    {
      id: 'RENT_VIEWING',
      title: 'Βήμα 1: Κλείσιμο Ραντεβού (Προαιρετικό)',
      description: 'Κλείστε ραντεβού για να δείτε το ακίνητο',
      instructions: [
        'Πηγαίνετε στο tab "Ραντεβού"',
        'Επιλέξτε ημερομηνία και ώρα που σας βολεύει',
        'Αναμένετε την επιβεβαίωση από τον ιδιοκτήτη ή τον μεσίτη',
        'Σημείωση: Μπορείτε να προχωρήσετε στην επιβεβαίωση ενδιαφέροντος για το ακίνητο χωρίς να έχετε κλείσει ραντεβού'
      ],
      actionLabel: 'Κλείστε Ραντεβού',
      action: () => router.push(`/deals/${deal.id}?tab=appointments`),
      status: rentCurrentStep === 'RENT_VIEWING' ? 'active' : (isStep1Completed() ? 'completed' : 'pending')
    },
    {
      id: 'RENT_OFFER',
      title: 'Βήμα 2: Επιβεβαίωση Ενδιαφέροντος & Προσφορά',
      description: 'Αποφασίστε αν θέλετε να προχωρήσετε στην ενοικίαση',
      instructions: rentInterestDecision === 'continue' ? [
        'Προσδιορίστε το ποσό του ενοικίου που θέλετε να προσφέρετε',
        'Μπορείτε να προσθέσετε προαιρετικό μήνυμα στον ιδιοκτήτη',
        'Ο ιδιοκτήτης θα δει την προσφορά σας και μπορεί να την αποδεχτεί, να κάνει αντιπρόταση ή να την απορρίψει',
        'Μπορείτε επίσης να αποδεχτείτε την αρχική τιμή ενοικίου χωρίς διαπραγμάτευση'
      ] : rentInterestDecision === 'cancel' ? [
        'Έχετε ακυρώσει το ενδιαφέρον σας για αυτό το ακίνητο'
      ] : [
        'Μετά το ραντεβού, επιλέξτε πώς θέλετε να προχωρήσετε',
        'Μπορείτε να επιβεβαιώσετε το ενδιαφέρον σας και να κάνετε προσφορά',
        'Ή να ξανακανονίσετε ραντεβού αν δεν είστε ακόμα σίγουροι',
        'Ή να ακυρώσετε το ενδιαφέρον σας'
      ],
      actionLabel: rentInterestDecision === 'continue' ? 'Κάνε Προσφορά' : undefined,
      action: rentInterestDecision === 'continue' ? () => setShowBuyerOfferModal(true) : undefined,
      status: rentCurrentStep === 'RENT_OFFER' ? 'active' :
        (deal.offers?.some((o) => o.role === 'BUYER') ? 'completed' : 'pending')
    },
    {
      id: 'RENT_DOCUMENTS',
      title: 'Βήμα 3: Ταυτοποίηση & Οικονομικό Προφίλ',
      description: 'Ο ιδιοκτήτης θα ζητήσει έγγραφα για να επιβεβαιώσει τα στοιχεία σας',
      instructions: [
        'Πηγαίνετε στο tab "Έγγραφα & Ενέργειες" για να δείτε αναλυτικές οδηγίες',
        'Ανεβάστε την ταυτότητά σας και το αποδεικτικό ΑΦΜ',
        'Προσθέστε προαιρετικά ένα αποδεικτικό εισοδήματος (π.χ. εκκαθαριστικό) για να ενισχύσετε το προφίλ σας',
        'Ο ιδιοκτήτης θα ελέγξει τα έγγραφα για να εγκρίνει τη μίσθωση',
        'Σημαντικό: Θα πρέπει να περιμένετε την έγκριση του ιδιοκτήτη πριν προχωρήσετε στο επόμενο βήμα'
      ],
      actionLabel: 'Δείτε Έγγραφα & Ενέργειες',
      action: () => router.push(`/deals/${deal.id}?tab=documents`),
      status: rentCurrentStep === 'RENT_DOCUMENTS' ? 'active' : (isBasicDocumentsApproved() ? 'completed' : 'pending')
    },
    {
      id: 'RENT_DEPOSIT',
      title: 'Βήμα 4: Πληρωμή Εγγύησης & Κράτηση',
      description: 'Πληρώστε την εγγύηση για να κλειδώσετε το ακίνητο',
      instructions: [
        'Ο ιδιοκτήτης έχει εγκρίνει το προφίλ σας και τα βασικά έγγραφα',
        'Τώρα μπορείτε να προχωρήσετε στην πληρωμή της εγγύησης και της αμοιβής πλατφόρμας',
        'Η πληρωμή εξασφαλίζει ότι το ακίνητο δεν θα νοικιαστεί σε άλλον',
        'Το ποσό καθορίζεται από τη συμφωνία (συνήθως 1-2 ενοίκια εγγύηση + τρέχων μήνας)',
        'Μετά την πληρωμή, το ακίνητο κατοχυρώνεται οριστικά σε εσάς'
      ],
      actionLabel: 'Πληρωμή Εγγύησης',
      action: () => setShowDepositPaymentModal(true),
      status: rentCurrentStep === 'RENT_DEPOSIT' ? 'active' : (typeof window !== 'undefined' && sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true' ? 'completed' : 'pending')
    },
    {
      id: 'RENT_CONTRACT',
      title: 'Βήμα 5: Υπογραφή Ιδιωτικού Συμφωνητικού',
      description: 'Διαβάστε και υπογράψτε το μισθωτήριο συμβόλαιο',
      instructions: [
        'Επιλέξτε αν θέλετε ηλεκτρονική υπογραφή (gov.gr) ή δια ζώσης',
        'Για ηλεκτρονική: ο ιδιοκτήτης ανεβάζει το PDF, εσείς το υπογράφετε στο docs.gov.gr και το ανεβάζετε ξανά',
        'Για δια ζώσης: κανονίστε ημερομηνία και ώρα με τον ιδιοκτήτη'
      ],
      actionLabel: 'Υπογραφή Συμβολαίου',
      action: () => setShowRentContractModal(true),
      status: rentCurrentStep === 'RENT_CONTRACT' ? 'active' :
        (typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigned_${deal.id}`) === 'true' ? 'completed' : 'pending')
    },
    {
      id: 'RENT_MYAADE',
      title: 'Βήμα 6: Αποδοχή Μισθωτηρίου (myAADE)',
      description: (deal.rentCompletionMetadata as any)?.sellerMyAadeDeclarationNumber
        ? `Αποδεχτείτε την ηλεκτρονική δήλωση μίσθωσης στην εφορία. Ο Αριθμός Δήλωσής σας: ${(deal.rentCompletionMetadata as any).sellerMyAadeDeclarationNumber}`
        : 'Αποδεχτείτε την ηλεκτρονική δήλωση μίσθωσης στην εφορία. Ο ιδιοκτήτης θα καταθέσει το μισθωτήριο και θα σας ενημερώσει με τον αριθμό δήλωσης.',
      instructions: [
        ...((deal.rentCompletionMetadata as any)?.sellerMyAadeDeclarationNumber
          ? [`Ο Αριθμός της Δήλωσής σας είναι: ${(deal.rentCompletionMetadata as any).sellerMyAadeDeclarationNumber}`]
          : []),
        'Ο ιδιοκτήτης θα καταθέσει το ηλεκτρονικό μισθωτήριο στην πλατφόρμα της ΑΑΔΕ',
        'Συνδεθείτε στο TaxisNet (myAADE) με τους κωδικούς σας',
        'Μεταβείτε στις "Δηλώσεις Μίσθωσης Ακινήτων" και κάντε "Αποδοχή"',
        'Αυτό το βήμα είναι υποχρεωτικό από τον νόμο για να είναι έγκυρη η ενοικίαση'
      ],
      actionLabel: 'Αποδοχή Μισθωτηρίου (myAADE)',
      action: () => setShowRentMyAadeModal(true),
      status: rentCurrentStep === 'RENT_MYAADE' ? 'active' :
        (!!(deal.rentCompletionMetadata as any)?.buyerMyAadeConfirmedAt || rentMyAadeConfirmedLocal || (typeof window !== 'undefined' && sessionStorage.getItem(`rentMyAadeAccepted_${deal.id}`) === 'true') ? 'completed' : 'pending')
    },
    {
      id: 'RENT_COMPLETION',
      title: 'Βήμα 7: Επιβεβαίωση Ολοκλήρωσης & Παράδοση Κλειδιών',
      description: 'Επιβεβαιώστε την ολοκλήρωση της ενοικίασης',
      instructions: [
        'Προχωρήστε στην παραλαβή των κλειδιών του ακινήτου από τον ιδιοκτήτη',
        'Πατήστε το παρακάτω κουμπί για να επιβεβαιώσετε την επιτυχή ολοκλήρωση',
        'Σημαντικό: Το Deal θα κλείσει οριστικά στην πλατφόρμα μόνο όταν και οι δύο πλευρές πατήσουν την ολοκλήρωση',
        'Μόλις επιβεβαιώσουν και τα δύο μέρη, η διαδικασία ολοκληρώνεται με επιτυχία!'
      ],
      actionLabel: 'Επιβεβαίωση Ολοκλήρωσης Deal',
      action: async () => {
        setIsConfirmingRentCompletion(true);
        try {
          const res = await confirmRentCompletion(deal.id, 'BUYER');
          toast.success(res.message);
          onRefresh();
        } catch (e: any) {
          toast.error(e?.message || 'Σφάλμα επιβεβαίωσης');
        } finally {
          setIsConfirmingRentCompletion(false);
        }
      },
      status: (deal.status as string) === 'CLOSED' || !!((deal.rentCompletionMetadata as any)?.buyerCompletionConfirmedAt && (deal.rentCompletionMetadata as any)?.sellerCompletionConfirmedAt)
        ? 'completed'
        : rentCurrentStep === 'RENT_COMPLETION' ? 'active' : 'pending'
    }
  ];

  const stepsToShow = isRent ? rentSteps : steps;
  const currentStepToShow = isRent ? rentCurrentStep : currentStep;

  // Get lawyer's current step
  const getLawyerStep = (): LawyerStep => {
    if (!isLawyerRole) return 'COMPLETED';

    const buyerDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER') || [];
    
    // Step 1: Approve basic documents for deposit (NEW FIRST STEP)
    // Check if lawyer has approved basic documents for deposit payment
    const hasBasicDocumentsApproval = sseEvents?.some(
      (e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit'
    ) || false;

    // Also check sessionStorage for approval (in case SSE event hasn't arrived yet)
    const hasBasicDocumentsApprovalFromStorage = typeof window !== 'undefined' && 
      sessionStorage.getItem(`basicDocsApproved_${deal.id}`) === 'true';

    const basicDocumentsApproved = hasBasicDocumentsApproval || hasBasicDocumentsApprovalFromStorage;

    // Check if buyer has completed step 4 (deposit payment)
    const buyerCompletedDeposit = typeof window !== 'undefined' && 
      sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';

    // If basic documents have been approved by lawyer, step 1 is completed - move to step 2
    if (basicDocumentsApproved) {
      // Continue to step 2
    } else {
      // Define basic document categories
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

      const basicDocs = buyerDocs.filter(d => 
        basicDocumentCategories.some(cat => 
          d.category.toLowerCase().includes(cat.toLowerCase())
        )
      );

      const allBasicApproved = basicDocs.length > 0 && basicDocs.every(d => d.status === 'APPROVED');
      
      // Only show step 1 if basic docs are approved but not yet confirmed by lawyer
      if (allBasicApproved) {
        return 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT';
      } else {
        // If basic docs are not approved yet, still show step 1 but it will be pending
        return 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT';
      }
    }

    // Step 2: Review documents and actions (NEW SECOND STEP)
    // Check if lawyer has approved buyer's documents and actions
    const hasLawyerApprovalFromSSE = sseEvents?.some(
      (e: any) => e.type === 'lawyer_approved_buyer_progress'
    ) || false;
    
    // Also check sessionStorage for approval (in case SSE event hasn't arrived yet)
    const hasLawyerApprovalFromStorage = typeof window !== 'undefined' && 
      sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true';
    
    const lawyerApprovedBuyerProgress = hasLawyerApprovalFromSSE || hasLawyerApprovalFromStorage;
    
    // If lawyer has approved, move to step 3
    if (lawyerApprovedBuyerProgress) {
      // Continue to step 3
    } else {
      // Still in step 2 - need to review documents
      return 'REVIEW_DOCUMENTS_AND_ACTIONS';
    }

    // Step 3: Wait for notary selection (buyer chooses notary)
    const hasBuyerNotaryForLawyer = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId);
    if (!hasBuyerNotaryForLawyer) {
      return 'WAIT_FOR_NOTARY_SELECTION';
    }

    // Step 3: Send documents to notary (check if documents have been sent)
    const notaryDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER' && d.status === 'APPROVED') || [];
    const notaryHasDocs = deal.documents?.some(d => d.requestedFromRole === 'BUYER');
    
    if (hasBuyerNotaryForLawyer && notaryHasDocs) {
      // Check if notary has approved
      const notaryApprovedAll = deal.documents?.every(d => d.status === 'APPROVED');
      if (!notaryApprovedAll) {
        return 'SEND_DOCUMENTS_TO_NOTARY';
      }
    }

    // Step 4: Wait for signing appointment
    const signingScheduled = deal.appointments?.some(
      a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    
    if (!signingScheduled) {
      return 'WAIT_FOR_SIGNING_APPOINTMENT';
    }

    return 'COMPLETED';
  };

  // Check if all documents uploaded by buyer are approved
  // This matches the backend logic: checks documents with requestedFromRole === 'BUYER'
  const checkAllDocumentsApproved = (): boolean => {
    // Get all documents requested from buyer (matches backend logic)
    const buyerDocs = deal.documents?.filter(d => d.requestedFromRole === 'BUYER') || [];
    
    // If no documents requested from buyer, consider it as approved (nothing to check)
    if (buyerDocs.length === 0) {
      return true;
    }
    
    // Check if all documents requested from buyer are approved
    // Backend requires all documents to be APPROVED
    return buyerDocs.every(d => d.status === 'APPROVED');
  };

  // Handle lawyer approval - shows confirmation modal if not all documents are approved
  const handleLawyerApproval = () => {
    console.log('[handleLawyerApproval] Button clicked');
    const allApproved = checkAllDocumentsApproved();
    console.log('[handleLawyerApproval] All approved:', allApproved);
    
    // Always show confirmation modal if not all documents are approved
    // This allows lawyer to proceed even if some documents aren't approved yet
    if (!allApproved) {
      console.log('[handleLawyerApproval] Showing confirmation modal');
      // Show confirmation modal
      setShowLawyerApprovalConfirmationModal(true);
      console.log('[handleLawyerApproval] Modal state set to true');
    } else {
      console.log('[handleLawyerApproval] All approved, proceeding directly');
      // All documents approved, proceed directly
      confirmLawyerApproval();
    }
  };

  // Confirm lawyer approval (actual API call)
  const confirmLawyerApproval = async () => {
    console.log('[confirmLawyerApproval] Starting approval');
    setIsApproving(true);
    setShowLawyerApprovalConfirmationModal(false);
    
    try {
      // Call API to mark lawyer approval
      console.log('[confirmLawyerApproval] Calling API');
      const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/approve`, {
        method: 'POST',
      });
      console.log('[confirmLawyerApproval] API response:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to approve buyer progress' }));
        const errorMessage = errorData.error || 'Failed to approve buyer progress';
        throw new Error(errorMessage);
      }

      // Store approval in sessionStorage for immediate UI update
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`lawyerApprovedBuyerProgress_${deal.id}`, 'true');
        // Force re-render by updating lawyerApprovalKey
        setLawyerApprovalKey(prev => prev + 1);
      }

      toast.success('Η έγκριση καταχωρήθηκε. Ο αγοραστής μπορεί τώρα να προχωρήσει στο επόμενο βήμα.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά την έγκριση');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle notary approval
  const handleNotaryApproval = async () => {
    setIsNotaryApproving(true);
    
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/notary/approve-documents`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to approve documents' }));
        throw new Error(error.error || 'Failed to approve documents');
      }

      // Store approval in sessionStorage for immediate UI update
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`notaryApprovedDocuments_${deal.id}`, 'true');
        setNotaryApprovalKey(prev => prev + 1);
      }

      toast.success('Η έγκριση καταχωρήθηκε. Ολοκληρώθηκε το Βήμα 5 του αγοραστή και του πωλητή. Έτοιμο για τελική υπογραφή.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά την έγκριση');
    } finally {
      setIsNotaryApproving(false);
    }
  };

  // Lawyer view
  if (isLawyerRole) {
    const lawyerCurrentStep = getLawyerStep();
    
    const lawyerSteps: StepInfo[] = [
      {
        id: 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT',
        title: 'Βήμα 1: Επιβεβαίωση Βασικών Εγγράφων για Προκαταβολή',
        description: 'Δείτε τα έγγραφα στους Φακέλους Συναλλαγής· με την επιβεβαίωση δηλώνετε ότι έχετε ενημερωθεί, ώστε να προχωρήσει η υπογραφή του ιδιωτικού συμφωνητικού και η πληρωμή προκαταβολής',
        instructions: [
          'Ανοίξτε τους «Φακέλους Συναλλαγής» και ελέγξτε τα βασικά έγγραφα του αγοραστή',
          'Όταν έχετε ολοκληρώσει την ενημέρωσή σας, πατήστε «Επιβεβαίωση βασικών εγγράφων» — καταγράφει ότι τα έχετε δει/ελέγξει',
          'Μετά την επιβεβαίωση, ο αγοραστής θα μπορεί να προχωρήσει στην πληρωμή προκαταβολής'
        ],
        actionLabel: 'Φάκελοι Συναλλαγής',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        status: (() => {
          // Check if basic documents have been approved by lawyer (DB, SSE, or sessionStorage)
          const hasBasicDocumentsApprovalFromDB = !!deal.lawyerApprovedBasicDocumentsAt;
          const hasBasicDocumentsApprovalFromSSE = sseEvents?.some(
            (e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit'
          ) || false;
          const hasBasicDocumentsApprovalFromStorage = typeof window !== 'undefined' && 
            sessionStorage.getItem(`basicDocsApproved_${deal.id}`) === 'true';

          const basicDocumentsApproved = hasBasicDocumentsApprovalFromDB || hasBasicDocumentsApprovalFromSSE || hasBasicDocumentsApprovalFromStorage;

          // If basic documents have been approved, step 1 is completed
          if (basicDocumentsApproved) {
            return 'completed';
          }

          // If this is the current step, it's active
          if (lawyerCurrentStep === 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT') {
            return 'active';
          }
          
          // If we've moved past this step, it's completed
          if (['REVIEW_DOCUMENTS_AND_ACTIONS', 'WAIT_FOR_NOTARY_SELECTION', 'SEND_DOCUMENTS_TO_NOTARY', 'WAIT_FOR_SIGNING_APPOINTMENT', 'COMPLETED'].includes(lawyerCurrentStep)) {
            return 'completed';
          }
          
          return 'pending';
        })()
      },
      {
        id: 'REVIEW_DOCUMENTS_AND_ACTIONS',
        title: 'Βήμα 2: Έλεγχος Εγγράφων και Ενεργειών',
        description: 'Ελέγξτε ότι ο αγοραστής έχει ανεβάσει όλα τα απαραίτητα έγγραφα και έχει εκτελέσει όλες τις ενέργειες',
        instructions: [
          'Πηγαίνετε στο tab "Έγγραφα" για να δείτε όλα τα έγγραφα',
          'Ελέγξτε ότι κάθε έγγραφο είναι σωστό και πλήρες',
          'Ελέγξτε ότι ο αγοραστής έχει εκτελέσει όλες τις ενέργειες που του ανατέθηκαν',
          'Μόλις είστε σίγουροι ότι όλα είναι έτοιμα, πατήστε "Έγκριση"'
        ],
        actionLabel: 'Δείτε Έγγραφα',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        status: (() => {
          // Check if lawyer has approved buyer progress
          const hasLawyerApprovalFromSSE = sseEvents?.some(
            (e: any) => e.type === 'lawyer_approved_buyer_progress'
          ) || false;
          
          const hasLawyerApprovalFromStorage = typeof window !== 'undefined' && 
            sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true';
          
          const lawyerApprovedBuyerProgress = hasLawyerApprovalFromSSE || hasLawyerApprovalFromStorage;
          
          // If lawyer has approved, step 2 is completed
          if (lawyerApprovedBuyerProgress) {
            return 'completed';
          }
          
          // If this is the current step, it's active
          if (lawyerCurrentStep === 'REVIEW_DOCUMENTS_AND_ACTIONS') {
            return 'active';
          }
          
          // If we've moved past this step, it's completed
          if (['WAIT_FOR_NOTARY_SELECTION', 'SEND_DOCUMENTS_TO_NOTARY', 'WAIT_FOR_SIGNING_APPOINTMENT', 'COMPLETED'].includes(lawyerCurrentStep)) {
            return 'completed';
          }
          
          return 'pending';
        })()
      },
      {
        id: 'WAIT_FOR_NOTARY_SELECTION',
        title: 'Βήμα 3: Αναμονή Επιλογής Συμβολαιογράφου',
        description: 'Αναμένετε τον αγοραστή να επιλέξει συμβολαιογράφο',
        instructions: [
          'Ο αγοραστής θα επιλέξει συμβολαιογράφο από το tab "Επαγγελματίες"',
          'Θα ενημερωθείτε όταν επιλεγεί ο συμβολαιογράφος'
        ],
        status: lawyerCurrentStep === 'WAIT_FOR_NOTARY_SELECTION' ? 'active' :
                ['SEND_DOCUMENTS_TO_NOTARY', 'WAIT_FOR_SIGNING_APPOINTMENT', 'COMPLETED'].includes(lawyerCurrentStep) ? 'completed' : 'pending'
      },
      {
        id: 'SEND_DOCUMENTS_TO_NOTARY',
        title: 'Βήμα 4: Αποστολή Εγγράφων στον Συμβολαιογράφο',
        description: 'Στείλτε τα απαραίτητα έγγραφα στον συμβολαιογράφο',
        instructions: [
          'Πηγαίνετε στο tab "Έγγραφα"',
          'Επιλέξτε τα έγγραφα που χρειάζονται για τον συμβολαιογράφο',
          'Αναμένετε τον συμβολαιογράφο να εγκρίνει ότι όλα τα έγγραφα είναι σωστά'
        ],
        actionLabel: 'Δείτε Έγγραφα',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        status: lawyerCurrentStep === 'SEND_DOCUMENTS_TO_NOTARY' ? 'active' :
                ['WAIT_FOR_SIGNING_APPOINTMENT', 'COMPLETED'].includes(lawyerCurrentStep) ? 'completed' : 'pending'
      },
      {
        id: 'WAIT_FOR_SIGNING_APPOINTMENT',
        title: 'Βήμα 5: Αναμονή Κανονισμού Υπογραφής',
        description: 'Αναμένετε τον αγοραστή και τον πωλητή να κανονίσουν το ραντεβού για υπογραφή',
        instructions: [
          'Ο αγοραστής και ο πωλητής θα κανονίσουν την ημερομηνία και ώρα',
          'Θα συμμετέχετε στη συνάντηση στο γραφείο του συμβολαιογράφου',
          'Θα ενημερωθείτε όταν κανονιστεί το ραντεβού'
        ],
        status: lawyerCurrentStep === 'WAIT_FOR_SIGNING_APPOINTMENT' ? 'active' :
                lawyerCurrentStep === 'COMPLETED' ? 'completed' : 'pending'
      }
    ];

    const activeLawyerStep = lawyerSteps.find(s => s.id === lawyerCurrentStep);
    const completedLawyerSteps = lawyerSteps.filter(s => s.status === 'completed');

    return (
      <>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Οδηγός Δικηγόρου</h2>
            <p className="text-gray-600">Οι ενέργειες που πρέπει να εκτελέσετε ως δικηγόρος</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Πρόοδος</span>
              <span className="text-sm font-bold text-blue-600">
                {completedLawyerSteps.length} / {lawyerSteps.length} βήματα
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`bg-gradient-to-r ${accentGradient} h-2.5 rounded-full transition-all duration-500`}
                style={{ width: `${(completedLawyerSteps.length / lawyerSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {lawyerSteps.map((step, index) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <div
                key={step.id}
                className={`rounded-xl border-2 p-6 transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : isCompleted
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <FaCheckCircle /> : index + 1}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-bold ${
                        isActive ? 'text-blue-900' : 
                        isCompleted ? 'text-green-900' : 
                        'text-gray-700'
                      }`}>
                        {step.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                          ΟΛΟΚΛΗΡΩΘΗΚΕ
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          ΤΡΕΧΟΝ ΒΗΜΑ
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-4">{step.description}</p>

                    {/* Instructions */}
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

                    {/* Action Button or Approval Button */}
                    {isActive && step.id === 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT' && (
                      <div className="flex gap-3">
                        {step.actionLabel && (
                          <button
                            onClick={step.action}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            <FaFileAlt />
                            {step.actionLabel}
                          </button>
                        )}
                        <button
                          onClick={() => setShowBasicDocumentsConfirmationModal(true)}
                          disabled={isApproving}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApproving ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Επιβεβαίωση...
                            </>
                          ) : (
                            <>
                              <FaCheck /> Επιβεβαίωση βασικών εγγράφων
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {isActive && step.id === 'REVIEW_DOCUMENTS_AND_ACTIONS' && (
                      <div className="flex gap-3">
                        {step.actionLabel && (
                          <button
                            onClick={step.action}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            {step.actionLabel}
                            <FaArrowRight />
                          </button>
                        )}
                        <button
                          onClick={handleLawyerApproval}
                          disabled={isApproving}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApproving ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Εγκρίνεται...
                            </>
                          ) : (
                            <>
                              <FaCheck /> Έγκριση
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {isActive && step.actionLabel && step.id !== 'REVIEW_DOCUMENTS_AND_ACTIONS' && step.id !== 'APPROVE_BASIC_DOCUMENTS_FOR_DEPOSIT' && (
                      <button
                        onClick={step.action}
                        className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all duration-200 shadow-md hover:shadow-lg`}
                      >
                        {step.actionLabel}
                        <FaArrowRight />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Basic Documents Confirmation Modal - lawyer attestation only (no doc-status gate) */}
        {showBasicDocumentsConfirmationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση βασικών εγγράφων</h3>
                <button
                  type="button"
                  onClick={() => !isApproving && setShowBasicDocumentsConfirmationModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-blue-600 text-xl mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-800">
                    Με την επιβεβαίωση δηλώνετε ότι έχετε ενημερωθεί για τα βασικά έγγραφα (π.χ. μέσα από τους Φακέλους Συναλλαγής). Ο αγοραστής θα μπορεί να προχωρήσει στην πληρωμή προκαταβολής.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBasicDocumentsConfirmationModal(false)}
                  disabled={isApproving}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsApproving(true);
                    try {
                      const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/approve-basic-documents`, { method: 'POST' });
                      if (!response.ok) {
                        const error = await response.json().catch(() => ({ error: 'Failed to approve basic documents' }));
                        throw new Error(error.error || 'Failed to approve basic documents');
                      }
                      if (typeof window !== 'undefined') sessionStorage.setItem(`basicDocsApproved_${deal.id}`, 'true');
                      toast.success('Η επιβεβαίωση καταχωρήθηκε. Ο αγοραστής μπορεί τώρα να προχωρήσει στην πληρωμή προκαταβολής.');
                      setShowBasicDocumentsConfirmationModal(false);
                      onRefresh();
                    } catch (error: any) {
                      toast.error(error.message || 'Σφάλμα κατά την επιβεβαίωση');
                    } finally {
                      setIsApproving(false);
                    }
                  }}
                  disabled={isApproving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? <><FaSpinner className="animate-spin inline mr-2" />Επιβεβαιώνεται...</> : 'Ναι, επιβεβαιώνω'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notary View */}
        {isNotaryRole && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <FaUserTie className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Βήματα Συμβολαιογράφου</h2>
                  <p className="text-sm text-gray-600">Ελέγξτε και εγκρίνετε τα έγγραφα για την ολοκλήρωση της αγοραπωλησίας</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Notary Step 1: Review and Approve Documents */}
              <div className="bg-white rounded-xl shadow-md border-2 border-purple-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Επιβεβαίωση Εγγράφων</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Ελέγξτε ότι όλα τα απαραίτητα έγγραφα είναι εγκεκριμένα για την ολοκλήρωση της αγοραπωλησίας</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                      <li>Ελέγξτε ότι όλα τα έγγραφα είναι εγκεκριμένα</li>
                      <li>Βεβαιωθείτε ότι όλα τα απαραίτητα έγγραφα είναι σωστά και πλήρη</li>
                      <li>Μόλις είστε σίγουροι, πατήστε "Έγκριση"</li>
                    </ul>
                  </div>
                  <div className="ml-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      Ενεργό
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Δείτε Έγγραφα
                    <FaArrowRight />
                  </button>
                  <button
                    onClick={handleNotaryApproval}
                    disabled={isNotaryApproving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isNotaryApproving ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Εγκρίνεται...
                      </>
                    ) : (
                      <>
                        <FaCheck /> Έγκριση
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lawyer Approval Confirmation Modal */}
        {showLawyerApprovalConfirmationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Έγκρισης</h3>
                <button
                  onClick={() => setShowLawyerApprovalConfirmationModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-2">Σημαντική Επιβεβαίωση</h4>
                    <p className="text-sm text-yellow-800">
                      Δεν έχετε εγκρίνει όλα τα έγγραφα που έχει ανεβάσει ο αγοραστής.
                    </p>
                    <p className="text-sm text-yellow-800 mt-2 font-medium">
                      Είστε σίγουροι ότι έχετε ελέγξει όλα τα έγγραφα που χρειάζονται για να προχωρήσει η συναλλαγή;
                    </p>
                    <p className="text-sm text-yellow-800 mt-2">
                      Μπορείτε να δείτε όλα τα έγγραφα στο tab "Έγγραφα και Ενέργειες" → "Εισερχόμενα".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLawyerApprovalConfirmationModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={() => confirmLawyerApproval()}
                  disabled={isApproving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Εγκρίνεται...
                    </>
                  ) : (
                    'Εγκριση Εγγράφων'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Seller steps - only show confirmation step
  const sellerSteps: StepInfo[] = [
    {
      id: 'CONFIRM_SIGNING_COMPLETION',
      title: 'Επιβεβαίωση Ολοκλήρωσης Υπογραφής',
      description: 'Επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν επιτυχώς',
      instructions: [
        'Εάν τα συμβολαία έχουν υπογραφεί επιτυχώς, πατήστε το κουμπί παρακάτω',
        'Το deal θα ολοκληρωθεί μόνο όταν και εσείς και ο αγοραστής επιβεβαιώσετε την ολοκλήρωση',
        'Μετά την επιβεβαίωση, θα εμφανιστεί μήνυμα συγχαρητηρίων'
      ],
      actionLabel: 'Επιβεβαιώστε Ολοκλήρωση',
      action: () => setShowConfirmSigningModal(true),
      status: (() => {
        const confirmedSigningAppointment = deal.appointments?.find(
          a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
        );
        
        if (!confirmedSigningAppointment) {
          return 'pending';
        }
        
        const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
        const now = new Date();
        
        if (appointmentEndTime <= now) {
          const sellerConfirmed = deal.sellerSigningConfirmed || false;
          if (sellerConfirmed) {
            return 'completed';
          }
          return 'active';
        }
        
        return 'pending';
      })()
    }
  ];

  // For sellers, show seller steps
  if (isSellerRole) {
    const sellerCurrentStep = sellerSteps[0].id;
    const activeSellerStep = sellerSteps.find(s => s.status === 'active');
    const completedSellerSteps = sellerSteps.filter(s => s.status === 'completed');

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ενέργειες</h2>
          <p className="text-gray-600">Οι επόμενες ενέργειες που πρέπει να εκτελέσεις</p>
        </div>

        {/* Seller Steps */}
        <div className="space-y-4">
          {sellerSteps.map((step, index) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <div
                key={step.id}
                className={`rounded-xl border-2 p-6 transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : isCompleted
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <FaCheckCircle /> : 1}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-bold ${
                        isActive ? 'text-blue-900' : 
                        isCompleted ? 'text-green-900' : 
                        'text-gray-700'
                      }`}>
                        {step.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                          ΟΛΟΚΛΗΡΩΘΗΚΕ
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          ΤΡΕΧΟΝ ΒΗΜΑ
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-4">{step.description}</p>

                    {step.instructions && step.instructions.length > 0 && (
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-4">
                        {step.instructions.map((instruction, idx) => (
                          <li key={idx}>{instruction}</li>
                        ))}
                      </ul>
                    )}

                    {/* Waiting Message for Seller Step */}
                    {step.id === 'CONFIRM_SIGNING_COMPLETION' && isCompleted && deal.sellerSigningConfirmed && !deal.buyerSigningConfirmed && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <FaClock className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-900 mb-1">Αναμονή</h4>
                            <p className="text-sm text-yellow-800">
                              Έχετε επιβεβαιώσει την ολοκλήρωση της υπογραφής. Περιμένετε τον αγοραστή να επιβεβαιώσει την ολοκλήρωση για να ολοκληρωθεί το deal.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isActive && step.actionLabel && (
                      <button
                        onClick={() => {
                          console.log('[Seller Step] Button clicked, step:', step.id, 'action:', step.action);
                          step.action?.();
                        }}
                        className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all duration-200 shadow-md hover:shadow-lg`}
                      >
                        {step.actionLabel}
                        <FaArrowRight />
                      </button>
                    )}
                    {!isActive && step.actionLabel && (
                      <div className="text-sm text-gray-500 italic">
                        Το βήμα δεν είναι ενεργό ακόμα. Status: {step.status}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm Signing Completion Modal for Seller */}
        {showConfirmSigningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Ολοκλήρωσης Υπογραφής</h3>
                <button
                  onClick={() => setShowConfirmSigningModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-blue-600 text-xl mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Επιβεβαίωση</h4>
                    <p className="text-sm text-blue-800">
                      Επιβεβαιώνετε ότι τα συμβολαία υπογράφηκαν επιτυχώς;
                    </p>
                    <p className="text-sm text-blue-800 mt-2 font-medium">
                      Το deal θα ολοκληρωθεί μόνο όταν και εσείς και ο αγοραστής επιβεβαιώσετε την ολοκλήρωση.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmSigningModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleConfirmSigningCompletion}
                  disabled={isConfirmingSigning}
                  className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isConfirmingSigning ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Αποθήκευση...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Επιβεβαίωση</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Agent view: role message + collapsible buyer/seller progress
  if (isAgentRole && !isBuyerRole) {
    const buyerProgress = isRent ? getBuyerRentProgressForSeller(deal) : getBuyerProgressForSeller(deal, undefined, sseEvents);
    const sellerProgress = isRent ? getSellerRentProgressForBuyer(deal) : getSellerProgressForBuyer(deal);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Επισκόπηση Συναλλαγής</h2>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <p className="text-gray-800 leading-relaxed">
              <strong>Ο σκοπός σας ως μεσίτης</strong> είναι η ολοκλήρωση της αγοραπωλησίας ώστε να λάβετε την προμήθειά σας (0,5% της συμφωνημένης τιμής).
            </p>
            <p className="text-gray-700 mt-3 leading-relaxed">
              Το μόνο που χρειάζεται να κάνετε είναι να παρακολουθείτε την <strong>πρόοδο της αγοραπωλησίας από όλες τις πλευρές</strong> — αγοραστή και πωλητή. Παρακάτω βλέπετε σε ποιο βήμα βρίσκεται κάθε πλευρά.
            </p>
          </div>
        </div>

        {/* Buyer steps - collapsible */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setAgentBuyerStepsOpen((prev) => !prev)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FaUser className="text-indigo-600" />
              Βήματα Αγοραστή
            </h3>
            <p className="text-sm text-gray-600">
              Βήμα {buyerProgress.currentStep} από {buyerProgress.steps.length}
            </p>
            <FaChevronDown className={`text-gray-400 transition-transform ${agentBuyerStepsOpen ? 'rotate-180' : ''}`} />
          </button>
          {agentBuyerStepsOpen && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-2">
              <ul className="space-y-2">
                {buyerProgress.steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    {s.completed ? (
                      <FaCheckCircle className="text-green-500 flex-shrink-0" />
                    ) : s.active ? (
                      <FaCircle className="text-indigo-500 text-xs flex-shrink-0" />
                    ) : (
                      <FaCircle className="text-gray-300 text-xs flex-shrink-0" />
                    )}
                    <span className={s.active ? 'font-semibold text-gray-900' : s.completed ? 'text-gray-600 line-through' : 'text-gray-400'}>
                      {s.id}. {s.title}
                    </span>
                    {s.active && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Τρέχον</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Seller steps - collapsible */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setAgentSellerStepsOpen((prev) => !prev)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FaHandshake className="text-green-600" />
              {isRent ? 'Βήματα Ιδιοκτήτη' : 'Βήματα Πωλητή'}
            </h3>
            <p className="text-sm text-gray-600">
              Βήμα {sellerProgress.currentStep} από {sellerProgress.totalSteps}
            </p>
            <FaChevronDown className={`text-gray-400 transition-transform ${agentSellerStepsOpen ? 'rotate-180' : ''}`} />
          </button>
          {agentSellerStepsOpen && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-2">
              <ul className="space-y-2">
                {sellerProgress.steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    {s.completed ? (
                      <FaCheckCircle className="text-green-500 flex-shrink-0" />
                    ) : s.active ? (
                      <FaCircle className="text-green-500 text-xs flex-shrink-0" />
                    ) : (
                      <FaCircle className="text-gray-300 text-xs flex-shrink-0" />
                    )}
                    <span className={s.active ? 'font-semibold text-gray-900' : s.completed ? 'text-gray-600 line-through' : 'text-gray-400'}>
                      {s.id}. {s.title}
                    </span>
                    {s.active && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Τρέχον</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For other non-buyers (e.g. lawyer) - show simple message
  if (!isBuyerRole) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ενέργειες</h2>
          <p className="text-gray-600">Οι επόμενες ενέργειες που πρέπει να εκτελέσεις</p>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <FaInfoCircle className="text-blue-500 text-4xl mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">Δεν έχετε πρόσβαση σε αυτή τη λειτουργία</p>
        </div>
      </div>
    );
  }

  const activeStepIndex = stepsToShow.findIndex(s => s.id === currentStepToShow);
  const completedSteps = stepsToShow.filter(s => s.status === 'completed');
  const activeStep = stepsToShow.find(s => s.id === currentStepToShow);

  // Calculate stats for overview cards
  const pendingRequests = deal.requests?.filter((r) => r.status === 'REQUESTED').length || 0;
  const acceptedProfessionals = deal.requests?.filter(
    (r) => r.status === 'ACCEPTED' && ['LAWYER', 'NOTARY', 'ENGINEER'].includes(r.type)
  ) || [];
  const acceptedProfessionalsCount = acceptedProfessionals.length;

  // Buyer: show only documents requested FROM buyer and their upload status
  // Others: show global deal room document stats
  const docsForStats = isBuyerRole
    ? (deal.documents?.filter((d) => d.requestedFromRole === 'BUYER') || [])
    : (deal.documents || []);
  const documentsRequested = docsForStats.filter((d) => d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED').length;
  const documentsApproved = docsForStats.filter((d) => d.status === 'UPLOADED' || d.status === 'APPROVED').length;
  const totalDocs = docsForStats.length;
  const upcomingAppointment = deal.appointments?.find(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Participants */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=professionals`)}
          className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl shadow-sm border border-blue-200 p-5 hover:shadow-md hover:border-blue-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Συμμετέχοντες</p>
              <p className="text-xl font-bold text-gray-900">
                {deal.participants?.length || 0}
              </p>
            </div>
            <FaUsers className="text-2xl text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>

        {/* Professionals - hidden for rent (no lawyer/notary) */}
        {!isRent && (
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=professionals`)}
          className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl shadow-sm border border-purple-200 p-5 hover:shadow-md hover:border-purple-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Επαγγελματίες</p>
              <p className="text-xl font-bold text-gray-900">
                {acceptedProfessionalsCount}
              </p>
              {pendingRequests > 0 && (
                <p className="text-xs text-orange-600 mt-0.5">{pendingRequests} σε αναμονή</p>
              )}
              {acceptedProfessionalsCount === 0 && (
                <p className="text-xs text-gray-500 mt-0.5">Κανένας</p>
              )}
            </div>
            <FaUserTie className="text-2xl text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
        )}

        {/* Documents */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
          className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl shadow-sm border border-green-200 p-5 hover:shadow-md hover:border-green-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Έγγραφα</p>
              <p className="text-xl font-bold text-gray-900">
                {totalDocs > 0 ? `${documentsApproved}/${totalDocs}` : '0'}
              </p>
              <div className="flex gap-1.5 mt-0.5 text-xs">
                {documentsApproved > 0 && (
                  <span className="text-green-600">✓ {documentsApproved}</span>
                )}
                {documentsRequested > 0 && (
                  <span className="text-orange-600">⏳ {documentsRequested}</span>
                )}
              </div>
            </div>
            <FaFileAlt className="text-2xl text-green-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>

        {/* Next Appointment */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
          className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl shadow-sm border border-indigo-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Επόμενο Ραντεβού</p>
              {upcomingAppointment ? (() => {
                const d = upcomingAppointment.startAt ? new Date(upcomingAppointment.startAt) : null;
                const valid = d && !isNaN(d.getTime());
                return valid ? (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Κανένα</p>
                );
              })() : (
                <p className="text-sm text-gray-500">Κανένα</p>
              )}
            </div>
            <FaCalendarAlt className="text-2xl text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>

      {/* Transaction Status */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
            <FaInfoCircle className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Κατάσταση Συναλλαγής</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Badge */}
          <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-3">
              {(deal.status === 'CLOSED_PROPERTY_SOLD' || deal.propertySoldToAnother) && isBuyerRole && (
                <>
                  <FaClock className="text-amber-600 text-xl" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">Μη διαθεσίμο</p>
                  </div>
                </>
              )}
              {deal.status === 'ACTIVE' && !deal.propertySoldToAnother && (
                <>
                  <FaClock className="text-blue-500 text-xl" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">Ενεργή</p>
                  </div>
                </>
              )}
              {deal.status === 'DRAFT' && !deal.propertySoldToAnother && (
                <>
                  <FaClock className={isBuyerRole ? 'text-blue-500 text-xl' : 'text-yellow-500 text-xl'} />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">{isBuyerRole ? 'Ενεργή' : 'Προσχέδιο'}</p>
                  </div>
                </>
              )}
              {deal.status === 'CLOSED' && (
                <>
                  <FaCheckCircle className="text-green-500 text-xl" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">Ολοκληρωμένη</p>
                  </div>
                </>
              )}
              {deal.status === 'CANCELLED' && (
                <>
                  <FaCheckCircle className="text-red-500 text-xl" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">Ακυρωμένη</p>
                  </div>
                </>
              )}
              {(deal.status === 'CLOSED_PROPERTY_SOLD' || deal.propertySoldToAnother) && !isBuyerRole && (
                <>
                  <FaClock className="text-amber-600 text-xl" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Κατάσταση</p>
                    <p className="font-bold text-gray-900">Ακίνητο πουλήθηκε</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Created Date */}
          <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <FaCalendarAlt className="text-indigo-500 text-xl" />
              <div>
                <p className="text-xs text-gray-600 mb-0.5">Δημιουργήθηκε</p>
                <p className="font-bold text-gray-900 text-sm">
                  {new Date(deal.createdAt).toLocaleDateString('el-GR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer's Purchase/Rent Guide - Collapsible */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={toggleBuyerGuide}
          className="w-full flex items-center justify-between gap-3 text-left p-4 hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isRent ? 'Οδηγός Ενοικίασης Ακινήτου' : 'Οδηγός Αγοράς Ακινήτου'}
            </h2>
            <p className="text-gray-600 text-sm mt-0.5">
              {isRent ? 'Ακολουθήστε τα βήματα για να ολοκληρώσετε την ενοικίαση' : 'Ακολουθήστε τα βήματα για να ολοκληρώσετε την αγορά'}
            </p>
          </div>
          {buyerGuideOpen ? (
            <FaChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
          ) : (
            <FaChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
        </button>
        {buyerGuideOpen && (
        <div className="px-4 pb-4 space-y-4">
      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Πρόοδος</span>
          <span className="text-sm font-bold text-blue-600">
            {completedSteps.length} / {stepsToShow.length} βήματα
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`bg-gradient-to-r ${accentGradient} h-2.5 rounded-full transition-all duration-500`}
            style={{ width: `${(completedSteps.length / stepsToShow.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {stepsToShow.map((step, index) => {
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';
          const isPending = step.status === 'pending';
          const isSkipped = step.status === 'skipped';

          // DEPOSIT_PAYMENT: When waiting for basic docs approval, show "upload docs first" content
          const basicDocsApproved = !isRent && isBasicDocumentsApproved();
          const displayStep = !isRent && step.id === 'DEPOSIT_PAYMENT' && !basicDocsApproved
            ? {
                ...step,
                title: 'Βήμα 5: Προκαταβολή & Ιδιωτικό Συμφωνητικό',
                description: 'Πρώτα ανεβάστε τα βασικά σας έγγραφα (ταυτότητα, ΑΦΜ κλπ) στο tab "Έγγραφα". Ο δικηγόρος σας θα τα ελέγξει και όταν τα εγκρίνει, θα μπορείτε να πληρώσετε την προκαταβολή και να υπογράψετε το ιδιωτικό συμφωνητικό.',
                instructions: [
                  'Πηγαίνετε στο tab "Έγγραφα"',
                  'Ανεβάστε τα βασικά έγγραφα που σας ζήτησε ο δικηγόρος (ταυτότητα, ΑΦΜ κλπ)',
                  'Περιμένετε τον δικηγόρο σας να εγκρίνει τα έγγραφα',
                  'Μόλις εγκριθούν, θα εμφανιστεί το κουμπί πληρωμής προκαταβολής'
                ],
                actionLabel: 'Δείτε Έγγραφα',
                action: () => router.push(`/deals/${deal.id}?tab=documents`)
              }
            : step;

          return (
            <div
              key={step.id}
              className={`rounded-xl border-2 p-6 transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : isCompleted
                  ? 'border-green-300 bg-green-50'
                  : isSkipped
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step Number */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : isSkipped
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? <FaCheckCircle /> : index + 1}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-lg font-bold ${
                      isActive ? 'text-blue-900' : 
                      isCompleted ? 'text-green-900' : 
                      'text-gray-700'
                    }`}>
                      {displayStep.title}
                    </h3>
                    {isCompleted && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                        ΟΛΟΚΛΗΡΩΘΗΚΕ
                      </span>
                    )}
                    {isActive && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        ΤΡΕΧΟΝ ΒΗΜΑ
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        ΠΑΡΑΛΕΙΦΘΗΚΕ
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">{displayStep.description}</p>

                  {/* Instructions */}
                  {displayStep.instructions && displayStep.instructions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaInfoCircle className="text-blue-500" />
                        Πώς να προχωρήσετε:
                      </h4>
                      <ul className="space-y-2">
                        {displayStep.instructions.map((instruction, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <FaCircle className="text-[6px] text-blue-500 mt-2 flex-shrink-0" />
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Waiting Message for RENT_COMPLETION when buyer confirmed, waiting for seller */}
                  {(step.id === 'RENT_COMPLETION' && isActive && (deal.rentCompletionMetadata as any)?.buyerCompletionConfirmedAt && !(deal.rentCompletionMetadata as any)?.sellerCompletionConfirmedAt) && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <FaClock className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-900">Αναμονή επιβεβαίωσης από τον ιδιοκτήτη</p>
                          <p className="text-sm text-amber-800 mt-1">Έχετε επιβεβαιώσει την ολοκλήρωση. Το Deal θα κλείσει μόλις ο ιδιοκτήτης πατήσει επίσης την επιβεβαίωση.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Waiting Message for Step 9 */}
                  {(step.id === 'CONFIRM_SIGNING_COMPLETION' && (isCompleted || isActive) && deal.buyerSigningConfirmed && !deal.sellerSigningConfirmed) && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <FaClock className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-1">Αναμονή</h4>
                          <p className="text-sm text-yellow-800">
                            {isRent 
                              ? 'Έχετε επιβεβαιώσει την ολοκλήρωση. Περιμένετε τον ιδιοκτήτη να επιβεβαιώσει την ολοκλήρωση για να ολοκληρωθεί το deal.'
                              : 'Έχετε επιβεβαιώσει την ολοκλήρωση της υπογραφής. Περιμένετε τον πωλητή να επιβεβαιώσει την ολοκλήρωση για να ολοκληρωθεί το deal.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 9: Confirmed signing appointment (inline, no modal button) */}
                  {step.id === 'FINAL_SIGNING' && (() => {
                    const signingApt = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
                    const aptEndPassed = signingApt && new Date(signingApt.endAt) <= new Date();
                    if (!signingApt || !isActive || aptEndPassed) return null;
                    return (
                      <div className="mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
                          <FaCalendarAlt className="text-green-600 text-xl flex-shrink-0" />
                          <div>
                            <p className="font-medium text-green-900">
                              Επιβεβαιωμένο ραντεβού υπογραφής
                            </p>
                            <p className="text-sm text-green-800 flex items-center gap-2 mt-1">
                              <FaClock className="text-green-600" />
                              {format(new Date(signingApt.startAt), 'EEEE d MMMM yyyy, HH:mm', { locale: el })} – {format(new Date(signingApt.endAt), 'HH:mm', { locale: el })}
                            </p>
                            {(signingApt as { location?: string }).location && (
                              <p className="text-sm text-green-700 mt-1">{(signingApt as { location?: string }).location}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const startAt = new Date(signingApt.startAt);
                            const hoursUntil = (startAt.getTime() - Date.now()) / (1000 * 60 * 60);
                            if (hoursUntil <= 24) {
                              toast.error('Δεν μπορείτε να ακυρώσετε το ραντεβού λιγότερο από 24 ώρες πριν.');
                              return;
                            }
                            if (!confirm('Θέλετε σίγουρα να ακυρώσετε το ραντεβού υπογραφής; Ο πωλητής και ο συμβολαιογράφος θα ενημερωθούν.')) return;
                            setIsCancellingAppointment(true);
                            fetchFromBackend(`/appointments/${signingApt.id}/cancel`, { method: 'POST' })
                              .then(async (res) => {
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || 'Σφάλμα');
                                }
                                toast.success('Το ραντεβού ακυρώθηκε.');
                                onRefresh();
                              })
                              .catch((err: any) => toast.error(err.message || 'Σφάλμα'))
                              .finally(() => setIsCancellingAppointment(false));
                          }}
                          disabled={isCancellingAppointment}
                          className="mt-2 text-sm text-gray-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50"
                        >
                          {isCancellingAppointment ? 'Ακύρωση...' : 'Ακύρωση ραντεβού'}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Rent Step 2: Three options when no decision yet */}
                  {isActive && step.id === 'RENT_OFFER' && rentInterestDecision === null && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-medium text-gray-600">Επιλέξτε πώς θέλετε να προχωρήσετε:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleRentInterestDecision('continue')}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${accentGradient} text-white text-sm font-medium rounded-lg ${accentHover} transition-all shadow-sm`}
                        >
                          <FaCheck className="text-sm" />
                          Επιβεβαίωση Ενδιαφέροντος
                        </button>
                        <button
                          onClick={() => handleRentInterestDecision('reschedule')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-all shadow-sm"
                        >
                          <FaCalendarAlt className="text-sm" />
                          Ξανακανονίζω Ραντεβού
                        </button>
                        <button
                          onClick={() => handleRentInterestDecision('cancel')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all"
                        >
                          <FaTimes className="text-sm" />
                          Ακύρωση Ενδιαφέροντος
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rent Step 5: Three states - Αναμονή, Έτοιμο προς Υπογραφή, Ολοκλήρωση */}
                  {isActive && step.id === 'RENT_CONTRACT' && isRent && isBuyerRole && (() => {
                    const effectiveSigningMethod = rentContractSigningMethod ?? (typeof window !== 'undefined' ? sessionStorage.getItem(`rentContractSigningMethod_${deal.id}`) as 'electronic' | 'in-person' | null : null);
                    const docs = rentContractDocuments.length > 0 ? rentContractDocuments : (deal.documents || []);
                    const isContractDraftCategory = (cat?: string) => {
                      const n = (cat || '').toLowerCase();
                      return (n.includes('συμβολαι') || n.includes('μισθωτ') || n.includes('συμφωνητ') || n.includes('contract_draft')) && !n.includes('υπογεγραμ');
                    };
                    const contractDraft = docs.find((d: { category?: string; status?: string; fileName?: string; id: string }) => isContractDraftCategory(d.category) && (d.status === 'UPLOADED' || d.status === 'APPROVED') && d.fileName);
                    const signedUploaded = docs.some((d: { category?: string; status?: string }) => (d.category || '').toLowerCase().includes('υπογεγραμ') && (d.status === 'UPLOADED' || d.status === 'APPROVED'));

                    if (effectiveSigningMethod === 'in-person') {
                      return (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm text-gray-600">Έχετε επιλέξει υπογραφή δια ζώσης. Κανονίστε ημερομηνία με τον ιδιοκτήτη μέσω της πλατφόρμας.</p>
                          <button onClick={() => setShowRentContractModal(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            Άνοιγμα Ραντεβού Υπογραφής
                            <FaArrowRight />
                          </button>
                        </div>
                      );
                    }

                    if (!effectiveSigningMethod) {
                      return (
                        <div className="space-y-4 mt-4">
                          <p className="text-sm text-gray-600">Επιλέξτε πώς θέλετε να υπογράψετε το συμβόλαιο.</p>
                          <button onClick={() => setShowRentContractModal(true)} className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover}`}>
                            Επιλογή Τρόπου Υπογραφής
                            <FaArrowRight />
                          </button>
                        </div>
                      );
                    }

                    if (signedUploaded) {
                      return (
                        <div className="space-y-4 mt-4">
                          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                              <FaCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-green-900 mb-1">Το υπογεγραμμένο συμφωνητικό στάλθηκε επιτυχώς!</h4>
                                <p className="text-sm text-green-800">
                                  Αναμένουμε την τελική υπογραφή/επιβεβαίωση από τον ιδιοκτήτη.
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                              setShowRentContractModal(false);
                              setRentContractSigningMethod(null);
                              onRefresh();
                              toast.success('Το βήμα ολοκληρώθηκε.');
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                          >
                            <FaCheckCircle /> Ολοκλήρωση Βήματος
                          </button>
                        </div>
                      );
                    }

                    if (!contractDraft) {
                      return (
                        <div className="space-y-4 mt-4">
                          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                              <FaInfoCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-yellow-900 mb-1">Αναμονή PDF από ιδιοκτήτη</h4>
                                <p className="text-sm text-yellow-800">
                                  Ο ιδιοκτήτης θα ανεβάσει το προσχέδιο στο tab &quot;Έγγραφα & Ενέργειες&quot;. Ελέγξτε εκεί ή ανανεώστε.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => router.push(`/deals/${deal.id}?tab=documents`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                              Μετάβαση στα Έγγραφα
                            </button>
                            <button onClick={() => listDocuments(deal.id).then(setRentContractDocuments)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
                              Ανανέωση
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-5 mt-4">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                          <h4 className="font-bold text-blue-900 mb-1">Το Συμφωνητικό είναι Έτοιμο!</h4>
                          <p className="text-sm text-blue-800 mb-4">
                            Ο ιδιοκτήτης ανέβασε το προσχέδιο. Ακολουθήστε τα παρακάτω 3 βήματα για να το υπογράψετε ψηφιακά:
                          </p>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                              <div>
                                <p className="font-medium text-gray-900">Κατεβάστε και διαβάστε το PDF.</p>
                                <button
                                  onClick={() => downloadDocument(contractDraft.id, contractDraft.fileName)}
                                  className="inline-flex items-center gap-2 mt-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                  <FaDownload /> Λήψη Προσχεδίου
                                </button>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                              <div>
                                <p className="font-medium text-gray-900">Μεταβείτε στο Gov.gr, συνδεθείτε με TaxisNet, και ανεβάστε το PDF για την ψηφιακή υπογραφή.</p>
                                <a
                                  href="https://docs.gov.gr"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                >
                                  <FaExternalLinkAlt /> Μετάβαση στο docs.gov.gr
                                </a>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                              <div>
                                <p className="font-medium text-gray-900">Ανεβάστε το τελικό υπογεγραμμένο αρχείο (που σας έδωσε το gov.gr).</p>
                                <div className="mt-2">
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setRentContractUploading(true);
                                      try {
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        fd.append('category', 'Υπογεγραμμένο Μισθωτήριο Συμφωνητικό');
                                        await uploadDocument(deal.id, fd);
                                        toast.success('Το έγγραφο ανέβηκε επιτυχώς.');
                                        const docs2 = await listDocuments(deal.id);
                                        setRentContractDocuments(docs2);
                                        onRefresh();
                                      } catch (err: any) {
                                        toast.error(err?.message || 'Σφάλμα ανεβάσματος');
                                      } finally {
                                        setRentContractUploading(false);
                                        e.target.value = '';
                                      }
                                    }}
                                    disabled={rentContractUploading}
                                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  />
                                  {rentContractUploading && <p className="text-sm text-gray-500 mt-1">Ανεβάζεται...</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setShowRentContractModal(true)} className="text-sm text-gray-500 hover:text-blue-600 underline">
                          Ή ανοίξτε το πλήρες παράθυρο υπογραφής
                        </button>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  {isActive && (step.id === 'VIEWING_APPOINTMENT' || step.id === 'RENT_VIEWING') && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {step.actionLabel && (
                        <button
                          onClick={step.action}
                          className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all duration-200 shadow-md hover:shadow-lg`}
                        >
                          {step.actionLabel}
                          <FaArrowRight />
                        </button>
                      )}
                      <button
                        onClick={handleSkipStep1}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Επόμενο Βήμα
                        <FaArrowRight />
                      </button>
                    </div>
                  )}
                  {isActive && step.id !== 'VIEWING_APPOINTMENT' && step.id !== 'RENT_VIEWING' && step.id !== 'RENT_CONTRACT' && step.actionLabel && (
                    step.id === 'RENT_COMPLETION' && (deal.rentCompletionMetadata as any)?.buyerCompletionConfirmedAt && !(deal.rentCompletionMetadata as any)?.sellerCompletionConfirmedAt ? (
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-800 rounded-lg font-medium">
                        Αναμονή επιβεβαίωσης από τον ιδιοκτήτη
                      </div>
                    ) : (
                      <button
                        onClick={() => step.action?.()}
                        disabled={step.id === 'RENT_COMPLETION' && isConfirmingRentCompletion}
                        className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {step.id === 'RENT_COMPLETION' && isConfirmingRentCompletion ? 'Αποστολή...' : step.actionLabel}
                        <FaArrowRight />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </div>
        )}
      </div>

      {/* Seller Progress - for buyer to see where seller is (sale or rent), collapsible */}
      {isBuyerRole && (() => {
        const sellerProgress = isRent ? getSellerRentProgressForBuyer(deal) : getSellerProgressForBuyer(deal);
        return (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200 overflow-hidden">
            <button
              type="button"
              onClick={toggleSellerProgress}
              className="w-full flex items-center justify-between gap-3 text-left p-4 hover:bg-emerald-100/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <FaInfoCircle className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isRent ? 'Πρόοδος Ιδιοκτήτη' : 'Πρόοδος Πωλητή'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {sellerProgress.completedSteps >= sellerProgress.totalSteps
                      ? (isRent ? 'Ο ιδιοκτήτης ολοκλήρωσε τα βήματα' : 'Ο πωλητής ολοκλήρωσε τα βήματα')
                      : `${isRent ? 'Ο ιδιοκτήτης' : 'Ο πωλητής'} βρίσκεται στο Βήμα ${Math.min(sellerProgress.currentStep, sellerProgress.totalSteps)} από ${sellerProgress.totalSteps}`}
                  </p>
                </div>
              </div>
              {sellerProgressOpen ? (
                <FaChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
              ) : (
                <FaChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
              )}
            </button>
            {sellerProgressOpen && (
            <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              {sellerProgress.steps.map((stage, index) => {
                const isCompleted = stage.completed;
                const isActive = stage.active;
                return (
                  <div
                    key={stage.id}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all
                      ${isActive
                        ? 'bg-white border-emerald-500 shadow-sm'
                        : isCompleted
                        ? 'bg-white/80 border-emerald-300'
                        : 'bg-gray-50/50 border-gray-200 opacity-75'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
                          ${isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-300 text-gray-500'
                          }
                        `}
                      >
                        {isCompleted ? <FaCheckCircle className="text-sm" /> : stage.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm ${isActive ? 'text-emerald-900' : isCompleted ? 'text-emerald-800' : 'text-gray-500'}`}>
                          {stage.title}
                        </h3>
                        <p className={`text-xs ${isActive ? 'text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {stage.description}
                        </p>
                      </div>
                      {(isCompleted || isActive) && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-200 text-emerald-800'}`}>
                          {isCompleted ? 'Ολοκληρώθηκε' : 'Τρέχον'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-white/80 rounded-lg border border-emerald-200">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-emerald-900">Πρόοδος</span>
                <span className="text-sm font-bold text-emerald-700">
                  {Math.round((sellerProgress.completedSteps / sellerProgress.totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-emerald-200 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(sellerProgress.completedSteps / sellerProgress.totalSteps) * 100}%` }}
                />
              </div>
            </div>
            </div>
            )}
          </div>
        );
      })()}

      {/* Skip Step 1 Confirmation Modal */}
      {showSkipStep1Modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση</h3>
              <button
                onClick={() => setShowSkipStep1Modal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              {isRent
                ? 'Θέλετε να προχωρήσετε στο βήμα 2 (Επιβεβαίωση Ενδιαφέροντος & Προσφορά) χωρίς να έχετε κλείσει ραντεβού;'
                : 'Είστε σίγουρος/η ότι θέλετε να προχωρήσετε στο βήμα 2 (Επιβεβαίωση Ενδιαφέροντος) χωρίς να έχετε κλείσει ραντεβού;'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipStep1Modal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Ακύρωση
              </button>
              <button
                onClick={confirmSkipStep1}
                className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all`}
              >
                Ναι, Προχώρησε
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interest Confirmation Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Ενδιαφέροντος</h3>
              <button
                onClick={() => setShowInterestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Μετά το ραντεβού, πώς θέλετε να προχωρήσετε;
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleConfirmInterest('continue')}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} transition-all shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                <FaCheck className="text-xl" /> 
                <span className="text-base">Θέλω να προχωρήσω με τη συναλλαγή</span>
              </button>
              <button
                onClick={() => handleConfirmInterest('reschedule')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FaCalendarAlt className="text-xl" /> 
                <span className="text-base">Θέλω να κλείσω άλλο ραντεβού</span>
              </button>
              <button
                onClick={() => handleConfirmInterest('cancel')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FaTimes className="text-xl" /> 
                <span className="text-base">Δεν ενδιαφέρομαι να προχωρήσω</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm deal cancellation from Step 2 */}
      {showCancelDealConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTimes className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-3">Επιβεβαίωση Ακύρωσης</h3>
            <p className="text-gray-600 text-center mb-2">
              Είστε σίγουρος ότι θέλετε να ακυρώσετε τη συναλλαγή για το ακίνητο
            </p>
            <p className="text-gray-900 font-semibold text-center mb-6">
              &quot;{deal.property?.title || 'Ακίνητο'}&quot;
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDealLikeHeader}
                disabled={cancelDealLoading}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelDealLoading ? 'Ακύρωση...' : 'Ναι, ακύρωση'}
              </button>
              <button
                onClick={() => setShowCancelDealConfirmModal(false)}
                disabled={cancelDealLoading}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Άκυρο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buyer Offer Modal */}
      {showBuyerOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto overflow-x-hidden p-0 animate-slideUp">
            {/* Header */}
            <div className={`bg-gradient-to-r ${accentGradient} px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <FaEuroSign className="text-white text-base" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {buyerOfferSubmitted ? 'Προσφορά Στάλθηκε' : isRent ? 'Κάνε Προσφορά για Ενοικίαση' : 'Κάνε Προσφορά'}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    {buyerOfferSubmitted ? 'Η προσφορά σας έχει αποσταλεί' : isRent ? 'Στείλε την προσφορά σου στον ιδιοκτήτη ή αποδέξου την αρχική τιμή' : 'Στείλε την προσφορά σου στον πωλητή'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBuyerOfferModal(false);
                  setBuyerOfferAmount('');
                  setBuyerOfferMessage('');
                  setShowOfferConfirmation(false);
                  setBuyerOfferSubmitted(false);
                  setShowBuyerCounterForm(false);
                }}
                className="text-white/90 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                aria-label="Κλείσιμο"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(() => {
                const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
                const latestOffer = deal.offers?.length
                  ? [...deal.offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                  : undefined;
                const latestIsBuyerPending = latestOffer?.role === 'BUYER' && latestOffer?.status === 'PENDING';
                const latestIsSellerPending = latestOffer?.role === 'SELLER' && latestOffer?.status === 'PENDING';

                if (latestIsBuyerPending && !hasAcceptedOffer) {
                  const hasSellerOffer = deal.offers?.some(o => o.role === 'SELLER');
                  return (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                        <FaCheckCircle className="text-emerald-500 text-4xl mx-auto mb-3" />
                        <p className="text-sm font-medium text-emerald-800 mb-1">
                          {hasSellerOffer ? 'Η αντιπρότασή σας' : 'Η προσφορά σας'}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          €{Number(latestOffer.amount).toLocaleString('el-GR')}
                        </p>
                        {latestOffer.message && (
                          <p className="text-sm text-emerald-800 mt-2 p-2 bg-white rounded border border-emerald-100">{latestOffer.message}</p>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm text-center">
                        Αναμένετε την απάντηση του πωλητή. Θα ενημερωθείτε όταν ο πωλητής απαντήσει.
                      </p>
                      <button
                        onClick={() => {
                          setShowBuyerOfferModal(false);
                          setBuyerOfferAmount('');
                          setBuyerOfferMessage('');
                          setShowOfferConfirmation(false);
                          setBuyerOfferSubmitted(false);
                          setShowBuyerCounterForm(false);
                          onRefresh();
                        }}
                        className={`w-full px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} transition-all`}
                      >
                        Κατάλαβα
                      </button>
                    </div>
                  );
                }
                if (latestIsSellerPending && !hasAcceptedOffer) {
                  const pendingSellerOffer = latestOffer!;
                  const listingPrice = deal.property?.price ? Math.round(Number(deal.property.price)) : 0;
                  if (showBuyerCounterForm) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-sm font-medium text-amber-800 mb-1">Αντιπρόταση πωλητή</p>
                          <p className="text-2xl font-bold text-gray-900">
                            €{Number(pendingSellerOffer.amount).toLocaleString('el-GR')}
                          </p>
                          {pendingSellerOffer.message && (
                            <p className="text-sm text-amber-800 mt-2 p-2 bg-white rounded border border-amber-100">{pendingSellerOffer.message}</p>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">Στείλτε νέα προσφορά/αντιπρόταση στον πωλητή.</p>
                        {listingPrice > 0 ? (
                          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                            <OfferPriceSlider
                              listingPrice={listingPrice}
                              value={buyerOfferAmount ? parseFloat(buyerOfferAmount) : Math.round(Number(pendingSellerOffer.amount))}
                              onChange={(v) => setBuyerOfferAmount(String(Math.round(v)))}
                              disabled={isSubmittingBuyerOffer}
                            />
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={buyerOfferAmount}
                            onChange={(e) => setBuyerOfferAmount(e.target.value)}
                            placeholder="π.χ. 150000"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                          />
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Σχόλια (προαιρετικό)</label>
                          <textarea
                            value={buyerOfferMessage}
                            onChange={(e) => setBuyerOfferMessage(e.target.value)}
                            placeholder="Προσθήκετε σχόλια..."
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowBuyerCounterForm(false);
                              setBuyerOfferAmount(String(Math.round(Number(pendingSellerOffer.amount))));
                              setBuyerOfferMessage('');
                            }}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200"
                          >
                            Πίσω
                          </button>
                          <button
                            onClick={async () => {
                              const amount = parseFloat(buyerOfferAmount);
                              if (!amount || amount <= 0) {
                                toast.error('Εισάγετε έγκυρο ποσό');
                                return;
                              }
                              setIsSubmittingBuyerOffer(true);
                              try {
                                const response = await fetchFromBackend(`/deals/${deal.id}/offers`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ amount, message: buyerOfferMessage || undefined, role: 'BUYER' }),
                                });
                                if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Σφάλμα');
                                toast.success('Η αντιπρότασή σας στάλθηκε');
                                setShowBuyerCounterForm(false);
                                setBuyerOfferAmount('');
                                setBuyerOfferMessage('');
                                onRefresh();
                              } catch (e: unknown) {
                                toast.error(e instanceof Error ? e.message : 'Σφάλμα');
                              } finally {
                                setIsSubmittingBuyerOffer(false);
                              }
                            }}
                            disabled={isSubmittingBuyerOffer || !buyerOfferAmount}
                            className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} disabled:opacity-50 flex items-center justify-center gap-2`}
                          >
                            {isSubmittingBuyerOffer ? <><FaSpinner className="animate-spin" /> ...</> : <>Στείλτε Αντιπρόταση</>}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-amber-800 mb-1">Αντιπρόταση πωλητή</p>
                        <p className="text-2xl font-bold text-gray-900">
                          €{Number(pendingSellerOffer.amount).toLocaleString('el-GR')}
                        </p>
                        {pendingSellerOffer.message && (
                          <p className="text-sm text-amber-800 mt-2 p-2 bg-white rounded border border-amber-100">{pendingSellerOffer.message}</p>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">Ο πωλητής σας έστειλε αντιπρόταση. Μπορείτε να την αποδεχτείτε, να την απορρίψετε ή να στείλετε νέα αντιπρόταση.</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={async () => {
                            setIsRejectingSellerOffer(true);
                            try {
                              const response = await fetchFromBackend(`/deals/${deal.id}/offers/${pendingSellerOffer.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'REJECTED' }),
                              });
                              if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error);
                              toast.success('Η αντιπρόταση απορρίφθηκε');
                              onRefresh();
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : 'Σφάλμα');
                            } finally {
                              setIsRejectingSellerOffer(false);
                            }
                          }}
                          disabled={isAcceptingSellerOffer || isRejectingSellerOffer}
                          className="flex-1 min-w-[100px] px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50"
                        >
                          {isRejectingSellerOffer ? <><FaSpinner className="animate-spin" /> ...</> : 'Απόρριψη'}
                        </button>
                        <button
                          onClick={() => {
                            setShowBuyerCounterForm(true);
                            setBuyerOfferAmount(String(Math.round(Number(pendingSellerOffer.amount))));
                            setBuyerOfferMessage('');
                          }}
                          disabled={isAcceptingSellerOffer || isRejectingSellerOffer}
                          className={`flex-1 min-w-[100px] px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} disabled:opacity-50 flex items-center justify-center gap-2`}
                        >
                          Αντιπρόταση
                        </button>
                        <button
                          onClick={async () => {
                            setIsAcceptingSellerOffer(true);
                            try {
                              const response = await fetchFromBackend(`/deals/${deal.id}/offers/${pendingSellerOffer.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'ACCEPTED' }),
                              });
                              if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error);
                              toast.success('Η τιμή συμφωνήθηκε');
                              onRefresh();
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : 'Σφάλμα');
                            } finally {
                              setIsAcceptingSellerOffer(false);
                            }
                          }}
                          disabled={isAcceptingSellerOffer || isRejectingSellerOffer}
                          className="flex-1 min-w-[100px] px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isAcceptingSellerOffer ? <><FaSpinner className="animate-spin" /> ...</> : <><FaCheckCircle /> Αποδοχή</>}
                        </button>
                      </div>
                    </div>
                  );
                }
                if (showOfferConfirmation) {
                  return (
                    <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-gray-800 font-medium mb-2">Επιβεβαίωση αποστολής</p>
                    <p className="text-xl font-bold text-gray-900 mb-1">
                      €{Number(buyerOfferAmount).toLocaleString('el-GR')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Θέλετε να στείλετε αυτή την προσφορά στον πωλητή;
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowOfferConfirmation(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Ακύρωση
                    </button>
                    <button
                      onClick={async () => {
                        const amount = parseFloat(buyerOfferAmount);
                        if (!amount || amount <= 0) return;
                        setIsSubmittingBuyerOffer(true);
                        try {
                          const response = await fetchFromBackend(`/deals/${deal.id}/offers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount,
                              message: buyerOfferMessage || undefined,
                              role: 'BUYER',
                            }),
                          });
                          if (!response.ok) {
                            const err = await response.json().catch(() => ({}));
                            throw new Error(err.error || 'Σφάλμα κατά την αποστολή');
                          }
                          toast.success('Η προσφορά στάλθηκε επιτυχώς');
                          setShowOfferConfirmation(false);
                          setBuyerOfferSubmitted(true);
                          onRefresh();
                        } catch (error: unknown) {
                          toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την αποστολή');
                        } finally {
                          setIsSubmittingBuyerOffer(false);
                        }
                      }}
                      disabled={isSubmittingBuyerOffer}
                      className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg`}
                    >
                      {isSubmittingBuyerOffer ? <><FaSpinner className="animate-spin" /> Αποστολή...</> : <>Ναι, Στείλτε</>}
                    </button>
                  </div>
                </div>
                  );
                }
                /* Form state */
                return (
                  <>
                  {deal.property?.price && (
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-medium text-gray-600">{isRent ? 'Τιμή ενοικίου ανά μήνα' : 'Τιμή αγγελίας'}</span>
                      <span className="text-lg font-bold text-gray-900">€{Number(deal.property.price).toLocaleString('el-GR')}</span>
                    </div>
                  )}

                  {/* Accept listing price (rent only) - completes step immediately */}
                  {isRent && deal.property?.price && (
                    <button
                      onClick={async () => {
                        const amount = Math.round(Number(deal.property?.price));
                        if (!amount || amount <= 0) return;
                        setIsSubmittingBuyerOffer(true);
                        try {
                          const response = await fetchFromBackend(`/deals/${deal.id}/offers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount,
                              message: 'Αποδοχή αρχικής τιμής ενοικίου',
                              role: 'BUYER',
                            }),
                          });
                          if (!response.ok) {
                            const err = await response.json().catch(() => ({}));
                            throw new Error(err.error || 'Σφάλμα κατά την αποστολή');
                          }
                          toast.success('Αποδεχτήκατε την αρχική τιμή ενοικίου. Το βήμα ολοκληρώθηκε.');
                          setShowBuyerOfferModal(false);
                          setBuyerOfferAmount('');
                          setBuyerOfferMessage('');
                          setShowOfferConfirmation(false);
                          setBuyerOfferSubmitted(false);
                          onRefresh();
                        } catch (error: unknown) {
                          toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την αποστολή');
                        } finally {
                          setIsSubmittingBuyerOffer(false);
                        }
                      }}
                      disabled={isSubmittingBuyerOffer}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg mb-4"
                    >
                      <FaCheckCircle />
                      Αποδοχή αρχικής τιμής ενοικίου (€{Number(deal.property.price).toLocaleString('el-GR')}/μήνα)
                    </button>
                  )}

                  {deal.property?.price ? (
                    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-3 text-center">
                        Σύρετε για να επιλέξετε ποσό. Έγχρωμη ζώνη = πιθανότητα αποδοχής.
                      </p>
                      <OfferPriceSlider
                        listingPrice={Math.round(Number(deal.property.price))}
                        value={buyerOfferAmount ? parseFloat(buyerOfferAmount) : Math.round(Number(deal.property.price))}
                        onChange={(v) => setBuyerOfferAmount(String(Math.round(v)))}
                        disabled={isSubmittingBuyerOffer}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ποσό (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={buyerOfferAmount}
                        onChange={(e) => setBuyerOfferAmount(e.target.value)}
                        placeholder="π.χ. 150000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Σχόλια (προαιρετικό)</label>
                    <textarea
                      value={buyerOfferMessage}
                      onChange={(e) => setBuyerOfferMessage(e.target.value)}
                      placeholder="Προσθήκετε σχόλια για την προσφορά σας..."
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowBuyerOfferModal(false);
                        setBuyerOfferAmount('');
                        setBuyerOfferMessage('');
                      }}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Ακύρωση
                    </button>
                    <button
                      onClick={() => {
                        const amount = parseFloat(buyerOfferAmount);
                        if (!amount || amount <= 0) {
                          toast.error('Εισάγετε έγκυρο ποσό');
                          return;
                        }
                        setShowOfferConfirmation(true);
                      }}
                      disabled={isSubmittingBuyerOffer || !buyerOfferAmount}
                      className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-xl ${accentHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg`}
                    >
                      Στείλτε Προσφορά
                    </button>
                  </div>
                </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Signing Appointment Modal */}
      {showSigningAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className={`bg-gradient-to-r ${accentGradient} px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-white text-xl" />
                <h3 className="text-xl font-bold text-white">Κανονισμός Υπογραφής Συμβολαίων</h3>
              </div>
              <button
                onClick={() => setShowSigningAppointmentModal(false)}
                className="text-white hover:text-white hover:bg-blue-700/30 rounded-full p-2 transition-all"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingAvailability ? (
                <div className="text-center py-12">
                  <FaSpinner className="animate-spin text-5xl text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Φόρτωση διαθέσιμων ωρών...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Confirmed Appointment */}
                  {confirmedAppointment && (
                    <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <FaCheckCircle className="text-white text-lg" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">Ραντεβού Εγκεκριμένο</h4>
                          <p className="text-sm text-green-700 font-medium mb-4">
                            Το ραντεβού είναι προγραμματισμένο να γίνει:
                          </p>
                          <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
                            <div className="flex items-center gap-3">
                              <FaCalendarAlt className="text-green-600 text-lg" />
                              <div>
                                <span className="text-xs text-gray-500 block">Ημερομηνία</span>
                                <span className="font-semibold text-gray-900">
                                  {new Date(confirmedAppointment.startAt).toLocaleDateString('el-GR', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <FaClock className="text-green-600 text-lg" />
                              <div>
                                <span className="text-xs text-gray-500 block">Ώρα</span>
                                <span className="font-semibold text-gray-900">
                                  {new Date(confirmedAppointment.startAt).toLocaleTimeString('el-GR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} - {new Date(confirmedAppointment.endAt).toLocaleTimeString('el-GR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            {confirmedAppointment.location && (
                              <div className="flex items-center gap-3">
                                <FaHome className="text-green-600 text-lg" />
                                <div>
                                  <span className="text-xs text-gray-500 block">Τοποθεσία</span>
                                  <span className="font-semibold text-gray-900">{confirmedAppointment.location}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-green-200">
                            <button
                              onClick={() => setShowCancelAppointmentModal(true)}
                              className="w-full px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-all border border-red-200 flex items-center justify-center gap-2"
                            >
                              <FaTimes className="text-sm" />
                              Ακύρωση Ραντεβού
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Προτάσεις υπογραφής από πωλητή (εκτός συμβολαιογράφου) */}
                  {!confirmedAppointment && sellerSigningProposals.length > 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-white text-lg" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">Προτάσεις από τον πωλητή</h4>
                          <p className="text-sm text-amber-800 font-medium mb-4">
                            Ο πωλητής προτείνει ημερομηνία για την υπογραφή. Εγκρίνετε ή απορρίψτε — στη συνέχεια ο συμβολαιογράφος θα επιβεβαιώσει το ραντεβού.
                          </p>
                          {sellerSigningProposals.map((apt: any) => (
                            <div
                              key={apt.id}
                              className="bg-white rounded-lg p-4 border-2 border-amber-200 space-y-3 mb-3 last:mb-0"
                            >
                              <div className="flex items-center gap-3">
                                <FaCalendarAlt className="text-amber-600 text-lg" />
                                <div>
                                  <span className="text-xs text-gray-500 block">Ημερομηνία</span>
                                  <span className="font-semibold text-gray-900">
                                    {new Date(apt.startAt).toLocaleDateString('el-GR', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <FaClock className="text-amber-600 text-lg" />
                                <div>
                                  <span className="text-xs text-gray-500 block">Ώρα</span>
                                  <span className="font-semibold text-gray-900">
                                    {new Date(apt.startAt).toLocaleTimeString('el-GR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}{' '}
                                    –{' '}
                                    {new Date(apt.endAt).toLocaleTimeString('el-GR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                              {apt.buyerApprovedAt ? (
                                <div className="flex flex-wrap items-center gap-2 text-sm text-green-800">
                                  <FaCheckCircle className="text-green-600" />
                                  <span className="font-medium">Εγκρίνατε την πρόταση. Αναμονή για έγκριση από συμβολαιογράφο.</span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleBuyerApproveSellerProposalInModal(apt.id)}
                                    disabled={
                                      !!isBuyerApprovingSellerProposal ||
                                      !!isBuyerRejectingSellerProposal ||
                                      !!buyerRejectSellerProposalTargetId
                                    }
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {isBuyerApprovingSellerProposal === apt.id ? (
                                      <FaSpinner className="animate-spin" />
                                    ) : (
                                      <FaCheckCircle />
                                    )}
                                    Έγκριση
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBuyerRejectSellerProposalTargetId(apt.id)}
                                    disabled={
                                      !!isBuyerApprovingSellerProposal ||
                                      !!isBuyerRejectingSellerProposal ||
                                      !!buyerRejectSellerProposalTargetId
                                    }
                                    className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <FaTimes />
                                    Απόρριψη
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Requested Appointments */}
                  {requestedAppointments.length > 0 && !confirmedAppointment && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                          <FaClock className="text-white text-lg" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">Αίτημα σε Αναμονή</h4>
                          <p className="text-sm text-yellow-700 font-medium mb-4">
                            Έχετε στείλει αίτημα στον συμβολαιογράφο. Το αίτημα είναι σε αναμονή επιβεβαίωσης.
                          </p>
                          {requestedAppointments.map((apt: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-lg p-4 border-2 border-yellow-200 space-y-3">
                              <div className="flex items-center gap-3">
                                <FaCalendarAlt className="text-yellow-600 text-lg" />
                                <div>
                                  <span className="text-xs text-gray-500 block">Ημερομηνία</span>
                                  <span className="font-semibold text-gray-900">
                                    {new Date(apt.startAt).toLocaleDateString('el-GR', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <FaClock className="text-yellow-600 text-lg" />
                                <div>
                                  <span className="text-xs text-gray-500 block">Ώρα</span>
                                  <span className="font-semibold text-gray-900">
                                    {new Date(apt.startAt).toLocaleTimeString('el-GR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })} - {new Date(apt.endAt).toLocaleTimeString('el-GR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                              {apt.location && (
                                <div className="flex items-center gap-3">
                                  <FaHome className="text-yellow-600 text-lg" />
                                  <div>
                                    <span className="text-xs text-gray-500 block">Τοποθεσία</span>
                                    <span className="font-semibold text-gray-900">{apt.location}</span>
                                  </div>
                                </div>
                              )}
                              <div className="pt-2 border-t border-yellow-100">
                                {apt.sellerApprovedAt ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                      <FaCheckCircle className="text-xs" />
                                      Εγκρίθηκε από πωλητή
                                    </span>
                                    <p className="text-xs text-yellow-700 font-medium">
                                      Αναμένετε έγκριση από συμβολαιογράφο
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                      <FaClock className="text-xs" />
                                      Σε αναμονή επιβεβαίωσης
                                    </span>
                                    <p className="text-xs text-yellow-700 font-medium">
                                      Αναμένετε έγκριση από πωλητή και συμβολαιογράφο
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Slots */}
                  {availableSlots.length > 0 && !confirmedAppointment && requestedAppointments.length === 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-600" />
                        Διαθέσιμες Ώρες από Συμβολαιογράφο
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
                        {availableSlots.map((slot: any, index: number) => {
                          const slotDate = new Date(slot.startAt);
                          const isToday = slotDate.toDateString() === new Date().toDateString();
                          const isTomorrow = slotDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                          
                          return (
                            <button
                              key={index}
                              onClick={async () => {
                                setIsRequestingAppointment(true);
                                try {
                                  const notaryRequest = deal.requests?.find(
                                    r => r.status === 'ACCEPTED' && r.type === 'NOTARY'
                                  );
                                  if (!notaryRequest) {
                                    throw new Error('Δεν βρέθηκε αποδεκτή αίτηση συμβολαιογράφου');
                                  }

                                  // Ensure dates are ISO strings
                                  const startAt = slot.startAt instanceof Date 
                                    ? slot.startAt.toISOString() 
                                    : typeof slot.startAt === 'string' 
                                      ? slot.startAt 
                                      : new Date(slot.startAt).toISOString();
                                  
                                  const endAt = slot.endAt instanceof Date 
                                    ? slot.endAt.toISOString() 
                                    : typeof slot.endAt === 'string' 
                                      ? slot.endAt 
                                      : new Date(slot.endAt).toISOString();

                                  const requestBody = {
                                    professionalId: notaryRequest.professionalId,
                                    startAt,
                                    endAt,
                                    type: 'IN_PERSON',
                                    location: 'Γραφείο Συμβολαιογράφου',
                                  };

                                  console.log('[Appointment Request] Request body:', requestBody);

                                  const response = await fetchFromBackend(`/deals/${deal.id}/appointments/request`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(requestBody),
                                  });

                                  if (!response.ok) {
                                    let errorMessage = 'Σφάλμα κατά την αίτηση ραντεβού';
                                    try {
                                      const errorData = await response.json();
                                      errorMessage = errorData.error || errorData.message || errorMessage;
                                      console.error('[Appointment Request] Error response:', errorData);
                                    } catch (e) {
                                      const text = await response.text();
                                      console.error('[Appointment Request] Error response (text):', text);
                                      errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
                                    }
                                    throw new Error(errorMessage);
                                  }

                                  const result = await response.json();
                                  console.log('[Appointment Request] Success:', result);

                                  toast.success('Το αίτημα στάλθηκε στον συμβολαιογράφο. Περιμένετε την επιβεβαίωση.');
                                  notifyDealSigningAppointmentsChanged(deal.id);
                                  setShowSigningAppointmentModal(false);
                                  onRefresh();
                                } catch (error: any) {
                                  console.error('[Appointment Request] Exception:', error);
                                  toast.error(error.message || 'Σφάλμα κατά την αίτηση ραντεβού');
                                } finally {
                                  setIsRequestingAppointment(false);
                                }
                              }}
                              disabled={isRequestingAppointment}
                              className="group text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="mb-2">
                                {isToday && (
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded mb-2">
                                    Σήμερα
                                  </span>
                                )}
                                {isTomorrow && (
                                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded mb-2">
                                    Αύριο
                                  </span>
                                )}
                                {!isToday && !isTomorrow && (
                                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded mb-2">
                                    {slotDate.toLocaleDateString('el-GR', { weekday: 'short' })}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-gray-900 text-sm mb-1">
                                {slotDate.toLocaleDateString('el-GR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <FaClock className="text-gray-400 text-sm" />
                                <span className="text-gray-700 text-sm font-medium">
                                  {slotDate.toLocaleTimeString('el-GR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} - {new Date(slot.endAt).toLocaleTimeString('el-GR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Proposal */}
                  {!confirmedAppointment && requestedAppointments.length === 0 && (
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <FaInfoCircle className="text-gray-600" />
                        Προσφέρετε Δική σας Ημερομηνία
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                        {/* Date Selection */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Ημερομηνία <span className="text-red-500">*</span>
                          </label>
                          
                          {/* Date Input Button */}
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all text-left flex items-center justify-between"
                          >
                            <span className="text-gray-900 font-medium">
                              {customDate ? format(customDate, 'EEEE, d MMMM yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία'}
                            </span>
                            <FaCalendarAlt className="text-gray-500" />
                          </button>

                          {/* Calendar */}
                          {showDatePicker && (
                            <div className="mt-3 bg-white border-2 border-gray-200 rounded-xl p-4 shadow-lg">
                              {/* Calendar Header */}
                              <div className="flex items-center justify-between mb-4">
                                <button
                                  type="button"
                                  onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FaChevronLeft className="text-gray-600" />
                                </button>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <FaChevronRight className="text-gray-600" />
                                </button>
                              </div>

                              {/* Calendar Days Header */}
                              <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'].map((day, idx) => (
                                  <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-2">
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Calendar Days */}
                              <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                  const monthStart = startOfMonth(calendarMonth);
                                  const monthEnd = endOfMonth(calendarMonth);
                                  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                                  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                                  const days = eachDayOfInterval({ start: startDate, end: endDate });
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);

                                  return days.map((day, idx) => {
                                    const isPastDay = isPast(day) && !isToday(day);
                                    const isSelected = customDate && isSameDay(day, customDate);
                                    const isTodayDate = isToday(day);
                                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          if (!isPastDay) {
                                            const selectedDate = new Date(day);
                                            selectedDate.setHours(0, 0, 0, 0);
                                            setCustomDate(selectedDate);
                                            setShowDatePicker(false);
                                          }
                                        }}
                                        disabled={isPastDay}
                                        className={`
                                          aspect-square p-2 rounded-lg text-sm font-medium transition-all
                                          ${isPastDay
                                            ? 'text-gray-300 cursor-not-allowed opacity-50' 
                                            : 'hover:bg-blue-50 cursor-pointer'
                                          }
                                          ${isSelected 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : isTodayDate && !isPastDay
                                              ? 'bg-blue-100 text-blue-700 font-bold' 
                                              : !isCurrentMonth
                                                ? 'text-gray-400 opacity-50'
                                                : 'text-gray-700'
                                          }
                                        `}
                                      >
                                        {format(day, 'd')}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Quick Date Selection */}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Γρήγορες επιλογές:</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      setCustomDate(today);
                                      setCalendarMonth(today);
                                      setShowDatePicker(false);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-all"
                                  >
                                    Σήμερα
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const tomorrow = new Date();
                                      tomorrow.setDate(tomorrow.getDate() + 1);
                                      tomorrow.setHours(0, 0, 0, 0);
                                      setCustomDate(tomorrow);
                                      setCalendarMonth(tomorrow);
                                      setShowDatePicker(false);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all"
                                  >
                                    Αύριο
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Time Selection */}
                        {customDate && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Ώρα <span className="text-red-500">*</span>
                            </label>
                            
                            {/* Time Slots */}
                            <div className="grid grid-cols-3 gap-2">
                              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time) => {
                                const isSelected = customStartTime === time;
                                const [hours, minutes] = time.split(':').map(Number);
                                const slotDate = new Date(customDate);
                                slotDate.setHours(hours, minutes, 0, 0);
                                const isPastSlot = slotDate < new Date();

                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                      if (!isPastSlot) {
                                        setCustomStartTime(time);
                                        // Auto-set end time to 1 hour later
                                        const endHour = hours + 1;
                                        setCustomEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                                      }
                                    }}
                                    disabled={isPastSlot}
                                    className={`
                                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                                      ${isPastSlot
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : isSelected
                                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50'
                                      }
                                    `}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Time Inputs */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Ή εισάγετε προσαρμοσμένη ώρα:</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Ώρα Έναρξης
                                  </label>
                                  <input
                                    type="time"
                                    value={customStartTime}
                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Ώρα Λήξης
                                  </label>
                                  <input
                                    type="time"
                                    value={customEndTime}
                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            if (!customDate || !customStartTime || !customEndTime) {
                              toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
                              return;
                            }

                            setIsRequestingAppointment(true);
                            try {
                              const notaryRequest = deal.requests?.find(
                                r => r.status === 'ACCEPTED' && r.type === 'NOTARY'
                              );
                              if (!notaryRequest) {
                                throw new Error('Δεν βρέθηκε αποδεκτή αίτηση συμβολαιογράφου');
                              }

                              const start = new Date(customDate);
                              const [startHours, startMinutes] = customStartTime.split(':').map(Number);
                              start.setHours(startHours, startMinutes, 0, 0);

                              const end = new Date(customDate);
                              const [endHours, endMinutes] = customEndTime.split(':').map(Number);
                              end.setHours(endHours, endMinutes, 0, 0);

                              const requestBody = {
                                professionalId: notaryRequest.professionalId,
                                startAt: start.toISOString(),
                                endAt: end.toISOString(),
                                type: 'IN_PERSON',
                                location: 'Γραφείο Συμβολαιογράφου',
                                note: 'Πρόταση από αγοραστή',
                              };

                              console.log('[Custom Appointment Request] Request body:', requestBody);

                              const response = await fetchFromBackend(`/deals/${deal.id}/appointments/request`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(requestBody),
                              });

                              if (!response.ok) {
                                let errorMessage = 'Σφάλμα κατά την αίτηση ραντεβού';
                                try {
                                  const errorData = await response.json();
                                  errorMessage = errorData.error || errorData.message || errorMessage;
                                  console.error('[Custom Appointment Request] Error response:', errorData);
                                } catch (e) {
                                  const text = await response.text();
                                  console.error('[Custom Appointment Request] Error response (text):', text);
                                  errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
                                }
                                throw new Error(errorMessage);
                              }

                              const result = await response.json();
                              console.log('[Custom Appointment Request] Success:', result);

                              toast.success('Η πρόταση στάλθηκε στον συμβολαιογράφο. Περιμένετε την επιβεβαίωση.');
                              notifyDealSigningAppointmentsChanged(deal.id);
                              setShowSigningAppointmentModal(false);
                              setCustomDate(null);
                              setCustomStartTime('');
                              setCustomEndTime('');
                              setShowDatePicker(false);
                              onRefresh();
                            } catch (error: any) {
                              console.error('[Custom Appointment Request] Exception:', error);
                              toast.error(error.message || 'Σφάλμα κατά την αίτηση ραντεβού');
                            } finally {
                              setIsRequestingAppointment(false);
                            }
                          }}
                          disabled={isRequestingAppointment || !customDate || !customStartTime || !customEndTime}
                          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isRequestingAppointment ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              <span>Αποστέλλεται...</span>
                            </>
                          ) : (
                            <>
                              <FaArrowRight />
                              <span>Στείλετε Πρόταση</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {availableSlots.length === 0 && !confirmedAppointment && requestedAppointments.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FaInfoCircle className="text-5xl text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">Ο συμβολαιογράφος δεν έχει ορίσει διαθέσιμες ώρες ακόμα.</p>
                      <p className="text-sm text-gray-500 mt-2">Μπορείτε να προτείνετε δική σας ημερομηνία παρακάτω.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowSigningAppointmentModal(false)}
                className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Payment Modal */}
      {showDepositPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{isRent && isBuyerRole ? 'Πληρωμή Εγγύησης' : 'Πληρωμή Προκαταβολής'}</h3>
              <button
                onClick={() => setShowDepositPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {(() => {
              // Rent flow (buyer): simple confirmation - no lawyer approval check
              if (isRent && isBuyerRole) {
                return (
                  <>
                    <p className="text-gray-700 text-lg mb-6 text-center font-medium">
                      Επιβεβαιώστε ότι πληρώσατε την εγγύηση.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDepositPaymentModal(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-all"
                      >
                        Ακύρωση
                      </button>
                      <button
                        disabled={depositStepSubmitting}
                        onClick={async () => {
                          setDepositStepSubmitting(true);
                          try {
                            await completeBuyerDepositStep(deal.id);
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem(`depositPaymentClicked_${deal.id}`, 'true');
                            }
                            setShowDepositPaymentModal(false);
                            setDepositPaymentClicked(true);
                            onRefresh();
                            toast.success('Το βήμα 4 ολοκληρώθηκε. Μπορείτε να προχωρήσετε στο επόμενο βήμα.');
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Σφάλμα';
                            toast.error(msg);
                          } finally {
                            setDepositStepSubmitting(false);
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                      >
                        {depositStepSubmitting ? 'Αποθήκευση…' : 'Επιβεβαίωση'}
                      </button>
                    </div>
                  </>
                );
              }

              const basicDocumentsApproved = isBasicDocumentsApproved();

              if (!basicDocumentsApproved) {
                return (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <FaInfoCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-2">Αναμονή Επιβεβαίωσης</h4>
                          <p className="text-sm text-yellow-800">
                            Δεν μπορείτε να προχωρήσετε στην πληρωμή προκαταβολής αυτή τη στιγμή.
                          </p>
                          <p className="text-sm text-yellow-800 mt-2">
                            <strong>Πρέπει να περιμένετε τον δικηγόρο να επιβεβαιώσει τα βασικά έγγραφα</strong> (Ταυτότητα, ΑΦΜ, Απόδειξη Εισοδήματος, Στοιχεία Τραπεζικού Λογαριασμού) για να προχωρήσετε στην πληρωμή και να αποφύγετε προβλήματα.
                          </p>
                          <p className="text-sm text-yellow-800 mt-2">
                            Θα ενημερωθείτε αυτόματα όταν ο δικηγόρος ολοκληρώσει την επιβεβαίωση.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDepositPaymentModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        Κατάλαβα
                      </button>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <FaCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-900 font-bold mb-1">
                          Ο δικηγόρος σας έχει δώσει έγκριση για προκαταβολή.
                        </p>
                        <p className="text-sm text-green-800 font-medium">
                          Τα βασικά έγγραφα (ταυτότητα, ΑΦΜ, κ.λπ.) έχουν επιβεβαιωθεί — μπορείτε να προχωρήσετε με ασφάλεια.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-lg mb-6 text-center font-medium">
                    Θέλετε να συνεχίσετε στην πληρωμή προκαταβολής;
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDepositPaymentModal(false)}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-all"
                    >
                      Ακύρωση
                    </button>
                    <button
                      disabled={depositStepSubmitting}
                      onClick={async () => {
                        setDepositStepSubmitting(true);
                        try {
                          await completeBuyerDepositStep(deal.id);
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem(`depositPaymentClicked_${deal.id}`, 'true');
                          }
                          setShowDepositPaymentModal(false);
                          setDepositPaymentClicked(true);
                          onRefresh();
                          toast.success('Το βήμα ολοκληρώθηκε. Μπορείτε να προχωρήσετε στο επόμενο βήμα.');
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : 'Σφάλμα';
                          toast.error(msg);
                        } finally {
                          setDepositStepSubmitting(false);
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                    >
                      {depositStepSubmitting ? 'Αποθήκευση…' : 'Συνέχεια'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Rent Contract Signing Modal (Step 5) */}
      {showRentContractModal && isRent && isBuyerRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Υπογραφή Μισθωτηρίου Συμφωνητικού</h3>
              <button
                onClick={() => setShowRentContractModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {rentContractSigningMethod === null ? (
              /* Step 1: Choose signing method */
              <div className="space-y-4">
                <p className="text-gray-700">Πώς θέλετε να υπογράψετε το συμβόλαιο μίσθωσης;</p>
                <div className="grid gap-3">
                  <button
                    onClick={() => {
                      setRentContractSigningMethod('electronic');
                      if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigningMethod_${deal.id}`, 'electronic');
                      setRentContractLoadingDocs(true);
                      listDocuments(deal.id)
                        .then((docs) => {
                          setRentContractDocuments(docs);
                        })
                        .catch(() => toast.error('Σφάλμα φόρτωσης εγγράφων'))
                        .finally(() => setRentContractLoadingDocs(false));
                    }}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <FaFilePdf className="text-2xl text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">Ηλεκτρονικά μέσω gov.gr</div>
                      <div className="text-sm text-gray-600">Ψηφιακή υπογραφή στο docs.gov.gr</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setRentContractSigningMethod('in-person');
                      if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigningMethod_${deal.id}`, 'in-person');
                    }}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <FaCalendarAlt className="text-2xl text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">Δια ζώσης</div>
                      <div className="text-sm text-gray-600">Κανονίστε ημερομηνία και ώρα με τον ιδιοκτήτη</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : rentContractSigningMethod === 'electronic' ? (
              /* Electronic flow */
              <div className="space-y-4">
                {rentContractLoadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <FaSpinner className="animate-spin text-2xl text-blue-600" />
                  </div>
                ) : (() => {
                  const contractDraft = rentContractDocuments.find((d) =>
                    (d.category.toLowerCase().includes('μισθωτήριο') || d.category.toLowerCase().includes('συμβόλαιο') || d.category.toLowerCase().includes('συμφωνητικό')) &&
                    !d.category.toLowerCase().includes('υπογεγραμμένο') &&
                    (d.status === 'UPLOADED' || d.status === 'APPROVED') && d.fileName
                  );
                  const signedUploaded = rentContractDocuments.some((d) =>
                    (d.category || '').toLowerCase().includes('υπογεγραμμένο') && (d.status === 'UPLOADED' || d.status === 'APPROVED')
                  );
                  const tenantSignedDoc = rentContractDocuments.find((d) =>
                    d.category.toLowerCase().includes('υπογεγραμμένο') &&
                    d.uploadedById === userId &&
                    (d.status === 'UPLOADED' || d.status === 'APPROVED')
                  );
                  const tenantSignedApproved = tenantSignedDoc?.status === 'APPROVED';
                  const landlordNotifiedGovGr = !!(deal.rentSigningMetadata as any)?.landlordNotifiedTenantGovGrAt;

                  if (landlordNotifiedGovGr) {
                    if (tenantSignedApproved) {
                      return (
                        <div className="space-y-4">
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FaCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-green-900 mb-1">Υπογεγραμμένο συμβόλαιο εγκρίθηκε</h4>
                                <p className="text-sm text-green-800">Ο ιδιοκτήτης εγκρίνει το έγγραφο. Το βήμα ολοκληρώθηκε.</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                              setShowRentContractModal(false);
                              setRentContractSigningMethod(null);
                              onRefresh();
                              toast.success('Το βήμα ολοκληρώθηκε.');
                            }}
                            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                          >
                            Ολοκλήρωση Βήματος
                          </button>
                        </div>
                      );
                    }
                    if (tenantSignedDoc && !tenantSignedApproved) {
                      return (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FaInfoCircle className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-amber-900 mb-1">Αναμονή έγκρισης από ιδιοκτήτη</h4>
                                <p className="text-sm text-amber-800">Ανεβάσατε το υπογεγραμμένο PDF. Ο ιδιοκτήτης θα το ελέγξει και θα το εγκρίνει.</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setRentContractLoadingDocs(true);
                              listDocuments(deal.id).then(setRentContractDocuments).finally(() => setRentContractLoadingDocs(false));
                              onRefresh();
                            }}
                            className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                          >
                            Ανανέωση
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-2">Ο ιδιοκτήτης ανέβασε το έγγραφο στο Gov.gr</h4>
                          <p className="text-sm text-green-800 mb-4">Ακολουθήστε τα βήματα για να υπογράψετε το συμφωνητικό.</p>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-green-900">
                            <li><strong>Βήμα 1:</strong> Μετάβαση στο Gov.gr – Πατήστε το κουμπί παρακάτω για να μεταβείτε στο docs.gov.gr και συνδεθείτε με τους κωδικούς TaxisNet.</li>
                            <li><strong>Βήμα 2:</strong> Εύρεση του Συμφωνητικού – Από το κεντρικό μενού επιλέξτε &quot;Ψηφιακή Βεβαίωση Ιδιωτικού Συμφωνητικού&quot; και στη συνέχεια πατήστε &quot;Εκκρεμότητες&quot;.</li>
                            <li><strong>Βήμα 3:</strong> Υπογραφή & Λήψη – Ανοίξτε το εκκρεμές έγγραφο, ελέγξτε το και προχωρήστε στην ψηφιακή υπογραφή του. Κατεβάστε το τελικό PDF.</li>
                            <li><strong>Βήμα 4:</strong> Ολοκλήρωση – Επιστρέψτε εδώ και ανεβάστε το τελικό PDF για να ολοκληρωθεί το Βήμα 5!</li>
                          </ol>
                        </div>
                        <div className="flex flex-col gap-3">
                          <a href="https://docs.gov.gr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            🏛️ Μετάβαση στο docs.gov.gr
                          </a>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">📤 Ανέβασμα Υπογεγραμμένου PDF</label>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setRentContractUploading(true);
                                try {
                                  const fd = new FormData();
                                  fd.append('file', file);
                                  fd.append('category', 'Υπογεγραμμένο Μισθωτήριο Συμφωνητικό');
                                  await uploadDocument(deal.id, fd);
                                  toast.success('Το έγγραφο ανέβηκε επιτυχώς. Ο ιδιοκτήτης θα το ελέγξει.');
                                  const docs = await listDocuments(deal.id);
                                  setRentContractDocuments(docs);
                                  onRefresh();
                                } catch (err: any) {
                                  toast.error(err?.message || 'Σφάλμα ανεβάσματος');
                                } finally {
                                  setRentContractUploading(false);
                                  e.target.value = '';
                                }
                              }}
                              disabled={rentContractUploading}
                              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {rentContractUploading && <p className="text-sm text-gray-500 mt-1">Ανεβάζεται...</p>}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (!contractDraft) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FaInfoCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-yellow-900 mb-1">Αναμονή από ιδιοκτήτη</h4>
                              <p className="text-sm text-yellow-800">
                                Ο ιδιοκτήτης θα ανεβάσει το συμφωνητικό στο docs.gov.gr και θα πατήσει «Ειδοποίηση Ενοικιαστή». Θα ενημερωθείτε όταν είστε έτοιμοι. Ελέγξτε στα Έγγραφα ή ανανεώστε σε λίγο.
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          Μετάβαση στα Έγγραφα
                        </button>
                        <button
                          onClick={() => {
                            setRentContractLoadingDocs(true);
                            listDocuments(deal.id).then(setRentContractDocuments).finally(() => setRentContractLoadingDocs(false));
                          }}
                          className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                        >
                          Ανανέωση
                        </button>
                      </div>
                    );
                  }

                  if (signedUploaded) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FaCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-green-900 mb-1">Υπογεγραμμένο συμβόλαιο ανεβασμένο</h4>
                              <p className="text-sm text-green-800">Μπορείτε να ολοκληρώσετε το βήμα.</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                            setShowRentContractModal(false);
                            setRentContractSigningMethod(null);
                            onRefresh();
                            toast.success('Το βήμα ολοκληρώθηκε.');
                          }}
                          className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                          Ολοκλήρωση Βήματος
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <p className="font-semibold text-blue-900 mb-2">Προσχέδιο συμφωνητικού από ιδιοκτήτη</p>
                        <p className="text-sm text-blue-800 mb-3">{contractDraft.fileName}</p>
                        <button
                          onClick={() => downloadDocument(contractDraft.id, contractDraft.fileName)}
                          className="inline-flex items-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          <FaDownload /> Λήψη PDF
                        </button>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-gray-900">Οδηγίες υπογραφής στο gov.gr</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                          <li>Μεταβείτε στο <a href="https://docs.gov.gr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">docs.gov.gr</a> (Ψηφιακή Βεβαίωση Εγγράφου) και συνδεθείτε με TaxisNet</li>
                          <li>Ανεβάστε το PDF στο gov.gr για να μπει η ψηφιακή σας υπογραφή</li>
                          <li>Κατεβάστε το υπογεγραμμένο αρχείο και ανεβάστε το παρακάτω</li>
                        </ol>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ανεβάστε το υπογεγραμμένο PDF</label>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setRentContractUploading(true);
                            try {
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('category', 'Υπογεγραμμένο Μισθωτήριο Συμφωνητικό');
                              await uploadDocument(deal.id, fd);
                              toast.success('Το έγγραφο ανέβηκε επιτυχώς.');
                              const docs = await listDocuments(deal.id);
                              setRentContractDocuments(docs);
                            } catch (err: any) {
                              toast.error(err?.message || 'Σφάλμα ανεβάσματος');
                            } finally {
                              setRentContractUploading(false);
                              e.target.value = '';
                            }
                          }}
                          disabled={rentContractUploading}
                          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {rentContractUploading && <p className="text-sm text-gray-500 mt-1">Ανεβάζεται...</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* In-person flow: calendar */
              <div className="space-y-4">
                <p className="text-gray-700">Επιλέξτε ημερομηνία και ώρα για τη συνάντηση υπογραφής με τον ιδιοκτήτη.</p>
                <div className="grid gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ημερομηνία</label>
                    <input
                      type="date"
                      value={rentSigningProposalDate ? rentSigningProposalDate.toISOString().slice(0, 10) : ''}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setRentSigningProposalDate(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ώρα</label>
                    <input
                      type="time"
                      value={rentSigningProposalTime}
                      onChange={(e) => setRentSigningProposalTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Η πρότασή σας θα ενημερώσει τον ιδιοκτήτη. Μπορείτε να επικοινωνήσετε μέσω του chat για επιβεβαίωση.
                </p>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Έχετε ήδη υπογράψει δια ζώσης;</p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                      setShowRentContractModal(false);
                      setRentContractSigningMethod(null);
                      onRefresh();
                      toast.success('Το βήμα ολοκληρώθηκε.');
                    }}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Έχω υπογράψει δια ζώσης
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRentContractModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Κλείσιμο
                  </button>
                  <button
                    onClick={async () => {
                      if (!rentSigningProposalDate || !rentSigningProposalTime) {
                        toast.error('Επιλέξτε ημερομηνία και ώρα');
                        return;
                      }
                      setRentSigningProposalSaving(true);
                      try {
                        const [h, m] = rentSigningProposalTime.split(':').map(Number);
                        const startAt = new Date(rentSigningProposalDate);
                        startAt.setHours(h, m, 0, 0);
                        const endAt = new Date(startAt);
                        endAt.setMinutes(endAt.getMinutes() + 60);
                        await fetchFromBackend(`/deals/${deal.id}/rent-signing-proposal`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString() }),
                        });
                        toast.success('Η πρόταση στάλθηκε στον ιδιοκτήτη.');
                        setShowRentContractModal(false);
                        setRentContractSigningMethod(null);
                        onRefresh();
                      } catch (err: any) {
                        toast.error(err?.message || 'Σφάλμα αποστολής πρότασης');
                      } finally {
                        setRentSigningProposalSaving(false);
                      }
                    }}
                    disabled={rentSigningProposalSaving}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {rentSigningProposalSaving ? 'Αποστολή...' : 'Αποστολή Πρότασης'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rent Step 6: myAADE Acceptance Modal */}
      {showRentMyAadeModal && isRent && isBuyerRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Βήμα 6: Αποδοχή Μισθωτηρίου (myAADE)</h3>
              <button
                onClick={() => setShowRentMyAadeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-gray-700 mb-2">
              Ο ιδιοκτήτης υπέβαλε επιτυχώς τη δήλωση μίσθωσης στην Εφορία.
            </p>
            <p className="text-gray-700 mb-4">
              Για να είναι η ενοικίαση νομικά έγκυρη (και υποχρεωτικό από τον νόμο), πρέπει τώρα να την αποδεχτείτε.
            </p>

            {(deal.rentCompletionMetadata as any)?.sellerMyAadeDeclarationNumber ? (
              <p className="text-gray-900 font-semibold mb-4">
                📌 Ο Αριθμός της Δήλωσής σας είναι: <span className="text-blue-700">{(deal.rentCompletionMetadata as any).sellerMyAadeDeclarationNumber}</span>
              </p>
            ) : (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
                Αναμονή αριθμού δήλωσης από τον ιδιοκτήτη. Ο ιδιοκτήτης πρέπει να καταχωρήσει τον αριθμό στο Βήμα 5. Ανανεώστε τη σελίδα όταν τον έχετε λάβει.
              </p>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-3">Οδηγίες Βήμα-Βήμα:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li className="font-medium">Σύνδεση στην ΑΑΔΕ<br /><span className="font-normal text-blue-700">Πατήστε το link παρακάτω για να μεταβείτε στην πλατφόρμα και συνδεθείτε με τους κωδικούς σας (TaxisNet).</span></li>
                <li className="font-medium">Εύρεση της Δήλωσης<br /><span className="font-normal text-blue-700">Από το αρχικό μενού, επιλέξτε «Δηλώσεις Μίσθωσης Ακινήτων». Στη συνέχεια, πηγαίνετε στην επιλογή «Προβολή Δηλώσεων» ή «Εκκρεμείς (Αποδοχή/Άρνηση)».</span></li>
                <li className="font-medium">Έλεγχος και Αποδοχή<br /><span className="font-normal text-blue-700">Βρείτε τη δήλωση που ταιριάζει με τον παραπάνω Αριθμό. Ελέγξτε γρήγορα ότι το ποσό και οι ημερομηνίες είναι σωστά και πατήστε το πράσινο κουμπί «Αποδοχή».</span></li>
                <li className="font-medium">Ολοκλήρωση<br /><span className="font-normal text-blue-700">Μόλις δείτε το μήνυμα επιτυχίας στο TaxisNet, κλείστε εκείνη τη σελίδα, επιστρέψτε εδώ και πατήστε «Επιβεβαίωση Αποδοχής» για να κλείσουμε τη διαδικασία!</span></li>
              </ol>
            </div>

            <a
              href="https://myaade.gov.gr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium mb-6"
            >
              🔗 Μετάβαση στο myAADE (TaxisNet)
            </a>

            <p className="text-gray-700 font-medium mb-4">
              Έχετε ολοκληρώσει την αποδοχή της ηλεκτρονικής δήλωσης;
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRentMyAadeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-all"
              >
                Ακύρωση
              </button>
              <button
                onClick={async () => {
                  try {
                    await confirmRentBuyerMyAade(deal.id);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem(`rentMyAadeAccepted_${deal.id}`, 'true');
                    }
                    setRentMyAadeConfirmedLocal(true);
                    setShowRentMyAadeModal(false);
                    await onRefresh();
                    toast.success('Το βήμα ολοκληρώθηκε.');
                  } catch (e: any) {
                    toast.error(e?.message || 'Σφάλμα επιβεβαίωσης');
                  }
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-all shadow-md hover:shadow-lg"
              >
                Επιβεβαίωση Αποδοχής
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {showCancelAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ακύρωση Ραντεβού</h3>
              <button
                onClick={() => setShowCancelAppointmentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="text-red-600 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">Επιβεβαίωση Ακύρωσης</h4>
                  <p className="text-sm text-red-800">
                    Είστε σίγουρος/η ότι θέλετε να ακυρώσετε το ραντεβού;
                  </p>
                  {confirmedAppointment && (
                    <div className="mt-3 text-sm text-red-700">
                      <p className="font-medium">Ραντεβού:</p>
                      <p>
                        {new Date(confirmedAppointment.startAt).toLocaleDateString('el-GR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {' '}
                        {new Date(confirmedAppointment.startAt).toLocaleTimeString('el-GR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelAppointmentModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={isCancellingAppointment}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCancellingAppointment ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Ακύρωση...</span>
                  </>
                ) : (
                  <>
                    <FaTimes />
                    <span>Ναι, Ακύρωσε</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Signing Completion Modal */}
      {showConfirmSigningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση Ολοκλήρωσης Υπογραφής</h3>
              <button
                onClick={() => setShowConfirmSigningModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Επιβεβαίωση</h4>
                  <p className="text-sm text-blue-800">
                    Επιβεβαιώνετε ότι τα συμβολαία υπογράφηκαν επιτυχώς;
                  </p>
                  <p className="text-sm text-blue-800 mt-2 font-medium">
                    Το deal θα ολοκληρωθεί μόνο όταν και εσείς και ο {isBuyerRole ? 'πωλητής' : 'αγοραστής'} επιβεβαιώσετε την ολοκλήρωση.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSigningModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleConfirmSigningCompletion}
                disabled={isConfirmingSigning}
                className={`flex-1 px-4 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isConfirmingSigning ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Αποθήκευση...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Επιβεβαίωση</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Animation */}
      {deal.buyerSigningConfirmed && deal.sellerSigningConfirmed && deal.status === 'COMPLETED' && (
        <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden">
          {Array.from({ length: 150 }).map((_, i) => {
            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const startX = Math.random() * 100;
            const rotation = Math.random() * 360;
            const delay = Math.random() * 1.5;
            const duration = 3 + Math.random() * 2;
            const endX = startX + (Math.random() - 0.5) * 400;
            
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
                initial={{
                  y: 0,
                  rotate: 0,
                  opacity: 1,
                  x: 0,
                }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                  rotate: rotation + 720,
                  opacity: [1, 1, 0.8, 0],
                  x: [
                    0,
                    (endX - startX) * 0.3,
                    (endX - startX) * 0.7,
                    endX - startX,
                  ],
                }}
                transition={{
                  duration,
                  delay,
                  ease: [0.5, 0, 0.5, 1],
                }}
              />
            );
          })}
        </div>
      )}

      {/* Deal Completed Message */}
      {deal.buyerSigningConfirmed && deal.sellerSigningConfirmed && deal.status === 'COMPLETED' && showCompletedModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompletedModal(false);
            }
          }}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCompletedModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors z-20"
              aria-label="Κλείσιμο"
            >
              <FaTimes className="w-4 h-4" />
            </button>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4],
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            <div className="text-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <FaCheckCircle className="text-white text-4xl" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-gray-900 mb-4"
              >
                Συγχαρητήρια! 🎉
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-gray-700 mb-2 font-semibold"
              >
                Η συναλλαγή ολοκληρώθηκε επιτυχώς!
              </motion.p>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-base text-gray-600 mb-6"
              >
                Ευχαριστούμε που εμπιστευτήκατε την πλατφόρμα μας για την ολοκλήρωση της συναλλαγής σας.
              </motion.p>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isBuyerRole) {
                    router.push('/dashboard/buyer');
                  } else if (isSellerRole) {
                    router.push('/dashboard/seller');
                  } else {
                    router.push('/dashboard');
                  }
                }}
                className={`px-6 py-3 bg-gradient-to-r ${accentGradient} text-white font-semibold rounded-lg ${accentHover} transition-all shadow-md hover:shadow-lg`}
              >
                Επιστροφή στο Dashboard
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <DealConfirmDialog
        open={!!buyerRejectSellerProposalTargetId}
        title="Απόρριψη πρότασης πωλητή"
        message="Να απορριφθεί αυτή η προτεινόμενη ημερομηνία υπογραφής από τον πωλητή; Ο πωλητής θα μπορεί να στείλει νέα πρόταση αργότερα."
        confirmLabel="Απόρριψη"
        cancelLabel="Άκυρο"
        confirmVariant="danger"
        isLoading={!!isBuyerRejectingSellerProposal}
        onCancel={() => !isBuyerRejectingSellerProposal && setBuyerRejectSellerProposalTargetId(null)}
        onConfirm={() => {
          const id = buyerRejectSellerProposalTargetId;
          if (!id || isBuyerRejectingSellerProposal) return;
          void (async () => {
            setIsBuyerRejectingSellerProposal(id);
            try {
              const res = await fetchFromBackend(`/deals/${deal.id}/appointments/${id}/buyer-reject`, {
                method: 'POST',
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Σφάλμα');
              }
              toast.success('Η πρόταση απορρίφθηκε.');
              setBuyerRejectSellerProposalTargetId(null);
              notifyDealSigningAppointmentsChanged(deal.id);
              if (showSigningAppointmentModal) {
                await refreshSigningAppointmentModalData();
              }
              onRefresh();
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : 'Σφάλμα');
            } finally {
              setIsBuyerRejectingSellerProposal(null);
            }
          })();
        }}
      />
    </div>
  );
}
