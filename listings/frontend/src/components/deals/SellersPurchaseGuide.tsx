'use client';

import { useState, useEffect, useCallback } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { FaCheckCircle, FaLock, FaCircle, FaCalendarAlt, FaUserTie, FaHandshake, FaFileAlt, FaGavel, FaPenFancy, FaExclamationTriangle, FaInfoCircle, FaArrowRight, FaEuroSign, FaClock } from 'react-icons/fa';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { apiClient, fetchFromBackend } from '@/lib/api/client';
import CardSection from './ui/CardSection';
import OfferPriceSlider from './ui/OfferPriceSlider';
import SellerSigningAppointmentModal from './SellerSigningAppointmentModal';
import { toast } from 'react-hot-toast';

interface SellersPurchaseGuideProps {
  deal: DealRoom;
  sseEvents?: any[];
  /** When true, shows compact layout for left sidebar. When false, shows full layout for Overview tab. */
  compact?: boolean;
  /** When true, renders only the content without CardSection (for use inside collapsible parent) */
  embedded?: boolean;
  /** Callback to refresh deal data (e.g. after submitting counter-offer) */
  onRefresh?: () => void;
}

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SELLER_APPROVAL';
  date?: string;
  time?: string;
  endTime?: string;
  startAt?: string;
}

