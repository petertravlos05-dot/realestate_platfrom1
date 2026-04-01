'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaBuilding, 
  FaUsers, 
  FaFileAlt, 
  FaCalendarAlt, 
  FaChevronRight,
  FaChevronLeft,
  FaSpinner,
  FaCheckCircle,
  FaClock,
  FaUserTie,
  FaHandshake,
  FaInfoCircle,
  FaTimesCircle,
  FaHome,
  FaKey,
  FaExclamationTriangle,
  FaPlus,
  FaSearch,
  FaComments,
  FaArrowRight,
  FaBell,
  FaUser,
  FaUserCircle,
  FaExchangeAlt,
  FaEnvelope,
  FaQuestionCircle,
  FaCog,
  FaHeart,
  FaSignOutAlt,
  FaChevronDown,
  FaCaretDown,
  FaPhone,
  FaMapMarkerAlt,
  FaEye,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaTrash,
  FaChartBar,
  FaPauseCircle,
  FaArchive,
  FaMoneyBillWave,
  FaUserPlus,
  FaCopy,
  FaLink,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { listDeals, hideDeal, listDealAppointmentsBatch, DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useSession, signOut } from 'next-auth/react';
import { clearAuthStorage } from '@/lib/api/client';
import { isBuyer, isSeller as isSellerInDeal, isAgent as isAgentInDeal } from '@/lib/utils/dealRole';
import { isBuyerPurchaseGuideStep6Completed } from '@/lib/utils/buyerProgress';
import { getDealBuyerDisplayName } from '@/lib/utils/dealBuyerDisplay';
import { apiClient, fetchFromBackend } from '@/lib/api/client';
import NotificationBell from '@/components/notifications/NotificationBell';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
import AgentNotificationBell from '@/components/notifications/AgentNotificationBell';
import AgentNavbar from '@/components/layout/AgentNavbar';
import PropertyOverviewModal from '@/components/deals/PropertyOverviewModal';
import AddInterestedBuyerModal from '@/components/leads/AddInterestedBuyerModal';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';
import { useRef } from 'react';
import { 
  format, 
  isToday, 
  isTomorrow, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isPast,
  isFuture,
  parseISO
} from 'date-fns';
import { el } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-indigo-100 text-indigo-800',
  CLOSED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CLOSED_PROPERTY_SOLD: 'bg-slate-200 text-slate-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Σχέδιο',
  ACTIVE: 'Ενεργό',
  CLOSED: 'Ολοκληρωμένο',
  CANCELLED: 'Ακυρωμένο',
  COMPLETED: 'Ολοκληρωμένο',
  CLOSED_PROPERTY_SOLD: 'Ακίνητο πουλήθηκε',
};

function getIsRentDeal(deal: DealRoom): boolean {
  const a = (deal.property as any)?.amenities;
  return !!(a && typeof a === 'object' && String(a.listingType || a.transactionType || '').toLowerCase() === 'rent');
}

function formatDealPrice(deal: DealRoom, amount?: number): string {
  const price = amount ?? Number(deal.property?.price ?? 0);
  const suffix = getIsRentDeal(deal) ? '/μήνα' : '';
  return `€${price.toLocaleString('el-GR')}${suffix}`;
}

/** 0.5% of accepted offer amount, or null if no accepted offer */
function getDealCommission(deal: DealRoom): number | null {
  const acceptedOffer = deal.offers?.find(o => o.status === 'ACCEPTED');
  if (!acceptedOffer) return null;
  const amount = Number(acceptedOffer.amount);
  if (isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 0.005);
}

type TabType = 'overview' | 'deals' | 'appointments' | 'pending' | 'properties' | 'referrals' | 'commissions';

interface Appointment {
  id: string;
  dealId: string;
  dealTitle?: string;
  startAt?: string;
  endAt?: string;
  date?: string;
  type?: string;
  status: string;
  professionalId?: string;
  source?: 'property' | 'deal';
  location?: string;
  professional?: {
    user: {
      name: string;
    };
  };
}

function DealsLayout({ className, children }: { className: string; children: React.ReactNode }) {
  return React.createElement('div', { className }, children);
}

