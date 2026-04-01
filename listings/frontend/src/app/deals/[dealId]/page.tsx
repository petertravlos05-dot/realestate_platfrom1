'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaHome, FaUser, FaSignOutAlt, FaSearch, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaCog, FaComments, FaExchangeAlt, FaChevronDown, FaUserCircle, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaPhone, FaMapMarkerAlt, FaCaretDown, FaTrash, FaBuilding, FaChartBar, FaHandshake, FaHeart, FaPauseCircle } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getDeal, hideDeal, DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import DealRoomHeader from '@/components/deals/DealRoomHeader';
import DealRoomTabs from '@/components/deals/DealRoomTabs';
import DealRoomShell from '@/components/deals/DealRoomShell';
import ActivityFeed from '@/components/deals/ActivityFeed';
import DealSummary from '@/components/deals/DealSummary';
import BuyersPurchaseGuide from '@/components/deals/BuyersPurchaseGuide';
import SellersPurchaseGuide from '@/components/deals/SellersPurchaseGuide';
import RentSellersGuide from '@/components/deals/RentSellersGuide';
import EngineersDealGuide from '@/components/deals/EngineersDealGuide';
import BuyersLawyerSidebarGuide from '@/components/deals/BuyersLawyerSidebarGuide';
import NotarySidebarGuide from '@/components/deals/NotarySidebarGuide';
import ForbiddenState from '@/components/common/ForbiddenState';
import { createDealSSEClient, SSEEvent, SSESnapshot } from '@/lib/realtime/sseClient';
import { throttle } from '@/lib/utils/throttle';
import { shouldShowToast } from '@/lib/utils/toastDedupe';
import { SkeletonHeader, SkeletonStepper } from '@/components/deals/ui/SkeletonLoader';
import { apiClient } from '@/lib/api/client';
import NotificationBell from '@/components/notifications/NotificationBell';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
import AgentNotificationBell from '@/components/notifications/AgentNotificationBell';
import { isBuyer, isSeller, isAgent, isEngineer, isLawyer, isNotary } from '@/lib/utils/dealRole';
import { isBuyerFromGreece } from '@/lib/utils/buyerCountry';
import { getDealBuyerDisplayName } from '@/lib/utils/dealBuyerDisplay';
import AgentDealOverview from '@/components/deals/AgentDealOverview';
import AgentNavbar from '@/components/layout/AgentNavbar';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';

