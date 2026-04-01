'use client';

import { useState, useEffect } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { FaCheckCircle, FaCircle, FaLock, FaCalendarAlt, FaCheck, FaUserTie, FaCreditCard, FaHandshake, FaPenFancy, FaFileAlt, FaGavel, FaEuroSign } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useSession } from 'next-auth/react';
import CardSection from './ui/CardSection';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { isBuyer } from '@/lib/utils/dealRole';
import { isBuyerPurchaseGuideStep6Completed } from '@/lib/utils/buyerProgress';
import { useDealRoomTheme } from './useDealRoomTheme';

interface BuyersPurchaseGuideProps {
  deal: DealRoom;
  sseEvents?: any[]; // Activity events from SSE
}

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  date: string;
  time: string;
}

/**
 * BuyersPurchaseGuide - 10-step purchase guide aligned with ActionsTab; Βήμα 6 = isBuyerPurchaseGuideStep6Completed (OverviewTab)
 * 
 * Steps (same order as ActionTab):
 * 1. Κλείσιμο Ραντεβού (Προαιρετικό)
 * 2. Επιβεβαίωση Ενδιαφέροντος
 * 3. Κάνε Προσφορά
 * 4. Επιλογή Δικηγόρου
 * 5. Προκαταβολή & Ιδιωτικό Συμφωνητικό
 * 6. Διαδικασία με Δικηγόρο
 * 7. Επιλογή Συμβολαιογράφου
 * 8. Διαδικασία με Συμβολαιογράφο
 * 9. Υπογραφή Συμβολαίων
 * 10. Επιβεβαίωση Ολοκλήρωσης Υπογραφής
 */
function getIsRent(deal: DealRoom): boolean {
  const a = (deal.property as any)?.amenities;
  if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
    return String(a.listingType || a.transactionType).toLowerCase() === 'rent';
  }
  return false;
}

