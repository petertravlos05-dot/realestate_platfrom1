'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DealRoom } from '@/lib/api/deals';
import { listDocuments, requestDocument, uploadDocument, reviewDocument, downloadDocument, deleteDocument, ensureRentDocuments, DealDocument } from '@/lib/api/dealDocuments';
import { fetchFromBackend } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaUpload, FaDownload, FaCheckCircle, FaTimesCircle, FaFileAlt, FaQuestionCircle, FaTrash, FaCopy, FaExternalLinkAlt, FaTimes, FaInfoCircle, FaFolderOpen, FaChevronDown, FaChevronRight, FaClipboardList, FaPlus } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import EmptyState from '../ui/EmptyState';
import CardSection from '../ui/CardSection';
import { isSeller } from '@/lib/utils/dealRole';
import { Tooltip } from 'react-tooltip';
import { useDealRoomTheme } from '../useDealRoomTheme';

interface DocumentsTabProps {
  deal: DealRoom;
  onRefresh: () => void;
  isBuyerFromGreece?: boolean;
}

type InnerTabType = 'requests' | 'incoming' | 'overview' | 'htk';
type BuyerInnerTabType = 'uploaded' | 'pending';
type ActionTargetType = 'BUYER' | 'SELLER_GROUP';

type SellerSaleDocsSubTab = 'folder' | 'htk';

