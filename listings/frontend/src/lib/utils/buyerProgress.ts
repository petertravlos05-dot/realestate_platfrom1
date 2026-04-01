import { DealRoom } from '@/lib/api/deals';

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SELLER_APPROVAL';
  date: string;
  time: string;
}

/**
 * Βήμα 6 οδηγού αγοραστή (πώληση): ίδια λογική με OverviewTab.
 * - Με δικηγόρο πωλητή: ολοκληρώνεται όταν ο δικηγόρος πωλητή έχει ολοκληρώσει το Βήμα 3 της επισκόπησης
 *   ΚΑΙ ο δικηγόρος αγοραστή το Βήμα 4.
 * - Χωρίς δικηγόρο πωλητή: μόνο όταν ο δικηγόρος αγοραστή έχει ολοκληρώσει το Βήμα 4.
 */
export function isBuyerPurchaseGuideStep6Completed(
  deal: DealRoom,
  sseEvents?: Array<{ type: string }>
): boolean {
  const sellerId = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
  const hasSellerLawyerInDeal = !!deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
  );

  const lawyerApprovedSellerDocs =
    !!deal.lawyerApprovedSellerDocumentsAt ||
    !!sseEvents?.some((e) => e.type === 'lawyer_approved_seller_documents') ||
    (typeof window !== 'undefined' &&
      sessionStorage.getItem(`lawyerApprovedSellerDocuments_${deal.id}`) === 'true');

  const sellerLawyerApprovedBuyerFolder =
    !!sseEvents?.some((e) => e.type === 'lawyer_approved_buyer_progress') ||
    (typeof window !== 'undefined' &&
      sessionStorage.getItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`) === 'true');

  const sellerLawyerStep3Completed = sellerLawyerApprovedBuyerFolder;

  const buyerLawyerStep1Completed =
    !!deal.lawyerApprovedBasicDocumentsAt ||
    !!sseEvents?.some((e) => e.type === 'lawyer_approved_basic_documents_for_deposit');

  const buyerLawyerStep2Completed =
    !!deal.buyerLawyerCompletedBuyerFolderAt ||
    !!sseEvents?.some((e) => e.type === 'buyer_lawyer_completed_buyer_folder') ||
    (typeof window !== 'undefined' &&
      sessionStorage.getItem(`buyerLawyerGuideStep2_${deal.id}`) === 'true');

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

  if (hasSellerLawyerInDeal) {
    return sellerLawyerStep3Completed && buyerLawyerStep4Completed;
  }
  return buyerLawyerStep4Completed;
}

/**
 * Calculate buyer's current step and return seller-friendly message
 */
export function getBuyerProgressMessage(
  deal: DealRoom,
  propertyAppointments?: ViewingRequest[]
): { step: number; message: string; description: string } {
  // Determine step completion status (same logic as BuyersPurchaseGuide)
  const status = {
    step1: true, // Always completed
    step2: false, // Appointment booked
    step3: false, // Interest confirmed
    step4: false, // Lawyer selected
    step5: false, // Deposit paid
    step6: false, // Notary selected
    step7: false, // Signing completed
    step8: deal.status === 'CLOSED', // Completion
  };

  // Step 2: Check if at least one appointment exists and is confirmed
  const hasConfirmedPropertyAppointment = propertyAppointments?.some(
    (a) => a.status === 'ACCEPTED'
  ) || false;
  const hasConfirmedDealAppointment = deal.appointments?.some(
    (a) => a.status === 'CONFIRMED'
  ) || false;
  const hasConfirmedAppointment = hasConfirmedPropertyAppointment || hasConfirmedDealAppointment;
  
  const hasPendingAppointment = propertyAppointments?.some(
    (a) => a.status === 'PENDING' || a.status === 'PENDING_SELLER_APPROVAL'
  ) || deal.appointments?.some((a) => a.status === 'REQUESTED') || false;
  
  const hasPastPropertyAppointment = propertyAppointments?.some(
    (a) => a.status === 'ACCEPTED' && new Date(`${a.date}T${a.time}`) < new Date()
  ) || false;
  const hasPastDealAppointment = deal.appointments?.some(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
  ) || false;
  const hasPastAppointment = hasPastPropertyAppointment || hasPastDealAppointment;
  
  status.step2 = hasConfirmedAppointment || false;

  // Step 3: Interest confirmed
  status.step3 = hasPastAppointment || (deal.documents && deal.documents.length > 0) || false;

  // Step 4: Lawyer selected by BUYER
  status.step4 = !!(deal.buyerId && deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
  ));

  // Step 5: Deposit paid
  const hasDocumentsInReview = deal.documents?.some(
    (d) => d.status === 'UPLOADED' || d.status === 'APPROVED'
  ) || false;
  status.step5 = hasDocumentsInReview || false;

  // Step 6: Notary selected by BUYER
  status.step6 = !!(deal.buyerId && deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
  ));

  // Step 7: Signing completed
  const allDocsApproved = deal.documents && deal.documents.length > 0 && 
    deal.documents.every((d) => d.status === 'APPROVED');
  status.step7 = (allDocsApproved && status.step6) || false;

  // Determine current step (first incomplete step)
  let currentStep = 1;
  if (!status.step2) currentStep = 2;
  else if (!status.step3) currentStep = 3;
  else if (!status.step4) currentStep = 4;
  else if (!status.step5) currentStep = 5;
  else if (!status.step6) currentStep = 6;
  else if (!status.step7) currentStep = 7;
  else if (status.step8) currentStep = 8;
  else currentStep = 7;

  // Generate seller-friendly messages
  let message = '';
  let description = '';

  switch (currentStep) {
    case 1:
      message = 'Η συναλλαγή δημιουργήθηκε';
      description = 'Η συναλλαγή έχει δημιουργηθεί επιτυχώς';
      break;
    
    case 2:
      if (hasPendingAppointment) {
        message = 'Αναμονή εγκρίσεως ραντεβού';
        description = 'Ο αγοραστής έχει ζητήσει ραντεβού. Πρέπει να εγκρίνετε το ραντεβού.';
      } else {
        message = 'Αναμονή αγοραστή για ραντεβού';
        description = 'Ο αγοραστής πρέπει να κλείσει ραντεβού για να δει το ακίνητο.';
      }
      break;
    
    case 3:
      if (hasConfirmedAppointment && !hasPastAppointment) {
        message = 'Αναμονή πραγματοποίησης ραντεβού';
        description = 'Το ραντεβού έχει εγκριθεί. Περιμένετε να πραγματοποιηθεί.';
      } else {
        message = 'Αναμονή επιβεβαίωσης ενδιαφέροντος';
        description = 'Το ραντεβού έχει πραγματοποιηθεί. Ο αγοραστής πρέπει να επιβεβαιώσει το ενδιαφέρον του.';
      }
      break;
    
    case 4:
      message = 'Αναμονή επιλογής δικηγόρου';
      description = 'Ο αγοραστής πρέπει να επιλέξει δικηγόρο για τη συναλλαγή.';
      break;
    
    case 5:
      message = 'Αναμονή καταβολής προκαταβολής';
      description = 'Ο αγοραστής πρέπει να καταβάλει την προκαταβολή.';
      break;
    
    case 6:
      message = 'Αναμονή επιλογής συμβολαιογράφου';
      description = 'Ο αγοραστής πρέπει να επιλέξει συμβολαιογράφο για τη συναλλαγή.';
      break;
    
    case 7:
      message = 'Αναμονή υπογραφής συμβολαίου';
      description = 'Ο αγοραστής πρέπει να ολοκληρώσει την υπογραφή του συμβολαίου.';
      break;
    
    case 8:
      message = 'Η συναλλαγή ολοκληρώθηκε';
      description = 'Η συναλλαγή έχει ολοκληρωθεί επιτυχώς.';
      break;
    
    default:
      message = 'Σε εξέλιξη';
      description = 'Η συναλλαγή βρίσκεται σε εξέλιξη.';
  }

  return { step: currentStep, message, description };
}

/** Step labels matching BuyersPurchaseGuide (for seller view) */
export const BUYER_STEP_LABELS: Array<{ title: string; description: string }> = [
  { title: 'Η συναλλαγή δημιουργήθηκε', description: 'Η συναλλαγή έχει δημιουργηθεί' },
  { title: 'Κλείσε Ραντεβού', description: 'Προγραμμάτισε ραντεβού για να δεις το ακίνητο' },
  { title: 'Κάνε Προσφορά', description: 'Στείλε την προσφορά σου στον πωλητή για το ακίνητο' },
  { title: 'Επιβεβαίωσε Ενδιαφέρον', description: 'Επιβεβαίωσε ότι θέλεις να συνεχίσεις μετά το ραντεβού' },
  { title: 'Επίλεξε Δικηγόρο', description: 'Επίλεξε δικηγόρο για τη συναλλαγή' },
  { title: 'Πληρωμή Προκαταβολής', description: 'Πλήρωσε την προκαταβολή για να προχωρήσει η συναλλαγή' },
  { title: 'Διαδικασία με Δικηγόρο', description: 'Ολοκλήρωσε τα έγγραφα και τις ενέργειες με τον δικηγόρο' },
  { title: 'Επίλεξε Συμβολαιογράφο', description: 'Επίλεξε συμβολαιογράφο για τη συναλλαγή' },
  { title: 'Διαδικασία με Συμβολαιογράφο', description: 'Αναμονή έγκρισης εγγράφων από τον συμβολαιογράφο' },
  { title: 'Υπογραφή Συμβολαίων', description: 'Ολοκλήρωσε την υπογραφή των συμβολαίων' },
  { title: 'Επιβεβαίωση Ολοκλήρωσης', description: 'Επιβεβαίωσε ότι τα συμβολαία υπογράφηκαν επιτυχώς' },
];

/**
 * Compute buyer's step status for seller view (deal data only, no sessionStorage)
 * Returns completed steps and current step matching BuyersPurchaseGuide
 */
export function getBuyerProgressForSeller(
  deal: DealRoom,
  propertyAppointments?: ViewingRequest[],
  sseEvents?: Array<{ type: string }>
): { currentStep: number; steps: Array<{ id: number; title: string; description: string; completed: boolean; active: boolean }> } {
  const status = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false,
    step8: false,
    step9: false,
    step10: false,
  };

  // Step 1: Appointment completed or skipped
  const hasPastPropertyAppointment = propertyAppointments?.some(
    (a) => a.status === 'ACCEPTED' && new Date(`${a.date}T${a.time}`) < new Date()
  ) || false;
  const hasPastDealAppointment = deal.appointments?.some(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
  ) || false;
  status.step1 = !!(deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt || hasPastPropertyAppointment || hasPastDealAppointment);

  // Step 2: Buyer made offer
  status.step2 = !!(deal.offers?.some((o) => o.role === 'BUYER'));

  // Step 3: Interest confirmed
  status.step3 = !!deal.buyerConfirmedInterestAt;

  // Step 4: Lawyer selected by BUYER
  status.step4 = !!(deal.buyerId && deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId));

  // Step 5: Deposit - infer from basic docs approved
  const basicCategories = ['Ταυτότητα', 'ΑΦΜ', 'Απόδειξη Εισοδήματος', 'Στοιχεία Τραπεζικού', 'IDENTITY', 'TAX_ID', 'INCOME_PROOF', 'BANK_ACCOUNT'];
  const buyerDocs = deal.documents?.filter((d) => d.requestedFromRole === 'BUYER') || [];
  const basicDocs = buyerDocs.filter((d) =>
    basicCategories.some((c) => d.category?.toLowerCase().includes(c.toLowerCase()))
  );
  const basicDocsApproved = basicDocs.length > 0 && basicDocs.every((d) => d.status === 'APPROVED');
  const hasBuyerNotary = !!(deal.buyerId && deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId));
  status.step6 = isBuyerPurchaseGuideStep6Completed(deal, sseEvents);
  status.step5 = status.step6 || (basicDocsApproved && status.step4);

  // Step 7: Notary selected by BUYER
  status.step7 = hasBuyerNotary;

  // Step 8: Notary approved documents
  const notaryApproved = !!deal.notaryApprovedDocumentsAt ||
    sseEvents?.some((e) => e.type === 'notary_approved_documents') ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
  status.step8 = notaryApproved;

  // Step 9: Signing completed (appointment ended)
  const signingApt = deal.appointments?.find((a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
  status.step9 = !!(signingApt && new Date(signingApt.endAt) <= new Date());

  // Step 10: Buyer confirmed signing
  status.step10 = !!(deal.buyerSigningConfirmed || deal.status === 'CLOSED');

  // Current step: first incomplete
  let currentStep = 1;
  if (!status.step1) currentStep = 1;
  else if (!status.step2) currentStep = 2;
  else if (!status.step3) currentStep = 3;
  else if (!status.step4) currentStep = 4;
  else if (!status.step5) currentStep = 5;
  else if (!status.step6) currentStep = 6;
  else if (!status.step7) currentStep = 7;
  else if (!status.step8) currentStep = 8;
  else if (!status.step9) currentStep = 9;
  else if (!status.step10) currentStep = 10;
  else currentStep = 11;

  const steps = BUYER_STEP_LABELS.map((label, i) => {
    const stepNum = i + 1;
    const completed = stepNum === 1 ? status.step1
      : stepNum === 2 ? status.step1
      : stepNum === 3 ? status.step2
      : stepNum === 4 ? status.step3
      : stepNum === 5 ? status.step4
      : stepNum === 6 ? status.step5
      : stepNum === 7 ? status.step6
      : stepNum === 8 ? status.step7
      : stepNum === 9 ? status.step8
      : stepNum === 10 ? status.step9
      : status.step10;
    return {
      id: stepNum,
      title: label.title,
      description: label.description,
      completed: completed || deal.status === 'CLOSED',
      active: currentStep === stepNum,
    };
  });

  return { currentStep, steps };
}

/** Rent step labels - matching what the buyer sees in BuyersPurchaseGuide / ActionsTab */
export const BUYER_RENT_STEP_LABELS: Array<{ title: string; description: string }> = [
  { title: 'Κλείσιμο Ραντεβού (Προαιρετικό)', description: 'Κλείστε ραντεβού για να δείτε το ακίνητο' },
  { title: 'Επιβεβαίωση Ενδιαφέροντος & Προσφορά', description: 'Αποφασίστε αν θέλετε να προχωρήσετε στην ενοικίαση και κάντε προσφορά' },
  { title: 'Ταυτοποίηση & Οικονομικό Προφίλ', description: 'Ανεβάστε ταυτότητα και ΑΦΜ. Περιμένετε έγκριση από τον ιδιοκτήτη.' },
  { title: 'Πληρωμή Εγγύησης & Κράτηση', description: 'Πληρώστε την εγγύηση για να κλειδώσετε το ακίνητο' },
  { title: 'Υπογραφή Ιδιωτικού Συμφωνητικού', description: 'Διαβάστε και υπογράψτε το μισθωτήριο συμβόλαιο' },
  { title: 'Αποδοχή Μισθωτηρίου (myAADE)', description: 'Αποδεχτείτε την ηλεκτρονική δήλωση μίσθωσης στην ΑΑΔΕ' },
  { title: 'Επιβεβαίωση Ολοκλήρωσης & Παράδοση Κλειδιών', description: 'Επιβεβαιώστε την ολοκλήρωση της ενοικίασης' },
];

/**
 * Compute buyer's RENT step status for seller view (deal data only).
 * Matches the steps the buyer sees in BuyersPurchaseGuide / ActionsTab for rent.
 */
export function getBuyerRentProgressForSeller(
  deal: DealRoom,
  propertyAppointments?: ViewingRequest[]
): { currentStep: number; steps: Array<{ id: number; title: string; description: string; completed: boolean; active: boolean }> } {
  // Step 1: Viewing - completed or skipped
  const hasPastPropertyAppointment = propertyAppointments?.some(
    (a) => a.status === 'ACCEPTED' && new Date(`${a.date}T${a.time}`) < new Date()
  ) || false;
  const hasPastDealAppointment = deal.appointments?.some(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
  ) || false;
  const step1Done = !!(deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt || hasPastPropertyAppointment || hasPastDealAppointment);

  // Step 2: Offer
  const step2Done = !!(deal.offers?.some((o) => o.role === 'BUYER'));

  // Step 3: Basic documents approved
  const basicCategories = ['Ταυτότητα', 'ΑΦΜ', 'IDENTITY', 'TAX_ID'];
  const buyerDocs = deal.documents?.filter((d) => d.requestedFromRole === 'BUYER') || [];
  const basicDocs = buyerDocs.filter((d) =>
    basicCategories.some((c) => d.category?.toLowerCase().includes(c.toLowerCase()))
  );
  const step3Done = basicDocs.length > 0 && basicDocs.every((d) => d.status === 'APPROVED');

  // Step 5: Tenant signed contract (approved by landlord) - from deal documents
  const tenantSignedDoc = deal.documents?.find((d) =>
    d.category?.toLowerCase().includes('υπογεγραμμένο') &&
    d.uploadedById === deal.buyerId &&
    (d.status === 'UPLOADED' || d.status === 'APPROVED')
  );
  const step5Done = tenantSignedDoc?.status === 'APPROVED' || false;

  // Step 4: Deposit - we infer from step5 (if contract signed, deposit was paid). No payment data in deal.
  const step4Done = step5Done;

  // Step 6: myAADE accepted
  const rentCompletion = deal.rentCompletionMetadata as { buyerMyAadeConfirmedAt?: string } | null | undefined;
  const step6Done = !!rentCompletion?.buyerMyAadeConfirmedAt;

  // Step 7: Completion
  const dealClosed = deal.status === 'CLOSED' || !!(
    (deal.rentCompletionMetadata as any)?.buyerCompletionConfirmedAt &&
    (deal.rentCompletionMetadata as any)?.sellerCompletionConfirmedAt
  );
  const step7Done = dealClosed;

  // Current step: first incomplete
  let currentStep = 1;
  if (!step1Done) currentStep = 1;
  else if (!step2Done) currentStep = 2;
  else if (!step3Done) currentStep = 3;
  else if (!step4Done) currentStep = 4;
  else if (!step5Done) currentStep = 5;
  else if (!step6Done) currentStep = 6;
  else if (!step7Done) currentStep = 7;
  else currentStep = 7;

  const statuses = [step1Done, step2Done, step3Done, step4Done, step5Done, step6Done, step7Done];

  const steps = BUYER_RENT_STEP_LABELS.map((label, i) => {
    const stepNum = i + 1;
    const completed = statuses[i] || deal.status === 'CLOSED';
    return {
      id: stepNum,
      title: label.title,
      description: label.description,
      completed,
      active: currentStep === stepNum,
    };
  });

  return { currentStep, steps };
}

/** Seller step labels for SALE - for buyer to see seller's progress */
export const SELLER_SALE_STEP_LABELS: Array<{ title: string; description: string }> = [
  { title: 'Διαχείριση Επισκεψής', description: 'Έγκριση ραντεβού για να δει το ακίνητο' },
  { title: 'Αποδοχή Προσφοράς', description: 'Αποδοχή της προσφοράς σας' },
  { title: 'Επιλογή Επαγγελματιών', description: 'Επιλογή δικηγόρου και μηχανικού' },
  { title: 'Συλλογή Εγγράφων', description: 'Ανέβασμα και έγκριση εγγράφων ακινήτου' },
  { title: 'Έγκριση Συμβολαιογράφου', description: 'Αναμονή έγκρισης εγγράφων από τον συμβολαιογράφο' },
  { title: 'Υπογραφή Συμβολαίων', description: 'Πραγματοποίηση υπογραφής' },
  { title: 'Επιβεβαίωση Ολοκλήρωσης', description: 'Επιβεβαίωση ολοκλήρωσης συναλλαγής' },
];

/** Seller step labels for RENT - for buyer to see landlord progress */
export const SELLER_RENT_STEP_LABELS: Array<{ title: string; description: string }> = [
  { title: 'Ανάληψη Προσφοράς', description: 'Ο ιδιοκτήτης λαμβάνει την προσφορά σας' },
  { title: 'Αποδοχή Προσφοράς', description: 'Αποδοχή της προσφοράς για ενοικίαση' },
  { title: 'Έγκριση Εγγράφων', description: 'Έγκριση ταυτότητας και ΑΦΜ' },
  { title: 'Υπογραφή Συμβολαίου', description: 'Έγκριση υπογεγραμμένου μισθωτηρίου' },
  { title: 'Υποβολή σε myAADE', description: 'Δήλωση μίσθωσης στην ΑΑΔΕ' },
  { title: 'Ολοκλήρωση', description: 'Επιβεβαίωση παράδοσης κλειδιών' },
];

/**
 * Compute seller's step status for BUYER view (sale) - so buyer can see seller progress
 */
export function getSellerProgressForBuyer(deal: DealRoom): {
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{ id: number; title: string; description: string; completed: boolean; active: boolean }>;
} {
  const sellerId = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
  const sellerSkippedLawyer =
    typeof window !== 'undefined' &&
    localStorage.getItem(`deal-${deal.id}-seller-skipped-lawyer`) === 'true';

  const hasLawyer = !!sellerId && deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId);
  const hasEngineer = !!sellerId && deal.requests?.some((r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerId);
  const hasAcceptedOffer = deal.offers?.some((o) => o.status === 'ACCEPTED');
  const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt || (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
  const signingApt = deal.appointments?.find((a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');

  const isStep1 = (): boolean => {
    if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) return true;
    if (hasLawyer && hasAcceptedOffer) return true;
    const hasPendingRequest = deal.appointments?.some((a) => a.status === 'REQUESTED' || a.status === 'PENDING');
    if (hasPendingRequest) return false;
    const hasPastDealAppointment = deal.appointments?.some((a) => a.status === 'CONFIRMED' && new Date(a.endAt) < new Date());
    return !!hasPastDealAppointment;
  };
  const isStep2 = () => hasAcceptedOffer;
  const isStep3 = () => !!(hasLawyer && hasEngineer) || !!(hasEngineer && sellerSkippedLawyer);
  const isStep4 = (): boolean => {
    const hasSellerLawyer = !!hasLawyer;
    const buyerLawyerStep4FromStorage =
      typeof window !== 'undefined' && (
        sessionStorage.getItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`) === 'true' ||
        sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true'
      );
    const buyerLawyerStep4NoSellerLawyerFromStorage =
      typeof window !== 'undefined' && sessionStorage.getItem(`buyerLawyerStep4NoSellerLawyer_${deal.id}`) === 'true';

    const buyerLawyerStep4Completed = hasSellerLawyer
      ? !!buyerLawyerStep4FromStorage
      : !!(buyerLawyerStep4FromStorage || buyerLawyerStep4NoSellerLawyerFromStorage);

    const sellerLawyerStep4Completed = !hasSellerLawyer
      ? true
      : (
          !!deal.lawyerApprovedSellerDocumentsAt ||
          (typeof window !== 'undefined' && sessionStorage.getItem(`lawyerApprovedSellerDocuments_${deal.id}`) === 'true')
        );

    return !!(buyerLawyerStep4Completed && sellerLawyerStep4Completed);
  };
  const isStep5 = () => !!hasNotaryApproval;
  const isStep6 = () => !!signingApt && new Date(signingApt.endAt) <= new Date();
  const isStep7 = () => !!(deal.sellerSigningConfirmed || deal.status === 'CLOSED');

  const stepStatus = [isStep1(), isStep2(), isStep3(), isStep4(), isStep5(), isStep6(), isStep7()];
  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = 7;

  let currentStep = 1;
  if (!isStep1()) currentStep = 1;
  else if (!isStep2()) currentStep = 2;
  else if (!isStep3()) currentStep = 3;
  else if (!isStep4()) currentStep = 4;
  else if (!isStep5()) currentStep = 5;
  else if (!isStep6()) currentStep = 6;
  else if (!isStep7()) currentStep = 7;
  else currentStep = 8;

  const steps = SELLER_SALE_STEP_LABELS.map((label, i) => {
    const stepNum = i + 1;
    const completed = stepStatus[i] || deal.status === 'CLOSED';
    return {
      id: stepNum,
      title: label.title,
      description: label.description,
      completed,
      active: currentStep === stepNum,
    };
  });

  return { currentStep, completedSteps, totalSteps, steps };
}