export default function BuyersPurchaseGuide({ deal, sseEvents = [] }: BuyersPurchaseGuideProps) {
  const { userId } = useCurrentUser();
  const { accentGradient, accentIcon } = useDealRoomTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const isBuyerRole = isBuyer(deal, userId);
  const isRent = getIsRent(deal);
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

  // Helper functions matching ActionsTab logic
  const isStep1Completed = (): boolean => {
    if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) return true;
    const step1Skipped = typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true';
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

  const isBasicDocumentsApproved = (): boolean => {
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
  };

  // Determine step completion status (matching ActionsTab logic exactly)
  // Order matches ActionsTab: 1.Ραντεβού 2.Ενδιαφέρον 3.Προσφορά 4.Δικηγόρος 5.Προκαταβολή 6.Διαδικασία δικηγόρου 7.Συμβολαιογράφος 8.Διαδικασία συμβολαιογράφου 9.Υπογραφή 10.Επιβεβαίωση
  const getStepStatus = () => {
    const status = {
      step1: false,   // Βήμα 1: Ραντεβού (προαιρετικό)
      step2: false,   // Βήμα 2: Επιβεβαίωση ενδιαφέροντος
      step3: false,   // Βήμα 3: Προσφορά (accepted)
      step4: false,   // Βήμα 4: Δικηγόρος
      step5: false,   // Βήμα 5: Προκαταβολή
      step6: false,   // Βήμα 6: Διαδικασία δικηγόρου
      step7: false,   // Βήμα 7: Συμβολαιογράφος
      step8: false,   // Βήμα 8: Διαδικασία συμβολαιογράφου
      step9: false,   // Βήμα 9: Υπογραφή
      step10: false,  // Βήμα 10: Επιβεβαίωση ολοκλήρωσης
    };

    // Step 1: Appointment completed or skipped (matching ActionsTab)
    status.step1 = isStep1Completed();

    // Step 2: Interest confirmed
    const interestDecisionForStep2 = deal.buyerConfirmedInterestAt ? 'continue' : (typeof window !== 'undefined' 
      ? sessionStorage.getItem(`interestDecision_${deal.id}`) 
      : null);
    status.step2 = interestDecisionForStep2 === 'continue' || false;

    // Step 3: Offer agreed (seller accepted buyer's or buyer accepted seller's counter)
    const isOfferAgreed = deal.offers?.some((o) => o.status === 'ACCEPTED') || false;
    status.step3 = isOfferAgreed;

    // Step 4: Lawyer selected by BUYER (matching ActionsTab)
    const hasBuyerLawyer = deal.buyerId && deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
    );
    status.step4 = !!hasBuyerLawyer;

    // Step 5: Deposit paid - check if buyer clicked payment button
    // Matching ActionsTab: depositPaymentClicked means step 4 is completed
    // BUT only if steps 2 and 3 are completed
    const depositPaymentClicked = typeof window !== 'undefined' && 
      sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';
    
    // Step 5 can only be completed if steps 3 and 4 are completed
    if (status.step3 && status.step4 && depositPaymentClicked) {
      status.step5 = true;
    } else {
      status.step5 = false;
    }

    // Step 6: Ίδια λογική με OverviewTab (δικηγόρος πωλητή Βήμα 3 + δικηγόρος αγοραστή Βήμα 4, ή μόνο Βήμα 4)
    status.step6 = isBuyerPurchaseGuideStep6Completed(deal, sseEvents);

    // Step 7: Notary selected by BUYER (matching ActionsTab)
    const hasBuyerNotary = deal.buyerId && deal.requests?.some(
      (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
    );

    status.step7 = !!hasBuyerNotary;

    // Step 8: Notary process completed - check if notary approved documents (completes buyer & seller step 5)
    const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
    status.step8 = hasNotaryApproval || false;

    // Step 9: Signing completed - check if signing appointment exists and has passed
    const confirmedSigningAppointment = deal.appointments?.find(
      (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    if (confirmedSigningAppointment) {
      const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
      const now = new Date();
      status.step9 = appointmentEndTime <= now || false;
    } else {
      status.step9 = false;
    }

    // Step 10: Confirm signing completion - check if buyer confirmed signing
    if (status.step9) {
      status.step10 = deal.buyerSigningConfirmed || deal.status === 'CLOSED' || false;
    } else {
      status.step10 = false;
    }

    return status;
  };

  const stepStatus = getStepStatus();

  // --- RENT FLOW: 7 steps (no lawyer/notary) ---
  const getRentStepStatus = () => {
    const s = {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
      step7: deal.status === 'CLOSED',
    };
    s.step1 = isStep1Completed();
    s.step2 = !!(deal.offers?.some((o) => o.role === 'BUYER'));
    s.step3 = isBasicDocumentsApproved();
    const depositClicked = typeof window !== 'undefined' && sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';
    s.step4 = depositClicked;
    const contractSigned = typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigned_${deal.id}`) === 'true';
    s.step5 = contractSigned;
    const myAadeAccepted = typeof window !== 'undefined' && sessionStorage.getItem(`rentMyAadeAccepted_${deal.id}`) === 'true';
    s.step6 = myAadeAccepted;
    return s;
  };

  const rentStepStatus = getRentStepStatus();

  const getRentCurrentStep = (): number => {
    if (rentStepStatus.step7) return 7;
    if (!rentStepStatus.step1) return 1;
    if (!rentStepStatus.step2) return 2;
    if (!rentStepStatus.step3) return 3;
    if (!rentStepStatus.step4) return 4;
    if (!rentStepStatus.step5) return 5;
    if (!rentStepStatus.step6) return 6;
    return 7;
  };

  const rentCurrentStep = getRentCurrentStep();

  const isRentStepLocked = (stepNum: number): boolean => {
    if (stepNum === 1) return false;
    if (stepNum === 2) return !rentStepStatus.step1;
    if (stepNum === 3) return !rentStepStatus.step2;
    if (stepNum === 4) return !rentStepStatus.step3;
    if (stepNum === 5) return !rentStepStatus.step4;
    if (stepNum === 6) return !rentStepStatus.step5;
    if (stepNum === 7) return !rentStepStatus.step6;
    return false;
  };

  // Determine current active step (matching ActionsTab logic exactly)
  const getCurrentStep = (): number => {
    // Load interestDecision and step1Skipped - prefer deal (persisted), fallback to sessionStorage
    const interestDecision = deal.buyerConfirmedInterestAt ? 'continue' : (typeof window !== 'undefined' 
      ? sessionStorage.getItem(`interestDecision_${deal.id}`) 
      : null);
    const step1Skipped = !!deal.buyerSkippedViewingAt || (typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true');
    const depositPaymentClicked = typeof window !== 'undefined' && 
      sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true';

    const hasBuyerOffer = deal.offers?.some((o) => o.role === 'BUYER') || false;

    // If user chose to reschedule, go back to step 1
    if (interestDecision === 'reschedule') {
      return 1;
    }

    // If user chose to cancel, stay at step 4 (Confirm Interest)
    if (interestDecision === 'cancel') {
      return 4;
    }

    // Check if BUYER has chosen lawyer (not seller's lawyer)
    const hasBuyerLawyer = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
    );
    
    // If user chose to continue, proceed to lawyer selection (don't go back to step 1)
    if (interestDecision === 'continue') {
      // If buyer has chosen lawyer, skip to lawyer process below
      if (hasBuyerLawyer) {
        // Continue to check lawyer process below
      } else {
        return 5; // CHOOSE_LAWYER (now step 5)
      }
    }
    
    // Check if step 1 is completed (past appointment or skipped)
    const step1Completed = isStep1Completed();
    
    // Step 2: Make offer - if step 1 done but no offer yet
    if (step1Completed && !hasBuyerOffer) {
      return 3; // MAKE_OFFER
    }

    // If buyer has chosen lawyer, skip to lawyer process
    if (hasBuyerLawyer) {
      // Continue to check lawyer process below
    } else {
      // IMPORTANT: If user chose to continue, never go back to step 1
      if (interestDecision === 'continue') {
        return 5; // CHOOSE_LAWYER
      }
      
      // If step 1 and 2 completed but no interest decision, show step 4 (Confirm Interest)
      if (step1Completed && hasBuyerOffer && interestDecision === null) {
        return 4; // CONFIRM_INTEREST
      }
      
      // If step 1 is not completed and not skipped, stay at step 1
      if (!step1Completed && !step1Skipped) {
        return 1; // VIEWING_APPOINTMENT
      }
      
      // If step 1 is completed, step 2 (offer) might not be - handled above
      // If we reach here with offer but no interest, step 4
      if (step1Completed && hasBuyerOffer) {
        return 4; // CONFIRM_INTEREST
      }
      
      return 2; // BOOK_APPOINTMENT (edge case)
    }

    // Step 6: Check deposit payment
    // CRITICAL: Step 6 can ONLY be current if steps 3, 4, 5 are completed
    const step3Completed = interestDecision === 'continue';
    const step4Completed = !!hasBuyerLawyer;
    
    // If steps 3 or 4 are not completed, return the first incomplete step
    if (!step3Completed) {
      return 4; // CONFIRM_INTEREST
    }
    if (!step4Completed) {
      return 5; // CHOOSE_LAWYER
    }
    
    // Now check if we can proceed to step 6 (deposit)
    const basicDocumentsApproved = isBasicDocumentsApproved();
    
    if (!basicDocumentsApproved) {
      return 7; // LAWYER_PROCESS
    }
    
    if (basicDocumentsApproved && !depositPaymentClicked) {
      return 6; // DEPOSIT_PAYMENT
    }

    // Step 7: Νομική φάση (Βήμα 6 οδηγού) — ίδια συνθήκη με OverviewTab
    if (!isBuyerPurchaseGuideStep6Completed(deal, sseEvents)) {
      return 7; // LAWYER_PROCESS
    }

    const hasBuyerNotaryInStep = deal.buyerId && deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
    );

    if (!hasBuyerNotaryInStep) {
      return 8; // CHOOSE_NOTARY
    }
    
    // Step 9: Check notary process (completes buyer & seller step 5)
    const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
      sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
      (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
    
    if (!hasNotaryApproval) {
      return 9; // NOTARY_PROCESS
    }
    
    // Step 10: Check signing
    const confirmedSigningAppointment = deal.appointments?.find(
      (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
    );
    if (confirmedSigningAppointment) {
      const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
      const now = new Date();
      const signingCompleted = appointmentEndTime <= now;
      if (!signingCompleted) {
        return 10; // FINAL_SIGNING
      }
    } else {
      return 10; // FINAL_SIGNING
    }
    
    // Step 11: Confirm signing completion
    if (!deal.buyerSigningConfirmed && deal.status !== 'CLOSED') {
      return 11; // CONFIRM_SIGNING_COMPLETION
    }
    
    return 11; // COMPLETED
  };

  const currentStep = getCurrentStep();

  // Determine if step is locked (previous step not completed) - same order as ActionsTab
  const isStepLocked = (stepNum: number): boolean => {
    if (stepNum === 1) return false;
    if (stepNum === 2) return !stepStatus.step1;
    if (stepNum === 3) return !stepStatus.step2;
    if (stepNum === 4) return !stepStatus.step3;
    if (stepNum === 5) return !stepStatus.step4;
    if (stepNum === 6) return !stepStatus.step5;
    if (stepNum === 7) return !stepStatus.step6;
    if (stepNum === 8) return !stepStatus.step7;
    if (stepNum === 9) return !stepStatus.step8;
    if (stepNum === 10) return !stepStatus.step9;
    return false;
  };

  // 10 steps - same order and titles as ActionsTab Οδηγός Αγοράς Ακινητού
  const steps = [
    {
      id: 1,
      title: 'Βήμα 1: Κλείσιμο Ραντεβού (Προαιρετικό)',
      description: 'Κλείστε ραντεβού για να δείτε το ακίνητο',
      icon: <FaCalendarAlt />,
      completed: stepStatus.step1,
      active: currentStep === 1 || currentStep === 2,
      locked: false,
    },
    {
      id: 2,
      title: 'Βήμα 2: Επιβεβαίωση Ενδιαφέροντος',
      description: 'Αποφασίστε αν θέλετε να συνεχίσετε με την αγορά',
      icon: <FaCheck />,
      completed: stepStatus.step2,
      active: currentStep === 4,
      locked: isStepLocked(2),
    },
    {
      id: 3,
      title: 'Βήμα 3: Κάνε Προσφορά',
      description: 'Στείλε την προσφορά σου στον πωλητή για το ακίνητο',
      icon: <FaEuroSign />,
      completed: stepStatus.step3,
      active: currentStep === 3,
      locked: isStepLocked(3),
    },
    {
      id: 4,
      title: 'Βήμα 4: Επιλογή Δικηγόρου',
      description: 'Επιλέξτε δικηγόρο για να σας καθοδηγήσει στη διαδικασία',
      icon: <FaUserTie />,
      completed: stepStatus.step4,
      active: currentStep === 5,
      locked: isStepLocked(4),
    },
    {
      id: 5,
      title: 'Βήμα 5: Προκαταβολή & Ιδιωτικό Συμφωνητικό',
      description: 'Πληρώστε την προκαταβολή για να κλειδώσετε το ακίνητο',
      icon: <FaCreditCard />,
      completed: stepStatus.step5,
      active: currentStep === 6,
      locked: isStepLocked(5),
    },
    {
      id: 6,
      title: 'Βήμα 6: Διαδικασία με Δικηγόρο',
      description: 'Ο δικηγόρος σας θα ζητήσει πιο εξειδικευμένα έγγραφα και θα σας αναθέσει ενέργειες',
      icon: <FaFileAlt />,
      completed: stepStatus.step6,
      active: currentStep === 7,
      locked: isStepLocked(6),
    },
    {
      id: 7,
      title: 'Βήμα 7: Επιλογή Συμβολαιογράφου',
      description: 'Επιλέξτε συμβολαιογράφο για την υπογραφή των συμβολαίων',
      icon: <FaHandshake />,
      completed: stepStatus.step7,
      active: currentStep === 8,
      locked: isStepLocked(7),
    },
    {
      id: 8,
      title: 'Βήμα 8: Διαδικασία με Συμβολαιογράφο',
      description: 'Αναμονή έγκρισης εγγράφων από τον συμβολαιογράφο',
      icon: <FaGavel />,
      completed: stepStatus.step8,
      active: currentStep === 9,
      locked: isStepLocked(8),
    },
    {
      id: 9,
      title: 'Βήμα 9: Υπογραφή Συμβολαίων',
      description: 'Κανονίστε την ημερομηνία και ώρα για την υπογραφή',
      icon: <FaPenFancy />,
      completed: stepStatus.step9,
      active: currentStep === 10,
      locked: isStepLocked(9),
    },
    {
      id: 10,
      title: 'Βήμα 10: Επιβεβαίωση Ολοκλήρωσης Υπογραφής',
      description: 'Επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν επιτυχώς',
      icon: <FaCheckCircle />,
      completed: stepStatus.step10,
      active: currentStep === 11,
      locked: isStepLocked(10),
    },
  ];

  const rentSteps = [
    {
      id: 1,
      title: 'Κλείσιμο Ραντεβού (Προαιρετικό)',
      description: 'Κλείστε ραντεβού για να δείτε το ακίνητο. Πηγαίνετε στο tab "Ραντεβού", επιλέξτε ημερομηνία και ώρα. Μπορείτε να προχωρήσετε στην επιβεβαίωση ενδιαφέροντος χωρίς ραντεβού.',
      icon: <FaCalendarAlt />,
      completed: rentStepStatus.step1,
      active: rentCurrentStep === 1,
      locked: false,
    },
    {
      id: 2,
      title: 'Επιβεβαίωση Ενδιαφέροντος & Προσφορά',
      description: 'Αποφασίστε αν θέλετε να προχωρήσετε στην ενοικίαση. Προσδιορίστε το ποσό του ενοικίου, προσθέστε προαιρετικό μήνυμα. Ο ιδιοκτήτης μπορεί να αποδεχτεί, να κάνει αντιπρόταση ή να απορρίψει.',
      icon: <FaEuroSign />,
      completed: rentStepStatus.step2,
      active: rentCurrentStep === 2,
      locked: isRentStepLocked(2),
    },
    {
      id: 3,
      title: 'Ταυτοποίηση & Οικονομικό Προφίλ',
      description: 'Πηγαίνετε στο tab "Έγγραφα & Ενέργειες". Ανεβάστε την ταυτότητά σας και το αποδεικτικό ΑΦΜ. Προσθέστε προαιρετικά αποδεικτικό εισοδήματος. Περιμένετε την έγκριση του ιδιοκτήτη.',
      icon: <FaFileAlt />,
      completed: rentStepStatus.step3,
      active: rentCurrentStep === 3,
      locked: isRentStepLocked(3),
    },
    {
      id: 4,
      title: 'Πληρωμή Εγγύησης & Κράτηση',
      description: 'Μετά την έγκριση του προφίλ σας, πληρώστε την εγγύηση και την αμοιβή πλατφόρμας. Το ποσό καθορίζεται από τη συμφωνία (1-2 ενοίκια εγγύηση + τρέχων μήνας). Το ακίνητο κατοχυρώνεται οριστικά σε εσάς.',
      icon: <FaCreditCard />,
      completed: rentStepStatus.step4,
      active: rentCurrentStep === 4,
      locked: isRentStepLocked(4),
    },
    {
      id: 5,
      title: 'Υπογραφή Ιδιωτικού Συμφωνητικού',
      description: 'Ο ιδιοκτήτης θα ανεβάσει το προσχέδιο στο tab "Έγγραφα & Ενέργειες". Διαβάστε τους όρους, υπογράψτε ψηφιακά (π.χ. gov.gr) ή δια ζώσης, ανεβάστε το υπογεγραμμένο συμφωνητικό.',
      icon: <FaPenFancy />,
      completed: rentStepStatus.step5,
      active: rentCurrentStep === 5,
      locked: isRentStepLocked(5),
    },
    {
      id: 6,
      title: 'Αποδοχή Μισθωτηρίου (myAADE)',
      description: 'Ο ιδιοκτήτης θα καταθέσει το ηλεκτρονικό μισθωτήριο στην ΑΑΔΕ. Συνδεθείτε στο TaxisNet (myAADE), μεταβείτε στις "Δηλώσεις Μίσθωσης Ακινήτων" και κάντε "Αποδοχή". Υποχρεωτικό από τον νόμο.',
      icon: <FaFileAlt />,
      completed: rentStepStatus.step6,
      active: rentCurrentStep === 6,
      locked: isRentStepLocked(6),
    },
    {
      id: 7,
      title: 'Επιβεβαίωση Ολοκλήρωσης & Μετακόμιση',
      description: 'Εφόσον έχετε παραλάβει τα κλειδιά, μεταφέρετε τους λογαριασμούς (ΔΕΗ/Νερό) στο όνομά σας. Πατήστε το κουμπί επιβεβαίωσης. Το deal ολοκληρώνεται όταν και εσείς και ο ιδιοκτήτης επιβεβαιώσετε.',
      icon: <FaCheckCircle />,
      completed: rentStepStatus.step7,
      active: rentCurrentStep === 7,
      locked: isRentStepLocked(7),
    },
  ];

  const stepsToShow = isRent ? rentSteps : steps;

  const handleStepClick = (step: typeof steps[0] | typeof rentSteps[0]) => {
    if (step.locked || step.completed) return;

    if (isRent) {
      switch (step.id) {
        case 1:
          router.push(`/deals/${deal.id}?tab=appointments`);
          break;
        case 2:
          router.push(`/deals/${deal.id}?tab=overview`);
          break;
        case 3:
        case 5:
          router.push(`/deals/${deal.id}?tab=documents`);
          break;
        case 4:
        case 6:
        case 7:
          router.push(`/deals/${deal.id}?tab=overview`);
          break;
        default:
          break;
      }
      return;
    }

    // Sale flow - match ActionsTab navigation
    switch (step.id) {
      case 1:
        router.push(`/deals/${deal.id}?tab=appointments`);
        break;
      case 2:
      case 3:
      case 5:
      case 10:
        router.push(`/deals/${deal.id}?tab=overview`);
        break;
      case 4:
      case 7:
        router.push(`/deals/${deal.id}?tab=professionals`);
        break;
      case 6:
        router.push(`/deals/${deal.id}?tab=documents`);
        break;
      case 8:
        router.push(`/deals/${deal.id}?tab=chat`);
        break;
      case 9:
        router.push(`/deals/${deal.id}?tab=appointments`);
        break;
      default:
        break;
    }
  };

  if (!isBuyerRole) {
    return (
      <CardSection title="Στάδια Συναλλαγής">
        <p className="text-sm text-gray-500">Μόνο για αγοραστές</p>
      </CardSection>
    );
  }

  const totalSteps = isRent ? 7 : 10;
  const progressPercentage = Math.round((stepsToShow.filter(s => s.completed).length / totalSteps) * 100);

  return (
    <CardSection title={isRent ? 'Οδηγός Ενοικίασης Ακινήτου' : 'Οδηγός Αγοράς Ακινήτου'}>
      <p className="text-xs text-gray-600 mb-5 font-medium">
        {isRent ? 'Ακολούθησε τα βήματα για να ολοκληρώσεις την ενοικίαση' : 'Ακολούθησε τα βήματα για να ολοκληρώσεις την αγορά'}
      </p>

      <div className="space-y-1">
        {stepsToShow.map((stage, index) => {
          const isCompleted = stage.completed;
          const isActive = stage.active;
          const isLocked = stage.locked;

          return (
            <div
              key={`step-${index}`}
              onClick={() => handleStepClick(stage)}
              className={`
                relative p-4 rounded-xl transition-all cursor-pointer group
                ${isLocked ? 'cursor-not-allowed' : isActive || !isCompleted ? 'cursor-pointer' : ''}
                ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-md'
                    : isCompleted
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                    : isLocked
                    ? 'bg-gray-50 border-2 border-gray-200 opacity-60'
                    : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }
              `}
            >
              {/* Connector Line */}
              {index < stepsToShow.length - 1 && (
                <div
                  className={`
                    absolute left-6 top-12 w-0.5 h-7 z-0
                    ${isCompleted ? 'bg-gradient-to-b from-green-400 to-green-300' : isActive ? 'bg-gradient-to-b from-blue-400 to-blue-300' : 'bg-gray-300'}
                  `}
                />
              )}

              <div className="flex items-start gap-4 relative z-10">
                {/* Icon */}
                <div
                  className={`
                    flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base shadow-sm transition-transform group-hover:scale-110
                    ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                        : isActive
                        ? `bg-gradient-to-br ${accentIcon} text-white animate-pulse`
                        : isLocked
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <FaCheckCircle className="text-base" />
                  ) : isLocked ? (
                    <FaLock className="text-base" />
                  ) : (
                    <span className="text-base">{stage.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`
                      font-bold mb-1 text-sm
                      ${
                        isActive
                          ? 'text-blue-900'
                          : isCompleted
                          ? 'text-green-900'
                          : isLocked
                          ? 'text-gray-400'
                          : 'text-gray-800'
                      }
                    `}
                  >
                    {stage.title}
                  </h3>
                  <p
                    className={`
                      text-xs leading-relaxed
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
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-blue-900">Πρόοδος</span>
          <span className="text-lg font-extrabold text-blue-700">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div
            className={`bg-gradient-to-r ${accentGradient} h-2.5 rounded-full transition-all duration-500 shadow-sm`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </CardSection>
  );
}

