'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DealRoom } from '@/lib/api/deals';
import ProfessionalsTab from './tabs/ProfessionalsTab';
import ChatTab from './tabs/ChatTab';
import DocumentsTab from './tabs/DocumentsTab';
import ActionsTab from './tabs/ActionsTab';
import OverviewTab from './tabs/OverviewTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isAgent, isNotary, isSeller, isBuyer, isEngineer, isLawyer } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from './useDealRoomTheme';

interface DealRoomTabsProps {
  deal: DealRoom;
  onRefresh: () => void;
  sseEvents?: any[];
  isBuyerFromGreece?: boolean;
}

type TabType = 'overview' | 'professionals' | 'chat' | 'documents' | 'appointments';

export default function DealRoomTabs({ deal, onRefresh, sseEvents = [], isBuyerFromGreece = true }: DealRoomTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accentBorder, accentText, accentRing, isProfessionalContext } = useDealRoomTheme();
  const { userId, role } = useCurrentUser();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initializedRef = useRef(false);
  
  // Check if user is agent, notary, seller, or seller's engineer/lawyer
  const isAgentRole = isAgent(deal, userId);
  const isNotaryRole = isNotary(deal, userId);
  const isSellerRole = isSeller(deal, userId);
  const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
  const isSellersEngineer = isEngineer(deal, userId) && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.requestedById === sellerId && r.professional?.user?.id === userId
  );
  const isSellersLawyer = isLawyer(deal, userId) && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId && r.professional?.user?.id === userId
  );
  const isBuyersLawyer = isLawyer(deal, userId) && deal.requests?.some(
    r => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId && r.professional?.user?.id === userId
  );
  const normalizedRole = (role || '').toUpperCase();
  const isProfessionalUser = ['LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT'].includes(normalizedRole);
  
  // Property for rent: hide professionals tab (no lawyer/notary for rentals)
  const getListingType = () => {
    const a = (deal.property as any)?.amenities;
    if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
      const t = String(a.listingType || a.transactionType).toLowerCase();
      return t === 'rent' ? 'rent' : 'sale';
    }
    return 'sale';
  };
  const isRent = getListingType() === 'rent';
  const isBuyerRole = isBuyer(deal, userId);

  const buyerLawyerUserId =
    deal.requests?.find(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === deal.buyerId
    )?.professional?.user?.id ?? null;

  /**
   * Έγγραφα που περιμένουν ανέβασμα / επανέβασμα από την πλευρά του τρέχοντος χρήστη
   * (ίδια λογική με τα «εκκρεμή προς εσάς» στο DocumentsTab, όλοι οι φάκελοι).
   */
  const documentsPendingUploadCount = useMemo(() => {
    if (!userId || isAgentRole) return 0;
    const docs = deal.documents ?? [];
    const needsUpload = (d: (typeof docs)[number]) =>
      d.status === 'REQUESTED' || d.status === 'CHANGES_REQUESTED';

    const notaryUserIds = new Set<string>([
      ...(deal.participants?.filter((p) => p.role === 'NOTARY').map((p) => p.userId) || []),
      ...(deal.requests
        ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'NOTARY' && r.professional?.user?.id)
        .map((r) => r.professional!.user.id) || []),
    ]);

    const engineerUserIds = new Set<string>([
      ...(deal.participants?.filter((p) => p.role === 'ENGINEER').map((p) => p.userId) || []),
      ...(deal.requests
        ?.filter((r) => r.status === 'ACCEPTED' && r.type === 'ENGINEER' && r.professional?.user?.id)
        .map((r) => r.professional!.user.id) || []),
    ]);

    const sellerLawyerRequest = deal.requests?.find(
      (r) => r.status === 'ACCEPTED' && r.type === 'LAWYER' && r.requestedById === sellerId
    );
    const sellerLawyerParticipant = deal.participants?.find(
      (p) => p.role === 'LAWYER' && p.userId === sellerLawyerRequest?.professional?.user?.id
    );
    const sellerLawyerUserId =
      sellerLawyerParticipant?.userId || sellerLawyerRequest?.professional?.user?.id || null;

    if (isBuyerRole) {
      return docs.filter((d) => d.requestedFromRole === 'BUYER' && needsUpload(d)).length;
    }
    if (isSellerRole) {
      return docs.filter((d) => d.requestedFromRole === 'SELLER' && needsUpload(d)).length;
    }
    if (isBuyersLawyer && userId) {
      return docs.filter(
        (d) =>
          d.requestedFromRole === 'BUYER' &&
          needsUpload(d) &&
          !!d.requestedById &&
          d.requestedById !== userId &&
          ((!!sellerLawyerUserId && d.requestedById === sellerLawyerUserId) ||
            notaryUserIds.has(d.requestedById) ||
            engineerUserIds.has(d.requestedById))
      ).length;
    }
    if (isSellersLawyer) {
      return docs.filter(
        (d) =>
          d.requestedFromRole === 'SELLER' &&
          needsUpload(d) &&
          (d.requestedById === userId ||
            (!!buyerLawyerUserId && d.requestedById === buyerLawyerUserId) ||
            (!!d.requestedById && notaryUserIds.has(d.requestedById)))
      ).length;
    }
    // Μηχανικός / συμβολαιογράφος / λογιστής: μόνο έγγραφα που έχουν ανεβάσει οι ίδιοι και ζητήθηκε διόρθωση
    if (isEngineer(deal, userId)) {
      return docs.filter((d) => d.status === 'CHANGES_REQUESTED' && d.uploadedById === userId).length;
    }
    if (isNotary(deal, userId)) {
      return docs.filter((d) => d.status === 'CHANGES_REQUESTED' && d.uploadedById === userId).length;
    }
    if (normalizedRole === 'ACCOUNTANT') {
      return docs.filter((d) => d.status === 'CHANGES_REQUESTED' && d.uploadedById === userId).length;
    }
    return 0;
  }, [
    deal,
    deal.documents,
    userId,
    isAgentRole,
    isBuyerRole,
    isSellerRole,
    isBuyersLawyer,
    isSellersLawyer,
    buyerLawyerUserId,
    normalizedRole,
  ]);

  // Available tabs - hide documents for agent; hide professionals for rent
  const availableTabs: TabType[] = isAgentRole 
    ? (isRent ? ['overview', 'chat', 'appointments'] : ['overview', 'professionals', 'chat', 'appointments'])
    : (isRent ? ['overview', 'chat', 'documents', 'appointments'] : ['overview', 'professionals', 'chat', 'documents', 'appointments']);
  const effectiveTabs = isProfessionalUser
    ? availableTabs.filter((tab) => tab !== 'professionals')
    : availableTabs;
  
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && effectiveTabs.includes(tabFromUrl)
      ? tabFromUrl
      : 'overview'
  );

  const showDocumentsTabHighlight = documentsPendingUploadCount > 0 && activeTab !== 'documents';

  // Initialize URL on first load if no tab is present (only once)
  useEffect(() => {
    if (initializedRef.current || !searchParams) return;
    if (!searchParams.get('tab')) {
      initializedRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      // Preserve from=seller when initializing tab
      const fromParam = searchParams.get('from');
      if (fromParam) url.searchParams.set('from', fromParam);
      router.replace(url.pathname + url.search, { scroll: false });
    } else {
      initializedRef.current = true;
    }
  }, [searchParams, router]); // Only run once on mount

  // Sync with URL changes (for browser back/forward and external navigation)
  // Only sync URL → state, never state → URL (to avoid loops)
  useEffect(() => {
    if (!searchParams || !initializedRef.current) return;
    const tabFromUrl = searchParams.get('tab');
    
    // Redirect old 'actions' tab to 'overview'
    if (tabFromUrl === 'actions') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }
    
    const validTabFromUrl = tabFromUrl as TabType | null;
    
    // If agent tries to access documents tab, redirect to overview
    if (isAgentRole && validTabFromUrl === 'documents') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }

    // If rent and user tries to access professionals tab, redirect to overview
    if (isRent && validTabFromUrl === 'professionals') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }
    
    // Professionals should not have access to professionals tab in deal room
    if (isProfessionalUser && validTabFromUrl === 'professionals') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'overview');
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }

    if (validTabFromUrl && effectiveTabs.includes(validTabFromUrl) && validTabFromUrl !== activeTab) {
      // URL has valid tab that differs from state - sync state to URL
      setActiveTab(validTabFromUrl);
    }
  }, [searchParams, isAgentRole, isRent, isProfessionalUser, effectiveTabs]); // Only depend on searchParams to avoid loops

  // Compute badges
  const unreadMessages = 0; // TODO: Get from SSE snapshot or chat state
  const documentsTabBadge = documentsPendingUploadCount;
  // Note: We don't show badge for appointments tab here because:
  // - This tab is for property appointments (viewing appointments)
  // - Professional appointments badge is shown in ProfessionalsTab → appointments sub-tab

  const tabs: Array<{ id: TabType; label: string; badge?: number; highlightRejected?: boolean }> = [
    { id: 'overview', label: 'Επισκόπηση' },
    ...(!isRent && !isProfessionalUser ? [{ id: 'professionals' as TabType, label: 'Επαγγελματίες' }] : []),
    { id: 'chat', label: 'Συνομιλία', badge: unreadMessages > 0 ? unreadMessages : undefined },
    ...(isAgentRole ? [] : [{ id: 'documents' as TabType, label: 'Φάκελοι Συναλλαγής', badge: documentsTabBadge > 0 ? documentsTabBadge : undefined, highlightRejected: showDocumentsTabHighlight }]),
    { id: 'appointments', label: 'Ραντεβού' },
  ];

  const handleTabChange = (tabId: TabType) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    // Preserve from=seller so navbar stays consistent when user came from /deals?from=seller&tab=deals
    const fromParam = searchParams?.get('from');
    if (fromParam) url.searchParams.set('from', fromParam);
    const docsSub = searchParams?.get('docsSub');
    if (tabId === 'documents' && (docsSub === 'htk' || docsSub === 'folder')) {
      url.searchParams.set('docsSub', docsSub);
    }
    if (tabId !== 'documents') {
      url.searchParams.delete('docsSub');
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${isProfessionalContext ? 'border border-slate-200' : 'border-2 border-gray-200'}`}>
      {/* Tab Navigation */}
      <div
        className={`bg-gradient-to-r ${isProfessionalContext ? 'from-slate-50 via-white to-slate-50 border-b border-slate-200' : 'from-gray-50 via-white to-gray-50 border-b-2 border-gray-200'}`}
      >
        <nav className="flex space-x-1 overflow-x-auto px-6" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`
                relative whitespace-nowrap py-4 px-5 border-b-3 font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${accentRing} focus:ring-offset-2
                ${
                  activeTab === tab.id
                    ? `${accentBorder} ${accentText} bg-white shadow-sm`
                    : tab.highlightRejected
                    ? 'border-transparent text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-300 ring-2 ring-amber-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:border-gray-300'
                }
              `}
            >
              <span className="flex items-center gap-2.5">
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold leading-none rounded-full min-w-[22px] shadow-sm ${
                      isProfessionalContext
                        ? 'text-teal-800 bg-teal-100 border border-teal-200'
                        : 'text-white bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content - openModal from URL για άνοιγμα modal από header CTA */}
      <div className={`p-8 lg:p-10 ${isProfessionalContext ? 'bg-slate-50/40' : ''}`}>
        {activeTab === 'overview' && (
          isNotaryRole || isSellerRole || isSellersEngineer || isSellersLawyer || isBuyersLawyer || isAgentRole
            ? <OverviewTab deal={deal} onRefresh={onRefresh} sseEvents={sseEvents} />
            : <ActionsTab deal={deal} onRefresh={onRefresh} isBuyerFromGreece={isBuyerFromGreece} sseEvents={sseEvents} openModal={searchParams?.get('openModal') || undefined} />
        )}
        {activeTab === 'professionals' && <ProfessionalsTab deal={deal} onRefresh={onRefresh} isBuyerFromGreece={isBuyerFromGreece} />}
        {activeTab === 'chat' && <ChatTab deal={deal} onRefresh={onRefresh} />}
        {activeTab === 'documents' && <DocumentsTab deal={deal} onRefresh={onRefresh} isBuyerFromGreece={isBuyerFromGreece} />}
        {activeTab === 'appointments' && <AppointmentsTab deal={deal} onRefresh={onRefresh} isBuyerFromGreece={isBuyerFromGreece} openModal={searchParams?.get('openModal') || undefined} />}
      </div>
    </div>
  );
}


