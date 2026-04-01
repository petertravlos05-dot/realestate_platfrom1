'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaUsers, FaFileAlt, FaCalendarAlt, FaCheckCircle, FaClock, FaUserTie, FaHandshake, FaInfoCircle, FaWrench } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import DealNextActionCard from '../DealNextActionCard';
import SellersPurchaseGuide from '../SellersPurchaseGuide';
import RentSellersGuide from '../RentSellersGuide';
import CardSection from '../ui/CardSection';
import { isBuyer, isSeller, isAgent, isNotary, isEngineer, isLawyer } from '@/lib/utils/dealRole';
import { getBuyerProgressMessage, getBuyerProgressForSeller, getBuyerRentProgressForSeller, getSellerProgressForBuyer, getSellerRentProgressForBuyer } from '@/lib/utils/buyerProgress';
import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import { useSession } from 'next-auth/react';
import { fetchFromBackend } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import { FaCheck, FaSpinner, FaArrowRight, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useDealRoomTheme } from '../useDealRoomTheme';
import { getDealDocumentsSubfolderStats } from '@/lib/utils/dealDocumentsSubfolderStats';

interface OverviewTabProps {
  deal: DealRoom;
  onRefresh: () => void;
  sseEvents?: any[]; // Activity events from SSE
}

export default function OverviewTab({ deal, onRefresh, sseEvents = [] }: OverviewTabProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { data: session } = useSession();
  const [propertyAppointments, setPropertyAppointments] = useState<any[]>([]);
  
  // Determine user role based on property ownership
  const isBuyerRole = isBuyer(deal, userId);
  const isSellerRole = isSeller(deal, userId);
  const isAgentRole = isAgent(deal, userId);
  const isNotaryRole = isNotary(deal, userId);
  const isEngineerRole = isEngineer(deal, userId);
  const isLawyerRole = isLawyer(deal, userId);

  const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
  const isRent = (() => {
    const a = (deal.property as any)?.amenities;
    return a && typeof a === 'object' && String(a.listingType || a.transactionType || '').toLowerCase() === 'rent';
  })();
  const isSellersEngineer = isEngineerRole && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerId && r.professional?.user?.id === userId
  );
  const isSellersLawyer = isLawyerRole && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId && r.professional?.user?.id === userId
  );
  const isBuyersLawyer = isLawyerRole && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId && r.professional?.user?.id === userId
  );
  const hasSellerLawyerInDeal = !!deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
  );
  
  const [isNotaryApproving, setIsNotaryApproving] = useState(false);
  const [isEngineerApproving, setIsEngineerApproving] = useState(false);
  const [isLawyerApproving, setIsLawyerApproving] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [showBuyerLawyerBasicDocsModal, setShowBuyerLawyerBasicDocsModal] = useState(false);
  const [isBuyerLawyerBasicDocsApproving, setIsBuyerLawyerBasicDocsApproving] = useState(false);
  const [showBuyerLawyerStep2ConfirmModal, setShowBuyerLawyerStep2ConfirmModal] = useState(false);
  const [isBuyerLawyerStep2Completing, setIsBuyerLawyerStep2Completing] = useState(false);
  const [showBuyerLawyerStep3ConfirmModal, setShowBuyerLawyerStep3ConfirmModal] = useState(false);
  const [isBuyerLawyerStep3Approving, setIsBuyerLawyerStep3Approving] = useState(false);
  const [showSellerLawyerStep3ConfirmModal, setShowSellerLawyerStep3ConfirmModal] = useState(false);
  const [sellerGuideOpen, setSellerGuideOpen] = useState(false);
  const [buyerProgressOpen, setBuyerProgressOpen] = useState(isAgentRole);
  const [sellerProgressOpen, setSellerProgressOpen] = useState(isAgentRole);
  const { isProfessionalContext } = useDealRoomTheme();

  // Fetch property appointments for buyer progress calculation (seller and agent view)
  useEffect(() => {
    if ((!isSellerRole && !isAgentRole) || !deal.propertyId || !deal.buyerId) return;

    const fetchPropertyAppointments = async () => {
      try {
        const response = await apiClient.get(`/seller/appointments`, {
          params: {
            propertyId: deal.propertyId,
            buyerId: deal.buyerId,
          },
        });
        
        if (response.data.appointments) {
          setPropertyAppointments(response.data.appointments);
        }
      } catch (error) {
        console.error('Error fetching property appointments:', error);
      }
    };

    fetchPropertyAppointments();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchPropertyAppointments, 10000);
    
    return () => clearInterval(interval);
  }, [deal.propertyId, deal.buyerId, deal.updatedAt, isSellerRole, isAgentRole]);

  // Get buyer progress (for seller and agent view)
  const buyerProgress = (isSellerRole || isAgentRole)
    ? getBuyerProgressMessage(deal, propertyAppointments)
    : null;
  const buyerProgressForSeller = (isSellerRole || isAgentRole)
    ? (isRent
        ? getBuyerRentProgressForSeller(deal, propertyAppointments)
        : getBuyerProgressForSeller(deal, propertyAppointments, sseEvents))
    : null;
  const pendingRequests = deal.requests?.filter((r) => r.status === 'REQUESTED').length || 0;
  const acceptedLawyer = deal.requests?.find((r) => r.status === 'ACCEPTED' && r.type === 'LAWYER');
  const acceptedNotary = deal.requests?.find((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY');
  // Seller: all professionals in deal; others: lawyer+notary count
  const allAcceptedProfessionals = deal.requests?.filter((r) => r.status === 'ACCEPTED') || [];
  const professionalsCount = isSellerRole
    ? allAcceptedProfessionals.length
    : (acceptedLawyer ? 1 : 0) + (acceptedNotary ? 1 : 0);

  /** Συνολικά ανά υπο-φάκελο — ίδια λογική με tab Έγγραφα (Συνολικά Έγγραφα) */
  const documentsSubfolderStats = useMemo(
    () => getDealDocumentsSubfolderStats(deal, userId),
    [deal, userId]
  );

  // Seller: merge deal appointments + property (viewing) appointments for next appointment
  const now = new Date();
  const parseStartAt = (val: unknown): Date | null => {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  };
  const futureDealAppointments = (deal.appointments || [])
    .filter((a) => a.status === 'CONFIRMED' && a.startAt)
    .map((a) => ({ startAt: parseStartAt(a.startAt), type: a.type }))
    .filter((a): a is { startAt: Date; type: string } => a.startAt !== null && a.startAt > now);
  const rentProposalStart = isRent && (deal.rentSigningProposal as { startAt?: string } | null)?.startAt;
  const futureRentProposal = rentProposalStart
    ? (() => { const d = parseStartAt(rentProposalStart); return d && d > now ? [{ startAt: d, type: 'RENT_SIGNING' as const }] : []; })()
    : [];
  const futurePropertyAppointments = (propertyAppointments || [])
    .filter((a) => a.status === 'ACCEPTED' && a.date && a.time)
    .map((a) => {
      const datePart = typeof a.date === 'string'
        ? (a.date.includes('T') ? a.date.split('T')[0] : a.date)
        : (a.date instanceof Date ? a.date.toISOString().slice(0, 10) : '');
      return { startAt: parseStartAt(`${datePart}T${a.time}`), type: 'VIEWING' as const };
    })
    .filter((a): a is { startAt: Date; type: 'VIEWING' } => a.startAt !== null && a.startAt > now);
  const allFutureAppointments = [
    ...futureDealAppointments,
    ...(isSellerRole ? futurePropertyAppointments : []),
    ...futureRentProposal,
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const firstFuture = allFutureAppointments[0];
  const upcomingAppointment = firstFuture && !isNaN(firstFuture.startAt.getTime())
    ? { startAt: firstFuture.startAt, type: firstFuture.type }
    : null;
  const confirmedSigningAppointment = deal.appointments?.find(
    (a) => a.status === 'CONFIRMED' && a.type === 'IN_PERSON'
  );
  const hasBuyerPurchaseConfirmation = !!deal.buyerSigningConfirmed;
  const hasSellerPurchaseConfirmation = !!deal.sellerSigningConfirmed;
  const isPurchaseCompletedByBothSides = hasBuyerPurchaseConfirmation && hasSellerPurchaseConfirmation;

  // Seller-specific data
  const buyer = deal.participants?.find(p => p.role === 'BUYER');
  
  // Check for pending viewing requests (property appointments)
  const pendingViewingRequests = propertyAppointments?.filter(
    (a) => a.status === 'PENDING' || a.status === 'PENDING_SELLER_APPROVAL'
  ).length || 0;
  
  const pendingAppointments = deal.appointments?.filter(a => a.status === 'REQUESTED').length || 0;
  const totalPendingAppointments = pendingViewingRequests + pendingAppointments;
  
  const confirmedAppointments = deal.appointments?.filter(a => a.status === 'CONFIRMED').length || 0;
  const confirmedViewingRequests = propertyAppointments?.filter(
    (a) => a.status === 'ACCEPTED'
  ).length || 0;
  const totalConfirmedAppointments = confirmedAppointments + confirmedViewingRequests;
  
  // Documents requested from seller
  const pendingDocumentsFromSeller = deal.documents?.filter(
    d => d.status === 'REQUESTED' && d.requestedFromRole === 'SELLER'
  ).length || 0;
  
  // Documents requested from buyer (seller needs to review)
  const pendingDocumentsFromBuyer = deal.documents?.filter(
    d => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
  ).length || 0;
  
  const uploadedDocuments = deal.documents?.filter(d => d.status === 'UPLOADED' || d.status === 'APPROVED').length || 0;
  
  // Professional requests pending seller action (if any)
  const pendingProfessionalRequests = deal.requests?.filter(r => r.status === 'REQUESTED').length || 0;

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
      }

      toast.success('Η έγκριση καταχωρήθηκε. Ολοκληρώθηκε το Βήμα 5 του αγοραστή και του πωλητή. Έτοιμο για τελική υπογραφή.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά την έγκριση');
    } finally {
      setIsNotaryApproving(false);
    }
  };

  // Check if notary has approved (persisted in DB + SSE + sessionStorage for immediate UI)
  const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
    sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

  const engineerApprovedSellerDocs = !!deal.engineerApprovedSellerDocumentsAt ||
    sseEvents?.some((e: any) => e.type === 'engineer_approved_seller_documents');
  const lawyerApprovedSellerDocs = !!deal.lawyerApprovedSellerDocumentsAt ||
    sseEvents?.some((e: any) => e.type === 'lawyer_approved_seller_documents');
  const normalizeCategory = (value?: string) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const sellerLawyerKycDocsCount = (deal.documents || []).filter((d) => {
    if (d.requestedFromRole !== 'BUYER') return false;
    const category = normalizeCategory(d.category);
    const isKycCategory =
      category.includes('ταυτοτ') ||
      category.includes('identity') ||
      category.includes('αφμ') ||
      category.includes('tax');
    return isKycCategory && (d.status === 'UPLOADED' || d.status === 'APPROVED');
  }).length;
  const hasBuyerAgreementContext = !!deal.buyerConfirmedInterestAt || (deal.offers || []).some((o) => o.status === 'ACCEPTED');
  const sellerLawyerStep1Completed = sellerLawyerKycDocsCount > 0 && hasBuyerAgreementContext;
  const sellerLawyerPendingSellerDocsCount = (deal.documents || []).filter(
    (d) => d.requestedFromRole === 'SELLER' && d.status === 'REQUESTED'
  ).length;
  const sellerLawyerUploadedSellerDocsCount = (deal.documents || []).filter(
    (d) => d.requestedFromRole === 'SELLER' && (d.status === 'UPLOADED' || d.status === 'APPROVED')
  ).length;
  const sellerLawyerStep2Completed =
    sellerLawyerUploadedSellerDocsCount > 0 &&
    sellerLawyerPendingSellerDocsCount === 0;
  const sellerLawyerApprovedBuyerFolder = (
    sseEvents?.some((e: any) => e.type === 'lawyer_approved_buyer_progress') ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`) === 'true')
  ) || false;
  const sellerLawyerStep3Completed = sellerLawyerApprovedBuyerFolder;
  const sellerLawyerStep4CompletionSignal = lawyerApprovedSellerDocs;
  const sellerLawyerStep4Completed =
    sellerLawyerStep2Completed &&
    sellerLawyerStep3Completed &&
    sellerLawyerStep4CompletionSignal;
  const sellerLawyerStep5Completed = hasNotaryApproval;
  const sellerLawyerStep6Completed =
    isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED';
  const sellerLawyerCurrentStep =
    !sellerLawyerStep2Completed ? 1 :
    !sellerLawyerStep3Completed ? 2 :
    !sellerLawyerStep4Completed ? 3 :
    !sellerLawyerStep5Completed ? 4 :
    !sellerLawyerStep6Completed ? 5 : 6;

  // Buyer's lawyer step status (overview action guide)
  const buyerLawyerStep1Completed = !!deal.lawyerApprovedBasicDocumentsAt ||
    sseEvents?.some((e: any) => e.type === 'lawyer_approved_basic_documents_for_deposit');
  const buyerLawyerStep2Completed =
    !!deal.buyerLawyerCompletedBuyerFolderAt ||
    sseEvents?.some((e: any) => e.type === 'buyer_lawyer_completed_buyer_folder') ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`buyerLawyerGuideStep2_${deal.id}`) === 'true');
  const buyerLawyerStep3Completed = lawyerApprovedSellerDocs;
  /** Έγκριση φακέλου πωλητή/ΗΤΚ: πάντα αν δεν υπάρχει δικηγόρος πωλητή· αλλιώς μετά το Βήμα 1 του δικηγόρου πωλητή (ολοκλήρωση φακέλου πωλητή). */
  const buyerLawyerStep3ApproveUnlocked =
    !hasSellerLawyerInDeal || sellerLawyerStep2Completed;
  const buyerLawyerStep3AwaitingSellerLawyerStep1 =
    hasSellerLawyerInDeal && !sellerLawyerStep2Completed;
  const buyerLawyerStep4CompletionSignal = sellerLawyerApprovedBuyerFolder || (
    !hasSellerLawyerInDeal &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem(`buyerLawyerStep4NoSellerLawyer_${deal.id}`) === 'true'
  );
  const buyerLawyerStep4Completed =
    buyerLawyerStep1Completed &&
    buyerLawyerStep2Completed &&
    buyerLawyerStep3Completed &&
    buyerLawyerStep4CompletionSignal;
  const buyerLawyerStep5Completed = hasNotaryApproval;
  const buyerLawyerStep6Completed =
    isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED';
  const buyerLawyerCurrentStep =
    !buyerLawyerStep1Completed ? 1 :
    !buyerLawyerStep2Completed ? 2 :
    !buyerLawyerStep3Completed ? 3 :
    !buyerLawyerStep4Completed ? 4 :
    !buyerLawyerStep5Completed ? 5 :
    !buyerLawyerStep6Completed ? 6 : 7;
  const engineerSellerFolderDocsCount = (deal.documents || []).filter((d) => {
    if (d.requestedFromRole !== 'SELLER') return false;
    const category = normalizeCategory(d.category);
    const isHtkCategory =
      category.includes('ηλεκτρονικη ταυτοτητα κτηριου') ||
      category.startsWith('ητκ') ||
      category.includes('htk');
    return !isHtkCategory && (d.status === 'UPLOADED' || d.status === 'APPROVED');
  }).length;
  const engineerStep1ManualCompletion = typeof window !== 'undefined' &&
    sessionStorage.getItem(`engineerGuideStep1_${deal.id}`) === 'true';
  const engineerStep1Completed = engineerStep1ManualCompletion || engineerSellerFolderDocsCount > 0;
  const engineerStep2Completed = engineerStep1Completed && engineerApprovedSellerDocs;
  const engineerStep3Completed = engineerStep2Completed && buyerLawyerStep3Completed;
  const engineerStep4Completed = engineerStep3Completed && hasNotaryApproval;
  const engineerStep5Completed =
    engineerStep4Completed && (isPurchaseCompletedByBothSides || deal.status === 'CLOSED' || deal.status === 'COMPLETED');
  const engineerCurrentStep =
    !engineerStep1Completed ? 1 :
    !engineerStep2Completed ? 2 :
    !engineerStep3Completed ? 3 :
    !engineerStep4Completed ? 4 :
    !engineerStep5Completed ? 5 : 6;

  const handleBuyerLawyerStep2Complete = async () => {
    setIsBuyerLawyerStep2Completing(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/complete-buyer-folder`, {
        method: 'POST',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Αποτυχία' }));
        throw new Error(err.error || 'Αποτυχία καταχώρησης');
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`buyerLawyerGuideStep2_${deal.id}`, 'true');
      }
      toast.success(
        'Το Βήμα 2 ολοκληρώθηκε. Ο δικηγόρος του πωλητή (αν υπάρχει) μπορεί πλέον να προχωρήσει στον έλεγχο του φακέλου αγοραστή.'
      );
      setShowBuyerLawyerStep2ConfirmModal(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά την ολοκλήρωση του βήματος');
    } finally {
      setIsBuyerLawyerStep2Completing(false);
    }
  };

  const handleBuyerLawyerStep3ApproveSellerFolder = async () => {
    setIsBuyerLawyerStep3Approving(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/approve-seller-documents`, {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Σφάλμα');
      }

      toast.success('Ο φάκελος πωλητή και η ΗΤΚ εγκρίθηκαν. Προχωράτε στο επόμενο βήμα.');
      setShowBuyerLawyerStep3ConfirmModal(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsBuyerLawyerStep3Approving(false);
    }
  };

  const handleBuyerLawyerStep4NoSellerLawyerComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`buyerLawyerStep4NoSellerLawyer_${deal.id}`, 'true');
    }
    toast.success('Το Βήμα 4 ολοκληρώθηκε. Μπορείτε να προχωρήσετε άμεσα.');
    onRefresh();
  };

  const handleEngineerApproveSellerDocs = async () => {
    setIsEngineerApproving(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/engineer/approve-seller-documents`, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Ο φάκελος ΗΤΚ ολοκληρώθηκε. Οι δικηγόροι μπορούν πλέον να ξεκινήσουν τον έλεγχο.');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsEngineerApproving(false);
    }
  };

  const handleEngineerStep1Complete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`engineerGuideStep1_${deal.id}`, 'true');
    }
    toast.success('Το Βήμα 1 ολοκληρώθηκε.');
    onRefresh();
  };

  const handleLawyerApproveSellerDocs = async () => {
    setIsLawyerApproving(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/approve`, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Σφάλμα');
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`, 'true');
      }
      toast.success('Ο φάκελος αγοραστή εγκρίθηκε.');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setIsLawyerApproving(false);
    }
  };

  // Seller progress for agent view (SALE or RENT)
  const sellerProgressForAgent = isAgentRole
    ? (isRent ? getSellerRentProgressForBuyer(deal) : getSellerProgressForBuyer(deal))
    : null;

  return (
    <div className="space-y-6">
      {/* Agent: Ρόλος και Στόχος - Enhanced hero */}
      {isAgentRole && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          <div className="relative px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <FaUserTie className="text-white text-2xl" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Ο ρόλος σας ως μεσίτης</h2>
                <p className="text-indigo-100 text-base leading-relaxed mb-3">
                  Ο σκοπός σας είναι να ολοκληρωθεί η αγοραπώλησια ώστε να λάβετε την προμήθειά σας. Το μόνο που χρειάζεται να κάνετε είναι να παρακολουθείτε την πρόοδο από όλες τις πλευρές.
                </p>
                <p className="text-indigo-200/90 text-sm">
                  Παρακάτω: βήματα αγοραστή και στάδιο πωλητή.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent: Visual spacer before progress */}
      {isAgentRole && buyerProgressForSeller && (
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
      )}

      {/* What's Next Card - Only for buyers (not for notaries) */}
      {isBuyerRole && !isNotaryRole && <DealNextActionCard deal={deal} />}
      
      {/* Seller-specific: Οδηγός Πώλησης ή Ενοικίασης - collapsible */}
      {isSellerRole && (
        <CardSection>
          <button
            type="button"
            onClick={() => setSellerGuideOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-3 text-left py-2 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-bold text-gray-900">{isRent ? 'Οδηγός Ενοικίασης Ακινήτου' : 'Οδηγός Πώλησης Ακινήτου'}</h2>
            {sellerGuideOpen ? (
              <FaChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
            ) : (
              <FaChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            )}
          </button>
          {sellerGuideOpen && (
            <div className="mt-4">
              {isRent ? (
                <RentSellersGuide deal={deal} sseEvents={sseEvents} onRefresh={onRefresh} embedded />
              ) : (
                <SellersPurchaseGuide deal={deal} sseEvents={sseEvents} onRefresh={onRefresh} embedded />
              )}
            </div>
          )}
        </CardSection>
      )}

      {/* Seller/Agent: Πρόοδος Αγοραστή - collapsible */}
      {(isSellerRole || isAgentRole) && buyerProgressForSeller && (
        <CardSection className={isAgentRole ? 'border-indigo-200 shadow-md' : ''}>
          <button
            type="button"
            onClick={() => setBuyerProgressOpen((o) => !o)}
            className={`w-full flex items-center justify-between gap-3 text-left py-3 -mx-2 px-3 rounded-xl transition-colors ${isAgentRole ? 'hover:bg-indigo-50/50' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isAgentRole ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-200' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                <FaUsers className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Βήματα Αγοραστή</h2>
                <p className="text-sm text-gray-600">
                  Βήμα {buyerProgressForSeller.currentStep} από {isRent ? '7' : '11'} · {Math.round((buyerProgressForSeller.steps.filter((s) => s.completed).length / (isRent ? 7 : 11)) * 100)}%
                </p>
              </div>
            </div>
            {buyerProgressOpen ? (
              <FaChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
            ) : (
              <FaChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            )}
          </button>
          {buyerProgressOpen && (
          <div className="space-y-4 mt-5">
            <p className="text-xs text-gray-500 mb-3">
              {isRent ? 'Τα στάδια του αγοραστή στον Οδηγό Ενοικίασης' : 'Τα στάδια του αγοραστή στον Οδηγό Αγοράς'}
            </p>

            <div className="space-y-2">
              {buyerProgressForSeller.steps.map((stage, index) => {
                const isCompleted = stage.completed;
                const isActive = stage.active;
                return (
                  <div
                    key={stage.id}
                    className={`
                      relative flex items-start gap-3 p-3 rounded-xl transition-all border
                      ${isActive
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : isCompleted
                        ? 'bg-green-50/80 border-green-200'
                        : 'bg-gray-50/80 border-gray-200'
                      }
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                        ${isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-500'
                        }
                      `}
                    >
                      {isCompleted ? <FaCheckCircle className="text-sm" /> : stage.id}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3
                        className={`font-semibold text-sm ${
                          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                        }`}
                      >
                        {stage.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-blue-900">Πρόοδος</span>
                <span className="text-lg font-extrabold text-blue-700">
                  {Math.round((buyerProgressForSeller.steps.filter((s) => s.completed).length / (isRent ? 7 : 11)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${(buyerProgressForSeller.steps.filter((s) => s.completed).length / (isRent ? 7 : 11)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          )}
        </CardSection>
      )}

      {/* Agent: Στάδιο Πωλητή - collapsible */}
      {isAgentRole && sellerProgressForAgent && (
        <CardSection className="border-emerald-200 shadow-md">
          <button
            type="button"
            onClick={() => setSellerProgressOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-3 text-left py-3 -mx-2 px-3 rounded-xl hover:bg-emerald-50/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
                <FaUserTie className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Στάδιο Πωλητή</h2>
                <p className="text-sm text-gray-600">
                  Βήμα {sellerProgressForAgent.currentStep} από {sellerProgressForAgent.totalSteps} · {Math.round((sellerProgressForAgent.completedSteps / sellerProgressForAgent.totalSteps) * 100)}%
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
            <div className="space-y-4 mt-5">
              <p className="text-xs text-gray-500 mb-3">
                {isRent ? 'Τα στάδια του ιδιοκτήτη στον Οδηγό Ενοικίασης' : 'Τα στάδια του πωλητή στον Οδηγό Πώλησης'}
              </p>
              <div className="space-y-2">
                {sellerProgressForAgent.steps.map((stage) => (
                  <div
                    key={stage.id}
                    className={`
                      relative flex items-start gap-3 p-3 rounded-xl transition-all border
                      ${stage.active
                        ? 'bg-emerald-50/80 border-emerald-400 shadow-sm'
                        : stage.completed
                        ? 'bg-green-50/80 border-green-200'
                        : 'bg-gray-50/80 border-gray-200'
                      }
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                        ${stage.completed
                          ? 'bg-green-500 text-white'
                          : stage.active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-300 text-gray-500'
                        }
                      `}
                    >
                      {stage.completed ? <FaCheckCircle className="text-sm" /> : stage.id}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3
                        className={`font-semibold text-sm ${
                          stage.active ? 'text-emerald-900' : stage.completed ? 'text-green-900' : 'text-gray-600'
                        }`}
                      >
                        {stage.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-green-900">Πρόοδος πωλητή</span>
                  <span className="text-lg font-extrabold text-green-700">
                    {Math.round((sellerProgressForAgent.completedSteps / sellerProgressForAgent.totalSteps) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${(sellerProgressForAgent.completedSteps / sellerProgressForAgent.totalSteps) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardSection>
      )}
      
      {/* Engineer (seller's): 5-step engineering workflow */}
      {isSellersEngineer && (
        <CardSection>
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isProfessionalContext ? 'bg-gradient-to-br from-teal-600 to-slate-800' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
                <FaWrench className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Οδηγός Μηχανικού</h2>
                <p className="text-sm text-gray-600">Βήμα {Math.min(engineerCurrentStep, 5)} από 5</p>
              </div>
            </div>

            {[
              {
                id: 1,
                title: 'Άντληση Στοιχείων από Φάκελο Πωλητή',
                description: 'Μελετήστε τα νομιμοποιητικά έγγραφα του ακινήτου για να ξεκινήσετε τη σύνταξη της ΗΤΚ.',
                instructions: [
                  'Επισκεφθείτε το tab "Φάκελος Πωλητή".',
                  'Αναζητήστε και κατεβάστε τον Τίτλο Κτήσης (παλιό συμβόλαιο) και το Απόσπασμα Κτηματολογίου (ΚΑΕΚ) που έχει αναρτήσει ο ιδιοκτήτης ή ο Δικηγόρος του Πωλητή.',
                  'Σημείωση: Αν λείπει κάτι κρίσιμο, μπορείτε να το ζητήσετε μέσω των "Αιτημάτων".'
                ],
                completed: engineerStep1Completed,
              },
              {
                id: 2,
                title: 'Ανάρτηση & Ολοκλήρωση ΗΤΚ',
                description: 'Ανεβάστε την Ηλεκτρονική Ταυτότητα Κτιρίου και τα τεχνικά σχέδια στον δικό σας φάκελο.',
                instructions: [
                  'Μεταβείτε στο tab "Ηλεκτρονική Ταυτότητα Κτιρίου (ΗΤΚ)".',
                  'Αναρτήστε το Απόσπασμα ΗΤΚ, το Πιστοποιητικό Πληρότητας, τις Κατόψεις και το Πιστοποιητικό Ενεργειακής Απόδοσης (ΠΕΑ).',
                  'Μόλις έχετε αναρτήσει όλα τα τεχνικά έγγραφα, πατήστε "Ολοκλήρωση Φακέλου ΗΤΚ".',
                  '(Αυτό δίνει το σήμα στους δύο δικηγόρους ότι μπορούν να ξεκινήσουν τον έλεγχο).'
                ],
                completed: engineerStep2Completed,
              },
              {
                id: 3,
                title: 'Αναμονή Ελέγχου από Δικηγόρους',
                description: 'Αναμένετε τους δικηγόρους να ελέγξουν τα τεχνικά έγγραφα που αναρτήσατε.',
                instructions: [
                  'Ο Δικηγόρος του Πωλητή ελέγχει την ΗΤΚ σας για να εκδώσει τον ΕΝΦΙΑ (Ταύτιση εμβαδών).',
                  'Ο Δικηγόρος του Αγοραστή κάνει τον αυστηρό Νομικό Έλεγχο και συγκρίνει την ΗΤΚ με τους τίτλους ιδιοκτησίας.',
                  'Προσοχή: Εάν παρατηρηθεί κάποια ασυμφωνία ή λείπει κάποιο σχέδιο (π.χ. τοπογραφικό), θα λάβετε σχετική ειδοποίηση στο tab "Αιτήματα" για να το συμπληρώσετε.'
                ],
                completed: engineerStep3Completed,
              },
              {
                id: 4,
                title: 'Αναμονή Ελέγχου από Συμβολαιογράφο',
                description: 'Τα έγγραφά σας ελέγχονται από τον Συμβολαιογράφο για τη σύνταξη του συμβολαίου.',
                instructions: [
                  'Οι δικηγόροι έχουν "κλειδώσει" τους φακέλους και ο Συμβολαιογράφος ελέγχει πλέον την πληρότητα της ΗΤΚ για να τη μνημονεύσει στο τελικό συμβόλαιο.',
                  'Το βήμα αυτό ολοκληρώνεται με την "Τελική Έγκριση Συμβολαιογράφου".'
                ],
                completed: engineerStep4Completed,
              },
              {
                id: 5,
                title: 'Ολοκλήρωση Διαδικασίας',
                description: 'Η μεταβίβαση έχει δρομολογηθεί για υπογραφές. Το τεχνικό σας έργο ολοκληρώθηκε!',
                instructions: [
                  'Το συμβόλαιο είναι έτοιμο για υπογραφή.',
                  'Ως μηχανικός, η συμμετοχή σας στη φυσική υπογραφή των συμβολαίων δεν είναι υποχρεωτική, εκτός εάν έχει συμφωνηθεί διαφορετικά με τον πελάτη σας.',
                  'Το σύστημα θα σας ενημερώσει μόλις ολοκληρωθεί επιτυχώς η συναλλαγή.'
                ],
                completed: engineerStep5Completed,
              },
            ].map((step) => {
              const isCurrent = engineerCurrentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    step.completed
                      ? 'border-green-300 bg-green-50'
                      : isCurrent
                      ? (isProfessionalContext ? 'border-teal-500 bg-teal-50 shadow-lg' : 'border-amber-500 bg-amber-50 shadow-lg')
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      step.completed
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? (isProfessionalContext ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white')
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step.completed ? <FaCheck /> : step.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα {step.id}: {step.title}</h3>
                        {step.completed ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 border border-green-300">
                            ΟΛΟΚΛΗΡΩΘΗΚΕ
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-300">
                            ΤΡΕΧΟΝ
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                            ΕΚΚΡΕΜΕΙ
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{step.description}</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {step.instructions.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                      {!step.completed && isCurrent && step.id === 1 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                          >
                            <FaFileAlt />
                            Δείτε Έγγραφα
                          </button>
                          <button
                            onClick={handleEngineerStep1Complete}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg ${
                              isProfessionalContext
                                ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                            }`}
                          >
                            Ολοκλήρωση Βήματος
                          </button>
                        </div>
                      )}
                      {!step.completed && isCurrent && step.id === 2 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                          >
                            <FaFileAlt />
                            Δείτε Έγγραφα
                          </button>
                          <button
                            onClick={handleEngineerApproveSellerDocs}
                            disabled={isEngineerApproving}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                              isProfessionalContext
                                ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                            }`}
                          >
                            {isEngineerApproving ? <><FaSpinner className="animate-spin" /> Επεξεργασία...</> : 'Ολοκλήρωση Φακέλου ΗΤΚ'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardSection>
      )}

      {/* Lawyer (buyer's): 6-step buyer-side legal workflow */}
      {isBuyersLawyer && (
        <CardSection>
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isProfessionalContext ? 'bg-gradient-to-br from-teal-600 to-slate-800' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                <FaUserTie className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Οδηγός Δικηγόρου Αγοραστή</h2>
                <p className="text-sm text-gray-600">Βήμα {Math.min(buyerLawyerCurrentStep, 6)} από 6</p>
              </div>
            </div>

            {[
              {
                id: 1,
                title: 'Επιβεβαίωση Βασικών Εγγράφων για Προκαταβολή',
                description: 'Δείτε τα έγγραφα στους Φακέλους Συναλλαγής· με την επιβεβαίωση δηλώνετε ότι έχετε ενημερωθεί, ώστε να προχωρήσει η υπογραφή του ιδιωτικού συμφωνητικού και η πληρωμή προκαταβολής.',
                instructions: [
                  'Ανοίξτε τους «Φακέλους Συναλλαγής» και ελέγξτε τα βασικά έγγραφα του αγοραστή (π.χ. Ταυτότητα, ΑΦΜ, Απόδειξη Εισοδήματος, Στοιχεία Τραπεζικού Λογαριασμού).',
                  'Όταν έχετε ολοκληρώσει την ενημέρωσή σας, πατήστε «Επιβεβαίωση βασικών εγγράφων» — το κλικ καταγράφει ότι τα έχετε δει/ελέγξει.',
                  'Μετά την επιβεβαίωση, ο αγοραστής θα μπορεί να προχωρήσει στην πληρωμή προκαταβολής.'
                ],
                completed: buyerLawyerStep1Completed,
              },
              {
                id: 2,
                title: 'Ολοκλήρωση Φακέλου Αγοραστή',
                description: 'Ολοκληρώστε τη συλλογή εγγράφων του πελάτη σας.',
                instructions: [
                  'Ζητήστε ή ανεβάστε τα νομιμοποιητικά έγγραφα του αγοραστή στον «Φάκελο Αγοραστή» (π.χ. Πιστοποιητικό Οικογενειακής Κατάστασης).',
                  'Μόλις ο φάκελος είναι πλήρης, πατήστε «Ολοκλήρωση Φακέλου Αγοραστή».',
                  'Με την ολοκλήρωση ξεκλειδώνεται το Βήμα 2 του δικηγόρου πωλητή («Έλεγχος & Έγκριση Φακέλου Αγοραστή»), εφόσον υπάρχει δικηγόρος πωλητή στη συναλλαγή.'
                ],
                completed: buyerLawyerStep2Completed,
              },
              {
                id: 3,
                title: 'Έλεγχος & Έγκριση Φακέλου Πωλητή (Νομικός Έλεγχος)',
                description: 'Εξετάστε τον φάκελο της άλλης πλευράς (Τίτλους & ΗΤΚ) για να διασφαλίσετε το ακίνητο.',
                instructions: [
                  'Αν δεν υπάρχει δικηγόρος πωλητή, μπορείτε άμεσα να εγκρίνετε αφού ολοκληρώσετε τον έλεγχο.',
                  'Αν υπάρχει δικηγόρος πωλητή, το κουμπί έγκρισης ενεργοποιείται αφού εκείνος ολοκληρώσει το Βήμα 1 του (ολοκλήρωση φακέλου πωλητή & ΗΤΚ).',
                  'Μεταβείτε στον «Φάκελο Πωλητή» και εξετάστε τους τίτλους· στην «ΗΤΚ» ελέγξτε τα τεχνικά έγγραφα του μηχανικού.',
                  'Εάν εντοπίσετε ελλείψεις, ζητήστε έγγραφα μέσω των Αιτημάτων.',
                  'Όταν είστε έτοιμοι, πατήστε «Έγκριση Φακέλου Πωλητή και ΗΤΚ» (ξεκλειδώνει το Βήμα 4 του δικηγόρου πωλητή).'
                ],
                completed: buyerLawyerStep3Completed,
              },
              {
                id: 4,
                title: 'Αναμονή Έγκρισης από Δικηγόρο Πωλητή',
                description: 'Αναμένετε την άλλη πλευρά να εγκρίνει τον δικό σας φάκελο.',
                instructions: [
                  'Ο δικηγόρος του πωλητή εξετάζει τώρα τον δικό σας "Φάκελο Αγοραστή".',
                  'Εάν σας ζητήσει κάτι, θα λάβετε ειδοποίηση.',
                  '(ΠΡΟΣΟΧΗ: Αυτό το βήμα μένει κλειδωμένο. Θα ολοκληρωθεί αυτόματα ΜΟΝΟ όταν ο Δικηγόρος Πωλητή πατήσει "Έγκριση" στο δικό του Βήμα 3).'
                ],
                completed: buyerLawyerStep4Completed,
              },
              {
                id: 5,
                title: 'Έλεγχος Συμβολαιογράφου',
                description: 'Οι φάκελοι εγκρίθηκαν και ελέγχονται από τον Συμβολαιογράφο.',
                instructions: [
                  'Ο Συμβολαιογράφος έχει πλέον πρόσβαση στους πλήρως εγκεκριμένους φακέλους (Αγοραστή, Πωλητή, ΗΤΚ).',
                  'Αναμένετε την "Τελική Έγκριση Συμβολαιογράφου" για τη σύνταξη του συμβολαίου.'
                ],
                completed: buyerLawyerStep5Completed,
              },
              {
                id: 6,
                title: 'Παράσταση στην Υπογραφή',
                description: 'Όλα είναι έτοιμα! Παρασταθείτε στην τελική υπογραφή.',
                instructions: [
                  'Ελέγξτε το τελικό προσχέδιο (Draft) του συμβολαίου.',
                  'Παρασταθείτε στο ραντεβού για την τελική υπογραφή.'
                ],
                completed: buyerLawyerStep6Completed,
              },
            ].map((step) => {
              const isCurrent = buyerLawyerCurrentStep === step.id;
              const step3WaitingSellerLawyer =
                step.id === 3 &&
                !step.completed &&
                isCurrent &&
                buyerLawyerStep3AwaitingSellerLawyerStep1;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    step.completed
                      ? 'border-green-300 bg-green-50'
                      : step3WaitingSellerLawyer
                      ? 'border-amber-400 bg-amber-50 shadow-md'
                      : isCurrent
                      ? (isProfessionalContext ? 'border-teal-500 bg-teal-50 shadow-lg' : 'border-indigo-500 bg-indigo-50 shadow-lg')
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      step.completed
                        ? 'bg-green-600 text-white'
                        : step3WaitingSellerLawyer
                        ? 'bg-amber-500 text-white'
                        : isCurrent
                        ? (isProfessionalContext ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white')
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step.completed ? <FaCheck /> : step.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα {step.id}: {step.title}</h3>
                        {step.completed ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 border border-green-300">
                            ΟΛΟΚΛΗΡΩΘΗΚΕ
                          </span>
                        ) : step3WaitingSellerLawyer ? (
                          <span className="inline-flex items-center rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-400">
                            ΑΝΑΜΟΝΗ ΒΗΜΑΤΟΣ 1 ΔΙΚΗΓΟΡΟΥ ΠΩΛΗΤΗ
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-300">
                            ΤΡΕΧΟΝ
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                            ΕΚΚΡΕΜΕΙ
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{step.description}</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {step.instructions.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                      {!step.completed && isCurrent && step.id === 1 && !isRent && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                          >
                            <FaFileAlt />
                            Φάκελοι Συναλλαγής
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBuyerLawyerBasicDocsModal(true)}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg ${
                              isProfessionalContext
                                ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                            }`}
                          >
                            Επιβεβαίωση βασικών εγγράφων
                          </button>
                        </div>
                      )}
                      {!step.completed && isCurrent && step.id === 2 && (
                        <button
                          onClick={() => setShowBuyerLawyerStep2ConfirmModal(true)}
                          className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg ${
                            isProfessionalContext
                              ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                          }`}
                        >
                          Ολοκλήρωση Φακέλου Αγοραστή
                        </button>
                      )}
                      {!step.completed && isCurrent && step.id === 3 && (
                        <div className="mt-4 space-y-3">
                          {buyerLawyerStep3AwaitingSellerLawyerStep1 && (
                            <div className="rounded-lg border border-amber-300 bg-amber-100/90 px-4 py-3">
                              <p className="text-sm text-amber-950">
                                Υπάρχει δικηγόρος πωλητή. Η έγκριση ενεργοποιείται όταν ολοκληρώσει το Βήμα 1 του («Ολοκλήρωση Φακέλου Πωλητή και Έλεγχος ΗΤΚ»). Μπορείτε μέχρι τότε να ελέγχετε τα έγγραφα.
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                            >
                              Δείτε έγγραφα
                            </button>
                            {buyerLawyerStep3ApproveUnlocked && (
                              <button
                                type="button"
                                onClick={() => setShowBuyerLawyerStep3ConfirmModal(true)}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg ${
                                  isProfessionalContext
                                    ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                }`}
                              >
                                Έγκριση Φακέλου Πωλητή και ΗΤΚ
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {!step.completed && isCurrent && step.id === 4 && !hasSellerLawyerInDeal && (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm text-amber-900">
                              Ο Πωλητής του ακινήτου επέλεξε να μην έχει δικηγόρο, άρα μπορείτε να προχωρήσετε άμεσα.
                            </p>
                          </div>
                          <button
                            onClick={handleBuyerLawyerStep4NoSellerLawyerComplete}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg ${
                              isProfessionalContext
                                ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                            }`}
                          >
                            Ολοκλήρωση Βήματος
                          </button>
                        </div>
                      )}
                      {!step.completed && isCurrent && step.id === 4 && hasSellerLawyerInDeal && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                          <p className="text-sm text-blue-900">
                            Για να ολοκληρωθεί αυτό το βήμα, πρέπει να εγκρίνει ο δικηγόρος του πωλητή. Παρακαλώ αναμείνατε την έγκρισή του.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardSection>
      )}

      {/* Lawyer (seller's): 5-step seller-side legal workflow */}
      {isSellersLawyer && (
        <CardSection>
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isProfessionalContext ? 'bg-gradient-to-br from-teal-600 to-slate-800' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                <FaUserTie className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Οδηγός Δικηγόρου Πωλητή</h2>
                <p className="text-sm text-gray-600">Βήμα {Math.min(sellerLawyerCurrentStep, 5)} από 5</p>
              </div>
            </div>

            {[
              {
                id: 1,
                title: 'Ολοκλήρωση Φακέλου Πωλητή & Έλεγχος ΗΤΚ',
                description: 'Προετοιμάστε τον φάκελο του πελάτη σας για τον έλεγχο.',
                instructions: [
                  'Ελέγξτε την ΗΤΚ του Μηχανικού για να βεβαιωθείτε ότι τα τετραγωνικά ταυτίζονται με το Ε9.',
                  'Εκδώστε και ανεβάστε τα απαραίτητα έγγραφα (ΕΝΦΙΑ, ΤΑΠ, Φορολογική Ενημερότητα, Τίτλους).',
                  'Μόλις ο φάκελος είναι έτοιμος, πατήστε "Ολοκλήρωση Φακέλου Πωλητή".',
                  '(Αυτό δίνει το σήμα στον δικηγόρο αγοραστή ότι μπορεί να ξεκινήσει τον Νομικό Έλεγχο).'
                ],
                completed: sellerLawyerStep2Completed,
                action: () => router.push(`/deals/${deal.id}?tab=documents`),
                actionLabel: 'Ολοκλήρωση Φακέλου Πωλητή',
              },
              {
                id: 2,
                title: 'Έλεγχος & Έγκριση Φακέλου Αγοραστή',
                description: 'Εξετάστε τον φάκελο της άλλης πλευράς (KYC) για να διασφαλίσετε τη νομιμότητα του πελάτη.',
                instructions: [
                  'Το βήμα αυτό ενεργοποιείται αφού ο δικηγόρος του αγοραστή ολοκληρώσει τον «Φάκελο Αγοραστή» (Βήμα 2 στον οδηγό του).',
                  'Μεταβείτε στον «Φάκελο Αγοραστή» και ελέγξτε τα έγγραφα που έχει ανεβάσει.',
                  'Εάν εντοπίσετε ελλείψεις, ζητήστε το αντίστοιχο έγγραφο μέσω των Αιτημάτων.',
                  'Εφόσον τα στοιχεία είναι πλήρη, πατήστε «Έγκριση Φακέλου Αγοραστή».',
                  '(ΠΡΟΣΟΧΗ: Αυτό το κλικ «ξεκλειδώνει» το Βήμα 4 του δικηγόρου αγοραστή).'
                ],
                completed: sellerLawyerStep3Completed,
                action: handleLawyerApproveSellerDocs,
                actionLabel: isLawyerApproving ? 'Επεξεργασία...' : 'Έγκριση Φακέλου Αγοραστή',
                disabled: isLawyerApproving,
              },
              {
                id: 3,
                title: 'Αναμονή Νομικού Ελέγχου από Δικηγόρο Αγοραστή',
                description: 'Αναμένετε την ολοκλήρωση του ελέγχου (Due Diligence) από την άλλη πλευρά.',
                instructions: [
                  'Ο δικηγόρος αγοραστή ελέγχει τώρα τον δικό σας "Φάκελο Πωλητή" και την ΗΤΚ.',
                  'Εάν σας ζητήσει κάτι (π.χ. νέο ΤΑΠ), θα λάβετε ειδοποίηση στα Αιτήματα.',
                  '(ΠΡΟΣΟΧΗ: Αυτό το βήμα μένει κλειδωμένο. Θα ολοκληρωθεί αυτόματα ΜΟΝΟ όταν ο Δικηγόρος Αγοραστή πατήσει "Έγκριση" στο δικό του Βήμα 3).'
                ],
                completed: sellerLawyerStep4Completed,
              },
              {
                id: 4,
                title: 'Έλεγχος Συμβολαιογράφου',
                description: 'Τα έγγραφα έχουν κλειδώσει και ελέγχονται από τον Συμβολαιογράφο.',
                instructions: [
                  'Ο Συμβολαιογράφος έχει πλέον πρόσβαση στους πλήρως εγκεκριμένους φακέλους.',
                  'Αναμένετε την "Τελική Έγκριση Συμβολαιογράφου".'
                ],
                completed: sellerLawyerStep5Completed,
              },
              {
                id: 5,
                title: 'Παράσταση στην Υπογραφή Συμβολαίων',
                description: 'Ολοκλήρωση της μεταβίβασης στο γραφείο του συμβολαιογράφου.',
                instructions: [
                  'Ελέγξτε το τελικό προσχέδιο (Draft) του συμβολαίου.',
                  'Παρασταθείτε στο ραντεβού για την τελική υπογραφή και την εξόφληση του πελάτη σας.'
                ],
                completed: sellerLawyerStep6Completed,
                action: () => router.push(`/deals/${deal.id}?tab=appointments`),
                actionLabel: 'Δείτε Υπογραφή Συμβολαίων',
              },
            ].map((step) => {
              const isActive = sellerLawyerCurrentStep === step.id;
              const isStep2AwaitingBuyerLawyer =
                step.id === 2 &&
                sellerLawyerStep2Completed &&
                !buyerLawyerStep2Completed &&
                !sellerLawyerStep3Completed;
              const step2CardHighlight =
                step.completed
                  ? 'border-green-300 bg-green-50'
                  : isStep2AwaitingBuyerLawyer
                  ? 'border-amber-400 bg-amber-50 shadow-md'
                  : isActive
                  ? (isProfessionalContext ? 'border-teal-500 bg-teal-50 shadow-lg' : 'border-indigo-500 bg-indigo-50 shadow-lg')
                  : 'border-gray-200 bg-gray-50';
              const step2CircleClass =
                step.completed
                  ? 'bg-green-600 text-white'
                  : isStep2AwaitingBuyerLawyer
                  ? 'bg-amber-500 text-white'
                  : isActive
                  ? (isProfessionalContext ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white')
                  : 'bg-gray-300 text-gray-600';
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    step.id === 2 ? step2CardHighlight : step.completed
                      ? 'border-green-300 bg-green-50'
                      : isActive
                      ? (isProfessionalContext ? 'border-teal-500 bg-teal-50 shadow-lg' : 'border-indigo-500 bg-indigo-50 shadow-lg')
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      step.id === 2 ? step2CircleClass : step.completed ? 'bg-green-600 text-white' : isActive ? (isProfessionalContext ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white') : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step.completed ? <FaCheck /> : step.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα {step.id}: {step.title}</h3>
                        {!step.completed && isActive && isStep2AwaitingBuyerLawyer && (
                          <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-400">
                            ΑΝΑΜΟΝΗ ΔΙΚΗΓΟΡΟΥ ΑΓΟΡΑΣΤΗ
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{step.description}</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                        {step.instructions.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                      {!step.completed && isActive && step.id === 2 && isStep2AwaitingBuyerLawyer && (
                        <div className="rounded-lg border border-amber-300 bg-amber-100/80 px-4 py-3 mb-3">
                          <p className="text-sm text-amber-950">
                            Ο δικηγόρος του αγοραστή δεν έχει ακόμη ολοκληρώσει τον «Φάκελο Αγοραστή» (Βήμα 2 στον οδηγό του). Μόλις το κάνει, θα μπορείτε να εγκρίνετε τον φάκελο εδώ.
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                          >
                            Δείτε έγγραφα
                          </button>
                        </div>
                      )}
                      {!step.completed && isActive && step.id === 2 && !isStep2AwaitingBuyerLawyer && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                          >
                            Δείτε έγγραφα
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSellerLawyerStep3ConfirmModal(true)}
                            disabled={isLawyerApproving}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                              isProfessionalContext
                                ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                            }`}
                          >
                            Έγκριση Φακέλου Αγοραστή
                          </button>
                        </div>
                      )}
                      {!step.completed && isActive && step.id !== 2 && step.action && (
                        <button
                          onClick={step.action}
                          disabled={(step as any).disabled}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                            isProfessionalContext
                              ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                          }`}
                        >
                          {step.actionLabel}
                        </button>
                      )}
                      {step.completed && (
                        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
                          <p className="text-green-800 font-semibold">✓ Ολοκληρώθηκε</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardSection>
      )}
      
      {/* Notary-specific: Notary Steps */}
      {isNotaryRole && (
        <CardSection>
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isProfessionalContext ? 'bg-gradient-to-br from-teal-600 to-slate-800' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
                <FaUserTie className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Βήματα Συμβολαιογράφου</h2>
                <p className="text-sm text-gray-600">
                  Ελέγξτε και εγκρίνετε τα έγγραφα. Όλα τα βήματα εμφανίζονται πάντα· τα 2 και 3 μένουν κλειδωμένα μέχρι να ολοκληρωθούν τα προηγούμενα.
                </p>
              </div>
            </div>

            {/* Notary Step 1 */}
            <div className={`rounded-xl border-2 p-6 transition-all duration-200 ${
              hasNotaryApproval
                ? 'border-green-300 bg-green-50'
                : isProfessionalContext
                ? 'border-teal-500 bg-teal-50 shadow-lg'
                : 'border-purple-500 bg-purple-50 shadow-lg'
            }`}>
              <div className="flex items-start gap-4">
                {/* Step Number */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  hasNotaryApproval
                    ? 'bg-green-600 text-white'
                    : isProfessionalContext
                    ? 'bg-teal-600 text-white'
                    : 'bg-purple-600 text-white'
                }`}>
                  {hasNotaryApproval ? <FaCheck /> : '1'}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Βήμα 1: Επιβεβαίωση Εγγράφων
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Ζητήστε από τον δικηγόρο τα απαραίτητα έγγραφα που χρειάζονται για την ολοκλήρωση της αγοραπωλησίας. Μετά τον έλεγχο, εγκρίνετε τα έγγραφα.
                  </p>
                  
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                    <li>Επικοινωνήστε με τον δικηγόρο για να ζητήσετε τα απαραίτητα έγγραφα</li>
                    <li>Ελέγξτε ότι όλα τα έγγραφα είναι εγκεκριμένα</li>
                    <li>Βεβαιωθείτε ότι όλα τα απαραίτητα έγγραφα είναι σωστά και πλήρη</li>
                    <li>Μόλις είστε σίγουροι, πατήστε "Έγκριση"</li>
                  </ul>

                  {!hasNotaryApproval && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push(`/deals/${deal.id}?tab=chat`)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Επικοινωνήστε με τον Δικηγόρο
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
                  )}
                  
                  {hasNotaryApproval && (
                    <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                      <p className="text-green-800 font-semibold">
                        ✓ Τα έγγραφα έχουν εγκριθεί. Ο αγοραστής μπορεί τώρα να προχωρήσει στο επόμενο βήμα.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notary Step 2 — πάντα ορατό· κλειδωμένο: ίδια εμφάνιση με κλειδωμένα βήματα δικηγόρου αγοραστή */}
            <div
              className={`rounded-xl border-2 p-5 transition-all ${
                !hasNotaryApproval
                  ? 'border-gray-200 bg-gray-50'
                  : confirmedSigningAppointment
                    ? 'border-green-300 bg-green-50'
                    : isProfessionalContext
                      ? 'border-teal-500 bg-teal-50 shadow-lg'
                      : 'border-purple-500 bg-purple-50 shadow-lg'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    !hasNotaryApproval
                      ? 'bg-gray-300 text-gray-600'
                      : confirmedSigningAppointment
                        ? 'bg-green-600 text-white'
                        : isProfessionalContext
                          ? 'bg-teal-600 text-white'
                          : 'bg-purple-600 text-white'
                  }`}
                >
                  {confirmedSigningAppointment ? <FaCheck /> : '2'}
                </div>

                <div className="flex-1">
                  {!hasNotaryApproval ? (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα 2: Ραντεβού Υπογραφής Συμβολαίων</h3>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                          ΕΚΚΡΕΜΕΙ
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">
                        Αυτό το βήμα ξεκλειδώνει αφού ολοκληρώσετε την έγκριση εγγράφων στο Βήμα 1.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Ολοκληρώστε πρώτα το Βήμα 1 και πατήστε «Έγκριση» για τα έγγραφα.</li>
                      </ul>
                    </>
                  ) : confirmedSigningAppointment ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Βήμα 2: Ραντεβού Υπογραφής Συμβολαίων
                      </h3>
                      <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                        <p className="text-green-800 font-semibold mb-2">
                          ✓ Το ραντεβού έχει επιβεβαιωθεί από όλες τις πλευρές.
                        </p>
                        <p className="text-green-700 text-sm">
                          {new Date(confirmedSigningAppointment.startAt).toLocaleDateString('el-GR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Βήμα 2: Ραντεβού Υπογραφής Συμβολαίων
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Δείτε τις προτάσεις ημερομηνίας από αγοραστή ή πωλητή, εγκρίνετε ή απορρίψτε και ορίστε τις διαθέσιμες ώρες σας για την υπογραφή στο γραφείο σας.
                      </p>

                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                        <li>Προσθήκη διαθεσίμων ωρών για την υπογραφή</li>
                        <li>Έγκριση ή απόρριψη προτεινόμενων ημερομηνιών</li>
                      </ul>

                      <button
                        onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
                        className={`inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                          isProfessionalContext
                            ? 'bg-gradient-to-r from-teal-600 to-slate-800 hover:from-teal-700 hover:to-slate-900'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                        }`}
                      >
                        Δείτε Ραντεβού
                        <FaArrowRight />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notary Step 3 — κλειδωμένα: ίδια εμφάνιση με κλειδωμένα βήματα δικηγόρου αγοραστή */}
            <div
              className={`rounded-xl border-2 p-5 transition-all ${
                !hasNotaryApproval
                  ? 'border-gray-200 bg-gray-50'
                  : isPurchaseCompletedByBothSides
                    ? 'border-green-300 bg-green-50'
                    : confirmedSigningAppointment
                      ? isProfessionalContext
                        ? 'border-teal-500 bg-teal-50 shadow-lg'
                        : 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    isPurchaseCompletedByBothSides
                      ? 'bg-green-600 text-white'
                      : !hasNotaryApproval || !confirmedSigningAppointment
                        ? 'bg-gray-300 text-gray-600'
                        : isProfessionalContext
                          ? 'bg-teal-600 text-white'
                          : 'bg-purple-600 text-white'
                  }`}
                >
                  {isPurchaseCompletedByBothSides ? <FaCheck /> : '3'}
                </div>

                <div className="flex-1">
                  {!hasNotaryApproval ? (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα 3: Ολοκλήρωση Αγοραπωλησίας</h3>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                          ΕΚΚΡΕΜΕΙ
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">
                        Αυτό το βήμα ξεκλειδώνει αφού ολοκληρώσετε το Βήμα 1 (έγκριση εγγράφων) και στη συνέχεια επιβεβαιωθεί ραντεβού υπογραφής (Βήμα 2).
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Πρώτα ολοκληρώστε το Βήμα 1 και μετά το Βήμα 2.</li>
                      </ul>
                    </>
                  ) : !confirmedSigningAppointment ? (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Βήμα 3: Ολοκλήρωση Αγοραπωλησίας</h3>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300">
                          ΕΚΚΡΕΜΕΙ
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">
                        Το βήμα θα ενεργοποιηθεί μόλις επιβεβαιωθεί ραντεβού υπογραφής (Βήμα 2).
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Ολοκληρώστε τον καθορισμό / επιβεβαίωση του ραντεβού υπογραφής στο Βήμα 2.</li>
                      </ul>
                    </>
                  ) : isPurchaseCompletedByBothSides ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Βήμα 3: Ολοκλήρωση Αγοραπωλησίας
                      </h3>
                      <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                        <p className="text-green-800 font-semibold">
                          ✓ Η αγοραπωλησία ολοκληρώθηκε. Αγοραστής και πωλητής επιβεβαίωσαν επιτυχώς από το τελικό βήμα τους.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Βήμα 3: Ολοκλήρωση Αγοραπωλησίας
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Για να ολοκληρωθεί η αγοραπωλησία, πρέπει να γίνει επιβεβαίωση και από τις δύο πλευρές (αγοραστής και πωλητής) από το τελευταίο βήμα του καθενός.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          className={`rounded-lg border p-3 ${
                            hasBuyerPurchaseConfirmation
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-900">Αγοραστής</p>
                          <p
                            className={`text-xs mt-1 ${
                              hasBuyerPurchaseConfirmation ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {hasBuyerPurchaseConfirmation ? '✓ Επιβεβαιώθηκε' : 'Σε αναμονή επιβεβαίωσης'}
                          </p>
                        </div>

                        <div
                          className={`rounded-lg border p-3 ${
                            hasSellerPurchaseConfirmation
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-900">Πωλητής</p>
                          <p
                            className={`text-xs mt-1 ${
                              hasSellerPurchaseConfirmation ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {hasSellerPurchaseConfirmation ? '✓ Επιβεβαιώθηκε' : 'Σε αναμονή επιβεβαίωσης'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          Ο συμβολαιογράφος δεν χρειάζεται επιπλέον ενέργεια στο Βήμα 3. Η ολοκλήρωση γίνεται αυτόματα μόλις επιβεβαιώσουν και οι δύο πλευρές.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardSection>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Ορισμός Διαθέσιμων Ωρών</h3>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {availableSlots.map((slot, index) => (
                <div key={index} className="flex gap-3 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ημερομηνία</label>
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => {
                        const newSlots = [...availableSlots];
                        newSlots[index].date = e.target.value;
                        setAvailableSlots(newSlots);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ώρα Έναρξης</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const newSlots = [...availableSlots];
                        newSlots[index].startTime = e.target.value;
                        setAvailableSlots(newSlots);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ώρα Λήξης</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const newSlots = [...availableSlots];
                        newSlots[index].endTime = e.target.value;
                        setAvailableSlots(newSlots);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newSlots = availableSlots.filter((_, i) => i !== index);
                      setAvailableSlots(newSlots);
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  setAvailableSlots([...availableSlots, { date: '', startTime: '', endTime: '' }]);
                }}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
              >
                + Προσθήκη Ώρας
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ακύρωση
              </button>
              <button
                onClick={async () => {
                  setIsSavingAvailability(true);
                  try {
                    const response = await fetchFromBackend(`/deals/${deal.id}/notary/availability`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ availableSlots }),
                    });

                    if (!response.ok) {
                      const error = await response.json().catch(() => ({ error: 'Failed to save availability' }));
                      throw new Error(error.error || 'Failed to save availability');
                    }

                    toast.success('Οι διαθέσιμες ώρες αποθηκεύτηκαν επιτυχώς.');
                    setShowAvailabilityModal(false);
                    onRefresh();
                  } catch (error: any) {
                    toast.error(error.message || 'Σφάλμα κατά την αποθήκευση');
                  } finally {
                    setIsSavingAvailability(false);
                  }
                }}
                disabled={isSavingAvailability || availableSlots.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingAvailability ? 'Αποθηκεύεται...' : 'Αποθήκευση'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyerLawyerBasicDocsModal && isBuyersLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Επιβεβαίωση βασικών εγγράφων</h3>
              <button
                type="button"
                onClick={() => !isBuyerLawyerBasicDocsApproving && setShowBuyerLawyerBasicDocsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Κλείσιμο"
              >
                ×
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 text-xl mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-800">
                  Με την επιβεβαίωση δηλώνετε ότι έχετε ενημερωθεί για τα βασικά έγγραφα (π.χ. μέσα από τους Φακέλους Συναλλαγής). Ο αγοραστής θα μπορεί να προχωρήσει στην πληρωμή προκαταβολής και το Βήμα 1 του οδηγού σας θα ολοκληρωθεί.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBuyerLawyerBasicDocsModal(false)}
                disabled={isBuyerLawyerBasicDocsApproving}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsBuyerLawyerBasicDocsApproving(true);
                  try {
                    const response = await fetchFromBackend(`/deals/${deal.id}/lawyer/approve-basic-documents`, {
                      method: 'POST',
                    });
                    if (!response.ok) {
                      const error = await response.json().catch(() => ({ error: 'Αποτυχία επιβεβαίωσης' }));
                      throw new Error(error.error || 'Αποτυχία επιβεβαίωσης');
                    }
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem(`basicDocsApproved_${deal.id}`, 'true');
                    }
                    toast.success(
                      'Η επιβεβαίωση καταχωρήθηκε. Ο αγοραστής μπορεί πλέον να πληρώσει την προκαταβολή (Βήμα 5).'
                    );
                    setShowBuyerLawyerBasicDocsModal(false);
                    onRefresh();
                  } catch (e: any) {
                    toast.error(e.message || 'Σφάλμα κατά την επιβεβαίωση');
                  } finally {
                    setIsBuyerLawyerBasicDocsApproving(false);
                  }
                }}
                disabled={isBuyerLawyerBasicDocsApproving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isBuyerLawyerBasicDocsApproving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Επιβεβαίωση...
                  </>
                ) : (
                  'Ναι, επιβεβαιώνω'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyerLawyerStep2ConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FaInfoCircle className="text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Επιβεβαίωση ολοκλήρωσης φακέλου</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Έχετε ολοκληρώσει τον φάκελο του αγοραστή; Με την επιβεβαίωση, το Βήμα 2 σας ολοκληρώνεται και, αν υπάρχει δικηγόρος πωλητή, ξεκλειδώνεται το δικό του Βήμα 2 «Έλεγχος & Έγκριση Φακέλου Αγοραστή».
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyerLawyerStep2ConfirmModal(false)}
                disabled={isBuyerLawyerStep2Completing}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                Άκυρο
              </button>
              <button
                onClick={handleBuyerLawyerStep2Complete}
                disabled={isBuyerLawyerStep2Completing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60"
              >
                {isBuyerLawyerStep2Completing ? 'Επιβεβαίωση...' : 'Επιβεβαίωση'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBuyerLawyerStep3ConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FaInfoCircle className="text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Επιβεβαίωση έγκρισης φακέλου πωλητή</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Είστε σίγουρος ότι θέλετε να εγκρίνετε τον φάκελο του πωλητή και την ΗΤΚ; Μετά την επιβεβαίωση, οι φάκελοι προχωρούν για έλεγχο από τον συμβολαιογράφο.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyerLawyerStep3ConfirmModal(false)}
                disabled={isBuyerLawyerStep3Approving}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                Άκυρο
              </button>
              <button
                onClick={handleBuyerLawyerStep3ApproveSellerFolder}
                disabled={isBuyerLawyerStep3Approving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60"
              >
                {isBuyerLawyerStep3Approving ? 'Επιβεβαίωση...' : 'Επιβεβαίωση'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSellerLawyerStep3ConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FaInfoCircle className="text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Επιβεβαίωση έγκρισης φακέλου αγοραστή</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Είστε σίγουρος ότι θέλετε να εγκρίνετε τον φάκελο του αγοραστή; Μετά την επιβεβαίωση, ο φάκελος θα προχωρήσει για έλεγχο από τον συμβολαιογράφο.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSellerLawyerStep3ConfirmModal(false)}
                disabled={isLawyerApproving}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                Άκυρο
              </button>
              <button
                onClick={async () => {
                  await handleLawyerApproveSellerDocs();
                  setShowSellerLawyerStep3ConfirmModal(false);
                }}
                disabled={isLawyerApproving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60"
              >
                {isLawyerApproving ? 'Επιβεβαίωση...' : 'Επιβεβαίωση'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Seller-specific: Quick Actions */}
      {isSellerRole && (
        <>
          {/* Quick Actions Card - Only show if there are pending actions */}
          {(totalPendingAppointments > 0 || pendingDocumentsFromSeller > 0 || pendingDocumentsFromBuyer > 0 || uploadedDocuments > 0) && (
            <CardSection>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Γρήγορες Ενέργειες</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Appointments */}
                {totalPendingAppointments > 0 && (
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
                    className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 hover:border-yellow-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaCalendarAlt className="text-yellow-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700">Εκκρεμή Ραντεβού</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalPendingAppointments}</p>
                    <p className="text-xs text-gray-600 mt-1">Πρέπει να εγκρίνετε</p>
                  </button>
                )}

                {/* Confirmed Appointments */}
                {totalConfirmedAppointments > 0 && (
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 hover:border-green-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaCheckCircle className="text-green-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700">Επιβεβαιωμένα Ραντεβού</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalConfirmedAppointments}</p>
                    <p className="text-xs text-gray-600 mt-1">Προγραμματισμένα</p>
                  </button>
                )}

                {/* Documents Requested from Seller */}
                {pendingDocumentsFromSeller > 0 && (
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                    className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaFileAlt className="text-blue-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700">Έγγραφα που Ζητήθηκαν</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{pendingDocumentsFromSeller}</p>
                    <p className="text-xs text-gray-600 mt-1">Πρέπει να ανεβάσετε</p>
                  </button>
                )}

                {/* Documents Requested from Buyer (Seller needs to review) */}
                {pendingDocumentsFromBuyer > 0 && (
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                    className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border-2 border-purple-300 hover:border-purple-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaFileAlt className="text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700">Έγγραφα για Έλεγχο</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{pendingDocumentsFromBuyer}</p>
                    <p className="text-xs text-gray-600 mt-1">Από τον αγοραστή</p>
                  </button>
                )}

                {/* Uploaded Documents */}
                {uploadedDocuments > 0 && (
                  <button
                    onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                    className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-300 hover:border-teal-400 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaFileAlt className="text-teal-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700">Ανεβασμένα Έγγραφα</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{uploadedDocuments}</p>
                    <p className="text-xs text-gray-600 mt-1">Σε αναμονή ελέγχου</p>
                  </button>
                )}
              </div>
            </CardSection>
          )}

          {/* Seller-specific header */}
          <CardSection>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <FaUsers className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Στοιχεία Αγοραστή</h2>
                <p className="text-sm text-gray-600">{buyer?.user.name || 'N/A'}</p>
              </div>
            </div>
          </CardSection>
        </>
      )}

      {/* Key Status Cards - Compact Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isAgentRole ? 'mt-2' : ''}`}>
        {/* Participants */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=overview`)}
          className={`rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left group ${
            isAgentRole
              ? 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-300'
              : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:border-blue-300'
          }`}
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

        {/* Professionals - seller sees all in deal; others see lawyer+notary */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=professionals`)}
          className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl shadow-sm border border-purple-200 p-5 hover:shadow-md hover:border-purple-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Επαγγελματίες</p>
              <p className="text-xl font-bold text-gray-900">
                {professionalsCount}
              </p>
              {pendingRequests > 0 && (
                <p className="text-xs text-orange-600 mt-0.5">{pendingRequests} σε αναμονή</p>
              )}
              {professionalsCount === 0 && (
                <p className="text-xs text-gray-500 mt-0.5">Κανένας</p>
              )}
            </div>
            <div className="flex gap-1.5">
              {professionalsCount > 0 ? (
                <>
                  <FaUserTie className="text-xl text-indigo-600 group-hover:scale-110 transition-transform" />
                  <FaHandshake className="text-xl text-teal-600 group-hover:scale-110 transition-transform" />
                </>
              ) : (
                <>
                  <FaUserTie className="text-xl text-gray-300" />
                  <FaHandshake className="text-xl text-gray-300" />
                </>
              )}
            </div>
          </div>
        </button>

        {/* Documents — συνολικά ανά υπο-φάκελο όπως στο tab Έγγραφα */}
        <button
          onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
          className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl shadow-sm border border-green-200 p-5 hover:shadow-md hover:border-green-300 transition-all text-left group min-h-[120px]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Έγγραφα</p>
              {documentsSubfolderStats.length === 0 ? (
                <p className="text-lg font-bold text-gray-900">0</p>
              ) : (
                <ul className="space-y-1.5">
                  {documentsSubfolderStats.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-baseline justify-between gap-2 text-[11px] leading-snug"
                    >
                      <span className="text-gray-600 truncate text-left" title={row.label}>
                        {row.label}
                      </span>
                      <span className="font-bold text-gray-900 tabular-nums shrink-0">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <FaFileAlt className="text-2xl text-green-600 group-hover:scale-110 transition-transform shrink-0 mt-0.5" />
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
                const d = upcomingAppointment.startAt instanceof Date ? upcomingAppointment.startAt : new Date(upcomingAppointment.startAt);
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

      {/* Enhanced Status Section */}
      <CardSection>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
            <FaInfoCircle className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Κατάσταση Συναλλαγής</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Status Badge */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
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
                    <p className="font-bold text-gray-900">{(isBuyerRole || isProfessionalContext) ? 'Ενεργή' : 'Προσχέδιο'}</p>
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
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
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

        {/* Timeline */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">Συναλλαγή δημιουργήθηκε</p>
              <p className="text-xs text-gray-500">
                {new Date(deal.createdAt).toLocaleDateString('el-GR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {deal.status === 'ACTIVE' && (
            <div className="flex items-center gap-3">
              <FaClock className="text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Συναλλαγή ενεργή</p>
                <p className="text-xs text-gray-500">Σε εξέλιξη - Τελευταία ενημέρωση: {
                  new Date(deal.updatedAt).toLocaleDateString('el-GR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }</p>
              </div>
            </div>
          )}

          {deal.status === 'CLOSED' && (
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Συναλλαγή ολοκληρώθηκε</p>
                <p className="text-xs text-gray-500">
                  {new Date(deal.updatedAt).toLocaleDateString('el-GR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardSection>

      {/* Recent Activity */}
      {sseEvents && sseEvents.length > 0 && (
        <CardSection>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FaClock className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Πρόσφατη Δραστηριότητα</h2>
          </div>
          
          <div className="space-y-3">
            {sseEvents.slice(0, 5).map((event: any, index: number) => {
              const getEventIcon = () => {
                switch (event.type) {
                  case 'message_sent':
                    return <FaUsers className="text-blue-500" />;
                  case 'document_uploaded':
                    return <FaFileAlt className="text-green-500" />;
                  case 'document_requested':
                    return <FaFileAlt className="text-yellow-500" />;
                  case 'notary_availability_set':
                    return <FaCalendarAlt className="text-teal-500" />;
                  case 'appointment_requested':
                  case 'appointment_confirmed':
                    return <FaCalendarAlt className="text-indigo-500" />;
                  case 'professional_requested':
                  case 'professional_accepted':
                    return <FaUserTie className="text-purple-500" />;
                  default:
                    return <FaInfoCircle className="text-gray-500" />;
                }
              };

              const getEventMessage = () => {
                const requestedItemName =
                  event.metadata?.category ||
                  event.data?.documentCategory ||
                  event.data?.documentName ||
                  event.metadata?.fileName ||
                  '';

                const isActionRequest = /action|ενεργ/i.test(String(requestedItemName || ''));

                switch (event.type) {
                  case 'message_sent':
                    return `Νέο μήνυμα από ${event.data?.senderName || 'χρήστη'}`;
                  case 'document_uploaded':
                    return `Ανέβηκε έγγραφο: ${event.metadata?.fileName || event.data?.documentName || 'N/A'}`;
                  case 'document_requested':
                    return isActionRequest
                      ? `Ζητήθηκε ενέργεια: ${requestedItemName || 'N/A'}`
                      : `Ζητήθηκε έγγραφο: ${requestedItemName || 'N/A'}`;
                  case 'notary_availability_set':
                    return 'Προσαρμόστηκαν οι διαθέσιμες ημερομηνίες για ραντεβού';
                  case 'appointment_requested':
                    return 'Νέο αίτημα ραντεβού';
                  case 'appointment_confirmed':
                    return 'Ραντεβού επιβεβαιώθηκε';
                  case 'appointment_rejected':
                  case 'appointment_seller_rejected':
                    return 'Απορρίφθηκε πρόταση ραντεβού';
                  case 'appointment_cancelled':
                  case 'appointment_seller_cancelled':
                    return 'Ακυρώθηκε ραντεβού';
                  case 'appointment_seller_approved':
                    return 'Εγκρίθηκε πρόταση ραντεβού υπογραφής';
                  case 'professional_requested':
                    return `Αίτημα για ${event.data?.professionalType === 'LAWYER' ? 'δικηγόρο' : 'συμβολαιογράφο'}`;
                  case 'professional_accepted':
                    return `Επιβεβαιώθηκε ${event.data?.professionalType === 'LAWYER' ? 'δικηγόρος' : 'συμβολαιογράφος'}`;
                  case 'professional_declined':
                    return 'Απορρίφθηκε αίτημα επαγγελματία';
                  default:
                    return event.summary || 'Νέα δραστηριότητα';
                }
              };

              const eventTime = event.timestamp || event.createdAt || new Date().toISOString();
              const timeAgo = new Date(eventTime).toLocaleString('el-GR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="mt-0.5">{getEventIcon()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{getEventMessage()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
            
            {sseEvents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Δεν υπάρχει πρόσφατη δραστηριότητα</p>
            )}
          </div>
        </CardSection>
      )}
    </div>
  );
}


