'use client';

import Link from 'next/link';
import { FaCheckCircle, FaFileAlt, FaCalendarAlt, FaEnvelope, FaSpinner, FaClock, FaUser, FaCamera, FaLink } from 'react-icons/fa';
import { DealRoom } from '@/lib/api/deals';
import { DealAppointment } from '@/lib/api/dealAppointments';
import { DealDocument } from '@/lib/api/dealDocuments';
import { ProfessionalRequest } from '@/lib/api/professionals';

interface Task {
  id: string;
  title: string;
  type:
    | 'document'
    | 'appointment'
    | 'request'
    | 'workflow'
    | 'profile'
    | 'availability';
  due: 'today' | 'tomorrow' | 'thisWeek' | 'later';
  dealId?: string;
  dealTitle?: string;
  icon: any;
  color: string;
  href: string;
}

interface TasksTabProps {
  deals: DealRoom[];
  appointments: DealAppointment[];
  documents: DealDocument[];
  requests: ProfessionalRequest[];
  hasProfile: boolean;
  hasAvailability: boolean;
  /** Για εκκρεμότητες δημόσιου προφίλ (ίδιο tab «Δημόσιο Προφίλ») */
  profile: Record<string, unknown> | null | undefined;
  role?: string | null;
  userId?: string | null;
  loading?: boolean;
}

