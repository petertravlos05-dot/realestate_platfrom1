'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FaEnvelope, FaFileAlt, FaCalendarAlt, FaHandshake, FaSpinner, FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { DealRoom } from '@/lib/api/deals';
import { ProfessionalRequest } from '@/lib/api/professionals';

interface ActivityItem {
  id: string;
  type: 'message' | 'document' | 'appointment' | 'request';
  title: string;
  description: string;
  timestamp: string;
  dealId: string;
  dealTitle?: string;
  icon: any;
  color: string;
}

interface ActivityFeedProps {
  deals: DealRoom[];
  requests: ProfessionalRequest[];
  userId?: string;
  role?: string | null;
  loading?: boolean;
}

const PAGE_SIZE = 5;

export default function ActivityFeed({ deals, requests, userId, role, loading }: ActivityFeedProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const roleUpper = (role || '').toUpperCase();

  const acceptedAtByDeal = useMemo(() => {
    const map = new Map<string, Date>();
    requests
      .filter((r) => r.status === 'ACCEPTED')
      .forEach((r) => {
        const ts = new Date(r.createdAt);
        const existing = map.get(r.dealRoomId);
        if (!existing || ts < existing) {
          map.set(r.dealRoomId, ts);
        }
      });
    return map;
  }, [requests]);

  // Compute recent activity from deals
  const computeActivity = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    
    deals.forEach(deal => {
      const connectedAt = acceptedAtByDeal.get(deal.id);
      if (!connectedAt) {
        return; // show activity only after professional has connected to that deal
      }

      // Recent messages (from threads)
      if (deal.threads && deal.threads.length > 0) {
        deal.threads.forEach(thread => {
          const relevantThread =
            thread.type === 'GROUP' ||
            !!thread.members?.some((m) => m.userId === userId);
          if (!relevantThread) return;

          const threadTs = new Date(deal.updatedAt);
          if (threadTs < connectedAt) return;

          if (thread._count && thread._count.messages > 0) {
            activities.push({
              id: `msg-${thread.id}`,
              type: 'message',
              title: 'Νέο μήνυμα',
              description: thread.title || 'Συνομιλία',
              timestamp: deal.updatedAt,
              dealId: deal.id,
              dealTitle: deal.property?.title,
              icon: FaEnvelope,
              color: 'text-teal-600',
            });
          }
        });
      }

      // Recent documents
      if (deal.documents && deal.documents.length > 0) {
        deal.documents.forEach(doc => {
          const docTs = new Date(doc.updatedAt || doc.createdAt || deal.updatedAt);
          if (docTs < connectedAt) return;

          const relevantDocument =
            doc.requestedById === userId ||
            doc.uploadedById === userId ||
            (doc.requestedFromRole === 'BUYER' && roleUpper === 'LAWYER') ||
            (doc.requestedFromRole === 'SELLER' && (roleUpper === 'NOTARY' || roleUpper === 'ENGINEER'));
          if (!relevantDocument) return;

          if (doc.status === 'UPLOADED' || doc.status === 'APPROVED') {
            activities.push({
              id: `doc-${doc.id}`,
              type: 'document',
              title: doc.status === 'UPLOADED' ? 'Νέο έγγραφο' : 'Έγγραφο εγκρίθηκε',
              description: doc.category,
              timestamp: doc.updatedAt,
              dealId: deal.id,
              dealTitle: deal.property?.title,
              icon: FaFileAlt,
              color: 'text-slate-400',
            });
          }
        });
      }

      // Recent appointments
      if (deal.appointments && deal.appointments.length > 0) {
        deal.appointments.forEach(apt => {
          const aptTs = new Date(apt.startAt);
          if (aptTs < connectedAt) return;

          const relevantAppointment =
            apt.professionalId === userId ||
            apt.bookedById === userId ||
            deal.participants?.some((p) => p.userId === userId && p.role === apt.type);
          if (!relevantAppointment && apt.professionalId !== userId) return;

          activities.push({
            id: `apt-${apt.id}`,
            type: 'appointment',
            title: apt.status === 'CONFIRMED' ? 'Ραντεβού επιβεβαιώθηκε' : 'Νέο αίτημα ραντεβού',
            description: new Date(apt.startAt).toLocaleDateString('el-GR'),
            timestamp: apt.startAt,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            icon: FaCalendarAlt,
              color: 'text-teal-600',
          });
        });
      }

      // Recent professional requests
      if (deal.requests && deal.requests.length > 0) {
        deal.requests.forEach(req => {
          const reqTs = new Date(req.createdAt);
          if (reqTs < connectedAt) return;

          const isOwnType =
            (roleUpper === 'LAWYER' && req.type === 'LAWYER') ||
            (roleUpper === 'NOTARY' && req.type === 'NOTARY') ||
            (roleUpper === 'ENGINEER' && req.type === 'ENGINEER');
          const relevantRequest = req.professional?.user?.id === userId || req.requestedById === userId || isOwnType;
          if (!relevantRequest) return;

          activities.push({
            id: `req-${req.id}`,
            type: 'request',
            title: req.status === 'ACCEPTED' ? 'Αίτημα αποδεκτό' : 'Νέο αίτημα',
            description: `${req.type} request`,
            timestamp: req.createdAt,
            dealId: deal.id,
            dealTitle: deal.property?.title,
            icon: FaHandshake,
              color: 'text-slate-400',
          });
        });
      }

      // Deal-step milestones by buyer/seller, only after professional connected
      const milestoneItems: Array<{ key: string; ts?: string | null; title: string; description: string }> = [
        {
          key: 'buyer-interest',
          ts: deal.buyerConfirmedInterestAt,
          title: 'Ολοκλήρωση βήματος από Buyer',
          description: 'Ο αγοραστής επιβεβαίωσε ενδιαφέρον.',
        },
        {
          key: 'buyer-skip',
          ts: deal.buyerSkippedViewingAt,
          title: 'Ολοκλήρωση βήματος από Buyer',
          description: 'Ο αγοραστής προχώρησε χωρίς επιτόπια επίσκεψη.',
        },
        {
          key: 'seller-docs-engineer',
          ts: deal.engineerApprovedSellerDocumentsAt,
          title: 'Ολοκλήρωση βήματος από Seller',
          description: 'Ο φάκελος seller εγκρίθηκε από μηχανικό.',
        },
        {
          key: 'seller-docs-lawyer',
          ts: deal.lawyerApprovedSellerDocumentsAt,
          title: 'Ολοκλήρωση βήματος από Seller',
          description: 'Ο φάκελος seller εγκρίθηκε από δικηγόρο.',
        },
        {
          key: 'notary-approved',
          ts: deal.notaryApprovedDocumentsAt,
          title: 'Ολοκλήρωση βήματος',
          description: 'Ο συμβολαιογράφος ενέκρινε τα δικαιολογητικά.',
        },
      ];

      milestoneItems.forEach((m) => {
        if (!m.ts) return;
        const mTs = new Date(m.ts);
        if (mTs < connectedAt) return;
        activities.push({
          id: `milestone-${deal.id}-${m.key}`,
          type: 'request',
          title: m.title,
          description: m.description,
          timestamp: m.ts,
          dealId: deal.id,
          dealTitle: deal.property?.title,
          icon: FaClock,
          color: 'text-teal-600',
        });
      });
    });

    // Sort by timestamp (most recent first) and limit to 10
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  };

  const activities = useMemo(() => computeActivity(), [deals, requests, userId, roleUpper, acceptedAtByDeal]);
  const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedActivities = activities.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Τώρα';
    if (diffMins < 60) return `πριν ${diffMins} λεπτά`;
    if (diffHours < 24) return `πριν ${diffHours} ώρες`;
    if (diffDays < 7) return `πριν ${diffDays} ημέρες`;
    return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
  };

  const getActivityUrl = (activity: ActivityItem) => {
    const tabMap = {
      message: 'chat',
      document: 'documents',
      appointment: 'appointments',
      request: 'overview',
    };
    return `/deals/${activity.dealId}?tab=${tabMap[activity.type]}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-2xl text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Πρόσφατη δραστηριότητα</h3>
      </div>

      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FaClock className="text-4xl mx-auto mb-2 text-slate-300" />
            <p>Δεν υπάρχει πρόσφατη δραστηριότητα</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <Link
                  key={activity.id}
                  href={getActivityUrl(activity)}
                  className="block rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`${activity.color} mt-1`}>
                      <Icon />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-slate-900">{activity.title}</h4>
                        <span className="text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-1">{activity.description}</p>
                      {activity.dealTitle && (
                        <p className="text-xs text-slate-500">{activity.dealTitle}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {totalPages > 1 && (
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-xs" />
                  Προηγούμενα
                </button>

                <div className="flex items-center gap-2">
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`h-8 min-w-8 px-2 rounded-md text-sm ${
                        p === safePage
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Επόμενα
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

