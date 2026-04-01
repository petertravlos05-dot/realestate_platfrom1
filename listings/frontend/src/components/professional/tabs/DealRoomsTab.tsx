'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Loader2,
  Building,
  MapPin,
  Users,
  Clock3,
  FileWarning,
  MessageSquareText,
  CalendarDays,
  ArrowRight,
  ChevronDown,
  PauseCircle,
} from 'lucide-react';
import { DealRoom } from '@/lib/api/deals';
import { getDealBuyerDisplayName } from '@/lib/utils/dealBuyerDisplay';

interface DealRoomsTabProps {
  deals: DealRoom[];
  loading?: boolean;
}

export default function DealRoomsTab({ deals, loading }: DealRoomsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'>('all');
  const [hideCancelledDeals, setHideCancelledDeals] = useState(false);
  const [onHoldSectionOpen, setOnHoldSectionOpen] = useState(true);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch = !searchQuery || 
        deal.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.property?.city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'ACTIVE'
          ? deal.status === 'ACTIVE' || deal.status === 'DRAFT'
          : deal.status === statusFilter;

      const matchesCancelledVisibility = hideCancelledDeals ? deal.status !== 'CANCELLED' : true;
      
      return matchesSearch && matchesStatus && matchesCancelledVisibility;
    });
  }, [deals, searchQuery, statusFilter, hideCancelledDeals]);

  /** Deal rooms blocked because another buyer completed deposit on the same property */
  const onHoldDeals = useMemo(
    () => filteredDeals.filter((deal) => !!deal.blockedByPriorDeposit),
    [filteredDeals]
  );

  const dealsExcludingOnHold = useMemo(
    () => filteredDeals.filter((deal) => !deal.blockedByPriorDeposit),
    [filteredDeals]
  );

  const visibleCancelledCount = useMemo(
    () => dealsExcludingOnHold.filter((deal) => deal.status === 'CANCELLED').length,
    [dealsExcludingOnHold]
  );

  const visibleNonCancelledDeals = useMemo(
    () => dealsExcludingOnHold.filter((deal) => deal.status !== 'CANCELLED'),
    [dealsExcludingOnHold]
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-teal-50 text-teal-700 border-teal-100',
      DRAFT: 'bg-teal-50 text-teal-700 border-teal-100',
      CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
      CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const labels = {
      ACTIVE: 'Ενεργό',
      DRAFT: 'Ενεργό',
      CLOSED: 'Ολοκληρωμένο',
      CANCELLED: 'Ακυρωμένο',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium border ${styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Τα Deal Rooms μου</h2>
            <p className="text-sm text-slate-500 mt-1">
              {filteredDeals.length} {filteredDeals.length === 1 ? 'deal room' : 'deal rooms'}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Αναζήτηση με τίτλο ή πόλη..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-11 pl-10 pr-4 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none bg-white text-slate-700"
            >
              <option value="all">Όλα</option>
              <option value="ACTIVE">Ενεργά</option>
              <option value="CLOSED">Ολοκληρωμένα</option>
              <option value="CANCELLED">Ακυρωμένα</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 h-11 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm">
            <input
              type="checkbox"
              checked={hideCancelledDeals}
              onChange={(e) => setHideCancelledDeals(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Απόκρυψη ακυρωμένων
          </label>
        </div>

        {/* Συναλλαγές σε αναμονή (προκαταβολή άλλου αγοραστή) — αναδιπλούμενη λίστα */}
        {onHoldDeals.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-amber-50/60 shadow-sm overflow-hidden ring-1 ring-amber-200/40">
            <button
              type="button"
              onClick={() => setOnHoldSectionOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-amber-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              aria-expanded={onHoldSectionOpen}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900">
                <PauseCircle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-amber-950">Συναλλαγές σε αναμονή</span>
                  <span className="rounded-full bg-amber-600/20 px-2 py-0.5 text-xs font-bold text-amber-950 tabular-nums">
                    {onHoldDeals.length}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Άλλη ενεργή συναλλαγή για το ίδιο ακίνητο έχει προκαταβολή — εδώ μόνο προβολή στο deal room.
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-amber-800 transition-transform duration-200 ${
                  onHoldSectionOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>
            {onHoldSectionOpen && (
              <div className="border-t border-amber-200/70 bg-white/50 px-3 py-3 sm:px-4 space-y-3">
                {onHoldDeals.map((deal) => {
                  const locationText = deal.property
                    ? `${deal.property.city || '-'}, ${deal.property.state || '-'}`
                    : 'Τοποθεσία μη διαθέσιμη';
                  const buyerName = getDealBuyerDisplayName(deal);
                  return (
                    <div
                      key={deal.id}
                      className="rounded-lg border border-amber-200/90 bg-white/95 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900">
                            Σε αναμονή
                          </span>
                          {getStatusBadge(deal.status)}
                        </div>
                        <h4 className="mt-2 font-bold text-slate-900 truncate">
                          {deal.property?.title || 'Άγνωστο ακίνητο'}
                        </h4>
                        {buyerName && (
                          <p className="mt-1 text-sm text-slate-800">
                            <span className="font-semibold text-amber-950/90">Αγοραστής αυτού του deal room:</span>{' '}
                            {buyerName}
                          </p>
                        )}
                        {deal.priorDepositBuyerName && (
                          <p className="mt-1 text-xs text-amber-900/85 leading-snug">
                            Η προτεραιότητα ανήκει στη συναλλαγή με τον/την{' '}
                            <span className="font-semibold">{deal.priorDepositBuyerName}</span> (έχει καταβληθεί
                            προκαταβολή).
                          </p>
                        )}
                        <div className="mt-1 flex items-center text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </div>
                      </div>
                      <Link
                        href={`/deals/${deal.id}?tab=overview`}
                        className="inline-flex items-center justify-center gap-2 shrink-0 bg-amber-700 hover:bg-amber-800 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Άνοιγμα deal room
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Deal rooms list */}
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Δεν υπάρχουν Deal Rooms</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Δεν βρέθηκαν deal rooms με αυτά τα κριτήρια'
                : 'Δεν έχεις συνδεθεί με καμία συναλλαγή ακόμα'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/professional/dashboard?tab=requests"
                className="inline-flex items-center gap-2 px-4 h-10 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Δες Αιτήματα
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {statusFilter === 'all' && visibleNonCancelledDeals.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ενεργά / Ολοκληρωμένα</h3>
                {visibleNonCancelledDeals.map((deal) => {
                  const hasPendingDocs = deal.documents?.some(doc => 
                    doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED'
                  );
                  const hasUpcomingAppointment = deal.appointments?.some(apt => 
                    apt.status === 'CONFIRMED' && new Date(apt.startAt) >= new Date()
                  );
                  const hasNewMessages = deal.threads?.some(thread => 
                    thread._count && thread._count.messages > 0
                  );
                  const participantsCount = deal.participants?.length || 0;
                  const locationText = deal.property
                    ? `${deal.property.city || '-'}, ${deal.property.state || '-'}`
                    : 'Τοποθεσία μη διαθέσιμη';

                  return (
                    <div
                      key={deal.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-teal-300 transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-teal-50 p-2 rounded-lg flex-shrink-0">
                            <Building className="w-5 h-5 text-teal-600" />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 truncate">
                            {deal.property?.title || 'Άγνωστο ακίνητο'}
                          </h4>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(deal.status)}</div>
                      </div>

                      {/* Body */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-slate-500">
                          <MapPin className="w-4 h-4 text-slate-400 mr-1.5" />
                          <span>{locationText}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                          <span className="inline-flex items-center">
                            <Users className="w-4 h-4 text-slate-400 mr-1.5" />
                            {participantsCount} συμμετέχοντες
                          </span>
                          <span className="inline-flex items-center">
                            <Clock3 className="w-4 h-4 text-slate-400 mr-1.5" />
                            Τελευταία ενημέρωση: {formatDate(deal.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Alerts + Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {hasPendingDocs && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                              <FileWarning className="w-3.5 h-3.5" />
                              Έγγραφα προς έλεγχο
                            </span>
                          )}
                          {hasNewMessages && (
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                              <MessageSquareText className="w-3.5 h-3.5" />
                              Νέο μήνυμα
                            </span>
                          )}
                          {hasUpcomingAppointment && (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Επερχόμενο ραντεβού
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/deals/${deal.id}?tab=overview`}
                          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2 rounded-lg transition-colors"
                        >
                          Είσοδος στο Deal Room
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {statusFilter === 'all' && visibleCancelledCount > 0 && !hideCancelledDeals && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-rose-700 uppercase tracking-wide">Ακυρωμένα Deal Rooms</h3>
                {dealsExcludingOnHold
                  .filter((deal) => deal.status === 'CANCELLED')
                  .map((deal) => {
                    const hasPendingDocs = deal.documents?.some(doc => 
                      doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED'
                    );
                    const hasUpcomingAppointment = deal.appointments?.some(apt => 
                      apt.status === 'CONFIRMED' && new Date(apt.startAt) >= new Date()
                    );
                    const hasNewMessages = deal.threads?.some(thread => 
                      thread._count && thread._count.messages > 0
                    );
                    const participantsCount = deal.participants?.length || 0;
                    const locationText = deal.property
                      ? `${deal.property.city || '-'}, ${deal.property.state || '-'}`
                      : 'Τοποθεσία μη διαθέσιμη';

                    return (
                      <div
                        key={deal.id}
                        className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 hover:shadow-md hover:border-rose-300 transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-rose-50 p-2 rounded-lg flex-shrink-0">
                              <Building className="w-5 h-5 text-rose-600" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 truncate">
                              {deal.property?.title || 'Άγνωστο ακίνητο'}
                            </h4>
                          </div>
                          <div className="flex-shrink-0">{getStatusBadge(deal.status)}</div>
                        </div>

                        {/* Body */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-slate-500">
                            <MapPin className="w-4 h-4 text-slate-400 mr-1.5" />
                            <span>{locationText}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                            <span className="inline-flex items-center">
                              <Users className="w-4 h-4 text-slate-400 mr-1.5" />
                              {participantsCount} συμμετέχοντες
                            </span>
                            <span className="inline-flex items-center">
                              <Clock3 className="w-4 h-4 text-slate-400 mr-1.5" />
                              Τελευταία ενημέρωση: {formatDate(deal.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Alerts + Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {hasPendingDocs && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                                <FileWarning className="w-3.5 h-3.5" />
                                Έγγραφα προς έλεγχο
                              </span>
                            )}
                            {hasNewMessages && (
                              <span className="bg-teal-50 text-teal-700 border border-teal-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                                <MessageSquareText className="w-3.5 h-3.5" />
                                Νέο μήνυμα
                              </span>
                            )}
                            {hasUpcomingAppointment && (
                              <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Επερχόμενο ραντεβού
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/deals/${deal.id}?tab=overview`}
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2 rounded-lg transition-colors"
                          >
                            Είσοδος στο Deal Room
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {statusFilter !== 'all' && (
              <div className="space-y-4">
                {dealsExcludingOnHold.map((deal) => {
              const hasPendingDocs = deal.documents?.some(doc => 
                doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED'
              );
              const hasUpcomingAppointment = deal.appointments?.some(apt => 
                apt.status === 'CONFIRMED' && new Date(apt.startAt) >= new Date()
              );
              const hasNewMessages = deal.threads?.some(thread => 
                thread._count && thread._count.messages > 0
              );
              const participantsCount = deal.participants?.length || 0;
              const locationText = deal.property
                ? `${deal.property.city || '-'}, ${deal.property.state || '-'}`
                : 'Τοποθεσία μη διαθέσιμη';

                  return (
                    <div
                      key={deal.id}
                      className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-all ${
                        deal.status === 'CANCELLED' ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${deal.status === 'CANCELLED' ? 'bg-rose-50' : 'bg-teal-50'}`}>
                        <Building className={`w-5 h-5 ${deal.status === 'CANCELLED' ? 'text-rose-600' : 'text-teal-600'}`} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 truncate">
                        {deal.property?.title || 'Άγνωστο ακίνητο'}
                      </h4>
                    </div>
                    <div className="flex-shrink-0">{getStatusBadge(deal.status)}</div>
                  </div>

                  {/* Body */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400 mr-1.5" />
                      <span>{locationText}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex items-center">
                        <Users className="w-4 h-4 text-slate-400 mr-1.5" />
                        {participantsCount} συμμετέχοντες
                      </span>
                      <span className="inline-flex items-center">
                        <Clock3 className="w-4 h-4 text-slate-400 mr-1.5" />
                        Τελευταία ενημέρωση: {formatDate(deal.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Alerts + Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {hasPendingDocs && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                          <FileWarning className="w-3.5 h-3.5" />
                          Έγγραφα προς έλεγχο
                        </span>
                      )}
                      {hasNewMessages && (
                        <span className="bg-teal-50 text-teal-700 border border-teal-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                          <MessageSquareText className="w-3.5 h-3.5" />
                          Νέο μήνυμα
                        </span>
                      )}
                      {hasUpcomingAppointment && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Επερχόμενο ραντεβού
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/deals/${deal.id}?tab=overview`}
                      className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2 rounded-lg transition-colors"
                    >
                      Είσοδος στο Deal Room
                      <ArrowRight className="w-4 h-4" />
                    </Link>
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
  );
}