/**
 * Compute seller's (landlord) step status for BUYER view (rent)
 */
export function getSellerRentProgressForBuyer(deal: DealRoom): {
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{ id: number; title: string; description: string; completed: boolean; active: boolean }>;
} {
  const hasBuyerOffer = deal.offers?.some((o) => o.role === 'BUYER');
  const hasAcceptedOffer = deal.offers?.some((o) => o.status === 'ACCEPTED');
  const buyerDocs = deal.documents?.filter((d) => d.requestedFromRole === 'BUYER') || [];
  const idDoc = buyerDocs.find((d) => d.category?.toLowerCase().includes('ταυτότητα') || d.category?.toLowerCase().includes('identity'));
  const afmDoc = buyerDocs.find((d) => d.category?.toLowerCase().includes('αφμ') || d.category?.toLowerCase().includes('tax'));
  const isBasicDocumentsApproved = !!(idDoc?.status === 'APPROVED' && afmDoc?.status === 'APPROVED');
  const tenantSignedDoc = deal.documents?.find(
    (d) =>
      d.category?.toLowerCase().includes('υπογεγραμμένο') &&
      d.uploadedById === deal.buyerId &&
      (d.status === 'UPLOADED' || d.status === 'APPROVED')
  );
  const tenantSignedApproved = tenantSignedDoc?.status === 'APPROVED';
  const rentCompletion = deal.rentCompletionMetadata as { sellerMyAadeDeclarationNumber?: string } | null | undefined;
  const rentMyAadeSubmitted = typeof window !== 'undefined' && sessionStorage.getItem(`rentSellerMyAadeSubmitted_${deal.id}`) === 'true';
  const dealClosed =
    deal.status === 'CLOSED' ||
    !!(
      (deal.rentCompletionMetadata as any)?.buyerCompletionConfirmedAt &&
      (deal.rentCompletionMetadata as any)?.sellerCompletionConfirmedAt
    );

  const step1Done = hasBuyerOffer || hasAcceptedOffer;
  const step2Done = hasAcceptedOffer;
  const step3Done = isBasicDocumentsApproved;
  const step4Done = !!tenantSignedApproved;
  const step5Done = rentMyAadeSubmitted || !!rentCompletion?.sellerMyAadeDeclarationNumber || dealClosed;
  const step6Done = dealClosed;

  const stepStatus = [step1Done, step2Done, step3Done, step4Done, step5Done, step6Done];
  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = 6;

  let currentStep = 1;
  if (!step1Done) currentStep = 1;
  else if (!step2Done) currentStep = 2;
  else if (!step3Done) currentStep = 3;
  else if (!step4Done) currentStep = 4;
  else if (!step5Done) currentStep = 5;
  else currentStep = 6;

  const steps = SELLER_RENT_STEP_LABELS.map((label, i) => {
    const stepNum = i + 1;
    const completed = stepStatus[i] || deal.status === 'CLOSED';
    return {
      id: stepNum,
      title: label.title,
      description: label.description,
      completed,
      active: currentStep === stepNum,
    };
  });

  return { currentStep, completedSteps, totalSteps, steps };
}