export default function TasksTab({
  deals,
  appointments,
  documents,
  requests,
  hasProfile,
  hasAvailability,
  profile,
  role,
  userId,
  loading,
}: TasksTabProps) {
  const normalizedRole = (role || '').toUpperCase();
  const hasValidDealId = (value?: string | null) =>
    !!value && value.trim().length > 0 && value !== 'undefined' && value !== 'null';
  const dealTabHref = (dealId: string | undefined, tab: 'documents' | 'appointments' | 'overview') =>
    hasValidDealId(dealId) ? `/deals/${dealId}?tab=${tab}` : '/professional/dashboard?tab=deals';

  const computeTasks = (): Task[] => {
    const tasks: Task[] = [];
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Documents pending review
    documents
      .filter(doc => doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED')
      .forEach(doc => {
        if (!hasValidDealId(doc.dealRoomId)) return;
        const deal = deals.find(d => d.id === doc.dealRoomId);
        tasks.push({
          id: `doc-${doc.id}`,
          title: `Έλεγχος εγγράφου: ${doc.category}`,
          type: 'document',
          due: 'later',
          dealId: doc.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaFileAlt,
          color: 'text-purple-600',
          href: dealTabHref(doc.dealRoomId, 'documents'),
        });
      });

    // Upcoming appointments (preparation)
    appointments
      .filter((apt) => {
        if (apt.status !== 'CONFIRMED') return false;
        const start = new Date(apt.startAt);
        // Show preparation only for future appointments
        return !Number.isNaN(start.getTime()) && start >= now;
      })
      .forEach(apt => {
        if (!hasValidDealId(apt.dealRoomId)) return;
        const start = new Date(apt.startAt);
        const deal = deals.find(d => d.id === apt.dealRoomId);
        let due: Task['due'] = 'later';
        if (start.toDateString() === now.toDateString()) {
          due = 'today';
        } else if (start.toDateString() === tomorrow.toDateString()) {
          due = 'tomorrow';
        } else if (start <= weekFromNow) {
          due = 'thisWeek';
        }
        tasks.push({
          id: `apt-${apt.id}`,
          title: `Προετοιμασία ραντεβού`,
          type: 'appointment',
          due,
          dealId: apt.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaCalendarAlt,
          color: 'text-green-600',
          href: dealTabHref(apt.dealRoomId, 'appointments'),
        });
      });

    // Appointment requests requiring professional decision
    appointments
      .filter((apt) => apt.status === 'REQUESTED')
      .forEach((apt) => {
        if (!hasValidDealId(apt.dealRoomId)) return;
        const deal = deals.find((d) => d.id === apt.dealRoomId);
        tasks.push({
          id: `apt-decision-${apt.id}`,
          title: 'Έγκριση ή απόρριψη αιτήματος ραντεβού',
          type: 'appointment',
          due: 'today',
          dealId: apt.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaCalendarAlt,
          color: 'text-amber-600',
          href: '/professional/dashboard?tab=appointments',
        });
      });

    // Pending professional requests
    requests
      .filter(req => req.status === 'REQUESTED')
      .forEach(req => {
        if (!hasValidDealId(req.dealRoomId)) return;
        const deal = req.dealRoom;
        tasks.push({
          id: `req-${req.id}`,
          title: `Απάντηση σε αίτημα`,
          type: 'request',
          due: 'today',
          dealId: req.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaEnvelope,
          color: 'text-teal-600',
          href: '/professional/dashboard?tab=requests',
        });
      });

    // Role-specific deal-room workflow actions
    deals.forEach((deal) => {
      if (!hasValidDealId(deal.id)) return;
      const isClosed = deal.status === 'CANCELLED' || deal.status === 'CLOSED' || deal.status === 'COMPLETED';
      if (isClosed) return;

      const acceptedByRole = (deal.requests || []).some((r) => {
        if (r.status !== 'ACCEPTED' || r.type !== normalizedRole) return false;
        // If backend provides exact professional user, enforce it.
        if (r.professional?.user?.id && userId) return r.professional.user.id === userId;
        return true;
      });

      if (!acceptedByRole) return;

      if (normalizedRole === 'NOTARY') {
        if (!deal.notaryApprovedDocumentsAt) {
          tasks.push({
            id: `notary-approve-docs-${deal.id}`,
            title: 'Έγκριση εγγράφων ως συμβολαιογράφος',
            type: 'workflow',
            due: 'thisWeek',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            icon: FaCheckCircle,
            color: 'text-violet-600',
            href: dealTabHref(deal.id, 'documents'),
          });
        }

        const hasSigningProposal = (deal.appointments || []).some((a) => {
          const isRequestedInPerson = a.status === 'REQUESTED' && a.type === 'IN_PERSON';
          const isAvailabilitySlot = a.note === 'AVAILABLE_SLOT';
          // Real proposal must come from another participant (buyer/seller), not from the notary itself.
          const proposedByOtherUser = !!a.bookedById && (!!userId ? a.bookedById !== userId : true);
          return isRequestedInPerson && !isAvailabilitySlot && proposedByOtherUser;
        });
        if (hasSigningProposal) {
          tasks.push({
            id: `notary-signing-proposal-${deal.id}`,
            title: 'Απάντηση σε πρόταση ραντεβού υπογραφής',
            type: 'appointment',
            due: 'today',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            icon: FaCalendarAlt,
            color: 'text-amber-600',
            href: dealTabHref(deal.id, 'appointments'),
          });
        }
      }

      if (normalizedRole === 'ENGINEER' && !deal.engineerApprovedSellerDocumentsAt) {
        tasks.push({
          id: `engineer-approve-seller-docs-${deal.id}`,
          title: 'Έγκριση εγγράφων πωλητή (Μηχανικός)',
          type: 'workflow',
          due: 'thisWeek',
          dealId: deal.id,
          dealTitle: deal.property?.title,
          icon: FaCheckCircle,
          color: 'text-indigo-600',
          href: dealTabHref(deal.id, 'documents'),
        });
      }

      if (normalizedRole === 'LAWYER') {
        if (!deal.lawyerApprovedSellerDocumentsAt) {
          tasks.push({
            id: `lawyer-approve-seller-docs-${deal.id}`,
            title: 'Έγκριση εγγράφων πωλητή (Δικηγόρος)',
            type: 'workflow',
            due: 'thisWeek',
            dealId: deal.id,
            dealTitle: deal.property?.title,
            icon: FaCheckCircle,
            color: 'text-indigo-600',
            href: dealTabHref(deal.id, 'documents'),
          });
        }
      }
    });

    // Profile completion
    if (!hasProfile) {
      tasks.push({
        id: 'profile',
        title: 'Ολοκλήρωσε το Προφίλ σου',
        type: 'profile',
        due: 'thisWeek',
        icon: FaUser,
        color: 'text-blue-600',
        href: '/professional/profile',
      });
    }

    // Availability setup
    if (!hasAvailability) {
      tasks.push({
        id: 'availability',
        title: 'Ρύθμισε τη Διαθεσιμότητά σου',
        type: 'availability',
        due: 'thisWeek',
        icon: FaClock,
        color: 'text-indigo-600',
        href: '/professional/dashboard?tab=pricing&section=meetings',
      });
    }

    // Δημόσιο προφίλ (tab «Δημόσιο Προφίλ» — βασικές πληροφορίες, όχι τιμολόγηση)
    if (hasProfile && profile) {
      const services = (profile.services || {}) as Record<string, unknown>;
      const publicProfile = (services.publicProfile || {}) as Record<string, unknown>;
      const bioOk = !!(profile.bio && String(profile.bio).trim().length > 0);
      const avatarOk = !!(publicProfile.avatarDataUrl && String(publicProfile.avatarDataUrl).trim().length > 0);
      const socialOk = !!(
        (publicProfile.website && String(publicProfile.website).trim()) ||
        (publicProfile.linkedin && String(publicProfile.linkedin).trim())
      );

      if (!bioOk) {
        tasks.push({
          id: 'public-profile-bio',
          title: 'Πρόσθεσε επαγγελματικό βιογραφικό (δημόσιο προφίλ)',
          type: 'profile',
          due: 'thisWeek',
          icon: FaFileAlt,
          color: 'text-blue-600',
          href: '/professional/dashboard?tab=pricing&section=basic',
        });
      }
      if (!avatarOk) {
        tasks.push({
          id: 'public-profile-photo',
          title: 'Πρόσθεσε φωτογραφία στο δημόσιο προφίλ',
          type: 'profile',
          due: 'thisWeek',
          icon: FaCamera,
          color: 'text-indigo-600',
          href: '/professional/dashboard?tab=pricing&section=basic',
        });
      }
      if (!socialOk) {
        tasks.push({
          id: 'public-profile-links',
          title: 'Πρόσθεσε website ή LinkedIn (δημόσιο προφίλ)',
          type: 'profile',
          due: 'thisWeek',
          icon: FaLink,
          color: 'text-sky-600',
          href: '/professional/dashboard?tab=pricing&section=basic',
        });
      }
    }

    // Sort by due priority
    const priority = { today: 0, tomorrow: 1, thisWeek: 2, later: 3 };
    const uniqueTasks = tasks.filter((task, index, arr) => arr.findIndex((t) => t.id === task.id) === index);
    return uniqueTasks.sort((a, b) => priority[a.due] - priority[b.due]);
  };

  const tasks = computeTasks();

  const getDueLabel = (due: Task['due']) => {
    const labels = {
      today: 'Σήμερα',
      tomorrow: 'Αύριο',
      thisWeek: 'Αυτή την εβδομάδα',
      later: 'Σύντομα',
    };
    return labels[due];
  };

  const getDueColor = (due: Task['due']) => {
    const colors = {
      today: 'text-rose-700 bg-rose-50 border border-rose-200',
      tomorrow: 'text-amber-700 bg-amber-50 border border-amber-200',
      thisWeek: 'text-teal-700 bg-teal-50 border border-teal-200',
      later: 'text-slate-600 bg-slate-100 border border-slate-200',
    };
    return colors[due];
  };

  const getTypeLabel = (type: Task['type']) => {
    const labels: Record<Task['type'], string> = {
      request: 'Αίτημα',
      appointment: 'Ραντεβού',
      document: 'Έγγραφο',
      workflow: 'Βήμα Deal Room',
      profile: 'Προφίλ / δημόσιο προφίλ',
      availability: 'Διαθεσιμότητα',
    };
    return labels[type];
  };

  const groupedTasks: Array<{ key: string; title: string; tasks: Task[] }> = [
    { key: 'request', title: 'Αιτήματα Συνεργασίας', tasks: tasks.filter((t) => t.type === 'request') },
    { key: 'appointment', title: 'Ραντεβού', tasks: tasks.filter((t) => t.type === 'appointment') },
    { key: 'document', title: 'Έγγραφα', tasks: tasks.filter((t) => t.type === 'document') },
    { key: 'workflow', title: 'Βήματα Deal Room', tasks: tasks.filter((t) => t.type === 'workflow') },
    {
      key: 'setup',
      title: 'Ρυθμίσεις Προφίλ',
      tasks: tasks.filter((t) => t.type === 'profile' || t.type === 'availability'),
    },
  ].filter((group) => group.tasks.length > 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Εκκρεμότητες</h2>
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
              {tasks.length}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-1">
          Αιτήματα, ραντεβού, έγγραφα, βήματα Deal Room και συμπλήρωση δημόσιου προφίλ (όχι υποχρεωτικές τιμές).
        </p>
        <p className="text-sm text-slate-500">
          {tasks.length} {tasks.length === 1 ? 'εκκρεμότητα' : 'εκκρεμότητες'}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FaCheckCircle className="text-5xl text-teal-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Δεν υπάρχουν εκκρεμότητες</h3>
          <p className="text-slate-500">Όλα τα tasks έχουν ολοκληρωθεί.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTasks.map((group) => (
            <div key={group.key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  {group.tasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {group.tasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <Link
                      key={task.id}
                      href={task.href}
                      className="block border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${task.color} mt-0.5 flex-shrink-0`}>
                          <Icon className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-semibold text-slate-900">{task.title}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDueColor(task.due)}`}>
                              {getDueLabel(task.due)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{getTypeLabel(task.type)}</span>
                            {task.dealTitle && <span>{task.dealTitle}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