/** Profile dropdown with its own state - avoids full page re-render when toggling */
function DealsProfileDropdown({ session, onSignOut, variant }: { session: any; onSignOut: () => Promise<void>; variant: 'seller' | 'buyer' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const isSeller = variant === 'seller';
  const btnClass = isSeller
    ? 'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
    : 'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800';
  const headBg = isSeller ? 'bg-gradient-to-r from-emerald-50 to-green-50' : 'bg-gradient-to-r from-slate-50 to-blue-50';
  const hoverBg = isSeller ? 'hover:from-emerald-50 hover:to-green-50' : 'hover:from-slate-50 hover:to-blue-50';
  const iconColor = isSeller ? 'text-green-700' : 'text-blue-700';
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={btnClass}>
        <FaUser className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50 overflow-hidden"
          >
            <div className={`px-4 py-2.5 ${headBg} border-b border-gray-100`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSeller ? 'bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-blue-800 to-slate-700'}`}>
                  <FaUser className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{(session?.user as any)?.name || 'Χρήστης'}</p>
                  <p className="text-[11px] text-gray-500 truncate">{(session?.user as any)?.email}</p>
                </div>
              </div>
            </div>
            <div className="py-1">
              {isSeller ? (
                <>
                  <Link href="/dashboard/seller" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-all duration-200 ${isSeller ? 'bg-green-50 group-hover:bg-green-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                      <FaCog className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                  </Link>
                  <Link href="/dashboard/seller" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-all duration-200 ${isSeller ? 'bg-green-50 group-hover:bg-green-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                      <FaChartBar className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Πίνακας Ελέγχου</span>
                  </Link>
                  <Link href="/about#faq" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-all duration-200 ${isSeller ? 'bg-green-50 group-hover:bg-green-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                      <FaQuestionCircle className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Συχνές Ερωτήσεις</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/buyer/profile?tab=settings" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                      <FaCog className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                  </Link>
                  <Link href="/buyer/profile?tab=favorites" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                      <FaHeart className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Αγαπημένα</span>
                  </Link>
                  <Link href="/buyer/profile?tab=faq" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                      <FaQuestionCircle className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Συχνές Ερωτήσεις</span>
                  </Link>
                </>
              )}
            </div>
            <div className="border-t border-gray-100" />
            <div className="py-1">
              <Link href="/" className={`flex items-center px-4 py-2.5 text-sm text-gray-700 ${hoverBg} transition-all duration-200 group`} onClick={() => setOpen(false)}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-all duration-200 ${isSeller ? 'bg-gray-100 group-hover:bg-gray-200' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                  <FaExchangeAlt className={`w-3.5 h-3.5 ${isSeller ? 'text-gray-600' : 'text-slate-600'}`} />
                </div>
                <span className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors">Αλλαγή Ρόλων</span>
              </Link>
              <button
                onClick={() => { onSignOut(); setOpen(false); }}
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
  );
}

function DealsPageContent() {
  const { status, isAuthenticated, userId } = useCurrentUser();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<DealRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [propertyAppointments, setPropertyAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dealTypeFilter, setDealTypeFilter] = useState<'SALE' | 'RENT'>('SALE');
  const [showCancelled, setShowCancelled] = useState(true);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [seenUpdateTrigger, setSeenUpdateTrigger] = useState(0); // Trigger re-render when items are marked as seen
  const [sellerProperties, setSellerProperties] = useState<any[]>([]);
  const [sellerPropertiesLoading, setSellerPropertiesLoading] = useState(false);
  const [propertiesSubTab, setPropertiesSubTab] = useState<'sale' | 'rent'>('sale');
  const [soldPropertiesExpanded, setSoldPropertiesExpanded] = useState(false);
  const [rentedPropertiesExpanded, setRentedPropertiesExpanded] = useState(false);
  const [archivedPropertiesExpanded, setArchivedPropertiesExpanded] = useState(false);
  const [archivedPropertyIds, setArchivedPropertyIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('archivedPropertyIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [overviewStatsExpanded, setOverviewStatsExpanded] = useState(false);
  const [propertyOverviewModal, setPropertyOverviewModal] = useState<{ id: string; title: string } | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [allAppointmentsListExpanded, setAllAppointmentsListExpanded] = useState(false);
  const [restoreRequestActionLoading, setRestoreRequestActionLoading] = useState<Record<string, boolean>>({});
  const [isAddBuyerModalOpen, setIsAddBuyerModalOpen] = useState(false);
  const [agentProperties, setAgentProperties] = useState<Array<{ id: string; title: string; city?: string; price?: number; coordinates?: { lat: number; lng: number }; status?: string; propertySold?: boolean; isSold?: boolean; isReserved?: boolean; amenities?: Record<string, unknown>; isRent?: boolean }>>([]);
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1);
  const [archivedDealIds, setArchivedDealIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('archivedDealIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [archivedDealsExpanded, setArchivedDealsExpanded] = useState(false);
  const [activeDealsExpanded, setActiveDealsExpanded] = useState(true);
  const [onHoldExpanded, setOnHoldExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [propertySoldToOtherExpanded, setPropertySoldToOtherExpanded] = useState(true);
  const [cancelledExpanded, setCancelledExpanded] = useState(true);
  const [otherDealsExpanded, setOtherDealsExpanded] = useState(true);
  const [expandedReferralClientId, setExpandedReferralClientId] = useState<string | null>(null);
  const [dismissedActivityIds, setDismissedActivityIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('dismissedActivityIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [dismissedPendingTaskIds, setDismissedPendingTaskIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('dismissedPendingTaskIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const dealsRequestRef = useRef(0);
  const sellerPropertiesRequestRef = useRef(0);
  // Avoid race: signOut -> status unauthenticated effect redirects before our intended redirect
  const skipUnauthenticatedRedirectRef = useRef(false);

  // Scroll handler for buyer/seller navbar: throttle + hysteresis to avoid
  // rapid re-renders when scrolling near the top (prevents "continuous reload" feeling)
  useEffect(() => {
    let ticking = false;
    const SCROLL_DOWN_THRESHOLD = 60;  // navbar solid when scrolled past this
    const SCROLL_UP_THRESHOLD = 40;    // navbar transparent when above this
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        let next: boolean;
        if (y > SCROLL_DOWN_THRESHOLD) next = true;
        else if (y < SCROLL_UP_THRESHOLD) next = false;
        else next = isScrolledRef.current; // hysteresis: keep previous between 40-60
        if (next !== isScrolledRef.current) {
          isScrolledRef.current = next;
          setIsScrolled(next);
        }
        ticking = false;
      });
    };
    handleScroll(); // set initial state
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent overscroll pull-to-refresh at top (avoids accidental page reload feel)
  useEffect(() => {
    const prev = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = prev; };
  }, []);

  // Get active tab from URL or default to 'overview'
  const activeTab = (searchParams?.get('tab') as TabType) || 'overview';

  // Track if user came from seller dashboard (for navbar/colors)
  const fromSeller = searchParams?.get('from') === 'seller';
  // Track if user came from agent dashboard (e.g. /agent/auth/login or any /agent page)
  const fromAgent = searchParams?.get('from') === 'agent';
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase();
  const isAgentSession = sessionRole === 'AGENT';
  const isSellerSession = sessionRole === 'SELLER';
  const fromSellerContext = fromSeller;
  const fromAgentContext = fromAgent;

  // Deals filtered by view: fromAgent→agent, fromSeller→seller, neither→buyer
  // Used across ALL sections: stats, calendar, activity, pending, progress
  const dealsInView = useMemo(() => {
    if (!userId) return [];
    if (fromAgentContext) return deals.filter(d => isAgentInDeal(d, userId));
    if (fromSellerContext) return deals.filter(d => isSellerInDeal(d, userId));
    return deals.filter(d => isBuyer(d, userId));
  }, [deals, userId, fromAgentContext, fromSellerContext]);
  const dealIdsInView = useMemo(() => new Set(dealsInView.map(d => d.id)), [dealsInView]);

  // Auto-detect agent context when navigating from any /agent page (referrer or sessionStorage)
  useEffect(() => {
    if (fromAgent || !userId) return;
    if (typeof window === 'undefined') return;
    const ref = document.referrer || '';
    const fromReferrer = isAgentSession && ref && (ref.includes('/agent') || ref.includes('/dashboard/agent'));
    const fromStorage = isAgentSession && sessionStorage.getItem('deals_cameFromAgent') === '1';
    if (!isAgentSession) {
      sessionStorage.removeItem('deals_cameFromAgent');
    }
    if (fromReferrer || fromStorage) {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('from')) {
        url.searchParams.set('from', 'agent');
        sessionStorage.removeItem('deals_cameFromAgent');
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [fromAgent, userId, router, isAgentSession]);

  // Auto-detect seller context when navigating from any /seller page (referrer or sessionStorage)
  useEffect(() => {
    if (fromSeller || fromAgent || !userId) return;
    if (typeof window === 'undefined') return;
    const ref = document.referrer || '';
    const fromReferrer = isSellerSession && ref && (ref.includes('/seller') || ref.includes('/dashboard/seller'));
    const fromStorage = isSellerSession && sessionStorage.getItem('deals_cameFromSeller') === '1';
    if (!isSellerSession) {
      sessionStorage.removeItem('deals_cameFromSeller');
    }
    if (fromReferrer || fromStorage) {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('from')) {
        url.searchParams.set('from', 'seller');
        sessionStorage.removeItem('deals_cameFromSeller');
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [fromSeller, fromAgent, userId, router, isSellerSession]);

  // Track seen items for notifications
  const getSeenAppointments = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('seenAppointments');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const getSeenPendingTasks = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('seenPendingTasks');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const markAppointmentsAsSeen = (appointmentIds: string[]) => {
    if (typeof window === 'undefined') return;
    const seen = getSeenAppointments();
    const hadNewItems = appointmentIds.some(id => !seen.has(id));
    appointmentIds.forEach(id => seen.add(id));
    localStorage.setItem('seenAppointments', JSON.stringify(Array.from(seen)));
    if (hadNewItems) {
      setSeenUpdateTrigger(prev => prev + 1); // Trigger re-render
    }
  };

  const markPendingTasksAsSeen = (taskIds: string[]) => {
    if (typeof window === 'undefined') return;
    const seen = getSeenPendingTasks();
    const hadNewItems = taskIds.some(id => !seen.has(id));
    taskIds.forEach(id => seen.add(id));
    localStorage.setItem('seenPendingTasks', JSON.stringify(Array.from(seen)));
    if (hadNewItems) {
      setSeenUpdateTrigger(prev => prev + 1); // Trigger re-render
    }
  };

  const getDismissedPendingTasks = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('dismissedPendingTasks');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const dismissPendingTask = (taskId: string) => {
    if (typeof window === 'undefined') return;
    const dismissed = getDismissedPendingTasks();
    dismissed.add(taskId);
    localStorage.setItem('dismissedPendingTasks', JSON.stringify(Array.from(dismissed)));
    markPendingTasksAsSeen([taskId]); // Also mark as seen so badge updates
    setSeenUpdateTrigger(prev => prev + 1);
    toast.success('Η εκκρεμότητα αφαιρέθηκε');
  };

  const archiveDeal = (dealId: string) => {
    setArchivedDealIds(prev => {
      const next = new Set(prev);
      next.add(dealId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('archivedDealIds', JSON.stringify(Array.from(next)));
      }
      return next;
    });
    toast.success('Η συναλλαγή αρχειοθετήθηκε');
  };

  const unarchiveDeal = (dealId: string) => {
    setArchivedDealIds(prev => {
      const next = new Set(prev);
      next.delete(dealId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('archivedDealIds', JSON.stringify(Array.from(next)));
      }
      return next;
    });
    toast.success('Η συναλλαγή ανακτήθηκε από το αρχείο');
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (skipUnauthenticatedRedirectRef.current) {
        return;
      }
      dealsRequestRef.current += 1;
      sellerPropertiesRequestRef.current += 1;
      setDeals([]);
      setSellerProperties([]);
      setAllAppointments([]);
      setPropertyAppointments([]);
      setNextCursor(undefined);
      setLoading(false);
      const returnTo = `/deals${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
      if (fromAgentContext) {
        router.push(`/agent/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      } else if (fromSellerContext) {
        router.push(`/seller/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      } else {
        router.push(`/buyer/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`);
      }
      return;
    }

    if (isAuthenticated && userId) {
      fetchDeals();
    }
  }, [status, isAuthenticated, userId, router, fromAgentContext, fromSellerContext, searchParams?.toString()]);

  // Refetch deals when page becomes visible (e.g. returning from deal room)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && userId) {
        fetchDeals();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, userId]);

  // Close role menu when clicking outside (profile menu handles its own click-outside)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch agent properties for AddInterestedBuyerModal (when in agent mode)
  useEffect(() => {
    const isAgent = (session?.user as any)?.role === 'AGENT';
    if ((!fromAgent && !isAgent) || !userId) return;
    const fetchAgentProperties = async () => {
      try {
        const res = await apiClient.get('/agent/properties');
        const list = Array.isArray(res.data) ? res.data : [];
        setAgentProperties(list.map((p: { id: string; title: string; city?: string; price?: number; coordinates?: { lat: number; lng: number }; status?: string; propertySold?: boolean; isSold?: boolean; isReserved?: boolean; amenities?: unknown; isRent?: boolean }) => ({
          id: p.id,
          title: p.title || `Ακίνητο ${p.id}`,
          city: p.city,
          price: p.price,
          coordinates: p.coordinates && typeof (p.coordinates as any)?.lat === 'number' ? p.coordinates as { lat: number; lng: number } : undefined,
          status: p.status,
          propertySold: p.propertySold,
          isSold: p.isSold,
          isReserved: p.isReserved,
          amenities: p.amenities as Record<string, unknown> | undefined,
          isRent: p.isRent,
        })));
      } catch (err) {
        setAgentProperties([]);
      }
    };
    fetchAgentProperties();
  }, [fromAgent, session?.user, userId]);

  // Fetch seller properties when in seller mode (for header count and properties tab)
  useEffect(() => {
    if (!fromSellerContext || !isAuthenticated || !userId) {
      setSellerProperties([]);
      setSellerPropertiesLoading(false);
      return;
    }
    const fetchSellerProperties = async () => {
      const requestId = ++sellerPropertiesRequestRef.current;
      setSellerPropertiesLoading(true);
      try {
        const response = await fetchFromBackend('/seller/leads');
        const data = await response.json();
        if (requestId !== sellerPropertiesRequestRef.current) return;
        if (response.ok) {
          setSellerProperties(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (requestId !== sellerPropertiesRequestRef.current) return;
        console.error('Error fetching seller properties:', err);
        toast.error('Αποτυχία φόρτωσης ακινήτων');
      } finally {
        if (requestId !== sellerPropertiesRequestRef.current) return;
        setSellerPropertiesLoading(false);
      }
    };
    fetchSellerProperties();
  }, [fromSellerContext, isAuthenticated, userId]);

  const handleSignOut = async () => {
    clearAuthStorage();
    skipUnauthenticatedRedirectRef.current = true;
    await signOut({ redirect: false });
    router.push('/buyer');
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

  const toggleArchiveProperty = (propertyId: string) => {
    setArchivedPropertyIds((prev) => {
      const next = new Set(prev);
      const wasArchived = next.has(propertyId);
      if (wasArchived) {
        next.delete(propertyId);
        toast.success('Το ακίνητο ανακτήθηκε από το αρχείο');
      } else {
        next.add(propertyId);
        toast.success('Το ακίνητο αρχειοθετήθηκε');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('archivedPropertyIds', JSON.stringify([...next]));
      }
      return next;
    });
  };

  const handleRestoreRequestResponse = async (dealId: string, action: 'APPROVE' | 'REJECT') => {
    const key = `${dealId}:${action}`;
    setRestoreRequestActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await apiClient.post(`/deals/${dealId}/restore-interest/respond`, { action });
      toast.success(action === 'APPROVE' ? 'Η επαναφορά εγκρίθηκε' : 'Το αίτημα απορρίφθηκε');
      await fetchDeals();
      if (showSellerStyle) {
        const response = await fetchFromBackend('/seller/leads');
        const data = await response.json();
        if (response.ok) {
          setSellerProperties(Array.isArray(data) ? data : []);
        }
      }
    } catch (error: any) {
      console.error('Error responding to restore request:', error);
      toast.error(error?.message || 'Αποτυχία απάντησης στο αίτημα επαναφοράς');
    } finally {
      setRestoreRequestActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Check if user is seller; show seller style when seller OR when came from seller dashboard
  const isSeller = (session?.user as any)?.role === 'SELLER';
  const showSellerStyle = isSeller || fromSellerContext;

  // Check if user is agent; show agent style when agent OR when came from agent dashboard (?from=agent)
  const isAgentRole = (session?.user as any)?.role === 'AGENT';
  const showAgentStyle = isAgentRole || fromAgentContext;

  const getSellerPropertyListingType = (property: any): 'sale' | 'rent' => {
    if (typeof property?.isRent === 'boolean') {
      return property.isRent ? 'rent' : 'sale';
    }

    const candidates = [
      property?.listingType,
      property?.transactionType,
      property?.type,
      property?.purpose,
      property?.amenities?.listingType,
      property?.amenities?.transactionType,
      property?.amenities?.type,
      property?.amenities?.purpose,
    ];

    for (const candidate of candidates) {
      const normalized = String(candidate || '').toLowerCase().trim();
      if (!normalized) continue;
      if (
        normalized.includes('rent') ||
        normalized.includes('lease') ||
        normalized.includes('for_rent') ||
        normalized.includes('for-rent') ||
        normalized.includes('ενοικ')
      ) {
        return 'rent';
      }
      if (
        normalized.includes('sale') ||
        normalized.includes('sell') ||
        normalized.includes('for_sale') ||
        normalized.includes('for-sale') ||
        normalized.includes('πωλ')
      ) {
        return 'sale';
      }
    }

    return 'sale';
  };

  useEffect(() => {
    if (activeTab !== 'properties' || !showSellerStyle || sellerPropertiesLoading) return;

    const forSaleCount = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'sale').length;
    const forRentCount = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'rent').length;

    if (propertiesSubTab === 'sale' && forSaleCount === 0 && forRentCount > 0) {
      setPropertiesSubTab('rent');
      return;
    }
    if (propertiesSubTab === 'rent' && forRentCount === 0 && forSaleCount > 0) {
      setPropertiesSubTab('sale');
    }
  }, [activeTab, showSellerStyle, sellerPropertiesLoading, sellerProperties, propertiesSubTab]);

  // Helper to build deal links with from=seller when in seller context
  const dealHref = (id: string, tab?: string) => {
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (fromSellerContext) params.set('from', 'seller');
    if (fromAgentContext) params.set('from', 'agent');
    const qs = params.toString();
    return `/deals/${id}${qs ? `?${qs}` : ''}`;
  };

  const fetchDeals = async (cursor?: string, autoLoadAll: boolean = false) => {
    const requestId = ++dealsRequestRef.current;
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let allDeals: DealRoom[] = [];
      let currentCursor = cursor;
      let hasMore = true;

      // Load all deals in a loop if autoLoadAll is true
      while (hasMore) {
        const response = await listDeals({ cursor: currentCursor, limit: 100 });
        
        const dealsInfo = response.items.map(d => ({
          id: d.id,
          propertyId: d.propertyId,
          status: d.status,
          property: d.property ? {
            id: d.property.id,
            title: d.property.title,
            city: d.property.city
          } : null,
          participants: d.participants?.map(p => ({ userId: p.userId, role: p.role, email: p.user?.email }))
        }));
        
        console.log(`[fetchDeals] Fetched ${response.items.length} deals, nextCursor: ${response.nextCursor || 'none'}`, {
          userId,
          deals: dealsInfo
        });
        
        // Also log each deal separately for easier debugging
        dealsInfo.forEach((deal, idx) => {
          console.log(`[fetchDeals] Deal ${idx + 1}:`, deal);
        });

        if (requestId !== dealsRequestRef.current) return;
        
        allDeals = [...allDeals, ...response.items];
        currentCursor = response.nextCursor;
        hasMore = !!response.nextCursor && autoLoadAll;
        
        // If not auto-loading, break after first batch
        if (!autoLoadAll) {
          break;
        }
      }

      // Update state
      if (requestId !== dealsRequestRef.current) return;
      if (cursor) {
        setDeals((prev) => {
          const updated = [...prev, ...allDeals];
          console.log(`[fetchDeals] Total deals after loading more: ${updated.length}`);
          return updated;
        });
      } else {
        setDeals(allDeals);
        console.log(`[fetchDeals] Total deals loaded: ${allDeals.length}`);
      }
      setNextCursor(currentCursor);

      // Fetch appointments for deals
      if (allDeals.length > 0 && userId) {
        if (cursor) {
          // When loading more, fetch appointments only for new deals
          await Promise.all([
            fetchPropertyAppointments(allDeals),
            fetchAllDealAppointments(allDeals)
          ]);
        } else {
          // On initial load, fetch appointments for all deals
          await Promise.all([
            fetchPropertyAppointments(allDeals),
            fetchAllDealAppointments(allDeals)
          ]);
        }
      }
    } catch (error: any) {
      if (requestId !== dealsRequestRef.current) return;
      console.error('Error fetching deals:', error);
      toast.error(error.message || 'Αποτυχία φόρτωσης συναλλαγών');
    } finally {
      if (requestId !== dealsRequestRef.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchPropertyAppointments = async (dealsList: DealRoom[]) => {
    try {
      const appointmentsPromises = dealsList.map(async (deal) => {
        if (!deal.propertyId || !userId) return [];
        // For seller/agent: need buyerId from deal; for buyer: use userId
        const buyerIdParam = ((fromSellerContext || fromAgentContext) && deal.buyerId) ? deal.buyerId : userId;
        try {
          const response = await apiClient.get('/seller/appointments', {
            params: {
              propertyId: deal.propertyId,
              buyerId: buyerIdParam,
            },
          });
          return (response.data.appointments || []).map((apt: any) => ({
            ...apt,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            type: 'VIEWING',
            source: 'property' as const,
          }));
        } catch (error) {
          console.error(`Error fetching appointments for deal ${deal.id}:`, error);
          return [];
        }
      });

      const appointmentsResults = await Promise.all(appointmentsPromises);
      setPropertyAppointments(appointmentsResults.flat());
    } catch (error) {
      console.error('Error fetching property appointments:', error);
    }
  };

  const fetchAllDealAppointments = async (dealsList: DealRoom[]) => {
    if (dealsList.length === 0) {
      setAllAppointments([]);
      return;
    }
    try {
      const batch = await listDealAppointmentsBatch(dealsList.map((d) => d.id));
      const results = dealsList.flatMap((deal) =>
        (batch[deal.id] || []).map((apt: any) => ({
          ...apt,
          dealId: deal.id,
          dealTitle: deal.property?.title,
          source: 'deal' as const,
        }))
      );
      setAllAppointments(results);
    } catch (error) {
      console.error('Error fetching deal appointments:', error);
    }
  };

  const loadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchDeals(nextCursor, true); // Auto-load all remaining deals
    }
  };

  // Calculate stats (pendingTasks will be calculated after pendingTasks useMemo)
  const stats = useMemo(() => {
    // Use dealsInView: already filtered by fromAgent/fromSeller (buyer when neither)
    const baseDeals = dealsInView;

    // Completed/closed: only COMPLETED or CLOSED (never count as active)
    const completedDeals = baseDeals.filter(d => d.status === 'COMPLETED' || d.status === 'CLOSED');
    const propertyIdsWithCompleted = new Set(completedDeals.map(d => d.propertyId));

    // Active: ONLY ACTIVE or DRAFT, exclude properties with completed deal, explicitly exclude any completed status
    const activeDeals = baseDeals.filter(d => {
      if (d.status !== 'ACTIVE' && d.status !== 'DRAFT') return false;
      if (propertyIdsWithCompleted.has(d.propertyId)) return false;
      return true;
    }).length;

    const closedDeals = completedDeals.length;
    const cancelledDeals = baseDeals.filter(d => d.status === 'CANCELLED').length;
    
    const allAppts = dealIdsInView.size > 0
      ? [...propertyAppointments, ...allAppointments].filter(apt => apt.dealId && dealIdsInView.has(apt.dealId))
      : [];
    const upcomingAppts = allAppts.filter(apt => {
      const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
      return aptDate && isFuture(aptDate) && (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED');
    }).length;
    
    const completedAppts = allAppts.filter(apt => {
      const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
      return aptDate && isPast(aptDate) && apt.status === 'COMPLETED';
    }).length;

    return {
      activeDeals,
      closedDeals,
      cancelledDeals,
      upcomingAppts,
      completedAppts,
      pendingTasks: 0, // Will be updated by pendingTasksCount
    };
  }, [dealsInView, dealIdsInView, propertyAppointments, allAppointments, userId]);

  // Combine all appointments - filter to only those from deals in current view (buyer/seller/agent)
  const combinedAppointments = useMemo(() => {
    const all = [...propertyAppointments, ...allAppointments];
    const filtered = dealIdsInView.size > 0
      ? all.filter(apt => apt.dealId && dealIdsInView.has(apt.dealId))
      : [];
    return filtered.sort((a, b) => {
      const dateA = a.startAt ? parseISO(a.startAt).getTime() : (a.date ? parseISO(a.date).getTime() : 0);
      const dateB = b.startAt ? parseISO(b.startAt).getTime() : (b.date ? parseISO(b.date).getTime() : 0);
      return dateA - dateB;
    });
  }, [propertyAppointments, allAppointments, dealIdsInView]);

  // Calendar data for full month
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return days.map(day => {
      const dayAppointments = combinedAppointments.filter(apt => {
        const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
        return aptDate && isSameDay(aptDate, day);
      });

      return {
        date: day,
        appointments: dayAppointments,
      };
    });
  }, [calendarMonth, combinedAppointments]);

  // Get appointment type label
  const getAppointmentTypeLabel = (apt: Appointment, deal: DealRoom | undefined) => {
    if (apt.type === 'VIEWING' || apt.source === 'property') {
      return 'Επίσκεψη Ακινήτου';
    }
    
    if (deal) {
      const notaryRequest = deal.requests?.find(
        r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professionalId === apt.professionalId
      );
      const lawyerRequest = deal.requests?.find(
        r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.professionalId === apt.professionalId
      );
      
      if (apt.type === 'IN_PERSON' && notaryRequest) {
        return 'Υπογραφή Συμβολαίων';
      }
      if (apt.type === 'IN_PERSON' && lawyerRequest) {
        return 'Ραντεβού με Δικηγόρο';
      }
      if (apt.type === 'ONLINE' && lawyerRequest) {
        return 'Συναντήσεις με Δικηγόρο (Διαδικτυακά)';
      }
      if (apt.type === 'ONLINE' && notaryRequest) {
        return 'Συναντήσεις με Συμβολαιογράφο (Διαδικτυακά)';
      }
    }
    
    return 'Ραντεβού';
  };

  // Get appointment status color
  const getAppointmentStatusColor = (status: string) => {
    if (status === 'CONFIRMED' || status === 'ACCEPTED') {
      return 'bg-green-500';
    }
    if (status === 'REQUESTED' || status === 'PENDING') {
      return 'bg-orange-500';
    }
    if (status === 'CANCELLED') {
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  // Deal has "locked" the property (deposit paid or past negotiation - another buyer committed)
  const hasLockedProperty = (d: DealRoom): boolean => {
    const hasAcceptedOffer = d.offers?.some(o => o.status === 'ACCEPTED');
    const hasLawyer = !!d.lawyerApprovedSellerDocumentsAt || d.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
    return !!(hasAcceptedOffer && hasLawyer);
  };

  // Filter deals - applies to the ENTIRE page (all tabs: overview, deals, appointments, etc.)
  // When from=agent in URL: only show deal rooms where user is AGENT
  // When from=seller in URL: only show deal rooms where user is SELLER
  // When neither (buyer view): only show deal rooms where user is BUYER
  const filteredDeals = useMemo(() => {
    let filtered = deals;

    if (!userId) return { active: [], onHold: [], closedBecauseSold: [], completed: [], propertySoldToOther: [], cancelled: [], cancelledCount: 0, all: [] };

    if (fromAgentContext) {
      filtered = filtered.filter(d => isAgentInDeal(d, userId));
    } else if (fromSellerContext) {
      filtered = filtered.filter(d => isSellerInDeal(d, userId));
    } else {
      // Buyer view: no from=agent, no from=seller → only buyer's deals
      filtered = filtered.filter(d => isBuyer(d, userId));
    }

    // When seller or agent view + deals tab: filter by deal type (sale vs rent)
    if ((fromSellerContext || fromAgentContext) && (searchParams?.get('tab') === 'deals' || activeTab === 'deals')) {
      filtered = filtered.filter(d => {
        const isRent = getIsRentDeal(d);
        return dealTypeFilter === 'RENT' ? isRent : !isRent;
      });
    }

    // Property sold: another deal for same property completed → these deals are effectively closed
    const hasCompletedDealForProperty = (propertyId: string, excludeDealId: string) =>
      filtered.some(o => o.propertyId === propertyId && o.id !== excludeDealId && (o.status === 'COMPLETED' || o.status === 'CLOSED'));

    // Closed because property sold: status CLOSED_PROPERTY_SOLD, propertySoldToAnother flag, or ACTIVE/DRAFT but property has completed deal
    const closedBecauseSold = filtered.filter(d =>
      d.status === 'CLOSED_PROPERTY_SOLD' ||
      d.propertySoldToAnother === true ||
      ((d.status === 'ACTIVE' || d.status === 'DRAFT') && hasCompletedDealForProperty(d.propertyId, d.id))
    );

    // Active = ACTIVE/DRAFT, not closed because sold, not on hold
    const activeRaw = filtered.filter(d =>
      (d.status === 'ACTIVE' || d.status === 'DRAFT') && !closedBecauseSold.includes(d)
    );
    // Σε αναμονή: (α) άλλο deal του ίδιου χρήστη στο filtered με «κλειδωμένο» ακίνητο (seller βλέπει πολλούς αγοραστές)
    // (β) API blockedByPriorDeposit — άλλος αγοραστής έχει προκαταβολή (απαραίτητο για buyer/agent που δεν βλέπουν τα άλλα deals)
    const onHoldByPeerLock = activeRaw.filter((d) =>
      filtered.some(
        (other) =>
          other.propertyId === d.propertyId && other.id !== d.id && hasLockedProperty(other)
      )
    );
    const onHoldByPriorDeposit = activeRaw.filter((d) => !!d.blockedByPriorDeposit);
    const onHoldIdSet = new Set<string>();
    onHoldByPeerLock.forEach((d) => onHoldIdSet.add(d.id));
    onHoldByPriorDeposit.forEach((d) => onHoldIdSet.add(d.id));
    const onHold = activeRaw.filter((d) => onHoldIdSet.has(d.id));
    const active = activeRaw.filter((d) => !onHoldIdSet.has(d.id));

    // Ολοκληρωμένες:
    // - Seller: include CLOSED/COMPLETED + closedBecauseSold (ο πωλητής ολοκλήρωσε πώληση/ενοικίαση με άλλον)
    // - Agent/Buyer: include μόνο CLOSED/COMPLETED
    const completed = fromSellerContext
      ? filtered.filter(d =>
          d.status === 'COMPLETED' || d.status === 'CLOSED' || closedBecauseSold.includes(d)
        )
      : filtered.filter(d => d.status === 'COMPLETED' || d.status === 'CLOSED');
    const cancelled = filtered.filter(d => d.status === 'CANCELLED');
    // Deals όπου το ακίνητο πουλήθηκε/ενοικιάστηκε σε άλλον αγοραστή
    // (agent + buyer τα βλέπουν σε ξεχωριστή κατηγορία, όχι στις ολοκληρωμένες)
    const isBuyerView = !fromSellerContext && !fromAgentContext;
    const propertySoldToOther = (fromAgentContext || isBuyerView) ? closedBecauseSold : [];

    return {
      active,
      onHold,
      closedBecauseSold,
      completed,
      propertySoldToOther,
      cancelled: showCancelled ? cancelled : [],
      cancelledCount: cancelled.length,
      all: filtered,
    };
  }, [deals, dealTypeFilter, showCancelled, fromSellerContext, fromAgentContext, userId, activeTab, searchParams]);

  // Archived deals (completed or closed because sold) - filtered by current view
  const archivedDealsInView = useMemo(() => {
    if (archivedDealIds.size === 0) return [];
    let list = deals.filter(d => archivedDealIds.has(d.id));
    if (fromAgentContext && userId) {
      list = list.filter(d => isAgentInDeal(d, userId));
      if (activeTab === 'deals' && (searchParams?.get('tab') === 'deals' || true)) {
        list = list.filter(d => (dealTypeFilter === 'RENT' ? getIsRentDeal(d) : !getIsRentDeal(d)));
      }
    } else if (fromSellerContext && userId) {
      list = list.filter(d => isSellerInDeal(d, userId));
      if (activeTab === 'deals' && (searchParams?.get('tab') === 'deals' || true)) {
        list = list.filter(d => (dealTypeFilter === 'RENT' ? getIsRentDeal(d) : !getIsRentDeal(d)));
      }
    } else if (userId) {
      // Buyer view (no from=agent, no from=seller): only show archived deals where user is buyer
      list = list.filter(d => isBuyer(d, userId));
    }
    return list;
  }, [deals, archivedDealIds, fromSellerContext, fromAgentContext, userId, activeTab, dealTypeFilter, searchParams]);

  // Seller/agent deals by type (for sub-tab counts)
  const sellerDealsByType = useMemo(() => {
    if (!fromSellerContext && !showAgentStyle) return { saleCount: 0, rentCount: 0 };
    if (!userId) return { saleCount: 0, rentCount: 0 };
    const relevantDeals = showAgentStyle
      ? deals.filter(d => isAgentInDeal(d, userId))
      : deals.filter(d => isSellerInDeal(d, userId));
    const saleCount = relevantDeals.filter(d => !getIsRentDeal(d)).length;
    const rentCount = relevantDeals.filter(d => getIsRentDeal(d)).length;
    return { saleCount, rentCount };
  }, [deals, fromSellerContext, showAgentStyle, userId]);

  // Pending tasks
  // Helper functions to check step completion (matching BuyersPurchaseGuide logic)
  const isStep1Completed = (deal: DealRoom): boolean => {
    const step1Skipped = typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true';
    if (step1Skipped) return true;
    
    // Check if there's a confirmed appointment that has passed
    const hasPastConfirmedAppointment = deal.appointments?.some(
      a => a.status === 'CONFIRMED' && new Date(a.startAt) < new Date()
    ) || false;
    
    return hasPastConfirmedAppointment;
  };

  const isBasicDocumentsApproved = (deal: DealRoom): boolean => {
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

  const getCurrentStepForDeal = (deal: DealRoom): number => {
    if (!userId) return 0;
    
    // Load decisions from sessionStorage
    const interestDecision = typeof window !== 'undefined' 
      ? sessionStorage.getItem(`interestDecision_${deal.id}`) 
      : null;
    const step1Skipped = typeof window !== 'undefined' && 
      sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true';
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
    const step1Completed = isStep1Completed(deal);
    
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
    const basicDocumentsApproved = isBasicDocumentsApproved(deal);
    
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

    const hasNotary = deal.requests?.some(
      r => r.status === 'ACCEPTED' && r.type === 'NOTARY'
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

  // Seller's 7 steps - mirrors SellersPurchaseGuide logic
  const SELLER_SKIP_LAWYER_KEY = (dealId: string) => `deal-${dealId}-seller-skipped-lawyer`;
  const getCurrentStepForSeller = (deal: DealRoom, dealAppointments?: Array<{ status: string; endAt?: string; type?: string }>): { step: number; completedSteps: number; totalSteps: number } => {
    const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId || userId;
    const sellerSkippedLawyer = typeof window !== 'undefined' && localStorage.getItem(SELLER_SKIP_LAWYER_KEY(deal.id)) === 'true';

    const hasLawyer = !!sellerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId);
    const hasEngineer = !!sellerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerId);
    const hasAcceptedOffer = deal.offers?.some(o => o.status === 'ACCEPTED');
    const engineerApproved = !!deal.engineerApprovedSellerDocumentsAt;
    const lawyerApproved = !!deal.lawyerApprovedSellerDocumentsAt;
    const hasNotaryApproval = !!deal.notaryApprovedDocumentsAt || (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true');
    const signingApt = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');

    const allStep1Appointments = [...(deal.appointments || []), ...(dealAppointments || [])];
    const isStep1Completed = (): boolean => {
      if (deal.buyerSkippedViewingAt || deal.buyerConfirmedInterestAt) return true;
      if (hasLawyer && hasAcceptedOffer) return true;
      const hasPendingRequest = allStep1Appointments.some(a => a.status === 'REQUESTED' || a.status === 'PENDING');
      if (hasPendingRequest) return false;
      const hasPastDealAppointment = allStep1Appointments.some(a => a.status === 'CONFIRMED' && a.endAt && new Date(a.endAt) < new Date());
      return !!hasPastDealAppointment;
    };
    const isStep2Completed = () => hasAcceptedOffer;
    const isStep3Completed = () => !!(hasLawyer && hasEngineer) || !!(hasEngineer && sellerSkippedLawyer);
    const isStep4Completed = (): boolean => {
      if (hasNotaryApproval) return true;
      if (!engineerApproved) return false;
      if (sellerSkippedLawyer || !hasLawyer) return true;
      return lawyerApproved;
    };
    const isStep5Completed = () => !!hasNotaryApproval;
    const isStep6Completed = () => !!signingApt && new Date(signingApt.endAt) <= new Date();
    const isStep7Completed = () => !!(deal.sellerSigningConfirmed || deal.status === 'CLOSED');

    const stepStatus = [isStep1Completed(), isStep2Completed(), isStep3Completed(), isStep4Completed(), isStep5Completed(), isStep6Completed(), isStep7Completed()];
    const completedSteps = stepStatus.filter(Boolean).length;
    const totalSteps = 7;

    let currentStep = 1;
    if (!isStep1Completed()) currentStep = 1;
    else if (!isStep2Completed()) currentStep = 2;
    else if (!isStep3Completed()) currentStep = 3;
    else if (!isStep4Completed()) currentStep = 4;
    else if (!isStep5Completed()) currentStep = 5;
    else if (!isStep6Completed()) currentStep = 6;
    else if (!isStep7Completed()) currentStep = 7;
    else currentStep = 8; // All done

    return { step: currentStep, completedSteps, totalSteps };
  };

  const SELLER_STEP_TITLES: Record<number, string> = {
    1: 'Διαχείριση Επισκεψής',
    2: 'Αποδοχή Προσφοράς',
    3: 'Επιλογή Επαγγελματιών',
    4: 'Συλλογή Εγγράφων',
    5: 'Έγκριση Συμβολαιογράφου',
    6: 'Υπογραφή Συμβολαίων',
    7: 'Επιβεβαίωση Ολοκλήρωσης',
    8: 'Ολοκληρώθηκε',
  };

  const BUYER_STEP_TITLES: Record<number, string> = {
    1: 'Κλείσιμο ραντεβού',
    2: 'Επιβεβαίωση ενδιαφέροντος',
    3: 'Επιλογή Δικηγόρου',
    4: 'Πληρωμή Προκαταβολής',
    5: 'Διαδικασία με Δικηγόρο',
    6: 'Επιλογή Συμβολαιογράφου',
    7: 'Διαδικασία με Συμβολαιογράφο',
    8: 'Υπογραφή Συμβολαίων',
    9: 'Επιβεβαίωση Ολοκλήρωσης',
    10: 'Ολοκληρώθηκε',
  };

  const pendingTasks = useMemo(() => {
    const tasks: Array<{
      id: string;
      title: string;
      type: 'document' | 'appointment' | 'professional' | 'step' | 'restore';
      dealId: string;
      dealTitle?: string;
      href: string;
      actionType?: 'APPROVE' | 'REJECT';
    }> = [];

    dealsInView.forEach((deal) => {
      // Check if user is buyer for this deal
      const isBuyerRole = userId ? isBuyer(deal, userId) : false;
      
      if (isBuyerRole && (deal.status === 'ACTIVE' || deal.status === 'DRAFT')) {
        const currentStep = getCurrentStepForDeal(deal);
        
        // Step 1: Book Appointment – Βήμα 1 ολοκληρώθηκε → εκκρεμότητα για βήμα 2, κλπ
        if (currentStep === 1) {
          const step1Skipped = typeof window !== 'undefined' && 
            sessionStorage.getItem(`step1Skipped_${deal.id}`) === 'true';
          
          if (!step1Skipped) {
            tasks.push({
              id: `step1-${deal.id}`,
              title: 'Κλείστε ραντεβού για το ακίνητο ή προχωρήστε χωρίς ραντεβού (Βήμα 1)',
              type: 'step',
              dealId: deal.id,
              dealTitle: deal.property?.title,
              href: dealHref(deal.id, 'appointments'),
            });
          }
        }
        
        // Step 2: Confirm Interest – ολοκλήρωσε βήμα 1 → πρέπει να επιβεβαιώσει ενδιαφέρον
        if (currentStep === 2) {
          tasks.push({
            id: `step2-${deal.id}`,
            title: 'Επιβεβαιώστε το ενδιαφέρον σας για να συνεχίσετε (Βήμα 2)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'actions'),
          });
        }
        
        // Step 3: Choose Lawyer
        if (currentStep === 3) {
          tasks.push({
            id: `step3-${deal.id}`,
            title: 'Επιλέξτε Δικηγόρο για τη συναλλαγή για να συνεχίσετε (Βήμα 3)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'professionals'),
          });
        }
        
        // Step 4: Pay Deposit
        if (currentStep === 4) {
          tasks.push({
            id: `step4-${deal.id}`,
            title: 'Πληρώστε την προκαταβολή για να προχωρήσει η συναλλαγή (Βήμα 4)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'actions'),
          });
        }
        
        // Step 5: Lawyer Process
        if (currentStep === 5) {
          tasks.push({
            id: `step5-${deal.id}`,
            title: 'Ολοκληρώστε τα έγγραφα και τις ενέργειες με τον δικηγόρο σας (Βήμα 5)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'documents'),
          });
        }
        
        // Step 6: Choose Notary
        if (currentStep === 6) {
          tasks.push({
            id: `step6-${deal.id}`,
            title: 'Επιλέξτε Συμβολαιογράφο για τη συναλλαγή για να συνεχίσετε (Βήμα 6)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'professionals'),
          });
        }
        
        // Step 7: Notary Process
        if (currentStep === 7) {
          tasks.push({
            id: `step7-${deal.id}`,
            title: 'Αναμονή έγκρισης εγγράφων από τον συμβολαιογράφο – ελέγξτε την πρόοδο (Βήμα 7)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'documents'),
          });
        }
        
        // Step 8: Final Signing
        if (currentStep === 8) {
          tasks.push({
            id: `step8-${deal.id}`,
            title: 'Ολοκληρώστε την υπογραφή των συμβολαίων (Βήμα 8)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'appointments'),
          });
        }
        
        // Step 9: Confirm Signing Completion
        if (currentStep === 9) {
          tasks.push({
            id: `step9-${deal.id}`,
            title: 'Επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν επιτυχώς (Βήμα 9)',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'actions'),
          });
        }
      }

      // Seller: pending step from Οδηγός Πώλησης Ακινήτου (SellersPurchaseGuide)
      if (showSellerStyle && userId && isSellerInDeal(deal, userId) && (deal.status === 'ACTIVE' || deal.status === 'DRAFT')) {
        const dealAppts = combinedAppointments.filter(a => a.dealId === deal.id);
        const { step: sellerStep } = getCurrentStepForSeller(deal, dealAppts);
        if (sellerStep >= 1 && sellerStep <= 7) {
          const sellerStepTasks: Array<{ title: string; href: string }> = [
            { title: 'Διαχείριση αιτήματος επισκεψής – εγκρίνετε ή απορρίψτε το ραντεβού προβολής', href: dealHref(deal.id, 'appointments') },
            { title: 'Αποδοχή προσφοράς – δείτε την προσφορά του αγοραστή και κάντε αντιπρόταση', href: dealHref(deal.id, 'overview') },
            { title: 'Επιλογή δικηγόρου και μηχανικού – επιλέξτε τους επαγγελματίες σας', href: dealHref(deal.id, 'professionals') },
            { title: 'Συλλογή εγγράφων – ανεβάστε τα απαιτούμενα έγγραφα', href: dealHref(deal.id, 'documents') },
            { title: 'Αναμονή έγκρισης συμβολαιογράφου – περιμένετε την έγκριση των εγγράφων', href: dealHref(deal.id, 'documents') },
            { title: 'Υπογραφή συμβολαίων – κανονίστε το ραντεβού υπογραφής', href: dealHref(deal.id, 'overview') },
            { title: 'Επιβεβαίωση ολοκλήρωσης – επιβεβαιώστε ότι τα συμβολαία υπογράφηκαν', href: dealHref(deal.id, 'overview') },
          ];
          const task = sellerStepTasks[sellerStep - 1];
          if (task) {
            tasks.push({
              id: `seller-step${sellerStep}-${deal.id}`,
              title: task.title,
              type: 'step',
              dealId: deal.id,
              dealTitle: deal.property?.title,
              href: task.href,
            });
          }
        }

        // Documents requested from seller
        const sellerPendingDocs = deal.documents?.filter(
          d => d.status === 'REQUESTED' && d.requestedFromRole === 'SELLER'
        ) || [];
        sellerPendingDocs.forEach((doc) => {
          tasks.push({
            id: `doc-seller-${doc.id}`,
            title: `Ανέβασε έγγραφο: ${doc.category}`,
            type: 'document',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'documents'),
          });
        });
      }

      if (showSellerStyle && userId && isSellerInDeal(deal, userId) && deal.status === 'CANCELLED' && deal.restoreRequest?.status === 'PENDING') {
        tasks.push({
          id: `restore-approve-${deal.id}`,
          title: 'Ο αγοραστής/ενοικιαστής ζήτησε επαναφορά αυτής της ακυρωμένης συναλλαγής. Εγκρίνετε;',
          type: 'restore',
          dealId: deal.id,
          dealTitle: deal.property?.title,
          href: dealHref(deal.id, 'overview'),
          actionType: 'APPROVE',
        });
      }

      // Documents pending upload (for buyer) – επαγγελματίας ζήτησε έγγραφο → εκκρεμότητα
      const pendingDocs = deal.documents?.filter(
        d => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
      ) || [];
      pendingDocs.forEach((doc) => {
        const requesterId = (doc as { requestedById?: string }).requestedById;
        const buyerLawyer = deal.requests?.find(
          r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
        );
        const buyerNotary = deal.requests?.find(
          r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId
        );
        const lawyerUserId = (buyerLawyer as { professional?: { userId?: string; user?: { id?: string } } })?.professional?.userId
          ?? (buyerLawyer as { professional?: { user?: { id?: string } } })?.professional?.user?.id;
        const notaryUserId = (buyerNotary as { professional?: { userId?: string; user?: { id?: string } } })?.professional?.userId
          ?? (buyerNotary as { professional?: { user?: { id?: string } } })?.professional?.user?.id;
        let requesterLabel = 'Ο επαγγελματίας σας';
        if (requesterId && lawyerUserId && requesterId === lawyerUserId) {
          requesterLabel = 'Ο δικηγόρος σας';
        } else if (requesterId && notaryUserId && requesterId === notaryUserId) {
          requesterLabel = 'Ο συμβολαιογράφος σας';
        }
        const isAction = doc.category.startsWith('[ΕΝΕΡΓΕΙΑ]');
        const actionOrDocName = isAction ? doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim() : doc.category;
        const docTitle = isAction
          ? `${requesterLabel} ζήτησε την «${actionOrDocName}» ενέργεια. Μπείτε να την ολοκληρώσετε.`
          : `${requesterLabel} ζήτησε το «${actionOrDocName}» έγγραφο. Μπείτε να το ανεβάσετε.`;
        tasks.push({
          id: `doc-${doc.id}`,
          title: docTitle,
          type: 'document',
          dealId: deal.id,
          dealTitle: deal.property?.title,
          href: dealHref(deal.id, 'documents'),
        });
      });

      // Rent: Ενοικιαστής – ο ιδιοκτήτης ειδοποίησε για έγγραφο στο Gov.gr, πρέπει να υπογράψει
      if (userId && isBuyerRole && (deal.status === 'ACTIVE' || deal.status === 'DRAFT')) {
        const amenities = (deal.property as any)?.amenities;
        const isRent = amenities && typeof amenities === 'object' &&
          String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
        const landlordNotifiedGovGr = !!(deal.rentSigningMetadata as any)?.landlordNotifiedTenantGovGrAt;
        const tenantSignedApproved = deal.documents?.some(d =>
          d.category.toLowerCase().includes('υπογεγραμμένο') &&
          (d as { uploadedById?: string }).uploadedById === deal.buyerId &&
          d.status === 'APPROVED'
        );
        const rentContractSigned = typeof window !== 'undefined' && sessionStorage.getItem(`rentContractSigned_${deal.id}`) === 'true';
        const rentStep5Done = tenantSignedApproved || rentContractSigned;

        if (isRent && landlordNotifiedGovGr && !rentStep5Done) {
          tasks.push({
            id: `rent-sign-gov-${deal.id}`,
            title: 'Υπογράψε το συμφωνητικό στο Gov.gr – ο ιδιοκτήτης σου έστειλε το έγγραφο προς υπογραφή',
            type: 'step',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'actions'),
          });
        }
      }

      // Missing professionals (buyer only - seller has step 3 in Οδηγός Πώλησης)
      if (!showSellerStyle) {
        const hasBuyerLawyer = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId);
        const hasBuyerNotary = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId);

        if (!hasBuyerLawyer && deal.status === 'ACTIVE') {
          tasks.push({
            id: `lawyer-${deal.id}`,
            title: 'Επίλεξε Δικηγόρο',
            type: 'professional',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'professionals'),
          });
        }

        if (hasBuyerLawyer && !hasBuyerNotary && deal.status === 'ACTIVE') {
          tasks.push({
            id: `notary-${deal.id}`,
            title: 'Επίλεξε Συμβολαιογράφο',
            type: 'professional',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            href: dealHref(deal.id, 'professionals'),
          });
        }
      }
    });

    return tasks;
  }, [dealsInView, userId, fromSellerContext, showSellerStyle, combinedAppointments]);

  // Calculate actual pending tasks count (must be calculated after pendingTasks)
  const pendingTasksCount = useMemo(() => {
    return pendingTasks.length;
  }, [pendingTasks]);

  // Update stats with actual pending tasks count
  const statsWithPending = useMemo(() => {
    return {
      ...stats,
      pendingTasks: pendingTasksCount,
    };
  }, [stats, pendingTasksCount]);

  // Expected commissions for agent:
  // - SALE deals: 0.5% of agreed offer per active deal
  // - RENT deals: 50% of agreed rent per active deal
  const expectedAgentCommissions = useMemo(() => {
    if (!showAgentStyle || !userId) return 0;
    const completedStatuses = ['COMPLETED', 'CLOSED'];
    const completedDeals = deals.filter(d =>
      completedStatuses.includes(d.status) && isAgentInDeal(d, userId)
    );
    const propertyIdsWithCompleted = new Set(completedDeals.map(d => d.propertyId));
    let total = 0;

    // Active SALE deals: 0.5% of accepted offer
    const activeSaleDeals = deals.filter(d => {
      if (d.status !== 'ACTIVE' && d.status !== 'DRAFT') return false;
      if (!isAgentInDeal(d, userId)) return false;
      if (propertyIdsWithCompleted.has(d.propertyId)) return false;
      if (getIsRentDeal(d)) return false;
      return true;
    });
    for (const deal of activeSaleDeals) {
      const acceptedOffer = deal.offers?.find(o => o.status === 'ACCEPTED');
      if (acceptedOffer) {
        const amount = Number(acceptedOffer.amount);
        if (!isNaN(amount) && amount > 0) total += amount * 0.005; // 0.5%
      }
    }

    // Active RENT deals: 50% of agreed rent (συμφωνημένο ενοίκιο)
    const activeRentDeals = deals.filter(d => {
      if (d.status !== 'ACTIVE') return false;
      if (!isAgentInDeal(d, userId)) return false;
      if (propertyIdsWithCompleted.has(d.propertyId)) return false;
      if (!getIsRentDeal(d)) return false;
      return true;
    });
    for (const deal of activeRentDeals) {
      const acceptedOffer = deal.offers?.find(o => o.status === 'ACCEPTED');
      if (acceptedOffer) {
        const amount = Number(acceptedOffer.amount);
        if (!isNaN(amount) && amount > 0) total += amount * 0.5; // 50% του συμφωνημένου ενοικίου
      }
    }

    return Math.round(total);
  }, [deals, showAgentStyle, userId]);

  // Total earned for agent: 0.5% of accepted offer per completed SALE deal
  const agentTotalEarned = useMemo(() => {
    if (!showAgentStyle || !userId) return 0;
    const completedStatuses = ['COMPLETED', 'CLOSED'];
    let total = 0;
    for (const deal of deals) {
      if (!completedStatuses.includes(deal.status) || !isAgentInDeal(deal, userId) || getIsRentDeal(deal)) continue;
      const commission = getDealCommission(deal);
      if (commission !== null) total += commission;
    }
    return total;
  }, [deals, showAgentStyle, userId]);

  // Monthly revenue for agent: 0.5% of accepted offer per completed SALE deal, grouped by month
  const agentMonthlyRevenue = useMemo(() => {
    if (!showAgentStyle || !userId) return [];
    const completedStatuses = ['COMPLETED', 'CLOSED'];
    const byMonth: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      const d = subMonths(new Date(), 6 - i);
      byMonth[format(d, 'yyyy-MM')] = 0;
    }
    const completedDeals = deals.filter(d =>
      completedStatuses.includes(d.status) && isAgentInDeal(d, userId) && !getIsRentDeal(d)
    );
    for (const deal of completedDeals) {
      const commission = getDealCommission(deal);
      if (commission === null) continue;
      const dt = deal.updatedAt ? parseISO(deal.updatedAt) : null;
      if (!dt) continue;
      const key = format(dt, 'yyyy-MM');
      if (key in byMonth) byMonth[key] += commission;
    }
    return [1, 2, 3, 4, 5, 6].map((m) => {
      const monthDate = subMonths(new Date(), 6 - m);
      const key = format(monthDate, 'yyyy-MM');
      return { monthDate, revenue: byMonth[key] ?? 0 };
    });
  }, [deals, showAgentStyle, userId]);

  // Unique clients (buyers) the agent has referred — one per buyer, with their deals and properties
  const agentReferredClients = useMemo(() => {
    if (!showAgentStyle || !userId) return [];
    const agentDeals = deals.filter(d => isAgentInDeal(d, userId));
    const byBuyer = new Map<string, { buyerId: string; buyerName: string; deals: DealRoom[]; properties: string[] }>();
    for (const deal of agentDeals) {
      const buyerId = deal.buyerId;
      const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
      const propTitle = deal.property?.title || 'Ακίνητο';
      if (!byBuyer.has(buyerId)) {
        byBuyer.set(buyerId, { buyerId, buyerName, deals: [], properties: [] });
      }
      const entry = byBuyer.get(buyerId)!;
      entry.deals.push(deal);
      if (!entry.properties.includes(propTitle)) entry.properties.push(propTitle);
    }
    return Array.from(byBuyer.values());
  }, [deals, showAgentStyle, userId]);

  // Expected commissions breakdown: active deals (not on hold) with accepted offer
  // SALE: 0.5%, RENT: 50% του συμφωνημένου ενοικίου
  const expectedCommissionsBreakdown = useMemo(() => {
    if (!showAgentStyle || !userId) return [];
    const active = filteredDeals.active || [];
    const saleItems = active
      .filter(d => !getIsRentDeal(d))
      .map(d => {
        const commission = getDealCommission(d);
        if (commission === null) return null;
        const clientName = d.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
        return { deal: d, commission, clientName, propertyTitle: d.property?.title || 'Ακίνητο', isRent: false };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const rentItems = active
      .filter(d => getIsRentDeal(d))
      .map(d => {
        const acceptedOffer = d.offers?.find(o => o.status === 'ACCEPTED');
        if (!acceptedOffer) return null;
        const amount = Number(acceptedOffer.amount);
        if (isNaN(amount) || amount <= 0) return null;
        const commission = Math.round(amount * 0.5);
        const clientName = d.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
        return { deal: d, commission, clientName, propertyTitle: d.property?.title || 'Ακίνητο', isRent: true };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return [...saleItems, ...rentItems];
  }, [showAgentStyle, userId, filteredDeals.active]);

  // Received earnings breakdown: completed SALE deals with commission
  const receivedEarningsBreakdown = useMemo(() => {
    if (!showAgentStyle || !userId) return [];
    const completed = (filteredDeals.completed || []).filter(d => !getIsRentDeal(d));
    return completed
      .map(d => {
        const commission = getDealCommission(d);
        if (commission === null) return null;
        const clientName = d.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
        const closedAt = d.updatedAt ? parseISO(d.updatedAt) : null;
        return { deal: d, commission, clientName, propertyTitle: d.property?.title || 'Ακίνητο', closedAt };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));
  }, [showAgentStyle, userId, filteredDeals.completed]);

  // Recent Activity Feed
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'document' | 'appointment' | 'professional' | 'update' | 'step';
      title: string;
      dealId: string;
      dealTitle?: string;
      timestamp: Date;
      href: string;
      icon: any;
      color: string;
    }> = [];

    const dealsToProcess = dealsInView;
    dealsToProcess.forEach((deal) => {
      // Check if user is buyer for this deal
      const isBuyerRole = userId ? isBuyer(deal, userId) : false;

      // Recent documents - track all status changes
      deal.documents?.forEach((doc) => {
        const docTimestamp = doc.updatedAt || doc.createdAt;
        if (!docTimestamp) return;

        const docTime = parseISO(docTimestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Only show documents from last 30 days
        if (docTime < thirtyDaysAgo) return;

        // Document requested event
        if (doc.status === 'REQUESTED') {
          activities.push({
            id: `doc-req-${doc.id}`,
            type: 'document',
            title: `Ζητήθηκε έγγραφο: ${doc.category}`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: docTime,
            href: dealHref(deal.id, 'documents'),
            icon: FaFileAlt,
            color: 'text-yellow-600',
          });
        }

        // Document uploaded event - δείχνουμε ποιος ανέβασε όταν είναι πωλητής (για αγοραστή)
        if (doc.status === 'UPLOADED') {
          const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
          const uploaderId = (doc as { uploadedById?: string }).uploadedById;
          const uploadedBySeller = !!sellerId && !!uploaderId && uploaderId === sellerId;
          const docCat = doc.category.startsWith('[ΕΝΕΡΓΕΙΑ]') ? doc.category.replace('[ΕΝΕΡΓΕΙΑ]', '').trim() : doc.category;
          const title = uploadedBySeller
            ? `Ο πωλητής ανέβασε έγγραφο: ${docCat}`
            : `Έγγραφο ανέβηκε: ${docCat}`;
          activities.push({
            id: `doc-up-${doc.id}`,
            type: 'document',
            title,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: docTime,
            href: dealHref(deal.id, 'documents'),
            icon: FaFileAlt,
            color: 'text-blue-600',
          });
        }

        // Document approved event
        if (doc.status === 'APPROVED') {
          activities.push({
            id: `doc-appr-${doc.id}`,
            type: 'document',
            title: `Έγγραφο εγκεκρίθηκε: ${doc.category}`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: docTime,
            href: dealHref(deal.id, 'documents'),
            icon: FaFileAlt,
            color: 'text-green-600',
          });
        }

        // Document changes requested event
        if (doc.status === 'CHANGES_REQUESTED') {
          activities.push({
            id: `doc-changes-${doc.id}`,
            type: 'document',
            title: `Αλλαγές ζητήθηκαν: ${doc.category}`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: docTime,
            href: dealHref(deal.id, 'documents'),
            icon: FaFileAlt,
            color: 'text-orange-600',
          });
        }
      });

      // Recent appointments - more detailed
      deal.appointments?.forEach((apt) => {
        const aptDate = (apt as any).startAt || (apt as any).createdAt;
        const aptCreatedAt = (apt as any).createdAt;
        const aptTimestamp = aptDate || aptCreatedAt;
        
        if (!aptTimestamp) return;

        const aptTime = parseISO(aptTimestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Only show appointments from last 30 days
        if (aptTime < thirtyDaysAgo) return;
        
        // Add appointment requested event
        if (apt.status === 'PENDING' || apt.status === 'REQUESTED') {
          let appointmentTitle = '';
          if (apt.type === 'IN_PERSON') {
            appointmentTitle = 'Αιτήθηκε ραντεβού υπογραφής';
          } else if (apt.professionalId) {
            const professionalType = deal.requests?.find(r => r.professionalId === apt.professionalId)?.type;
            if (professionalType === 'LAWYER') {
              appointmentTitle = 'Αιτήθηκε ραντεβού με δικηγόρο';
            } else if (professionalType === 'NOTARY') {
              appointmentTitle = 'Αιτήθηκε ραντεβού με συμβολαιογράφο';
            } else {
              appointmentTitle = 'Αιτήθηκε ραντεβού';
            }
          } else {
            appointmentTitle = 'Αιτήθηκε ραντεβού προβολής ακινήτου';
          }

          activities.push({
            id: `apt-req-${apt.id}`,
            type: 'appointment',
            title: appointmentTitle,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: aptTime,
            href: dealHref(deal.id, 'appointments'),
            icon: FaCalendarAlt,
            color: 'text-yellow-600',
          });
        }

        // Add appointment confirmed event - για προβολή = πωλητής εγκρίνει
        if (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED') {
          let appointmentTitle = '';
          if (apt.type === 'IN_PERSON') {
            appointmentTitle = 'Ραντεβού υπογραφής συμβολαίων επιβεβαιώθηκε';
          } else if (apt.professionalId) {
            const professionalType = deal.requests?.find(r => r.professionalId === apt.professionalId)?.type;
            if (professionalType === 'LAWYER') {
              appointmentTitle = 'Ραντεβού με δικηγόρο επιβεβαιώθηκε';
            } else if (professionalType === 'NOTARY') {
              appointmentTitle = 'Ραντεβού με συμβολαιογράφο επιβεβαιώθηκε';
            } else {
              appointmentTitle = 'Ραντεβού επιβεβαιώθηκε';
            }
          } else {
            appointmentTitle = 'Ο πωλητής έγκρινε ραντεβού προβολής ακινήτου';
          }

          activities.push({
            id: `apt-conf-${apt.id}`,
            type: 'appointment',
            title: appointmentTitle,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: aptTime,
            href: dealHref(deal.id, 'appointments'),
            icon: FaCalendarAlt,
            color: 'text-green-600',
          });
        }

        // Add appointment cancelled event
        if (apt.status === 'CANCELLED') {
          let appointmentTitle = '';
          if (apt.type === 'IN_PERSON') {
            appointmentTitle = 'Ραντεβού υπογραφής ακυρώθηκε';
          } else if (apt.professionalId) {
            const professionalType = deal.requests?.find(r => r.professionalId === apt.professionalId)?.type;
            if (professionalType === 'LAWYER') {
              appointmentTitle = 'Ραντεβού με δικηγόρο ακυρώθηκε';
            } else if (professionalType === 'NOTARY') {
              appointmentTitle = 'Ραντεβού με συμβολαιογράφο ακυρώθηκε';
            } else {
              appointmentTitle = 'Ραντεβού ακυρώθηκε';
            }
          } else {
            appointmentTitle = 'Ραντεβού προβολής ακινήτου ακυρώθηκε';
          }

          activities.push({
            id: `apt-canc-${apt.id}`,
            type: 'appointment',
            title: appointmentTitle,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: aptTime,
            href: dealHref(deal.id, 'appointments'),
            icon: FaCalendarAlt,
            color: 'text-red-600',
          });
        }
      });

      // Professional requests - track all status changes (LAWYER, NOTARY, ENGINEER)
      const profLabel = (t: string) => t === 'LAWYER' ? 'Δικηγόρος' : t === 'NOTARY' ? 'Συμβολαιογράφος' : 'Μηχανικός';
      deal.requests?.forEach((req) => {
        if (!req.createdAt) return;

        const reqTime = parseISO(req.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (reqTime < thirtyDaysAgo) return;

        const reqById = (req as { requestedById?: string }).requestedById;
        const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
        const requestedBySeller = !!sellerId && !!reqById && reqById === sellerId;
        const requestedByBuyer = !!deal.buyerId && !!reqById && reqById === deal.buyerId;
        const reqTitle = requestedBySeller
          ? `Ο πωλητής ζήτησε ${profLabel(req.type).toLowerCase()}`
          : requestedByBuyer
          ? `Ο αγοραστής ζήτησε ${profLabel(req.type).toLowerCase()}`
          : `Αιτήθηκε ${profLabel(req.type)}`;
        activities.push({
          id: `prof-req-${req.id}`,
          type: 'professional',
          title: reqTitle,
          dealId: deal.id,
          dealTitle: deal.property?.title,
          timestamp: reqTime,
          href: dealHref(deal.id, 'professionals'),
          icon: FaUserTie,
          color: 'text-yellow-600',
        });

        if (req.status === 'ACCEPTED') {
          const acceptTime = deal.updatedAt ? parseISO(deal.updatedAt) : reqTime;
          const accTitle = requestedBySeller
            ? `Ο πωλητής πρόσθεσε ${profLabel(req.type).toLowerCase()}`
            : `${profLabel(req.type)} αποδέχθηκε`;
          activities.push({
            id: `prof-acc-${req.id}`,
            type: 'professional',
            title: accTitle,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: acceptTime,
            href: dealHref(deal.id, 'professionals'),
            icon: FaUserTie,
            color: 'text-green-600',
          });
        }

        if (req.status === 'DECLINED') {
          const declineTime = deal.updatedAt ? parseISO(deal.updatedAt) : reqTime;
          activities.push({
            id: `prof-dec-${req.id}`,
            type: 'professional',
            title: `${profLabel(req.type)} απέρριψε`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: declineTime,
            href: dealHref(deal.id, 'professionals'),
            icon: FaUserTie,
            color: 'text-red-600',
          });
        }
      });

      // Offers - προσφορές από αγοραστή/πωλητή
      deal.offers?.forEach((offer: { id: string; role: string; amount: number | string; status: string; createdAt: string }) => {
        const offerTime = parseISO(offer.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (offerTime < thirtyDaysAgo) return;

        const amount = typeof offer.amount === 'string' ? parseFloat(offer.amount) : offer.amount;
        const amountStr = isNaN(amount) ? '' : ` €${amount.toLocaleString('el-GR')}`;

        if (offer.status === 'ACCEPTED') {
          const acceptedBy = offer.role === 'BUYER' ? 'από πωλητή' : 'από αγοραστή';
          activities.push({
            id: `offer-acc-${offer.id}`,
            type: 'step',
            title: `Η προσφορά${amountStr} έγινε αποδεκτή ${acceptedBy}`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: offerTime,
            href: dealHref(deal.id, 'overview'),
            icon: FaHandshake,
            color: 'text-green-600',
          });
        } else {
          const byLabel = offer.role === 'BUYER' ? 'αγοραστής' : 'πωλητής';
          activities.push({
            id: `offer-${offer.id}`,
            type: 'step',
            title: `Νέα προσφορά${amountStr} από ${byLabel}`,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: offerTime,
            href: dealHref(deal.id, 'overview'),
            icon: FaHandshake,
            color: 'text-blue-600',
          });
        }
      });

      // Buyer milestones - ορατά σε όλους
      if (deal.buyerConfirmedInterestAt) {
        const t = parseISO(deal.buyerConfirmedInterestAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (t > thirtyDaysAgo) {
          activities.push({
            id: `buyer-interest-${deal.id}`,
            type: 'step',
            title: 'Ο αγοραστής επιβεβαίωσε το ενδιαφέρον του',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: t,
            href: dealHref(deal.id, 'actions'),
            icon: FaCheckCircle,
            color: 'text-green-600',
          });
        }
      }

      // Professional approvals - εγκρίσεις από δικηγόρο, συμβολαιογράφο, μηχανικό
      if (deal.notaryApprovedDocumentsAt) {
        const t = parseISO(deal.notaryApprovedDocumentsAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (t > thirtyDaysAgo) {
          activities.push({
            id: `notary-appr-${deal.id}`,
            type: 'professional',
            title: 'Ο συμβολαιογράφος εγκρίθηκε τα έγγραφα',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: t,
            href: dealHref(deal.id, 'documents'),
            icon: FaUserTie,
            color: 'text-green-600',
          });
        }
      }
      if (deal.lawyerApprovedSellerDocumentsAt) {
        const t = parseISO(deal.lawyerApprovedSellerDocumentsAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (t > thirtyDaysAgo) {
          activities.push({
            id: `lawyer-seller-appr-${deal.id}`,
            type: 'professional',
            title: 'Ο δικηγόρος εγκρίθηκε τα έγγραφα του πωλητή',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: t,
            href: dealHref(deal.id, 'documents'),
            icon: FaUserTie,
            color: 'text-green-600',
          });
        }
      }
      if (deal.engineerApprovedSellerDocumentsAt) {
        const t = parseISO(deal.engineerApprovedSellerDocumentsAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (t > thirtyDaysAgo) {
          activities.push({
            id: `engineer-appr-${deal.id}`,
            type: 'professional',
            title: 'Ο μηχανικός εγκρίθηκε τα έγγραφα του πωλητή',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            timestamp: t,
            href: dealHref(deal.id, 'documents'),
            icon: FaUserTie,
            color: 'text-green-600',
          });
        }
      }

      // Step progress for buyers - show current step
      if (isBuyerRole && (deal.status === 'ACTIVE' || deal.status === 'DRAFT')) {
        const currentStep = getCurrentStepForDeal(deal);
        const stepTitles: Record<number, string> = {
          1: 'Βήμα 1: Κλείσιμο ραντεβού',
          2: 'Βήμα 2: Επιβεβαίωση ενδιαφέροντος',
          3: 'Βήμα 3: Επιλογή Δικηγόρου',
          4: 'Βήμα 4: Πληρωμή Προκαταβολής',
          5: 'Βήμα 5: Διαδικασία με Δικηγόρο',
          6: 'Βήμα 6: Επιλογή Συμβολαιογράφου',
          7: 'Βήμα 7: Διαδικασία με Συμβολαιογράφο',
          8: 'Βήμα 8: Υπογραφή Συμβολαίων',
          9: 'Βήμα 9: Επιβεβαίωση Ολοκλήρωσης',
          10: 'Συναλλαγή Ολοκληρώθηκε',
        };

        // Add step progress activity if deal was recently updated (last 7 days)
        if (deal.updatedAt) {
          const updatedTime = parseISO(deal.updatedAt);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          if (updatedTime > sevenDaysAgo) {
            activities.push({
              id: `step-${deal.id}-${currentStep}-${updatedTime.getTime()}`,
              type: 'step',
              title: `Πρόοδος: ${stepTitles[currentStep] || `Βήμα ${currentStep}`}`,
              dealId: deal.id,
              dealTitle: deal.property?.title,
              timestamp: updatedTime,
              href: dealHref(deal.id, 'overview'),
              icon: FaExchangeAlt,
              color: 'text-indigo-600',
            });
          }
        }
      }

      // Threads/Messages activity - show if there are messages and deal was recently updated
      if (deal.threads && deal.threads.length > 0) {
        const hasMessages = deal.threads.some(thread => thread._count && thread._count.messages > 0);
        if (hasMessages && deal.updatedAt) {
          const updatedTime = parseISO(deal.updatedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          // Show message activity if deal was updated recently (likely due to new message)
          if (updatedTime > thirtyDaysAgo) {
            const groupThread = deal.threads.find(t => t.type === 'GROUP');
            activities.push({
              id: `thread-${deal.id}-${updatedTime.getTime()}`,
              type: 'update',
              title: groupThread ? `Νέο μήνυμα στη συνομιλία` : `Νέο μήνυμα`,
              dealId: deal.id,
              dealTitle: deal.property?.title,
              timestamp: updatedTime,
              href: dealHref(deal.id, 'chat'),
              icon: FaComments,
              color: 'text-blue-600',
            });
          }
        }
      }

      // Deal status changes - show if status changed recently
      if (deal.updatedAt) {
        const updatedTime = parseISO(deal.updatedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (updatedTime > thirtyDaysAgo) {
          // Check for status changes
          if (deal.status === 'CLOSED' || deal.status === 'COMPLETED') {
            activities.push({
              id: `deal-closed-${deal.id}`,
              type: 'update',
              title: 'Συναλλαγή ολοκληρώθηκε',
              dealId: deal.id,
              dealTitle: deal.property?.title,
              timestamp: updatedTime,
              href: dealHref(deal.id),
              icon: FaCheckCircle,
              color: 'text-green-600',
            });
          } else if (deal.status === 'CANCELLED') {
            activities.push({
              id: `deal-cancelled-${deal.id}`,
              type: 'update',
              title: 'Συναλλαγή ακυρώθηκε',
              dealId: deal.id,
              dealTitle: deal.property?.title,
              timestamp: updatedTime,
              href: dealHref(deal.id),
              icon: FaTimesCircle,
              color: 'text-red-600',
            });
          }
        }
      }
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [dealsInView, userId]);

  const ACTIVITY_PAGE_SIZE = 5;
  const filteredActivity = useMemo(() => 
    recentActivity.filter(a => !dismissedActivityIds.has(a.id)),
    [recentActivity, dismissedActivityIds]
  );
  const totalActivityPages = Math.max(1, Math.ceil(filteredActivity.length / ACTIVITY_PAGE_SIZE));
  const paginatedActivity = useMemo(() => {
    const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
    return filteredActivity.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [filteredActivity, activityPage]);

  useEffect(() => {
    if (activityPage > totalActivityPages && totalActivityPages >= 1) {
      setActivityPage(totalActivityPages);
    }
  }, [activityPage, totalActivityPages]);

  const dismissActivity = (activityId: string) => {
    const next = new Set(dismissedActivityIds);
    next.add(activityId);
    setDismissedActivityIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissedActivityIds', JSON.stringify(Array.from(next)));
    }
    setActivityPage(p => {
      const remaining = filteredActivity.length - 1;
      const maxPage = Math.max(1, Math.ceil(remaining / ACTIVITY_PAGE_SIZE));
      return Math.min(p, maxPage);
    });
  };

  // Upcoming deadlines
  // Buyer: 5 soonest scheduled appointments from deals where user is buyer
  // Seller: όλα τα επερχόμενα ραντεβού, max 5, από πιο κοντινό στο πιο μακρινό
  // Agent: appointments in next 7 days, max 10
  const showBuyerStyle = !showSellerStyle && !showAgentStyle;
  const upcomingDeadlines = useMemo(() => {
    const deadlines: Array<{
      id: string;
      title: string;
      date: Date;
      dealId: string;
      dealTitle?: string;
      href: string;
      type: 'appointment' | 'document';
      status?: string;
    }> = [];

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const maxItems = showSellerStyle ? 5 : (showBuyerStyle ? 5 : 10);

    // For buyer: only appointments from deals where user is buyer
    const appointmentsToConsider = showBuyerStyle && userId
      ? combinedAppointments.filter((apt) => {
          const deal = deals.find(d => d.id === apt.dealId);
          return deal ? isBuyer(deal, userId) : false;
        })
      : combinedAppointments;

    // Include future appointments (CONFIRMED, ACCEPTED, PENDING, REQUESTED)
    // Seller: όλα τα επερχόμενα (χωρίς όριο 7 ημερών)
    appointmentsToConsider.forEach((apt) => {
      const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
      const isFutureApt = aptDate && isFuture(aptDate);
      const inRange = showSellerStyle ? isFutureApt : (showBuyerStyle ? isFutureApt : (isFutureApt && aptDate <= nextWeek));
      if (inRange &&
          (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED')) {
        const deal = deals.find(d => d.id === apt.dealId);
        let appointmentTitle = getAppointmentTypeLabel(apt, deal);
        
        if (apt.status === 'PENDING' || apt.status === 'REQUESTED') {
          appointmentTitle += ' (Σε Αναμονή)';
        }
        
        deadlines.push({
          id: `deadline-apt-${apt.id}`,
          title: appointmentTitle,
          date: aptDate!,
          dealId: apt.dealId,
          dealTitle: apt.dealTitle,
          href: dealHref(apt.dealId, 'appointments'),
          type: 'appointment',
          status: apt.status,
        });
      }
    });

    return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, maxItems);
  }, [combinedAppointments, deals, showBuyerStyle, showSellerStyle, showAgentStyle, userId]);

  // Active Deals Progress Summary
  // When showSellerStyle: include COMPLETED/CLOSED deals at 100%, exclude active deals for same property
  // DRAFT deals are considered active deal rooms
  const activeDealsProgress = useMemo(() => {
    const completedStatuses = ['COMPLETED', 'CLOSED'];
    const cancelledStatuses = ['CANCELLED', 'CLOSED_PROPERTY_SOLD'];
    const activeStatuses = ['ACTIVE', 'DRAFT'];
    // dealsInView is already filtered by buyer/seller/agent based on URL
    const completedDeals = dealsInView.filter(d => completedStatuses.includes(d.status));
    const cancelledDeals = dealsInView.filter(d => cancelledStatuses.includes(d.status));
    const propertyIdsWithCompleted = new Set(completedDeals.map(d => d.propertyId));
    const activeDeals = dealsInView.filter(d => {
      if (!activeStatuses.includes(d.status)) return false;
      if (propertyIdsWithCompleted.has(d.propertyId)) return false;
      return true;
    });
    const completedItems = completedDeals.map(deal => ({
      deal,
      progress: 100,
      completedSteps: 1,
      totalSteps: 1,
      currentStepLabel: 'Ολοκληρώθηκε',
    }));
    const cancelledItems = cancelledDeals.map(deal => ({
      deal,
      progress: 0,
      completedSteps: 0,
      totalSteps: 1,
      currentStepLabel: deal.status === 'CANCELLED' ? 'Ακυρώθηκε' : 'Ακίνητο πουλήθηκε',
    }));
    const activeItems = activeDeals.map(deal => {
        // Check if user is buyer or seller for this deal
        const isBuyerRole = userId ? isBuyer(deal, userId) : false;
        const isSellerRole = userId ? isSellerInDeal(deal, userId) : false;
        
        let progressPercent = 0;
        let completedSteps = 0;
        let totalSteps = 10;
        let currentStepLabel = '';

        if (isBuyerRole) {
          // Calculate progress based on actual buyer steps (buyer must have chosen lawyer/notary)
          const hasBuyerLawyer = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId);
          const hasBuyerNotary = deal.buyerId && deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.requestedById === deal.buyerId);
          const stepStatus = {
            step1: isStep1Completed(deal),
            step2: typeof window !== 'undefined' && sessionStorage.getItem(`interestDecision_${deal.id}`) === 'continue',
            step3: !!hasBuyerLawyer,
            step4: typeof window !== 'undefined' && sessionStorage.getItem(`depositPaymentClicked_${deal.id}`) === 'true',
            step5: typeof window !== 'undefined' && sessionStorage.getItem(`lawyerApprovedBuyerProgress_${deal.id}`) === 'true' || !!hasBuyerNotary || false,
            step6: !!hasBuyerNotary,
            step7: !!deal.notaryApprovedDocumentsAt || (typeof window !== 'undefined' && sessionStorage.getItem(`notaryApprovedDocuments_${deal.id}`) === 'true'),
            step8: (() => {
              const confirmedSigningAppointment = deal.appointments?.find(a => a.status === 'CONFIRMED' && a.type === 'IN_PERSON');
              if (confirmedSigningAppointment) {
                const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
                return appointmentEndTime <= new Date();
              }
              return false;
            })(),
            step9: deal.buyerSigningConfirmed || deal.status === 'CLOSED' || false,
            step10: deal.status === 'CLOSED' || false,
          };

          completedSteps = Object.values(stepStatus).filter(Boolean).length;
          progressPercent = (completedSteps / totalSteps) * 100;
          const buyerCurrentStep = getCurrentStepForDeal(deal);
          currentStepLabel = BUYER_STEP_TITLES[buyerCurrentStep] || `Βήμα ${buyerCurrentStep}`;
        } else if (isSellerRole) {
          // Seller: use 7-step progress from SellersPurchaseGuide
          const dealAppts = combinedAppointments.filter(a => a.dealId === deal.id);
          const sellerProgress = getCurrentStepForSeller(deal, dealAppts);
          completedSteps = sellerProgress.completedSteps;
          totalSteps = sellerProgress.totalSteps;
          progressPercent = (completedSteps / totalSteps) * 100;
          currentStepLabel = SELLER_STEP_TITLES[sellerProgress.step] || `Βήμα ${sellerProgress.step}`;
        } else {
          // Agent or other: simplified progress
          const hasLawyer = deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
          const hasNotary = deal.requests?.some(r => r.status === 'ACCEPTED' && r.type === 'NOTARY');
          const hasDocuments = (deal.documents?.length || 0) > 0;
          const hasAppointments = (deal.appointments?.filter(a => a.status === 'CONFIRMED').length || 0) > 0;
          
          const progressSteps = [hasAppointments, hasLawyer, hasNotary, hasDocuments];
          completedSteps = progressSteps.filter(Boolean).length;
          totalSteps = 4;
          progressPercent = (completedSteps / totalSteps) * 100;
        }

        return {
          deal,
          progress: progressPercent,
          completedSteps,
          totalSteps,
          currentStepLabel,
        };
      });
    const allItems = [...completedItems, ...activeItems, ...cancelledItems]
      .filter(item => !archivedDealIds.has(item.deal.id))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
    return allItems;
  }, [dealsInView, userId, archivedDealIds]);

  // Mark items as seen when tab becomes active
  useEffect(() => {
    if (activeTab === 'appointments') {
      const upcomingAppts = combinedAppointments.filter(apt => {
        const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
        return aptDate && isFuture(aptDate || new Date()) && (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED');
      });
      const appointmentIds = upcomingAppts.map(apt => apt.id);
      if (appointmentIds.length > 0) {
        markAppointmentsAsSeen(appointmentIds);
      }
    }

    if (activeTab === 'pending') {
      const taskIds = pendingTasks.map(task => task.id);
      if (taskIds.length > 0) {
        markPendingTasksAsSeen(taskIds);
      }
    }
  }, [activeTab, combinedAppointments, pendingTasks]);

  const handleTabChange = (tab: TabType) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    if (fromSellerContext && !url.searchParams.has('from')) url.searchParams.set('from', 'seller');
    if (fromAgentContext && !url.searchParams.has('from')) url.searchParams.set('from', 'agent');
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // When agent style: redirect invalid tabs (appointments, pending, properties) to overview
  useEffect(() => {
    if (!showAgentStyle) return;
    const agentTabs = ['overview', 'referrals', 'deals', 'commissions'];
    if (activeTab && !agentTabs.includes(activeTab)) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      if (fromAgentContext) url.searchParams.set('from', 'agent');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [showAgentStyle, activeTab, fromAgentContext, router]);

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${showAgentStyle ? 'bg-gradient-to-b from-indigo-50/50 via-white to-white' : showSellerStyle ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]' : 'bg-[#f5f0e8]'}`}>
        <div className="text-center">
          <FaSpinner className={`animate-spin text-4xl mx-auto mb-4 ${showAgentStyle ? 'text-indigo-600' : showSellerStyle ? 'text-green-600' : 'text-indigo-600'}`} />
          <p className="text-gray-600">Φόρτωση συναλλαγών...</p>
        </div>
      </div>
    );
  }

  const mainClassName = showAgentStyle
    ? 'min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white'
    : showSellerStyle
    ? 'min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]'
    : 'min-h-screen bg-[#f5f0e8]';

  function LayoutContent() {
    return (
    <React.Fragment>
      {/* Enhanced Header / Navbar */}
      {showAgentStyle ? (
        <AgentNavbar solidFromStart />
      ) : showSellerStyle ? (
        <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100">
          <div className="container mx-auto px-6">
            <div className="flex items-center h-16">
              {/* Logo - Left */}
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
              
              {/* Navigation - Center */}
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

              {/* Icons - Right - ακριβώς ίδιο με seller page (όταν isScrolled) */}
              <div className="flex items-center space-x-3">
                {session ? (
                  <>
                    <SellerNotificationBell />
                    <Link
                      href="/deals?from=seller&tab=deals"
                      className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 ring-2 ring-white/90 ring-offset-2 shadow-lg"
                    >
                      Συναλλαγές
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" title="Είστε στη σελίδα Συναλλαγών" />
                    </Link>
                    <DealsProfileDropdown session={session} onSignOut={handleSignOut} variant="seller" />
                  </>
                ) : (
                  <>
                    <Link
                      href="/seller/auth/login"
                      className="text-gray-600 hover:text-green-600 transition-all font-medium text-sm"
                    >
                      Σύνδεση
                    </Link>
                    <Link
                      href="/seller/auth/register"
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 font-semibold text-sm transition-all"
                    >
                      Εγγραφή
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
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
                    className="flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-full shadow-sm hover:from-blue-900 hover:to-slate-800 transition-all duration-300 whitespace-nowrap"
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
                        className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden"
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
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                              <FaUserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors duration-200">
                                Agent Mode
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Διαχείριση πελατών και ακινήτων
                              </div>
                            </div>
                            <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-700 transition-colors duration-200" />
                          </div>
                          
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { setIsRoleMenuOpen(false); handleRoleChange('SELLER'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('SELLER'); } }}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-green-50 transition-all duration-200 group cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
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
                  href="/properties"
                  className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaSearch className="mr-2" />
                  Ακίνητα
                </Link>
                <Link
                  href="/buyer/contact"
                  className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaEnvelope className="mr-2" />
                  Επικοινωνία
                </Link>
                <Link
                  href="/buyer/about"
                  className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaInfoCircle className="mr-2" />
                  Σχετικά
                </Link>
                <Link
                  href="/buyer/how-it-works"
                  className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 hover:text-blue-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaQuestionCircle className="mr-2" />
                  Πώς Λειτουργεί
                </Link>
                <Link
                  href="/deals"
                  className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-blue-800 transition-all duration-300 whitespace-nowrap"
                >
                  <FaHandshake className="mr-2" />
                  Συναλλαγές
                </Link>
              </nav>

              <div className="flex items-center space-x-3">
                {session ? (
                  <>
                    <Link
                      href="/buyer"
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-slate-200 hover:text-blue-800 transition-all duration-300"
                      title="Επιστροφή στην Αρχική"
                    >
                      <FaHome className="w-4 h-4" />
                    </Link>
                    <NotificationBell />
                    <DealsProfileDropdown session={session} onSignOut={handleSignOut} variant="buyer" />
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
                      className="bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm"
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

      {/* Main Content */}
      <div className="pt-20">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {showAgentStyle ? 'Οι Συναλλαγές μου (Agent)' : showSellerStyle ? 'Οι Συναλλαγές και Τα Ακίνητα μου' : 'Οι Συναλλαγές μου'}
                </h1>
                <p className="text-gray-600">
                  {showAgentStyle ? 'Διαχειριστείτε τις συναλλαγές των πελατών σας' : showSellerStyle ? 'Διαχειριστείτε τις συναλλαγές και τα ακίνητά σας' : 'Διαχειριστείτε όλες τις συναλλαγές σας'}
                </p>
              </div>
              {(deals.length > 0 || showSellerStyle || showAgentStyle) && (
                <div className="hidden md:flex items-center gap-4">
                  <div className="bg-gray-50 rounded-xl px-6 py-3 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Ενεργές</div>
                    <div className="text-2xl font-bold text-gray-900">{statsWithPending.activeDeals}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-6 py-3 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Ολοκληρωμένες</div>
                    <div className="text-2xl font-bold text-gray-900">{statsWithPending.closedDeals}</div>
                  </div>
                  {showSellerStyle && (
                    <div className="bg-gray-50 rounded-xl px-6 py-3 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Ακίνητα</div>
                      <div className="text-2xl font-bold text-gray-900">{sellerPropertiesLoading ? '...' : sellerProperties.length}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Tabs Navigation + Content (show even when there are no deals) */}
        {isAuthenticated && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
            <div className="border-b border-gray-200 bg-white">
              <nav className="flex space-x-1 overflow-x-auto px-6" role="tablist">
                {(() => {
                  // Use seenUpdateTrigger to force re-calculation when items are marked as seen or dismissed
                  const _ = seenUpdateTrigger;
                  const seenAppointments = getSeenAppointments();
                  const seenPendingTasks = getSeenPendingTasks();
                  const dismissedPendingTasks = getDismissedPendingTasks();
                  const displayedPendingTasks = pendingTasks.filter(t => !dismissedPendingTasks.has(t.id));
                  
                  // Calculate unseen appointments
                  const upcomingAppts = combinedAppointments.filter(apt => {
                    const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                    return aptDate && isFuture(aptDate || new Date()) && (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED');
                  });
                  const unseenAppointments = upcomingAppts.filter(apt => !seenAppointments.has(apt.id));
                  
                  // Calculate unseen pending tasks (only from displayed, non-dismissed)
                  const unseenPendingTasks = displayedPendingTasks.filter(task => !seenPendingTasks.has(task.id));
                  
                  // Agent-specific tabs
                  const tabs = showAgentStyle
                    ? [
                        { id: 'overview' as const, label: 'Επισκόπηση', icon: FaBuilding },
                        { id: 'referrals' as const, label: 'Οι Πελάτες μου / Συστάσεις', icon: FaUserPlus },
                        { id: 'deals' as const, label: 'Συμβόλαια', icon: FaHandshake },
                        { id: 'commissions' as const, label: 'Προμήθειες', icon: FaMoneyBillWave },
                      ]
                    : [
                        { id: 'overview' as const, label: 'Επισκόπηση', icon: FaBuilding },
                        ...(showSellerStyle ? [{ id: 'properties' as const, label: 'Ακίνητα', icon: FaHome }] : []),
                        { id: 'deals' as const, label: 'Συναλλαγές', icon: FaHandshake },
                        { 
                          id: 'appointments' as const, 
                          label: 'Ραντεβού', 
                          icon: FaCalendarAlt,
                          badge: unseenAppointments.length
                        },
                        { 
                          id: 'pending' as const, 
                          label: 'Εκκρεμότητες', 
                          icon: FaClock,
                          badge: unseenPendingTasks.length
                        },
                      ];
                  return tabs;
                })().map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const hasBadge = 'badge' in tab && tab.badge !== undefined && tab.badge > 0;
                  const showYellowHighlight = hasBadge && !isActive; // Only show yellow when not active
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as TabType)}
                      role="tab"
                      aria-selected={isActive}
                      className={`
                        relative whitespace-nowrap py-4 px-5 border-b-3 font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${showAgentStyle ? 'focus:ring-indigo-500' : 'focus:ring-indigo-500'}
                        ${
                          showYellowHighlight
                            ? 'border-transparent text-yellow-700 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300'
                            : isActive
                            ? showAgentStyle
                              ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                              : showSellerStyle
                              ? 'border-green-600 text-green-700 bg-white shadow-sm'
                              : 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="flex items-center gap-2.5 relative">
                        <Icon className={`text-base ${showYellowHighlight ? 'text-yellow-600' : ''}`} />
                        <span className="relative">
                          {tab.label}
                          {showYellowHighlight && (
                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {showAgentStyle ? (
                      /* Agent Overview */
                      <>
                        {/* Agent KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="text-sm text-gray-500 mb-1">Συνολικά Έσοδα</div>
                            <p className="text-2xl font-bold text-gray-900">€{agentTotalEarned.toLocaleString('el-GR')}</p>
                            <p className="text-xs text-gray-400 mt-1">0,5% από ολοκληρωμένες πωλήσεις</p>
                          </div>
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="text-sm text-gray-500 mb-1">Αναμενόμενες Προμήθειες</div>
                            <p className="text-2xl font-bold text-indigo-600">€{expectedAgentCommissions.toLocaleString('el-GR')}</p>
                            <p className="text-xs text-gray-400 mt-1">0,5% πώληση · 50% ενοίκιο ανά ενεργή συναλλαγή</p>
                          </div>
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="text-sm text-gray-500 mb-1">Ενεργά Deals</div>
                            <p className="text-2xl font-bold text-gray-900">{statsWithPending.activeDeals}</p>
                          </div>
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="text-sm text-gray-500 mb-1">Συνολικές Συστάσεις</div>
                            <p className="text-2xl font-bold text-gray-900">{statsWithPending.closedDeals + statsWithPending.activeDeals}</p>
                          </div>
                        </div>
                        {/* Invite New Client Widget - Οδηγίες πρόσκλησης */}
                        <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl shadow-sm border border-indigo-100 p-6">
                          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FaUserPlus className="text-indigo-600" />
                            Πώς να προσκαλέσετε νέο πελάτη
                          </h2>
                          <p className="text-gray-700 text-sm mb-5 leading-relaxed">
                            Υπάρχουν δύο τρόποι να συνδέσετε ενδιαφερόμενους αγοραστές με το προφίλ σας και να ξεκινήσουν συναλλαγές:
                          </p>
                          <div className="space-y-4">
                            <div className="flex gap-4 p-4 bg-white/80 rounded-xl border border-indigo-100">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <FaLink className="text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Μέσω σελίδας ακινήτου</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                  Επιλέξτε ένα ακίνητο από το κατάλογό σας, ανοίξτε τη σελίδα λεπτομερειών του και στείλτε τον σύνδεσμο στον ενδιαφερόμενο (μέσω email, μηνύματος ή τηλεφώνου). Όταν ο πελάτης πατήσει τον σύνδεσμο και συνδεθεί, θα συνδεθεί αυτόματα μαζί σας ως ο μεσίτης του.
                                </p>
                                <Link
                                  href="/properties"
                                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                                >
                                  <FaSearch className="text-xs" />
                                  Αναζήτηση ακινήτων
                                </Link>
                              </div>
                            </div>
                            <div className="flex gap-4 p-4 bg-white/80 rounded-xl border border-indigo-100">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <FaUserPlus className="text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Χειροκίνητη προσθήκη</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                  Μπορείτε να προσθέσετε ενδιαφερόμενο χειροκίνητα από την καρτέλα <strong>Οι Πελάτες μου</strong>. Πατήστε το κουμπί &quot;Προσθήκη ενδιαφερόμενου&quot; και ακολουθήστε τις οδηγίες για να εισάγετε τα στοιχεία του πελάτη.
                                </p>
                                <button
                                  onClick={() => {
                                    handleTabChange('referrals');
                                    setTimeout(() => setIsAddBuyerModalOpen(true), 300);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                                >
                                  <FaUserPlus className="text-sm" />
                                  Προσθήκη ενδιαφερόμενου
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Deal Progress Widget */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Πρόοδος Συναλλαγών</h2>
                            <button onClick={() => handleTabChange('deals')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                              Όλα <FaChevronRight className="text-xs" />
                            </button>
                          </div>
                          {activeDealsProgress.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">Δεν έχετε ενεργές συναλλαγές</p>
                          ) : (
                            <div className="space-y-4">
                              {activeDealsProgress.map((item) => {
                                const clientName = item.deal.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
                                const commission = getDealCommission(item.deal);
                                return (
                                  <Link key={item.deal.id} href={dealHref(item.deal.id)} className="block group">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-medium text-gray-900 group-hover:text-indigo-600">{clientName} (Αγοραστής)</p>
                                      <span className="text-xs font-bold text-gray-600">{Math.round(item.progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${item.progress}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                      <span>{item.currentStepLabel}</span>
                                      <span className="font-medium text-indigo-700">
                                        Εκτιμώμενη Αμοιβή: {commission !== null ? `€${commission.toLocaleString('el-GR')}` : 'Σε αναμονή συμφωνίας'}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Recent Activity + Revenue Chart Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaBell className="text-gray-600" />
                              Πρόσφατη Δραστηριότητα
                            </h2>
                            {filteredActivity.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-8">Δεν υπάρχει πρόσφατη δραστηριότητα</p>
                            ) : (
                              <div className="space-y-3">
                                {paginatedActivity.map((activity) => {
                                  const Icon = activity.icon;
                                  return (
                                    <Link key={activity.id} href={activity.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Icon className="text-sm text-indigo-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{activity.dealTitle}</p>
                                        <p className="text-xs text-gray-400 mt-1">{format(activity.timestamp, 'd MMM yyyy, HH:mm', { locale: el })}</p>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <FaChartBar className="text-indigo-600" />
                              Έσοδα ανά Μήνα
                            </h2>
                            <div className="flex flex-col gap-2">
                              {agentMonthlyRevenue.map(({ monthDate, revenue }, idx) => {
                                const maxRev = Math.max(1, ...agentMonthlyRevenue.map(r => r.revenue));
                                return (
                                  <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 w-16">{format(monthDate, 'MMM yyyy', { locale: el })}</span>
                                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded" style={{ width: `${maxRev > 0 ? (revenue / maxRev) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700 w-14">€{revenue.toLocaleString('el-GR')}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-400 mt-3">Πραγματικά έσοδα (0,5% από συμφωνημένη προσφορά ανά ολοκληρωμένη πώληση)</p>
                          </div>
                        </div>
                      </>
                    ) : (
                    <>
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {showSellerStyle ? (
                        <button
                          onClick={() => handleTabChange('properties')}
                          className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-6 text-left"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                              <FaHome className="text-xl text-green-600" />
                            </div>
                            <FaArrowRight className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Τα Ακίνητα μου</h3>
                          <p className="text-gray-600 text-sm">{sellerProperties.length} ακίνητα καταχωρημένα</p>
                        </button>
                      ) : (
                        <Link
                          href="/properties"
                          className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-6"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <FaSearch className="text-xl text-blue-600" />
                            </div>
                            <FaArrowRight className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Δες Ακίνητα</h3>
                          <p className="text-gray-600 text-sm">Αναζήτησε νέα ακίνητα</p>
                        </Link>
                      )}

                      <button
                        onClick={() => handleTabChange('deals')}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-6 text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <FaBuilding className="text-xl text-green-600" />
                          </div>
                          <FaArrowRight className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Οι Συναλλαγές μου</h3>
                        <p className="text-gray-600 text-sm">{statsWithPending.activeDeals} ενεργές</p>
                      </button>

                      <button
                        onClick={() => handleTabChange('appointments')}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-6 text-left"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <FaCalendarAlt className="text-xl text-purple-600" />
                          </div>
                          <FaArrowRight className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Ραντεβού</h3>
                        <p className="text-gray-600 text-sm">{statsWithPending.upcomingAppts} προγραμματισμένα</p>
                      </button>
                    </div>

                    {/* Stats: for seller, show button to expand; for buyer, show always */}
                    {showSellerStyle ? (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setOverviewStatsExpanded((p) => !p)}
                          className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100/80 transition-colors text-left"
                        >
                          <span className="font-semibold text-gray-900 flex items-center gap-2">
                            <FaChartBar className="text-green-600" />
                            Στατιστικά
                          </span>
                          <FaChevronDown className={`text-green-600 text-lg transition-transform duration-200 flex-shrink-0 ${overviewStatsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {overviewStatsExpanded && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.1 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('deals')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <FaBuilding className="text-lg text-blue-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Ενεργές</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.activeDeals}</p>
                                  <p className="text-xs text-gray-500 mt-1">Deal Rooms</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                      <FaCheckCircle className="text-lg text-green-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Ολοκληρωμένες</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.closedDeals}</p>
                                  <p className="text-xs text-gray-500 mt-1">Deal Rooms</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('appointments')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <FaCalendarAlt className="text-lg text-purple-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Προγραμματισμένα</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.upcomingAppts}</p>
                                  <p className="text-xs text-gray-500 mt-1">Ραντεβού</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('pending')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <FaExclamationTriangle className="text-lg text-orange-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Εκκρεμότητες</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.pendingTasks}</p>
                                  <p className="text-xs text-gray-500 mt-1">Tasks</p>
                                </motion.div>
                                {(() => {
                                  const forSale = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'sale' && !p.propertySold).length;
                                  const forRent = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'rent' && !p.propertySold).length;
                                  return (
                                    <>
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                        onClick={() => handleTabChange('properties')}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                            <FaHome className="text-lg text-teal-600" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-500">Ακίνητα</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{sellerPropertiesLoading ? '...' : sellerProperties.length}</p>
                                        <p className="text-xs text-gray-500 mt-1">Σύνολο</p>
                                      </motion.div>
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.55 }}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                        onClick={() => handleTabChange('properties')}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <FaKey className="text-lg text-emerald-600" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-500">Πουλιούνται</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{sellerPropertiesLoading ? '...' : forSale}</p>
                                        <p className="text-xs text-gray-500 mt-1">Προς πώληση</p>
                                      </motion.div>
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                        onClick={() => handleTabChange('properties')}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                            <FaHome className="text-lg text-cyan-600" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-500">Ενοικιάζονται</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{sellerPropertiesLoading ? '...' : forRent}</p>
                                        <p className="text-xs text-gray-500 mt-1">Προς ενοικίαση</p>
                                      </motion.div>
                                    </>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setOverviewStatsExpanded((p) => !p)}
                          className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-slate-100 border border-gray-200 hover:bg-slate-200/80 transition-colors text-left"
                        >
                          <span className="font-semibold text-gray-900 flex items-center gap-2">
                            <FaChartBar className="text-blue-800" />
                            Στατιστικά
                          </span>
                          <FaChevronDown className={`text-blue-800 text-lg transition-transform duration-200 flex-shrink-0 ${overviewStatsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {overviewStatsExpanded && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.1 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('deals')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <FaBuilding className="text-lg text-blue-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Ενεργές</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.activeDeals}</p>
                                  <p className="text-xs text-gray-500 mt-1">Deal Rooms</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.2 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                      <FaCheckCircle className="text-lg text-green-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Ολοκληρωμένες</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.closedDeals}</p>
                                  <p className="text-xs text-gray-500 mt-1">Deal Rooms</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('appointments')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <FaCalendarAlt className="text-lg text-purple-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Προγραμματισμένα</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.upcomingAppts}</p>
                                  <p className="text-xs text-gray-500 mt-1">Ραντεβού</p>
                                </motion.div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4 }}
                                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                                  onClick={() => handleTabChange('pending')}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <FaExclamationTriangle className="text-lg text-orange-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Εκκρεμότητες</span>
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900">{statsWithPending.pendingTasks}</p>
                                  <p className="text-xs text-gray-500 mt-1">Tasks</p>
                                </motion.div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column: Active Deals Progress */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-gray-900">Πρόοδος Συναλλαγών</h2>
                          <button
                            onClick={() => handleTabChange('deals')}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            Όλα
                            <FaChevronRight className="text-xs" />
                          </button>
                        </div>
                        {activeDealsProgress.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-8">
                            {showSellerStyle ? 'Δεν έχετε ενεργές συναλλαγές ως πωλητής' : 'Δεν υπάρχουν ενεργές συναλλαγές'}
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {activeDealsProgress.map((item, idx) => {
                              const canHide = item.progress >= 100 || ['CANCELLED', 'CLOSED_PROPERTY_SOLD'].includes(item.deal.status);
                              return (
                              <div key={item.deal.id} className="flex items-start gap-2">
                                <Link
                                  href={dealHref(item.deal.id)}
                                  className="block group flex-1 min-w-0"
                                >
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`font-medium text-sm transition-colors truncate pr-2 ${showSellerStyle ? 'text-gray-900 group-hover:text-green-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                                    {showSellerStyle ? (
                                      <>
                                        {item.deal.property?.title || 'Ακίνητο'}
                                        {(() => {
                                          const buyerName = item.deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                          return buyerName ? (
                                            <span className="text-gray-600 font-normal">
                                              {' · '}{buyerName}
                                            </span>
                                          ) : null;
                                        })()}
                                      </>
                                    ) : (
                                      item.deal.property?.title || 'Ακίνητο'
                                    )}
                                  </p>
                                  <span className="text-xs font-bold text-gray-600 flex-shrink-0">{Math.round(item.progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      item.progress >= 75 ? (showSellerStyle ? 'bg-green-600' : 'bg-green-600') :
                                      item.progress >= 50 ? (showSellerStyle ? 'bg-green-500' : 'bg-blue-600') :
                                      item.progress >= 25 ? (showSellerStyle ? 'bg-emerald-500' : 'bg-purple-600') :
                                      (showSellerStyle ? 'bg-teal-500' : 'bg-orange-600')
                                    }`}
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>{item.completedSteps}/{item.totalSteps} βήματα</span>
                                  {item.currentStepLabel && (
                                    <span className={`font-medium ${showSellerStyle ? 'text-green-700' : 'text-blue-700'}`}>
                                      {item.currentStepLabel}
                                    </span>
                                  )}
                                  {item.deal.property && (
                                    <span>{formatDealPrice(item.deal)}</span>
                                  )}
                                </div>
                                </Link>
                                {canHide && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      archiveDeal(item.deal.id);
                                    }}
                                    title="Κρύψε από την πρόοδο"
                                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                  >
                                    <FaPauseCircle className="text-base" />
                                  </button>
                                )}
                              </div>
                            );})}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Upcoming Deadlines */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-gray-900">Προσεχείς Προθεσμίες</h2>
                          <button
                            onClick={() => handleTabChange('appointments')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            Όλα
                            <FaChevronRight className="text-xs" />
                          </button>
                        </div>
                        {upcomingDeadlines.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-8">Δεν υπάρχουν προσεχείς προθεσμίες</p>
                        ) : (
                          <div className="space-y-3">
                            {upcomingDeadlines.map((deadline, idx) => (
                              <Link
                                key={deadline.id}
                                href={deadline.href}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isToday(deadline.date) ? 'bg-purple-100' :
                                  isTomorrow(deadline.date) ? 'bg-blue-100' :
                                  'bg-gray-100'
                                }`}>
                                  <FaCalendarAlt className={`text-sm ${
                                    isToday(deadline.date) ? 'text-purple-600' :
                                    isTomorrow(deadline.date) ? 'text-blue-600' :
                                    'text-gray-600'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-gray-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                                      {deadline.title}
                                    </p>
                                    {deadline.status === 'PENDING' || deadline.status === 'REQUESTED' ? (
                                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                                        Σε Αναμονή
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{deadline.dealTitle}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {isToday(deadline.date) ? (
                                      <span className="font-medium text-gray-700">Σήμερα</span>
                                    ) : isTomorrow(deadline.date) ? (
                                      <span className="font-medium text-gray-700">Αύριο</span>
                                    ) : (
                                      format(deadline.date, 'd MMM yyyy', { locale: el })
                                    )}
                                    {deadline.type === 'appointment' && ' • '}
                                    {deadline.type === 'appointment' && format(deadline.date, 'HH:mm', { locale: el })}
                                  </p>
                                </div>
                                <FaChevronRight className="text-gray-300 text-xs group-hover:text-blue-600 transition-colors" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FaBell className="text-gray-600" />
                          <h2 className="text-lg font-bold text-gray-900">Πρόσφατη Δραστηριότητα</h2>
                        </div>
                        <span className="text-xs text-gray-500">{filteredActivity.length} ενημερώσεις</span>
                      </div>
                      {filteredActivity.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">Δεν υπάρχει πρόσφατη δραστηριότητα</p>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {paginatedActivity.map((activity) => {
                              const Icon = activity.icon;
                              return (
                                <div
                                  key={activity.id}
                                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group relative"
                                >
                                  <Link href={activity.href} className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      activity.type === 'document' ? 'bg-blue-100' :
                                      activity.type === 'appointment' ? 'bg-purple-100' :
                                      activity.type === 'professional' ? 'bg-green-100' :
                                      activity.type === 'step' ? (showAgentStyle ? 'bg-indigo-100' : 'bg-indigo-100') :
                                      'bg-gray-100'
                                    }`}>
                                      <Icon className={`text-sm ${
                                        activity.type === 'document' ? 'text-blue-600' :
                                        activity.type === 'appointment' ? 'text-purple-600' :
                                        activity.type === 'professional' ? 'text-green-600' :
                                        activity.type === 'step' ? (showAgentStyle ? 'text-indigo-600' : 'text-indigo-600') :
                                        'text-gray-600'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium text-gray-900 text-sm transition-colors ${
                                        activity.type === 'document' ? 'group-hover:text-blue-600' :
                                        activity.type === 'appointment' ? 'group-hover:text-purple-600' :
                                        activity.type === 'professional' ? 'group-hover:text-green-600' :
                                        activity.type === 'step' ? (showAgentStyle ? 'group-hover:text-indigo-600' : 'group-hover:text-indigo-600') :
                                        'group-hover:text-gray-600'
                                      }`}>
                                        {activity.title}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">{activity.dealTitle}</p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {format(activity.timestamp, 'd MMM yyyy, HH:mm', { locale: el })}
                                      </p>
                                    </div>
                                    <FaChevronRight className="text-gray-300 text-xs group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
                                  </Link>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      dismissActivity(activity.id);
                                    }}
                                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Αφαίρεση από τη λίστα"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {totalActivityPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                disabled={activityPage <= 1}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Προηγούμενη σελίδα"
                              >
                                <FaChevronLeft className="text-gray-600 text-sm" />
                              </button>
                              <span className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                                {(() => {
                                  const maxVisible = 5;
                                  let start = Math.max(1, activityPage - Math.floor(maxVisible / 2));
                                  let end = Math.min(totalActivityPages, start + maxVisible - 1);
                                  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => setActivityPage(p)}
                                      className={`min-w-[26px] h-6 rounded transition-colors ${
                                        activityPage === p
                                          ? (showSellerStyle ? 'bg-green-600 text-white' : 'bg-blue-600 text-white')
                                          : 'hover:bg-gray-200 text-gray-600'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  ));
                                })()}
                              </span>
                              <button
                                onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                                disabled={activityPage >= totalActivityPages}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Επόμενη σελίδα"
                              >
                                <FaChevronRight className="text-gray-600 text-sm" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Compact Calendar Widget */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">Ημερολόγιο Ραντεβού</h2>
                          <p className="text-sm text-gray-500 mt-1">Προβολή όλων των ραντεβού σας</p>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                          <button
                            onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                            className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"
                          >
                            <FaChevronLeft className="text-gray-600 text-sm" />
                          </button>
                          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center px-3">
                            {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                          </span>
                          <button
                            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                            className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"
                          >
                            <FaChevronRight className="text-gray-600 text-sm" />
                          </button>
                        </div>
                      </div>

                      {/* Month Calendar */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].map((day, idx) => (
                          <div key={idx} className="text-center text-xs font-bold text-gray-500 py-2 uppercase tracking-wide">
                            {day}
                          </div>
                        ))}
                        {calendarData.map((dayData, idx) => {
                          const isCurrentDay = isToday(dayData.date);
                          const dayAppointments = dayData.appointments;
                          const isInCurrentMonth = dayData.date.getMonth() === calendarMonth.getMonth();

                          return (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => dayAppointments.length > 0 && setSelectedDate(dayData.date)}
                              className={`min-h-[80px] p-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                                isCurrentDay
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              } ${!isInCurrentMonth ? 'opacity-40' : ''}`}
                            >
                              <div className={`text-xs font-bold mb-1 ${
                                isCurrentDay ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {format(dayData.date, 'd')}
                              </div>
                              <div className="space-y-0.5">
                                {dayAppointments.slice(0, 2).map((apt, aptIdx) => {
                                  const statusColor = getAppointmentStatusColor(apt.status);
                                  return (
                                    <div
                                      key={aptIdx}
                                      className={`text-[10px] p-0.5 rounded font-medium ${statusColor} text-white truncate`}
                                      title={getAppointmentTypeLabel(apt, deals.find(d => d.id === apt.dealId))}
                                    >
                                      {apt.startAt ? format(parseISO(apt.startAt), 'HH:mm') : ''}
                                    </div>
                                  );
                                })}
                                {dayAppointments.length > 2 && (
                                  <div className="text-[10px] text-gray-500 font-medium pt-0.5">
                                    +{dayAppointments.length - 2}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                    </>
                    )}
                  </motion.div>
                )}

                {/* Deals Tab */}
                {activeTab === 'deals' && (
                  <motion.div
                    key="deals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Sub-tabs: Πώληση / Ενοικίαση (για seller ή agent) */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {(showSellerStyle || showAgentStyle) ? (
                        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                          <button
                            onClick={() => setDealTypeFilter('SALE')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                              dealTypeFilter === 'SALE'
                                ? showAgentStyle ? 'bg-white text-indigo-700 shadow-sm' : 'bg-white text-green-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <FaHome className="inline mr-2" />
                            Πώληση ({sellerDealsByType.saleCount})
                          </button>
                          <button
                            onClick={() => setDealTypeFilter('RENT')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                              dealTypeFilter === 'RENT'
                                ? showAgentStyle ? 'bg-white text-indigo-700 shadow-sm' : 'bg-white text-green-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <FaKey className="inline mr-2" />
                            Ενοικίαση ({sellerDealsByType.rentCount})
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}
                      {filteredDeals.cancelledCount > 0 && (
                        <button
                          onClick={() => setShowCancelled(!showCancelled)}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                          <FaTimesCircle className={showCancelled ? 'text-red-600' : ''} />
                          {showCancelled ? 'Απόκρυψη' : 'Εμφάνιση'} Ακυρωμένων ({filteredDeals.cancelledCount})
                        </button>
                      )}
                    </div>

                    {/* Agent empty state: no active deals */}
                    {showAgentStyle &&
                      (!filteredDeals.active || filteredDeals.active.length === 0) &&
                      (!filteredDeals.onHold || filteredDeals.onHold.length === 0) && (
                      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-6 sm:p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
                          <FaHandshake className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Δεν έχετε ενεργές συναλλαγές</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Οι πελάτες σας θα εμφανίζονται εδώ όταν ξεκινήσουν μια συναλλαγή μέσω του συνδέσμου πρόσκλησής σας. Μοιραστείτε τον σύνδεσμό σας από την καρτέλα Επισκόπηση.
                        </p>
                        <button
                          onClick={() => handleTabChange('overview')}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          Πήγαινε στην Επισκόπηση
                        </button>
                      </div>
                    )}

                    {/* Buyer empty state: no active deals - encourage search (not for seller/agent) */}
                    {!showSellerStyle &&
                      !showAgentStyle &&
                      (!filteredDeals.active || filteredDeals.active.length === 0) &&
                      (!filteredDeals.onHold || filteredDeals.onHold.length === 0) && (
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-purple-50/60 p-6 sm:p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <FaSearch className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Δεν έχετε ενεργές συναλλαγές
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Ξεκινήστε την αναζήτησή σας για να βρείτε το ιδανικό ακίνητο και να δημιουργήσετε τη πρώτη σας συναλλαγή.
                        </p>
                        <Link
                          href="/properties"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <FaSearch className="w-4 h-4" />
                          Αναζήτηση ακινήτων
                        </Link>
                      </div>
                    )}

                    {/* Buyer / agent: «Σε αναμονή» πάνω από τις ενεργές (ο πωλητής διατηρεί την προηγούμενη σειρά) */}
                    <div
                      className={
                        showBuyerStyle || showAgentStyle
                          ? 'flex flex-col-reverse gap-10'
                          : 'flex flex-col gap-10'
                      }
                    >
                    {/* Active Deals Section */}
                    {filteredDeals.active && filteredDeals.active.length > 0 && (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setActiveDealsExpanded(!activeDealsExpanded)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left hover:opacity-95 transition-opacity ${showAgentStyle ? 'bg-gradient-to-r from-indigo-50 to-indigo-50/80 border-indigo-100' : 'bg-gradient-to-r from-indigo-50 via-blue-50/80 to-purple-50/60 border-indigo-200'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showAgentStyle ? 'bg-indigo-500/10' : 'bg-indigo-600/10'}`}>
                            <FaHandshake className={showAgentStyle ? 'text-indigo-600 text-lg' : 'text-indigo-600 text-lg'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Ενεργές Συναλλαγές</h2>
                            <p className="text-sm text-gray-600">Συναλλαγές σε εξέλιξη</p>
                          </div>
                          <span className={`px-4 py-1.5 text-white rounded-full text-sm font-semibold ${showAgentStyle ? 'bg-indigo-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                            {filteredDeals.active.length}
                          </span>
                          <FaChevronDown className={`text-gray-500 text-lg transition-transform duration-200 flex-shrink-0 ${activeDealsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {activeDealsExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                        <div className="grid gap-4">
                          {filteredDeals.active
                            .filter(deal => deal.status !== 'CANCELLED' || showCancelled)
                            .map((deal, idx) => {
                              const progressItem = activeDealsProgress.find(p => p.deal.id === deal.id);
                              const clientName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
                              const commission = getDealCommission(deal);
                              const isBlocked = deal.status === 'CANCELLED' || filteredDeals.onHold?.some(d => d.id === deal.id);
                              const stepInfo = progressItem ? `${progressItem.completedSteps}/${progressItem.totalSteps}` : '—';
                              const stepLabel = progressItem?.currentStepLabel || '—';
                              return (
                              <motion.div
                                key={deal.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                              >
                                <Link
                                  href={dealHref(deal.id)}
                                  className={`group block relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border-l-4 ${showAgentStyle ? 'border-l-indigo-500' : 'border-l-indigo-600'}`}
                                >
                                  <div className="p-6 pr-14">
                                    <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                      <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                        <Image
                                          src={getPropertyImageUrl(deal.property?.images?.[0])}
                                          alt={deal.property?.title || 'Ακίνητο'}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </div>
                                      {showAgentStyle ? (
                                        <div className="min-w-0 overflow-hidden text-left">
                                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h2 className="text-lg font-bold text-gray-900">
                                              {deal.property?.title || 'Ακίνητο'}
                                            </h2>
                                            <span className="text-base font-medium text-gray-600">
                                              {formatDealPrice(deal)}
                                              {(() => {
                                                const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                                return accepted ? (
                                                  <span className="text-emerald-600 font-semibold ml-2">
                                                    (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                                  </span>
                                                ) : null;
                                              })()}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            Ο Πελάτης μου: <span className="font-medium text-gray-900">{clientName}</span> (Αγοραστής)
                                          </p>
                                          <p className="text-sm text-gray-500">
                                            Status: Βήμα {stepInfo} ({stepLabel})
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="min-w-0 overflow-hidden">
                                          <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                            {deal.property?.title || 'Ακίνητο'}
                                            {showSellerStyle && (() => {
                                              const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                              return buyerName ? ` — ${buyerName}` : '';
                                            })()}
                                          </h2>
                                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                                            (deal.status === 'ACTIVE' || deal.status === 'DRAFT') ? (showAgentStyle ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-100 text-indigo-700') :
                                            statusColors[deal.status] || 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {(deal.status === 'ACTIVE' || deal.status === 'DRAFT') ? 'Ενεργό' : (statusLabels[deal.status] || deal.status)}
                                          </span>
                                          {deal.property && (
                                            <p className="text-xs text-gray-500 mt-2">
                                              {deal.property.street} {deal.property.number}, {deal.property.city}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {showAgentStyle ? (
                                        <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                                          <p className="text-sm font-bold text-emerald-600">
                                            Αναμενόμενη Αμοιβή: {commission !== null ? `€${commission.toLocaleString('el-GR')}` : 'Σε αναμονή συμφωνίας'}
                                          </p>
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isBlocked ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                            {isBlocked ? 'Blocked' : 'On track'}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="shrink-0 text-right self-center pl-2">
                                          {deal.property && (
                                            <>
                                              <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                                                {formatDealPrice(deal)}
                                              </p>
                                              {showSellerStyle && (() => {
                                                const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                                return accepted ? (
                                                  <span className="block text-emerald-600 font-semibold text-sm mt-0.5">
                                                    (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                                  </span>
                                                ) : null;
                                              })()}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 transition-all flex-shrink-0">
                                    <FaChevronRight className={`text-xl group-hover:translate-x-1 transition-transform ${showAgentStyle ? 'text-indigo-400 group-hover:text-indigo-600' : 'text-indigo-500 group-hover:text-indigo-600'}`} />
                                  </span>
                                </Link>
                              </motion.div>
                              );
                            })}
                        </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* On Hold Deals - Property locked by another deal (e.g. deposit paid) */}
                    {filteredDeals.onHold && filteredDeals.onHold.length > 0 && (
                      <div className={`space-y-4 ${showBuyerStyle || showAgentStyle ? '' : 'mt-10'}`}>
                        <button
                          type="button"
                          onClick={() => setOnHoldExpanded(!onHoldExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 hover:opacity-95 transition-opacity text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FaPauseCircle className="text-amber-600 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Σε αναμονή</h2>
                            <p className="text-sm text-gray-600">Ένα άλλο deal room για το ίδιο ακίνητο έχει προχωρήσει (π.χ. προκαταβολή)</p>
                          </div>
                          <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-sm font-semibold">
                            {filteredDeals.onHold.length}
                          </span>
                          <FaChevronDown className={`text-amber-600 text-lg transition-transform duration-200 flex-shrink-0 ${onHoldExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {onHoldExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                        <div className="grid gap-4">
                          {filteredDeals.onHold.map((deal, idx) => {
                            const clientName =
                              deal.participants?.find((p) => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
                            const commission = getDealCommission(deal);
                            return (
                            <motion.div
                              key={deal.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                            >
                              <Link
                                href={dealHref(deal.id)}
                                className="group block relative bg-white/80 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-400 overflow-hidden"
                              >
                                <div className="p-6 pr-14">
                                  <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                    <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                      <Image
                                        src={getPropertyImageUrl(deal.property?.images?.[0])}
                                        alt={deal.property?.title || 'Ακίνητο'}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    {showAgentStyle ? (
                                      <>
                                        <div className="min-w-0 overflow-hidden text-left">
                                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h2 className="text-lg font-bold text-gray-900">
                                              {deal.property?.title || 'Ακίνητο'}
                                            </h2>
                                            <span className="text-base font-medium text-gray-600">
                                              {formatDealPrice(deal)}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            Ο Πελάτης μου:{' '}
                                            <span className="font-medium text-gray-900">{clientName}</span> (Αγοραστής)
                                          </p>
                                          {deal.priorDepositBuyerName && (
                                            <p className="text-xs text-amber-900/90 mt-1 leading-snug">
                                              Προτεραιότητα στη συναλλαγή με:{' '}
                                              <span className="font-semibold">{deal.priorDepositBuyerName}</span>
                                            </p>
                                          )}
                                          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                            Σε αναμονή
                                          </span>
                                          {deal.property && (
                                            <p className="text-xs text-gray-500 mt-2">
                                              {deal.property.street} {deal.property.number}, {deal.property.city}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                                          <p className="text-sm font-bold text-emerald-600 text-right">
                                            Αναμενόμενη Αμοιβή:{' '}
                                            {commission !== null
                                              ? `€${commission.toLocaleString('el-GR')}`
                                              : 'Σε αναμονή συμφωνίας'}
                                          </p>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                    <div className="min-w-0 overflow-hidden text-left">
                                      <h2 className="text-lg font-bold text-gray-800">
                                        {deal.property?.title || 'Ακίνητο'}
                                      </h2>
                                      {(() => {
                                        const buyerName = getDealBuyerDisplayName(deal);
                                        return buyerName ? (
                                          <p className="text-sm font-medium text-gray-700 mt-1">
                                            Αγοραστής αυτού του deal room:{' '}
                                            <span className="text-gray-900">{buyerName}</span>
                                          </p>
                                        ) : null;
                                      })()}
                                      {deal.priorDepositBuyerName && (
                                        <p className="text-xs text-amber-900/90 mt-1 leading-snug">
                                          Προτεραιότητα στη συναλλαγή με:{' '}
                                          <span className="font-semibold">{deal.priorDepositBuyerName}</span>
                                        </p>
                                      )}
                                      <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                        Σε αναμονή
                                      </span>
                                      {deal.property && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          {deal.property.street} {deal.property.number}, {deal.property.city}
                                        </p>
                                      )}
                                    </div>
                                    {deal.property && (
                                      <div className="shrink-0 text-right self-center pl-2">
                                        <p className="text-lg font-bold text-gray-800 whitespace-nowrap">
                                          {formatDealPrice(deal)}
                                        </p>
                                        {showSellerStyle && (() => {
                                          const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                          return accepted ? (
                                            <span className="block text-emerald-600 font-semibold text-sm mt-0.5">
                                              (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <FaChevronRight className="text-amber-400 text-xl group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                                </span>
                              </Link>
                            </motion.div>
                            );
                          })}
                        </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    </div>

                    {/* Completed Deals Section */}
                    {filteredDeals.completed && filteredDeals.completed.filter(d => !archivedDealIds.has(d.id)).length > 0 && (
                      <div className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setCompletedExpanded(!completedExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 hover:opacity-95 transition-opacity text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <FaCheckCircle className="text-emerald-600 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Ολοκληρωμένες Συναλλαγές</h2>
                            <p className="text-sm text-gray-600">Συναλλαγές που ολοκληρώθηκαν</p>
                          </div>
                          <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm font-semibold">
                            {filteredDeals.completed.filter(d => !archivedDealIds.has(d.id)).length}
                          </span>
                          <FaChevronDown className={`text-gray-500 text-lg transition-transform duration-200 flex-shrink-0 ${completedExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {completedExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                        <div className="grid gap-4">
                          {filteredDeals.completed
                            .filter(deal => !archivedDealIds.has(deal.id))
                            .map((deal, idx) => (
                            <motion.div
                              key={deal.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className="relative"
                            >
                              <Link
                                href={dealHref(deal.id)}
                                className="group block relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500 overflow-hidden"
                              >
                                <div className="p-6 pr-14">
                                  <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                    <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                      <Image
                                        src={getPropertyImageUrl(deal.property?.images?.[0])}
                                        alt={deal.property?.title || 'Ακίνητο'}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <div className="min-w-0 overflow-hidden text-left">
                                      <h2 className="text-lg font-bold text-gray-900">
                                        {deal.property?.title || 'Ακίνητο'}
                                        {showSellerStyle && (() => {
                                          const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                          return buyerName ? ` — ${buyerName}` : '';
                                        })()}
                                      </h2>
                                      <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                        {filteredDeals.closedBecauseSold?.some(o => o.id === deal.id)
                                            ? 'Ακίνητο πουλήθηκε'
                                            : (statusLabels[deal.status] || deal.status)}
                                      </span>
                                      {deal.property && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          {deal.property.street} {deal.property.number}, {deal.property.city}
                                        </p>
                                      )}
                                    </div>
                                    {deal.property && (
                                      <div className="shrink-0 text-right self-center pl-2">
                                        <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                                          {formatDealPrice(deal)}
                                        </p>
                                        {showSellerStyle && (() => {
                                          const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                          return accepted ? (
                                            <span className="block text-emerald-600 font-semibold text-sm mt-0.5">
                                              (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <FaChevronRight className="text-emerald-400 text-xl group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                                </span>
                              </Link>
                              {showSellerStyle && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    archiveDeal(deal.id);
                                  }}
                                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 shadow-sm border border-emerald-200 flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 hover:border-green-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                                  title="Αρχειοθέτηση"
                                >
                                  <FaArchive className="text-sm" />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Ακυρωμένες συναλλαγές (agent): propertySoldToOther + CANCELLED σε μία ενότητα */}
                    {showAgentStyle && (() => {
                      const propertySold = filteredDeals.propertySoldToOther || [];
                      const cancelledDeals = showCancelled
                        ? (filteredDeals.all?.filter(d =>
                            !propertySold.some(p => p.id === d.id) &&
                            !filteredDeals.completed?.some(c => c.id === d.id) &&
                            !filteredDeals.active?.some(a => a.id === d.id) &&
                            !filteredDeals.onHold?.some(h => h.id === d.id) &&
                            d.status === 'CANCELLED'
                          ) || [])
                        : [];
                      const allCancelledForAgent = [...propertySold, ...cancelledDeals].filter(d => !archivedDealIds.has(d.id));
                      return allCancelledForAgent.length > 0 && (
                      <div key="agent-cancelled" className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setCancelledExpanded(!cancelledExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-slate-200 hover:from-slate-100 hover:to-gray-100 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-400/10 flex items-center justify-center">
                            <FaTimesCircle className="text-slate-500 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Ακυρωμένες συναλλαγές</h2>
                            <p className="text-sm text-gray-600">Το ακίνητο πουλήθηκε/ενοικιάστηκε σε άλλον αγοραστή ή η συναλλαγή ακυρώθηκε</p>
                          </div>
                          <span className="px-4 py-1.5 bg-slate-500 text-white rounded-full text-sm font-semibold">
                            {allCancelledForAgent.length}
                          </span>
                          <FaChevronDown className={`text-slate-500 text-lg transition-transform duration-200 flex-shrink-0 ${cancelledExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {cancelledExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                        <div className="grid gap-4">
                          {allCancelledForAgent.map((deal, idx) => {
                            const isPropertySold = propertySold.some(p => p.id === deal.id);
                            const isRent = getIsRentDeal(deal);
                            const reasonText = isPropertySold
                              ? (isRent ? 'Το ακίνητο ενοικιάστηκε σε άλλον αγοραστή' : 'Το ακίνητο πουλήθηκε σε άλλον αγοραστή')
                              : 'Η συναλλαγή ακυρώθηκε';
                            const clientName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name || 'Αγοραστής';
                            return (
                              <motion.div
                                key={deal.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="relative"
                              >
                                <Link
                                  href={dealHref(deal.id)}
                                  className="group block relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-slate-400 overflow-hidden"
                                >
                                  <div className="p-6 pr-14">
                                    <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                      <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                        <Image
                                          src={getPropertyImageUrl(deal.property?.images?.[0])}
                                          alt={deal.property?.title || 'Ακίνητο'}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </div>
                                      <div className="min-w-0 overflow-hidden text-left">
                                        <h2 className="text-lg font-bold text-gray-800">
                                          {deal.property?.title || 'Ακίνητο'}
                                        </h2>
                                        <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                          {isPropertySold ? (isRent ? 'Ενοικιάστηκε' : 'Πουλήθηκε') : 'Ακυρωμένη'}
                                        </span>
                                        {deal.property && (
                                          <p className="text-xs text-gray-500 mt-2">
                                            {deal.property.street} {deal.property.number}, {deal.property.city}
                                          </p>
                                        )}
                                        <p className="text-sm text-gray-600 mt-2 mb-0">
                                          Ο Πελάτης μου: <span className="font-medium text-gray-900">{clientName}</span>
                                        </p>
                                        <p className="text-xs text-gray-500">{reasonText}</p>
                                      </div>
                                      {deal.property && (
                                        <div className="shrink-0 text-right self-center pl-2">
                                          <p className="text-lg font-bold text-gray-800 whitespace-nowrap">
                                            {formatDealPrice(deal)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <FaChevronRight className="text-slate-400 text-xl group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                                  </span>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    archiveDeal(deal.id);
                                  }}
                                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 hover:border-green-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                  title="Αρχειοθέτηση"
                                >
                                  <FaArchive className="text-sm" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )})()}

                    {/* Cancelled deals (buyer/seller) */}
                    {!showAgentStyle && showCancelled && filteredDeals.cancelled && filteredDeals.cancelled.filter(d => !archivedDealIds.has(d.id)).length > 0 && (
                      <div className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setCancelledExpanded(!cancelledExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-50 to-red-50 rounded-2xl border border-rose-200 hover:from-rose-100 hover:to-red-100 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <FaTimesCircle className="text-rose-600 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Ακυρωμένες συναλλαγές</h2>
                            <p className="text-sm text-gray-600">Συναλλαγές που ακυρώθηκαν από τον αγοραστή/ενοικιαστή</p>
                          </div>
                          <span className="px-4 py-1.5 bg-rose-500 text-white rounded-full text-sm font-semibold">
                            {filteredDeals.cancelled.filter(d => !archivedDealIds.has(d.id)).length}
                          </span>
                          <FaChevronDown className={`text-rose-600 text-lg transition-transform duration-200 flex-shrink-0 ${cancelledExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {cancelledExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid gap-4">
                                {filteredDeals.cancelled
                                  .filter(deal => !archivedDealIds.has(deal.id))
                                  .map((deal, idx) => {
                                    const isRent = getIsRentDeal(deal);
                                    const cancelReason = isRent
                                      ? 'Ακυρώθηκε από τον ενοικιαστή'
                                      : 'Ακυρώθηκε από τον αγοραστή';
                                    return (
                                      <motion.div
                                        key={deal.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                      >
                                        <Link
                                          href={dealHref(deal.id)}
                                          className="group block relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-400 overflow-hidden"
                                        >
                                          <div className="p-6 pr-14">
                                            <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                              <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                                <Image
                                                  src={getPropertyImageUrl(deal.property?.images?.[0])}
                                                  alt={deal.property?.title || 'Ακίνητο'}
                                                  fill
                                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                              </div>
                                              <div className="min-w-0 overflow-hidden text-left">
                                                <h2 className="text-lg font-bold text-gray-800">
                                                  {deal.property?.title || 'Ακίνητο'}
                                                  {showSellerStyle && (() => {
                                                    const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                                    return buyerName ? ` — ${buyerName}` : '';
                                                  })()}
                                                </h2>
                                                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                                                  {cancelReason}
                                                </span>
                                                {deal.property && (
                                                  <p className="text-xs text-gray-500 mt-2">
                                                    {deal.property.street} {deal.property.number}, {deal.property.city}
                                                  </p>
                                                )}
                                              </div>
                                              {deal.property && (
                                                <div className="shrink-0 text-right self-center pl-2">
                                                  <p className="text-lg font-bold text-gray-800 whitespace-nowrap">
                                                    {formatDealPrice(deal)}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <FaChevronRight className="text-rose-400 text-xl group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                                          </span>
                                        </Link>
                                      </motion.div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Property sold/rented to another buyer (buyer only) */}
                    {!showSellerStyle && !showAgentStyle && filteredDeals.propertySoldToOther && filteredDeals.propertySoldToOther.filter(d => !archivedDealIds.has(d.id)).length > 0 && (
                      <div className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setPropertySoldToOtherExpanded(!propertySoldToOtherExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-slate-200 hover:from-slate-100 hover:to-gray-100 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-400/10 flex items-center justify-center">
                            <FaTimesCircle className="text-slate-500 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Ακίνητο πουλήθηκε/ενοικιάστηκε σε άλλον</h2>
                            <p className="text-sm text-gray-600">Συναλλαγές που δεν ολοκληρώθηκαν από εσάς</p>
                          </div>
                          <span className="px-4 py-1.5 bg-slate-500 text-white rounded-full text-sm font-semibold">
                            {filteredDeals.propertySoldToOther.filter(d => !archivedDealIds.has(d.id)).length}
                          </span>
                          <FaChevronDown className={`text-slate-500 text-lg transition-transform duration-200 flex-shrink-0 ${propertySoldToOtherExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {propertySoldToOtherExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid gap-4">
                                {filteredDeals.propertySoldToOther
                                  .filter(deal => !archivedDealIds.has(deal.id))
                                  .map((deal, idx) => {
                                    const isRent = getIsRentDeal(deal);
                                    return (
                                      <motion.div
                                        key={deal.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                      >
                                        <Link
                                          href={dealHref(deal.id)}
                                          className="group block relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-slate-400 overflow-hidden"
                                        >
                                          <div className="p-6 pr-14">
                                            <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                              <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                                <Image
                                                  src={getPropertyImageUrl(deal.property?.images?.[0])}
                                                  alt={deal.property?.title || 'Ακίνητο'}
                                                  fill
                                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                              </div>
                                              <div className="min-w-0 overflow-hidden text-left">
                                                <h2 className="text-lg font-bold text-gray-800">
                                                  {deal.property?.title || 'Ακίνητο'}
                                                </h2>
                                                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                  {isRent ? 'Το ακίνητο ενοικιάστηκε σε άλλον' : 'Το ακίνητο πουλήθηκε σε άλλον'}
                                                </span>
                                                {deal.property && (
                                                  <p className="text-xs text-gray-500 mt-2">
                                                    {deal.property.street} {deal.property.number}, {deal.property.city}
                                                  </p>
                                                )}
                                              </div>
                                              {deal.property && (
                                                <div className="shrink-0 text-right self-center pl-2">
                                                  <p className="text-lg font-bold text-gray-800 whitespace-nowrap">
                                                    {formatDealPrice(deal)}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <FaChevronRight className="text-slate-400 text-xl group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                                          </span>
                                        </Link>
                                      </motion.div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Other Deals (όχι για agent - τα ακυρωμένα πάνε στην ενιαία ενότητα) */}
                    {!showAgentStyle && filteredDeals.all && filteredDeals.all.filter(deal => {
                      const isActive = deal.status === 'ACTIVE' || deal.status === 'DRAFT';
                      const isInCompleted = filteredDeals.completed?.some(o => o.id === deal.id);
                      const isOnHold = filteredDeals.onHold?.some(o => o.id === deal.id);
                      const isPropertySoldToOther = filteredDeals.propertySoldToOther?.some(o => o.id === deal.id);
                      return !isActive && !isInCompleted && !isOnHold && !isPropertySoldToOther && deal.status !== 'CANCELLED';
                    }).length > 0 && (
                      <div className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setOtherDealsExpanded(!otherDealsExpanded)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200 hover:from-gray-100 hover:to-slate-100 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-400/10 flex items-center justify-center">
                            <FaTimesCircle className="text-gray-500 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">Άλλες Συναλλαγές</h2>
                            <p className="text-sm text-gray-600">Ακυρωμένες ή σε άλλη κατάσταση</p>
                          </div>
                          <span className="px-4 py-1.5 bg-gray-500 text-white rounded-full text-sm font-semibold">
                            {filteredDeals.all.filter(deal => {
                              const isActive = deal.status === 'ACTIVE' || deal.status === 'DRAFT';
                              const isInCompleted = filteredDeals.completed?.some(o => o.id === deal.id);
                              const isOnHold = filteredDeals.onHold?.some(o => o.id === deal.id);
                              const isPropertySoldToOther = filteredDeals.propertySoldToOther?.some(o => o.id === deal.id);
                              return !isActive && !isInCompleted && !isOnHold && !isPropertySoldToOther && deal.status !== 'CANCELLED';
                            }).length}
                          </span>
                          <FaChevronDown className={`text-gray-500 text-lg transition-transform duration-200 flex-shrink-0 ${otherDealsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {otherDealsExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                        <div className="grid gap-4">
                          {filteredDeals.all
                            .filter(deal => {
                              const isActive = deal.status === 'ACTIVE' || deal.status === 'DRAFT';
                              const isInCompleted = filteredDeals.completed?.some(o => o.id === deal.id);
                              const isOnHold = filteredDeals.onHold?.some(o => o.id === deal.id);
                              const isPropertySoldToOther = filteredDeals.propertySoldToOther?.some(o => o.id === deal.id);
                              return !isActive && !isInCompleted && !isOnHold && !isPropertySoldToOther && deal.status !== 'CANCELLED';
                            })
                            .map((deal, idx) => (
                              <motion.div
                                key={deal.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                              >
                                <Link
                                  href={dealHref(deal.id)}
                                  className="group block relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-gray-400 overflow-hidden"
                                >
                                  <div className="p-6 pr-14">
                                    <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                      <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                        <Image
                                          src={getPropertyImageUrl(deal.property?.images?.[0])}
                                          alt={deal.property?.title || 'Ακίνητο'}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </div>
                                      <div className="min-w-0 overflow-hidden text-left">
                                        <h2 className="text-lg font-bold text-gray-800">
                                          {deal.property?.title || 'Ακίνητο'}
                                          {showSellerStyle && (() => {
                                            const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                            return buyerName ? ` — ${buyerName}` : '';
                                          })()}
                                        </h2>
                                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                                          deal.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                          statusColors[deal.status] || 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {statusLabels[deal.status] || deal.status}
                                        </span>
                                        {deal.property && (
                                          <p className="text-xs text-gray-500 mt-2">
                                            {deal.property.street} {deal.property.number}, {deal.property.city}
                                          </p>
                                        )}
                                      </div>
                                      {deal.property && (
                                        <div className="shrink-0 text-right self-center pl-2">
                                          <p className="text-lg font-bold text-gray-800 whitespace-nowrap">
                                            {formatDealPrice(deal)}
                                          </p>
                                          {showSellerStyle && (() => {
                                            const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                            return accepted ? (
                                              <span className="block text-emerald-600 font-semibold text-sm mt-0.5">
                                                (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                              </span>
                                            ) : null;
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <FaChevronRight className="text-gray-400 text-xl group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                                  </span>
                                </Link>
                              </motion.div>
                            ))}
                        </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Αρχειοθετημένες συναλλαγές (seller και agent) */}
                    {(showSellerStyle || showAgentStyle) && archivedDealsInView.length > 0 && (
                      <div className="space-y-4 mt-10">
                        <button
                          type="button"
                          onClick={() => setArchivedDealsExpanded(!archivedDealsExpanded)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl border border-slate-200 hover:from-slate-100 hover:to-gray-200 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                              <FaArchive className="text-slate-600 text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-lg font-bold text-gray-900">Αρχειοθετημένες συναλλαγές</h2>
                              <p className="text-sm text-gray-600">
                                {archivedDealsInView.length} {archivedDealsInView.length === 1 ? 'συναλλαγή' : 'συναλλαγές'} στο αρχείο
                              </p>
                            </div>
                          </div>
                          <span className="px-4 py-1.5 bg-slate-500 text-white rounded-full text-sm font-semibold">
                            {archivedDealsInView.length}
                          </span>
                          <FaChevronDown className={`text-slate-500 text-lg transition-transform duration-200 flex-shrink-0 ${archivedDealsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {archivedDealsExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid gap-4">
                                {archivedDealsInView.map((deal, idx) => (
                                  <motion.div
                                    key={deal.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group/card relative"
                                  >
                                    <Link
                                      href={dealHref(deal.id)}
                                      className="group block relative bg-white/90 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-slate-400 overflow-hidden"
                                    >
                                      <div className="p-6 pr-14">
                                        <div className="grid grid-cols-[112px_1fr_auto] gap-4 items-start">
                                          <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden rounded-xl">
                                            <Image
                                              src={getPropertyImageUrl(deal.property?.images?.[0])}
                                              alt={deal.property?.title || 'Ακίνητο'}
                                              fill
                                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                          </div>
                                          <div className="min-w-0 overflow-hidden text-left">
                                            <h2 className="text-lg font-bold text-gray-700">
                                              {deal.property?.title || 'Ακίνητο'}
                                              {showSellerStyle && (() => {
                                                const buyerName = deal.participants?.find(p => p.role === 'BUYER')?.user?.name;
                                                return buyerName ? ` — ${buyerName}` : '';
                                              })()}
                                            </h2>
                                            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                                              Αρχειοθετημένη
                                            </span>
                                            {deal.property && (
                                              <p className="text-xs text-gray-500 mt-2">
                                                {deal.property.street} {deal.property.number}, {deal.property.city}
                                              </p>
                                            )}
                                          </div>
                                          {deal.property && (
                                            <div className="shrink-0 text-right self-center pl-2">
                                              <p className="text-lg font-bold text-gray-700 whitespace-nowrap">
                                                {formatDealPrice(deal)}
                                              </p>
                                              {showSellerStyle && (() => {
                                                const accepted = deal.offers?.find(o => o.status === 'ACCEPTED');
                                                return accepted ? (
                                                  <span className="block text-emerald-600 font-semibold text-sm mt-0.5">
                                                    (συμφωνημένη: {formatDealPrice(deal, Number(accepted.amount))})
                                                  </span>
                                                ) : null;
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <FaChevronRight className="text-slate-400 text-xl group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                                      </span>
                                    </Link>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        unarchiveDeal(deal.id);
                                      }}
                                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 hover:border-green-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                      title="Ανάκληση από το αρχείο"
                                    >
                                      <FaArchive className="text-sm" />
                                    </button>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {nextCursor && (
                      <div className="text-center mt-8">
                        <button
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto font-medium shadow-sm hover:shadow-md transition-all"
                        >
                          {loadingMore ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              Φόρτωση...
                            </>
                          ) : (
                            <>
                              Φόρτωση περισσότερων
                              <FaChevronRight />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Referrals Tab (Agent only) */}
                {activeTab === 'referrals' && showAgentStyle && (
                  <motion.div
                    key="referrals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h2 className="text-xl font-bold text-gray-900">Οι Πελάτες μου / Συστάσεις</h2>
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-colors"
                          onClick={() => setIsAddBuyerModalOpen(true)}
                        >
                          <FaPlus className="w-4 h-4 mr-2" />
                          Προσθήκη Ενδιαφερόμενου
                        </button>
                        <button
                          onClick={() => handleTabChange('overview')}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 px-4 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-50"
                        >
                          <FaLink className="text-xs" /> Σύνδεσμος πρόσκλησης
                        </button>
                      </div>
                    </div>
                    {agentReferredClients.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <FaUserPlus className="w-16 h-16 mx-auto text-indigo-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν έχετε ακόμη πελάτες</h3>
                        <p className="text-gray-600 max-w-md mx-auto mb-6">
                          Μοιραστείτε τον προσωπικό σας σύνδεσμο πρόσκλησης από την καρτέλα Επισκόπηση για να προωθήσετε ακίνητα σε νέους πελάτες.
                        </p>
                        <button
                          onClick={() => handleTabChange('overview')}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                        >
                          Πήγαινε στην Επισκόπηση
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {agentReferredClients.map((client) => {
                          const isExpanded = expandedReferralClientId === client.buyerId;
                          return (
                            <motion.div
                              key={client.buyerId}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                              <button
                                onClick={() => setExpandedReferralClientId(isExpanded ? null : client.buyerId)}
                                className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FaUser className="text-xl text-indigo-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-900">{client.buyerName}</h3>
                                    <p className="text-sm text-gray-500">
                                      {client.deals.length} {client.deals.length === 1 ? 'συναλλαγή' : 'συναλλαγές'} • {client.properties.length} {client.properties.length === 1 ? 'ακίνητο' : 'ακίνητα'}
                                    </p>
                                  </div>
                                </div>
                                <FaChevronDown className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-gray-100"
                                  >
                                    <div className="p-6 pt-4 space-y-4">
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Συναλλαγές (Deal Rooms)</h4>
                                        <ul className="space-y-2">
                                          {client.deals.map((deal) => (
                                            <li key={deal.id}>
                                              <Link
                                                href={dealHref(deal.id)}
                                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                                              >
                                                <FaHandshake className="text-sm" />
                                                {deal.property?.title || 'Ακίνητο'} — {statusLabels[deal.status] || deal.status}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Ακίνητα που συνδέθηκε</h4>
                                        <ul className="space-y-1">
                                          {client.properties.map((title, i) => (
                                            <li key={i} className="flex items-center gap-2 text-gray-600">
                                              <FaHome className="text-gray-400 text-xs" />
                                              {title}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Commissions Tab (Agent only) */}
                {activeTab === 'commissions' && showAgentStyle && (
                  <motion.div
                    key="commissions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FaMoneyBillWave className="text-xl text-indigo-600" />
                          </div>
                          <div className="text-sm text-gray-500">Αναμενόμενες Προμήθειες</div>
                        </div>
                        <p className="text-2xl font-bold text-indigo-600">€{expectedAgentCommissions.toLocaleString('el-GR')}</p>
                        <p className="text-xs text-gray-400 mt-1">0,5% πώληση · 50% ενοίκιο (ενεργά deals)</p>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <FaCheckCircle className="text-xl text-green-600" />
                          </div>
                          <div className="text-sm text-gray-500">Επιβεβαιωμένα Έσοδα</div>
                        </div>
                        <p className="text-2xl font-bold text-green-700">€{agentTotalEarned.toLocaleString('el-GR')}</p>
                        <p className="text-xs text-gray-400 mt-1">Από ολοκληρωμένες πωλήσεις</p>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <FaChartBar className="text-xl text-gray-600" />
                          </div>
                          <div className="text-sm text-gray-500">Συνολικά (αναμενόμενα + έσοδα)</div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">€{(expectedAgentCommissions + agentTotalEarned).toLocaleString('el-GR')}</p>
                      </div>
                    </div>

                    {/* Expected commissions - detailed */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FaClock className="text-indigo-600" />
                          Αναμενόμενες Προμήθειες (ενεργές συναλλαγές)
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Προμήθειες που θα λάβετε όταν ολοκληρωθούν τα deal rooms. Πωλήσεις: 0,5% από συμφωνημένη προσφορά. Ενοικιάσεις: 50% του συμφωνημένου ενοικίου.
                        </p>
                      </div>
                      {expectedCommissionsBreakdown.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          Δεν έχετε ενεργές συναλλαγές με συμφωνημένη προσφορά.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {expectedCommissionsBreakdown.map(({ deal, commission, clientName, propertyTitle }) => (
                            <Link
                              key={deal.id}
                              href={dealHref(deal.id)}
                              className="flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate">{propertyTitle}</p>
                                <p className="text-sm text-gray-500">Πελάτης: {clientName} · {statusLabels[deal.status] || deal.status}</p>
                              </div>
                              <span className="text-lg font-bold text-indigo-600 flex-shrink-0 ml-4">€{commission.toLocaleString('el-GR')}</span>
                            </Link>
                          ))}
                          <div className="p-4 bg-indigo-50/50 flex items-center justify-between font-semibold">
                            <span className="text-gray-700">Σύνολο αναμενόμενων</span>
                            <span className="text-indigo-700">€{expectedAgentCommissions.toLocaleString('el-GR')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Received earnings - detailed */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <FaCheckCircle className="text-green-600" />
                          Επιβεβαιωμένα Έσοδα
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Προμήθειες που έχετε ήδη κερδίσει από ολοκληρωμένες πωλήσεις (0,5% από συμφωνημένη προσφορά).
                        </p>
                      </div>
                      {receivedEarningsBreakdown.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          Δεν έχετε ακόμα επιβεβαιωμένα έσοδα από ολοκληρωμένες συναλλαγές.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {receivedEarningsBreakdown.map(({ deal, commission, clientName, propertyTitle, closedAt }) => (
                            <Link
                              key={deal.id}
                              href={dealHref(deal.id)}
                              className="flex items-center justify-between p-4 hover:bg-green-50/50 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate">{propertyTitle}</p>
                                <p className="text-sm text-gray-500">
                                  Πελάτης: {clientName}
                                  {closedAt && ` · Ολοκλήρωση: ${format(closedAt, 'd MMM yyyy', { locale: el })}`}
                                </p>
                              </div>
                              <span className="text-lg font-bold text-green-700 flex-shrink-0 ml-4">€{commission.toLocaleString('el-GR')}</span>
                            </Link>
                          ))}
                          <div className="p-4 bg-green-50/50 flex items-center justify-between font-semibold">
                            <span className="text-gray-700">Σύνολο επιβεβαιωμένων</span>
                            <span className="text-green-700">€{agentTotalEarned.toLocaleString('el-GR')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info note */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <FaInfoCircle className="text-indigo-500 flex-shrink-0 mt-0.5" />
                        Η προμήθεια ορίζεται στο 0,5% της συμφωνημένης τιμής πώλησης. Τα deals σε αναμονή (όταν το ακίνητο έχει ολοκληρωθεί σε άλλο deal) δεν περιλαμβάνονται στις αναμενόμενες προμήθειες.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && !showAgentStyle && (
                  <motion.div
                    key="appointments"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Upcoming Appointments Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Επερχόμενα Ραντεβού</h3>
                      {combinedAppointments.filter(apt => {
                        const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                        return aptDate && isFuture(aptDate) && (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED');
                      }).length === 0 ? (
                        <p className="text-gray-600">Δεν υπάρχουν επερχόμενα ραντεβού</p>
                      ) : (
                        <div className="space-y-3">
                          {combinedAppointments
                            .filter(apt => {
                              const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                              return aptDate && isFuture(aptDate) && (apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' || apt.status === 'PENDING' || apt.status === 'REQUESTED');
                            })
                            .slice(0, 5)
                            .map((apt, idx) => {
                              const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                              const deal = deals.find(d => d.id === apt.dealId);
                              return (
                                <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-gray-900">{getAppointmentTypeLabel(apt, deal)}</p>
                                        {(apt.status === 'PENDING' || apt.status === 'REQUESTED') && (
                                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                                            Σε Αναμονή
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{apt.dealTitle || 'Συναλλαγή'}</p>
                                      {aptDate && (
                                        <p className="text-sm text-gray-500 mt-1">
                                          {format(aptDate, 'EEEE, d MMMM yyyy, HH:mm', { locale: el })}
                                        </p>
                                      )}
                                      {(apt.status === 'PENDING' || apt.status === 'REQUESTED') && (
                                        <p className="text-xs text-amber-600 mt-1 italic">
                                          Αναμονή έγκρισης από τον πωλητή
                                        </p>
                                      )}
                                    </div>
                                    <Link
                                      href={dealHref(apt.dealId, 'appointments')}
                                      className="text-purple-600 hover:text-purple-700 ml-2"
                                    >
                                      <FaChevronRight />
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Calendar Widget */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Ημερολόγιο Ραντεβού</h2>
                          <p className="text-sm text-gray-500 mt-1">Προβολή όλων των ραντεβού σας</p>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                          <button
                            onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                            className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"
                          >
                            <FaChevronLeft className="text-gray-600 text-sm" />
                          </button>
                          <span className="text-sm font-semibold text-gray-700 min-w-[160px] text-center px-4">
                            {format(calendarMonth, 'MMMM yyyy', { locale: el })}
                          </span>
                          <button
                            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                            className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"
                          >
                            <FaChevronRight className="text-gray-600 text-sm" />
                          </button>
                        </div>
                      </div>

                      {/* Month Calendar */}
                      <div className="grid grid-cols-7 gap-2">
                        {['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].map((day, idx) => (
                          <div key={idx} className="text-center text-xs font-bold text-gray-500 py-2 uppercase tracking-wide">
                            {day}
                          </div>
                        ))}
                        {calendarData.map((dayData, idx) => {
                          const isCurrentDay = isToday(dayData.date);
                          const dayAppointments = dayData.appointments;
                          const isInCurrentMonth = dayData.date.getMonth() === calendarMonth.getMonth();

                          return (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => dayAppointments.length > 0 && setSelectedDate(dayData.date)}
                              className={`min-h-[100px] p-2 rounded-xl border-2 transition-all cursor-pointer ${
                                isCurrentDay
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              } ${!isInCurrentMonth ? 'opacity-40' : ''}`}
                            >
                              <div className={`text-sm font-bold mb-2 ${
                                isCurrentDay ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                                {format(dayData.date, 'd')}
                              </div>
                              <div className="space-y-1">
                                {dayAppointments.slice(0, 2).map((apt, aptIdx) => {
                                  const statusColor = getAppointmentStatusColor(apt.status);
                                  return (
                                    <div
                                      key={aptIdx}
                                      className={`text-xs p-1 rounded-lg font-medium ${statusColor} text-white truncate`}
                                      title={getAppointmentTypeLabel(apt, deals.find(d => d.id === apt.dealId))}
                                    >
                                      {apt.startAt ? format(parseISO(apt.startAt), 'HH:mm') : ''}
                                    </div>
                                  );
                                })}
                                {dayAppointments.length > 2 && (
                                  <div className="text-xs text-gray-500 font-medium pt-1">
                                    +{dayAppointments.length - 2} ακόμα
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* All Appointments List - collapsible with pagination */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setAllAppointmentsListExpanded(prev => !prev);
                          if (!allAppointmentsListExpanded) setAllAppointmentsPage(1);
                        }}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <FaCalendarAlt className="text-purple-600 text-lg" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Όλα τα Ραντεβού</h3>
                            <p className="text-sm text-gray-500">
                              {combinedAppointments.length} {combinedAppointments.length === 1 ? 'ραντεβού' : 'ραντεβού'} συνολικά
                            </p>
                          </div>
                        </div>
                        <FaChevronDown className={`text-gray-500 text-xl transition-transform duration-200 ${allAppointmentsListExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {allAppointmentsListExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-gray-100"
                          >
                            <div className="p-6 pt-0">
                              {combinedAppointments.length === 0 ? (
                                <div className="py-12 text-center">
                                  <p className="text-gray-600">Δεν έχετε προγραμματισμένα ραντεβού</p>
                                </div>
                              ) : (
                                <>
                                  <div className="grid gap-4">
                                    {[...combinedAppointments]
                                      .sort((a, b) => {
                                        const dateA = a.startAt ? parseISO(a.startAt) : (a.date ? parseISO(a.date) : new Date(0));
                                        const dateB = b.startAt ? parseISO(b.startAt) : (b.date ? parseISO(b.date) : new Date(0));
                                        return dateB.getTime() - dateA.getTime();
                                      })
                                      .slice((allAppointmentsPage - 1) * 5, allAppointmentsPage * 5)
                                      .map((apt, idx) => {
                                        const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                                        const deal = deals.find(d => d.id === apt.dealId);
                                        const isTodayAppt = aptDate && isToday(aptDate);
                                        const isTomorrowAppt = aptDate && isTomorrow(aptDate);

                                        return (
                                          <motion.div
                                            key={apt.id || idx}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                          >
                                            <Link
                                              href={dealHref(apt.dealId, 'appointments')}
                                              className="group block bg-gray-50 rounded-xl hover:bg-purple-50 transition-all border border-gray-100 overflow-hidden"
                                            >
                                              <div className="flex">
                                                <div className={`w-1 flex-shrink-0 bg-gradient-to-b ${getAppointmentStatusColor(apt.status)}`} />
                                                <div className="flex-1 p-4">
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h3 className="font-bold text-gray-900">
                                                          {getAppointmentTypeLabel(apt, deal)}
                                                        </h3>
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                          apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : apt.status === 'REQUESTED' || apt.status === 'PENDING'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : apt.status === 'CANCELLED'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                          {apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' ? 'Εγκεκριμένο' :
                                                           apt.status === 'REQUESTED' || apt.status === 'PENDING' ? 'Σε Αναμονή' :
                                                           apt.status === 'CANCELLED' ? 'Ακυρωμένο' :
                                                           apt.status === 'COMPLETED' ? 'Ολοκληρωμένο' :
                                                           apt.status}
                                                        </span>
                                                        {(isTodayAppt || isTomorrowAppt) && (
                                                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                            isTodayAppt ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                          }`}>
                                                            {isTodayAppt ? 'Σήμερα' : 'Αύριο'}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <p className="text-sm text-gray-600 truncate">{apt.dealTitle || 'Συναλλαγή'}</p>
                                                      {aptDate && (
                                                        <p className="text-sm text-gray-500 mt-1">
                                                          {format(aptDate, 'EEEE, d MMM yyyy, HH:mm', { locale: el })}
                                                        </p>
                                                      )}
                                                    </div>
                                                    <FaChevronRight className="text-gray-400 text-lg ml-2 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                                  </div>
                                                </div>
                                              </div>
                                            </Link>
                                          </motion.div>
                                        );
                                      })}
                                  </div>
                                  {combinedAppointments.length > 5 && (
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => setAllAppointmentsPage(p => Math.max(1, p - 1))}
                                        disabled={allAppointmentsPage <= 1}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        <FaChevronLeft className="text-xs" />
                                        Προηγούμενα
                                      </button>
                                      <span className="text-sm text-gray-600">
                                        Σελίδα {allAppointmentsPage} από {Math.ceil(combinedAppointments.length / 5)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setAllAppointmentsPage(p => Math.min(Math.ceil(combinedAppointments.length / 5), p + 1))}
                                        disabled={allAppointmentsPage >= Math.ceil(combinedAppointments.length / 5)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        Επόμενα
                                        <FaChevronRight className="text-xs" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Pending Tasks Tab */}
                {activeTab === 'pending' && !showAgentStyle && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {(() => {
                      const displayed = pendingTasks.filter(t => !getDismissedPendingTasks().has(t.id));
                      return displayed.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center"
                      >
                        <div className="w-24 h-24 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100">
                          <FaCheckCircle className="text-5xl text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Όλα σε τάξη</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">
                          Δεν έχετε εκκρεμείς ενέργειες. Όταν προκύψει κάτι που χρειάζεται την προσοχή σας, θα εμφανιστεί εδώ.
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">Εκκρεμότητες</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {displayed.length} {displayed.length === 1 ? 'ενέργεια χρειάζεται' : 'ενέργειες χρειάζονται'} την προσοχή σας
                            </p>
                          </div>
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm">
                            {displayed.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {displayed.map((task, idx) => {
                            const Icon = task.type === 'document' ? FaFileAlt : 
                                        task.type === 'professional' ? FaUserTie : 
                                        task.type === 'restore' ? FaHandshake :
                                        task.type === 'step' ? FaExchangeAlt :
                                        FaCalendarAlt;
                            const typeConfig = task.type === 'document'
                              ? { accent: 'border-l-4 border-l-purple-500', icon: 'bg-purple-50 text-purple-600', badge: 'Βήμα' }
                              : task.type === 'professional'
                              ? (showAgentStyle ? { accent: 'border-l-4 border-l-indigo-500', icon: 'bg-indigo-50 text-indigo-600', badge: 'Επαγγελματίας' } : { accent: 'border-l-4 border-l-indigo-500', icon: 'bg-indigo-50 text-indigo-600', badge: 'Επαγγελματίας' })
                              : task.type === 'restore'
                              ? { accent: 'border-l-4 border-l-amber-500', icon: 'bg-amber-50 text-amber-700', badge: 'Αίτημα' }
                              : task.type === 'step'
                              ? { accent: 'border-l-4 border-l-blue-500', icon: 'bg-blue-50 text-blue-600', badge: 'Βήμα' }
                              : { accent: 'border-l-4 border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-600', badge: 'Ραντεβού' };
                            const badgeLabel = task.type === 'document' ? 'Έγγραφο' : typeConfig.badge;

                            return (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                                className="relative"
                              >
                                <Link
                                  href={task.href}
                                  className={`group block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden ${typeConfig.accent}`}
                                >
                                  <div className="flex items-start gap-4 p-5">
                                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.icon} group-hover:scale-105 transition-transform`}>
                                      <Icon className="text-lg" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-500 bg-gray-100 mb-2">
                                        {badgeLabel}
                                      </span>
                                      <h4 className="font-semibold text-gray-900 text-base leading-snug mb-1 group-hover:text-blue-700 transition-colors">
                                        {task.title}
                                      </h4>
                                      {task.dealTitle && (
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                          <FaBuilding className="text-gray-400 text-xs flex-shrink-0" />
                                          <span className="truncate">{task.dealTitle}</span>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 pt-1 flex items-center gap-3">
                                      {task.type === 'restore' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleRestoreRequestResponse(task.dealId, 'APPROVE');
                                            }}
                                            disabled={!!restoreRequestActionLoading[`${task.dealId}:APPROVE`] || !!restoreRequestActionLoading[`${task.dealId}:REJECT`]}
                                            className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                          >
                                            Αποδοχή
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleRestoreRequestResponse(task.dealId, 'REJECT');
                                            }}
                                            disabled={!!restoreRequestActionLoading[`${task.dealId}:APPROVE`] || !!restoreRequestActionLoading[`${task.dealId}:REJECT`]}
                                            className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg border border-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                          >
                                            Απόρριψη
                                          </button>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          dismissPendingTask(task.id);
                                        }}
                                        className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
                                        title="Αφαιρώ από τις εκκρεμότητες"
                                      >
                                        Έγινε
                                      </button>
                                      <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                                        Ανοίξτε
                                        <FaChevronRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
                    );
                    })()}
                  </motion.div>
                )}

                {/* Properties Tab - Seller's listed properties (only when from seller) */}
                {activeTab === 'properties' && showSellerStyle && (
                  <motion.div
                    key="properties"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {sellerPropertiesLoading ? (
                      <div className="flex justify-center py-16">
                        <FaSpinner className="animate-spin text-4xl text-green-600" />
                      </div>
                    ) : sellerProperties.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="col-span-full flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl border-2 border-dashed border-gray-300"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-6">
                          <FaBuilding className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Δεν βρέθηκαν ακίνητα</h3>
                        <p className="text-gray-500 text-center mb-6">Προσθέστε το πρώτο σας ακίνητο για να ξεκινήσετε</p>
                        <Link
                          href="/add-listing"
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                          <FaPlus className="mr-2" />
                          Προσθήκη Ακινήτου
                        </Link>
                        <Link
                          href="/dashboard/seller"
                          className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Δείτε το πλήρες dashboard →
                        </Link>
                      </motion.div>
                    ) : (
                      <>
                        {/* Sub-tabs: Πουλιούνται / Ενοικιάζονται */}
                        {(() => {
                          const forSale = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'sale');
                          const forRent = sellerProperties.filter(p => getSellerPropertyListingType(p) === 'rent');
                          const forSaleNotSold = forSale.filter(p => !p.propertySold);
                          const forSaleSold = forSale.filter(p => p.propertySold);
                          const forRentNotRented = forRent.filter(p => !p.propertySold);
                          const forRentRented = forRent.filter(p => p.propertySold);
                          const forSaleSoldDisplay = forSaleSold.filter(p => !archivedPropertyIds.has(p.id || p._id));
                          const forRentRentedDisplay = forRentRented.filter(p => !archivedPropertyIds.has(p.id || p._id));
                          const archivedPropertiesList = [...forSaleSold, ...forRentRented].filter(p => archivedPropertyIds.has(p.id || p._id));
                          const displayedProperties = propertiesSubTab === 'sale' ? forSale : forRent;
                          const saleCategories = propertiesSubTab === 'sale'
                            ? [
                                { label: 'Διαθέσιμα προς πώληση', properties: forSaleNotSold },
                                { label: 'Πουλημένα', properties: forSaleSoldDisplay },
                              ]
                            : [
                                { label: 'Διαθέσιμα προς ενοικίαση', properties: forRentNotRented },
                                { label: 'Ενοικιασμένα', properties: forRentRentedDisplay },
                              ];
                          return (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                                  <button
                                    onClick={() => setPropertiesSubTab('sale')}
                                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    propertiesSubTab === 'sale'
                                      ? 'bg-white text-green-700 shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Πουλιούνται ({forSale.length})
                                </button>
                                <button
                                  onClick={() => setPropertiesSubTab('rent')}
                                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    propertiesSubTab === 'rent'
                                      ? 'bg-white text-green-700 shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Ενοικιάζονται ({forRent.length})
                                </button>
                                </div>
                                <Link
                                  href="/add-listing"
                                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 transition-all shadow-sm hover:shadow-md"
                                >
                                  <FaPlus className="mr-2" />
                                  Προσθήκη Ακινήτου
                                </Link>
                              </div>
                              {displayedProperties.length === 0 ? (
                                <motion.div
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="relative overflow-hidden rounded-2xl border-2 border-dashed border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 p-8 md:p-12"
                                >
                                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex items-center gap-5">
                                      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <FaBuilding className="text-3xl text-green-600" />
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-semibold text-gray-900">
                                          {propertiesSubTab === 'sale' ? 'Δεν έχετε ακίνητα προς πώληση' : 'Δεν έχετε ακίνητα προς ενοικίαση'}
                                        </h4>
                                        <p className="text-gray-600 mt-2 max-w-md">
                                          {propertiesSubTab === 'sale'
                                            ? 'Προσθέστε το πρώτο σας ακίνητο για πώληση και ξεκινήστε να λαμβάνετε ενδιαφέρον από αγοραστές.'
                                            : 'Προσθέστε ακίνητα προς ενοικίαση και ξεκινήστε να δημιουργείτε εισόδημα από τα ακίνητά σας.'}
                                        </p>
                                      </div>
                                    </div>
                                    <Link
                                      href="/add-listing"
                                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                                    >
                                      <FaPlus className="text-sm" />
                                      Προσθήκη Ακινήτου
                                    </Link>
                                  </div>
                                </motion.div>
                              ) : (
                                <div className="space-y-10">
                                  {saleCategories.map((cat) => {
                                    const isEmptyAvailableSale = propertiesSubTab === 'sale' && cat.label === 'Διαθέσιμα προς πώληση' && cat.properties.length === 0;
                                    const isEmptyAvailableRent = propertiesSubTab === 'rent' && cat.label === 'Διαθέσιμα προς ενοικίαση' && cat.properties.length === 0;
                                    const isEmptyAvailable = isEmptyAvailableSale || isEmptyAvailableRent;
                                    const hasSold = propertiesSubTab === 'sale' && forSaleSold.length > 0;
                                    const hasRented = propertiesSubTab === 'rent' && forRentRented.length > 0;
                                    if (cat.properties.length === 0 && !isEmptyAvailable) return null;
                                    if (isEmptyAvailable && (hasSold || hasRented)) {
                                      return (
                                        <div key={cat.label || 'all'}>
                                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            {cat.label}
                                            <span className="text-sm font-normal text-gray-500">(0)</span>
                                          </h3>
                                          <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="relative overflow-hidden rounded-2xl border-2 border-dashed border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 p-8 md:p-10"
                                          >
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                              <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                                                  <FaPlus className="text-2xl text-green-600" />
                                                </div>
                                                <div>
                                                  <h4 className="text-lg font-semibold text-gray-900">
                                                    {propertiesSubTab === 'sale' ? 'Δεν έχετε ακίνητα διαθέσιμα προς πώληση' : 'Δεν έχετε ακίνητα διαθέσιμα προς ενοικίαση'}
                                                  </h4>
                                                  <p className="text-gray-600 mt-1">
                                                    {propertiesSubTab === 'sale' ? 'Όλα τα ακίνητά σας έχουν πουληθεί. Προσθέστε νέο ακίνητο για να συνεχίσετε.' : 'Όλα τα ακίνητά σας έχουν ενοικιαστεί. Προσθέστε νέο ακίνητο για να συνεχίσετε.'}
                                                  </p>
                                                </div>
                                              </div>
                                              <Link
                                                href="/add-listing"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transition-all"
                                              >
                                                <FaPlus className="text-sm" />
                                                Προσθήκη Ακινήτου
                                              </Link>
                                            </div>
                                          </motion.div>
                                        </div>
                                      );
                                    }
                                    const isSoldCategory = cat.label === 'Πουλημένα';
                                    const isRentedCategory = cat.label === 'Ενοικιασμένα';
                                    const isCompletedCategory = isSoldCategory || isRentedCategory;
                                    return (
                                      <div key={cat.label || 'all'}>
                                        {cat.label && (
                                          isCompletedCategory ? (
                                            <button
                                              type="button"
                                              onClick={() => isSoldCategory ? setSoldPropertiesExpanded((p) => !p) : setRentedPropertiesExpanded((p) => !p)}
                                              className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-teal-50 border border-teal-100 hover:bg-teal-100/80 transition-colors text-left"
                                            >
                                              <span className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                {cat.label}
                                                <span className="text-sm font-normal text-gray-500">({cat.properties.length})</span>
                                              </span>
                                              <FaChevronDown className={`text-teal-600 text-lg transition-transform duration-200 flex-shrink-0 ${(isSoldCategory ? soldPropertiesExpanded : rentedPropertiesExpanded) ? 'rotate-180' : ''}`} />
                                            </button>
                                          ) : (
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                              {cat.label}
                                              <span className="text-sm font-normal text-gray-500">({cat.properties.length})</span>
                                            </h3>
                                          )
                                        )}
                                        <AnimatePresence>
                                        {(!isCompletedCategory || (isSoldCategory ? soldPropertiesExpanded : rentedPropertiesExpanded)) && (
                                        <motion.div
                                          key={isCompletedCategory ? (isSoldCategory ? 'sold-expanded' : 'rented-expanded') : 'available'}
                                          initial={isCompletedCategory ? { opacity: 0 } : { opacity: 1 }}
                                          animate={{ opacity: 1 }}
                                          exit={isCompletedCategory ? { opacity: 0 } : { opacity: 1 }}
                                          transition={{ duration: 0.2 }}
                                          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isCompletedCategory ? 'mt-4' : ''}`}
                                        >
                                          {cat.properties.map((property: any, index: number) => (
                                    <motion.div
                                      key={property.id || property._id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300 relative group"
                                    >
                                      <div className="relative h-56 w-full overflow-hidden">
                                        <Image
                                          src={getPropertyImageUrl(property.images?.[0])}
                                          alt={property.title}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                        {/* ΠΟΥΛΗΜΕΝΟ / ΕΝΟΙΚΙΑΣΜΕΝΟ overlay when deal room completed */}
                                        {property.propertySold && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                            <span className="px-6 py-3 rounded-xl text-lg font-bold tracking-wider text-white bg-teal-600/95 shadow-xl border-2 border-white/30">
                                              {getSellerPropertyListingType(property) === 'rent' ? 'ΕΝΟΙΚΙΑΣΜΕΝΟ' : 'ΠΟΥΛΗΜΕΝΟ'}
                                            </span>
                                          </div>
                                        )}
                                        {/* Verified: badge top right. Not Verified: banner (new listings always not verified) */}
                                        {property.isVerified ? (
                                          <div className="absolute top-3 right-3">
                                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md bg-emerald-500/95 text-white">
                                              Verified
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="absolute top-0 left-0 right-0 py-2 px-3 bg-amber-500/90 text-white text-center text-xs font-semibold">
                                            Not Verified
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{property.title}</h3>
                                        <p className="text-gray-600 mb-4 flex items-center">
                                          <FaMapMarkerAlt className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                                          {property.location || [property.city, property.state].filter(Boolean).join(', ')}
                                        </p>
                                        <div className="flex items-center justify-between mb-4">
                                          <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                                            {getSellerPropertyListingType(property) === 'rent'
                                              ? `${Number(property.price || 0).toLocaleString('el-GR')} €/μήνα`
                                              : `${Number(property.price || 0).toLocaleString('el-GR')} €`}
                                          </span>
                                          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                            property.propertySold
                                              ? 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800'
                                              : property.status === 'unavailable'
                                              ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                                              : getSellerPropertyListingType(property) === 'rent'
                                              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800'
                                              : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                          }`}>
                                            {property.status === 'unavailable'
                                              ? 'Αφαιρέθηκε'
                                              : property.propertySold
                                              ? (getSellerPropertyListingType(property) === 'rent' ? 'Ενοικιάστηκε' : 'Πουλήθηκε')
                                              : (getSellerPropertyListingType(property) === 'rent' ? 'Ενοικιάζεται' : 'Πουλιέται')}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                          <div className="flex items-center">
                                            <FaEye className="mr-2 text-green-500" />
                                            {property.stats?.views || 0} προβολές
                                          </div>
                                          <div className="flex items-center">
                                            <FaUsers className="mr-2 text-green-500" />
                                            {(property.leads?.length || 0)} ενδιαφερόμενοι
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          {property.propertySold ? (
                                            <button
                                              type="button"
                                              onClick={() => toggleArchiveProperty(property.id || property._id)}
                                              className="w-full px-4 py-3 text-center bg-slate-600 hover:bg-slate-700 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
                                            >
                                              <FaArchive className="text-sm" />
                                              Αρχειοθέτηση ακινήτου
                                            </button>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => setPropertyOverviewModal({ id: property.id || property._id, title: property.title })}
                                                className="flex-1 px-4 py-3 text-center bg-gradient-to-r from-teal-600 to-cyan-700 border border-transparent rounded-xl text-sm font-medium text-white hover:from-teal-700 hover:to-cyan-800 transition-all duration-200 flex items-center justify-center gap-2"
                                              >
                                                <FaChartBar className="text-sm" />
                                                Επισκόπηση Ακινήτου
                                              </button>
                                              <Link
                                                href={`/properties/${property.id || property._id}`}
                                                className="flex-1 px-4 py-3 text-center bg-gradient-to-r from-green-600 to-emerald-700 border border-transparent rounded-xl text-sm font-medium text-white hover:from-green-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center gap-2"
                                              >
                                                <FaEye className="text-sm" />
                                                Λεπτομέρειες
                                              </Link>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                        </motion.div>
                                        )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                  {/* Αρχειοθετημένα ακίνητα - στο κάτω μέρος */}
                                  {archivedPropertiesList.length > 0 && (
                                    <div className="pt-6 border-t border-gray-200 mt-8">
                                      <button
                                        type="button"
                                        onClick={() => setArchivedPropertiesExpanded((p) => !p)}
                                        className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-150 transition-colors text-left"
                                      >
                                        <span className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                          <FaArchive className="text-slate-500" />
                                          Αρχειοθετημένα ακίνητα
                                          <span className="text-sm font-normal text-gray-500">({archivedPropertiesList.length})</span>
                                        </span>
                                        <FaChevronDown className={`text-slate-600 text-lg transition-transform duration-200 flex-shrink-0 ${archivedPropertiesExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                      <AnimatePresence>
                                        {archivedPropertiesExpanded && (
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4"
                                          >
                                            {archivedPropertiesList.map((property: any, index: number) => (
                                              <motion.div
                                                key={property.id || property._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300 relative group opacity-90"
                                              >
                                                <div className="relative h-56 w-full overflow-hidden">
                                                  <Image
                                                    src={getPropertyImageUrl(property.images?.[0])}
                                                    alt={property.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                  />
                                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                  {property.propertySold && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                                      <span className="px-6 py-3 rounded-xl text-lg font-bold tracking-wider text-white bg-teal-600/95 shadow-xl border-2 border-white/30">
                                                        {getSellerPropertyListingType(property) === 'rent' ? 'ΕΝΟΙΚΙΑΣΜΕΝΟ' : 'ΠΟΥΛΗΜΕΝΟ'}
                                                      </span>
                                                    </div>
                                                  )}
                                                  <div className="absolute top-3 right-3">
                                                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md bg-slate-600/95 text-white">
                                                      Αρχειοθετημένο
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="p-6">
                                                  <h3 className="text-xl font-bold text-gray-900 mb-2">{property.title}</h3>
                                                  <p className="text-gray-600 mb-4 flex items-center">
                                                    <FaMapMarkerAlt className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                                                    {property.location || [property.city, property.state].filter(Boolean).join(', ')}
                                                  </p>
                                                  <div className="flex items-center justify-between mb-4">
                                                    <span className="text-2xl font-bold text-gray-700">
                                                      {getSellerPropertyListingType(property) === 'rent'
                                                        ? `${Number(property.price || 0).toLocaleString('el-GR')} €/μήνα`
                                                        : `${Number(property.price || 0).toLocaleString('el-GR')} €`}
                                                    </span>
                                                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                                                      {getSellerPropertyListingType(property) === 'rent' ? 'Ενοικιάστηκε' : 'Πουλήθηκε'}
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const id = property.id || property._id;
                                                      setArchivedPropertyIds((prev) => {
                                                        const next = new Set(prev);
                                                        next.delete(id);
                                                        if (typeof window !== 'undefined') localStorage.setItem('archivedPropertyIds', JSON.stringify([...next]));
                                                        return next;
                                                      });
                                                      toast.success('Το ακίνητο ανακτήθηκε από το αρχείο');
                                                    }}
                                                    className="w-full px-4 py-3 text-center bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-all flex items-center justify-center gap-2"
                                                  >
                                                    <FaArchive className="text-sm" />
                                                    Απο-αρχειοθέτηση
                                                  </button>
                                                </div>
                                              </motion.div>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Ραντεβού - {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: el })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimesCircle className="text-2xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {calendarData.find(d => isSameDay(d.date, selectedDate))?.appointments.map((apt, idx) => {
                const deal = deals.find(d => d.id === apt.dealId);
                const aptDate = apt.startAt ? parseISO(apt.startAt) : (apt.date ? parseISO(apt.date) : null);
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{getAppointmentTypeLabel(apt, deal)}</h4>
                        <p className="text-sm text-gray-600 mt-1">{apt.dealTitle || 'Συναλλαγή'}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : apt.status === 'REQUESTED' || apt.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700'
                          : apt.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status === 'CONFIRMED' || apt.status === 'ACCEPTED' ? 'Εγκεκριμένο' :
                         apt.status === 'REQUESTED' || apt.status === 'PENDING' ? 'Σε Αναμονή' :
                         apt.status === 'CANCELLED' ? 'Ακυρωμένο' :
                         apt.status === 'COMPLETED' ? 'Ολοκληρωμένο' :
                         apt.status}
                      </span>
                    </div>
                    {aptDate && (
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-gray-400" />
                          <span>{format(aptDate, 'HH:mm', { locale: el })}
                            {apt.endAt && ` - ${format(parseISO(apt.endAt), 'HH:mm', { locale: el })}`}
                          </span>
                        </div>
                        {apt.location && (
                          <div className="flex items-center gap-2">
                            <FaInfoCircle className="text-gray-400" />
                            <span>{apt.location}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <Link
                      href={dealHref(apt.dealId, 'appointments')}
                      className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Προβολή λεπτομερειών
                      <FaChevronRight className="text-xs" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer - Agent: same as /agent (dark, centered); Seller/Buyer: enhanced grid */}
      {showAgentStyle ? (
        <footer className="bg-slate-900 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
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
        <footer className={`py-12 mt-16 border-t ${showSellerStyle ? 'bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5] border-white/50' : 'bg-[#f5f0e8] border-stone-300/40'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showSellerStyle ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-r from-blue-900 to-slate-800'}`}>
                    <FaHome className="text-white text-sm" />
                  </div>
                  <span className={`text-xl font-bold ${showSellerStyle ? 'text-gray-900' : 'bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent'}`}>
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
                    <Link href="/properties" className={`text-gray-600 transition-colors duration-200 ${showSellerStyle ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Ακίνητα
                    </Link>
                  </li>
                  <li>
                    <Link href="/buyer/about" className={`text-gray-600 transition-colors duration-200 ${showSellerStyle ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Σχετικά
                    </Link>
                  </li>
                  <li>
                    <Link href="/buyer/contact" className={`text-gray-600 transition-colors duration-200 ${showSellerStyle ? 'hover:text-green-600' : 'hover:text-blue-800'}`}>
                      Επικοινωνία
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <FaEnvelope className={`mr-2 ${showSellerStyle ? 'text-green-500' : 'text-blue-700'}`} />
                    info@realestate.com
                  </li>
                  <li className="flex items-center">
                    <FaPhone className={`mr-2 ${showSellerStyle ? 'text-green-500' : 'text-blue-700'}`} />
                    +30 210 1234567
                  </li>
                  <li className="flex items-center">
                    <FaMapMarkerAlt className={`mr-2 ${showSellerStyle ? 'text-green-500' : 'text-blue-700'}`} />
                    Αθήνα, Ελλάδα
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
                <div className="flex space-x-4">
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${showSellerStyle ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-slate-200'}`}>
                    <FaFacebook className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${showSellerStyle ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-slate-200'}`}>
                    <FaTwitter className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${showSellerStyle ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-slate-200'}`}>
                    <FaInstagram className="w-5 h-5" />
                  </a>
                  <a href="#" className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${showSellerStyle ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-slate-200'}`}>
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
            <div className={`border-t mt-8 pt-8 text-center text-gray-600 ${showSellerStyle ? 'border-green-200/50' : 'border-gray-200'}`}>
              <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}

      {propertyOverviewModal && (
        <PropertyOverviewModal
          propertyId={propertyOverviewModal.id}
          propertyTitle={propertyOverviewModal.title}
          fromSeller={!!showSellerStyle}
          onClose={() => setPropertyOverviewModal(null)}
        />
      )}

      <AddInterestedBuyerModal
        open={isAddBuyerModalOpen}
        onClose={() => setIsAddBuyerModalOpen(false)}
        onSuccess={async (_connectionId) => {
          setIsAddBuyerModalOpen(false);
          await fetchDeals();
          toast.success('Ο ενδιαφερόμενος προστέθηκε επιτυχώς!');
        }}
        agentId={(session?.user as any)?.id || userId || ''}
        propertyId=""
        properties={agentProperties}
      />
    </React.Fragment>
  );
  }
  return React.createElement(DealsLayout, { className: mainClassName, children: React.createElement(LayoutContent, null) });
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    }>
      <DealsPageContent />
    </Suspense>
  );
}