export default function DocumentsTab({ deal, onRefresh, isBuyerFromGreece = true }: DocumentsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useCurrentUser();
  const { isProfessionalContext } = useDealRoomTheme();
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Log buyer country status for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DocumentsTab] Buyer from Greece:', isBuyerFromGreece);
    }
  }, [isBuyerFromGreece]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DealDocument | null>(null);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([]);
  const [customDocumentNames, setCustomDocumentNames] = useState<{ [key: string]: string }>({});
  const [customDocumentGuides, setCustomDocumentGuides] = useState<{ [key: string]: { where: string; instructions: string } }>({});
  const [activeInnerTab, setActiveInnerTab] = useState<InnerTabType>('requests');
  const [activeBuyerTab, setActiveBuyerTab] = useState<BuyerInnerTabType>('pending');
  const [sellerSaleDocsSubTab, setSellerSaleDocsSubTab] = useState<SellerSaleDocsSubTab>('folder');
  const [selectedSide, setSelectedSide] = useState<'BUYER' | 'SELLER' | null>(null);
  const [showDocumentGuideModal, setShowDocumentGuideModal] = useState(false);
  const [selectedDocumentForGuide, setSelectedDocumentForGuide] = useState<DealDocument | null>(null);
  const [requestType, setRequestType] = useState<'DOCUMENT' | 'ACTION' | null>(null);
  const [selectedActionTarget, setSelectedActionTarget] = useState<ActionTargetType | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customActionName, setCustomActionName] = useState('');
  const [customActionWhere, setCustomActionWhere] = useState('');
  const [customActionInstructions, setCustomActionInstructions] = useState('');
  const [showIbanModal, setShowIbanModal] = useState(false);
  const [showActionGuideModal, setShowActionGuideModal] = useState(false);
  const [showRentSigningGuideModal, setShowRentSigningGuideModal] = useState(false);
  const [selectedActionForGuide, setSelectedActionForGuide] = useState<DealDocument | null>(null);
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [engineerOwnUploadCategory, setEngineerOwnUploadCategory] = useState<string>('');
  const [engineerOwnUploadCustomName, setEngineerOwnUploadCustomName] = useState('');
  const [sellerLawyerUploadCategory, setSellerLawyerUploadCategory] = useState<string>('');
  const [sellerLawyerUploadCustomName, setSellerLawyerUploadCustomName] = useState('');
  const [buyerLawyerUploadCategory, setBuyerLawyerUploadCategory] = useState<string>('');
  const [buyerLawyerUploadCustomName, setBuyerLawyerUploadCustomName] = useState('');
  const [engineerFolderOpen, setEngineerFolderOpen] = useState(true);
  const [engineerSectionUploadedOpen, setEngineerSectionUploadedOpen] = useState(true);
  const [engineerSectionRequestedOpen, setEngineerSectionRequestedOpen] = useState(true);
  const [engineerSectionTotalOpen, setEngineerSectionTotalOpen] = useState(true);
  const [engineerHtkRequestedByMeOpen, setEngineerHtkRequestedByMeOpen] = useState(true);
  const [isEngineerHtkUploadFlow, setIsEngineerHtkUploadFlow] = useState(false);
  const [lawyerHtkFolderOpen, setLawyerHtkFolderOpen] = useState(true);
  const [sellerLawyerHtkPendingOpen, setSellerLawyerHtkPendingOpen] = useState(true);
  const [lawyerHtkTotalOpen, setLawyerHtkTotalOpen] = useState(true);
  const [sellerLawyerFolderOpen, setSellerLawyerFolderOpen] = useState(true);
  const [sellerLawyerSectionUploadedOpen, setSellerLawyerSectionUploadedOpen] = useState(true);
  const [sellerLawyerSectionRequestedOpen, setSellerLawyerSectionRequestedOpen] = useState(true);
  const [sellerLawyerSectionTotalOpen, setSellerLawyerSectionTotalOpen] = useState(true);
  const [sellerOwnHtkPendingOpen, setSellerOwnHtkPendingOpen] = useState(true);
  const [sellerOwnHtkTotalOpen, setSellerOwnHtkTotalOpen] = useState(true);
  const [buyerLawyerFolderOpen, setBuyerLawyerFolderOpen] = useState(true);
  const [buyerLawyerSectionUploadedOpen, setBuyerLawyerSectionUploadedOpen] = useState(true);
  const [buyerLawyerSectionRequestedOpen, setBuyerLawyerSectionRequestedOpen] = useState(true);
  const [buyerLawyerSectionTotalOpen, setBuyerLawyerSectionTotalOpen] = useState(true);
  const [buyerLawyerSellerFolderOpen, setBuyerLawyerSellerFolderOpen] = useState(true);
  const [buyerLawyerSellerPendingOpen, setBuyerLawyerSellerPendingOpen] = useState(true);
  const [buyerLawyerSellerTotalOpen, setBuyerLawyerSellerTotalOpen] = useState(true);
  const [sellerLawyerBuyerFolderOpen, setSellerLawyerBuyerFolderOpen] = useState(true);
  const [sellerLawyerBuyerPendingOpen, setSellerLawyerBuyerPendingOpen] = useState(true);
  const [sellerLawyerBuyerToApproveOpen, setSellerLawyerBuyerToApproveOpen] = useState(true);
  const [sellerLawyerBuyerTotalOpen, setSellerLawyerBuyerTotalOpen] = useState(true);
  const [notaryBuyerFolderOpen, setNotaryBuyerFolderOpen] = useState(true);
  const [notaryBuyerPendingOpen, setNotaryBuyerPendingOpen] = useState(true);
  const [notaryBuyerTotalOpen, setNotaryBuyerTotalOpen] = useState(true);
  const [notarySellerFolderOpen, setNotarySellerFolderOpen] = useState(true);
  const [notarySellerPendingOpen, setNotarySellerPendingOpen] = useState(true);
  const [notarySellerTotalOpen, setNotarySellerTotalOpen] = useState(true);
  const [buyerFolderOpen, setBuyerFolderOpen] = useState(true);
  const [buyerSectionRequestedOpen, setBuyerSectionRequestedOpen] = useState(true);
  const [buyerSectionTotalOpen, setBuyerSectionTotalOpen] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocForReject, setSelectedDocForReject] = useState<DealDocument | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showProfessionalDeleteModal, setShowProfessionalDeleteModal] = useState(false);
  const [professionalDeleteTarget, setProfessionalDeleteTarget] = useState<{
    doc: DealDocument;
    variant: 'engineerHtk' | 'sellerFolder';
  } | null>(null);
  const [professionalDeleteSubmitting, setProfessionalDeleteSubmitting] = useState(false);
  const [isSellerLawyerHtkRequestFlow, setIsSellerLawyerHtkRequestFlow] = useState(false);
  
  // Action editing states for lawyer
  const [actionDescription, setActionDescription] = useState('');
  const [actionWhy, setActionWhy] = useState('');
  const [actionWhere, setActionWhere] = useState('');
  const [actionInstructions, setActionInstructions] = useState('');
  const [actionAdditionalInfo, setActionAdditionalInfo] = useState('');
  const [actionResult, setActionResult] = useState('');
  // Engineer action extra fields
  const [actionRfCode, setActionRfCode] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionDeclarationText, setActionDeclarationText] = useState('');
  
  // Helper function to check if a document is an action
  const isAction = (doc: DealDocument): boolean => {
    return doc.category.startsWith('[ΕΝΕΡΓΕΙΑ]');
  };
  
  // Helper function to extract action type from category
  const getActionType = (category: string): string | null => {
    if (!category.startsWith('[ΕΝΕΡΓΕΙΑ]')) return null;
    const actionName = category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim();
    
    // Engineer actions (seller)
    if (actionName.includes('Έκδοση Εξουσιοδότησης Μηχανικού')) return 'ENGINEER_POWER_OF_ATTORNEY';
    if (actionName.includes('Καθορισμός Ραντεβού Αυτοψίας')) return 'ENGINEER_SITE_VISIT';
    if (actionName.includes('Υπεύθυνη Δήλωση Ιδιοκτήτη')) return 'ENGINEER_OWNER_DECLARATION';
    if (actionName.includes('Ενημέρωση') && actionName.includes('Διόρθωση Ε9')) return 'ENGINEER_E9_CORRECTION';
    if (actionName.includes('Πληρωμή Παραβόλου Τακτοποίησης')) return 'SETTLEMENT_FEE';
    if (actionName.includes('Πληρωμή Τέλους Ανταπόδοσης ΤΕΕ')) return 'TEE_FEE';
    if (actionName.includes('Πληρωμή/Ρύθμιση ΕΝΦΙΑ')) return 'ENFIA_PAYMENT';
    if (actionName.includes('Πληρωμή ΤΑΠ')) return 'TAP_PAYMENT';
    if (actionName.includes('Εξόφληση Λογαριασμών')) return 'UTILITIES_SETTLEMENT';
    if (actionName.includes('Αίτηση Διακοπής Σύμβασης')) return 'UTILITIES_TERMINATION';
    if (actionName.includes('Δήλωση Διαγραφής στο Ε9')) return 'E9_DELETION';
    if (actionName.includes('Ακύρωση Ασφαλιστηρίου Συμβολαίου')) return 'INSURANCE_CANCELLATION';
    // Buyer actions
    if (actionName.includes('Ορισμός Φορολογικού Εκπροσώπου')) return 'TAX_REP_ASSIGNMENT';
    if (actionName.includes('Αποστολή Εμβάσματος Προκαταβολής')) return 'DEPOSIT_TRANSFER';
    if (actionName.includes('Επίσημη Μετάφραση Εγγράφων')) return 'DOCUMENT_TRANSLATION';
    return 'CUSTOM';
  };
  
  // Get seller IBAN (placeholder - should come from deal or property)
  const sellerIban = 'GR1234567890123456789012345'; // TODO: Get from deal.property or deal.seller
  
  // Parse action guide from document (stored as JSON in guideInstructions)
  const parseActionGuide = (doc: DealDocument): { title: string; description: string; instructions: string } | null => {
    if (!doc.guideInstructions) return null;
    
    try {
      // Try to parse as JSON first (for structured action guides)
      const parsed = JSON.parse(doc.guideInstructions);
      if (parsed.description || parsed.instructions) {
        return {
          title: doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim(),
          description: parsed.description || '',
          instructions: parsed.instructions || ''
        };
      }
    } catch (e) {
      // Not JSON, use as plain text (backward compatibility)
      // For old format, treat entire text as instructions
      return {
        title: doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim(),
        description: '',
        instructions: doc.guideInstructions || ''
      };
    }
    
    return null;
  };
  
  // Prompt text for action upload (what the seller should upload to confirm completion)
  const getActionUploadPrompt = (category: string): string => {
    const actionType = getActionType(category);
    const prompts: Record<string, string> = {
      ENGINEER_OWNER_DECLARATION: 'Ανεβάστε την υπογεγραμμένη υπεύθυνη δήλωση (docs.gov.gr).',
      ENGINEER_POWER_OF_ATTORNEY: 'Ανεβάστε την εκδοθείσα εξουσιοδότηση ή screenshot που την επιβεβαιώνει.',
      ENGINEER_SITE_VISIT: 'Ανεβάστε screenshot ή έγγραφο που επιβεβαιώνει το ραντεβού αυτοψίας.',
      ENGINEER_E9_CORRECTION: 'Ανεβάστε το νέο Ε9 μετά τη διόρθωση.',
      SETTLEMENT_FEE: 'Ανεβάστε screenshot αποδεικτικού πληρωμής παραβόλου.',
      TEE_FEE: 'Ανεβάστε screenshot αποδεικτικού πληρωμής τέλους ΤΕΕ.',
      ENFIA_PAYMENT: 'Ανεβάστε screenshot ή βεβαίωση πληρωμής ΕΝΦΙΑ.',
      TAP_PAYMENT: 'Ανεβάστε screenshot βεβαίωσης ΤΑΠ.',
      UTILITIES_SETTLEMENT: 'Ανεβάστε screenshot αποδεικτικού εξόφλησης λογαριασμών.',
      UTILITIES_TERMINATION: 'Ανεβάστε screenshot αιτήματος διακοπής σύμβασης.',
      E9_DELETION: 'Ανεβάστε screenshot που επιβεβαιώνει τη διαγραφή στο Ε9.',
      INSURANCE_CANCELLATION: 'Ανεβάστε screenshot που επιβεβαιώνει την ακύρωση ασφαλιστηρίου συμβολαίου.',
      DEPOSIT_TRANSFER: 'Ανεβάστε screenshot αποδεικτικού εμβάσματος προκαταβολής.',
      TAX_REP_ASSIGNMENT: 'Ανεβάστε το αποδεικτικό ορισμού φορολογικού εκπροσώπου.',
      DOCUMENT_TRANSLATION: 'Ανεβάστε τις επίσημες μεταφράσεις των εγγράφων.',
    };
    return prompts[actionType || ''] || 'Ανεβάστε screenshot ή έγγραφο που επιβεβαιώνει την ολοκλήρωση της ενέργειας.';
  };
  
  // Action guides with detailed information
  const getActionGuide = (actionType: string | null, doc: DealDocument) => {
    // First check if there's a parsed guide from document
    const parsedGuide = parseActionGuide(doc);
    if (parsedGuide) {
      return parsedGuide;
    }
    
    if (!actionType) {
      // Custom action - use guide from document
      const parsed = parseActionGuide(doc);
      if (parsed) {
        return parsed;
      }
      return {
        title: doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim(),
        description: '',
        instructions: doc.guideInstructions || 'Παρακαλώ ακολούθησε τις οδηγίες που σου έστειλε ο συνεργάτης σου.'
      };
    }
    
    const guides: { [key: string]: { title: string; description: string; instructions: string } } = {
      'TAX_REP_ASSIGNMENT': {
        title: 'Ορισμός Φορολογικού Εκπροσώπου',
        description: 'Ανάθεσε σε λογιστή ή κάτοικο Ελλάδας να σε εκπροσωπεί στην εφορία. Είναι απαραίτητο για την έκδοση ΑΦΜ.',
        instructions: 'Συνδέσου στην ψηφιακή πύλη myAADE (Μητρώο & Επικοινωνία). Επίλεξε "Ορισμός Σχέσης", συμπλήρωσε το ΑΦΜ του εκπροσώπου σου και τον ρόλο "Φορολογικός Εκπρόσωπος". Μόλις το αποδεχτεί, ανέβασε το αποδεικτικό εδώ.\n\n**Σημαντικό:** Μπορείς να ορίσεις τον δικηγόρο σου ως φορολογικό εκπρόσωπο! Αυτό είναι πολύ πρακτικό γιατί:\n\n1. Ο δικηγόρος σου ήδη γνωρίζει τη συναλλαγή\n2. Μπορεί να χειρίζεται όλες τις επικοινωνίες με την εφορία\n3. Δεν χρειάζεται να βρεις ξεχωριστό λογιστή\n\n**Πώς να το κάνεις:**\n\n1. Ζήτησε από τον δικηγόρο σου το ΑΦΜ του\n2. Συνδέσου στο myAADE (aade.gr) με τους κωδικούς TaxisNet σου\n3. Πήγαινε στην ενότητα "Μητρώο & Επικοινωνία"\n4. Επίλεξε "Ορισμός Σχέσης"\n5. Εισήγαγε το ΑΦΜ του δικηγόρου σου\n6. Επίλεξε τον ρόλο "Φορολογικός Εκπρόσωπος"\n7. Ο δικηγόρος θα λάβει ειδοποίηση και θα πρέπει να αποδεχτεί\n8. Μόλις αποδεχτεί, ανέβασε το αποδεικτικό εδώ'
      },
      'DEPOSIT_TRANSFER': {
        title: 'Αποστολή Εμβάσματος Προκαταβολής',
        description: 'Μετάφερε το ποσό δέσμευσης (10%) μέσω της τράπεζάς σου για να κατοχυρώσεις το ακίνητο.',
        instructions: 'Χρησιμοποίησε το e-banking σου για να στείλεις το ποσό. **ΠΡΟΣΟΧΗ:** Στην αιτιολογία συναλλαγής γράψε οπωσδήποτε: "Προκαταβολή για αγορά ακινήτου [Διεύθυνση Ακινήτου]". Το έμβασμα πρέπει να γίνει από δικό σου λογαριασμό (όχι εταιρικός, όχι συγγενή).\n\n**Βήμα προς βήμα:**\n\n1. Συνδέσου στο e-banking της τράπεζάς σου\n2. Επίλεξε "Διεθνής Μεταφορά" ή "SEPA Transfer"\n3. Εισήγαγε το IBAN του πωλητή (θα το βρεις πατώντας "Προβολή Στοιχείων IBAN")\n4. Εισήγαγε το ποσό (συνήθως 10% της αξίας)\n5. **ΣΤΗΝ ΑΙΤΙΟΛΟΓΙΑ γράψε:** "Προκαταβολή για αγορά ακινήτου [Οδός] [Αριθμός], [Πόλη]"\n6. Επιβεβαίωσε τη μεταφορά\n7. Αναμένεις επιβεβαίωση από την τράπεζα\n8. Σημείωσε την ενέργεια ως ολοκληρωμένη'
      },
      'DOCUMENT_TRANSLATION': {
        title: 'Επίσημη Μετάφραση Εγγράφων',
        description: 'Τα ξενόγλωσσα έγγραφα (Φορολογικά, Ποινικό Μητρώο) πρέπει να μεταφραστούν επίσημα στα Ελληνικά.',
        instructions: 'Μπορείς να απευθυνθείς σε Πιστοποιημένο Μεταφραστή του Υπουργείου Εξωτερικών ή σε Δικηγόρο. Η απλή μετάφραση δεν γίνεται δεκτή από τον Συμβολαιογράφο.\n\n**Ποια έγγραφα χρειάζονται μετάφραση:**\n\n- Φορολογικά έγγραφα από τη χώρα προέλευσης\n- Ποινικό Μητρώο\n- Τυχόν άλλα νομικά έγγραφα\n\n**Πώς να βρεις μεταφραστή:**\n\n1. Πήγαινε στο https://metafraseis.services.gov.gr/\n2. Αναζήτησε πιστοποιημένους μεταφραστές\n3. Επικοινώνησε μαζί τους για προσφορά\n4. Στείλε τα έγγραφα για μετάφραση\n5. Μόλις λάβεις τις μεταφράσεις, ανέβασέ τες εδώ'
      }
    };
    
    return guides[actionType] || {
      title: doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim(),
      description: '',
      instructions: doc.guideInstructions || ''
    };
  };

  // Check user role based on property ownership
  const userRole = deal.participants?.find((p) => p.userId === userId)?.role;
  const isBuyerRole = userRole === 'BUYER';
  const isRent = (() => {
    const a = (deal.property as { amenities?: unknown })?.amenities;
    if (a && typeof a === 'object' && (a as Record<string, unknown>).listingType) {
      return String((a as Record<string, unknown>).listingType).toLowerCase() === 'rent';
    }
    if (a && typeof a === 'object' && (a as Record<string, unknown>).transactionType) {
      return String((a as Record<string, unknown>).transactionType).toLowerCase() === 'rent';
    }
    return false;
  })();
  // Engineer: use accepted ENGINEER request - never treat as NOTARY when they're the engineer
  const hasAcceptedEngineerRequest = deal.requests?.some(
    (r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id === userId
  );
  const isEngineerRole = userRole === 'ENGINEER' || hasAcceptedEngineerRequest;
  const isLawyerRole = userRole === 'LAWYER';
  const isNotaryRole = userRole === 'NOTARY';
  // Include hasAcceptedEngineerRequest: engineer may have accepted request but no DealParticipant yet
  const isProfessional = userRole === 'LAWYER' || userRole === 'NOTARY' || userRole === 'ENGINEER' || hasAcceptedEngineerRequest;
  const isSellerRole = isSeller(deal, userId);

  const normalizeCategory = (value?: string): string =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const isRentContractDraftCategory = (category?: string): boolean => {
    const normalized = normalizeCategory(category);
    const isSigned = normalized.includes('υπογεγραμ');
    const hasContractKeywords =
      normalized.includes('contract_draft') ||
      normalized.includes('συμβολαι') ||
      normalized.includes('μισθωτ') ||
      normalized.includes('μισθωσ') ||
      normalized.includes('συμφωνητ');

    return hasContractKeywords && !isSigned;
  };

  const isHtkCategory = (category?: string): boolean => {
    const normalized = normalizeCategory(category);
    return normalized.startsWith('ητκ:') || normalized.includes('ηλεκτρονικη ταυτοτητα κτηριου') || normalized.includes('htk');
  };
  
  // Find professional request for current professional to determine who invited them
  const currentProfessionalParticipant = deal.participants?.find((p) => p.userId === userId && (p.role === 'LAWYER' || p.role === 'NOTARY' || p.role === 'ENGINEER'));
  const professionalProfileId = currentProfessionalParticipant?.user?.professionalProfile?.id;
  const professionalRequest = deal.requests?.find((r) => r.professionalId === professionalProfileId && r.status === 'ACCEPTED');
  
  // Determine if professional was invited by buyer or seller
  const invitedByBuyer = professionalRequest?.requestedById === deal.buyerId;
  const invitedBySeller = professionalRequest?.requestedById === deal.sellerId;
  const defaultRequestedFromRole = invitedByBuyer ? 'BUYER' : invitedBySeller ? 'SELLER' : undefined;

  // Find buyer's and seller's lawyers (needed for document filtering)
  const buyerLawyerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
  );
  const buyerLawyerId = buyerLawyerRequest?.professional?.user?.id;
  const sellerLawyerRequest = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.sellerId
  );
  const sellerLawyerParticipant = deal.participants?.find(
    (p) => p.role === 'LAWYER' && p.userId === sellerLawyerRequest?.professional?.user?.id
  );
  const sellerLawyerId = sellerLawyerParticipant?.userId || sellerLawyerRequest?.professional?.user?.id;
  const notaryUserIds = new Set<string>([
    ...(deal.participants?.filter((p) => p.role === 'NOTARY').map((p) => p.userId) || []),
    ...(deal.requests
      ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id)
      .map((r) => r.professional!.user.id) || []),
  ]);
  
  // Document guides for buyer - mapping document categories to guides
  const documentGuides: { [key: string]: { where: string; instructions: string } } = isBuyerFromGreece ? {
    'Αστυνομική Ταυτότητα': {
      where: 'Gov.gr Wallet (εφαρμογή στο κινητό)',
      instructions: 'Κατέβασε την εφαρμογή Gov.gr Wallet. Μπορείς να εκδώσεις Ψηφιακό Αντίγραφο Ταυτότητας σε μορφή PDF, το οποίο έχει ισχύ πρωτοτύπου για τη συναλλαγή.'
    },
    'Απόδειξη ΑΦΜ': {
      where: 'Πύλη myAADE (aade.gr)',
      instructions: 'Συνδέσου στο myAADE με τους κωδικούς TaxisNet. Πήγαινε στην ενότητα "Μητρώο & Επικοινωνία" -> "Στοιχεία Μητρώου Φυσικού Προσώπου". Εκεί μπορείς να εκδώσεις σε PDF τη βεβαίωση με τα στοιχεία σου (ΑΦΜ, ΔΟΥ κ.λπ.).'
    },
    'Βεβαίωση Απόδοσης ΑΦΜ': {
      where: 'Πύλη myAADE (aade.gr)',
      instructions: 'Συνδέσου στο myAADE με τους κωδικούς TaxisNet. Πήγαινε στην ενότητα "Μητρώο & Επικοινωνία" -> "Στοιχεία Μητρώου Φυσικού Προσώπου". Εκεί μπορείς να εκδώσεις σε PDF τη βεβαίωση με τα στοιχεία σου (ΑΦΜ, ΔΟΥ κ.λπ.).'
    },
    'Εκκαθαριστικά Σημειώματα': {
      where: 'Πύλη myAADE (aade.gr)',
      instructions: 'Συνδέσου στο myAADE. Πήγαινε στην ενότητα "Εφαρμογές" -> "Φορολογικές Υπηρεσίες" -> "Δηλώσεις Φόρου Εισοδήματος Φυσικών Προσώπων". Εκεί θα βρεις τα εκκαθαριστικά των τελευταίων ετών. (Συνήθως οι τράπεζες ζητούν τα 2-3 τελευταία).'
    },
    'Εκκαθαριστικά Σημειώματα (Εκκαθαριστικό)': {
      where: 'Πύλη myAADE (aade.gr)',
      instructions: 'Συνδέσου στο myAADE. Πήγαινε στην ενότητα "Εφαρμογές" -> "Φορολογικές Υπηρεσίες" -> "Δηλώσεις Φόρου Εισοδήματος Φυσικών Προσώπων". Εκεί θα βρεις τα εκκαθαριστικά των τελευταίων ετών. (Συνήθως οι τράπεζες ζητούν τα 2-3 τελευταία).'
    },
    'Έγγραφα για Έγκριση Δανείου': {
      where: 'Υπηρεσία eGov-KYC (Know Your Customer)',
      instructions: 'Για να μη μαζεύεις χαρτιά (βεβαιώσεις μισθοδοσίας, ένσημα κ.λπ.), μπες στο gov.gr στην υπηρεσία "Συστηθείτε (eGov-KYC)". Εκεί μπορείς να δώσεις συγκατάθεση στην τράπεζά σου να τραβήξει αυτόματα όλα τα οικονομικά σου στοιχεία (εισοδήματα, ένσημα, τραπεζικούς λογαριασμούς) ψηφιακά.'
    },
    'Πληρεξούσιο': {
      where: 'Ψηφιακά στο gov.gr ή σε Συμβολαιογράφο',
      instructions: 'Για απλές ενέργειες: Μπορείς να εκδώσεις Ψηφιακή Εξουσιοδότηση μέσω του gov.gr με τους κωδικούς TaxisNet.\n\nΓια την τελική υπογραφή: Θα χρειαστείς Συμβολαιογραφικό Πληρεξούσιο. Πρέπει να κλείσεις ραντεβού με συμβολαιογράφο (φυσική παρουσία) για να συντάξετε το έγγραφο που επιτρέπει στον δικηγόρο σου ή σε τρίτο πρόσωπο να υπογράψει αντί για εσένα.'
    }
  } : {
    'Διαβατήριο': {
      where: 'Στα προσωπικά σου έγγραφα',
      instructions: 'Σκάναρε την πρώτη σελίδα (με τη φωτογραφία). Αν είσαι εκτός Ε.Ε. και βρίσκεσαι στην Ελλάδα, σκάναρε και τη σελίδα με τη σφραγίδα εισόδου (Visa/Entry Stamp).'
    },
    'Πληρεξούσιο': {
      where: 'Αν είσαι Ελλάδα: Σε οποιονδήποτε Συμβολαιογράφο. Αν είσαι Εξωτερικό: Στο Ελληνικό Προξενείο ή σε ξένο Συμβολαιογράφο (με σφραγίδα Apostille)',
      instructions: 'Για να μπορεί ο δικηγόρος στην Ελλάδα να υπογράφει, να καταθέτει αιτήσεις και να πληρώνει φόρους για λογαριασμό σου, χωρίς να ταξιδεύεις συνεχώς. Αν το εκδόσεις στο εξωτερικό, βεβαιώσου ότι έχει σφραγίδα Apostille (Σύμβαση της Χάγης) και στείλ\' το για επίσημη μετάφραση.'
    },
    'Βεβαίωση Απόδοσης ΑΦΜ': {
      where: 'Στην αρμόδια ΔΟΥ (Εφορία) Κατοίκων Εξωτερικού',
      instructions: 'Κανείς δεν μπορεί να αγοράσει περιουσιακό στοιχείο στην Ελλάδα χωρίς ΑΦΜ. Ανέβασε το έγγραφο που σου έστειλε ο Φορολογικός σου Εκπρόσωπος μετά την αίτηση στη ΔΟΥ.'
    },
    'Φορολογικά Έγγραφα Χώρας Προέλευσης': {
      where: 'Στην εφορία της χώρας σου (π.χ. HMRC για Αγγλία, IRS για ΗΠΑ)',
      instructions: 'Για την απόδειξη της πηγής των χρημάτων (Πόθεν Έσχες) και τους ελέγχους για Ξέπλυμα Χρήματος (AML). Κατέβασε τα επίσημα εκκαθαριστικά των τελευταίων 3 ετών από τη χώρα που φορολογείσαι. Απαιτείται επίσημη μετάφραση στα Ελληνικά.'
    },
    'Τραπεζική Βεβαίωση / Statement': {
      where: 'Στο e-banking της τράπεζάς σου στο εξωτερικό',
      instructions: 'Για να αποδειχθεί ότι υπάρχουν τα κεφάλαια για την αγορά. Ανέβασε ένα πρόσφατο statement που να δείχνει το υπόλοιπο του λογαριασμού σου και το όνομά σου.'
    },
    'Βεβαίωση Μόνιμης Κατοικίας': {
      where: 'Λογαριασμός ρεύματος, τηλεφώνου ή δημοτικός φόρος στη χώρα σου',
      instructions: 'Για την ταυτοποίηση (KYC) και την εγγραφή στη ΔΟΥ. Ανέβασε έναν λογαριασμό ΔΕΚΟ (Utility Bill) του τελευταίου τριμήνου.'
    },
    'Ποινικό Μητρώο': {
      where: 'Στο Υπουργείο Δικαιοσύνης ή την Αστυνομία της χώρας σου',
      instructions: 'Για την άδεια από την Αποκεντρωμένη Διοίκηση (λόγοι εθνικής ασφάλειας). Ζήτησε επίσημο αντίγραφο ποινικού μητρώου, βάλε σφραγίδα Apostille και μετάφρασέ το.'
    }
  };

  // Common document types for professional requests (for buyer)
  // Buyer document types - different for Greek residents vs non-residents
  const buyerDocumentTypes = isBuyerFromGreece ? [
    'Αστυνομική Ταυτότητα',
    'Απόδειξη ΑΦΜ',
    'Εκκαθαριστικά Σημειώματα (Εκκαθαριστικό)',
    'Έγγραφα για Έγκριση Δανείου',
    'Πληρεξούσιο',
    'Άλλο'
  ] : [
    'Διαβατήριο',
    'Πληρεξούσιο',
    'Βεβαίωση Απόδοσης ΑΦΜ',
    'Φορολογικά Έγγραφα Χώρας Προέλευσης',
    'Τραπεζική Βεβαίωση / Statement',
    'Βεβαίωση Μόνιμης Κατοικίας',
    'Ποινικό Μητρώο',
    'Άλλο'
  ];

  // Check if property is a plot
  const isPlot = deal.property?.propertyType === 'plot' || deal.property?.propertyType === 'PLOT';
  // Check if property is an apartment
  const isApartment = deal.property?.propertyType === 'apartment' || deal.property?.propertyType === 'APARTMENT';

  // Engineer predefined documents - 12 standard + custom (Κατηγορία 1-4 από product spec)
  const engineerPredefinedDocuments: Array<{ id: string; title: string; description: string; categoryLabel: string; where: string }> = [
    { id: '1', title: 'Τίτλος Κτήσης (Συμβόλαιο)', description: 'Το συμβόλαιο αγοράς, η γονική παροχή ή η αποδοχή κληρονομιάς με την οποία αποκτήθηκε το ακίνητο.', categoryLabel: 'Ιδιοκτησιακά & Φορολογικά', where: 'Προσωπείο αρχείου στο σπίτι ή Συμβολαιογράφος' },
    { id: '2', title: 'Σύσταση Οριζοντίου Ιδιοκτησίας', description: 'Το συμβολαιογραφικό έγγραφο που ορίζει τα χιλιοστά και τους κοινόχρηστους χώρους της πολυκατοικίας (απαραίτητο για διαμερίσματα).', categoryLabel: 'Ιδιοκτησιακά & Φορολογικά', where: 'Τίτλος κτήσης ή ξεχωριστό συμβόλαιο' },
    { id: '3', title: 'Αντίγραφο Κτηματολογικού Φύλλου (ΚΑΕΚ)', description: 'Το επίσημο χαρτί από το Κτηματολόγιο (ή από το ktimanet.gr) που δείχνει την εγγραφή του ακινήτου.', categoryLabel: 'Ιδιοκτησιακά & Φορολογικά', where: 'ktimanet.gr ή Κτηματολογικό Γραφείο' },
    { id: '4', title: 'Πρόσφατο Ε9 (Δήλωση Στοιχείων Ακινήτων)', description: 'Το εκκαθαριστικό του Ε9 από το TaxisNet που δείχνει πώς είναι δηλωμένο το ακίνητο στην εφορία.', categoryLabel: 'Ιδιοκτησιακά & Φορολογικά', where: 'Πύλη TaxisNet (myAADE)' },
    { id: '5', title: 'Στέλεχος Οικοδομικής Άδειας', description: 'Το βασικό έγγραφο της Πολεοδομίας που επέτρεψε την κατασκευή του κτιρίου.', categoryLabel: 'Πολεοδομικά', where: 'Συραμμένα στο συμβόλαιο ή Πολεοδομία Δήμου' },
    { id: '6', title: 'Εγκεκριμένη Κάτοψη Πολεοδομίας', description: 'Το επίσημο σχέδιο της κάτοψης (όχι σκαρίφημα) που έχει τη σφραγίδα της Πολεοδομίας.', categoryLabel: 'Πολεοδομικά', where: 'Συραμμένα στο συμβόλαιο ή Πολεοδομία Δήμου' },
    { id: '7', title: 'Τοπογραφικό Διάγραμμα', description: 'Το σχέδιο που δείχνει το οικόπεδο και τις διαστάσεις του (συνήθως συνοδεύει την οικοδομική άδεια ή το συμβόλαιο).', categoryLabel: 'Πολεοδομικά', where: 'Συραμμένα στο συμβόλαιο ή Πολεοδομία Δήμου' },
    { id: '8', title: 'Δήλωση Υπαγωγής Αυθαιρέτου (π.χ. Ν.4495/17)', description: 'Το 5σέλιδο PDF της δήλωσης τακτοποίησης από προηγούμενο μηχανικό.', categoryLabel: 'Τακτοποίηση Αυθαιρέτων', where: 'Συστήματα τακτοποίησης (αν υπάρχει αυθαιρεσία)' },
    { id: '9', title: 'Βεβαίωση Εξόφλησης Προστίμου (ή περαίωσης)', description: 'Το αποδεικτικό ότι το πρόστιμο τακτοποίησης έχει εξοφληθεί πλήρως (ή έχει πληρωθεί το 30%).', categoryLabel: 'Τακτοποίηση Αυθαιρέτων', where: 'Συστήματα τακτοποίησης' },
    { id: '10', title: 'Κάτοψεις Τακτοποίησης', description: 'Τα νέα σχέδια (κατόψεις) που κατατέθηκαν στο σύστημα αυθαιρέτων κατά την τακτοποίηση.', categoryLabel: 'Τακτοποίηση Αυθαιρέτων', where: 'Συστήματα τακτοποίησης' },
    { id: '11', title: 'Πιστοποιητικό Ενεργειακής Απόδοσης (ΠΕΑ)', description: 'Το ενεργειακό πιστοποιητικό, εφόσον υπάρχει ήδη και δεν έχει λήξει (ισχύει για 10 χρόνια).', categoryLabel: 'Διάφορα', where: 'Γραμμή αρχείου ή από συμβολαιογράφο' },
    { id: '12', title: 'Ταυτότητα Ιδιοκτήτη', description: 'Φωτοτυπία ή καθαρή φωτογραφία της Αστυνομικής Ταυτότητας (για ταυτοποίηση στο σύστημα του ΤΕΕ).', categoryLabel: 'Διάφορα', where: 'Προσωπικά έγγραφα' },
  ];
  const ENGINEER_CUSTOM_LABEL = 'Άλλο / Προσαρμοσμένο Έγγραφο';
  const engineerDocumentTypes = [...engineerPredefinedDocuments.map((d) => d.title), ENGINEER_CUSTOM_LABEL];

  // Engineer document guides - auto-filled from predefined (title = category, description = instructions)
  const engineerDocumentGuides: { [key: string]: { where: string; instructions: string } } = Object.fromEntries(
    engineerPredefinedDocuments.map((d) => [
      d.title,
      { where: d.where, instructions: d.description },
    ])
  );

  // Seller document types (for lawyer/notary)
  const sellerDocumentTypes = [
    'Τίτλος Ιδιοκτησίας',
    'Πιστοποιητικό Μεταγραφής',
    'Έγγραφα Κτηματολογίου',
    ...(isPlot ? [] : [
      'Ηλεκτρονική Ταυτότητα Κτηρίου',
      'Βεβαίωση Μηχανικού',
      'Οικοδομική Άδεια',
      'Πιστοποιητικό Ενεργειακής Απόδοσης'
    ]),
    'Πιστοποιητικό ΕΝΦΙΑ',
    'Φορολογική Ενημερότητα Πωλητή',
    'Βεβαίωση ΤΑΠ',
    'Πιστοποιητικό Μη Οφειλής Φόρου Κληρονομιάς/Δωρεάς',
    'Ασφαλιστική Ενημερότητα',
    ...(isApartment ? ['Κανονισμός Πολυκατοικίας'] : []),
    'Άλλο'
  ];

  useEffect(() => {
    fetchDocuments();
  }, [deal.id]);

  // Rent: ensure Ταυτότητα & Αποδεικτικό ΑΦΜ exist when buyer or seller visits
  useEffect(() => {
    if (!isRent || !deal.id) return;
    if (!isBuyerRole && !isSellerRole) return;
    ensureRentDocuments(deal.id)
      .then((res) => {
        if (res.created?.length) {
          fetchDocuments();
          onRefresh();
        }
      })
      .catch((err) => console.warn('Ensure rent documents:', err));
  }, [deal.id, isRent, isBuyerRole, isSellerRole]);

  useEffect(() => {
    if (!isLawyerRole && !isEngineerRole && !isNotaryRole && activeInnerTab === 'htk') {
      setActiveInnerTab('requests');
    }
  }, [activeInnerTab, isLawyerRole, isEngineerRole, isNotaryRole]);

  useEffect(() => {
    if (isEngineerRole && (activeInnerTab === 'requests' || activeInnerTab === 'incoming')) {
      setActiveInnerTab('overview');
    }
  }, [isEngineerRole, activeInnerTab]);

  useEffect(() => {
    const isLawyerFolderUser = isProfessional && isLawyerRole && (invitedBySeller || invitedByBuyer);
    if ((isLawyerFolderUser || isNotaryRole) && activeInnerTab === 'requests') {
      setActiveInnerTab('incoming');
    }
  }, [activeInnerTab, invitedBySeller, invitedByBuyer, isLawyerRole, isProfessional, isNotaryRole]);

  // Engineers only request documents in this flow (no type chooser in modal).
  useEffect(() => {
    if (showRequestModal && isEngineerRole && requestType === null) {
      setRequestType('DOCUMENT');
      setSelectedSide('SELLER');
      setSelectedActionTarget(null);
    }
  }, [showRequestModal, isEngineerRole, requestType]);

  useEffect(() => {
    const p = searchParams?.get('docsSub');
    if (p === 'htk' || p === 'folder') {
      setSellerSaleDocsSubTab(p);
    }
  }, [searchParams]);

  const setSellerSaleDocsSubTabAndUrl = (tab: SellerSaleDocsSubTab) => {
    setSellerSaleDocsSubTab(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('docsSub', tab);
    url.searchParams.set('tab', 'documents');
    const fromParam = searchParams?.get('from');
    if (fromParam) url.searchParams.set('from', fromParam);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await listDocuments(deal.id);
      // Ensure docs is always an array
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error(error.message || 'Αποτυχία φόρτωσης εγγράφων');
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (
    category: string, 
    requestedFromRole: 'BUYER' | 'SELLER',
    note?: string,
    guideWhere?: string,
    guideInstructions?: string
  ) => {
    try {
      await requestDocument(deal.id, { 
        category, 
        requestedFromRole,
        note,
        guideWhere,
        guideInstructions
      });
      toast.success('Το αίτημα εγγράφου δημιουργήθηκε');
      setShowRequestModal(false);
      setIsSellerLawyerHtkRequestFlow(false);
      fetchDocuments();
      onRefresh();
    } catch (error: any) {
      console.error('Error requesting document:', error);
      toast.error(error.message || 'Αποτυχία δημιουργίας αιτήματος');
    }
  };

  const handleUpload = async (file: File, category: string, documentId?: string) => {
    if (!file) return;

    const expandEngineerHtkTotalsAfterUpload =
      isEngineerRole &&
      activeInnerTab === 'htk' &&
      !!documentId &&
      engineerHtkPendingRequests.some((d) => d.id === documentId);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (documentId) {
        formData.append('documentId', documentId);
      } else {
        formData.append('category', category);
      }
      const uploadedDoc = await uploadDocument(deal.id, formData);
      toast.success('Το έγγραφο ανέβηκε επιτυχώς');
      setShowUploadModal(false);
      setSelectedDoc(null);
      setUploadingFile(null);
      setEngineerOwnUploadCategory('');
      setEngineerOwnUploadCustomName('');
      setIsEngineerHtkUploadFlow(false);
      setSellerLawyerUploadCategory('');
      setSellerLawyerUploadCustomName('');
      setBuyerLawyerUploadCategory('');
      setBuyerLawyerUploadCustomName('');
      
      // Fetch updated documents list FIRST so the uploaded tab has fresh data
      await fetchDocuments();
      onRefresh();

      if (expandEngineerHtkTotalsAfterUpload) {
        setLawyerHtkTotalOpen(true);
      }
      
      // Then switch to uploaded tab (after we have the new document in state)
      if (userRole === 'BUYER' || userRole === 'SELLER' || isSellerRole) {
        setActiveBuyerTab('uploaded');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Αποτυχία ανέβασματος εγγράφου');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReview = async (docId: string, status: 'APPROVED' | 'CHANGES_REQUESTED', note?: string) => {
    try {
      await reviewDocument(docId, { status, note });
      toast.success(status === 'APPROVED' ? 'Το έγγραφο εγκρίθηκε' : 'Ζητήθηκε αναθεώρηση');
      fetchDocuments();
      onRefresh();
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      toast.error(error.message || 'Αποτυχία αναθεώρησης εγγράφου');
    }
  };

  const handleDownload = async (doc: DealDocument) => {
    try {
      await downloadDocument(doc.id, doc.fileName);
      toast.success('Η λήψη ξεκίνησε');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error(error.message || 'Αποτυχία λήψης εγγράφου');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
      </div>
    );
  }

  // Group documents by status
  // Buyer: only documents requested from BUYER (his own) - never sees seller's
  // Seller: only documents requested from SELLER (his own) - never sees buyer's
  // Engineer: ONLY documents they requested (requestedById === userId) - never sees lawyer's/buyer's docs
  // Lawyer/Notary: ONLY documents/actions THEY requested (requestedById === userId) - never sees engineer's or other lawyer's
  // EXCEPTION: Seller's lawyer also sees docs the buyer's lawyer requested from seller (requestedFromRole SELLER) - so they can upload
  const isSellerLawyer = isLawyerRole && invitedBySeller;
  const isBuyerLawyer = isLawyerRole && invitedByBuyer;
  const documentsForUser = isEngineerRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId ||
          (d.requestedFromRole === 'SELLER' && isHtkCategory(d.category) && d.status === 'REQUESTED')
      )
    : isProfessional
    ? documents.filter((d) =>
        d.requestedById === userId ||
        (isSellerLawyer && buyerLawyerId && d.requestedFromRole === 'SELLER' && d.requestedById === buyerLawyerId)
      )
    : userRole === 'BUYER'
    ? documents.filter((d) => d.requestedFromRole === 'BUYER')
    : userRole === 'SELLER' || isSellerRole
    ? documents.filter((d) => d.requestedFromRole === 'SELLER')
    : documents;

  const requestedDocs = documentsForUser.filter((d) => d.status === 'REQUESTED');
  const uploadedDocs = documentsForUser.filter((d) => d.status === 'UPLOADED');
  const approvedDocs = documentsForUser.filter((d) => d.status === 'APPROVED');
  const rejectedDocs = documentsForUser.filter((d) => d.status === 'CHANGES_REQUESTED');
  const totalDocs = documentsForUser.length;

  // Documents sent by current professional
  const sentDocuments = documents.filter((d) => d.requestedById === userId);
  
  // Documents received from buyer
  // CRITICAL: Only show docs where requestedFromRole === 'BUYER' (requested FROM buyer)
  // When seller uploads, it's requestedFromRole === 'SELLER' - must NOT appear here
  const receivedFromBuyer = documents.filter((d) => {
    if (d.status === 'REQUESTED') return false;
    if (!d.uploadedById || d.uploadedById === userId) return false;

    // Engineer: only requests from SELLER, so receivedFromBuyer is always empty
    if (isEngineerRole) return false;

    // For seller in rent: docs uploaded by buyer (tenant) - includes requested docs AND voluntary uploads like signed contract
    if (isSellerRole && isRent && d.uploadedById === deal.buyerId) {
      return d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED';
    }
    if (d.requestedFromRole !== 'BUYER') return false; // Seller uploads never go here

    // For lawyers/notary: ONLY docs they requested FROM buyer, uploaded by buyer
    if (isProfessional) {
      return d.requestedById === userId && (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED');
    }
    return d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED';
  });

  // Rent: buyer docs for seller to approve (includes voluntary uploads like signed contract)
  const buyerDocsForSellerApproval = (isRent && isSellerRole)
    ? documents.filter((d) => d.uploadedById === deal.buyerId && (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED'))
    : [];

  // Rent: step 3 completed = seller approved buyer's basic documents (Ταυτότητα, ΑΦΜ, etc.)
  const isBasicDocumentsApproved = (): boolean => {
    if (!isRent || !isBuyerRole) return false;
    if (typeof window !== 'undefined' && sessionStorage.getItem(`basicDocsApproved_${deal.id}`) === 'true') return true;
    const basicCategories = ['Ταυτότητα', 'ΑΦΜ', 'Απόδειξη Εισοδήματος', 'Στοιχεία Τραπεζικού Λογαριασμού', 'IDENTITY', 'TAX_ID', 'INCOME_PROOF', 'BANK_ACCOUNT'];
    const buyerDocs = documents.filter((d) => d.requestedFromRole === 'BUYER');
    const basicDocs = buyerDocs.filter((d) => basicCategories.some((cat) => d.category.toLowerCase().includes(cat.toLowerCase())));
    const allApproved = basicDocs.length > 0 && basicDocs.every((d) => d.status === 'APPROVED');
    if (allApproved && typeof window !== 'undefined') sessionStorage.setItem(`basicDocsApproved_${deal.id}`, 'true');
    return allApproved;
  };

  // Rent: contract draft from seller (μισθωτήριο, συμβόλαιο, συμφωνητικό)
  const rentContractDraft = isRent && isBuyerRole
    ? documents.find((d) =>
        isRentContractDraftCategory(d.category) &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED') && d.fileName
      )
    : null;

  // Rent: has seller uploaded contract draft (for seller's step 4)
  const rentSellerContractDraftUploaded = isRent
    ? documents.some((d) =>
        isRentContractDraftCategory(d.category) &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED')
      )
    : false;

  // Rent: the contract draft document (for seller's "uploaded" tab display)
  const rentSellerContractDraftDoc = isRent && isSellerRole
    ? documents.find((d) =>
        isRentContractDraftCategory(d.category) &&
        (d.status === 'UPLOADED' || d.status === 'APPROVED') && d.fileName
      )
    : null;

  // Rent seller: step 4 is current when step 3 done (buyer's basic docs approved)
  const isRentSellerStep4Ready = (): boolean => {
    if (!isRent || !isSellerRole) return false;
    const basicCategories = ['Ταυτότητα', 'ΑΦΜ', 'IDENTITY', 'TAX_ID'];
    const buyerDocs = documents.filter((d) => d.requestedFromRole === 'BUYER');
    const basicDocs = buyerDocs.filter((d) => basicCategories.some((cat) => d.category.toLowerCase().includes(cat.toLowerCase())));
    return basicDocs.length > 0 && basicDocs.every((d) => d.status === 'APPROVED');
  };
  
  // Documents received from seller (or seller's lawyer)
  // CRITICAL: Only requestedFromRole === 'SELLER' - when seller uploads, they're always SELLER
  const receivedFromSeller = documents.filter((d) => {
    if (d.requestedFromRole !== 'SELLER') return false; // Buyer uploads never appear here

    // Engineer: only docs THEY requested from seller
    if (isEngineerRole) {
      if (!d.uploadedById || d.uploadedById === userId) return false;
      return d.requestedById === userId && (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED');
    }

    // Seller's lawyer: docs THEY requested from seller + docs BUYER's lawyer requested from seller (both can upload)
    if (isSellerLawyer) {
      const isFromBuyerLawyer = buyerLawyerId && d.requestedById === buyerLawyerId;
      const isFromMe = d.requestedById === userId;
      if (isFromBuyerLawyer || isFromMe) {
        // "Έγγραφα που έχω λάβει" πρέπει να δείχνει μόνο ό,τι έχει ήδη ανέβει.
        // Τα REQUESTED ανήκουν αποκλειστικά στους υποφακέλους "Έγγραφα που μου έχουν ζητήσει" / "Έγγραφα που έχω ζητήσει".
        if (d.status === 'REQUESTED') return false;
        return d.uploadedById && d.uploadedById !== userId && (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED');
      }
      return false;
    }

    // Other lawyers/notary: ONLY docs THEY requested from seller
    if (isProfessional) {
      if (!d.uploadedById || d.uploadedById === userId) return false;
      return d.requestedById === userId && (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED');
    }
    if (!d.uploadedById || d.uploadedById === userId) return false;
    return d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED';
  });

  // Engineer's own uploaded documents (collected for the deal - not responses to requests)
  const engineerOwnUploads = isEngineerRole
    ? documents.filter((d) => d.uploadedById === userId && !d.requestedById && d.status !== 'REQUESTED')
    : [];
  // Engineer's requested documents (pending - status REQUESTED)
  const engineerRequestedDocs = isEngineerRole ? requestedDocs : [];
  // Engineer's received documents (requested by engineer, uploaded by seller/others)
  const engineerReceivedDocs = isEngineerRole ? [...receivedFromBuyer, ...receivedFromSeller] : [];
  // Engineer's total: approved by engineer + uploaded by engineer (for Συνολικά Έγγραφα)
  const engineerApprovedDocs = isEngineerRole
    ? documents.filter((d) => d.reviewById === userId && d.status === 'APPROVED')
    : [];
  const engineerTotalDocs = isEngineerRole
    ? Array.from(new Map([...engineerApprovedDocs, ...engineerOwnUploads].map((d) => [d.id, d])).values())
    : [];

  // Lawyer HTK view:
  // Show only documents approved by engineer OR uploaded by current lawyer.
  const engineerUserIds = new Set<string>([
    ...(deal.participants?.filter((p) => p.role === 'ENGINEER').map((p) => p.userId) || []),
    ...(deal.requests
      ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id)
      .map((r) => r.professional!.user.id) || []),
  ]);

  /** Ίδια σύνολα με τον υποφάκελο «Συνολικά Έγγραφα» ΗΤΚ του μηχανικού (ένας μηχανικός). */
  const buildEngineerHtkTotalDocsForUserId = (engineUserId: string) =>
    Array.from(
      new Map(
        [
          ...documents.filter(
            (d) =>
              isHtkCategory(d.category) &&
              d.reviewById === engineUserId &&
              d.status === 'APPROVED'
          ),
          ...documents.filter(
            (d) =>
              isHtkCategory(d.category) &&
              d.uploadedById === engineUserId &&
              d.status !== 'REQUESTED'
          ),
          ...documents.filter(
            (d) =>
              isHtkCategory(d.category) &&
              d.requestedFromRole === 'SELLER' &&
              d.requestedById === engineUserId &&
              !!d.uploadedById &&
              d.uploadedById !== engineUserId &&
              (d.status === 'UPLOADED' || d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED')
          ),
        ].map((d) => [d.id, d])
      ).values()
    );

  const sellerIdForPrimaryEngineer =
    deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId || null;
  const primarySellerSideEngineerUserId =
    deal.requests?.find(
      (r) =>
        r.status === 'ACCEPTED' &&
        r.type === 'ENGINEER' &&
        r.requestedById === sellerIdForPrimaryEngineer &&
        r.professional?.user?.id
    )?.professional?.user?.id ?? null;

  const sellerLawyerMirrorEngineerHtkTotals: DealDocument[] = (() => {
    if (primarySellerSideEngineerUserId) {
      return buildEngineerHtkTotalDocsForUserId(primarySellerSideEngineerUserId);
    }
    const map = new Map<string, DealDocument>();
    for (const eid of engineerUserIds) {
      for (const d of buildEngineerHtkTotalDocsForUserId(eid)) {
        map.set(d.id, d);
      }
    }
    return Array.from(map.values());
  })();
  const engineerApprovedForLawyer = isLawyerRole
    ? documents.filter(
        (d) => d.status === 'APPROVED' && !!d.reviewById && engineerUserIds.has(d.reviewById)
      )
    : [];
  const lawyerOwnUploads = isLawyerRole
    ? documents.filter((d) => d.uploadedById === userId && d.status !== 'REQUESTED' && isHtkCategory(d.category))
    : [];
  const lawyerHtkTotalDocs = isLawyerRole
    ? Array.from(
        new Map([...engineerApprovedForLawyer, ...lawyerOwnUploads].map((d) => [d.id, d])).values()
      )
    : [];

  const sellerLawyerUploadedDocs = isSellerLawyer
    ? documents.filter(
        (d) => d.uploadedById === userId && d.status !== 'REQUESTED' && !isHtkCategory(d.category)
      )
    : [];
  /** Αιτήματα προς πωλητή από το modal — μόνο εκκρεμή· μετά το ανέβασμα από άλλον βγαίνουν από εδώ */
  const sellerLawyerRequestedDocs = isSellerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category) &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];
  const sellerLawyerRequestedFromBuyerLawyerDocs = isSellerLawyer
    ? documents.filter(
        (d) =>
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category) &&
          !!d.requestedById &&
          ((!!buyerLawyerId && d.requestedById === buyerLawyerId) ||
            engineerUserIds.has(d.requestedById) ||
            notaryUserIds.has(d.requestedById)) &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];
  const sellerLawyerApprovedDocs = isSellerLawyer
    ? documents.filter(
        (d) => d.reviewById === userId && d.status === 'APPROVED' && !isHtkCategory(d.category)
      )
    : [];
  /** Απαντήσεις σε δικά σου αιτήματα (πωλητής/άλλος) — εμφανίζονται στα Συνολικά χωρίς υποχρεωτική έγκριση */
  const sellerLawyerFulfilledByOthersForMyRequests = isSellerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category) &&
          !!d.uploadedById &&
          d.uploadedById !== userId &&
          (d.status === 'UPLOADED' || d.status === 'APPROVED')
      )
    : [];
  const sellerLawyerTotalDocs = isSellerLawyer
    ? Array.from(
        new Map(
          [
            ...sellerLawyerApprovedDocs,
            ...sellerLawyerUploadedDocs,
            ...sellerLawyerFulfilledByOthersForMyRequests,
          ].map((d) => [d.id, d])
        ).values()
      )
    : [];

  /** Ανεβασμένα από αγοραστή για αιτήματα του δικηγόρου αγοραστή, σε αναμονή έγκρισης — εμφανίζονται στα Συνολικά */
  const buyerLawyerPendingApprovalFromBuyer = isBuyerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'BUYER' &&
          d.status === 'UPLOADED' &&
          !!d.uploadedById &&
          d.uploadedById !== userId
      )
    : [];
  const buyerLawyerUploadedDocs = isBuyerLawyer
    ? documents.filter((d) => d.uploadedById === userId && d.status !== 'REQUESTED')
    : [];
  const buyerLawyerRequestedDocs = isBuyerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'BUYER' &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];
  /** Αιτήματα προς φάκελο αγοραστή από δικηγόρο πωλητή, συμβολαιογράφο ή μηχανικό — ο δικηγόρος αγοραστή τα καλύπτει με ανέβασμα */
  const buyerLawyerIncomingBuyerFolderRequests = isBuyerLawyer
    ? documents.filter(
        (d) =>
          d.requestedFromRole === 'BUYER' &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED') &&
          !!d.requestedById &&
          d.requestedById !== userId &&
          ((!!sellerLawyerId && d.requestedById === sellerLawyerId) ||
            engineerUserIds.has(d.requestedById) ||
            notaryUserIds.has(d.requestedById))
      )
    : [];
  const buyerLawyerApprovedDocs = isBuyerLawyer
    ? documents.filter((d) => d.reviewById === userId && d.status === 'APPROVED')
    : [];
  const buyerLawyerTotalDocs = isBuyerLawyer
    ? Array.from(
        new Map(
          [...buyerLawyerApprovedDocs, ...buyerLawyerUploadedDocs, ...buyerLawyerPendingApprovalFromBuyer].map((d) => [
            d.id,
            d,
          ])
        ).values()
      )
    : [];
  const buyerFolderUploadedByBuyerLawyer = buyerLawyerId
    ? documents.filter(
        (d) =>
          d.uploadedById === buyerLawyerId &&
          d.status !== 'REQUESTED'
      )
    : [];
  const buyerFolderApprovedByBuyerLawyerFromBuyer = buyerLawyerId && deal.buyerId
    ? documents.filter(
        (d) =>
          d.uploadedById === deal.buyerId &&
          d.reviewById === buyerLawyerId &&
          d.status === 'APPROVED'
      )
    : [];
  const buyerFolderSharedTotalDocs = Array.from(
    new Map(
      [...buyerFolderUploadedByBuyerLawyer, ...buyerFolderApprovedByBuyerLawyerFromBuyer].map((d) => [d.id, d])
    ).values()
  );

  /** Μόνο εκκρεμή αιτήματα — μετά το ανέβασμα (UPLOADED) βγαίνουν από εδώ και μένουν μόνο στα Συνολικά */
  const buyerRequestedByBuyerLawyerDocs = isBuyerRole && !!buyerLawyerId
    ? documents.filter(
        (d) =>
          d.requestedFromRole === 'BUYER' &&
          d.requestedById === buyerLawyerId &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];
  const buyerUploadedByBuyerLawyerDocs = isBuyerRole && !!buyerLawyerId
    ? documents.filter((d) => d.uploadedById === buyerLawyerId && d.status !== 'REQUESTED')
    : [];
  /** Ανεβασμένα από τον αγοραστή για αιτήματα του δικηγόρου του — εμφανίζονται στα Συνολικά αμέσως (UPLOADED ή APPROVED) */
  const buyerSelfUploadedForTotalDocs = isBuyerRole && !!buyerLawyerId
    ? documents.filter(
        (d) =>
          d.requestedFromRole === 'BUYER' &&
          d.requestedById === buyerLawyerId &&
          d.uploadedById === userId &&
          (d.status === 'UPLOADED' || d.status === 'APPROVED')
      )
    : [];
  const buyerTotalFolderDocs = isBuyerRole
    ? Array.from(
        new Map(
          [...buyerUploadedByBuyerLawyerDocs, ...buyerSelfUploadedForTotalDocs].map((d) => [d.id, d])
        ).values()
      )
    : [];

  const sellerLawyerUploadedForBuyerLawyer = isBuyerLawyer && sellerLawyerId
    ? documents.filter(
        (d) =>
          d.uploadedById === sellerLawyerId && d.status !== 'REQUESTED' && !isHtkCategory(d.category)
      )
    : [];
  const sellerLawyerApprovedForBuyerLawyer = isBuyerLawyer && sellerLawyerId
    ? documents.filter(
        (d) =>
          d.reviewById === sellerLawyerId &&
          d.status === 'APPROVED' &&
          !isHtkCategory(d.category)
      )
    : [];
  /** Καθρέφτης του sellerLawyerFulfilledByOthersForMyRequests: απαντήσεις πωλητή/άλλου στα αιτήματα του δικηγόρου πωλητή */
  const sellerLawyerFulfilledForBuyerLawyerView =
    isBuyerLawyer && sellerLawyerId
      ? documents.filter(
          (d) =>
            d.requestedById === sellerLawyerId &&
            d.requestedFromRole === 'SELLER' &&
            !isHtkCategory(d.category) &&
            !!d.uploadedById &&
            d.uploadedById !== sellerLawyerId &&
            (d.status === 'UPLOADED' || d.status === 'APPROVED')
        )
      : [];
  const sellerFolderTotalForBuyerLawyer = isBuyerLawyer
    ? Array.from(
        new Map(
          [
            ...sellerLawyerUploadedForBuyerLawyer,
            ...sellerLawyerApprovedForBuyerLawyer,
            ...sellerLawyerFulfilledForBuyerLawyerView,
          ].map((d) => [d.id, d])
        ).values()
      )
    : [];
  const buyerLawyerSellerPendingRequests = isBuyerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          d.status === 'REQUESTED'
      )
    : [];

  const sellerLawyerBuyerPendingRequests = isSellerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'BUYER' &&
          d.status === 'REQUESTED'
      )
    : [];
  const sellerLawyerBuyerDocsToApprove = isSellerLawyer
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'BUYER' &&
          d.status === 'UPLOADED'
      )
    : [];
  const sellerLawyerBuyerTotalDocs = isSellerLawyer
    ? buyerFolderSharedTotalDocs
    : [];

  const sellerLawyerHtkPendingRequests = isLawyerRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          isHtkCategory(d.category) &&
          d.status === 'REQUESTED'
      )
    : [];
  const sellerLawyerHtkUploadedByEngineer = isLawyerRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          isHtkCategory(d.category) &&
          d.status !== 'REQUESTED' &&
          !!d.uploadedById &&
          engineerUserIds.has(d.uploadedById)
      )
    : [];
  /** ΗΤΚ που εγκρίνει ο δικηγόρος πωλητή (π.χ. ανέβασμα μηχανικού) — μόνο στο tab ΗΤΚ, όχι στα γενικά Συνολικά */
  const sellerLawyerHtkApprovedBySellerLawyer = isLawyerRole
    ? documents.filter(
        (d) =>
          isHtkCategory(d.category) && d.reviewById === userId && d.status === 'APPROVED'
      )
    : [];
  const sellerLawyerHtkTotalDocs = isSellerLawyer
    ? sellerLawyerMirrorEngineerHtkTotals
    : isLawyerRole
      ? Array.from(
          new Map(
            [
              ...lawyerHtkTotalDocs,
              ...sellerLawyerHtkUploadedByEngineer,
              ...sellerLawyerHtkApprovedBySellerLawyer,
            ].map((d) => [d.id, d])
          ).values()
        )
      : lawyerHtkTotalDocs;
  const engineerHtkPendingRequests = isEngineerRole
    ? documents.filter((d) => {
        if (d.status !== 'REQUESTED') return false;
        if (!isHtkCategory(d.category)) return false;
        if (!d.requestedById || d.requestedById === userId) return false;

        const requestedBySellerLawyer = !!sellerLawyerId && d.requestedById === sellerLawyerId;
        const requestedByBuyerLawyer = !!buyerLawyerId && d.requestedById === buyerLawyerId;
        const requestedByBuyer = !!deal.buyerId && d.requestedById === deal.buyerId;
        const requestedByNotary = notaryUserIds.has(d.requestedById);

        return requestedBySellerLawyer || requestedByBuyerLawyer || requestedByBuyer || requestedByNotary;
      })
    : [];
  const engineerHtkRequestedByMeDocs = isEngineerRole
    ? engineerRequestedDocs.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          isHtkCategory(d.category)
      )
    : [];
  const engineerSellerPendingRequests = isEngineerRole
    ? engineerRequestedDocs.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category)
      )
    : [];
  /** Ίδια «Συνολικά Έγγραφα» ΗΤΚ με τον μηχανικό του deal (`sellerLawyerMirrorEngineerHtkTotals` = καθρέφτης μηχανικού). */
  const buyerLawyerHtkTotalDocs = isBuyerLawyer ? sellerLawyerMirrorEngineerHtkTotals : [];
  /** Συνολικά ΗΤΚ μηχανικού — ίδια λογική με `buildEngineerHtkTotalDocsForUserId`. */
  const engineerHtkTotalDocs =
    isEngineerRole && userId ? buildEngineerHtkTotalDocsForUserId(userId) : [];
  const htkPendingRequestsForCurrentRole = isEngineerRole ? engineerHtkPendingRequests : sellerLawyerHtkPendingRequests;
  const htkTotalDocsForCurrentRole = isEngineerRole
    ? engineerHtkTotalDocs
    : isBuyerLawyer
    ? buyerLawyerHtkTotalDocs
    : sellerLawyerHtkTotalDocs;

  /** Sale seller: same folder splits as lawyer/engineer (non-HTK vs HTK), read-only professional actions */
  const showSellerSaleFolderTabs = isSellerRole && !isRent;
  const sellerIdForEngineerLookup = deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
  const sellerEngineerRequestForSellerView = deal.requests?.find(
    (r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerIdForEngineerLookup
  );
  const sellerEngineerUserId = sellerEngineerRequestForSellerView?.professional?.user?.id;
  const slMirrorId = sellerLawyerId;

  /**
   * Πωλητής — φάκελος πωλητή (μη-ΗΤΚ), fallback όταν δεν υπάρχει δικηγόρος πωλητή:
   * ολοκληρωμένα αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο.
   */
  const isSellerFolderRequesterWhenNoSellerLawyer = (requestedById: string | undefined | null) => {
    if (!requestedById) return false;
    return (
      (!!buyerLawyerId && requestedById === buyerLawyerId) ||
      engineerUserIds.has(requestedById) ||
      notaryUserIds.has(requestedById)
    );
  };

  /**
   * Καθρέφτης «Συνολικά Έγγραφα» φακέλου πωλητή όπως ο δικηγόρος πωλητή (μη-ΗΤΚ):
   * με δικηγόρο → εγκεκριμένα/ανεβασμένα από αυτόν + απαντήσεις πωλητή στα αιτήματά του·
   * χωρίς δικηγόρο → όλα τα μη-ΗΤΚ προς πωλητή από δικ. αγοραστή / μηχανικό / συμβολαιογράφο.
   */
  const sellerFolderTotalMirrorForSellerLawyerView = sellerLawyerId
    ? Array.from(
        new Map(
          [
            ...documents.filter(
              (d) =>
                !isHtkCategory(d.category) &&
                d.reviewById === sellerLawyerId &&
                d.status === 'APPROVED'
            ),
            ...documents.filter(
              (d) =>
                !isHtkCategory(d.category) &&
                d.uploadedById === sellerLawyerId &&
                d.status !== 'REQUESTED'
            ),
            ...documents.filter(
              (d) =>
                d.requestedById === sellerLawyerId &&
                d.requestedFromRole === 'SELLER' &&
                !isHtkCategory(d.category) &&
                !!d.uploadedById &&
                d.uploadedById !== sellerLawyerId &&
                (d.status === 'UPLOADED' || d.status === 'APPROVED')
            ),
          ].map((d) => [d.id, d])
        ).values()
      )
    : Array.from(
        new Map(
          documents
            .filter(
              (d) =>
                d.requestedFromRole === 'SELLER' &&
                !isHtkCategory(d.category) &&
                (d.status === 'UPLOADED' || d.status === 'APPROVED') &&
                isSellerFolderRequesterWhenNoSellerLawyer(d.requestedById)
            )
            .map((d) => [d.id, d])
        ).values()
      );

  /** Συμβολαιογράφος — εκκρεμή αιτήματα προς πλευρά αγοραστή (όχι ΗΤΚ). */
  const notaryBuyerFolderPendingDocs = isNotaryRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'BUYER' &&
          !isHtkCategory(d.category) &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];

  /** Ίδια «Συνολικά Έγγραφα» με τον φάκελο αγοραστή του δικηγόρου αγοραστή. */
  const notaryBuyerFolderTotalMirror =
    isNotaryRole && buyerLawyerId
      ? Array.from(
          new Map(
            [
              ...documents.filter((d) => d.reviewById === buyerLawyerId && d.status === 'APPROVED'),
              ...documents.filter((d) => d.uploadedById === buyerLawyerId && d.status !== 'REQUESTED'),
              ...documents.filter(
                (d) =>
                  d.requestedById === buyerLawyerId &&
                  d.requestedFromRole === 'BUYER' &&
                  d.status === 'UPLOADED' &&
                  !!d.uploadedById &&
                  d.uploadedById !== buyerLawyerId
              ),
            ].map((d) => [d.id, d])
          ).values()
        )
      : [];

  /** Συμβολαιογράφος — εκκρεμή αιτήματα προς πλευρά πωλητή (μη-ΗΤΚ). */
  const notarySellerFolderPendingDocs = isNotaryRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category) &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];

  /** Ίδια «Συνολικά» φακέλου πωλητή με την προβολή δικηγόρου αγοραστή / δικηγόρου πωλητή. */
  const notarySellerFolderTotalMirror = isNotaryRole ? sellerFolderTotalMirrorForSellerLawyerView : [];

  /** ΗΤΚ: μόνο αιτήματα που έχει βάλει ο συμβολαιογράφος (προς μηχανικό / πλευρά πωλητή), όχι αιτήματα μηχανικού προς πωλητή. */
  const notaryHtkPendingDocs = isNotaryRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          isHtkCategory(d.category) &&
          (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
      )
    : [];

  const notaryHtkTotalMirror = isNotaryRole ? sellerLawyerMirrorEngineerHtkTotals : [];

  /** Απαντήσεις πωλητή σε δικά σου αιτήματα (μη-ΗΤΚ) — με δικηγόρο πωλητή δεν μπαίνουν στον καθρέφτη του δικηγόρου */
  const engineerSellerFulfilledBySellerDocs = isEngineerRole
    ? documents.filter(
        (d) =>
          d.requestedById === userId &&
          d.requestedFromRole === 'SELLER' &&
          !isHtkCategory(d.category) &&
          !!d.uploadedById &&
          d.uploadedById !== userId &&
          (d.status === 'UPLOADED' || d.status === 'APPROVED')
      )
    : [];

  const engineerSellerTotalDocs = isEngineerRole
    ? Array.from(
        new Map(
          [...sellerFolderTotalMirrorForSellerLawyerView, ...engineerSellerFulfilledBySellerDocs].map((d) => [
            d.id,
            d,
          ])
        ).values()
      )
    : [];

  /**
   * «Έγγραφα που μου έχουν ζητήσει»: μη-ΗΤΚ, προς πωλητή, εκκρεμή.
   * Με δικηγόρο πωλητή → μόνο αιτήματα που έχει βάλει ο δικός σας δικηγόρος (Φάκελος πωλητή → Ζητήστε έγγραφο).
   * Χωρίς δικηγόρο πωλητή → αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο (ίδια ροή).
   */
  const sellerFolderPendingFromPros =
    showSellerSaleFolderTabs
      ? documents.filter((d) => {
          if (d.requestedFromRole !== 'SELLER') return false;
          if (isHtkCategory(d.category)) return false;
          if (d.status !== 'REQUESTED' && d.status !== 'CHANGES_REQUESTED') return false;
          const rb = d.requestedById;
          if (!rb) return false;
          if (slMirrorId) {
            return rb === slMirrorId;
          }
          return isSellerFolderRequesterWhenNoSellerLawyer(rb);
        })
      : [];

  /**
   * Ίδια λίστα με τον υποφάκελο «Συνολικά Έγγραφα» του δικηγόρου πωλητή (μη-ΗΤΚ μόνο).
   * ΗΤΚ εμφανίζονται αποκλειστικά στο υπο-tab «Ηλεκτρονική ταυτότητα κτηρίου».
   */
  const sellerFolderTotalForSeller =
    showSellerSaleFolderTabs && slMirrorId
      ? Array.from(
          new Map(
            [
              ...documents.filter(
                (d) =>
                  !isHtkCategory(d.category) &&
                  d.reviewById === slMirrorId &&
                  d.status === 'APPROVED'
              ),
              ...documents.filter(
                (d) =>
                  !isHtkCategory(d.category) &&
                  d.uploadedById === slMirrorId &&
                  d.status !== 'REQUESTED'
              ),
              // Ανέβασμα απευθείας από τον πωλητή (μη-ΗΤΚ): εμφανίζονται στα Συνολικά χωρίς έγκριση δικηγόρου
              ...documents.filter((d) => {
                if (isHtkCategory(d.category)) return false;
                if (d.requestedFromRole !== 'SELLER') return false;
                if (d.status !== 'UPLOADED' && d.status !== 'APPROVED') return false;
                if (d.uploadedById !== userId) return false;
                const rb = d.requestedById;
                if (!rb) return false;
                return rb === slMirrorId || isSellerFolderRequesterWhenNoSellerLawyer(rb);
              }),
            ].map((d) => [d.id, d])
          ).values()
        )
      : showSellerSaleFolderTabs
        ? Array.from(
            new Map(
              documents
                .filter(
                  (d) =>
                    d.requestedFromRole === 'SELLER' &&
                    !isHtkCategory(d.category) &&
                    (d.status === 'UPLOADED' || d.status === 'APPROVED') &&
                    isSellerFolderRequesterWhenNoSellerLawyer(d.requestedById)
                )
                .map((d) => [d.id, d])
            ).values()
          )
        : [];

  /** Μόνο «Συνολικά Έγγραφα» — για ετικέτες υπο-tabs Φάκελος Πωλητή */
  const sellerFolderTabDocCount = sellerFolderTotalForSeller.length;

  const engMirrorId = sellerEngineerUserId;

  /** Πωλητής — ΗΤΚ: μόνο αιτήματα που έχει βάλει ο μηχανικός (ΗΤΚ → Ζητήστε έγγραφο), προς πωλητή */
  const sellerHtkPendingFromEngineerOnly =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) =>
            isHtkCategory(d.category) &&
            d.requestedFromRole === 'SELLER' &&
            d.requestedById === engMirrorId &&
            (d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED')
        )
      : [];

  const sellerMirrorEngineerHtkApprovedByMeDocs =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) => d.reviewById === engMirrorId && d.status === 'APPROVED' && isHtkCategory(d.category)
        )
      : [];

  const sellerMirrorEngineerHtkUploadedByMeDocs =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) => d.uploadedById === engMirrorId && d.status !== 'REQUESTED' && isHtkCategory(d.category)
        )
      : [];

  /** Ανεβασμένα από τον πωλητή για αιτήματα ΗΤΚ του μηχανικού — εμφανίζονται στα «Συνολικά» μετά το ανέβασμα */
  const sellerMirrorEngineerHtkUploadedBySellerForEngRequest =
    showSellerSaleFolderTabs && engMirrorId
      ? documents.filter(
          (d) =>
            isHtkCategory(d.category) &&
            d.requestedFromRole === 'SELLER' &&
            d.requestedById === engMirrorId &&
            d.uploadedById === userId &&
            d.status !== 'REQUESTED' &&
            d.status !== 'CHANGES_REQUESTED'
        )
      : [];

  const sellerMirrorEngineerHtkTotalDocs =
    showSellerSaleFolderTabs && engMirrorId
      ? Array.from(
          new Map(
            [
              ...sellerMirrorEngineerHtkApprovedByMeDocs,
              ...sellerMirrorEngineerHtkUploadedByMeDocs,
              ...sellerMirrorEngineerHtkUploadedBySellerForEngRequest,
            ].map((d) => [d.id, d])
          ).values()
        )
      : [];

  /** Μόνο «Συνολικά Έγγραφα» ΗΤΚ — για ετικέτα υπο-tab ΗΤΚ */
  const sellerHtkTabDocCount =
    showSellerSaleFolderTabs && engMirrorId ? sellerMirrorEngineerHtkTotalDocs.length : 0;

  // Check which documents are already requested (by current professional)
  const alreadyRequestedCategories = new Set(
    documents
      .filter((d) => d.requestedById === userId && d.status === 'REQUESTED')
      .map((d) => d.category)
  );

  // Documents sent to buyer (by professional)
  const sentToBuyer = documents.filter((d) => 
    d.requestedFromRole === 'BUYER' && d.requestedById === userId
  );

  // Documents sent to seller (by professional)
  const sentToSeller = documents.filter((d) => 
    d.requestedFromRole === 'SELLER' && d.requestedById === userId
  );

  // Keep seller-lawyer foreign requests out of professional overview.
  // In professional context we only show current user's own sent/received items.
  const sentBySellerLawyer: DealDocument[] = [];

  // All documents grouped by direction
  const allDocumentsByDirection = {
    received: {
      fromBuyer: receivedFromBuyer,
      fromSeller: receivedFromSeller,
    },
    sent: {
      toBuyer: sentToBuyer,
      toSeller: sentToSeller,
      bySellerLawyer: sentBySellerLawyer,
    }
  };

  // Helper to get participant name by userId
  const getParticipantName = (participantUserId: string | undefined) => {
    if (!participantUserId) return 'Άγνωστος';
    const participant = deal.participants?.find((p) => p.userId === participantUserId);
    return participant?.user?.name || 'Άγνωστος';
  };

  // Helper to get role label
  const getRoleLabel = (role: 'BUYER' | 'SELLER' | undefined) => {
    if (role === 'BUYER') return 'Αγοραστής';
    if (role === 'SELLER') return 'Πωλητής';
    return 'Άγνωστος';
  };

  const removeSellerFolderTotalDoc = (doc: DealDocument) => {
    setProfessionalDeleteTarget({ doc, variant: 'sellerFolder' });
    setShowProfessionalDeleteModal(true);
  };

  const removeEngineerHtkTotalDoc = (doc: DealDocument) => {
    setProfessionalDeleteTarget({ doc, variant: 'engineerHtk' });
    setShowProfessionalDeleteModal(true);
  };

  const closeProfessionalDeleteModal = () => {
    if (professionalDeleteSubmitting) return;
    setShowProfessionalDeleteModal(false);
    setProfessionalDeleteTarget(null);
  };

  const confirmProfessionalDelete = async () => {
    if (!professionalDeleteTarget) return;
    setProfessionalDeleteSubmitting(true);
    try {
      await deleteDocument(professionalDeleteTarget.doc.id);
      toast.success(
        professionalDeleteTarget.variant === 'engineerHtk'
          ? 'Το έγγραφο διαγράφηκε'
          : 'Το έγγραφο αφαιρέθηκε'
      );
      setShowProfessionalDeleteModal(false);
      setProfessionalDeleteTarget(null);
      await fetchDocuments();
      onRefresh();
    } catch (error: unknown) {
      console.error('Error deleting document:', error);
      const message = error instanceof Error ? error.message : 'Αποτυχία';
      toast.error(message);
    } finally {
      setProfessionalDeleteSubmitting(false);
    }
  };

  /** Για «Ζητήθηκε από: …» στα εισερχόμενα αιτήματα φακέλου αγοραστή (προβολή δικηγόρου αγοραστή) */
  const getBuyerFolderIncomingRequesterLabel = (requestedById: string | undefined | null) => {
    if (!requestedById) return 'Άγνωστος';
    if (sellerLawyerId && requestedById === sellerLawyerId) return 'Δικηγόρο Πωλητή';
    if (engineerUserIds.has(requestedById)) return 'Μηχανικό';
    if (notaryUserIds.has(requestedById)) return 'Συμβολαιογράφο';
    return getParticipantName(requestedById);
  };

  /** Αιτών προς πωλητή (όχι ο δικηγόρος πωλητή) — για «Ζητήθηκε από: …» στον φάκελο πωλητή */
  const getSellerFolderExternalRequesterLabel = (requestedById: string | undefined | null) => {
    if (!requestedById) return 'Άγνωστος';
    if (buyerLawyerId && requestedById === buyerLawyerId) return 'Δικηγόρο Αγοραστή';
    if (engineerUserIds.has(requestedById)) return 'Μηχανικό';
    if (notaryUserIds.has(requestedById)) return 'Συμβολαιογράφο';
    return getParticipantName(requestedById);
  };

  // Render document row
  const renderDocRow = (
    doc: DealDocument,
    options?: { hideUpload?: boolean; hideReviewActions?: boolean; showSellerFolderTotalTrash?: boolean }
  ) => (
    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl border border-gray-200 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="font-semibold text-gray-900 text-base">{doc.category}</div>
        </div>
        {doc.fileName && (
          <div className="text-sm text-gray-600 mt-1 truncate flex items-center gap-2">
            <FaFileAlt className="text-xs text-gray-400" />
            {doc.fileName}
          </div>
        )}
        {doc.uploadedById && (
          <div className="text-xs text-gray-500 mt-1">
            Ανέβηκε από: {getParticipantName(doc.uploadedById)}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Ενημερώθηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
        {doc.reviewNote && (
          <div className={`text-sm mt-2 p-2.5 rounded-lg border ${
            doc.status === 'CHANGES_REQUESTED' ? 'text-red-800 bg-red-50 border-red-200' : 'text-yellow-800 bg-yellow-50 border-yellow-200'
          }`}>
            <span className="font-medium">Σχόλιο:</span> {doc.reviewNote}
          </div>
        )}
      </div>
      <div className="flex gap-2 ml-4 flex-shrink-0">
        {/* Download button for uploaded documents - show for all uploaded statuses (UPLOADED, APPROVED, CHANGES_REQUESTED) */}
        {doc.fileName && (doc.status === 'UPLOADED' || doc.status === 'APPROVED' || doc.status === 'CHANGES_REQUESTED') && (
          <button
            onClick={() => handleDownload(doc)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Λήψη"
          >
            <FaDownload />
          </button>
        )}
        {isProfessional && doc.status === 'UPLOADED' && !options?.hideReviewActions && (
          <>
            <button
              onClick={() => handleReview(doc.id, 'APPROVED')}
              className="p-2 text-green-600 hover:bg-green-50 rounded"
              title="Έγκριση"
            >
              <FaCheckCircle />
            </button>
            <button
              onClick={() => handleReview(doc.id, 'CHANGES_REQUESTED', 'Απαιτείται αναθεώρηση')}
              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
              title="Αναθεώρηση"
            >
              <FaTimesCircle />
            </button>
          </>
        )}
        {!options?.hideUpload && (doc.status === 'REQUESTED' || doc.status === 'CHANGES_REQUESTED') &&
          ((doc.requestedFromRole === 'BUYER' && userRole === 'BUYER') ||
           (doc.requestedFromRole === 'SELLER' &&
             (isSellerRole || (isSellerLawyer && doc.requestedById !== userId)))) && (
            <button
              onClick={() => {
                setSelectedDoc(doc);
                setShowUploadModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <FaUpload className="inline mr-1" />
              {doc.status === 'CHANGES_REQUESTED' ? 'Επανανέβασμα' : 'Ανέβασμα'}
            </button>
          )}
        {/* Delete button for REQUESTED documents sent by current professional */}
        {isProfessional && doc.status === 'REQUESTED' && doc.requestedById === userId && (
          <button
            onClick={async () => {
              if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αίτημα "${doc.category}";`)) {
                return;
              }
              try {
                await deleteDocument(doc.id);
                toast.success('Το αίτημα διαγράφηκε επιτυχώς');
                fetchDocuments();
                onRefresh();
              } catch (error: any) {
                console.error('Error deleting document:', error);
                toast.error(error.message || 'Αποτυχία διαγραφής αιτήματος');
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Διαγραφή Αιτήματος"
          >
            <FaTrash />
            </button>
          )}
        {options?.showSellerFolderTotalTrash && (
          <button
            type="button"
            onClick={() => removeSellerFolderTotalDoc(doc)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Αφαίρεση από Συνολικά Έγγραφα"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Inner Tabs - Only show for professionals */}
      {isProfessional ? (
        <>
          {/* Inner Tabs Navigation */}
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            {!isSellerLawyer && !isBuyerLawyer && !isEngineerRole && !isNotaryRole && (
              <button
                onClick={() => setActiveInnerTab('requests')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeInnerTab === 'requests'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Αιτήματα ({requestedDocs.length})
              </button>
            )}
            {!isEngineerRole && (
              <button
                onClick={() => setActiveInnerTab('incoming')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeInnerTab === 'incoming'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isBuyerLawyer
                  ? `Φάκελος Αγοραστή (${buyerLawyerTotalDocs.length})`
                  : isSellerLawyer
                  ? `Φάκελος Αγοραστή (${sellerLawyerBuyerTotalDocs.length})`
                  : isNotaryRole
                  ? `Φάκελος Αγοραστή (${notaryBuyerFolderTotalMirror.length})`
                  : `Εισερχόμενα (${receivedFromBuyer.length + receivedFromSeller.length})`}
              </button>
            )}
            <button
              onClick={() => setActiveInnerTab('overview')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeInnerTab === 'overview'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isEngineerRole
                ? `Φάκελος Πωλητή (${engineerSellerTotalDocs.length})`
                : (isSellerLawyer || isBuyerLawyer)
                ? `Φάκελος Πωλητή (${
                    isSellerLawyer ? sellerLawyerTotalDocs.length : sellerFolderTotalForBuyerLawyer.length
                  })`
                : isNotaryRole
                ? `Φάκελος Πωλητή (${notarySellerFolderTotalMirror.length})`
                : 'Επισκόπηση'}
            </button>
            {(isLawyerRole || isEngineerRole || isNotaryRole) && (
              <button
                onClick={() => setActiveInnerTab('htk')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeInnerTab === 'htk'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEngineerRole
                  ? `Ηλεκτρονική Ταυτότητα Κτηρίου (${htkTotalDocsForCurrentRole.length})`
                  : isNotaryRole
                  ? `Ηλεκτρονική Ταυτότητα Κτηρίου (${notaryHtkTotalMirror.length})`
                  : `Ηλεκτρονική Ταυτότητα Κτηρίου (ΗΤΚ) (${htkTotalDocsForCurrentRole.length})`}
              </button>
            )}
          </nav>

          {/* Inner Tab Content */}
          {activeInnerTab === 'requests' && !isSellerLawyer && !isBuyerLawyer && !isNotaryRole && (
            <div className="space-y-5">
              {/* Request Document/Action Button - Only in requests tab */}
              {isProfessional && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      setRequestType(null);
                      setSelectedSide(null);
                      setSelectedDocumentTypes([]);
                      setCustomDocumentNames({});
                      setSelectedAction(null);
                      setCustomActionName('');
                      setCustomActionWhere('');
                      setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                      setShowRequestModal(true);
                    }}
                    className={`px-5 py-2.5 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all ${
                      isProfessionalContext
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    + Αίτημα Εγγράφου ή Ενέργειας
                  </button>
                </div>
              )}
              
              {requestedDocs.length === 0 ? (
                <EmptyState
                  icon={<FaFileAlt className="text-2xl" />}
                  title="Δεν υπάρχουν αιτήματα"
                  description="Όλα τα αιτήματα εγγράφων έχουν απαντηθεί"
                />
              ) : (
                <>
                  {requestedDocs.map((doc) => renderDocRow(doc))}
                </>
              )}
            </div>
          )}

          {activeInnerTab === 'incoming' && !isBuyerLawyer && !isSellerLawyer && !isNotaryRole && (
            <div className="space-y-5">
              {receivedFromBuyer.length === 0 && receivedFromSeller.length === 0 ? (
                <EmptyState
                  icon={<FaFileAlt className="text-2xl" />}
                  title="Δεν έχεις λάβει έγγραφα"
                  description="Τα έγγραφα που σου στέλνουν θα εμφανίζονται εδώ"
                />
              ) : (
                <div className="space-y-4">
                  {/* Received from Buyer */}
                  {receivedFromBuyer.map((doc) => {
                    const uploadedBy = getParticipantName(doc.uploadedById);
                    return (
                      <div key={doc.id} className="p-5 bg-gradient-to-r from-blue-50 to-white rounded-xl border-2 border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                <FaFileAlt />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                          </div>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Από:</span>{' '}
                                    <span className="text-blue-700 font-medium">Αγοραστής</span>
                                    {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                          </p>
                          {doc.fileName && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <FaFileAlt className="text-xs" />
                                      {doc.fileName}
                            </p>
                          )}
                                  {doc.reviewNote && doc.status === 'CHANGES_REQUESTED' && (
                                    <p className="text-sm text-yellow-800 mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <span className="font-medium">Σχόλιο:</span> {doc.reviewNote}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {doc.fileName && (
                          <button
                            onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Λήψη"
                          >
                                <FaDownload className="text-lg" />
                          </button>
                        )}
                            {/* Approve/Reject buttons for UPLOADED documents */}
                            {doc.status === 'UPLOADED' && (
                              <>
                                <button
                                  onClick={() => handleReview(doc.id, 'APPROVED')}
                                  className="p-3 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Έγκριση"
                                >
                                  <FaCheckCircle className="text-lg" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDocForReject(doc);
                                    setRejectNote('');
                                    setShowRejectModal(true);
                                  }}
                                  className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Απόρριψη"
                                >
                                  <FaTimesCircle className="text-lg" />
                                </button>
                              </>
                        )}
                      </div>
                    </div>
                </div>
                    );
                  })}

                  {/* Received from Seller */}
                  {receivedFromSeller.map((doc) => {
                    const uploadedBy = getParticipantName(doc.uploadedById);
                    const isFromSellerLawyer = doc.uploadedById === sellerLawyerId;
                    const isRequestFromBuyerLawyer = doc.status === 'REQUESTED' && doc.requestedById === buyerLawyerId;
                    return (
                      <div key={doc.id} className={`p-5 rounded-xl border-2 hover:shadow-md transition-all ${
                        isFromSellerLawyer 
                          ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200' 
                          : isRequestFromBuyerLawyer
                          ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200'
                          : 'bg-gradient-to-r from-green-50 to-white border-green-200'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                                isFromSellerLawyer ? 'bg-purple-500' : isRequestFromBuyerLawyer ? 'bg-blue-500' : 'bg-green-500'
                              }`}>
                                <FaFileAlt />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {isRequestFromBuyerLawyer ? (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Ζητήθηκε από:</span>{' '}
                                      <span className="text-blue-700 font-medium">Δικηγόρο Αγοραστή</span>
                                      {' – μπορείτε να ανεβάσετε εσείς ή ο πωλητής'}
                                    </p>
                                  ) : (
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Από:</span>{' '}
                                    {isFromSellerLawyer ? (
                                      <>
                                        <span className="text-purple-700 font-medium">Δικηγόρος Πωλητή</span>
                                        {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-green-700 font-medium">Πωλητής</span>
                                        {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                      </>
                                    )}
                                  </p>
                                  )}
                                  {doc.fileName && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <FaFileAlt className="text-xs" />
                                      {doc.fileName}
                                    </p>
                                  )}
                                  {doc.reviewNote && doc.status === 'CHANGES_REQUESTED' && (
                                    <p className="text-sm text-yellow-800 mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <span className="font-medium">Σχόλιο:</span> {doc.reviewNote}
                                    </p>
                                  )}
                                  {!isRequestFromBuyerLawyer && (
                                    <p className="text-xs text-gray-500">
                                      Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {/* Upload button for REQUESTED docs from buyer's lawyer (seller's lawyer can upload) */}
                            {isRequestFromBuyerLawyer && (
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setShowUploadModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                              >
                                <FaUpload />
                                Ανέβασμα
                              </button>
                            )}
                            {doc.fileName && (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Λήψη"
                              >
                                <FaDownload className="text-lg" />
                              </button>
                            )}
                            {/* Approve/Reject buttons for UPLOADED documents */}
                            {doc.status === 'UPLOADED' && (
                              <>
                                <button
                                  onClick={() => handleReview(doc.id, 'APPROVED')}
                                  className="p-3 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Έγκριση"
                                >
                                  <FaCheckCircle className="text-lg" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDocForReject(doc);
                                    setRejectNote('');
                                    setShowRejectModal(true);
                                  }}
                                  className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Απόρριψη"
                                >
                                  <FaTimesCircle className="text-lg" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeInnerTab === 'incoming' && isSellerLawyer && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                <div className="px-5 pt-5 pb-0 flex justify-end">
                  <button
                    onClick={() => {
                      setRequestType('DOCUMENT');
                      setSelectedSide('BUYER');
                      setSelectedDocumentTypes([]);
                      setCustomDocumentNames({});
                      setCustomDocumentGuides({});
                      setSelectedAction(null);
                      setSelectedActionTarget(null);
                      setCustomActionName('');
                      setCustomActionWhere('');
                      setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                      setShowRequestModal(true);
                    }}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 flex-shrink-0"
                  >
                    <FaPlus />
                    Ζητήστε Έγγραφο
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSellerLawyerBuyerFolderOpen(!sellerLawyerBuyerFolderOpen)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                >
                  {sellerLawyerBuyerFolderOpen ? (
                    <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                  ) : (
                    <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <FaFolderOpen className="text-lg" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900">Φάκελος Αγοραστή</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Ροή αιτημάτων και εγκρίσεων για έγγραφα αγοραστή/δικηγόρου αγοραστή
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                    {sellerLawyerBuyerTotalDocs.length} έγγραφα
                  </span>
                </button>

                {sellerLawyerBuyerFolderOpen && (
                  <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                    <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSellerLawyerBuyerPendingOpen(!sellerLawyerBuyerPendingOpen)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                      >
                        {sellerLawyerBuyerPendingOpen ? <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />}
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <FaClipboardList className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                          <p className="text-xs text-orange-700 mt-0.5">Αιτήματα που στάλθηκαν και περιμένουν ανέβασμα</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                          {sellerLawyerBuyerPendingRequests.length}
                        </span>
                      </button>
                      {sellerLawyerBuyerPendingOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                          {sellerLawyerBuyerPendingRequests.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                              <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {sellerLawyerBuyerPendingRequests.map((doc) => renderDocRow(doc))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSellerLawyerBuyerTotalOpen(!sellerLawyerBuyerTotalOpen)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50/60 transition-colors text-left"
                      >
                        {sellerLawyerBuyerTotalOpen ? <FaChevronDown className="text-purple-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-purple-600 flex-shrink-0 text-sm" />}
                        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <FaCheckCircle className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                          <p className="text-xs text-purple-700 mt-0.5">Εγκεκριμένα από εσένα + έγγραφα που ανέβηκαν</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-800 text-sm font-bold flex-shrink-0">
                          {sellerLawyerBuyerTotalDocs.length}
                        </span>
                      </button>
                      {sellerLawyerBuyerTotalOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-purple-200/60">
                          {sellerLawyerBuyerTotalDocs.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-purple-100">
                              <p className="text-gray-500 text-sm">Δεν υπάρχουν διαθέσιμα έγγραφα στον φάκελο αγοραστή.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                                {sellerLawyerBuyerTotalDocs.map((doc) => renderDocRow(doc, { hideReviewActions: true }))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeInnerTab === 'incoming' && isNotaryRole && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                <div className="px-5 pt-5 pb-0 flex justify-end">
                  <button
                    onClick={() => {
                      setRequestType('DOCUMENT');
                      setSelectedSide('BUYER');
                      setSelectedDocumentTypes([]);
                      setCustomDocumentNames({});
                      setCustomDocumentGuides({});
                      setSelectedAction(null);
                      setSelectedActionTarget(null);
                      setCustomActionName('');
                      setCustomActionWhere('');
                      setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                      setShowRequestModal(true);
                    }}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <FaPlus />
                    Ζητήστε Έγγραφο
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setNotaryBuyerFolderOpen(!notaryBuyerFolderOpen)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                >
                  {notaryBuyerFolderOpen ? (
                    <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                  ) : (
                    <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <FaFolderOpen className="text-lg" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900">Φάκελος Αγοραστή</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Εκκρεμή αιτήματα προς δικηγόρο αγοραστή · συνολικά όπως στον φάκελο του δικηγόρου αγοραστή
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                    {notaryBuyerFolderTotalMirror.length} έγγραφα
                  </span>
                </button>

                {notaryBuyerFolderOpen && (
                  <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                    <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setNotaryBuyerPendingOpen(!notaryBuyerPendingOpen)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                      >
                        {notaryBuyerPendingOpen ? (
                          <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" />
                        ) : (
                          <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />
                        )}
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <FaClipboardList className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                          <p className="text-xs text-orange-700 mt-0.5">
                            Έγγραφα που έχετε ζητήσει εσείς ως συμβολαιογράφος (πλευρά αγοραστή)
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                          {notaryBuyerFolderPendingDocs.length}
                        </span>
                      </button>
                      {notaryBuyerPendingOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                          {notaryBuyerFolderPendingDocs.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                              <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">{notaryBuyerFolderPendingDocs.map((doc) => renderDocRow(doc))}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setNotaryBuyerTotalOpen(!notaryBuyerTotalOpen)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left"
                      >
                        {notaryBuyerTotalOpen ? (
                          <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" />
                        ) : (
                          <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />
                        )}
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <FaCheckCircle className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                          <p className="text-xs text-blue-700 mt-0.5">
                            Ίδια λίστα με τα συνολικά έγγραφα του δικηγόρου αγοραστή (μόνο προβολή)
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">
                          {notaryBuyerFolderTotalMirror.length}
                        </span>
                      </button>
                      {notaryBuyerTotalOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                          {!buyerLawyerId ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                              <p className="text-gray-500 text-sm">Δεν έχει οριστεί ακόμα δικηγόρος αγοραστή.</p>
                            </div>
                          ) : notaryBuyerFolderTotalMirror.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                              <p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα έγγραφα στον φάκελο αγοραστή.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {notaryBuyerFolderTotalMirror.map((doc) =>
                                renderDocRow(doc, { hideReviewActions: true })
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeInnerTab === 'incoming' && isBuyerLawyer && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                <div className="px-5 pt-5 pb-0 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setRequestType('DOCUMENT');
                      setSelectedSide('BUYER');
                      setSelectedDocumentTypes([]);
                      setCustomDocumentNames({});
                      setCustomDocumentGuides({});
                      setSelectedAction(null);
                      setSelectedActionTarget(null);
                      setCustomActionName('');
                      setCustomActionWhere('');
                      setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                      setShowRequestModal(true);
                    }}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <FaPlus />
                    Ζητήστε Έγγραφο
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setShowUploadModal(true);
                    }}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <FaUpload />
                    Ανέβασμα Εγγράφου
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setBuyerLawyerFolderOpen(!buyerLawyerFolderOpen)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                >
                  {buyerLawyerFolderOpen ? (
                    <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                  ) : (
                    <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <FaFolderOpen className="text-lg" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900">Φάκελος Αγοραστή</h3>
                    <p className="text-xs text-amber-700 mt-0.5">Οργάνωση εγγράφων ανά κατηγορία</p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                    {buyerLawyerTotalDocs.length} έγγραφα
                  </span>
                </button>

                {buyerLawyerFolderOpen && (
                  <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                    <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                      <button type="button" onClick={() => setBuyerLawyerSectionUploadedOpen(!buyerLawyerSectionUploadedOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left">
                        {buyerLawyerSectionUploadedOpen ? <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />}
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                          <p className="text-xs text-amber-700 mt-0.5">Αιτήματα από δικηγόρο πωλητή, συμβολαιογράφο ή μηχανικό</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">{buyerLawyerIncomingBuyerFolderRequests.length}</span>
                      </button>
                      {buyerLawyerSectionUploadedOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                          {buyerLawyerIncomingBuyerFolderRequests.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν αιτήματα προς τον φάκελο αγοραστή από άλλον επαγγελματία.</p></div>
                          ) : (
                            <div className="space-y-2">
                              {buyerLawyerIncomingBuyerFolderRequests.map((doc) => (
                                <div key={doc.id} className="p-3 bg-white rounded-lg border border-amber-200/60 hover:border-amber-300 hover:shadow-sm transition-all flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0"><FaFileAlt className="text-sm" /></div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                      <p className="text-xs text-amber-700">Ζητήθηκε από: {getBuyerFolderIncomingRequesterLabel(doc.requestedById)}</p>
                                      {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {(doc.status === 'REQUESTED' || doc.status === 'CHANGES_REQUESTED') && (
                                      <button
                                        onClick={() => {
                                          setSelectedDoc(doc);
                                          setShowUploadModal(true);
                                        }}
                                        className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                                        title={doc.status === 'CHANGES_REQUESTED' ? 'Επανανέβασμα' : 'Ανέβασμα'}
                                      >
                                        <FaUpload />
                                      </button>
                                    )}
                                    {doc.fileName && (
                                      <button onClick={() => handleDownload(doc)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Λήψη"><FaDownload /></button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                      <button type="button" onClick={() => setBuyerLawyerSectionRequestedOpen(!buyerLawyerSectionRequestedOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left">
                        {buyerLawyerSectionRequestedOpen ? <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />}
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Έγγραφα που Έχω Ζητήσει</h4>
                          <p className="text-xs text-orange-700 mt-0.5">Αιτήματα που έχω στείλει προς τον αγοραστή</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">{buyerLawyerRequestedDocs.length}</span>
                      </button>
                      {buyerLawyerSectionRequestedOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                          {buyerLawyerRequestedDocs.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100"><p className="text-gray-500 text-sm">Δεν έχεις ζητήσει ακόμα έγγραφα ή ενέργειες.</p></div>
                          ) : (
                            <div className="space-y-2">
                              {buyerLawyerRequestedDocs.map((doc) => (
                                <div key={doc.id} className="p-3 bg-white rounded-lg border border-orange-200/60 hover:border-orange-300 hover:shadow-sm transition-all flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αίτημα "${doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}";`)) {
                                        return;
                                      }
                                      try {
                                        await deleteDocument(doc.id);
                                        toast.success('Το αίτημα διαγράφηκε επιτυχώς');
                                        fetchDocuments();
                                        onRefresh();
                                      } catch (error: any) {
                                        console.error('Error deleting request:', error);
                                        toast.error(error.message || 'Αποτυχία διαγραφής αιτήματος');
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                    title="Διαγραφή αιτήματος"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                      <button type="button" onClick={() => setBuyerLawyerSectionTotalOpen(!buyerLawyerSectionTotalOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left">
                        {buyerLawyerSectionTotalOpen ? <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />}
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaCheckCircle className="text-lg" /></div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                          <p className="text-xs text-blue-700 mt-0.5">
                            Εγκεκριμένα από εσένα, ανεβασμένα από εσένα και ανεβασμένα από τον αγοραστή (με έγκριση / απόρριψη εδώ)
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">{buyerLawyerTotalDocs.length}</span>
                      </button>
                      {buyerLawyerSectionTotalOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                          {buyerLawyerTotalDocs.length === 0 ? (
                            <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα εγκεκριμένα ή ανεβασμένα έγγραφα από εσένα.</p></div>
                          ) : (
                            <div className="space-y-2">
                              {buyerLawyerTotalDocs.map((doc) => {
                                const needsBuyerUploadReview =
                                  doc.status === 'UPLOADED' &&
                                  doc.requestedById === userId &&
                                  doc.requestedFromRole === 'BUYER' &&
                                  doc.uploadedById &&
                                  doc.uploadedById !== userId;
                                return (
                                  <div key={doc.id} className="p-3 bg-white rounded-lg border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"><FaFileAlt className="text-sm" /></div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                        {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                        {doc.uploadedById && <p className="text-xs text-gray-500">Ανέβηκε από: {getParticipantName(doc.uploadedById)}</p>}
                                        <span className="text-xs text-blue-600">
                                          {doc.uploadedById === userId
                                            ? 'Ανέβασες εσύ'
                                            : needsBuyerUploadReview
                                            ? 'Αναμονή έγκρισης από εσένα'
                                            : 'Εγκρίθηκε από εσένα'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {doc.fileName && (
                                        <button onClick={() => handleDownload(doc)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Λήψη"><FaDownload /></button>
                                      )}
                                      {needsBuyerUploadReview && (
                                        <>
                                          <button
                                            onClick={() => handleReview(doc.id, 'APPROVED')}
                                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                            title="Έγκριση"
                                          >
                                            <FaCheckCircle />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedDocForReject(doc);
                                              setRejectNote('');
                                              setShowRejectModal(true);
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Απόρριψη"
                                          >
                                            <FaTimesCircle />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeInnerTab === 'overview' && (
            <div className="space-y-6">
              {/* Buyer Lawyer-specific Overview: Φάκελος Πωλητή (μόνο συνολικά έγγραφα) */}
              {isBuyerLawyer && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-0 flex justify-end">
                    <button
                      onClick={() => {
                        setRequestType('DOCUMENT');
                        setSelectedSide('SELLER');
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(false);
                        setShowRequestModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaPlus />
                      Ζητήστε Έγγραφο
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBuyerLawyerSellerFolderOpen(!buyerLawyerSellerFolderOpen)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                  >
                    {buyerLawyerSellerFolderOpen ? (
                      <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                    ) : (
                      <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                      <FaFolderOpen className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-lg font-bold text-gray-900">Φάκελος Πωλητή</h3>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Αιτήματά σας προς πωλητή και προβολή συνολικών εγγράφων φακέλου πωλητή (μόνο ανάγνωση)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">
                      {sellerFolderTotalForBuyerLawyer.length}
                    </span>
                  </button>

                  {buyerLawyerSellerFolderOpen && (
                    <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setBuyerLawyerSellerPendingOpen(!buyerLawyerSellerPendingOpen)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                        >
                          {buyerLawyerSellerPendingOpen ? <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <FaClipboardList className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                            <p className="text-xs text-orange-700 mt-0.5">Αιτήματα που στάλθηκαν και περιμένουν ανέβασμα</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                            {buyerLawyerSellerPendingRequests.length}
                          </span>
                        </button>
                        {buyerLawyerSellerPendingOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                            {buyerLawyerSellerPendingRequests.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                                <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {buyerLawyerSellerPendingRequests.map((doc) => renderDocRow(doc))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setBuyerLawyerSellerTotalOpen(!buyerLawyerSellerTotalOpen)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50/60 transition-colors text-left"
                        >
                          {buyerLawyerSellerTotalOpen ? <FaChevronDown className="text-purple-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-purple-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <FaCheckCircle className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                            <p className="text-xs text-purple-700 mt-0.5">
                              Ίδια λίστα με τα «Συνολικά» του δικηγόρου πωλητή (δικός του φάκελος + απαντήσεις πωλητή, χωρίς ΗΤΚ)
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-800 text-sm font-bold flex-shrink-0">
                            {sellerFolderTotalForBuyerLawyer.length}
                          </span>
                        </button>
                        {buyerLawyerSellerTotalOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-purple-200/60">
                            {sellerFolderTotalForBuyerLawyer.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-purple-100">
                                <p className="text-gray-500 text-sm">Δεν υπάρχουν διαθέσιμα έγγραφα στον φάκελο πωλητή.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sellerFolderTotalForBuyerLawyer.map((doc) => renderDocRow(doc, { hideReviewActions: true }))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notary Overview: Φάκελος Πωλητή — ίδια δομή με δικηγόρο αγοραστή, εκκρεμή = αιτήματα συμβολαιογράφου */}
              {isNotaryRole && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-0 flex justify-end">
                    <button
                      onClick={() => {
                        setRequestType('DOCUMENT');
                        setSelectedSide('SELLER');
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(false);
                        setShowRequestModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaPlus />
                      Ζητήστε Έγγραφο
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotarySellerFolderOpen(!notarySellerFolderOpen)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                  >
                    {notarySellerFolderOpen ? (
                      <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                    ) : (
                      <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                      <FaFolderOpen className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-lg font-bold text-gray-900">Φάκελος Πωλητή</h3>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Εκκρεμή αιτήματα που έχετε ζητήσει εσείς · συνολικά όπως στον φάκελο πωλητή (δικηγόρος αγοραστή / πωλητή)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">
                      {notarySellerFolderTotalMirror.length}
                    </span>
                  </button>

                  {notarySellerFolderOpen && (
                    <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setNotarySellerPendingOpen(!notarySellerPendingOpen)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                        >
                          {notarySellerPendingOpen ? (
                            <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" />
                          ) : (
                            <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />
                          )}
                          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <FaClipboardList className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                            <p className="text-xs text-orange-700 mt-0.5">
                              Αιτήματα που έχετε στείλει εσείς ως συμβολαιογράφος (όχι του δικηγόρου αγοραστή)
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                            {notarySellerFolderPendingDocs.length}
                          </span>
                        </button>
                        {notarySellerPendingOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                            {notarySellerFolderPendingDocs.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                                <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">{notarySellerFolderPendingDocs.map((doc) => renderDocRow(doc))}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setNotarySellerTotalOpen(!notarySellerTotalOpen)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50/60 transition-colors text-left"
                        >
                          {notarySellerTotalOpen ? (
                            <FaChevronDown className="text-purple-600 flex-shrink-0 text-sm" />
                          ) : (
                            <FaChevronRight className="text-purple-600 flex-shrink-0 text-sm" />
                          )}
                          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <FaCheckCircle className="text-lg" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                            <p className="text-xs text-purple-700 mt-0.5">
                              Ίδια λίστα με τα συνολικά έγγραφα φακέλου πωλητή (μόνο προβολή)
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-800 text-sm font-bold flex-shrink-0">
                            {notarySellerFolderTotalMirror.length}
                          </span>
                        </button>
                        {notarySellerTotalOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-purple-200/60">
                            {notarySellerFolderTotalMirror.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-purple-100">
                                <p className="text-gray-500 text-sm">Δεν υπάρχουν διαθέσιμα έγγραφα στον φάκελο πωλητή.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {notarySellerFolderTotalMirror.map((doc) =>
                                  renderDocRow(doc, { hideReviewActions: true })
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seller Lawyer-specific Overview: Φάκελος Πωλητή */}
              {isSellerLawyer && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-0 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setRequestType('DOCUMENT');
                        setSelectedSide('SELLER');
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(false);
                        setShowRequestModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaPlus />
                      Ζητήστε Έγγραφο
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDoc(null);
                        setSellerLawyerUploadCategory('');
                        setSellerLawyerUploadCustomName('');
                        setShowUploadModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaUpload />
                      Ανέβασμα Εγγράφου
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSellerLawyerFolderOpen(!sellerLawyerFolderOpen)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                  >
                    {sellerLawyerFolderOpen ? (
                      <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                    ) : (
                      <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                      <FaFolderOpen className="text-lg" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-bold text-gray-900">Φάκελος Πωλητή</h3>
                      <p className="text-xs text-amber-700 mt-0.5">Οργάνωση εγγράφων ανά κατηγορία</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                      {sellerLawyerTotalDocs.length} έγγραφα
                    </span>
                  </button>

                  {sellerLawyerFolderOpen && (
                    <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                      {/* 1. Έγγραφα που μου έχουν ζητήσει */}
                      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setSellerLawyerSectionUploadedOpen(!sellerLawyerSectionUploadedOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left">
                          {sellerLawyerSectionUploadedOpen ? <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο (πλευρά πωλητή)
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">{sellerLawyerRequestedFromBuyerLawyerDocs.length}</span>
                        </button>
                        {sellerLawyerSectionUploadedOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                            {sellerLawyerRequestedFromBuyerLawyerDocs.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100">
                                <p className="text-gray-500 text-sm">
                                  Δεν υπάρχουν αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sellerLawyerRequestedFromBuyerLawyerDocs.map((doc) => (
                                  <div key={doc.id} className="p-3 bg-white rounded-lg border border-amber-200/60 hover:border-amber-300 hover:shadow-sm transition-all flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0"><FaFileAlt className="text-sm" /></div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                        <p className="text-xs text-amber-700">
                                          Ζητήθηκε από: {getSellerFolderExternalRequesterLabel(doc.requestedById)}
                                        </p>
                                        {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {(doc.status === 'REQUESTED' || doc.status === 'CHANGES_REQUESTED') && (
                                        <button
                                          onClick={() => {
                                            setSelectedDoc(doc);
                                            setShowUploadModal(true);
                                          }}
                                          className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                                          title={doc.status === 'CHANGES_REQUESTED' ? 'Επανανέβασμα' : 'Ανέβασμα'}
                                        >
                                          <FaUpload />
                                        </button>
                                      )}
                                      {doc.fileName && (
                                        <button onClick={() => handleDownload(doc)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Λήψη"><FaDownload /></button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. Έγγραφα που Έχω Ζητήσει */}
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setSellerLawyerSectionRequestedOpen(!sellerLawyerSectionRequestedOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left">
                          {sellerLawyerSectionRequestedOpen ? <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Έγγραφα που Έχω Ζητήσει</h4>
                            <p className="text-xs text-orange-700 mt-0.5">Αιτήματα που έχω στείλει προς τον ιδιοκτήτη</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">{sellerLawyerRequestedDocs.length}</span>
                        </button>
                        {sellerLawyerSectionRequestedOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                            {sellerLawyerRequestedDocs.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100"><p className="text-gray-500 text-sm">Δεν έχεις ζητήσει ακόμα έγγραφα ή ενέργειες.</p></div>
                            ) : (
                              <div className="space-y-2">
                                {sellerLawyerRequestedDocs.map((doc) => (
                                  <div key={doc.id} className="p-3 bg-white rounded-lg border border-orange-200/60 hover:border-orange-300 hover:shadow-sm transition-all flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αίτημα "${doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}";`)) {
                                          return;
                                        }
                                        try {
                                          await deleteDocument(doc.id);
                                          toast.success('Το αίτημα διαγράφηκε επιτυχώς');
                                          fetchDocuments();
                                          onRefresh();
                                        } catch (error: any) {
                                          console.error('Error deleting request:', error);
                                          toast.error(error.message || 'Αποτυχία διαγραφής αιτήματος');
                                        }
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                      title="Διαγραφή αιτήματος"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. Συνολικά Έγγραφα */}
                      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setSellerLawyerSectionTotalOpen(!sellerLawyerSectionTotalOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left">
                          {sellerLawyerSectionTotalOpen ? <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaCheckCircle className="text-lg" /></div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                            <p className="text-xs text-blue-700 mt-0.5">
                              Δικά σου ανεβάσματα, εγκεκριμένα από εσένα και απαντήσεις σε αιτήματά σου (εμφανίζονται εδώ αμέσως μετά το ανέβασμα από πωλητή)
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">{sellerLawyerTotalDocs.length}</span>
                        </button>
                        {sellerLawyerSectionTotalOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                            {sellerLawyerTotalDocs.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα εγκεκριμένα ή ανεβασμένα έγγραφα από εσένα.</p></div>
                            ) : (
                              <div className="space-y-2">
                                {sellerLawyerTotalDocs.map((doc) => {
                                  const isResponseToMyRequest =
                                    doc.requestedById === userId &&
                                    doc.requestedFromRole === 'SELLER' &&
                                    !isHtkCategory(doc.category) &&
                                    !!doc.uploadedById &&
                                    doc.uploadedById !== userId;
                                  return (
                                    <div key={doc.id} className="p-3 bg-white rounded-lg border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"><FaFileAlt className="text-sm" /></div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                          {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                          {doc.uploadedById && <p className="text-xs text-gray-500">Ανέβηκε από: {getParticipantName(doc.uploadedById)}</p>}
                                          <span className="text-xs text-blue-600">
                                            {doc.uploadedById === userId
                                              ? 'Ανέβασες εσύ'
                                              : doc.reviewById === userId && doc.status === 'APPROVED'
                                              ? 'Εγκρίθηκε από εσένα'
                                              : isResponseToMyRequest && doc.status === 'UPLOADED'
                                              ? 'Απάντηση σε αίτημά σου (εμφανίζεται χωρίς υποχρεωτική έγκριση)'
                                              : 'Στα συνολικά έγγραφα'}
                                          </span>
                                        </div>
                                      </div>
                                      {doc.fileName && (
                                        <button onClick={() => handleDownload(doc)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg flex-shrink-0 transition-colors" title="Λήψη"><FaDownload /></button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeSellerFolderTotalDoc(doc)}
                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg flex-shrink-0 transition-colors"
                                        title="Αφαίρεση από Συνολικά Έγγραφα"
                                      >
                                        <FaTrash />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Engineer-specific Overview: Φάκελος Πωλητή */}
              {isEngineerRole && !isSellerLawyer && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-0 flex justify-end">
                    <button
                      onClick={() => {
                        setRequestType('DOCUMENT');
                        setSelectedSide('SELLER');
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(false);
                        setShowRequestModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaPlus />
                      Ζητήστε Έγγραφο
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEngineerFolderOpen(!engineerFolderOpen)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                  >
                    {engineerFolderOpen ? (
                      <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                    ) : (
                      <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                      <FaFolderOpen className="text-lg" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-bold text-gray-900">Φάκελος Πωλητή</h3>
                      <p className="text-xs text-amber-700 mt-0.5">Προβολή φακέλου πωλητή για τον μηχανικό</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                      {engineerSellerTotalDocs.length} έγγραφα
                    </span>
                  </button>

                  {engineerFolderOpen && (
                    <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setEngineerSectionRequestedOpen(!engineerSectionRequestedOpen)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                        >
                          {engineerSectionRequestedOpen ? <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                            <p className="text-xs text-orange-700 mt-0.5">Αιτήματα του μηχανικού προς δικηγόρο πωλητή που περιμένουν ανέβασμα</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">{engineerSellerPendingRequests.length}</span>
                        </button>
                        {engineerSectionRequestedOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                            {engineerSellerPendingRequests.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p></div>
                            ) : (
                              <div className="space-y-2">
                                {engineerSellerPendingRequests.map((doc) => renderDocRow(doc))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setEngineerSectionTotalOpen(!engineerSectionTotalOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left">
                          {engineerSectionTotalOpen ? <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />}
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaCheckCircle className="text-lg" /></div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                            <p className="text-xs text-blue-700 mt-0.5">Ίδια συνολικά έγγραφα με αυτά που βλέπει ο δικηγόρος πωλητή</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">{engineerSellerTotalDocs.length}</span>
                        </button>
                        {engineerSectionTotalOpen && (
                          <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                            {engineerSellerTotalDocs.length === 0 ? (
                              <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν διαθέσιμα συνολικά έγγραφα στον φάκελο πωλητή.</p></div>
                            ) : (
                              <div className="space-y-2">
                                {engineerSellerTotalDocs.map((doc) => (
                                  <div key={doc.id} className="p-3 bg-white rounded-lg border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"><FaFileAlt className="text-sm" /></div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-gray-900 truncate">{doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</h5>
                                        {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                      </div>
                                    </div>
                                    {doc.fileName && (
                                      <button onClick={() => handleDownload(doc)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg flex-shrink-0 transition-colors" title="Λήψη"><FaDownload /></button>
                                    )}
                                    {!sellerLawyerId && (
                                      <button
                                        type="button"
                                        onClick={() => removeSellerFolderTotalDoc(doc)}
                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg flex-shrink-0 transition-colors"
                                        title="Αφαίρεση από Συνολικά Έγγραφα"
                                      >
                                        <FaTrash />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Overview (for lawyers/notary) */}
              {!isEngineerRole && !isSellerLawyer && !isBuyerLawyer && !isNotaryRole && (
                <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <FaFileAlt />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Συνολικά Έγγραφα</p>
                      <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <FaCheckCircle />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Εγκεκριμένα</p>
                      <p className="text-2xl font-bold text-gray-900">{approvedDocs.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border-2 border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                      <FaTimesCircle />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Απορριφθέντα</p>
                      <p className="text-2xl font-bold text-gray-900">{rejectedDocs.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white">
                      <FaUpload />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Αιτηθέντα</p>
                      <p className="text-2xl font-bold text-gray-900">{requestedDocs.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Received Documents Section */}
              {(receivedFromBuyer.length > 0 || receivedFromSeller.length > 0) && (
                <CardSection title={`📥 Έγγραφα που Έχεις Λάβει (${receivedFromBuyer.length + receivedFromSeller.length})`}>
                  <div className="space-y-4">
              {/* Received from Buyer */}
                    {receivedFromBuyer.map((doc) => {
                      const uploadedBy = getParticipantName(doc.uploadedById);
                      return (
                        <div key={doc.id} className="p-5 bg-gradient-to-r from-blue-50 to-white rounded-xl border-2 border-blue-200 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                  <FaFileAlt />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                            </div>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Από:</span>{' '}
                                      <span className="text-blue-700 font-medium">Αγοραστής</span>
                                      {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                    </p>
                            {doc.fileName && (
                                      <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <FaFileAlt className="text-xs" />
                                {doc.fileName}
                              </p>
                            )}
                                    <p className="text-xs text-gray-500">
                              Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                day: 'numeric',
                                month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                              })}
                            </p>
                                  </div>
                                </div>
                              </div>
                          </div>
                          {doc.fileName && (
                            <button
                              onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              title="Λήψη"
                            >
                                <FaDownload className="text-lg" />
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}

              {/* Received from Seller */}
                    {receivedFromSeller.map((doc) => {
                      const uploadedBy = getParticipantName(doc.uploadedById);
                      const isFromSellerLawyer = doc.uploadedById === sellerLawyerId;
                      return (
                        <div key={doc.id} className={`p-5 rounded-xl border-2 hover:shadow-md transition-all ${
                          isFromSellerLawyer 
                            ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200' 
                            : 'bg-gradient-to-r from-green-50 to-white border-green-200'
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                                  isFromSellerLawyer ? 'bg-purple-500' : 'bg-green-500'
                                }`}>
                                  <FaFileAlt />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                            </div>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Από:</span>{' '}
                                      {isFromSellerLawyer ? (
                                        <>
                                          <span className="text-purple-700 font-medium">Δικηγόρος Πωλητή</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-green-700 font-medium">Πωλητής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      )}
                                    </p>
                            {doc.fileName && (
                                      <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <FaFileAlt className="text-xs" />
                                {doc.fileName}
                              </p>
                            )}
                                    <p className="text-xs text-gray-500">
                              Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                day: 'numeric',
                                month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                              })}
                            </p>
                                  </div>
                                </div>
                              </div>
                          </div>
                          {doc.fileName && (
                            <button
                              onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              title="Λήψη"
                            >
                                <FaDownload className="text-lg" />
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </CardSection>
              )}

              {/* Approved and Rejected Documents Section */}
              {(approvedDocs.length > 0 || rejectedDocs.length > 0) && (
                <CardSection title={`✓ Εγκεκριμένα & ⚠ Απορριφθέντα Έγγραφα (${approvedDocs.length + rejectedDocs.length})`}>
                  <div className="space-y-4">
                    {/* Approved Documents */}
                    {approvedDocs.map((doc) => {
                      const uploadedBy = getParticipantName(doc.uploadedById);
                      const isFromBuyer = doc.requestedFromRole === 'BUYER';
                      const isFromSeller = doc.requestedFromRole === 'SELLER';
                      const isFromSellerLawyer = doc.uploadedById === sellerLawyerId;
                      return (
                        <div key={doc.id} className={`p-5 rounded-xl border-2 hover:shadow-md transition-all ${
                          isFromBuyer 
                            ? 'bg-gradient-to-r from-green-50 to-white border-green-200' 
                            : isFromSellerLawyer
                            ? 'bg-gradient-to-r from-green-50 to-white border-green-200'
                            : 'bg-gradient-to-r from-green-50 to-white border-green-200'
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                                  <FaCheckCircle />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Από:</span>{' '}
                                      {isFromBuyer ? (
                                        <>
                                          <span className="text-blue-700 font-medium">Αγοραστής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      ) : isFromSellerLawyer ? (
                                        <>
                                          <span className="text-purple-700 font-medium">Δικηγόρος Πωλητή</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-green-700 font-medium">Πωλητής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      )}
                                    </p>
                                    {doc.fileName && (
                                      <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <FaFileAlt className="text-xs" />
                                        {doc.fileName}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      Εγκρίθηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {doc.fileName && (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                title="Λήψη"
                              >
                                <FaDownload className="text-lg" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Rejected Documents */}
                    {rejectedDocs.map((doc) => {
                      const uploadedBy = getParticipantName(doc.uploadedById);
                      const isFromBuyer = doc.requestedFromRole === 'BUYER';
                      const isFromSellerLawyer = doc.uploadedById === sellerLawyerId;
                      return (
                        <div key={doc.id} className={`p-5 rounded-xl border-2 hover:shadow-md transition-all ${
                          isFromBuyer 
                            ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' 
                            : isFromSellerLawyer
                            ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200'
                            : 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200'
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white flex-shrink-0">
                                  <FaTimesCircle />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Από:</span>{' '}
                                      {isFromBuyer ? (
                                        <>
                                          <span className="text-blue-700 font-medium">Αγοραστής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      ) : isFromSellerLawyer ? (
                                        <>
                                          <span className="text-purple-700 font-medium">Δικηγόρος Πωλητή</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-green-700 font-medium">Πωλητής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </>
                                      )}
                                    </p>
                                    {doc.fileName && (
                                      <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <FaFileAlt className="text-xs" />
                                        {doc.fileName}
                                      </p>
                                    )}
                                    {doc.reviewNote && (
                                      <p className="text-sm text-yellow-800 mt-1 bg-yellow-100 p-2 rounded border border-yellow-300">
                                        <span className="font-medium">Σχόλιο Απόρριψης:</span> {doc.reviewNote}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      Απορρίφθηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {doc.fileName && (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                title="Λήψη"
                              >
                                <FaDownload className="text-lg" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardSection>
              )}

              {/* Sent Documents Section - For lawyers, show received documents instead */}
              {(userRole === 'LAWYER' ? (receivedFromBuyer.length > 0 || receivedFromSeller.length > 0) : (sentToBuyer.length > 0 || sentToSeller.length > 0)) && (
                <CardSection title={userRole === 'LAWYER' 
                  ? `📥 Έγγραφα που Έχεις Λάβει (${receivedFromBuyer.length + receivedFromSeller.length})`
                  : `📤 Έγγραφα που Έχεις Στείλει (${sentToBuyer.length + sentToSeller.length})`}>
                  <div className="space-y-4">
                    {/* For lawyers: show received documents */}
                    {userRole === 'LAWYER' ? (
                      <>
                        {/* Received from Buyer */}
                        {receivedFromBuyer.map((doc) => {
                          const uploadedBy = getParticipantName(doc.uploadedById);
                          return (
                            <div key={doc.id} className="p-5 bg-gradient-to-r from-blue-50 to-white rounded-xl border-2 border-blue-200 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                      <FaFileAlt />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-700">
                                          <span className="font-semibold">Από:</span>{' '}
                                          <span className="text-blue-700 font-medium">Αγοραστής</span>
                                          {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                        </p>
                                        {doc.fileName && (
                                          <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <FaFileAlt className="text-xs" />
                                            {doc.fileName}
                                          </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                          Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {doc.fileName && (
                                  <button
                                    onClick={() => handleDownload(doc)}
                                    className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                    title="Λήψη"
                                  >
                                    <FaDownload className="text-lg" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Received from Seller */}
                        {receivedFromSeller.map((doc) => {
                          const uploadedBy = getParticipantName(doc.uploadedById);
                          const isFromSellerLawyer = doc.uploadedById === sellerLawyerId;
                          return (
                            <div key={doc.id} className={`p-5 rounded-xl border-2 hover:shadow-md transition-all ${
                              isFromSellerLawyer 
                                ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200' 
                                : 'bg-gradient-to-r from-green-50 to-white border-green-200'
                            }`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                                      isFromSellerLawyer ? 'bg-purple-500' : 'bg-green-500'
                                    }`}>
                                      <FaFileAlt />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-700">
                                          <span className="font-semibold">Από:</span>{' '}
                                          {isFromSellerLawyer ? (
                                            <>
                                              <span className="text-purple-700 font-medium">Δικηγόρος Πωλητή</span>
                                              {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-green-700 font-medium">Πωλητής</span>
                                              {uploadedBy !== 'Άγνωστος' && ` (${uploadedBy})`}
                                            </>
                                          )}
                                        </p>
                                        {doc.fileName && (
                                          <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <FaFileAlt className="text-xs" />
                                            {doc.fileName}
                                          </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                          Ανέβηκε: {new Date(doc.updatedAt).toLocaleDateString('el-GR', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {doc.fileName && (
                                  <button
                                    onClick={() => handleDownload(doc)}
                                    className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                    title="Λήψη"
                                  >
                                    <FaDownload className="text-lg" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {/* Sent to Buyer */}
                        {sentToBuyer.map((doc) => (
                      <div key={doc.id} className="p-5 bg-gradient-to-r from-blue-50 to-white rounded-xl border-2 border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                <FaFileAlt />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                            </div>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Στάλθηκε σε:</span>{' '}
                                    <span className="text-blue-700 font-medium">Αγοραστής</span>
                            </p>
                            {doc.fileName && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <FaFileAlt className="text-xs" />
                                      {doc.fileName}
                              </p>
                            )}
                                  <p className="text-xs text-gray-500">
                                    Στάλθηκε: {new Date(doc.createdAt).toLocaleDateString('el-GR', {
                                day: 'numeric',
                                month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                              })}
                            </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {doc.status === 'UPLOADED' && doc.fileName && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              title="Λήψη"
                            >
                              <FaDownload className="text-lg" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Sent to Seller */}
                    {sentToSeller.map((doc) => (
                      <div key={doc.id} className="p-5 bg-gradient-to-r from-green-50 to-white rounded-xl border-2 border-green-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                                <FaFileAlt />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-lg">{doc.category}</h4>
                                </div>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Στάλθηκε σε:</span>{' '}
                                    <span className="text-green-700 font-medium">Πωλητής</span>
                                    {sellerLawyerId && ' & Δικηγόρος Πωλητή'}
                                  </p>
                                  {doc.fileName && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <FaFileAlt className="text-xs" />
                                      {doc.fileName}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Στάλθηκε: {new Date(doc.createdAt).toLocaleDateString('el-GR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {doc.status === 'UPLOADED' && doc.fileName && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              title="Λήψη"
                            >
                              <FaDownload className="text-lg" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                      </>
                    )}
                  </div>
                </CardSection>
              )}

              {/* Empty State for Overview (lawyers/notary only) */}
              {!isEngineerRole && receivedFromBuyer.length === 0 && receivedFromSeller.length === 0 && 
               sentToBuyer.length === 0 && sentToSeller.length === 0 && (
                <EmptyState
                  icon={<FaFileAlt className="text-2xl" />}
                  title="Δεν υπάρχουν έγγραφα ή ενέργειες να κάνετε"
                  description="Όταν λάβεις ή στείλεις έγγραφα, θα εμφανίζονται εδώ"
                />
              )}
                </>
              )}
            </div>
          )}

          {activeInnerTab === 'htk' && (isLawyerRole || isEngineerRole || isNotaryRole) && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                {(isLawyerRole || isEngineerRole || isNotaryRole) && (
                  <div className="px-5 pt-5 pb-0 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setRequestType('DOCUMENT');
                        setSelectedSide('SELLER');
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(true);
                        setShowRequestModal(true);
                      }}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <FaPlus />
                      Ζητήστε Έγγραφο
                    </button>
                    {isEngineerRole && (
                      <button
                        onClick={() => {
                          setSelectedDoc(null);
                          setEngineerOwnUploadCategory('');
                          setEngineerOwnUploadCustomName('');
                          setIsEngineerHtkUploadFlow(true);
                          setShowUploadModal(true);
                        }}
                        className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                      >
                        <FaUpload />
                        Ανέβασμα Εγγράφου
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setLawyerHtkFolderOpen(!lawyerHtkFolderOpen)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                >
                  {lawyerHtkFolderOpen ? (
                    <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                  ) : (
                    <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <FaFolderOpen className="text-lg" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900">Ηλεκτρονική Ταυτότητα Κτηρίου</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {isEngineerRole
                        ? 'Συνολικά έγγραφα Ηλεκτρονικής Ταυτότητας Κτηρίου'
                        : isNotaryRole
                        ? 'Προβολή ΗΤΚ όπως ο δικηγόρος πωλητή — εκκρεμή μόνο τα δικά σας αιτήματα προς μηχανικό'
                        : 'Συνολικά έγγραφα: εγκεκριμένα από μηχανικό ή ανεβασμένα από εσένα'}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                    {(isNotaryRole ? notaryHtkTotalMirror.length : htkTotalDocsForCurrentRole.length)} έγγραφα
                  </span>
                </button>

                {lawyerHtkFolderOpen && (
                  <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                    {isEngineerRole ? (
                      <>
                        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setSellerLawyerHtkPendingOpen(!sellerLawyerHtkPendingOpen)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                          >
                            {sellerLawyerHtkPendingOpen ? (
                              <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                            ) : (
                              <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                            )}
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                              <FaClipboardList className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                              <p className="text-xs text-amber-700 mt-0.5">Αιτήματα ΗΤΚ από δικηγόρο πωλητή, αγοραστή ή συμβολαιογράφο</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">
                              {engineerHtkPendingRequests.length}
                            </span>
                          </button>
                          {sellerLawyerHtkPendingOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                              {engineerHtkPendingRequests.length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100">
                                  <p className="text-gray-500 text-sm">Δεν υπάρχουν ΗΤΚ αιτήματα προς εσένα.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {engineerHtkPendingRequests.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="p-3 bg-white rounded-lg border border-amber-200/70 hover:border-amber-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                    >
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                                          <FaFileAlt className="text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 truncate">
                                            {doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}
                                          </h5>
                                          {doc.requestedById && (
                                            <p className="text-xs text-amber-800/90 mt-1">
                                              Ζητήθηκε από: {getParticipantName(doc.requestedById)}
                                            </p>
                                          )}
                                          {doc.reviewNote && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.reviewNote}</p>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedDoc(doc);
                                          setIsEngineerHtkUploadFlow(false);
                                          setUploadingFile(null);
                                          setShowUploadModal(true);
                                        }}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm transition-colors flex-shrink-0 w-full sm:w-auto"
                                      >
                                        <FaUpload className="text-sm" />
                                        Ανέβασμα εγγράφου
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setEngineerHtkRequestedByMeOpen(!engineerHtkRequestedByMeOpen)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                          >
                            {engineerHtkRequestedByMeOpen ? (
                              <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" />
                            ) : (
                              <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />
                            )}
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                              <FaClipboardList className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Έγγραφα που έχω ζητήσει</h4>
                              <p className="text-xs text-orange-700 mt-0.5">Αιτήματα ΗΤΚ που έχεις ζητήσει από τον ιδιοκτήτη/πωλητή</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                              {engineerHtkRequestedByMeDocs.length}
                            </span>
                          </button>
                          {engineerHtkRequestedByMeOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                              {engineerHtkRequestedByMeDocs.length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                                  <p className="text-gray-500 text-sm">Δεν έχεις ζητήσει ακόμα ΗΤΚ έγγραφα από τον ιδιοκτήτη/πωλητή.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {engineerHtkRequestedByMeDocs.map((doc) => renderDocRow(doc, { hideUpload: true }))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setLawyerHtkTotalOpen(!lawyerHtkTotalOpen)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left"
                          >
                            {lawyerHtkTotalOpen ? (
                              <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" />
                            ) : (
                              <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />
                            )}
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                              <FaCheckCircle className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                              <p className="text-xs text-blue-700 mt-0.5">
                                Δικά σου ανεβάσματα, εγκεκριμένα από εσένα και απαντήσεις στα αιτήματά σου — εμφανίζονται εδώ απευθείας χωρίς υποχρεωτική έγκριση
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">
                              {engineerHtkTotalDocs.length}
                            </span>
                          </button>

                          {lawyerHtkTotalOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                              {engineerHtkTotalDocs.length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                                  <p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα συνολικά ΗΤΚ έγγραφα.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {engineerHtkTotalDocs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="p-3 bg-white rounded-lg border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                          <FaFileAlt className="text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 truncate">
                                            {doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}
                                          </h5>
                                          {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                          {doc.uploadedById && <p className="text-xs text-gray-500">Ανέβηκε από: {getParticipantName(doc.uploadedById)}</p>}
                                          <span className="text-xs text-blue-600">
                                            {doc.uploadedById === userId
                                              ? 'Ανέβηκε από εσένα'
                                              : doc.reviewById === userId && doc.status === 'APPROVED'
                                                ? 'Εγκρίθηκε από εσένα'
                                                : doc.requestedById === userId
                                                  ? 'Απάντηση στο αίτημά σου (στα συνολικά χωρίς υποχρεωτική έγκριση)'
                                                  : 'Στα συνολικά ΗΤΚ'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {doc.fileName && (
                                          <button
                                            type="button"
                                            onClick={() => handleDownload(doc)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Λήψη"
                                          >
                                            <FaDownload />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removeEngineerHtkTotalDoc(doc)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Διαγραφή — εξαφανίζεται για όλους στα Συνολικά ΗΤΚ"
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setSellerLawyerHtkPendingOpen(!sellerLawyerHtkPendingOpen)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 transition-colors text-left"
                          >
                            {sellerLawyerHtkPendingOpen ? (
                              <FaChevronDown className="text-orange-600 flex-shrink-0 text-sm" />
                            ) : (
                              <FaChevronRight className="text-orange-600 flex-shrink-0 text-sm" />
                            )}
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                              <FaClipboardList className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Εκκρεμή Αιτήματα</h4>
                              <p className="text-xs text-orange-700 mt-0.5">
                                {isNotaryRole
                                  ? 'Μόνο αιτήματα ΗΤΚ που έχετε ζητήσει εσείς ως συμβολαιογράφος (προς μηχανικό)'
                                  : 'Αιτήματα ΗΤΚ προς τον μηχανικό που περιμένουν ανέβασμα'}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 text-sm font-bold flex-shrink-0">
                              {(isNotaryRole ? notaryHtkPendingDocs : htkPendingRequestsForCurrentRole).length}
                            </span>
                          </button>
                          {sellerLawyerHtkPendingOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-orange-200/60">
                              {(isNotaryRole ? notaryHtkPendingDocs : htkPendingRequestsForCurrentRole).length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-orange-100">
                                  <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(isNotaryRole ? notaryHtkPendingDocs : htkPendingRequestsForCurrentRole).map((doc) => renderDocRow(doc))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setLawyerHtkTotalOpen(!lawyerHtkTotalOpen)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left"
                          >
                            {lawyerHtkTotalOpen ? (
                              <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" />
                            ) : (
                              <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />
                            )}
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                              <FaCheckCircle className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                              <p className="text-xs text-blue-700 mt-0.5">
                                {isNotaryRole
                                  ? 'Ίδια λίστα με τα «Συνολικά Έγγραφα» ΗΤΚ του δικηγόρου πωλητή / μηχανικού (μόνο προβολή)'
                                  : isSellerLawyer || isBuyerLawyer
                                  ? 'Ίδια λίστα με τα «Συνολικά Έγγραφα» ΗΤΚ του μηχανικού του deal'
                                  : 'Εγκεκριμένα από μηχανικό + έγγραφα που έχεις ανεβάσει'}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">
                              {(isNotaryRole ? notaryHtkTotalMirror : htkTotalDocsForCurrentRole).length}
                            </span>
                          </button>

                          {lawyerHtkTotalOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                              {(isNotaryRole ? notaryHtkTotalMirror : htkTotalDocsForCurrentRole).length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                                  <p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα διαθέσιμα έγγραφα.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(isNotaryRole ? notaryHtkTotalMirror : htkTotalDocsForCurrentRole).map((doc) => {
                                    const engUid = primarySellerSideEngineerUserId;
                                    const mirrorHtkStatusLabel =
                                      (isSellerLawyer || isBuyerLawyer || isNotaryRole) && engUid
                                        ? doc.uploadedById === engUid
                                          ? 'Ανέβηκε από μηχανικό'
                                          : doc.reviewById === engUid && doc.status === 'APPROVED'
                                            ? 'Εγκρίθηκε από μηχανικό'
                                            : doc.requestedById === engUid
                                              ? 'Απάντηση στο αίτημα του μηχανικού (χωρίς υποχρεωτική έγκριση)'
                                              : 'ΗΤΚ έγγραφο'
                                        : null;
                                    return (
                                    <div
                                      key={doc.id}
                                      className="p-3 bg-white rounded-lg border border-blue-200/60 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                          <FaFileAlt className="text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 truncate">
                                            {doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}
                                          </h5>
                                          {doc.fileName && <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>}
                                          {doc.uploadedById && <p className="text-xs text-gray-500">Ανέβηκε από: {getParticipantName(doc.uploadedById)}</p>}
                                          <span className="text-xs text-blue-600">
                                            {mirrorHtkStatusLabel ??
                                              (doc.uploadedById === userId ? 'Ανέβηκε από εσένα' : 'Εγκρίθηκε από μηχανικό')}
                                          </span>
                                        </div>
                                      </div>
                                      {doc.fileName && (
                                        <button
                                          onClick={() => handleDownload(doc)}
                                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg flex-shrink-0 transition-colors"
                                          title="Λήψη"
                                        >
                                          <FaDownload />
                                        </button>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Non-professional view - Buyer and Seller share same two sub-tabs layout */
        (userRole === 'BUYER' || userRole === 'SELLER' || isSellerRole) ? (
          /* Buyer/Seller view - Two sub-tabs: pending (requested+rejected) | uploaded */
          /* Rent seller: also show content when buyer has uploaded docs for seller to approve */
          (documentsForUser.length === 0 &&
            !showSellerSaleFolderTabs &&
            !(isRent && isSellerRole && buyerDocsForSellerApproval.length > 0) &&
            !(isRent && isBuyerRole && isBasicDocumentsApproved()) &&
            !(isRent && isSellerRole) &&
            !isBuyerRole) ? (
            <EmptyState
            icon={<FaFileAlt className="text-2xl" />}
              title="Δεν υπάρχουν έγγραφα ή ενέργειες να κάνετε"
              description={
                userRole === 'SELLER' || isSellerRole
                  ? 'Θα εμφανιστούν έγγραφα όταν ο δικηγόρος ή ο μηχανικός σας τα ζητήσει ρητά.'
                  : 'Επικοινωνήστε μαζί του για ενημέρωση από τη συνομιλία.'
              }
              action={{
                label: 'Μετάβαση στη Συνομιλία',
                onClick: () => router.push(`/deals/${deal.id}?tab=chat`),
              }}
            />
          ) : (
            <>
              {/* Rent: Buyer - Προσχέδιο Συμφωνητικού (when step 3 completed) */}
              {isRent && isBuyerRole && isBasicDocumentsApproved() && (
                <CardSection title="Προσχέδιο Μισθωτηρίου" className="mb-6">
                  {rentContractDraft ? (
                    <div className="space-y-4">
                      {(() => {
                        const signedDoc = documents.find((d) =>
                          (d.category || '').toLowerCase().includes('υπογεγραμ') &&
                          (d as { uploadedById?: string }).uploadedById === userId
                        );
                        const hasSigned = signedDoc && (signedDoc.status === 'UPLOADED' || signedDoc.status === 'APPROVED');
                        const wasRejected = signedDoc && signedDoc.status === 'CHANGES_REQUESTED';

                        if (wasRejected) {
                          return (
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-red-900">Ο ιδιοκτήτης ζήτησε διορθώσεις στο έγγραφο.</p>
                                <p className="text-sm text-red-800 mt-1">Παρακαλώ ξαναανεβάστε το υπογεγραμμένο συμφωνητικό με τις απαραίτητες διορθώσεις.</p>
                                {signedDoc.reviewNote && (
                                  <p className="text-sm text-red-700 mt-2 italic">Σχόλιο: {signedDoc.reviewNote}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <label className={`inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium cursor-pointer ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                                  {isUploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                                  {isUploading ? 'Ανεβάζεται...' : 'Ξανανέβασμα'}
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !signedDoc) return;
                                      setIsUploading(true);
                                      try {
                                        await handleUpload(file, signedDoc.category, signedDoc.id);
                                        onRefresh();
                                      } finally {
                                        setIsUploading(false);
                                        e.target.value = '';
                                      }
                                    }}
                                    disabled={isUploading}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        }
                        if (hasSigned && signedDoc) {
                          return (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-green-900">Το υπογεγραμμένο συμφωνητικό έχει ανέβει.</p>
                                <p className="text-sm text-green-800 mt-1">Αναμένουμε την τελική υπογραφή/επιβεβαίωση από τον ιδιοκτήτη.</p>
                                {signedDoc.status === 'APPROVED' && (
                                  <p className="text-sm text-green-700 mt-1 font-medium">Το έγγραφο εγκρίθηκε από τον ιδιοκτήτη.</p>
                                )}
                              </div>
                              {signedDoc.status === 'UPLOADED' && (
                                <div className="flex-shrink-0">
                                  <label className={`inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium cursor-pointer ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                                    {isUploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                                    {isUploading ? 'Ανεβάζεται...' : 'Ξανανέβασμα'}
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !signedDoc) return;
                                        setIsUploading(true);
                                        try {
                                          await handleUpload(file, signedDoc.category, signedDoc.id);
                                          toast.success('Το νέο έγγραφο ανέβηκε. Ο ιδιοκτήτης θα δει την τελευταία έκδοση.');
                                          onRefresh();
                                        } finally {
                                          setIsUploading(false);
                                          e.target.value = '';
                                        }
                                      }}
                                      disabled={isUploading}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <>
                            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-red-200 bg-red-50/50">
                              <div>
                                <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-red-200 text-red-800 mb-2">🔴 Εκκρεμεί Υπογραφή</span>
                                <p className="font-semibold text-gray-900">Προσχέδιο συμφωνητικού από ιδιοκτήτη</p>
                                <p className="text-sm text-gray-600 mt-1">{rentContractDraft.fileName}</p>
                              </div>
                              <button
                                onClick={() => setShowRentSigningGuideModal(true)}
                                className="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                              >
                                <FaFileAlt /> Υπογραφή & Επανυποβολή
                              </button>
                            </div>
                            <p className="text-sm text-gray-600">
                              Πατήστε &quot;Υπογραφή & Επανυποβολή&quot; για οδηγίες υπογραφής στο gov.gr και ανέβασμα του υπογεγραμμένου PDF.
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FaInfoCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-900 mb-1">Αναμονή PDF από ιδιοκτήτη</h4>
                            <p className="text-sm text-yellow-800">
                              Ο ιδιοκτήτης θα ανεβάσει το προσχέδιο του συμφωνητικού στο tab &quot;Έγγραφα & Ενέργειες&quot;. Ελέγξτε εκεί ή ανανεώστε σε λίγο.
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => fetchDocuments()}
                        className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Ανανέωση
                      </button>
                    </div>
                  )}
                </CardSection>
              )}

              {isRent && isSellerRole && buyerDocsForSellerApproval.length > 0 && (
                <CardSection title="Βήμα 3: Έγκριση Εγγράφων Αγοραστή" className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Ο αγοραστής έχει ανεβάσει τα απαιτούμενα έγγραφα. Ελέγξτε και εγκρίνετε για να ολοκληρωθεί το βήμα.
                  </p>
                  <div className="space-y-3">
                    {buyerDocsForSellerApproval.map((doc) => (
                      <div key={doc.id} className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{doc.category}</div>
                          {doc.fileName && <p className="text-xs text-gray-500 mt-1">{doc.fileName}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {doc.fileName && (
                            <button onClick={() => handleDownload(doc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Λήψη">
                              <FaDownload />
                            </button>
                          )}
                          {doc.status === 'UPLOADED' && (
                            <>
                              <button onClick={() => handleReview(doc.id, 'APPROVED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Έγκριση">
                                <FaCheckCircle className="text-lg" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDocForReject(doc);
                                  setRejectNote('');
                                  setShowRejectModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Απόρριψη"
                              >
                                <FaTimesCircle className="text-lg" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardSection>
              )}

              {isBuyerRole ? (
                <div className="space-y-5">
                  <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setBuyerFolderOpen(!buyerFolderOpen)}
                      className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                    >
                      {buyerFolderOpen ? (
                        <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                      ) : (
                        <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                      )}
                      <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                        <FaFolderOpen className="text-lg" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-gray-900">Φάκελος Αγοραστή</h3>
                        <p className="text-xs text-amber-700 mt-0.5">Οργάνωση εγγράφων ανά κατηγορία</p>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                        {buyerTotalFolderDocs.length} έγγραφα
                      </span>
                    </button>

                    {buyerFolderOpen && (
                      <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                          <button type="button" onClick={() => setBuyerSectionRequestedOpen(!buyerSectionRequestedOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left">
                            {buyerSectionRequestedOpen ? <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />}
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaClipboardList className="text-lg" /></div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                              <p className="text-xs text-amber-700 mt-0.5">Αιτήματα που έχει ζητήσει ο δικηγόρος αγοραστή</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">{buyerRequestedByBuyerLawyerDocs.length}</span>
                          </button>
                          {buyerSectionRequestedOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                              {buyerRequestedByBuyerLawyerDocs.length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν αιτήματα από τον δικηγόρο αγοραστή.</p></div>
                              ) : (
                                <div className="space-y-2">
                                  {buyerRequestedByBuyerLawyerDocs.map((doc) => renderDocRow(doc))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
                          <button type="button" onClick={() => setBuyerSectionTotalOpen(!buyerSectionTotalOpen)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50/60 transition-colors text-left">
                            {buyerSectionTotalOpen ? <FaChevronDown className="text-purple-600 flex-shrink-0 text-sm" /> : <FaChevronRight className="text-purple-600 flex-shrink-0 text-sm" />}
                            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><FaCheckCircle className="text-lg" /></div>
                            <div className="flex-1 min-w-0 text-left">
                              <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                              <p className="text-xs text-purple-700 mt-0.5">
                                Έγγραφα που ανέβασε ο δικηγόρος σου + όσα έχεις ανεβάσει εσύ (εμφανίζονται εδώ αμέσως μετά το ανέβασμα)
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-800 text-sm font-bold flex-shrink-0">{buyerTotalFolderDocs.length}</span>
                          </button>
                          {buyerSectionTotalOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-purple-200/60">
                              {buyerTotalFolderDocs.length === 0 ? (
                                <div className="py-4 px-3 rounded-lg bg-white/60 border border-purple-100"><p className="text-gray-500 text-sm">Δεν υπάρχουν διαθέσιμα συνολικά έγγραφα.</p></div>
                              ) : (
                                <div className="space-y-2">
                                  {buyerTotalFolderDocs.map((doc) => renderDocRow(doc))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : showSellerSaleFolderTabs ? (
                <div className="space-y-6">
                  <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSellerSaleDocsSubTabAndUrl('folder')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        sellerSaleDocsSubTab === 'folder'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Φάκελος Πωλητή ({sellerFolderTabDocCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerSaleDocsSubTabAndUrl('htk')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        sellerSaleDocsSubTab === 'htk'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Ηλεκτρονική Ταυτότητα Κτηρίου ({sellerHtkTabDocCount})
                    </button>
                  </nav>

                  {sellerSaleDocsSubTab === 'folder' && (
                    <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                      {!slMirrorId &&
                        !buyerLawyerId &&
                        engineerUserIds.size === 0 &&
                        notaryUserIds.size === 0 && (
                        <div className="mx-5 mt-5 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                          Όταν επιλέξετε δικό σας δικηγόρο, ή όταν δικηγόρος αγοραστή / μηχανικός / συμβολαιογράφος ζητήσει έγγραφα από τον φάκελο
                          πωλητή, θα εμφανίζονται εδώ (εκτός ΗΤΚ).
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSellerLawyerFolderOpen(!sellerLawyerFolderOpen)}
                        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                      >
                        {sellerLawyerFolderOpen ? (
                          <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                        ) : (
                          <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                        )}
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                          <FaFolderOpen className="text-lg" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-lg font-bold text-gray-900">Φάκελος Πωλητή</h3>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {slMirrorId
                              ? 'Αιτήματα μόνο από τον δικό σας δικηγόρο — μετά το ανέβασμα, στο «Συνολικά Έγγραφα»'
                              : 'Αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο — μετά το ανέβασμα, στο «Συνολικά Έγγραφα»'}
                          </p>
                        </div>
                        <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                          {sellerFolderTabDocCount} έγγραφα
                        </span>
                      </button>

                      {sellerLawyerFolderOpen && (
                        <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setSellerLawyerSectionUploadedOpen(!sellerLawyerSectionUploadedOpen)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                            >
                              {sellerLawyerSectionUploadedOpen ? (
                                <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                              ) : (
                                <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                              )}
                              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                                <FaClipboardList className="text-lg" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {slMirrorId
                                    ? 'Μόνο αιτήματα που έχει ζητήσει ο δικός σας δικηγόρος (Φάκελος πωλητή → Ζητήστε έγγραφο).'
                                    : 'Αιτήματα από δικηγόρο αγοραστή, μηχανικό ή συμβολαιογράφο (Φάκελος πωλητή → Ζητήστε έγγραφο).'}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">
                                {sellerFolderPendingFromPros.length}
                              </span>
                            </button>
                            {sellerLawyerSectionUploadedOpen && (
                              <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                                {sellerFolderPendingFromPros.length === 0 ? (
                                  <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100">
                                    <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα προς εσάς.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {sellerFolderPendingFromPros.map((doc) => renderDocRow(doc))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setSellerLawyerSectionTotalOpen(!sellerLawyerSectionTotalOpen)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left"
                            >
                              {sellerLawyerSectionTotalOpen ? (
                                <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" />
                              ) : (
                                <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />
                              )}
                              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                                <FaCheckCircle className="text-lg" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                                <p className="text-xs text-blue-700 mt-0.5">
                                  Ίδια λίστα με τα «Συνολικά Έγγραφα» στον φάκελο πωλητή του δικηγόρου σας
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">
                                {sellerFolderTotalForSeller.length}
                              </span>
                            </button>
                            {sellerLawyerSectionTotalOpen && (
                              <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                                {sellerFolderTotalForSeller.length === 0 ? (
                                  <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                                    <p className="text-gray-500 text-sm">
                                      Δεν υπάρχουν ακόμα ανεβασμένα ή εγκεκριμένα έγγραφα στον φάκελο.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {sellerFolderTotalForSeller.map((doc) =>
                                      renderDocRow(doc, {
                                        showSellerFolderTotalTrash: !sellerLawyerId,
                                        hideReviewActions: true,
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sellerSaleDocsSubTab === 'htk' &&
                    (!engMirrorId ? (
                      <EmptyState
                        icon={<FaFileAlt className="text-2xl" />}
                        title="Δεν έχει οριστεί μηχανικός"
                        description="Όταν επιλέξετε μηχανικό, εδώ θα βλέπετε τα αιτήματα ΗΤΚ που στέλνει από το tab Ηλεκτρονική Ταυτότητα Κτηρίου."
                      />
                    ) : (
                      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setLawyerHtkFolderOpen(!lawyerHtkFolderOpen)}
                          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                        >
                          {lawyerHtkFolderOpen ? (
                            <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                          ) : (
                            <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                          )}
                          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <FaFolderOpen className="text-lg" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="text-lg font-bold text-gray-900">Ηλεκτρονική Ταυτότητα Κτηρίου</h3>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Αιτήματα μόνο από τον μηχανικό (Ζητήστε έγγραφο) · μετά το ανέβασμα στα «Συνολικά Έγγραφα»
                            </p>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-amber-200/80 text-amber-800 text-sm font-bold">
                            {sellerHtkTabDocCount} έγγραφα
                          </span>
                        </button>

                        {lawyerHtkFolderOpen && (
                          <div className="px-5 pb-5 pt-5 border-t border-amber-200/80 space-y-4">
                            <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                              <button
                                type="button"
                                onClick={() => setSellerOwnHtkPendingOpen(!sellerOwnHtkPendingOpen)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/60 transition-colors text-left"
                              >
                                {sellerOwnHtkPendingOpen ? (
                                  <FaChevronDown className="text-amber-600 flex-shrink-0 text-sm" />
                                ) : (
                                  <FaChevronRight className="text-amber-600 flex-shrink-0 text-sm" />
                                )}
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                                  <FaClipboardList className="text-lg" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <h4 className="font-bold text-gray-900">Έγγραφα που μου έχουν ζητήσει</h4>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    Μόνο αιτήματα ΗΤΚ που έχει στείλει ο μηχανικός (ΗΤΚ → Ζητήστε έγγραφο)
                                  </p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-800 text-sm font-bold flex-shrink-0">
                                  {sellerHtkPendingFromEngineerOnly.length}
                                </span>
                              </button>
                              {sellerOwnHtkPendingOpen && (
                                <div className="px-4 pb-4 pt-2 border-t border-amber-200/60">
                                  {sellerHtkPendingFromEngineerOnly.length === 0 ? (
                                    <div className="py-4 px-3 rounded-lg bg-white/60 border border-amber-100">
                                      <p className="text-gray-500 text-sm">Δεν υπάρχουν εκκρεμή αιτήματα από τον μηχανικό.</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {sellerHtkPendingFromEngineerOnly.map((doc) => renderDocRow(doc))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white overflow-hidden shadow-sm">
                              <button
                                type="button"
                                onClick={() => setSellerOwnHtkTotalOpen(!sellerOwnHtkTotalOpen)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors text-left"
                              >
                                {sellerOwnHtkTotalOpen ? (
                                  <FaChevronDown className="text-blue-600 flex-shrink-0 text-sm" />
                                ) : (
                                  <FaChevronRight className="text-blue-600 flex-shrink-0 text-sm" />
                                )}
                                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                                  <FaCheckCircle className="text-lg" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <h4 className="font-bold text-gray-900">Συνολικά Έγγραφα</h4>
                                  <p className="text-xs text-blue-700 mt-0.5">
                                    Ίδια λίστα με τα «Συνολικά Έγγραφα» ΗΤΚ του μηχανικού (μετά το ανέβασμα / έγκριση)
                                  </p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-bold flex-shrink-0">
                                  {sellerMirrorEngineerHtkTotalDocs.length}
                                </span>
                              </button>
                              {sellerOwnHtkTotalOpen && (
                                <div className="px-4 pb-4 pt-2 border-t border-blue-200/60">
                                  {sellerMirrorEngineerHtkTotalDocs.length === 0 ? (
                                    <div className="py-4 px-3 rounded-lg bg-white/60 border border-blue-100">
                                      <p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα συνολικά ΗΤΚ έγγραφα.</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {sellerMirrorEngineerHtkTotalDocs.map((doc) => renderDocRow(doc))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <>
                  {/* Buyer/Seller Inner Tabs Navigation */}
                  <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveBuyerTab('pending')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeBuyerTab === 'pending'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Έγγραφα που Πρέπει να Ανέβουν ({requestedDocs.length + rejectedDocs.length + (isRent && isSellerRole && isRentSellerStep4Ready() && !rentSellerContractDraftUploaded ? 1 : 0)})
                    </button>
                    <button
                      onClick={() => setActiveBuyerTab('uploaded')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeBuyerTab === 'uploaded'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Ανεβασμένα Έγγραφα ({uploadedDocs.length + approvedDocs.length + rejectedDocs.length + (isRent && isSellerRole && rentSellerContractDraftUploaded ? 1 : 0)})
                    </button>
                  </nav>

                  {/* Buyer Tab Content */}
                  {activeBuyerTab === 'pending' && (
                    <div className="space-y-5">
                      {/* Rent Seller Step 4: Προσχέδιο Συμβολαίου - in "documents to upload" */}
                      {isRent && isSellerRole && isRentSellerStep4Ready() && !rentSellerContractDraftUploaded && (
                        <CardSection title="Βήμα 4: Προσχέδιο Συμβολαίου Μίσθωσης">
                          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50">
                            <div>
                              <p className="font-semibold text-gray-900">Προσχέδιο Συμβολαίου Μίσθωσης</p>
                              <p className="text-sm text-gray-600 mt-1">Ανεβάστε το PDF για να το δει ο ενοικιαστής (ηλεκτρονική υπογραφή)</p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedDoc({ id: '', category: 'Προσχέδιο Συμβολαίου Μίσθωσης', dealRoomId: deal.id } as DealDocument);
                                setShowUploadModal(true);
                              }}
                              className="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                              <FaUpload /> Ανέβασμα
                            </button>
                          </div>
                        </CardSection>
                      )}

                      {requestedDocs.length === 0 && rejectedDocs.length === 0 && !(isRent && isSellerRole && isRentSellerStep4Ready() && !rentSellerContractDraftUploaded) ? (
                        <EmptyState
                          icon={<FaFileAlt className="text-2xl" />}
                          title="Δεν υπάρχουν αιτήματα"
                          description="Όλα τα αιτήματα εγγράφων έχουν απαντηθεί"
                        />
                      ) : (
                        <>
                          {/* Requested Documents */}
                          {requestedDocs.length > 0 && (
                            <CardSection title={`📋 Έγγραφα που Πρέπει να Ανέβουν (${requestedDocs.length})`}>
                              <div className="space-y-3">
                                {requestedDocs.map((doc) => {
                                  const actionType = isAction(doc) ? getActionType(doc.category) : null;
                                  const isActionDoc = isAction(doc);
                                  
                                  return (
                                    <div 
                                      key={doc.id} 
                                      onClick={() => {
                                        if (isActionDoc) {
                                          setSelectedActionForGuide(doc);
                                          setShowActionGuideModal(true);
                                        } else {
                                          setSelectedDocumentForGuide(doc);
                                          setShowDocumentGuideModal(true);
                                        }
                                      }}
                                      className={`p-4 flex items-center justify-between rounded-xl border transition-all group ${
                                        isActionDoc 
                                          ? 'bg-gradient-to-r from-green-50 to-white border-green-200 hover:bg-green-100 cursor-pointer' 
                                          : 'hover:bg-blue-50 border-gray-200 cursor-pointer'
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className="font-semibold text-gray-900 text-base">
                                            {isActionDoc ? doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim() : doc.category}
                                          </div>
                                        </div>
                                        {isActionDoc ? (
                                          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <FaQuestionCircle className="text-green-500" />
                                            <span className="text-green-600 font-medium">Κάντε κλικ για αναλυτικές οδηγίες</span>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <FaQuestionCircle className="text-blue-500" />
                                            <span className="text-blue-600 font-medium">Κάντε κλικ για οδηγίες</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2 ml-4 flex-shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDoc(doc);
                                            setShowUploadModal(true);
                                          }}
                                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                        >
                                          <FaUpload className="inline mr-1" />
                                          Ανέβασμα
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardSection>
                          )}
                          {/* Rejected Documents - Show in pending tab so buyer can re-upload */}
                          {rejectedDocs.length > 0 && (
                            <CardSection title={`Απορριφθέντα Έγγραφα - Χρειάζονται Διόρθωση (${rejectedDocs.length})`}>
                              <div className="space-y-3">
                                {rejectedDocs.map((doc) => (
                                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-red-50/50 rounded-xl border-2 border-red-200 bg-red-50/80 transition-all group">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="font-semibold text-gray-900 text-base">{doc.category}</div>
                                      </div>
                                      {doc.fileName && (
                                        <div className="text-sm text-gray-600 mt-1 truncate flex items-center gap-2">
                                          <FaFileAlt className="text-xs text-gray-400" />
                                          {doc.fileName}
                                        </div>
                                      )}
                                      {doc.reviewNote && (
                                        <div className="text-sm text-red-800 mt-2 bg-red-100 p-2.5 rounded-lg border border-red-300">
                                          <span className="font-medium">Σχόλιο ιδιοκτήτη:</span> {doc.reviewNote}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setShowUploadModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                      <FaUpload className="inline mr-1" />
                                      Επανανέβασμα
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </CardSection>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeBuyerTab === 'uploaded' && (
                    <div className="space-y-5">
                      {uploadedDocs.length === 0 && approvedDocs.length === 0 && rejectedDocs.length === 0 && !(isRent && isSellerRole && rentSellerContractDraftUploaded) ? (
                        <EmptyState
                          icon={<FaFileAlt className="text-2xl" />}
                          title="Δεν υπάρχουν ανεβασμένα έγγραφα"
                          description="Όταν ανεβάσεις έγγραφα, θα εμφανίζονται εδώ"
                        />
                      ) : (
                        <>
                          {approvedDocs.length > 0 && (
                            <CardSection title={`✓ Εγκεκριμένα Έγγραφα (${approvedDocs.length})`}>
                              <div className="space-y-3">
                                {approvedDocs.map((doc) => renderDocRow(doc))}
                              </div>
                            </CardSection>
                          )}
                          {uploadedDocs.length > 0 && (
                            <CardSection title={`⏳ Αναμονή Ελέγχου (${uploadedDocs.length})`}>
                              <div className="space-y-3">
                                {uploadedDocs.map((doc) => renderDocRow(doc))}
                              </div>
                            </CardSection>
                          )}
                          {rejectedDocs.length > 0 && (
                            <CardSection title={`✕ Απορριφθέντα Έγγραφα (${rejectedDocs.length})`}>
                              <div className="space-y-3">
                                {rejectedDocs.map((doc) => renderDocRow(doc))}
                              </div>
                            </CardSection>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )
        ) : (
          /* Seller or other non-professional view - Original grouped by status */
          documentsForUser.length === 0 ? (
          <EmptyState
            icon={<FaFileAlt className="text-2xl" />}
            title="Δεν υπάρχουν έγγραφα ή ενέργειες να κάνετε"
            description={
              isSellerRole
                ? 'Θα εμφανιστούν έγγραφα όταν ο δικηγόρος ή ο μηχανικός σας τα ζητήσει ρητά.'
                : 'Ξεκίνησε προσθέτοντας ένα αίτημα εγγράφου.'
            }
            action={
              isProfessional
                ? {
                    label: 'Αίτημα Εγγράφου',
                    onClick: () => setShowRequestModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-5">
            {/* Requested Section */}
            {requestedDocs.length > 0 && (
              <CardSection title={`Αιτηθέντα (${requestedDocs.length})`}>
                <div className="space-y-3">
                  {requestedDocs.map((doc) => renderDocRow(doc))}
                </div>
              </CardSection>
            )}

            {/* Uploaded (Waiting Review) Section */}
            {uploadedDocs.length > 0 && (
              <CardSection title={`Ανέβηκαν - Αναμονή Ελέγχου (${uploadedDocs.length})`}>
                <div className="space-y-3">
                  {uploadedDocs.map((doc) => renderDocRow(doc))}
                </div>
              </CardSection>
            )}

            {/* Rejected Section */}
            {rejectedDocs.length > 0 && (
              <CardSection title={`Αναθεώρηση (${rejectedDocs.length})`}>
                <div className="space-y-3">
                  {rejectedDocs.map((doc) => renderDocRow(doc))}
                </div>
              </CardSection>
            )}

            {/* Approved Section */}
            {approvedDocs.length > 0 && (
              <CardSection title={`Εγκεκριμένα (${approvedDocs.length})`}>
                <div className="space-y-3">
                  {approvedDocs.map((doc) => renderDocRow(doc))}
                </div>
              </CardSection>
            )}
          </div>
          )
        )
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {requestType === null ? (isEngineerRole ? 'Αίτημα Εγγράφου' : 'Αίτημα Εγγράφου ή Ενέργειας') :
               requestType === 'DOCUMENT' ? 'Αίτημα Εγγράφου' :
               'Αίτημα Ενέργειας'}
            </h3>
            <div className="space-y-4">
              {/* Type Selection - First step (only for professionals) */}
              {isProfessional && !isEngineerRole && requestType === null && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Επιλέξτε Τύπο
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRequestType('DOCUMENT');
                          if (isEngineerRole) setSelectedSide('SELLER');
                        }}
                        className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">📄 Έγγραφο</div>
                        <div className="text-sm text-gray-600">
                          {isEngineerRole ? 'Αίτημα εγγράφου από τον πωλητή' : 'Αίτημα εγγράφου από αγοραστή ή πωλητή'}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestType('ACTION');
                          setSelectedActionTarget(isEngineerRole ? 'SELLER_GROUP' : null);
                        }}
                        className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">⚡ Ενέργεια</div>
                        <div className="text-sm text-gray-600">
                          {isEngineerRole ? 'Αίτημα ενέργειας από τον πωλητή' : 'Αίτημα ενέργειας από αγοραστή ή πωλητή'}
                        </div>
                      </button>
                </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowRequestModal(false);
                        setRequestType(null);
                        setSelectedSide(null);
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setSelectedActionTarget(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Ακύρωση
                    </button>
                  </div>
                </>
              )}

              {/* Document Flow */}
              {requestType === 'DOCUMENT' && (
                <>
                  {/* Side Selection - First step (skip for engineer, goes directly to seller) */}
                  {!isEngineerRole && selectedSide === null && (
                <>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Επιλέξτε Πλευρά
                </label>
                    <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                        onClick={() => setSelectedSide('BUYER')}
                        className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">Αγοραστής</div>
                        <div className="text-sm text-gray-600">Αίτημα εγγράφων από τον αγοραστή</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSide('SELLER')}
                        className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-1">Πωλητής-Δικηγόρος</div>
                        <div className="text-sm text-gray-600">Αίτημα εγγράφων από τον πωλητή και τον δικηγόρο του</div>
                      </button>
                </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                  <button
                      onClick={() => {
                      setShowRequestModal(false);
                      setRequestType(null);
                      setSelectedSide(null);
                      setSelectedDocumentTypes([]);
                      setCustomDocumentNames({});
                      setCustomDocumentGuides({});
                      setSelectedAction(null);
                      setCustomActionName('');
                      setCustomActionWhere('');
                      setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Ακύρωση
                  </button>
                  </div>
                </>
              )}

              {/* Document Selection - Second step (engineer skips side selection, goes straight here) */}
              {(isEngineerRole || selectedSide !== null) && (
                <>
                  {isSellerLawyer && activeInnerTab === 'overview' && selectedSide === 'SELLER' && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-800">
                        Τα παρακάτω έγγραφα ζητούνται αποκλειστικά από τον ιδιοκτήτη του ακινήτου.
                      </p>
                    </div>
                  )}

                  {/* Back button (engineer goes back to type selection, others to side selection) */}
                  {!isEngineerRole && !(((isSellerLawyer && (
                    (activeInnerTab === 'incoming' && selectedSide === 'BUYER') ||
                    (activeInnerTab === 'overview' && selectedSide === 'SELLER')
                  ))) || (
                    isLawyerRole &&
                    activeInnerTab === 'htk' &&
                    selectedSide === 'SELLER' &&
                    isSellerLawyerHtkRequestFlow
                  )) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEngineerRole) {
                          setRequestType(null);
                          setSelectedSide(null);
                        } else {
                          setSelectedSide(null);
                        }
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 mb-2"
                    >
                      {isEngineerRole ? '← Επιστροφή στην επιλογή τύπου' : '← Επιστροφή στην επιλογή πλευράς'}
                    </button>
                  )}

                  {/* Document Type Selection - Multiple Selection */}
              <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {isEngineerRole ? 'Επιλέξτε Έγγραφα από Πωλητή (πολλαπλή επιλογή)' : selectedSide === 'BUYER' ? 'Επιλέξτε Έγγραφα από Αγοραστή (πολλαπλή επιλογή)' : 'Επιλέξτε Έγγραφα από Πωλητή (πολλαπλή επιλογή)'}
                </label>
                      {!isEngineerRole && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allTypes = selectedSide === 'BUYER' ? buyerDocumentTypes : sellerDocumentTypes;
                            const availableTypes = allTypes.filter((docType: string) => {
                              const requestedCategoryKey = isSellerLawyerHtkRequestFlow ? `ΗΤΚ: ${docType}` : docType;
                              return !alreadyRequestedCategories.has(requestedCategoryKey);
                            });
                            setSelectedDocumentTypes([...availableTypes]);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Επιλογή Όλων
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocumentTypes([]);
                            setCustomDocumentNames({});
                            setCustomDocumentGuides({});
                          }}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Αποεπιλογή Όλων
                        </button>
                      </div>
                      )}
                      {isEngineerRole && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const toAdd = engineerPredefinedDocuments.filter((d) => !alreadyRequestedCategories.has(d.title));
                            const newTypes = toAdd.map((d) => d.title);
                            const newGuides = Object.fromEntries(toAdd.map((d) => [d.title, { where: d.where, instructions: d.description }]));
                            setSelectedDocumentTypes((prev) => Array.from(new Set([...prev, ...newTypes])));
                            setCustomDocumentGuides((prev) => ({ ...prev, ...newGuides }));
                          }}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          Επιλογή Όλων
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocumentTypes([]);
                            setCustomDocumentNames({});
                            setCustomDocumentGuides({});
                          }}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Αποεπιλογή Όλων
                        </button>
                      </div>
                      )}
                    </div>
                    {selectedDocumentTypes.length > 0 && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">
                          Επιλέχθηκαν: {selectedDocumentTypes.length} {selectedDocumentTypes.length === 1 ? 'έγγραφο' : 'έγγραφα'}
                        </p>
                      </div>
                    )}
                    {isEngineerRole ? (
                      /* Engineer: Grid of selectable documents (like lawyer/notary) - Τίτλος και Περιγραφή auto-fill */
                      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {engineerPredefinedDocuments.map((d) => {
                          const isSelected = selectedDocumentTypes.includes(d.title);
                          const isAlreadyRequested = alreadyRequestedCategories.has(d.title);
                          return (
                            <div key={d.id} className="space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAlreadyRequested) {
                                    toast.error(`Το έγγραφο "${d.title}" έχει ήδη ζητηθεί`);
                                    return;
                                  }
                                  if (isSelected) {
                                    setSelectedDocumentTypes((prev) => prev.filter((t) => t !== d.title));
                                    setCustomDocumentGuides((prev) => {
                                      const g = { ...prev };
                                      delete g[d.title];
                                      return g;
                                    });
                                  } else {
                                    setSelectedDocumentTypes((prev) => [...prev, d.title]);
                                    setCustomDocumentGuides((prev) => ({
                                      ...prev,
                                      [d.title]: { where: d.where, instructions: d.description },
                                    }));
                                  }
                                }}
                                disabled={isAlreadyRequested}
                                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${
                                  isAlreadyRequested
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isAlreadyRequested ? 'border-gray-300 bg-gray-200' : isSelected ? 'border-white bg-white' : 'border-gray-400'}`}>
                                  {isSelected && !isAlreadyRequested && <span className="text-amber-600 text-xs font-bold">✓</span>}
                                  {isAlreadyRequested && <span className="text-gray-400 text-xs">✗</span>}
                                </div>
                                <span className="flex-1">{d.title}</span>
                                {isAlreadyRequested && <span className="text-xs text-gray-500 italic">(Έχει ήδη ζητηθεί)</span>}
                              </button>
                            </div>
                          );
                        })}
                        {/* Άλλο / Προσαρμοσμένο Έγγραφο */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              const isSelected = selectedDocumentTypes.includes(ENGINEER_CUSTOM_LABEL);
                              if (isSelected) {
                                setSelectedDocumentTypes((prev) => prev.filter((t) => t !== ENGINEER_CUSTOM_LABEL));
                                setCustomDocumentNames((prev) => {
                                  const n = { ...prev };
                                  delete n[ENGINEER_CUSTOM_LABEL];
                                  return n;
                                });
                                setCustomDocumentGuides((prev) => {
                                  const g = { ...prev };
                                  delete g[ENGINEER_CUSTOM_LABEL];
                                  return g;
                                });
                              } else {
                                setSelectedDocumentTypes((prev) => [...prev, ENGINEER_CUSTOM_LABEL]);
                              }
                            }}
                            className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${
                              selectedDocumentTypes.includes(ENGINEER_CUSTOM_LABEL)
                                ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedDocumentTypes.includes(ENGINEER_CUSTOM_LABEL) ? 'border-white bg-white' : 'border-gray-400'}`}>
                              {selectedDocumentTypes.includes(ENGINEER_CUSTOM_LABEL) && <span className="text-amber-600 text-xs font-bold">✓</span>}
                            </div>
                            <span className="flex-1">➕ {ENGINEER_CUSTOM_LABEL}</span>
                          </button>
                          {selectedDocumentTypes.includes(ENGINEER_CUSTOM_LABEL) && (
                            <div className="ml-0 space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Όνομα Εγγράφου *</label>
                                <input
                                  type="text"
                                  placeholder="Π.χ. Πιστοποιητικό Καθαρού Εισοδήματος"
                                  value={customDocumentNames[ENGINEER_CUSTOM_LABEL] || ''}
                                  onChange={(e) => setCustomDocumentNames((prev) => ({ ...prev, [ENGINEER_CUSTOM_LABEL]: e.target.value }))}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Πού θα το βρει ο πωλητής *</label>
                                <input
                                  type="text"
                                  placeholder="Π.χ. Πύλη myAADE (aade.gr)"
                                  value={customDocumentGuides[ENGINEER_CUSTOM_LABEL]?.where || ''}
                                  onChange={(e) =>
                                    setCustomDocumentGuides((prev) => ({
                                      ...prev,
                                      [ENGINEER_CUSTOM_LABEL]: { ...prev[ENGINEER_CUSTOM_LABEL], where: e.target.value, instructions: prev[ENGINEER_CUSTOM_LABEL]?.instructions || '' },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Οδηγίες *</label>
                                <textarea
                                  placeholder="Π.χ. Συνδέσου στο myAADE με τους κωδικούς TaxisNet..."
                                  value={customDocumentGuides[ENGINEER_CUSTOM_LABEL]?.instructions || ''}
                                  onChange={(e) =>
                                    setCustomDocumentGuides((prev) => ({
                                      ...prev,
                                      [ENGINEER_CUSTOM_LABEL]: { ...prev[ENGINEER_CUSTOM_LABEL], where: prev[ENGINEER_CUSTOM_LABEL]?.where || '', instructions: e.target.value },
                                    }))
                                  }
                                  rows={4}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {(selectedSide === 'BUYER' ? buyerDocumentTypes : sellerDocumentTypes).map((docType) => {
                          const isSelected = selectedDocumentTypes.includes(docType);
                          const requestedCategoryKey = isSellerLawyerHtkRequestFlow ? `ΗΤΚ: ${docType}` : docType;
                          const isAlreadyRequested = alreadyRequestedCategories.has(requestedCategoryKey);
                          const isCustomDoc = docType === 'Άλλο';
                          return (
                            <div key={docType} className="space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAlreadyRequested) {
                                    toast.error(`Το έγγραφο "${docType}" έχει ήδη ζητηθεί`);
                                    return;
                                  }
                                  if (isSelected) {
                                    setSelectedDocumentTypes((prev) => prev.filter((t) => t !== docType));
                                    if (isCustomDoc) {
                                      setCustomDocumentNames((prev) => {
                                        const newNames = { ...prev };
                                        delete newNames[docType];
                                        return newNames;
                                      });
                                      setCustomDocumentGuides((prev) => {
                                        const newGuides = { ...prev };
                                        delete newGuides[docType];
                                        return newGuides;
                                      });
                                    }
                                  } else {
                                    setSelectedDocumentTypes((prev) => [...prev, docType]);
                                  }
                                }}
                                disabled={isAlreadyRequested}
                                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${
                                  isAlreadyRequested ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    isAlreadyRequested ? 'border-gray-300 bg-gray-200' : isSelected ? 'border-white bg-white' : 'border-gray-400'
                                  }`}
                                >
                                  {isSelected && !isAlreadyRequested && <span className="text-blue-600 text-xs font-bold">✓</span>}
                                  {isAlreadyRequested && <span className="text-gray-400 text-xs">✗</span>}
                                </div>
                                <span className="flex-1">{docType}</span>
                                {isAlreadyRequested && <span className="text-xs text-gray-500 italic">(Έχει ήδη ζητηθεί)</span>}
                              </button>
                              {isCustomDoc && isSelected && !isAlreadyRequested && (
                                <div className="ml-7 space-y-3 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Όνομα Εγγράφου *</label>
                                    <input
                                      type="text"
                                      placeholder="Π.χ. Πιστοποιητικό Καθαρού Εισοδήματος"
                                      value={customDocumentNames[docType] || ''}
                                      onChange={(e) => setCustomDocumentNames((prev) => ({ ...prev, [docType]: e.target.value }))}
                                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Πού θα το βρει ο χρήστης *</label>
                                    <input
                                      type="text"
                                      placeholder="Π.χ. Πύλη myAADE (aade.gr)"
                                      value={customDocumentGuides[docType]?.where || ''}
                                      onChange={(e) =>
                                        setCustomDocumentGuides((prev) => ({ ...prev, [docType]: { ...prev[docType], where: e.target.value, instructions: prev[docType]?.instructions || '' } }))
                                      }
                                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Οδηγίες *</label>
                                    <textarea
                                      placeholder="Π.χ. Συνδέσου στο myAADE με τους κωδικούς TaxisNet..."
                                      value={customDocumentGuides[docType]?.instructions || ''}
                                      onChange={(e) =>
                                        setCustomDocumentGuides((prev) => ({ ...prev, [docType]: { ...prev[docType], where: prev[docType]?.where || '', instructions: e.target.value } }))
                                      }
                                      rows={4}
                                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
              </div>

                  {/* Info about seller-lawyer requests */}
                  {selectedSide === 'SELLER' && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm text-gray-700">
                        <strong>Σημείωση:</strong>{' '}
                        {isSellerLawyerHtkRequestFlow
                          ? 'Το αίτημα αφορά έγγραφο ΗΤΚ και απευθύνεται στον μηχανικό.'
                          : 'Το αίτημα θα εμφανιστεί στον πωλητή και στον δικηγόρο του (αν υπάρχει).'}
                      </p>
                    </div>
                  )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                      onClick={async () => {
                        if (selectedDocumentTypes.length === 0) {
                          toast.error('Παρακαλώ επιλέξτε τουλάχιστον ένα έγγραφο');
                          return;
                        }

                        // Validate custom document names and guides
                        const isCustomDocType = (t: string) => t === 'Άλλο' || t === ENGINEER_CUSTOM_LABEL;
                        const invalidCustomDocs = selectedDocumentTypes.filter(
                          docType => isCustomDocType(docType) && (
                            !customDocumentNames[docType]?.trim() ||
                            !customDocumentGuides[docType]?.where?.trim() ||
                            !customDocumentGuides[docType]?.instructions?.trim()
                          )
                        );
                        
                        if (invalidCustomDocs.length > 0) {
                          toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία για τα προσαρμοσμένα έγγραφα (όνομα, πού θα το βρει, οδηγίες)');
                          return;
                        }
                    
                        // Filter out already requested documents
                        const validDocumentTypes = selectedDocumentTypes.filter((docType) => {
                          const requestedCategoryKey = isSellerLawyerHtkRequestFlow ? `ΗΤΚ: ${docType}` : docType;
                          return !alreadyRequestedCategories.has(requestedCategoryKey);
                        });

                        if (validDocumentTypes.length === 0) {
                          toast.error('Όλα τα επιλεγμένα έγγραφα έχουν ήδη ζητηθεί');
                          return;
                        }

                        if (validDocumentTypes.length < selectedDocumentTypes.length) {
                          toast.error(`Μερικά έγγραφα έχουν ήδη ζητηθεί. Θα σταλούν μόνο τα ${validDocumentTypes.length} νέα αιτήματα.`);
                        }

                        // Send all selected documents
                        try {
                          const requests = validDocumentTypes.map(docType => {
                            const baseCategory = (docType === 'Άλλο' || docType === ENGINEER_CUSTOM_LABEL)
                              ? customDocumentNames[docType].trim()
                              : docType;
                            const category = isSellerLawyerHtkRequestFlow ? `ΗΤΚ: ${baseCategory}` : baseCategory;
                            const guide = (docType === 'Άλλο' || docType === ENGINEER_CUSTOM_LABEL)
                              ? customDocumentGuides[docType]
                              : (isEngineerRole && engineerDocumentGuides[docType]) || null;
                            return handleRequest(
                              category, 
                              isEngineerRole ? 'SELLER' : (selectedSide!),
                              undefined,
                              guide?.where,
                              guide?.instructions
                            );
                          });

                          await Promise.all(requests);
                          toast.success(`Στάλθηκαν ${validDocumentTypes.length} ${validDocumentTypes.length === 1 ? 'αίτημα' : 'αιτήματα'} επιτυχώς`);
                          
                          // Reset form
                          setRequestType(null);
                          setSelectedSide(null);
                          setSelectedDocumentTypes([]);
                          setCustomDocumentNames({});
                          setCustomDocumentGuides({});
                          setSelectedAction(null);
                          setCustomActionName('');
                          setCustomActionWhere('');
                          setCustomActionInstructions('');
                          setIsSellerLawyerHtkRequestFlow(false);
                          setShowRequestModal(false);
                        } catch (error: any) {
                          console.error('Error requesting documents:', error);
                          toast.error(error.message || 'Αποτυχία αποστολής αιτημάτων');
                        }
                      }}
                        disabled={selectedDocumentTypes.length === 0 || selectedDocumentTypes.some(
                        docType => (docType === 'Άλλο' || docType === ENGINEER_CUSTOM_LABEL) && (
                          !customDocumentNames[docType]?.trim() ||
                          !customDocumentGuides[docType]?.where?.trim() ||
                          !customDocumentGuides[docType]?.instructions?.trim()
                        )
                      )}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Αίτημα {selectedDocumentTypes.length > 0 && `(${selectedDocumentTypes.length})`}
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                        setRequestType(null);
                        setSelectedSide(null);
                        setSelectedDocumentTypes([]);
                        setCustomDocumentNames({});
                        setCustomDocumentGuides({});
                        setSelectedAction(null);
                        setCustomActionName('');
                        setCustomActionWhere('');
                        setCustomActionInstructions('');
                        setIsSellerLawyerHtkRequestFlow(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
                </>
              )}
                </>
              )}

              {/* Action Flow */}
              {requestType === 'ACTION' && (
                <>
                  {/* Action Target Selection - before selecting action */}
                  {!isEngineerRole && selectedActionTarget === null && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Επιλέξτε Πλευρά
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedActionTarget('BUYER')}
                            className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                          >
                            <div className="font-semibold text-gray-900 mb-1">Αγοραστής</div>
                            <div className="text-sm text-gray-600">Αίτημα ενέργειας από τον αγοραστή</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedActionTarget('SELLER_GROUP')}
                            className="px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                          >
                            <div className="font-semibold text-gray-900 mb-1">Πωλητής-Δικηγόρος</div>
                            <div className="text-sm text-gray-600">Αίτημα ενέργειας από τον πωλητή και τον δικηγόρο του</div>
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setRequestType(null);
                            setSelectedActionTarget(null);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          ← Επιστροφή
                        </button>
                        <button
                          onClick={() => {
                            setShowRequestModal(false);
                            setIsSellerLawyerHtkRequestFlow(false);
                            setRequestType(null);
                            setSelectedActionTarget(null);
                            setSelectedAction(null);
                            setCustomActionName('');
                            setCustomActionWhere('');
                            setCustomActionInstructions('');
                      setIsSellerLawyerHtkRequestFlow(false);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Ακύρωση
                        </button>
                      </div>
                    </>
                  )}

                  {/* Predefined Actions */}
                  {selectedAction === null && (isEngineerRole || selectedActionTarget !== null) && (
                    <>
              <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Επιλέξτε Ενέργεια
                </label>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {isEngineerRole ? (
                            <>
                              <button type="button" onClick={() => setSelectedAction('ENGINEER_POWER_OF_ATTORNEY')} className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                                <div className="font-semibold text-gray-900 mb-1">✍️ Ψηφιακή Εξουσιοδότηση Μηχανικού</div>
                                <div className="text-sm text-gray-600">Για να πάει ο μηχανικός στην Πολεοδομία και να βρει τα χαμένα σχέδια</div>
                              </button>
                              <button type="button" onClick={() => setSelectedAction('SETTLEMENT_FEE')} className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                                <div className="font-semibold text-gray-900 mb-1">💸 Πληρωμή Παραβόλου / Προστίμου Αυθαιρέτων</div>
                                <div className="text-sm text-gray-600">Ταυτότητα Οφειλής (Κωδικός RF) – πληρωμή προς Δημόσιο/ΤΕΕ</div>
                              </button>
                              <button type="button" onClick={() => setSelectedAction('ENGINEER_OWNER_DECLARATION')} className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                                <div className="font-semibold text-gray-900 mb-1">📝 Υπογραφή Υπεύθυνης Δήλωσης Ιδιοκτήτη</div>
                                <div className="text-sm text-gray-600">Για την έκδοση ΗΤΚ – δήλωση ότι δεν υπάρχουν κρυφές αυθαιρεσίες</div>
                              </button>
                              <button type="button" onClick={() => setSelectedAction('ENGINEER_E9_CORRECTION')} className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                                <div className="font-semibold text-gray-900 mb-1">🏛️ Διόρθωση Ε9 (Μέσω Λογιστή)</div>
                                <div className="text-sm text-gray-600">Απόκλιση τ.μ. μεταξύ σχεδίων και δήλωσης στην Εφορία</div>
                              </button>
                              <button type="button" onClick={() => setSelectedAction('CUSTOM')} className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                                <div className="font-semibold text-gray-900 mb-1">➕ Άλλη Ενέργεια</div>
                                <div className="text-sm text-gray-600">Προσαρμοσμένη ενέργεια με οδηγίες</div>
                              </button>
                            </>
                          ) : isBuyerFromGreece ? (
                            <>
                              {/* Loan Application */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('LOAN_APPLICATION')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">🏦 Αίτηση Στεγαστικού Δανείου</div>
                                <div className="text-sm text-gray-600">Η κατάθεση δικαιολογητικών στην τράπεζα για προέγκριση</div>
                              </button>

                              {/* Appraisal Fee */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('APPRAISAL_FEE')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">💰 Πληρωμή Τέλους Εκτίμησης</div>
                                <div className="text-sm text-gray-600">Πληρωμή παράβολου τεχνικού ελέγχου της τράπεζας (150€-200€)</div>
                              </button>

                              {/* Transfer Tax Payment */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('TRANSFER_TAX')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">🧾 Πληρωμή Φόρου Μεταβίβασης (ΦΜΑ)</div>
                                <div className="text-sm text-gray-600">Πληρωμή φόρου στο myProperty (aade.gr)</div>
                              </button>

                              {/* Utilities Transfer */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('UTILITIES_TRANSFER')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">🔌 Μεταφορά Λογαριασμών ΔΕΚΟ</div>
                                <div className="text-sm text-gray-600">Αλλαγή ονόματος σε ρεύμα, νερό, φυσικό αέριο</div>
                              </button>

                              {/* E9 Declaration */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('E9_DECLARATION')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">🏚️ Δήλωση στο Ε9</div>
                                <div className="text-sm text-gray-600">Δήλωση νέου ακινήτου στην εφορία εντός 30 ημερών</div>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Tax Representative Assignment */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('TAX_REP_ASSIGNMENT')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">📋 Ορισμός Φορολογικού Εκπροσώπου</div>
                                <div className="text-sm text-gray-600">Η ανάθεση σε κάτοικο Ελλάδας να είναι ο σύνδεσμος με την εφορία</div>
                              </button>

                              {/* Deposit Transfer */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('DEPOSIT_TRANSFER')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">💸 Αποστολή Εμβάσματος Προκαταβολής</div>
                                <div className="text-sm text-gray-600">Η μεταφορά του ποσού δέσμευσης (συνήθως 10%) από το εξωτερικό</div>
                              </button>

                              {/* Document Translation */}
                              <button
                                type="button"
                                onClick={() => setSelectedAction('DOCUMENT_TRANSLATION')}
                                className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="font-semibold text-gray-900 mb-1">🌐 Επίσημη Μετάφραση Εγγράφων</div>
                                <div className="text-sm text-gray-600">Η επικύρωση των ξένων εγγράφων στα Ελληνικά</div>
                              </button>
                            </>
                          )}

                          {!isEngineerRole && (
                            <button
                              type="button"
                              onClick={() => setSelectedAction('CUSTOM')}
                              className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                            >
                              <div className="font-semibold text-gray-900 mb-1">➕ Προσαρμοσμένη Ενέργεια</div>
                              <div className="text-sm text-gray-600">Προσθέστε δική σας ενέργεια με οδηγίες</div>
                            </button>
                          )}
                        </div>
                      </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                            setRequestType(null);
                            setSelectedAction(null);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          ← Επιστροφή
                        </button>
                        <button
                          onClick={() => {
                            setShowRequestModal(false);
                            setIsSellerLawyerHtkRequestFlow(false);
                            setRequestType(null);
                            setSelectedActionTarget(null);
                            setSelectedAction(null);
                            setCustomActionName('');
                            setCustomActionWhere('');
                            setCustomActionInstructions('');
                            setActionDescription('');
                            setActionWhy('');
                            setActionWhere('');
                            setActionInstructions('');
                            setActionAdditionalInfo('');
                            setActionResult('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Ακύρωση
                        </button>
                      </div>
                    </>
                  )}

                  {/* Action Details Form */}
                  {selectedAction !== null && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAction(null);
                          setCustomActionName('');
                          setCustomActionWhere('');
                          setCustomActionInstructions('');
                          setActionDescription('');
                          setActionWhy('');
                          setActionWhere('');
                          setActionInstructions('');
                          setActionAdditionalInfo('');
                          setActionResult('');
                          setActionRfCode('');
                          setActionAmount('');
                          setActionDeclarationText('');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 mb-2"
                      >
                        ← Επιστροφή στην επιλογή ενέργειας
                      </button>

                      {selectedAction === 'CUSTOM' ? (
                        <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                              Όνομα Ενέργειας *
                  </label>
                  <input
                    type="text"
                              value={customActionName}
                              onChange={(e) => setCustomActionName(e.target.value)}
                              placeholder="Π.χ. Αίτηση για Ενεργειακό Πιστοποιητικό"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                              Τι είναι *
                </label>
                            <textarea
                              value={customActionInstructions.split('\n')[0] || ''}
                              onChange={(e) => {
                                const parts = customActionInstructions.split('\n');
                                parts[0] = e.target.value;
                                setCustomActionInstructions(parts.join('\n'));
                              }}
                              placeholder="Περιγραφή της ενέργειας"
                              rows={2}
                              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Πού γίνεται *
                            </label>
                            <input
                              type="text"
                              value={customActionWhere}
                              onChange={(e) => setCustomActionWhere(e.target.value)}
                              placeholder="Π.χ. Online στο gov.gr"
                              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Οδηγία *
                            </label>
                            <textarea
                              value={customActionInstructions.split('\n').slice(1).join('\n')}
                              onChange={(e) => {
                                const firstPart = customActionInstructions.split('\n')[0] || '';
                                setCustomActionInstructions(firstPart + '\n' + e.target.value);
                              }}
                              placeholder="Αναλυτικές οδηγίες για τον αγοραστή"
                              rows={4}
                              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Edit mode for lawyer - show editable fields */}
                          {isProfessional && (
                            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Σημείωση:</strong> Μπορείτε να επεξεργαστείτε όλες τις πληροφορίες πριν τη δημιουργία της ενέργειας.
                              </p>
                            </div>
                          )}
                          
                          {/* Pre-filled action details - editable for professionals */}
                          {selectedAction === 'LOAN_APPLICATION' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionDescription || 'Η κατάθεση δικαιολογητικών στην τράπεζα για προέγκριση. (Αν η αγορά γίνεται με δάνειο)'}
                                    onChange={(e) => setActionDescription(e.target.value)}
                                    placeholder="Περιγραφή της ενέργειας"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-blue-800">Η κατάθεση δικαιολογητικών στην τράπεζα για προέγκριση. (Αν η αγορά γίνεται με δάνειο)</p>
                )}
              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Πού γίνεται:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionWhere || 'Σε κατάστημα τράπεζας ή μέσω e-banking/gov.gr (KYC)'}
                                    onChange={(e) => setActionWhere(e.target.value)}
                                    placeholder="Πού γίνεται η ενέργεια"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-green-800">Σε κατάστημα τράπεζας ή μέσω e-banking/gov.gr (KYC)</p>
                                )}
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Οδηγία:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionInstructions || 'Υπόβαλε αίτηση στην τράπεζα της επιλογής σου. Χρησιμοποίησε το eGov-KYC για να στείλεις τα στοιχεία σου αυτόματα.'}
                                    onChange={(e) => setActionInstructions(e.target.value)}
                                    placeholder="Αναλυτικές οδηγίες"
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-purple-800">Υπόβαλε αίτηση στην τράπεζα της επιλογής σου. Χρησιμοποίησε το eGov-KYC για να στείλεις τα στοιχεία σου αυτόματα.</p>
                                )}
                              </div>
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionResult || 'Upload "Προέγκριση Δανείου"'}
                                    onChange={(e) => setActionResult(e.target.value)}
                                    placeholder="Αναμενόμενο αποτέλεσμα"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-gray-800">Upload "Προέγκριση Δανείου"</p>
                                )}
                              </div>
                            </>
                          )}

                          {selectedAction === 'APPRAISAL_FEE' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                <p className="text-blue-800">Η τράπεζα στέλνει δικό της μηχανικό για να εκτιμήσει την αξία. Πρέπει να πληρωθεί το κόστος (περίπου 150€-200€).</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Πού γίνεται:</h4>
                                <p className="text-green-800">E-banking</p>
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Οδηγία:</h4>
                                <p className="text-purple-800">Πλήρωσε το παράβολο τεχνικού ελέγχου της τράπεζας για να προχωρήσει η εκτίμηση του ακινήτου.</p>
                              </div>
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                <p className="text-gray-800">Mark as Done</p>
                              </div>
                            </>
                          )}

                          {selectedAction === 'TRANSFER_TAX' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                <p className="text-blue-800">Η πιο κρίσιμη ενέργεια πριν το συμβόλαιο.</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Πού γίνεται:</h4>
                                <p className="text-green-800">Στην πλατφόρμα myProperty (aade.gr)</p>
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Οδηγία:</h4>
                                <p className="text-purple-800">Συνδέσου με κωδικούς TaxisNet στο myProperty, βρες τη δήλωση που υπέβαλε ο συμβολαιογράφος, κάνε αποδοχή και πλήρωσε τον φόρο (με κάρτα ή κωδικό πληρωμής).</p>
                              </div>
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                <p className="text-gray-800">Το σύστημα βλέπει αυτόματα "Paid" (αν υπάρχει διασύνδεση) ή upload της ταυτότητας οφειλής εξοφλημένης.</p>
                              </div>
                            </>
                          )}

                          {selectedAction === 'UTILITIES_TRANSFER' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                <p className="text-blue-800">Αλλαγή ονόματος σε ρεύμα, νερό, φυσικό αέριο.</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Πού γίνεται:</h4>
                                <p className="text-green-800">Online στα sites των παρόχων (ΔΕΗ, ΕΥΔΑΠ, Zeniθ κ.λπ.) ή μέσω gov.gr</p>
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Οδηγία:</h4>
                                <p className="text-purple-800">Χρησιμοποίησε το αντίγραφο συμβολαίου για να κάνεις αίτηση αλλαγής ονόματος στους παρόχους ενέργειας.</p>
                              </div>
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                <p className="text-gray-800">Mark as Done</p>
                              </div>
                            </>
                          )}

                          {selectedAction === 'E9_DECLARATION' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                <p className="text-blue-800">Πρέπει να δηλώσει το νέο ακίνητο στην εφορία εντός 30 ημερών.</p>
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Πού γίνεται:</h4>
                                <p className="text-green-800">Στο myAADE (Εφαρμογή Ε9)</p>
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Οδηγία:</h4>
                                <p className="text-purple-800">Μπες στο Ε9 της ΑΑΔΕ και δήλωσε την απόκτηση του νέου ακινήτου για να ενημερωθεί η περιουσιακή σου κατάσταση.</p>
                              </div>
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                <p className="text-gray-800">Mark as Done</p>
                              </div>
                            </>
                          )}

                          {/* Non-resident actions */}
                          {selectedAction === 'TAX_REP_ASSIGNMENT' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionDescription || 'Ανάθεσε σε λογιστή ή κάτοικο Ελλάδας να σε εκπροσωπεί στην εφορία. Είναι απαραίτητο για την έκδοση ΑΦΜ.'}
                                    onChange={(e) => setActionDescription(e.target.value)}
                                    placeholder="Περιγραφή της ενέργειας"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-blue-800">Ανάθεσε σε λογιστή ή κάτοικο Ελλάδας να σε εκπροσωπεί στην εφορία. Είναι απαραίτητο για την έκδοση ΑΦΜ.</p>
                                )}
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Γιατί χρειάζεται:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionWhy || 'Η εφορία δεν στέλνει επιστολές στο εξωτερικό. Απαιτείται υπεύθυνος εδώ.'}
                                    onChange={(e) => setActionWhy(e.target.value)}
                                    placeholder="Γιατί χρειάζεται αυτή η ενέργεια"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-green-800">Η εφορία δεν στέλνει επιστολές στο εξωτερικό. Απαιτείται υπεύθυνος εδώ.</p>
                                )}
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Πού γίνεται:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionWhere || 'Υπογραφή εξουσιοδότησης (ψηφιακά ή στο Προξενείο)'}
                                    onChange={(e) => setActionWhere(e.target.value)}
                                    placeholder="Πού γίνεται η ενέργεια"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-purple-800">Υπογραφή εξουσιοδότησης (ψηφιακά ή στο Προξενείο)</p>
                                )}
                              </div>
                              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-orange-900 mb-2">Οδηγία:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionInstructions || 'Συνδέσου στην ψηφιακή πύλη myAADE (Μητρώο & Επικοινωνία). Επίλεξε "Ορισμός Σχέσης", συμπλήρωσε το ΑΦΜ του εκπροσώπου σου και τον ρόλο "Φορολογικός Εκπρόσωπος". Μόλις το αποδεχτεί, ανέβασε το αποδεικτικό εδώ.'}
                                    onChange={(e) => setActionInstructions(e.target.value)}
                                    placeholder="Αναλυτικές οδηγίες"
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-orange-800">Συνδέσου στην ψηφιακή πύλη myAADE (Μητρώο & Επικοινωνία). Επίλεξε "Ορισμός Σχέσης", συμπλήρωσε το ΑΦΜ του εκπροσώπου σου και τον ρόλο "Φορολογικός Εκπρόσωπος". Μόλις το αποδεχτεί, ανέβασε το αποδεικτικό εδώ.</p>
                                )}
                              </div>
                              {isProfessional && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                  <h4 className="font-semibold text-yellow-900 mb-2">Σημαντικές Πληροφορίες (Προαιρετικό):</h4>
                                  <textarea
                                    value={actionAdditionalInfo || '**Σημαντικό:** Μπορείς να ορίσεις τον δικηγόρο σου ως φορολογικό εκπρόσωπο! Αυτό είναι πολύ πρακτικό γιατί:\n\n1. Ο δικηγόρος σου ήδη γνωρίζει τη συναλλαγή\n2. Μπορεί να χειρίζεται όλες τις επικοινωνίες με την εφορία\n3. Δεν χρειάζεται να βρεις ξεχωριστό λογιστή\n\n**Πώς να το κάνεις:**\n\n1. Ζήτησε από τον δικηγόρο σου το ΑΦΜ του\n2. Συνδέσου στο myAADE (aade.gr) με τους κωδικούς TaxisNet σου\n3. Πήγαινε στην ενότητα "Μητρώο & Επικοινωνία"\n4. Επίλεξε "Ορισμός Σχέσης"\n5. Εισήγαγε το ΑΦΜ του δικηγόρου σου\n6. Επίλεξε τον ρόλο "Φορολογικός Εκπρόσωπος"\n7. Ο δικηγόρος θα λάβει ειδοποίηση και θα πρέπει να αποδεχτεί\n8. Μόλις αποδεχτεί, ανέβασε το αποδεικτικό εδώ'}
                                    onChange={(e) => setActionAdditionalInfo(e.target.value)}
                                    placeholder="Επιπλέον σημαντικές πληροφορίες (π.χ. ότι μπορεί να γίνει ο δικηγόρος)"
                                    rows={8}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                  />
                                </div>
                              )}
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionResult || 'Mark as Done'}
                                    onChange={(e) => setActionResult(e.target.value)}
                                    placeholder="Αναμενόμενο αποτέλεσμα"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-gray-800">Mark as Done</p>
                                )}
                              </div>
                            </>
                          )}

                          {selectedAction === 'DEPOSIT_TRANSFER' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionDescription || 'Μετάφερε το ποσό δέσμευσης (10%) μέσω της τράπεζάς σου για να κατοχυρώσεις το ακίνητο.'}
                                    onChange={(e) => setActionDescription(e.target.value)}
                                    placeholder="Περιγραφή της ενέργειας"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-blue-800">Μετάφερε το ποσό δέσμευσης (10%) μέσω της τράπεζάς σου για να κατοχυρώσεις το ακίνητο.</p>
                                )}
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Γιατί χρειάζεται:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionWhy || 'Για να κλείσει η συμφωνία και να αποσυρθεί το ακίνητο.'}
                                    onChange={(e) => setActionWhy(e.target.value)}
                                    placeholder="Γιατί χρειάζεται αυτή η ενέργεια"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-green-800">Για να κλείσει η συμφωνία και να αποσυρθεί το ακίνητο.</p>
                                )}
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Πού γίνεται:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionWhere || 'Στο e-banking της τράπεζας εξωτερικού'}
                                    onChange={(e) => setActionWhere(e.target.value)}
                                    placeholder="Πού γίνεται η ενέργεια"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-purple-800">Στο e-banking της τράπεζας εξωτερικού</p>
                                )}
                              </div>
                              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-orange-900 mb-2">Οδηγία:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionInstructions || 'Χρησιμοποίησε το e-banking σου για να στείλεις το ποσό. **ΠΡΟΣΟΧΗ:** Στην αιτιολογία συναλλαγής γράψε οπωσδήποτε: "Προκαταβολή για αγορά ακινήτου [Διεύθυνση Ακινήτου]". Το έμβασμα πρέπει να γίνει από δικό σου λογαριασμό (όχι εταιρικός, όχι συγγενή).'}
                                    onChange={(e) => setActionInstructions(e.target.value)}
                                    placeholder="Αναλυτικές οδηγίες"
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-orange-800">Χρησιμοποίησε το e-banking σου για να στείλεις το ποσό. **ΠΡΟΣΟΧΗ:** Στην αιτιολογία συναλλαγής γράψε οπωσδήποτε: "Προκαταβολή για αγορά ακινήτου [Διεύθυνση Ακινήτου]". Το έμβασμα πρέπει να γίνει από δικό σου λογαριασμό (όχι εταιρικός, όχι συγγενή).</p>
                                )}
                              </div>
                              {isProfessional && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                  <h4 className="font-semibold text-yellow-900 mb-2">Σημαντικές Πληροφορίες (Προαιρετικό):</h4>
                                  <textarea
                                    value={actionAdditionalInfo || '**Βήμα προς βήμα:**\n\n1. Συνδέσου στο e-banking της τράπεζάς σου\n2. Επίλεξε "Διεθνής Μεταφορά" ή "SEPA Transfer"\n3. Εισήγαγε το IBAN του πωλητή (θα το βρεις πατώντας "Προβολή Στοιχείων IBAN")\n4. Εισήγαγε το ποσό (συνήθως 10% της αξίας)\n5. **ΣΤΗΝ ΑΙΤΙΟΛΟΓΙΑ γράψε:** "Προκαταβολή για αγορά ακινήτου [Οδός] [Αριθμός], [Πόλη]"\n6. Επιβεβαίωσε τη μεταφορά\n7. Αναμένεις επιβεβαίωση από την τράπεζα\n8. Σημείωσε την ενέργεια ως ολοκληρωμένη'}
                                    onChange={(e) => setActionAdditionalInfo(e.target.value)}
                                    placeholder="Επιπλέον σημαντικές πληροφορίες (βήμα προς βήμα οδηγίες)"
                                    rows={8}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                  />
                                </div>
                              )}
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionResult || 'Mark as Done'}
                                    onChange={(e) => setActionResult(e.target.value)}
                                    placeholder="Αναμενόμενο αποτέλεσμα"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-gray-800">Mark as Done</p>
                                )}
                              </div>
                            </>
                          )}

                          {selectedAction === 'DOCUMENT_TRANSLATION' && (
                            <>
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Τι είναι:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionDescription || 'Τα ξενόγλωσσα έγγραφα (Φορολογικά, Ποινικό Μητρώο) πρέπει να μεταφραστούν επίσημα στα Ελληνικά.'}
                                    onChange={(e) => setActionDescription(e.target.value)}
                                    placeholder="Περιγραφή της ενέργειας"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-blue-800">Τα ξενόγλωσσα έγγραφα (Φορολογικά, Ποινικό Μητρώο) πρέπει να μεταφραστούν επίσημα στα Ελληνικά.</p>
                                )}
                              </div>
                              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-green-900 mb-2">Γιατί χρειάζεται:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionWhy || 'Ο Συμβολαιογράφος δεν δέχεται ξενόγλωσσα έγγραφα.'}
                                    onChange={(e) => setActionWhy(e.target.value)}
                                    placeholder="Γιατί χρειάζεται αυτή η ενέργεια"
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-green-800">Ο Συμβολαιογράφος δεν δέχεται ξενόγλωσσα έγγραφα.</p>
                                )}
                              </div>
                              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-purple-900 mb-2">Πού γίνεται:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionWhere || 'Σε πιστοποιημένο δικηγόρο ή μεταφραστή (υπάρχει λίστα στο gov.gr)'}
                                    onChange={(e) => setActionWhere(e.target.value)}
                                    placeholder="Πού γίνεται η ενέργεια"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-purple-800">Σε πιστοποιημένο δικηγόρο ή μεταφραστή (υπάρχει λίστα στο gov.gr)</p>
                                )}
                              </div>
                              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-orange-900 mb-2">Οδηγία:</h4>
                                {isProfessional ? (
                                  <textarea
                                    value={actionInstructions || 'Μπορείς να απευθυνθείς σε Πιστοποιημένο Μεταφραστή του Υπουργείου Εξωτερικών ή σε Δικηγόρο. Η απλή μετάφραση δεν γίνεται δεκτή από τον Συμβολαιογράφο.'}
                                    onChange={(e) => setActionInstructions(e.target.value)}
                                    placeholder="Αναλυτικές οδηγίες"
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-orange-800">Μπορείς να απευθυνθείς σε Πιστοποιημένο Μεταφραστή του Υπουργείου Εξωτερικών ή σε Δικηγόρο. Η απλή μετάφραση δεν γίνεται δεκτή από τον Συμβολαιογράφο.</p>
                                )}
                              </div>
                              {isProfessional && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                  <h4 className="font-semibold text-yellow-900 mb-2">Σημαντικές Πληροφορίες (Προαιρετικό):</h4>
                                  <textarea
                                    value={actionAdditionalInfo || '**Ποια έγγραφα χρειάζονται μετάφραση:**\n\n- Φορολογικά έγγραφα από τη χώρα προέλευσης\n- Ποινικό Μητρώο\n- Τυχόν άλλα νομικά έγγραφα\n\n**Πώς να βρεις μεταφραστή:**\n\n1. Πήγαινε στο https://metafraseis.services.gov.gr/\n2. Αναζήτησε πιστοποιημένους μεταφραστές\n3. Επικοινώνησε μαζί τους για προσφορά\n4. Στείλε τα έγγραφα για μετάφραση\n5. Μόλις λάβεις τις μεταφράσεις, ανέβασέ τες εδώ'}
                                    onChange={(e) => setActionAdditionalInfo(e.target.value)}
                                    placeholder="Επιπλέον σημαντικές πληροφορίες"
                                    rows={8}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                  />
                                </div>
                              )}
                              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Αναμενόμενο Αποτέλεσμα:</h4>
                                {isProfessional ? (
                                  <input
                                    type="text"
                                    value={actionResult || 'Upload μεταφρασμένων εγγράφων'}
                                    onChange={(e) => setActionResult(e.target.value)}
                                    placeholder="Αναμενόμενο αποτέλεσμα"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                                  />
                                ) : (
                                  <p className="text-gray-800">Upload μεταφρασμένων εγγράφων</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Engineer actions - extra fields & preview */}
                      {isEngineerRole && selectedAction && selectedAction !== 'CUSTOM' && (
                        <div className="space-y-4">
                          {/* Action preview cards */}
                          {['ENGINEER_POWER_OF_ATTORNEY', 'SETTLEMENT_FEE', 'ENGINEER_OWNER_DECLARATION', 'ENGINEER_E9_CORRECTION'].includes(selectedAction) && (
                            <div className="rounded-xl border-2 border-amber-200 bg-white p-4 space-y-3">
                              <h4 className="font-semibold text-amber-900">Περιεχόμενο κάρτας για τον Πωλητή</h4>
                              <div className="bg-amber-50 rounded-lg p-3 text-sm space-y-2">
                                <p><span className="font-medium text-gray-700">Τίτλος:</span> {
                                  selectedAction === 'ENGINEER_POWER_OF_ATTORNEY' ? 'Έκδοση Εξουσιοδότησης Μηχανικού (gov.gr)' :
                                  selectedAction === 'SETTLEMENT_FEE' ? 'Πληρωμή Παραβόλου Τακτοποίησης' :
                                  selectedAction === 'ENGINEER_OWNER_DECLARATION' ? 'Υπεύθυνη Δήλωση Ιδιοκτήτη (ΗΤΚ)' :
                                  'Ενημέρωση / Διόρθωση Ε9'
                                }</p>
                                <p><span className="font-medium text-gray-700">Περιγραφή:</span> {
                                  selectedAction === 'ENGINEER_POWER_OF_ATTORNEY' ? 'Ο μηχανικός χρειάζεται εξουσιοδότηση για να αναζητήσει τον φάκελο της Οικοδομικής Άδειας στις δημόσιες υπηρεσίες εκ μέρους σας.' :
                                  selectedAction === 'SETTLEMENT_FEE' ? 'Για να προχωρήσει η νομιμοποίηση/τακτοποίηση, εκκρεμεί η πληρωμή παραβόλου προς το κράτος.' :
                                  selectedAction === 'ENGINEER_OWNER_DECLARATION' ? 'Απαιτείται η υπογραφή Υπεύθυνης Δήλωσης που θα συνοδεύει τον φάκελο της Ηλεκτρονικής Ταυτότητας Κτιρίου.' :
                                  'Βρέθηκε απόκλιση στα τετραγωνικά μέτρα μεταξύ των σχεδίων και της δήλωσής σας στην Εφορία.'
                                }</p>
                              </div>
                            </div>
                          )}
                          {/* Extra fields for Πληρωμή Παραβόλου */}
                          {selectedAction === 'SETTLEMENT_FEE' && (
                            <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 space-y-3">
                              <h4 className="font-semibold text-amber-900">Εισαγωγή Στοιχείων Πληρωμής</h4>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Κωδικός RF *</label>
                                <input
                                  type="text"
                                  value={actionRfCode}
                                  onChange={(e) => setActionRfCode(e.target.value)}
                                  placeholder="Π.χ. RF123456789"
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ποσό (€)</label>
                                <input
                                  type="text"
                                  value={actionAmount}
                                  onChange={(e) => setActionAmount(e.target.value.replace(/[^\d,.]/g, ''))}
                                  placeholder="Π.χ. 150"
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                />
                              </div>
                            </div>
                          )}
                          {/* Extra field for Υπεύθυνη Δήλωση */}
                          {selectedAction === 'ENGINEER_OWNER_DECLARATION' && (
                            <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 space-y-3">
                              <h4 className="font-semibold text-amber-900">Κείμενο Υπεύθυνης Δήλωσης</h4>
                              <p className="text-sm text-gray-600">Επικόλλησε εδώ το νομικό κείμενο που θα δει ο πωλητής στο gov.gr για copy-paste.</p>
                              <textarea
                                value={actionDeclarationText}
                                onChange={(e) => setActionDeclarationText(e.target.value)}
                                placeholder="Εξουσιοδοτώ τον ανωτέρω μηχανικό να προβεί σε κάθε νόμιμη ενέργεια..."
                                rows={6}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                              />
                            </div>
                          )}
                          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                            <h4 className="font-semibold text-amber-900 mb-2">Προεπισκόπηση</h4>
                            <p className="text-amber-800 text-sm">
                              Οι πλήρεις οδηγίες θα εμφανιστούν στον πωλητή ως καλά διαμορφωμένη κάρτα όταν πατήσει πάνω στην ενέργεια.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={async () => {
                            if (selectedAction === 'CUSTOM') {
                              if (!customActionName.trim() || !customActionWhere.trim() || !customActionInstructions.trim()) {
                                toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
                                return;
                              }
                            }
                            if (selectedAction === 'SETTLEMENT_FEE' && !actionRfCode.trim()) {
                              toast.error('Παρακαλώ εισάγετε τον Κωδικό RF');
                              return;
                            }

                            try {
                              let category: string;
                              let where: string;
                              let instructions: string;
                              let description: string = '';
                              let why: string = '';
                              let additionalInfo: string = '';
                              let result: string = '';

                              if (selectedAction === 'CUSTOM') {
                                category = customActionName.trim();
                                where = customActionWhere.trim();
                                instructions = customActionInstructions.trim();
                              } else {
                                // Map predefined actions to their details
                                const engineerActionDetails: { [key: string]: { category: string; description: string; where: string; instructions: string; result: string } } = {
                                  'ENGINEER_POWER_OF_ATTORNEY': {
                                    category: 'Έκδοση Εξουσιοδότησης Μηχανικού (gov.gr)',
                                    description: 'Ο μηχανικός χρειάζεται εξουσιοδότηση για να αναζητήσει τον φάκελο της Οικοδομικής Άδειας στις δημόσιες υπηρεσίες εκ μέρους σας.',
                                    where: 'docs.gov.gr (Εξουσιοδότηση)',
                                    instructions: 'Μεταβείτε στο docs.gov.gr (Εξουσιοδότηση). Βάλτε τα στοιχεία του μηχανικού [Όνομα/ΑΦΜ] και στο κείμενο γράψτε: "Εξουσιοδοτώ τον ανωτέρω μηχανικό να προβεί σε κάθε νόμιμη ενέργεια και λήψη αντιγράφων από την Πολεοδομία και το Υποθηκοφυλακείο για το ακίνητό μου." Κατεβάστε το PDF και ανεβάστε το εδώ.',
                                    result: 'Ανέβασμα Εξουσιοδότησης'
                                  },
                                  'SETTLEMENT_FEE': {
                                    category: 'Πληρωμή Παραβόλου Τακτοποίησης',
                                    description: 'Για να προχωρήσει η νομιμοποίηση/τακτοποίηση, εκκρεμεί η πληρωμή παραβόλου προς το κράτος.',
                                    where: 'e-banking (Πληρωμές προς Δημόσιο / ΤΕΕ)',
                                    instructions: (() => {
                                      let base = 'Ο μηχανικός έχει ανεβάσει την Ταυτότητα Οφειλής (Κωδικός Πληρωμής RF) που εκδόθηκε από το ΤΕΕ. ';
                                      if (actionRfCode.trim()) base += '\n\n**Κωδικός RF:** ' + actionRfCode.trim();
                                      if (actionAmount.trim()) base += '\n**Ποσό:** ' + actionAmount.trim() + ' €';
                                      base += '\n\nΜπείτε στο e-banking σας, επιλέξτε "Πληρωμές προς Δημόσιο / ΤΕΕ" και εξοφλήστε το ποσό. Μόλις το κάνετε, πατήστε επιβεβαίωση.';
                                      return base;
                                    })(),
                                    result: 'Επιβεβαίωση Πληρωμής'
                                  },
                                  'ENGINEER_OWNER_DECLARATION': {
                                    category: 'Υπεύθυνη Δήλωση Ιδιοκτήτη (ΗΤΚ)',
                                    description: 'Απαιτείται η υπογραφή Υπεύθυνης Δήλωσης που θα συνοδεύει τον φάκελο της Ηλεκτρονικής Ταυτότητας Κτιρίου.',
                                    where: 'docs.gov.gr (Υπεύθυνη Δήλωση)',
                                    instructions: (() => {
                                      const base = 'Ο μηχανικός έχει ετοιμάσει το κείμενο της δήλωσης. Μεταβείτε στο docs.gov.gr (Υπεύθυνη Δήλωση), κάντε αντιγραφή-επικόλληση το κείμενο που θα βρείτε παρακάτω, εκδώστε τη δήλωση και ανεβάστε την πλατφόρμα.';
                                      return actionDeclarationText.trim()
                                        ? base + '\n\n---\n\n**Κείμενο για αντιγραφή:**\n\n' + actionDeclarationText.trim()
                                        : base;
                                    })(),
                                    result: 'Ανέβασμα Δήλωσης'
                                  },
                                  'ENGINEER_E9_CORRECTION': {
                                    category: 'Ενημέρωση / Διόρθωση Ε9',
                                    description: 'Βρέθηκε απόκλιση στα τετραγωνικά μέτρα μεταξύ των σχεδίων και της δήλωσής σας στην Εφορία.',
                                    where: 'TaxisNet (μέσω Λογιστή)',
                                    instructions: 'Παρακαλώ επικοινωνήστε με τον λογιστή σας για να διορθώσει το Ε9 στο TaxisNet, ώστε τα τετραγωνικά να ταυτίζονται ακριβώς με το νέο Τοπογραφικό/Κάτοψη που έχει συντάξει ο μηχανικός. Μόλις γίνει η διόρθωση, ανεβάστε το νέο Ε9.',
                                    result: 'Ανέβασμα Νέου Ε9'
                                  },
                                  'TEE_FEE': {
                                    category: 'Πληρωμή Τέλους Ανταπόδοσης ΤΕΕ',
                                    description: 'Ένα μικρό διοικητικό τέλος (συνήθως 20€ για διαμερίσματα) υπέρ του Τεχνικού Επιμελητηρίου Ελλάδας. Είναι το "εισιτήριο" για να καταχωρηθεί το ακίνητο στην πλατφόρμα της Ηλεκτρονικής Ταυτότητας Κτιρίου.',
                                    where: 'e-banking',
                                    instructions: 'Ο Μηχανικός εκδίδει την εντολή πληρωμής.\n\nΣου στέλνει έναν κωδικό πληρωμής (RF).\n\nΤο πληρώνεις μέσω e-banking (Πληρωμές -> ΤΕΕ ή Δημόσιο).\n\nΜόλις πληρωθεί, ο Μηχανικός μπορεί να πατήσει το κουμπί "Οριστική Υπαγωγή" και να βγάλει το πιστοποιητικό.',
                                    result: 'Mark as Done'
                                  },
                                  'ENFIA_PAYMENT': {
                                    category: 'Πληρωμή/Ρύθμιση ΕΝΦΙΑ',
                                    description: 'Ο φόρος ακίνητης περιουσίας. Για να πουλήσεις, πρέπει να έχεις εξοφλήσει τον φόρο του τρέχοντος έτους και των 5 προηγούμενων ετών.',
                                    where: 'myAADE',
                                    instructions: 'Μπαίνεις στο myAADE (με κωδικούς Taxisnet).\n\nΠηγαίνεις στην ενότητα "Οφειλές".\n\nΑν χρωστάς, εξοφλείς το ποσό (εφάπαξ) για να πάρεις το πιστοποιητικό άμεσα.\n\nΕναλλακτικά, αν το ποσό είναι μεγάλο, κάνεις ρύθμιση δόσεων (προσοχή: ρωτήστε τον συμβολαιογράφο αν επιτρέπεται η πώληση με ρύθμιση - συνήθως γίνεται παρακράτηση από το τίμημα).',
                                    result: 'Mark as Done'
                                  },
                                  'TAP_PAYMENT': {
                                    category: 'Πληρωμή ΤΑΠ (Τέλος Ακίνητης Περιουσίας)',
                                    description: 'Δημοτικός φόρος που πληρώνουμε μέσω του λογαριασμού ρεύματος. Ο Δήμος πρέπει να βεβαιώσει ότι δεν του χρωστάς τίποτα για το συγκεκριμένο ακίνητο.',
                                    where: 'Υπηρεσία Εσόδων Δήμου',
                                    instructions: 'Πληρώνεις τον τελευταίο λογαριασμό ρεύματος (να φαίνεται εξοφλημένος).\n\nΠαίρνεις το Συμβόλαιο Ακινήτου και τον εξοφλημένο λογαριασμό.\n\nΠας στην υπηρεσία Εσόδων του Δήμου που ανήκει το ακίνητο (ή κάνεις αίτηση στο site του Δήμου αν υποστηρίζεται).\n\nΣου βγάζουν τυχόν διαφορές (π.χ. αν τα τ.μ. στον λογαριασμό ήταν λιγότερα από το συμβόλαιο).\n\nΠληρώνεις τη διαφορά στο ταμείο του Δήμου και παίρνεις τη Βεβαίωση ΤΑΠ.',
                                    result: 'Mark as Done'
                                  },
                                  'UTILITIES_SETTLEMENT': {
                                    category: 'Εξόφληση Λογαριασμών (Νερό & Ρεύμα)',
                                    description: 'Η πλήρης εξόφληση των καταναλώσεων μέχρι την ημέρα που φεύγεις από το σπίτι.',
                                    where: 'Site/app παρόχου',
                                    instructions: 'Σημειώνεις την ένδειξη του μετρητή (ρολόι).\n\nΜπαίνεις στο site/app του παρόχου (ΔΕΗ, ΕΥΔΑΠ κ.λπ.).\n\nΒλέπεις το τρέχον υπόλοιπο και το πληρώνεις όλο.',
                                    result: 'Mark as Done'
                                  },
                                  'UTILITIES_TERMINATION': {
                                    category: 'Αίτηση Διακοπής Σύμβασης (ή Αλλαγή Ονόματος)',
                                    description: 'Σταματάς να είσαι ο πελάτης της εταιρείας ρεύματος/νερού για αυτό το ακίνητο.',
                                    where: 'Κατάστημα παρόχου ή online',
                                    instructions: 'Πότε: Συνήθως γίνεται την επόμενη μέρα της υπογραφής του συμβολαίου.\n\nΠηγαίνεις σε κατάστημα του παρόχου ή online (μέσω gov.gr ή site παρόχου).\n\nΖητάς "Τελικό Λογαριασμό λόγω μετακόμισης/πώλησης".\n\nΔίνεις την τελική ένδειξη του μετρητή.\n\nΣου επιστρέφουν την εγγύηση που είχες δώσει (αν υπάρχει).',
                                    result: 'Mark as Done'
                                  },
                                  'E9_DELETION': {
                                    category: 'Δήλωση Διαγραφής στο Ε9',
                                    description: 'Η ενημέρωση του Περιουσιολογίου της Εφορίας ότι το ακίνητο δεν σου ανήκει πια. (Γίνεται ΜΕΤΑ την πώληση)',
                                    where: 'Taxisnet (Ε9)',
                                    instructions: 'Έχεις προθεσμία 30 ημερών από την υπογραφή του συμβολαίου.\n\nΔίνεις αντίγραφο του συμβολαίου πώλησης στον Λογιστή σου.\n\nΟ Λογιστής μπαίνει στο Taxisnet (Ε9) και κάνει "Διαγραφή ακινήτου λόγω πώλησης", αναγράφοντας τον αριθμό συμβολαίου και τον συμβολαιογράφο.',
                                    result: 'Mark as Done'
                                  },
                                  'INSURANCE_CANCELLATION': {
                                    category: 'Ακύρωση Ασφαλιστηρίου Συμβολαίου',
                                    description: 'Η διακοπή της ασφάλειας (Πυρός/Σεισμού) που είχες για το σπίτι.',
                                    where: 'Email στον ασφαλιστή',
                                    instructions: 'Στέλνεις email στον ασφαλιστή σου με επισυναπτόμενο το Συμβόλαιο Πώλησης.\n\nΓράφεις: "Παρακαλώ ακυρώστε το συμβόλαιο λόγω πώλησης από την ημερομηνία υπογραφής".\n\nΖητάς επιστροφή των ασφαλίστρων για τους μήνες που απομένουν (τα λεφτά μπαίνουν στον λογαριασμό σου).',
                                    result: 'Mark as Done'
                                  }
                                };
                                const actionDetails: { [key: string]: { category: string; description: string; why?: string; where: string; instructions: string; result: string; additionalInfo?: string } } = isEngineerRole ? engineerActionDetails : isBuyerFromGreece ? {
                                  'LOAN_APPLICATION': {
                                    category: 'Αίτηση Στεγαστικού Δανείου',
                                    description: actionDescription || 'Η κατάθεση δικαιολογητικών στην τράπεζα για προέγκριση. (Αν η αγορά γίνεται με δάνειο)',
                                    where: actionWhere || 'Σε κατάστημα τράπεζας ή μέσω e-banking/gov.gr (KYC)',
                                    instructions: actionInstructions || 'Υπόβαλε αίτηση στην τράπεζα της επιλογής σου. Χρησιμοποίησε το eGov-KYC για να στείλεις τα στοιχεία σου αυτόματα.',
                                    result: actionResult || 'Upload "Προέγκριση Δανείου"'
                                  },
                                  'APPRAISAL_FEE': {
                                    category: 'Πληρωμή Τέλους Εκτίμησης',
                                    description: actionDescription || 'Η τράπεζα στέλνει δικό της μηχανικό για να εκτιμήσει την αξία. Πρέπει να πληρωθεί το κόστος (περίπου 150€-200€).',
                                    where: actionWhere || 'E-banking',
                                    instructions: actionInstructions || 'Πλήρωσε το παράβολο τεχνικού ελέγχου της τράπεζας για να προχωρήσει η εκτίμηση του ακινήτου.',
                                    result: actionResult || 'Mark as Done'
                                  },
                                  'TRANSFER_TAX': {
                                    category: 'Πληρωμή Φόρου Μεταβίβασης (ΦΜΑ)',
                                    description: actionDescription || 'Η πιο κρίσιμη ενέργεια πριν το συμβόλαιο.',
                                    where: actionWhere || 'Στην πλατφόρμα myProperty (aade.gr)',
                                    instructions: actionInstructions || 'Συνδέσου με κωδικούς TaxisNet στο myProperty, βρες τη δήλωση που υπέβαλε ο συμβολαιογράφος, κάνε αποδοχή και πλήρωσε τον φόρο (με κάρτα ή κωδικό πληρωμής).',
                                    result: actionResult || 'Το σύστημα βλέπει αυτόματα "Paid" (αν υπάρχει διασύνδεση) ή upload της ταυτότητας οφειλής εξοφλημένης.'
                                  },
                                  'UTILITIES_TRANSFER': {
                                    category: 'Μεταφορά Λογαριασμών ΔΕΚΟ',
                                    description: actionDescription || 'Αλλαγή ονόματος σε ρεύμα, νερό, φυσικό αέριο.',
                                    where: actionWhere || 'Online στα sites των παρόχων (ΔΕΗ, ΕΥΔΑΠ, Zeniθ κ.λπ.) ή μέσω gov.gr',
                                    instructions: actionInstructions || 'Χρησιμοποίησε το αντίγραφο συμβολαίου για να κάνεις αίτηση αλλαγής ονόματος στους παρόχους ενέργειας.',
                                    result: actionResult || 'Mark as Done'
                                  },
                                  'E9_DECLARATION': {
                                    category: 'Δήλωση στο Ε9',
                                    description: actionDescription || 'Πρέπει να δηλώσει το νέο ακίνητο στην εφορία εντός 30 ημερών.',
                                    where: actionWhere || 'Στο myAADE (Εφαρμογή Ε9)',
                                    instructions: actionInstructions || 'Μπες στο Ε9 της ΑΑΔΕ και δήλωσε την απόκτηση του νέου ακινήτου για να ενημερωθεί η περιουσιακή σου κατάσταση.',
                                    result: actionResult || 'Mark as Done'
                                  }
                                } : {
                                  'TAX_REP_ASSIGNMENT': {
                                    category: 'Ορισμός Φορολογικού Εκπροσώπου',
                                    description: actionDescription || 'Ανάθεσε σε λογιστή ή κάτοικο Ελλάδας να σε εκπροσωπεί στην εφορία. Είναι απαραίτητο για την έκδοση ΑΦΜ.',
                                    why: actionWhy || 'Η εφορία δεν στέλνει επιστολές στο εξωτερικό. Απαιτείται υπεύθυνος εδώ.',
                                    where: actionWhere || 'Υπογραφή εξουσιοδότησης (ψηφιακά ή στο Προξενείο)',
                                    instructions: actionInstructions || 'Συνδέσου στην ψηφιακή πύλη myAADE (Μητρώο & Επικοινωνία). Επίλεξε "Ορισμός Σχέσης", συμπλήρωσε το ΑΦΜ του εκπροσώπου σου και τον ρόλο "Φορολογικός Εκπρόσωπος". Μόλις το αποδεχτεί, ανέβασε το αποδεικτικό εδώ.',
                                    result: actionResult || 'Mark as Done',
                                    additionalInfo: actionAdditionalInfo || '**Σημαντικό:** Μπορείς να ορίσεις τον δικηγόρο σου ως φορολογικό εκπρόσωπο! Αυτό είναι πολύ πρακτικό γιατί:\n\n1. Ο δικηγόρος σου ήδη γνωρίζει τη συναλλαγή\n2. Μπορεί να χειρίζεται όλες τις επικοινωνίες με την εφορία\n3. Δεν χρειάζεται να βρεις ξεχωριστό λογιστή\n\n**Πώς να το κάνεις:**\n\n1. Ζήτησε από τον δικηγόρο σου το ΑΦΜ του\n2. Συνδέσου στο myAADE (aade.gr) με τους κωδικούς TaxisNet σου\n3. Πήγαινε στην ενότητα "Μητρώο & Επικοινωνία"\n4. Επίλεξε "Ορισμός Σχέσης"\n5. Εισήγαγε το ΑΦΜ του δικηγόρου σου\n6. Επίλεξε τον ρόλο "Φορολογικός Εκπρόσωπος"\n7. Ο δικηγόρος θα λάβει ειδοποίηση και θα πρέπει να αποδεχτεί\n8. Μόλις αποδεχτεί, ανέβασε το αποδεικτικό εδώ'
                                  },
                                  'DEPOSIT_TRANSFER': {
                                    category: 'Αποστολή Εμβάσματος Προκαταβολής',
                                    description: actionDescription || 'Μετάφερε το ποσό δέσμευσης (10%) μέσω της τράπεζάς σου για να κατοχυρώσεις το ακίνητο.',
                                    why: actionWhy || 'Για να κλείσει η συμφωνία και να αποσυρθεί το ακίνητο.',
                                    where: actionWhere || 'Στο e-banking της τράπεζας εξωτερικού',
                                    instructions: actionInstructions || 'Χρησιμοποίησε το e-banking σου για να στείλεις το ποσό. **ΠΡΟΣΟΧΗ:** Στην αιτιολογία συναλλαγής γράψε οπωσδήποτε: "Προκαταβολή για αγορά ακινήτου [Διεύθυνση Ακινήτου]". Το έμβασμα πρέπει να γίνει από δικό σου λογαριασμό (όχι εταιρικός, όχι συγγενή).',
                                    result: actionResult || 'Mark as Done',
                                    additionalInfo: actionAdditionalInfo || '**Βήμα προς βήμα:**\n\n1. Συνδέσου στο e-banking της τράπεζάς σου\n2. Επίλεξε "Διεθνής Μεταφορά" ή "SEPA Transfer"\n3. Εισήγαγε το IBAN του πωλητή (θα το βρεις πατώντας "Προβολή Στοιχείων IBAN")\n4. Εισήγαγε το ποσό (συνήθως 10% της αξίας)\n5. **ΣΤΗΝ ΑΙΤΙΟΛΟΓΙΑ γράψε:** "Προκαταβολή για αγορά ακινήτου [Οδός] [Αριθμός], [Πόλη]"\n6. Επιβεβαίωσε τη μεταφορά\n7. Αναμένεις επιβεβαίωση από την τράπεζα\n8. Σημείωσε την ενέργεια ως ολοκληρωμένη'
                                  },
                                  'DOCUMENT_TRANSLATION': {
                                    category: 'Επίσημη Μετάφραση Εγγράφων',
                                    description: actionDescription || 'Τα ξενόγλωσσα έγγραφα (Φορολογικά, Ποινικό Μητρώο) πρέπει να μεταφραστούν επίσημα στα Ελληνικά.',
                                    why: actionWhy || 'Ο Συμβολαιογράφος δεν δέχεται ξενόγλωσσα έγγραφα.',
                                    where: actionWhere || 'Σε πιστοποιημένο δικηγόρο ή μεταφραστή (υπάρχει λίστα στο gov.gr)',
                                    instructions: actionInstructions || 'Μπορείς να απευθυνθείς σε Πιστοποιημένο Μεταφραστή του Υπουργείου Εξωτερικών ή σε Δικηγόρο. Η απλή μετάφραση δεν γίνεται δεκτή από τον Συμβολαιογράφο.',
                                    result: actionResult || 'Upload μεταφρασμένων εγγράφων',
                                    additionalInfo: actionAdditionalInfo || '**Ποια έγγραφα χρειάζονται μετάφραση:**\n\n- Φορολογικά έγγραφα από τη χώρα προέλευσης\n- Ποινικό Μητρώο\n- Τυχόν άλλα νομικά έγγραφα\n\n**Πώς να βρεις μεταφραστή:**\n\n1. Πήγαινε στο https://metafraseis.services.gov.gr/\n2. Αναζήτησε πιστοποιημένους μεταφραστές\n3. Επικοινώνησε μαζί τους για προσφορά\n4. Στείλε τα έγγραφα για μετάφραση\n5. Μόλις λάβεις τις μεταφράσεις, ανέβασέ τες εδώ'
                                  }
                                };

                                const details = actionDetails[selectedAction];
                                if (!details) {
                                  toast.error('Αποτυχία: Άγνωστη ενέργεια');
                                  return;
                                }
                                
                                category = details.category;
                                description = details.description;
                                why = details.why || '';
                                where = details.where;
                                instructions = details.instructions;
                                result = details.result;
                                additionalInfo = details.additionalInfo || '';
                              }

                              // For professionals, store all info as JSON in guideInstructions
                              // For non-professionals, use simple text format
                              let finalInstructions: string;
                              let finalWhere: string;
                              
                              if (isProfessional) {
                                // Combine instructions and additionalInfo into one instructions field
                                const combinedInstructions = [
                                  instructions,
                                  additionalInfo
                                ].filter(Boolean).join('\n\n');
                                
                                // Store structured data as JSON - only description and instructions
                                const actionData = {
                                  description: description || '',
                                  instructions: combinedInstructions || ''
                                };
                                finalInstructions = JSON.stringify(actionData);
                                finalWhere = ''; // Not needed anymore
                              } else {
                                // Simple text format (backward compatibility)
                                // Combine instructions and additionalInfo
                                const combinedInstructions = [
                                  instructions,
                                  additionalInfo
                                ].filter(Boolean).join('\n\n');
                                finalInstructions = combinedInstructions;
                                finalWhere = '';
                              }

                              // Create action as a document request with special category prefix
                              const resolvedActionTarget: ActionTargetType = isEngineerRole
                                ? 'SELLER_GROUP'
                                : (selectedActionTarget || 'BUYER');
                              const requestedFromRole = resolvedActionTarget === 'BUYER' ? 'BUYER' : 'SELLER';
                              await handleRequest(
                                `[ΕΝΕΡΓΕΙΑ] ${category}`,
                                requestedFromRole,
                                undefined,
                                finalWhere,
                                finalInstructions
                              );

                              toast.success('Η ενέργεια δημιουργήθηκε επιτυχώς');
                              
                    // Reset form
                              setRequestType(null);
                              setSelectedActionTarget(null);
                              setSelectedAction(null);
                              setCustomActionName('');
                              setCustomActionWhere('');
                              setCustomActionInstructions('');
                              setActionDescription('');
                              setActionWhy('');
                              setActionWhere('');
                              setActionInstructions('');
                              setActionAdditionalInfo('');
                              setActionResult('');
                              setIsSellerLawyerHtkRequestFlow(false);
                              setShowRequestModal(false);
                            } catch (error: any) {
                              console.error('Error creating action:', error);
                              toast.error(error.message || 'Αποτυχία δημιουργίας ενέργειας');
                            }
                          }}
                          disabled={
                            (selectedAction === 'CUSTOM' && (!customActionName.trim() || !customActionWhere.trim() || !customActionInstructions.trim())) ||
                            (selectedAction === 'SETTLEMENT_FEE' && !actionRfCode.trim())
                          }
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          Δημιουργία Ενέργειας
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAction(null);
                            if (!isEngineerRole) setSelectedActionTarget(null);
                            setCustomActionName('');
                            setCustomActionWhere('');
                            setCustomActionInstructions('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Επιστροφή
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setIsSellerLawyerHtkRequestFlow(false);
                            setRequestType(null);
                            setSelectedActionTarget(null);
                            setSelectedAction(null);
                            setCustomActionName('');
                            setCustomActionWhere('');
                            setCustomActionInstructions('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Ακύρωση
                </button>
              </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rent Signing Guide Modal - Οδηγίες υπογραφής για ενοικιαστή */}
      {showRentSigningGuideModal && rentContractDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowRentSigningGuideModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Υπογραφή & Επανυποβολή Προσχεδίου Μισθωτηρίου</h3>
              <button onClick={() => setShowRentSigningGuideModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <p className="font-medium text-gray-900">Κατεβάστε και διαβάστε το PDF.</p>
                    <button
                      onClick={() => { handleDownload(rentContractDraft); }}
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
                    <p className="font-medium text-gray-900 mb-2">Ανεβάστε το τελικό υπογεγραμμένο αρχείο (που σας έδωσε το gov.gr).</p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          await handleUpload(file, 'Υπογεγραμμένο Μισθωτήριο Συμφωνητικό');
                          if (typeof window !== 'undefined') sessionStorage.setItem(`rentContractSigned_${deal.id}`, 'true');
                          setShowRentSigningGuideModal(false);
                          setActiveBuyerTab('uploaded');
                          onRefresh();
                        } catch {
                          // toast already from handleUpload
                        } finally {
                          setIsUploading(false);
                          e.target.value = '';
                        }
                      }}
                      disabled={isUploading}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {isUploading && <p className="text-sm text-gray-500 mt-1">Ανεβάζεται...</p>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRentSigningGuideModal(false)}
                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`bg-white rounded-xl shadow-2xl max-w-md w-full border-2 ${
              selectedDoc && isEngineerRole && isHtkCategory(selectedDoc.category)
                ? 'border-amber-300'
                : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between p-6 border-b-2 ${
                selectedDoc && isEngineerRole && isHtkCategory(selectedDoc.category)
                  ? 'border-amber-200'
                  : 'border-gray-200'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaUpload
                  className={
                    selectedDoc && isEngineerRole && isHtkCategory(selectedDoc.category)
                      ? 'text-amber-600'
                      : !selectedDoc && (isEngineerRole || isSellerLawyer || isBuyerLawyer)
                        ? 'text-amber-600'
                        : 'text-blue-600'
                  }
                />
                {!selectedDoc && isEngineerRole
                  ? (isEngineerHtkUploadFlow ? 'Ανέβασμα Εγγράφου ΗΤΚ' : 'Ανέβασμα Εγγράφου Συλλογής')
                  : !selectedDoc && isSellerLawyer
                  ? 'Ανέβασμα Εγγράφου Φακέλου Πωλητή'
                  : !selectedDoc && isBuyerLawyer
                  ? 'Ανέβασμα Εγγράφου'
                  : selectedDoc && isEngineerRole && isHtkCategory(selectedDoc.category)
                  ? 'Ανέβασμα ζητούμενου εγγράφου ΗΤΚ'
                  : 'Ανέβασμα Εγγράφου'}
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadingFile(null);
                  setSelectedDoc(null);
                  setEngineerOwnUploadCategory('');
                  setEngineerOwnUploadCustomName('');
                  setIsEngineerHtkUploadFlow(false);
                  setSellerLawyerUploadCategory('');
                  setSellerLawyerUploadCustomName('');
                  setBuyerLawyerUploadCategory('');
                  setBuyerLawyerUploadCustomName('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                disabled={isUploading}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Document Info - for upload to existing request */}
              {selectedDoc && (
                <div
                  className={`rounded-lg p-4 border ${
                    isAction(selectedDoc)
                      ? 'bg-green-50 border-green-200'
                      : isEngineerRole && isHtkCategory(selectedDoc.category)
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p className="text-sm text-gray-600 mb-1">{isAction(selectedDoc) ? 'Ενέργεια:' : 'Έγγραφο:'}</p>
                  <p className="font-semibold text-gray-900">{selectedDoc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</p>
                  {isAction(selectedDoc) && (
                    <p className="text-sm text-green-800 mt-2 font-medium">
                      📎 {getActionUploadPrompt(selectedDoc.category)}
                    </p>
                  )}
                </div>
              )}

              {/* Engineer's own upload - category selector */}
              {!selectedDoc && isEngineerRole && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Κατηγορία Εγγράφου <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={engineerOwnUploadCategory}
                    onChange={(e) => setEngineerOwnUploadCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Επιλέξτε κατηγορία</option>
                    {engineerPredefinedDocuments.map((d) => (
                      <option key={d.id} value={d.title}>{d.title}</option>
                    ))}
                    <option value="Άλλο">Άλλο</option>
                  </select>
                  {engineerOwnUploadCategory === 'Άλλο' && (
                    <input
                      type="text"
                      value={engineerOwnUploadCustomName}
                      onChange={(e) => setEngineerOwnUploadCustomName(e.target.value)}
                      placeholder="Περιγράψτε το έγγραφο"
                      className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  )}
                </div>
              )}

              {/* Seller lawyer own upload - category selector */}
              {!selectedDoc && isSellerLawyer && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Κατηγορία Εγγράφου <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sellerLawyerUploadCategory}
                    onChange={(e) => setSellerLawyerUploadCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Επιλέξτε κατηγορία</option>
                    {sellerDocumentTypes.map((docType) => (
                      <option key={docType} value={docType}>{docType}</option>
                    ))}
                    <option value="Άλλο">Άλλο</option>
                  </select>
                  {sellerLawyerUploadCategory === 'Άλλο' && (
                    <input
                      type="text"
                      value={sellerLawyerUploadCustomName}
                      onChange={(e) => setSellerLawyerUploadCustomName(e.target.value)}
                      placeholder="Περιγράψτε το έγγραφο"
                      className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  )}
                </div>
              )}

              {/* Buyer lawyer own upload - category selector */}
              {!selectedDoc && isBuyerLawyer && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Κατηγορία Εγγράφου <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={buyerLawyerUploadCategory}
                    onChange={(e) => setBuyerLawyerUploadCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Επιλέξτε κατηγορία</option>
                    {(activeInnerTab === 'incoming' ? buyerDocumentTypes : sellerDocumentTypes).map((docType) => (
                      <option key={docType} value={docType}>{docType}</option>
                    ))}
                    <option value="Άλλο">Άλλο</option>
                  </select>
                  {buyerLawyerUploadCategory === 'Άλλο' && (
                    <input
                      type="text"
                      value={buyerLawyerUploadCustomName}
                      onChange={(e) => setBuyerLawyerUploadCustomName(e.target.value)}
                      placeholder="Περιγράψτε το έγγραφο"
                      className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  )}
                </div>
              )}

              {/* File Input Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Επιλέξτε Αρχείο <span className="text-red-500">*</span>
                </label>
                
                {!uploadingFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingFile(file);
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={isUploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FaUpload className="text-4xl text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-1">
                        Κάντε κλικ για επιλογή αρχείου
                      </p>
                      <p className="text-sm text-gray-500">
                        ή σύρετε το αρχείο εδώ
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        PDF, DOC, DOCX, JPG, PNG (Μέγιστο: 10MB)
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FaFileAlt className="text-2xl text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {uploadingFile.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {(uploadingFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUploadingFile(null)}
                        className="text-red-600 hover:text-red-700 p-2"
                        disabled={isUploading}
                      >
                        <FaTimes className="text-lg" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {isUploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FaSpinner className="animate-spin text-blue-600 text-xl" />
                    <p className="text-blue-800 font-medium">
                      Ανέβασμα εγγράφου...
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFile(null);
                    setSelectedDoc(null);
                    setEngineerOwnUploadCategory('');
                    setEngineerOwnUploadCustomName('');
                    setIsEngineerHtkUploadFlow(false);
                    setSellerLawyerUploadCategory('');
                    setSellerLawyerUploadCustomName('');
                    setBuyerLawyerUploadCategory('');
                    setBuyerLawyerUploadCustomName('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                  disabled={isUploading}
                >
                  Ακύρωση
                </button>
                <button
                  onClick={() => {
                    if (!uploadingFile) return;
                    if (selectedDoc) {
                      handleUpload(uploadingFile, selectedDoc.category, selectedDoc.id || undefined);
                    } else if (isEngineerRole) {
                      const rawCategory = engineerOwnUploadCategory === 'Άλλο'
                        ? engineerOwnUploadCustomName.trim() 
                        : engineerOwnUploadCategory;
                      if (!rawCategory) {
                        toast.error('Επιλέξτε κατηγορία εγγράφου');
                        return;
                      }
                      const category = isEngineerHtkUploadFlow && !isHtkCategory(rawCategory)
                        ? `ΗΤΚ: ${rawCategory}`
                        : rawCategory;
                      handleUpload(uploadingFile, category);
                    } else if (isSellerLawyer) {
                      const rawCategory = sellerLawyerUploadCategory === 'Άλλο'
                        ? sellerLawyerUploadCustomName.trim()
                        : sellerLawyerUploadCategory;
                      const category = rawCategory || (activeInnerTab === 'htk' ? 'ΗΤΚ: Άλλο Έγγραφο' : 'Έγγραφο Φακέλου Πωλητή');
                      handleUpload(uploadingFile, category);
                    } else if (isBuyerLawyer) {
                      const rawCategory = buyerLawyerUploadCategory === 'Άλλο'
                        ? buyerLawyerUploadCustomName.trim()
                        : buyerLawyerUploadCategory;
                      if (!rawCategory) {
                        toast.error('Επιλέξτε κατηγορία εγγράφου');
                        return;
                      }
                      const category = activeInnerTab === 'htk' && !isHtkCategory(rawCategory)
                        ? `ΗΤΚ: ${rawCategory}`
                        : rawCategory;
                      handleUpload(uploadingFile, category);
                    }
                  }}
                  disabled={
                    isUploading ||
                    !uploadingFile ||
                    (selectedDoc
                      ? false
                      : isEngineerRole
                      ? !engineerOwnUploadCategory || (engineerOwnUploadCategory === 'Άλλο' && !engineerOwnUploadCustomName.trim())
                      : isSellerLawyer
                      ? false
                      : isBuyerLawyer
                      ? !buyerLawyerUploadCategory || (buyerLawyerUploadCategory === 'Άλλο' && !buyerLawyerUploadCustomName.trim())
                      : true)
                  }
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    selectedDoc && isEngineerRole && isHtkCategory(selectedDoc.category)
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Ανέβασμα...</span>
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      <span>Ανέβασμα</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Διαγραφή / αφαίρεση εγγράφου (επαγγελματίες — amber UI) */}
      {showProfessionalDeleteModal && professionalDeleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={closeProfessionalDeleteModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-amber-200/80 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-50 via-amber-50/90 to-orange-50/80 border-b border-amber-200 px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-amber-200/60">
                    <FaTrash className="text-amber-700 text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {professionalDeleteTarget.variant === 'engineerHtk'
                        ? 'Διαγραφή ΗΤΚ εγγράφου'
                        : 'Αφαίρεση από Συνολικά Έγγραφα'}
                    </h3>
                    <p className="text-sm text-amber-900/80 mt-0.5">
                      {professionalDeleteTarget.variant === 'engineerHtk'
                        ? 'Το έγγραφο θα αφαιρεθεί οριστικά από τα «Συνολικά Έγγραφα» ΗΤΚ για όλους τους συμμετέχοντες.'
                        : 'Το έγγραφο θα αφαιρεθεί οριστικά από τη λίστα — κανείς δεν θα το βλέπει πλέον εκεί.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeProfessionalDeleteModal}
                  disabled={professionalDeleteSubmitting}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/70 transition-colors disabled:opacity-50"
                  aria-label="Κλείσιμο"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-800/80 uppercase tracking-wide mb-1">
                  Έγγραφο
                </p>
                <p className="font-semibold text-gray-900">
                  {professionalDeleteTarget.doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}
                </p>
                {professionalDeleteTarget.doc.fileName && (
                  <p className="text-sm text-gray-600 mt-1 truncate">{professionalDeleteTarget.doc.fileName}</p>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Η ενέργεια δεν μπορεί να αναιρεθεί. Είστε σίγουροι ότι θέλετε να συνεχίσετε;
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeProfessionalDeleteModal}
                  disabled={professionalDeleteSubmitting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={confirmProfessionalDelete}
                  disabled={professionalDeleteSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 font-semibold shadow-lg shadow-amber-200/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {professionalDeleteSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Διαγραφή...</span>
                    </>
                  ) : (
                    <>
                      <FaTrash className="text-sm" />
                      <span>Ναι, διαγραφή</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Document Modal */}
      {showRejectModal && selectedDocForReject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => { setShowRejectModal(false); setSelectedDocForReject(null); setRejectNote(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden transform transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-50 to-red-50 border-b border-amber-200 px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <FaTimesCircle className="text-amber-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Απόρριψη Εγγράφου</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Το σχόλιό σας θα εμφανιστεί στον πωλητή για διόρθωση
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowRejectModal(false); setSelectedDocForReject(null); setRejectNote(''); }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
                  aria-label="Κλείσιμο"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Έγγραφο προς απόρριψη</p>
                <p className="font-semibold text-gray-900">{selectedDocForReject.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim()}</p>
                {selectedDocForReject.fileName && (
                  <p className="text-sm text-gray-600 mt-1 truncate">{selectedDocForReject.fileName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Λόγος απόρριψης <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Π.χ. Το έγγραφο είναι θολό. Παρακαλώ ανεβάστε νέο αντίγραφο με καλύτερη ανάλυση."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-all placeholder:text-gray-400"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Η εξήγηση βοηθάει τον πωλητή να διορθώσει το έγγραφο σωστά
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDocForReject(null);
                    setRejectNote('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={async () => {
                    if (!rejectNote.trim()) {
                      toast.error('Παρακαλώ εισάγετε λόγο απόρριψης');
                      return;
                    }
                    try {
                      await handleReview(selectedDocForReject.id, 'CHANGES_REQUESTED', rejectNote.trim());
                      toast.success('Το έγγραφο απορρίφθηκε');
                      setShowRejectModal(false);
                      setSelectedDocForReject(null);
                      setRejectNote('');
                      onRefresh();
                    } catch (e) {
                      toast.error('Αποτυχία απόρριψης');
                    }
                  }}
                  disabled={!rejectNote.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 font-semibold shadow-lg shadow-amber-200/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <FaTimesCircle className="inline mr-2" />
                  Απόρριψη
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Guide Modal */}
      {showDocumentGuideModal && selectedDocumentForGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDocumentGuideModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedDocumentForGuide.category}</h3>
              <button
                onClick={() => setShowDocumentGuideModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            {(documentGuides[selectedDocumentForGuide.category] || 
              engineerDocumentGuides[selectedDocumentForGuide.category] ||
              (selectedDocumentForGuide.guideWhere && selectedDocumentForGuide.guideInstructions)) ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <FaQuestionCircle className="text-blue-600 text-xl mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Πού θα το βρεις:</h4>
                      <p className="text-blue-800">
                        {selectedDocumentForGuide.guideWhere || documentGuides[selectedDocumentForGuide.category]?.where || engineerDocumentGuides[selectedDocumentForGuide.category]?.where}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <FaFileAlt className="text-green-600 text-xl mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">Οδηγίες:</h4>
                      <p className="text-green-800 whitespace-pre-line">
                        {selectedDocumentForGuide.guideInstructions || documentGuides[selectedDocumentForGuide.category]?.instructions || engineerDocumentGuides[selectedDocumentForGuide.category]?.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <p className="text-yellow-800">
                  Δεν υπάρχουν διαθέσιμες οδηγίες για αυτό το έγγραφο. Επικοινωνήστε με τον δικηγόρο σας για περισσότερες πληροφορίες.
                </p>
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDocumentGuideModal(false);
                  setSelectedDoc(selectedDocumentForGuide);
                  setShowUploadModal(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <FaUpload className="inline mr-2" />
                Ανέβασμα Εγγράφου
              </button>
              <button
                onClick={() => setShowDocumentGuideModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IBAN Modal */}
      {showIbanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowIbanModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Στοιχεία IBAN Πωλητή</h3>
              <button
                onClick={() => setShowIbanModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
                <p className="text-sm font-medium text-gray-600 mb-2">IBAN:</p>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-gray-900 font-mono">{sellerIban}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sellerIban);
                      toast.success('Το IBAN αντιγράφηκε στο clipboard');
                    }}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Αντιγραφή"
                  >
                    <FaCopy className="text-lg" />
                  </button>
                </div>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Σημαντικό:</strong> Στην αιτιολογία συναλλαγής γράψε οπωσδήποτε: <strong>"Προκαταβολή για αγορά ακινήτου {deal.property?.street} {deal.property?.number}, {deal.property?.city}"</strong>
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sellerIban);
                    toast.success('Το IBAN αντιγράφηκε');
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  <FaCopy />
                  Αντιγραφή IBAN
                </button>
                <button
                  onClick={() => setShowIbanModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Guide Modal */}
      {showActionGuideModal && selectedActionForGuide && (() => {
        const actionType = getActionType(selectedActionForGuide.category);
        const guideRaw = getActionGuide(actionType, selectedActionForGuide);
        // Ensure guide has the correct structure (only description and instructions)
        const guide: { title: string; description: string; instructions: string } = {
          title: guideRaw.title,
          description: guideRaw.description || '',
          instructions: guideRaw.instructions || ''
        };
        const isActionDoc = isAction(selectedActionForGuide);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
            if (!isEditingAction) {
              setShowActionGuideModal(false);
            }
          }}>
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{guide.title}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    ⚡ Ενέργεια
                  </span>
                </div>
                <div className="flex gap-2">
                  {isProfessional && isActionDoc && (
                    <button
                      onClick={() => {
                        if (isEditingAction) {
                          // Load current values
                          const parsed = parseActionGuide(selectedActionForGuide);
                          if (parsed) {
                            setActionDescription(parsed.description);
                            // Split instructions to separate main instructions from additional info
                            const instructionsParts = parsed.instructions.split('\n\n');
                            setActionInstructions(instructionsParts[0] || '');
                            setActionAdditionalInfo(instructionsParts.slice(1).join('\n\n') || '');
                          }
                        }
                        setIsEditingAction(!isEditingAction);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {isEditingAction ? 'Ακύρωση' : 'Επεξεργασία'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEditingAction(false);
                      setShowActionGuideModal(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {isProfessional && isActionDoc && isEditingAction ? (
                // Edit mode for lawyer
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 p-5 rounded-r-lg shadow-sm">
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">Τι είναι:</h4>
                    <textarea
                      value={actionDescription || guide.description}
                      onChange={(e) => setActionDescription(e.target.value)}
                      placeholder="Περιγραφή της ενέργειας"
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-600 p-5 rounded-r-lg shadow-sm">
                    <h4 className="font-bold text-indigo-900 mb-3 text-lg">Πώς θα το κάνει ο χρήστης:</h4>
                    <textarea
                      value={actionInstructions || guide.instructions}
                      onChange={(e) => setActionInstructions(e.target.value)}
                      placeholder="Αναλυτικές οδηγίες - πώς θα το κάνει ο χρήστης (μπορείς να προσθέσεις επιπλέον σημαντικές πληροφορίες)"
                      rows={12}
                      className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={async () => {
                        try {
                          // Update document with new guide information
                          // Instructions already contain all information
                          const actionData = {
                            description: actionDescription || guide.description,
                            instructions: actionInstructions || guide.instructions || ''
                          };
                          
                          // Call API to update document guide
                          const response = await fetchFromBackend(`/deals/${deal.id}/documents/${selectedActionForGuide.id}/update-guide`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                              guideWhere: '', // Not needed anymore
                              guideInstructions: JSON.stringify(actionData)
                            })
                          });
                          
                          if (!response.ok) {
                            throw new Error('Αποτυχία ενημέρωσης');
                          }
                          
                          toast.success('Οι πληροφορίες ενημερώθηκαν επιτυχώς');
                          setIsEditingAction(false);
                          await fetchDocuments();
                          onRefresh();
                        } catch (error: any) {
                          console.error('Error updating action guide:', error);
                          toast.error(error.message || 'Αποτυχία ενημέρωσης πληροφοριών');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Αποθήκευση Αλλαγών
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAction(false);
                        setActionDescription('');
                        setActionWhy('');
                        setActionWhere('');
                        setActionInstructions('');
                        setActionAdditionalInfo('');
                        setActionResult('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Ακύρωση
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-4">
                  {/* Description - Τι είναι */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 p-5 rounded-r-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <FaQuestionCircle className="text-blue-700 text-2xl mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-3 text-lg">Τι είναι:</h4>
                        <p className="text-blue-900 text-base leading-relaxed">{guide.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instructions - Πώς θα το κάνει ο χρήστης */}
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-600 p-5 rounded-r-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <FaFileAlt className="text-indigo-700 text-2xl mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-indigo-900 mb-3 text-lg">Πώς θα το κάνεις:</h4>
                        <div className="text-indigo-900 text-base leading-relaxed whitespace-pre-line">
                          {guide.instructions.split('\n').map((line, idx) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <strong key={idx} className="text-indigo-950 font-semibold">{line.replace(/\*\*/g, '')}</strong>;
                            }
                            if (line.trim() === '') {
                              return <br key={idx} />;
                            }
                            return <p key={idx} className="mb-2">{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex gap-3">
                {/* Action-specific buttons */}
                {actionType === 'TAX_REP_ASSIGNMENT' && (
                  <a
                    href="https://www1.aade.gr/saadeapps3/comregistry/#!/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <FaExternalLinkAlt />
                    Μετάβαση στο myAADE
                  </a>
                )}
                
                {actionType === 'DEPOSIT_TRANSFER' && (
                  <button
                    onClick={() => {
                      setShowActionGuideModal(false);
                      setShowIbanModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Προβολή Στοιχείων IBAN
                  </button>
                )}
                
                {actionType === 'DOCUMENT_TRANSLATION' && (
                  <a
                    href="https://metafraseis.services.gov.gr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
                  >
                    <FaExternalLinkAlt />
                    Εύρεση Μεταφραστή
                  </a>
                )}
                
                {/* Upload button for actions that require file upload */}
                {(actionType === 'TAX_REP_ASSIGNMENT' || actionType === 'DOCUMENT_TRANSLATION') && (
                  <button
                    onClick={() => {
                      setShowActionGuideModal(false);
                      setSelectedDoc(selectedActionForGuide);
                      setShowUploadModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <FaUpload className="inline mr-2" />
                    Ανέβασμα Αποδεικτικού
                  </button>
                )}
                
                {/* Ανέβασμα Επιβεβαίωσης: για όλες τις ενέργειες που χρειάζονται screenshot/έγγραφο επιβεβαίωσης */}
                {!(actionType === 'TAX_REP_ASSIGNMENT' || actionType === 'DOCUMENT_TRANSLATION') && (
                  <button
                    onClick={() => {
                      setShowActionGuideModal(false);
                      setSelectedDoc(selectedActionForGuide);
                      setShowUploadModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <FaUpload className="inline mr-2" />
                    Ανέβασμα Επιβεβαίωσης
                  </button>
                )}
                
                <button
                  onClick={() => setShowActionGuideModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