export function OfferModalContent({
  deal,
  counterAmount,
  setCounterAmount,
  counterMessage,
  setCounterMessage,
  isSubmittingOffer,
  setIsSubmittingOffer,
  onClose,
  onSuccess,
  onRefresh,
}: {
  deal: DealRoom;
  counterAmount: string;
  setCounterAmount: (v: string) => void;
  counterMessage: string;
  setCounterMessage: (v: string) => void;
  isSubmittingOffer: boolean;
  setIsSubmittingOffer: (v: boolean) => void;
  onClose: () => void;
  onSuccess: () => void;
  onRefresh?: () => void;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showCounterOfferSection, setShowCounterOfferSection] = useState(false);

  useEffect(() => {
    if (showCounterOfferSection && !counterAmount && deal.property?.price) {
      setCounterAmount(String(Math.round(Number(deal.property.price))));
    }
  }, [showCounterOfferSection, deal.property?.price]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptOffer = async (offerId: string) => {
    setIsAccepting(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η προσφορά έγινε αποδεκτή');
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Σφάλμα');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setIsRejecting(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα');
      }
      toast.success('Η προσφορά απορρίφθηκε');
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Σφάλμα');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(counterAmount);
    if (!amount || amount <= 0) {
      toast.error('Εισάγετε έγκυρο ποσό');
      return;
    }
    setIsSubmittingOffer(true);
    try {
      const response = await fetchFromBackend(`/deals/${deal.id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          message: counterMessage || undefined,
          role: 'SELLER',
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Σφάλμα κατά την αποστολή');
      }
      toast.success('Η αντιπρόταση στάλθηκε επιτυχώς');
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Σφάλμα κατά την αποστολή');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Latest offer in the chain (buyer original → seller counter → buyer counter → …) – what to display
  const latestOffer = deal.offers?.length
    ? [...deal.offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : undefined;
  const pendingBuyerOffer = deal.offers?.find(o => o.role === 'BUYER' && o.status === 'PENDING');
  const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
  const listingPrice = deal.property?.price ? Math.round(Number(deal.property.price)) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto p-0 overflow-x-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <FaEuroSign className="text-white text-base" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Προσφορά & Αντιπρόταση</h3>
              <p className="text-blue-100 text-sm">Δείτε την προσφορά και στείλτε αντιπρόταση</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Τιμή αγγελίας */}
          {deal.property?.price && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-sm font-medium text-gray-600">Τιμή αγγελίας</span>
              <span className="text-lg font-bold text-gray-900">€{Number(deal.property.price).toLocaleString('el-GR')}</span>
            </div>
          )}

          {/* Τελευταία προσφορά/αντιπρόταση στην αλυσίδα */}
          {!latestOffer ? (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-amber-800 font-medium">Ο αγοραστής δεν έχει στείλει ακόμα προσφορά.</p>
              <p className="text-sm text-amber-700 mt-1">Μπορείτε να στείλετε τη δική σας πρόταση που θα δει ο αγοραστής.</p>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border ${
              latestOffer.role === 'BUYER' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <p className={`text-xs mb-1 font-medium ${
                latestOffer.role === 'BUYER' ? 'text-blue-700' : 'text-emerald-700'
              }`}>
                {latestOffer.role === 'BUYER'
                  ? (deal.offers?.filter(o => o.role === 'BUYER').length ?? 0) > 1
                    ? 'Νέα προσφορά αγοραστή'
                    : 'Προσφορά αγοραστή'
                  : 'Η αντιπρότασή σας'}
              </p>
              <p className={`text-xl font-bold ${latestOffer.role === 'BUYER' ? 'text-blue-900' : 'text-emerald-900'}`}>
                €{(typeof latestOffer.amount === 'string' ? parseFloat(latestOffer.amount) : latestOffer.amount).toLocaleString('el-GR')}
              </p>
              {latestOffer.user?.name && latestOffer.role === 'BUYER' && (
                <p className="text-sm text-blue-700 mt-1">από {latestOffer.user.name}</p>
              )}
              {latestOffer.message && (
                <p className={`text-sm mt-2 p-2 bg-white rounded border ${
                  latestOffer.role === 'BUYER' ? 'text-blue-800 border-blue-100' : 'text-emerald-800 border-emerald-100'
                }`}>{latestOffer.message}</p>
              )}
              <p className={`text-xs mt-2 ${latestOffer.role === 'BUYER' ? 'text-blue-600' : 'text-emerald-600'}`}>
                {new Date(latestOffer.createdAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {latestOffer.role === 'BUYER' && pendingBuyerOffer && latestOffer.id === pendingBuyerOffer.id && !hasAcceptedOffer && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAcceptOffer(latestOffer.id)}
                    disabled={isAccepting || isRejecting}
                    className="flex-1 px-3 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAccepting ? <span className="animate-spin">⏳</span> : <FaCheckCircle />}
                    Αποδοχή
                  </button>
                  <button
                    onClick={() => handleRejectOffer(latestOffer.id)}
                    disabled={isAccepting || isRejecting}
                    className="flex-1 px-3 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRejecting ? <span className="animate-spin">⏳</span> : <FaExclamationTriangle />}
                    Απόρριψη
                  </button>
                </div>
              )}
              {latestOffer.role === 'SELLER' && !hasAcceptedOffer && (
                <p className="text-sm text-emerald-700 mt-2">Αναμονή απάντησης του αγοραστή</p>
              )}
              {hasAcceptedOffer && (
                <p className="text-sm text-emerald-700 font-medium mt-2">✓ Η τιμή έχει συμφωνηθεί</p>
              )}
            </div>
          )}

          {/* Κουμπί Αντιπρόταση / Slider section */}
          {!hasAcceptedOffer && (
            <>
              {!showCounterOfferSection ? (
                <button
                  onClick={() => setShowCounterOfferSection(true)}
                  className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <FaHandshake /> Αντιπρόταση
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-3 text-center">
                      Σύρετε για να επιλέξετε ποσό. Πράσινο = καλύτερη πιθανότητα αποδοχής από τον αγοραστή. Κόκκινο = λιγότερο πιθανό.
                    </p>
                    {listingPrice > 0 ? (
                      <OfferPriceSlider
                        listingPrice={listingPrice}
                        value={counterAmount ? parseFloat(counterAmount) : listingPrice}
                        onChange={(v) => setCounterAmount(String(Math.round(v)))}
                        disabled={isSubmittingOffer}
                        variant="seller"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={counterAmount}
                        onChange={(e) => setCounterAmount(e.target.value)}
                        placeholder="π.χ. 150000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Σχόλια (προαιρετικό)</label>
                    <textarea
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      placeholder="Προσθήκετε σχόλια για την αντιπρότασή σας..."
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCounterOfferSection(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Πίσω
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmittingOffer || !counterAmount}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isSubmittingOffer ? <><span className="animate-spin">⏳</span> Αποστολή...</> : <><FaHandshake /> Στείλτε Αντιπρόταση</>}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {hasAcceptedOffer && (
            (() => {
              const acceptedOffer = deal.offers?.find(o => o.status === 'ACCEPTED');
              const buyerAcceptedSeller = acceptedOffer?.role === 'SELLER';
              return (
                <div className="space-y-4">
                  {buyerAcceptedSeller ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                      <FaCheckCircle className="text-emerald-500 text-4xl mx-auto mb-3" />
                      <p className="text-sm text-emerald-800 font-medium mb-1">Ο αγοραστής αποδέχτηκε την αντιπρότασή σας</p>
                      <p className="text-2xl font-bold text-gray-900">
                        €{acceptedOffer ? Number(acceptedOffer.amount).toLocaleString('el-GR') : '—'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                      <FaCheckCircle className="text-emerald-500 text-4xl mx-auto mb-3" />
                      <p className="text-sm text-emerald-800 font-medium mb-1">Η τιμή έχει συμφωνηθεί</p>
                      <p className="text-2xl font-bold text-gray-900">
                        €{acceptedOffer ? Number(acceptedOffer.amount).toLocaleString('el-GR') : '—'}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      onRefresh?.();
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    Συνέχεια
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SellersPurchaseGuide - 7-step guide for sellers
 * 
 * Steps:
 * 1. Διαχείριση αιτήματος επισκεψής
 * 2. Αποδοχή προσφοράς (placeholder - not implemented yet)
 * 3. Επιλογή δικηγόρου και συμβολαιογράφου
 * 4. Συλλογή εγγράφων και ενέργειες
 * 5. Αναμονή έγκρισης συμβολαιογράφου
 * 6. Υπογραφή συμβολαίων
 * 7. Επιβεβαίωση ολοκλήρωσης
 */
const SELLER_SKIP_LAWYER_KEY = (dealId: string) => `deal-${dealId}-seller-skipped-lawyer`;

export default function SellersPurchaseGuide({ deal, sseEvents = [], compact = false, embedded = false, onRefresh }: SellersPurchaseGuideProps) {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId || userId;
  const [propertyAppointments, setPropertyAppointments] = useState<ViewingRequest[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showSigningAppointmentModal, setShowSigningAppointmentModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [sellerSkippedLawyer, setSellerSkippedLawyer] = useState(false);
  const [isCancellingAppointment, setIsCancellingAppointment] = useState(false);

  // Load seller skipped lawyer from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSellerSkippedLawyer(localStorage.getItem(SELLER_SKIP_LAWYER_KEY(deal.id)) === 'true');
    }
  }, [deal.id]);

  // Fetch property appointments (viewing requests)
  useEffect(() => {
    if (!deal.propertyId || !deal.buyerId) return;

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

    const handleAppointmentsUpdated = (event: CustomEvent) => {
      if (event.detail?.propertyId === deal.propertyId) {
        fetchPropertyAppointments();
      }
    };
    window.addEventListener('appointmentsUpdated', handleAppointmentsUpdated as EventListener);

    const interval = setInterval(fetchPropertyAppointments, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('appointmentsUpdated', handleAppointmentsUpdated as EventListener);
    };
  }, [deal.propertyId, deal.buyerId, deal.updatedAt]);

  // Step 1: Viewing appointment completed?
  // - Auto-complete if buyer chose "continue without appointment" (buyer has lawyer = interest confirmed)
  // - Complete when confirmed appointment has passed
  // - Re-current if buyer chose "reschedule" (new pending request exists)
  const isViewingPast = (a: ViewingRequest): boolean => {
    const d = new Date(a.date || 0);
    if (a.time) {
      const [h, m] = a.time.split(':').map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
    }
    return d < new Date();
  };

  const isStep1Completed = (): boolean => {
    // ΠΡΩΤΑ: Αν ο αγοραστής ολοκλήρωσε το βήμα 1 (skip ή confirm interest), το βήμα του πωλητή ολοκληρώνεται
    if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) {
      return true;
    }
    // Fallback: αγοραστής έχει δικηγόρο + αποδεκτή προσφορά = πέρασε το βήμα 1
    const hasLawyer = deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
    const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
    if (hasLawyer && hasAcceptedOffer) return true;

    const hasPendingRequest = propertyAppointments?.some(
      a => a.status === 'PENDING' || a.status === 'PENDING_SELLER_APPROVAL'
    ) || deal.appointments?.some(a => a.status === 'REQUESTED');
    
    if (hasPendingRequest) return false; // Seller needs to act

    // Buyer chose continue without appointment? (has lawyer = passed step 2) - fallback
    const buyerHasConfirmedInterest = hasLawyer;
    if (buyerHasConfirmedInterest && !propertyAppointments?.some(a => a.status === 'ACCEPTED')) {
      return true; // Buyer went direct, no appointment needed
    }

    // Past confirmed viewing (ViewingRequest uses date+time)
    const hasPastConfirmedViewing = propertyAppointments?.some(
      a => a.status === 'ACCEPTED' && isViewingPast(a)
    );
    const hasPastDealAppointment = deal.appointments?.some(
      a => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
    );
    return !!(hasPastConfirmedViewing || hasPastDealAppointment);
  };

  // Step 2: Offer accepted? (buyer accepted seller's offer OR seller accepted buyer's)
  const isStep2Completed = (): boolean => {
    return deal.offers?.some(o => o.status === 'ACCEPTED') || false;
  };

  // Step 3: Lawyer AND engineer selected by SELLER (both required), OR engineer by seller + skip lawyer
  // Only count requests made BY the seller (requestedById === sellerId)
  const hasLawyer = sellerId && deal.requests?.some(r =>
    r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
  );
  const hasEngineer = sellerId && deal.requests?.some(r =>
    r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerId
  );
  const isStep3Completed = (): boolean => !!(hasLawyer && hasEngineer) || !!(hasEngineer && sellerSkippedLawyer);

  const handleSkipLawyer = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELLER_SKIP_LAWYER_KEY(deal.id), 'true');
      setSellerSkippedLawyer(true);
      toast.success('Προχωρήσατε χωρίς δικηγόρο. Μπορείτε να επιλέξετε δικηγόρο αργότερα από το tab Επαγγελματίες.');
      onRefresh?.();
    }
  }, [deal.id, onRefresh]);

  // Step 4: Same completion rule as buyer's step 6 (legal process sync)
  // - If seller lawyer exists: complete when both buyer-lawyer step 4 and seller-lawyer step 4 are done
  // - If seller lawyer does not exist: complete when buyer-lawyer step 4 is done
  const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt ||
    sseEvents?.some((e: any) => e.type === 'notary_approved_documents') ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');

  const isStep4Completed = (): boolean => {
    const hasSellerLawyer = !!hasLawyer;
    const buyerLawyerStep4FromSSE = sseEvents?.some((e: any) => e.type === 'lawyer_approved_buyer_progress') || false;
    const buyerLawyerStep4FromStorage =
      typeof window !== 'undefined' && (
        sessionStorage.getItem(`sellerLawyerApprovedBuyerFolder_${deal.id}`) === 'true' ||
        sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true'
      );
    const buyerLawyerStep4NoSellerLawyerFromStorage =
      typeof window !== 'undefined' && sessionStorage.getItem(`buyerLawyerStep4NoSellerLawyer_${deal.id}`) === 'true';

    const buyerLawyerStep4Completed = hasSellerLawyer
      ? (buyerLawyerStep4FromSSE || buyerLawyerStep4FromStorage)
      : (buyerLawyerStep4FromSSE || buyerLawyerStep4FromStorage || buyerLawyerStep4NoSellerLawyerFromStorage);

    const sellerLawyerStep4Completed = !hasSellerLawyer
      ? true
      : (
          !!deal.lawyerApprovedSellerDocumentsAt ||
          sseEvents?.some((e: any) => e.type === 'lawyer_approved_seller_documents') ||
          (typeof window !== 'undefined' && sessionStorage.getItem(`lawyerApprovedSellerDocuments_${deal.id}`) === 'true')
        );

    return !!(buyerLawyerStep4Completed && sellerLawyerStep4Completed);
  };

  // Step 5: Notary approved all documents
  const isStep5Completed = (): boolean => !!hasNotaryApproval;

  // Step 6: Signing appointment confirmed and passed
  const signingApt = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
  const isStep6Completed = (): boolean => {
    if (!signingApt) return false;
    return new Date(signingApt.endAt) <= new Date();
  };

  // Step 7: Signing confirmed
  const isStep7Completed = (): boolean => deal.sellerSigningConfirmed || deal.status === 'CLOSED' || false;

  const getCurrentStep = (): number => {
    if (!isStep1Completed()) return 1;
    if (!isStep2Completed()) return 2;
    if (!isStep3Completed()) return 3;
    if (!isStep4Completed()) return 4;
    if (!isStep5Completed()) return 5;
    if (!isStep6Completed()) return 6;
    if (!isStep7Completed()) return 7;
    return 8; // All done
  };

  const currentStep = getCurrentStep();
  const stepStatus = {
    step1: isStep1Completed(),
    step2: isStep2Completed(),
    step3: isStep3Completed(),
    step4: isStep4Completed(),
    step5: isStep5Completed(),
    step6: isStep6Completed(),
    step7: isStep7Completed(),
  };

  const isStepLocked = (stepNum: number): boolean => {
    if (stepNum === 1) return false;
    if (stepNum === 2) return !stepStatus.step1;
    if (stepNum === 3) return !stepStatus.step2;
    if (stepNum === 4) return !stepStatus.step3;
    if (stepNum === 5) return !stepStatus.step4;
    if (stepNum === 6) return !stepStatus.step5;
    if (stepNum === 7) return !stepStatus.step6;
    return false;
  };

  const stepIcons = [
    <FaCalendarAlt key="1" />,
    <FaHandshake key="2" />,
    <FaUserTie key="3" />,
    <FaFileAlt key="4" />,
    <FaGavel key="5" />,
    <FaPenFancy key="6" />,
    <FaCheckCircle key="7" />,
  ];

  const steps = [
    {
      id: 1,
      title: 'Διαχείριση Αιτήματος Επισκεψής',
      description: 'Εγκρίνετε ή απορρίψτε το ραντεβού προβολής. Αν ο αγοραστής συνεχίσει χωρίς ραντεβού, το βήμα ολοκληρώνεται αυτόματα.',
      instructions: [
        'Πηγαίνετε στο tab "Ραντεβού" για να δείτε τα αιτήματα',
        'Εγκρίνετε ή απορρίψτε κάθε αίτημα ραντεβού',
        'Αν ο αγοραστής προχωρήσει χωρίς ραντεβού, το βήμα ολοκληρώνεται αυτόματα',
        'Το βήμα ολοκληρώνεται όταν περάσει η ημέρα του επιβεβαιωμένου ραντεβού'
      ],
      actionLabel: 'Δείτε Ραντεβού',
      completed: stepStatus.step1,
      active: currentStep === 1,
      locked: false,
      comingSoon: false,
    },
    {
      id: 2,
      title: 'Αποδοχή Προσφοράς',
      description: 'Αναμένετε την προσφορά του αγοραστή, εγκρίνετε, κάντε αντιπρόταση ή απορρίψτε. Μόλις συμφωνηθεί η τιμή, προχωράμε.',
      instructions: [
        'Δείτε την προσφορά του αγοραστή',
        'Μπορείτε να κάνετε αντιπρόταση με ποσό και σχόλια',
        'Μόλις συμφωνηθεί η τιμή από τις δύο πλευρές, προχωράμε'
      ],
      actionLabel: 'Δείτε Προσφορά & Αντιπρόταση',
      completed: stepStatus.step2,
      active: currentStep === 2,
      locked: isStepLocked(2),
      comingSoon: false,
    },
    {
      id: 3,
      title: 'Επιλογή Δικηγόρου και Μηχανικού',
      description: 'Επιλέξτε δικηγόρο και μηχανικό. Και οι δύο είναι απαραίτητοι για να προχωρήσετε, ή μπορείτε να συνεχίσετε χωρίς δικηγόρο αφού επιλέξετε μηχανικό.',
      instructions: [
        'Πηγαίνετε στο tab "Επαγγελματίες"',
        'Επιλέξτε υποχρεωτικά μηχανικό από τη λίστα',
        'Επιλέξτε και δικηγόρο για πλήρη κάλυψη, ή πατήστε "Συνέχεια χωρίς δικηγόρο"',
        'Ο μηχανικός είναι υποχρεωτικός· ο δικηγόρος δεν είναι υποχρεωτικός για να προχωρήσετε'
      ],
      actionLabel: 'Επίλεξτε Επαγγελματίες',
      completed: stepStatus.step3,
      active: currentStep === 3,
      locked: isStepLocked(3),
      warning: !hasEngineer ? 'Χρειάζεται να επιλέξετε μηχανικό. Ο δικηγόρος είναι προαιρετικός.' : (!hasLawyer && !sellerSkippedLawyer) ? 'Επιλέξτε δικηγόρο ή πατήστε "Συνέχεια χωρίς δικηγόρο" για να προχωρήσετε.' : undefined,
    },
    {
      id: 4,
      title: 'Συλλογή Εγγράφων και Ενέργειες',
      description: 'Ανεβάστε τα απαιτούμενα έγγραφα και ολοκληρώστε τις ενέργειες που ζητούν ο δικηγόρος και ο συμβολαιογράφος.',
      instructions: [
        'Πηγαίνετε στο tab "Φάκελοι Συναλλαγής"',
        'Δείτε τα έγγραφα που σας ζητούν',
        'Ανεβάστε τα απαιτούμενα έγγραφα',
        'Ολοκληρώστε τις ενέργειες που σας ανατέθηκαν'
      ],
      actionLabel: 'Δείτε Φάκελους Συναλλαγής',
      completed: stepStatus.step4,
      active: currentStep === 4,
      locked: isStepLocked(4),
    },
    {
      id: 5,
      title: 'Αναμονή Έγκρισης Συμβολαιογράφου',
      description: 'Ο συμβολαιογράφος ελέγχει όλα τα έγγραφα. Περιμένετε την έγκρισή του για να προχωρήσετε στην υπογραφή.',
      instructions: [
        'Ο συμβολαιογράφος εξετάζει όλα τα έγγραφα',
        'Όταν εγκριθεί, θα ενημερωθείτε',
        'Μετά την έγκριση μπορείτε να προχωρήσετε στην υπογραφή'
      ],
      actionLabel: null,
      completed: stepStatus.step5,
      active: currentStep === 5,
      locked: isStepLocked(5),
    },
    {
      id: 6,
      title: 'Υπογραφή Συμβολαίων',
      description: signingApt
        ? 'Έχετε επιβεβαιωμένο ραντεβού για την υπογραφή των συμβολαίων.'
        : 'Κανονίστε ραντεβού για την υπογραφή. Δείτε τις προτάσεις του αγοραστή, στείλτε τη δική σας ή εγκρίνετε μία από τις υπάρχουσες.',
      instructions: signingApt
        ? []
        : [
            'Κανονίστε ραντεβού για την υπογραφή των συμβολαίων',
            'Δείτε τις προτάσεις ημερομηνιών από τον αγοραστή',
            'Μπορείτε να στείλετε τη δική σας πρόταση',
            'Εγκρίνετε την τελική ημερομηνία με τον συμβολαιογράφο'
          ],
      actionLabel: signingApt ? null : 'Κανονίστε Υπογραφή',
      completed: stepStatus.step6,
      active: currentStep === 6,
      locked: isStepLocked(6),
    },
    {
      id: 7,
      title: 'Επιβεβαίωση Ολοκλήρωσης',
      description: 'Επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν επιτυχώς και η συναλλαγή ολοκληρώθηκε.',
      instructions: [
        'Εάν τα συμβολαία έχουν υπογραφεί επιτυχώς, πατήστε το κουμπί παρακάτω',
        'Το deal θα ολοκληρωθεί μόνο όταν και εσείς και ο αγοραστής επιβεβαιώσετε',
        'Μετά την επιβεβαίωση θα εμφανιστεί μήνυμα συγχαρητηρίων'
      ],
      actionLabel: 'Επιβεβαιώστε Ολοκλήρωση',
      completed: stepStatus.step7,
      active: currentStep === 7,
      locked: isStepLocked(7),
    },
  ];

  const handleStepClick = (step: typeof steps[0]) => {
    if (step.locked || step.completed) return;
    if ((step as any).comingSoon) return;

    switch (step.id) {
      case 1:
        router.push(`/deals/${deal.id}?tab=appointments`);
        break;
      case 2:
        setShowOfferModal(true);
        break;
      case 3:
        router.push(`/deals/${deal.id}?tab=professionals`);
        break;
      case 4:
        router.push(`/deals/${deal.id}?tab=documents`);
        break;
      case 5:
        router.push(`/deals/${deal.id}?tab=documents`);
        break;
      case 6:
        if (!signingApt) setShowSigningAppointmentModal(true);
        break;
      case 7:
        router.push(`/deals/${deal.id}?tab=overview`);
        break;
      default:
        break;
    }
  };

  const completedSteps = steps.filter(s => s.completed);

  // Compact layout for left sidebar (like BuyersPurchaseGuide)
  if (compact) {
    return (
      <CardSection title="Οδηγός Πώλησης">
        <p className="text-xs text-gray-600 mb-5 font-medium">
          Ακολουθήστε τα βήματα για να ολοκληρώσετε την πώληση
        </p>
        <div className="space-y-1">
          {steps.map((stage, index) => {
            const isCompleted = stage.completed;
            const isActive = stage.active;
            const isLocked = stage.locked;
            const comingSoon = stage.comingSoon;
            return (
              <div
                key={stage.id}
                onClick={() => !isLocked && !comingSoon && handleStepClick(stage)}
                className={`
                  relative p-3 rounded-lg transition-all cursor-pointer group
                  ${isLocked ? 'cursor-not-allowed' : comingSoon ? 'cursor-default' : 'cursor-pointer'}
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
                      isCompleted ? 'bg-gradient-to-b from-green-400 to-green-300' :
                      isActive ? 'bg-gradient-to-b from-blue-400 to-blue-300' : 'bg-gray-300'
                    }`}
                  />
                )}
                <div className="flex items-start gap-3 relative z-10">
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
                      ${isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                        isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' :
                        isLocked ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500'}
                    `}
                  >
                    {isCompleted ? <FaCheckCircle className="text-xs" /> : isLocked ? <FaLock className="text-xs" /> : stepIcons[index]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`font-bold text-xs ${
                        isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : isLocked ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        Βήμα {index + 1}: {stage.title}
                      </h3>
                      {comingSoon && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">Σύντομα</span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${
                      isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : isLocked ? 'text-gray-400' : 'text-gray-600'
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
            <span className="text-sm font-extrabold text-blue-700">
              {Math.round((completedSteps.length / 7) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.length / 7) * 100}%` }}
            />
          </div>
        </div>
        {showOfferModal && (
          <OfferModalContent
            deal={deal}
            counterAmount={counterAmount}
            setCounterAmount={setCounterAmount}
            counterMessage={counterMessage}
            setCounterMessage={setCounterMessage}
            isSubmittingOffer={isSubmittingOffer}
            setIsSubmittingOffer={setIsSubmittingOffer}
            onClose={() => {
              setShowOfferModal(false);
              setCounterAmount('');
              setCounterMessage('');
            }}
            onSuccess={() => {
              setCounterAmount('');
              setCounterMessage('');
              setShowOfferModal(false);
              onRefresh?.();
            }}
            onRefresh={onRefresh}
          />
        )}
      </CardSection>
    );
  }

  // Full layout for Overview tab (unchanged). When embedded, skip CardSection and header (parent provides it).
  const fullContent = (
      <>
        {!embedded && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Οδηγός Πώλησης Ακινήτου</h2>
          <p className="text-gray-600">Ακολουθήστε τα βήματα για να ολοκληρώσετε την πώληση</p>
        </div>
        )}

      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Πρόοδος</span>
          <span className="text-sm font-bold text-blue-600">
            {completedSteps.length} / {steps.length} βήματα
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps List - same layout as buyer ActionsTab */}
      <div className="space-y-4">
        {steps.map((stage, index) => {
          const isCompleted = stage.completed;
          const isActive = stage.active;
          const isLocked = stage.locked;
          const comingSoon = stage.comingSoon;
          const warning = stage.warning;

          return (
            <div
              key={stage.id}
              onClick={() => !isLocked && !comingSoon && handleStepClick(stage)}
              className={`rounded-xl border-2 p-6 transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-lg cursor-pointer'
                  : isCompleted
                  ? 'border-green-300 bg-green-50 cursor-pointer'
                  : isLocked
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 bg-white cursor-pointer hover:border-blue-300'
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
                      : isLocked
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
                      Βήμα {index + 1}: {stage.title}
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
                    {comingSoon && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        Σύντομα
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">{stage.description}</p>

                  {/* Instructions */}
                  {stage.instructions && stage.instructions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <FaInfoCircle className="text-blue-500" />
                        Πώς να προχωρήσετε:
                      </h4>
                      <ul className="space-y-2">
                        {stage.instructions.map((instruction, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <FaCircle className="text-[6px] text-blue-500 mt-2 flex-shrink-0" />
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {warning && isActive && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <FaExclamationTriangle className="text-amber-600 text-sm flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">{warning}</p>
                    </div>
                  )}

                  {/* Step 6: Confirmed signing appointment (inline, no modal button) */}
                  {stage.id === 6 && signingApt && isActive && !isCompleted && (
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
                          {signingApt.location && (
                            <p className="text-sm text-green-700 mt-1">{signingApt.location}</p>
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
                          if (!confirm('Θέλετε σίγουρα να ακυρώσετε το ραντεβού υπογραφής; Ο αγοραστής και ο συμβολαιογράφος θα ενημερωθούν.')) return;
                          setIsCancellingAppointment(true);
                          fetchFromBackend(`/deals/${deal.id}/appointments/${signingApt.id}/seller-cancel`, { method: 'POST' })
                            .then(async (res) => {
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.error || 'Σφάλμα');
                              }
                              toast.success('Το ραντεβού ακυρώθηκε.');
                              onRefresh?.();
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
                  )}

                  {/* Action Buttons */}
                  {isActive && stage.actionLabel && !comingSoon && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepClick(stage);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {stage.actionLabel}
                        <FaArrowRight />
                      </button>
                      {stage.id === 3 && hasEngineer && !hasLawyer && !sellerSkippedLawyer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Θέλετε να προχωρήσετε χωρίς δικηγόρο; Θα μπορείτε να επιλέξετε δικηγόρο αργότερα αν χρειαστεί.')) {
                              handleSkipLawyer();
                            }
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-amber-700"
                        >
                          Συνέχεια χωρίς δικηγόρο
                          <FaArrowRight />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>
  );

  const modals = (
      <>
      {/* Signing Appointment Modal (Step 6) */}
      {showSigningAppointmentModal && (
        <SellerSigningAppointmentModal
          deal={deal}
          onClose={() => setShowSigningAppointmentModal(false)}
          onSuccess={() => {
            setShowSigningAppointmentModal(false);
            onRefresh?.();
          }}
        />
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <OfferModalContent
          deal={deal}
          counterAmount={counterAmount}
          setCounterAmount={setCounterAmount}
          counterMessage={counterMessage}
          setCounterMessage={setCounterMessage}
          isSubmittingOffer={isSubmittingOffer}
          setIsSubmittingOffer={setIsSubmittingOffer}
          onClose={() => {
            setShowOfferModal(false);
            setCounterAmount('');
            setCounterMessage('');
          }}
          onSuccess={() => {
            setCounterAmount('');
            setCounterMessage('');
            setShowOfferModal(false);
            onRefresh?.();
          }}
          onRefresh={onRefresh}
        />
      )}
      </>
  );

  const inner = <div className="space-y-6">{fullContent}</div>;
  if (embedded) {
    return (
      <>
        {inner}
        {modals}
      </>
    );
  }
  return (
    <CardSection>
      {inner}
      {modals}
    </CardSection>
  );
}