export default function DealRoomPage() {
  const { status, isAuthenticated, userId, role } = useCurrentUser();
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dealId = params?.dealId as string;

  // Show seller navbar/colors when user came from /deals?from=seller&tab=deals
  const fromSeller = searchParams?.get('from') === 'seller';
  // Show agent navbar/colors when user came from /deals?from=agent or when user role is AGENT
  const fromAgent = searchParams?.get('from') === 'agent';
  const fromAdmin = searchParams?.get('from') === 'admin';
  const isAgentRole = (session?.user as any)?.role === 'AGENT';
  const userRole = (role || (session?.user as any)?.role || '').toUpperCase();
  const isProfessionalUser = ['LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT'].includes(userRole || '');
  const lastKnownWasProfessionalRef = useRef(false);
  const showAgentStyle = isAgentRole || fromAgent;
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const [deal, setDeal] = useState<DealRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDealConfirm, setShowCancelDealConfirm] = useState(false);
  const [cancelDealLoading, setCancelDealLoading] = useState(false);
  const [restoreInterestLoading, setRestoreInterestLoading] = useState(false);
  const [showRestoreInterestConfirm, setShowRestoreInterestConfirm] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [sseEvents, setSseEvents] = useState<SSEEvent[]>([]);
  const sseClientRef = useRef<ReturnType<typeof createDealSSEClient> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Αποφεύγει race: μετά το signOut το status γίνεται unauthenticated και το effect παλιά έστελνε στο /login πριν το router.push(/buyer) */
  const skipUnauthenticatedRedirectRef = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') {
      lastKnownWasProfessionalRef.current = isProfessionalUser;
    }
  }, [status, isProfessionalUser]);

  // Throttled refresh function for SSE events (max once per 5 seconds)
  const throttledRefresh = useRef(
    throttle(async () => {
      if (!dealId) return;
      try {
        const dealData = await getDeal(dealId);
        setDeal(dealData);
      } catch (err: any) {
        console.error('Error refreshing deal:', err);
        // Don't show toast for throttled refreshes - only for user-initiated
      }
    }, 5000)
  ).current;

  const fetchDeal = useCallback(async (showLoading = true) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const dealData = await getDeal(dealId);
      setDeal(dealData);
    } catch (err: any) {
      // Ignore aborted requests
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching deal:', err);
      const errorMessage = err.message || 'Αποτυχία φόρτωσης συναλλαγής';
      setError(errorMessage);
      
      if (errorMessage.includes('Access denied') || errorMessage.includes('403')) {
        // Don't show toast, ForbiddenState will handle it
        setError('403');
      } else if (errorMessage.includes('404')) {
        if (shouldShowToast('Η συναλλαγή δεν βρέθηκε', 'error')) {
          toast.error('Η συναλλαγή δεν βρέθηκε');
        }
        setTimeout(() => router.push('/deals'), 2000);
      } else {
        if (shouldShowToast(errorMessage, 'error')) {
          toast.error(errorMessage);
        }
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [dealId, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (skipUnauthenticatedRedirectRef.current) {
        return;
      }
      if (isProfessionalUser || lastKnownWasProfessionalRef.current) {
        router.push('/professionals');
        return;
      }
      const returnTo = `/deals/${dealId}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
      if (fromAgent) {
        router.push(`/agent/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      } else if (fromSeller) {
        router.push(`/seller/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      } else {
        router.push(`/buyer/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      }
      return;
    }

    if (isAuthenticated && dealId) {
      fetchDeal();
    }
  }, [status, isAuthenticated, dealId, fetchDeal, router, searchParams?.toString(), isProfessionalUser, fromAgent, fromSeller]);

  // Setup SSE connection
  useEffect(() => {
    if (!isAuthenticated || !dealId || !deal) {
      return;
    }

    const client = createDealSSEClient(
      dealId,
      (event: SSEEvent | SSESnapshot) => {
        if (event.type === 'snapshot') {
          // Initial snapshot received - no need to refetch
          return;
        }

        // Handle different event types
        const sseEvent = event as SSEEvent;
        
        // Add to events list for ActivityFeed
        setSseEvents((prev) => [...prev, sseEvent].slice(-30)); // Keep last 30
        
        // Use throttled refresh for SSE events (not immediate fetchDeal)
        // This prevents rapid-fire requests when multiple events arrive quickly
        switch (sseEvent.type) {
          case 'message_sent':
            // ChatTab will handle its own refresh if needed
            break;
          case 'thread_created':
          case 'document_requested':
          case 'document_uploaded':
          case 'document_reviewed':
          case 'appointment_requested':
          case 'appointment_confirmed':
          case 'appointment_cancelled':
          case 'professional_requested':
          case 'professional_accepted':
          case 'professional_declined':
          case 'rent_seller_myade_declaration_submitted':
            // Throttled refresh - max once per 5 seconds
            throttledRefresh();
            break;
        }
      },
      {
        onConnect: () => {
          setConnectionStatus('connected');
        },
        onError: () => {
          setConnectionStatus('reconnecting');
        },
        onDisconnect: () => {
          setConnectionStatus('disconnected');
        },
      }
    );

    sseClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      sseClientRef.current = null;
    };
    // Remove fetchDeal from dependencies - it causes SSE to reconnect on every change
    // Only depend on dealId and deal existence
  }, [isAuthenticated, dealId, deal?.id]); // Use deal?.id instead of deal object

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen ${isProfessionalUser ? 'bg-slate-50' : showAgentStyle ? 'bg-gradient-to-b from-indigo-50/50 via-white to-white' : fromSeller ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]' : 'bg-[#f5f0e8]'}`}>
        <SkeletonHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 lg:gap-6">
            <div className="space-y-4">
              <SkeletonStepper />
              <SkeletonStepper />
              <SkeletonStepper />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error === '403') {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση σε αυτή τη συναλλαγή"
        subtitle="Δεν είστε συμμετέχοντας σε αυτή τη συναλλαγή ή δεν έχετε τα απαραίτητα δικαιώματα."
        backHref={
          fromAdmin
            ? '/admin/dashboard'
            : showAgentStyle
              ? '/deals?from=agent&tab=deals'
              : fromSeller
                ? '/deals?from=seller&tab=deals'
                : '/deals'
        }
        backLabel={fromAdmin ? 'Επιστροφή στο Admin' : 'Επιστροφή στις Συναλλαγές'}
      />
    );
  }

  if (error && error !== '403') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isProfessionalUser ? 'bg-slate-50' : showAgentStyle ? 'bg-gradient-to-b from-indigo-50/50 via-white to-white' : fromSeller ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]' : 'bg-[#f5f0e8]'}`}>
        <div className="text-center bg-white rounded-lg shadow p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Σφάλμα</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(showAgentStyle ? '/deals?from=agent&tab=deals' : fromSeller ? '/deals?from=seller&tab=deals' : '/deals')}
            className={`px-4 py-2 text-white rounded-lg ${isProfessionalUser ? 'bg-teal-600 hover:bg-teal-700' : showAgentStyle ? 'bg-indigo-600 hover:bg-indigo-700' : fromSeller ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-800 hover:bg-blue-900'}`}
          >
            Επιστροφή στις Συναλλαγές
          </button>
        </div>
      </div>
    );
  }

  if (!deal) {
    return null;
  }

  const isSellerRoleInDeal = isSeller(deal, userId);
  const isAdminDealObserver =
    fromAdmin && String((session?.user as { role?: string } | undefined)?.role || userRole || '').toUpperCase() === 'ADMIN';
  const isBuyerRoleInDeal = isBuyer(deal, userId) || (isAdminDealObserver && !isSellerRoleInDeal);
  const isAgentRoleInDeal = isAgent(deal, userId) && !isAdminDealObserver;

  const handleSignOut = async () => {
    skipUnauthenticatedRedirectRef.current = true;
    await signOut({ redirect: false });
    const afterSignOut = isProfessionalUser
      ? '/professionals'
      : isBuyerRoleInDeal
        ? '/buyer'
        : isSellerRoleInDeal
          ? '/seller'
          : isAgentRoleInDeal
            ? '/agent'
            : '/';
    router.push(afterSignOut);
    window.setTimeout(() => {
      skipUnauthenticatedRedirectRef.current = false;
    }, 2000);
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  const dealsListHref = showAgentStyle ? '/deals?from=agent&tab=deals' : fromSeller ? '/deals?from=seller&tab=deals' : '/deals?tab=overview';
  const isCancelledLocked = deal.status === 'CANCELLED';
  const blockedByPriorDeposit = !!deal.blockedByPriorDeposit;
  const dealRoomInteractionLocked =
    !!deal.propertySoldToAnother || isCancelledLocked || blockedByPriorDeposit;
  const restoreNeedsSellerApproval = !!(
    deal.offers?.some(o => o.status === 'ACCEPTED') ||
    deal.lawyerApprovedBasicDocumentsAt ||
    deal.lawyerApprovedSellerDocumentsAt ||
    deal.engineerApprovedSellerDocumentsAt ||
    deal.notaryApprovedDocumentsAt ||
    deal.buyerSigningConfirmed ||
    deal.sellerSigningConfirmed
  );

  const handleRestoreRequestResponse = async (action: 'APPROVE' | 'REJECT') => {
    try {
      await apiClient.post(`/deals/${deal.id}/restore-interest/respond`, { action });
      toast.success(action === 'APPROVE' ? 'Η επαναφορά εγκρίθηκε' : 'Το αίτημα απορρίφθηκε');
      await fetchDeal(false);
    } catch (error: any) {
      console.error('Error responding to restore request:', error);
      toast.error(error?.message || 'Αποτυχία απάντησης στο αίτημα επαναφοράς');
    }
  };

  const handleCancelDeal = async () => {
    if (!deal?.property?.id) {
      toast.error('Δεν βρέθηκε το ακίνητο της συναλλαγής');
      return;
    }
    setCancelDealLoading(true);
    try {
      await apiClient.delete(`/buyer/interested-properties/${deal.property.id}`);
      toast.success('Το ενδιαφέρον σας για το ακίνητο ακυρώθηκε επιτυχώς.');
      setShowCancelDealConfirm(false);
      router.push('/deals?tab=deals');
    } catch (error: any) {
      console.error('Error canceling interest from deal room:', error);
      toast.error(`Σφάλμα κατά την ακύρωση του ενδιαφέροντος: ${error?.message || 'Άγνωστο σφάλμα'}`);
    } finally {
      setCancelDealLoading(false);
    }
  };

  const handleRestoreInterestFromDealRoom = async () => {
    if (!deal?.property?.id) {
      toast.error('Δεν βρέθηκε το ακίνητο της συναλλαγής');
      return;
    }
    setRestoreInterestLoading(true);
    try {
      const { data } = await apiClient.patch(`/buyer/properties/${deal.property.id}`, { interestCancelled: false });
      if (data?.mode === 'request_sent') {
        toast.success('✅ Το αίτημα επαναφοράς στάλθηκε στον πωλητή για έγκριση.');
        await fetchDeal(false);
        return;
      }
      if (data?.mode === 'request_pending') {
        toast('⏳ Υπάρχει ήδη εκκρεμές αίτημα επαναφοράς προς τον πωλητή.');
        await fetchDeal(false);
        return;
      }
      toast.success('✅ Η συναλλαγή επανήλθε στις ενεργές συναλλαγές!');
      router.push('/deals?tab=deals');
    } catch (error: any) {
      console.error('Error restoring interest from deal room:', error);
      toast.error(error?.message || 'Σφάλμα κατά την επαναφορά ενδιαφέροντος');
    } finally {
      setRestoreInterestLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isProfessionalUser ? 'bg-slate-50' : showAgentStyle ? 'bg-gradient-to-b from-indigo-50/50 via-white to-white' : fromSeller ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]' : 'bg-[#f5f0e8]'}`}>
      {isAdminDealObserver && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Προβολή διαχειριστή</strong> — βλέπετε το deal room ως admin (θα οριστεί αργότερα τι εμφανίζεται εδώ).
          </span>
          <Link
            href="/admin/dashboard"
            className="font-medium text-amber-900 underline hover:no-underline whitespace-nowrap"
          >
            ← Επιστροφή στο Admin
          </Link>
        </div>
      )}
      {/* Navigation Bar */}
      {isProfessionalUser ? (
        <DynamicNavbar forceProfessionalTheme forceSolidFromStart />
      ) : showAgentStyle ? (
        <AgentNavbar solidFromStart />
      ) : fromSeller ? (
        <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100">
          <div className="container mx-auto px-6">
            <div className="flex items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center group">
                  <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mr-2 shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <FaHome className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
                </Link>
                <div className="relative" ref={roleMenuRef}>
                  <button
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full shadow-sm hover:from-green-700 hover:to-emerald-800 transition-all duration-300 whitespace-nowrap"
                  >
                    <FaUserCircle className="mr-2" />
                    Seller Mode
                    <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isRoleMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden"
                      >
                        <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                            <FaExchangeAlt className="mr-2 text-green-500" />
                            Αλλαγή Ρόλου
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                        </div>
                        <div className="py-2">
                          <div
                            onClick={() => handleRoleChange('BUYER')}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                              <FaUserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                                Buyer Mode
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Αναζήτηση και αγορά ακινήτων
                              </div>
                            </div>
                            <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                          </div>
                          <div
                            onClick={() => handleRoleChange('AGENT')}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                              <FaUserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                                Agent Mode
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Διαχείριση πελατών και ακινήτων
                              </div>
                            </div>
                            <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                          </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-500 text-center">
                            Τρέχων: <span className="font-semibold text-green-600">Seller Mode</span>
                          </p>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            Είστε Επαγγελματίας;{' '}
                            <Link
                              href="/professionals"
                              className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                            >
                              πατήστε εδώ
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex-1 flex justify-center">
                <nav className="flex items-center space-x-10">
                  <Link href="/seller" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                    Αρχική
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/about" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                    Σχετικά
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                    Επικοινωνία
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </nav>
              </div>

              <div className="flex items-center space-x-3">
                <SellerNotificationBell />
                <Link
                  href={dealsListHref}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 font-semibold text-sm transition-all"
                >
                  Συναλλαγές
                </Link>
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
                  >
                    <FaUser className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        key="profile-menu"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                              <FaUser className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{(session?.user as any)?.name || 'Χρήστης'}</p>
                              <p className="text-[11px] text-gray-500 truncate">{(session?.user as any)?.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/dashboard/seller"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                              <FaCog className="w-3.5 h-3.5 text-green-700" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                          </Link>
                          <Link
                            href="/dashboard/seller"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                              <FaChartBar className="w-3.5 h-3.5 text-green-700" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Πίνακας Ελέγχου</span>
                          </Link>
                          <Link
                            href="/about#faq"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                              <FaQuestionCircle className="w-3.5 h-3.5 text-green-700" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Συχνές Ερωτήσεις</span>
                          </Link>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="py-1">
                          <Link
                            href="/"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-gray-200 group-hover:scale-105 transition-all duration-200">
                              <FaExchangeAlt className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors">Αλλαγή Ρόλων</span>
                          </Link>
                          <button
                            onClick={() => { handleSignOut(); setIsProfileMenuOpen(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                              <FaSignOutAlt className="w-3.5 h-3.5 text-red-600" />
                            </div>
                            <span className="font-medium group-hover:text-red-700 transition-colors">Αποσύνδεση</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>
      ) : (
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/buyer" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </Link>
              
              <div className="relative" ref={roleMenuRef}>
                <button 
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-full shadow-md hover:from-blue-900 hover:to-slate-800 transition-all duration-300"
                >
                  <FaUserCircle className="mr-2" />
                  Buyer Mode
                  <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isRoleMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl py-3 border border-gray-100 z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <FaExchangeAlt className="mr-2 text-blue-700" />
                          Αλλαγή Ρόλου
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                      </div>
                      
                      {/* Options */}
                      <div className="py-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => { setIsRoleMenuOpen(false); handleRoleChange('AGENT'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('AGENT'); } }}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              Agent Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση πελατών και ακινήτων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                        </div>
                        
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => { setIsRoleMenuOpen(false); handleRoleChange('SELLER'); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('SELLER'); } }}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                              Seller Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση ακινήτων και πωλήσεων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-blue-800">Buyer Mode</span>
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Είστε Επαγγελματίας;{' '}
                          <Link
                            href="/professionals"
                            className="font-semibold text-blue-800 hover:text-blue-900 underline underline-offset-2"
                          >
                            πατήστε εδώ
                          </Link>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/buyer"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="/properties"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300"
              >
                <FaSearch className="mr-2" />
                Ακίνητα
              </Link>
              <Link
                href="/buyer/contact"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/buyer/about"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
              <Link
                href="/buyer/how-it-works"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300"
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <Link
                    href="/deals?tab=overview"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800 transition-all duration-300 shadow-md"
                  >
                    Συναλλαγές
                  </Link>
                  <NotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800"
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {isProfileMenuOpen && (
                        <motion.div
                          key="profile-menu"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50 overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center flex-shrink-0">
                                <FaUser className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{session?.user?.name || 'Χρήστης'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{session?.user?.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/buyer/profile?tab=settings"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaCog className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=favorites"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaHeart className="w-3.5 h-3.5 text-red-500" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Αγαπημένα</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=faq"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaQuestionCircle className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Συχνές Ερωτήσεις</span>
                            </Link>
                          </div>
                          <div className="border-t border-gray-100" />
                          <div className="py-1">
                            <Link
                              href="/"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-slate-200 group-hover:scale-105 transition-all duration-200">
                                <FaExchangeAlt className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-slate-800 transition-colors">Αλλαγή Ρόλων</span>
                            </Link>
                            <button
                              onClick={() => { handleSignOut(); setIsProfileMenuOpen(false); }}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaSignOutAlt className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <span className="font-medium group-hover:text-red-700 transition-colors">Αποσύνδεση</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/buyer/auth/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all duration-300"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/buyer/auth/register"
                    className="bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      )}

      <div className="pt-20">
        {blockedByPriorDeposit && (() => {
          const thisDealBuyerName = getDealBuyerDisplayName(deal);
          return (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
            <div
              className="max-w-[1600px] mx-auto overflow-hidden rounded-2xl border border-amber-400/45 shadow-lg shadow-amber-200/40 ring-1 ring-orange-300/30"
              style={{
                background:
                  'linear-gradient(135deg, rgba(254, 243, 199, 0.92) 0%, rgba(255, 237, 213, 0.88) 45%, rgba(254, 215, 170, 0.75) 100%)',
              }}
            >
              <div className="relative px-4 py-4 sm:px-5 sm:py-5 backdrop-blur-[2px]">
                <div
                  className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-500/80 via-orange-500/70 to-amber-600/60"
                  aria-hidden
                />
                <div className="flex items-start gap-3 sm:gap-4 pl-2 sm:pl-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/90 to-orange-300/80 text-amber-900 shadow-inner ring-2 ring-white/60">
                    <FaPauseCircle className="text-2xl text-amber-900/90 drop-shadow-sm" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-orange-500/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-orange-950 ring-1 ring-orange-400/40">
                        Σε αναμονή
                      </span>
                      <h3 className="text-base font-bold text-amber-950 sm:text-lg">
                        Προκαταβολή σε άλλη ενεργή συναλλαγή
                      </h3>
                    </div>
                    <p className="text-[15px] leading-relaxed text-amber-950/90 sm:text-base">
                      {deal.priorDepositBuyerName ? (
                        <>
                          Για το ίδιο ακίνητο υπάρχει ήδη ενεργή συναλλαγή με τον/την{' '}
                          <span className="font-semibold text-orange-950">{deal.priorDepositBuyerName}</span>, όπου έχει
                          καταβληθεί <span className="font-semibold text-orange-950">προκαταβολή</span>. Η διαδικασία εκείνη
                          έχει <span className="font-semibold">προτεραιότητα</span> μέχρι να ολοκληρωθούν οι υπογραφές ή να
                          ακυρωθεί.
                        </>
                      ) : (
                        <>
                          Για το ίδιο ακίνητο υπάρχει ήδη συναλλαγή όπου έχει καταβληθεί{' '}
                          <span className="font-semibold text-orange-950">προκαταβολή</span> από άλλον αγοραστή. Η
                          διαδικασία εκείνη έχει <span className="font-semibold">προτεραιότητα</span> μέχρι να
                          ολοκληρωθούν οι υπογραφές ή να ακυρωθεί.
                        </>
                      )}
                    </p>
                    {thisDealBuyerName && (
                      <p className="text-sm font-medium text-amber-950/95">
                        <span className="text-amber-900/90">Αυτό το deal room αφορά τον αγοραστή:</span>{' '}
                        {thisDealBuyerName}
                      </p>
                    )}
                    <p className="rounded-xl border border-amber-500/25 bg-white/35 px-3 py-2.5 text-sm leading-relaxed text-amber-950/85">
                      Δεν είναι διαθέσιμες ενέργειες σε αυτό το deal room — μπορείτε μόνο να βλέπετε την κατάσταση της
                      σελίδας μέχρι να ξεκαθαρίσει η άλλη συναλλαγή.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {deal.status === 'CANCELLED' && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
            <div className={`max-w-[1600px] mx-auto px-5 py-4 border rounded-2xl shadow-sm ${
              deal.restoreRequest?.status === 'PENDING'
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  deal.restoreRequest?.status === 'PENDING' ? 'bg-amber-100' : 'bg-rose-100'
                }`}>
                  <FaInfoCircle className={`${deal.restoreRequest?.status === 'PENDING' ? 'text-amber-700' : 'text-rose-700'} text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                  {deal.restoreRequest?.status === 'PENDING' ? (
                    <>
                      <h3 className="text-base sm:text-lg font-bold text-amber-900">
                        Αίτημα επαναφοράς συναλλαγής
                      </h3>
                      <p className="text-amber-800 mt-1">
                        Ο {(() => {
                          const a = (deal.property as any)?.amenities;
                          const listingType = String((a && typeof a === 'object' ? (a.listingType || a.transactionType || '') : '')).toLowerCase();
                          return listingType === 'rent' ? 'ενοικιαστής' : 'αγοραστής';
                        })()} ζήτησε να επαναφέρει τη συναλλαγή.
                      </p>
                      {isSellerRoleInDeal ? (
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleRestoreRequestResponse('APPROVE')}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                          >
                            Αποδοχή
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreRequestResponse('REJECT')}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
                          >
                            Απόρριψη
                          </button>
                        </div>
                      ) : (
                        <p className="text-amber-700/90 text-sm mt-2">
                          Το αίτημα βρίσκεται σε αναμονή απάντησης από τον πωλητή.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-base sm:text-lg font-bold text-rose-900">
                        Η συναλλαγή ακυρώθηκε
                      </h3>
                      <p className="text-rose-800 mt-1">
                        {(() => {
                          const a = (deal.property as any)?.amenities;
                          const listingType = String((a && typeof a === 'object' ? (a.listingType || a.transactionType || '') : '')).toLowerCase();
                          const actorLabel = listingType === 'rent' ? 'ενοικιαστή' : 'αγοραστή';
                          return `Η συναλλαγή ακυρώθηκε από τον ${actorLabel}.`;
                        })()}
                      </p>
                      <p className="text-rose-700/90 text-sm mt-1">
                        Οι ενέργειες προόδου έχουν σταματήσει και το deal room εμφανίζεται πλέον στις ακυρωμένες συναλλαγές.
                      </p>
                      {isBuyerRoleInDeal && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setShowRestoreInterestConfirm(true)}
                            disabled={restoreInterestLoading}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {restoreInterestLoading ? 'Επαναφορά...' : 'Επαναφορά ενδιαφέροντος'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner when property was sold to another buyer */}
        {deal.propertySoldToAnother && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4">
            <div className="max-w-[1600px] mx-auto px-4 py-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <FaInfoCircle className="text-amber-700 text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-amber-900">
                    Το ακίνητο πουλήθηκε ή ενοικιάστηκε σε άλλον αγοραστή
                  </h3>
                  <p className="text-amber-800 mt-1">
                    Δεν μπορείτε να προχωρήσετε άλλο τη συναλλαγή. Μπορείτε να δείτε τι είχε γίνει μέχρι στιγμής αλλά οι ενέργειες είναι απενεργοποιημένες.
                  </p>
                  <p className="text-amber-800 mt-2 text-sm">
                    Αν θέλετε να αφαιρέσετε αυτό το deal room από τη λίστα σας, μπορείτε να το διαγράψετε. Δεν θα εμφανίζεται πλέον στις συναλλαγές σας.
                  </p>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await hideDeal(deal.id);
                        toast.success('Το deal room αφαιρέθηκε από τη λίστα σας');
                        router.push(dealsListHref);
                      } catch (err: any) {
                        toast.error(err.message || 'Αποτυχία αφαίρεσης');
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FaTrash className="text-sm" />
                    Αφαίρεση από τη λίστα μου
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={dealRoomInteractionLocked ? 'relative' : ''}>
          <DealRoomHeader
            deal={deal}
            onRefresh={fetchDeal}
            connectionStatus={connectionStatus}
            onCancelDeal={() => setShowCancelDealConfirm(true)}
            cancelDealLoading={cancelDealLoading}
          />
          <DealRoomShell
            deal={deal}
            onRefresh={fetchDeal}
            connectionStatus={connectionStatus}
            leftColumn={
          <>
            {(() => {
              const isBuyerRole = isBuyer(deal, userId);
              const isSellerRole = isSeller(deal, userId);
              const isAgentRole = isAgent(deal, userId);
              const isRentDeal = (() => {
                const a = (deal.property as any)?.amenities;
                return a && typeof a === 'object' && String(a.listingType || a.transactionType || '').toLowerCase() === 'rent';
              })();
              
              if (isBuyerRole) {
                return (
                  <>
                    <BuyersPurchaseGuide deal={deal} sseEvents={sseEvents} />
                    <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                    <DealSummary deal={deal} />
                  </>
                );
              } else if (isSellerRole) {
                return (
                  <>
                    {isRentDeal ? (
                      <RentSellersGuide deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} compact />
                    ) : (
                      <SellersPurchaseGuide deal={deal} sseEvents={sseEvents} compact />
                    )}
                    <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                    <DealSummary deal={deal} />
                  </>
                );
              } else if (isAgentRole) {
                return (
                  <>
                    <AgentDealOverview deal={deal} />
                    <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                    <DealSummary deal={deal} />
                  </>
                );
              } else {
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
                if (isBuyersLawyer) {
                  return (
                    <>
                      <BuyersLawyerSidebarGuide deal={deal} sseEvents={sseEvents} />
                      <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                      <DealSummary deal={deal} />
                    </>
                  );
                }
                const sellerIdForEng =
                  deal.sellerId || deal.participants?.find((p) => p.role === 'SELLER')?.userId;
                const isSellersEngineer =
                  !!userId &&
                  isEngineer(deal, userId) &&
                  !!deal.requests?.some(
                    (r) =>
                      r.status === 'ACCEPTED' &&
                      r.type === 'ENGINEER' &&
                      r.requestedById === sellerIdForEng &&
                      r.professional?.user?.id === userId
                  );
                if (isSellersEngineer) {
                  return (
                    <>
                      <EngineersDealGuide deal={deal} sseEvents={sseEvents} />
                      <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                      <DealSummary deal={deal} />
                    </>
                  );
                }
                if (!!userId && isNotary(deal, userId)) {
                  return (
                    <>
                      <NotarySidebarGuide deal={deal} sseEvents={sseEvents} />
                      <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                      <DealSummary deal={deal} />
                    </>
                  );
                }
                // For other roles (e.g. lawyer not matched above, accountant)
                return (
                  <>
                    <ActivityFeed deal={deal} sseEvents={sseEvents} onRefresh={fetchDeal} />
                    <DealSummary deal={deal} />
                  </>
                );
              }
            })()}
          </>
        }
        rightColumn={<DealRoomTabs deal={deal} onRefresh={fetchDeal} sseEvents={sseEvents} isBuyerFromGreece={isBuyerFromGreece(deal)} />}
          />
          {dealRoomInteractionLocked && (
            <div
              className="absolute inset-0 z-30 cursor-not-allowed bg-transparent"
              style={{ pointerEvents: 'auto' }}
              title={
                deal.propertySoldToAnother
                  ? 'Η συναλλαγή έχει κλείσει - το ακίνητο πουλήθηκε σε άλλον'
                  : blockedByPriorDeposit
                    ? 'Σε αναμονή — προκαταβολή σε άλλη συναλλαγή για το ίδιο ακίνητο'
                    : 'Η συναλλαγή είναι ακυρωμένη'
              }
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRestoreInterestConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => !restoreInterestLoading && setShowRestoreInterestConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaInfoCircle className="w-6 h-6 text-blue-700" />
              </div>
              <h2 className="text-xl font-bold mb-3 text-gray-900 text-center">Επαναφορά ενδιαφέροντος</h2>
              <p className="text-gray-700 text-center mb-3">
                Θέλετε να επαναφέρετε το ενδιαφέρον σας για το ακίνητο
              </p>
              <p className="text-gray-900 font-semibold text-center mb-4">
                &quot;{deal.property?.title || 'Ακίνητο'}&quot;
              </p>
              <div className={`rounded-xl border px-4 py-3 mb-6 text-sm ${restoreNeedsSellerApproval ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                {restoreNeedsSellerApproval ? (
                  <p>
                    Επειδή η συναλλαγή έχει προχωρήσει μετά το στάδιο προκαταβολής/εγγύησης, η επαναφορά δεν γίνεται άμεσα.
                    Θα σταλεί αίτημα στον πωλητή και απαιτείται η έγκρισή του.
                  </p>
                ) : (
                  <p>
                    Η συναλλαγή δεν έχει προχωρήσει σε στάδιο προκαταβολής/εγγύησης.
                    Η επαναφορά θα γίνει άμεσα και το deal room θα επιστρέψει στις ενεργές συναλλαγές.
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setShowRestoreInterestConfirm(false);
                    await handleRestoreInterestFromDealRoom();
                  }}
                  disabled={restoreInterestLoading}
                  className="flex-1 bg-gradient-to-r from-blue-800 to-slate-700 text-white py-3 rounded-xl hover:from-blue-900 hover:to-slate-800 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {restoreInterestLoading ? 'Επεξεργασία...' : 'Ναι, επαναφορά'}
                </button>
                <button
                  onClick={() => setShowRestoreInterestConfirm(false)}
                  disabled={restoreInterestLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Άκυρο
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCancelDealConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => !cancelDealLoading && setShowCancelDealConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrash className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-3 text-gray-900 text-center">Ακύρωση Συναλλαγής</h2>
              <p className="text-gray-600 text-center mb-2">
                Είστε σίγουρος ότι θέλετε να ακυρώσετε το ενδιαφέρον σας για το ακίνητο
              </p>
              <p className="text-gray-900 font-semibold text-center mb-5">
                &quot;{deal.property?.title || 'Ακίνητο'}&quot;
              </p>
              <p className="text-sm text-gray-500 text-center mb-6">
                Αυτή η ενέργεια ακολουθεί την ίδια ροή με το «Ακύρωση ενδιαφέροντος» στο Buyer Dashboard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDeal}
                  disabled={cancelDealLoading}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {cancelDealLoading ? 'Ακύρωση...' : 'Ναι, ακύρωση'}
                </button>
                <button
                  onClick={() => setShowCancelDealConfirm(false)}
                  disabled={cancelDealLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Άκυρο
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Footer */}
      {isProfessionalUser ? (
        <footer className="bg-slate-100 border-t border-slate-300/60 py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                    <FaHome className="text-white text-sm" />
                  </div>
                  <span className="text-xl font-bold text-slate-800">RealEstate</span>
                </div>
                <p className="text-slate-600">
                  Η πλατφόρμα που συνδέει Δικηγόρους, Συμβολαιογράφους και Μηχανικούς με πελάτες σε οργανωμένο Deal
                  Room.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
                <ul className="space-y-3">
                  <li><Link href="/professionals" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">Επαγγελματίες</Link></li>
                  <li><Link href="/professionals#role-section" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">Πώς λειτουργεί</Link></li>
                  <li><Link href="/professional/join" className="text-slate-600 hover:text-teal-700 transition-colors duration-200">Εγγραφή</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Επικοινωνία</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center"><FaEnvelope className="mr-2 text-teal-700" />info@realestate.com</li>
                  <li className="flex items-center"><FaPhone className="mr-2 text-teal-700" />+30 210 1234567</li>
                  <li className="flex items-center"><FaMapMarkerAlt className="mr-2 text-teal-700" />Αθήνα, Ελλάδα</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Ακολουθήστε μας</h3>
                <div className="flex space-x-4">
                  <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"><FaFacebook className="w-5 h-5" /></a>
                  <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"><FaTwitter className="w-5 h-5" /></a>
                  <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"><FaInstagram className="w-5 h-5" /></a>
                  <a href="#" className="w-10 h-10 bg-teal-50 text-teal-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"><FaLinkedin className="w-5 h-5" /></a>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-300 mt-8 pt-8 text-center text-slate-600">
              <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </footer>
      ) : showAgentStyle ? (
        <footer className="bg-slate-900 text-slate-300 py-16 px-4 sm:px-6 lg:px-8 mt-16">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="flex flex-col items-center space-y-8">
              <div>
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                    <FaHome className="text-white text-sm" />
                  </div>
                  <span className="text-lg font-bold text-white">RealEstate</span>
                </div>
                <p className="text-sm max-w-md mx-auto">
                  Η πλατφόρμα που συνδέει συνεργάτες με αγοραστές και ενοικιαστές ακινήτων.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                <Link href="/agent/properties" className="hover:text-white transition-colors text-sm">Ακίνητα</Link>
                <Link href="/agent/about" className="hover:text-white transition-colors text-sm">Σχετικά</Link>
                <Link href="/agent/contact" className="hover:text-white transition-colors text-sm">Επικοινωνία</Link>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center justify-center"><FaEnvelope className="mr-2 text-indigo-400" />info@realestate.com</span>
                <span className="flex items-center justify-center"><FaPhone className="mr-2 text-indigo-400" />+30 210 1234567</span>
                <span className="flex items-center justify-center"><FaMapMarkerAlt className="mr-2 text-indigo-400" />Αθήνα, Ελλάδα</span>
              </div>
            </div>
            <div className="border-t border-slate-700 mt-10 pt-8 text-sm">
              <p>&copy; {new Date().getFullYear()} Real Estate Platform. Με επιφύλαξη παντός δικαιώματος.</p>
            </div>
          </div>
        </footer>
      ) : (
        <footer className={`py-12 mt-16 border-t ${fromSeller ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5] border-white/50' : 'bg-[#f5f0e8] border-stone-300/40'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fromSeller ? 'bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-blue-900 to-slate-800'}`}>
                    <FaHome className="text-white text-sm" />
                  </div>
                  <span className={`text-xl font-bold ${fromSeller ? 'bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent'}`}>
                    RealEstate
                  </span>
                </div>
                <p className="text-gray-600">
                  Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/properties" className={`text-gray-600 transition-colors duration-200 ${fromSeller ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Ακίνητα
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className={`text-gray-600 transition-colors duration-200 ${fromSeller ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Σχετικά
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className={`text-gray-600 transition-colors duration-200 ${fromSeller ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Επικοινωνία
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <FaEnvelope className={`mr-2 ${fromSeller ? 'text-green-500' : 'text-blue-700'}`} />
                    info@realestate.com
                  </li>
                  <li className="flex items-center">
                    <FaPhone className={`mr-2 ${fromSeller ? 'text-green-500' : 'text-blue-700'}`} />
                    +30 210 1234567
                  </li>
                  <li className="flex items-center">
                    <FaMapMarkerAlt className={`mr-2 ${fromSeller ? 'text-green-500' : 'text-blue-700'}`} />
                    Αθήνα, Ελλάδα
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
                <div className="flex space-x-4">
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${fromSeller ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                    <FaFacebook className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${fromSeller ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                    <FaTwitter className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${fromSeller ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                    <FaInstagram className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${fromSeller ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
            <div className={`border-t mt-8 pt-8 text-center text-gray-600 ${fromSeller ? 'border-green-200/50' : 'border-stone-300/40'}`}>
              <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

