'use client';

import Link from 'next/link';
import { FaArrowRight, FaEnvelope, FaCalendarAlt, FaUser, FaClock, FaCheckCircle } from 'react-icons/fa';

interface NextActionPanelProps {
  pendingRequests: number;
  upcomingAppointments: number;
  pendingTasks: number;
  hasProfile: boolean;
  hasAvailability: boolean;
  /** Βιογραφικό, φωτογραφία ή website/LinkedIn στο δημόσιο προφίλ (tab Δημόσιο Προφίλ) */
  needsPublicProfileExtras: boolean;
}

export default function NextActionPanel({
  pendingRequests,
  upcomingAppointments,
  pendingTasks,
  hasProfile,
  hasAvailability,
  needsPublicProfileExtras,
}: NextActionPanelProps) {
  // Determine next action priority
  const getNextAction = () => {
    if (pendingRequests > 0) {
      return {
        title: 'Έχετε νέα αιτήματα',
        description: `${pendingRequests} ${pendingRequests === 1 ? 'αίτημα' : 'αιτήματα'} σε αναμονή`,
        cta: 'Δες Αιτήματα',
        href: '/professional/requests',
        icon: FaEnvelope,
        color: 'bg-white border-slate-200 text-slate-900',
        iconColor: 'text-teal-600',
      };
    }
    
    if (upcomingAppointments > 0) {
      return {
        title: 'Επερχόμενα ραντεβού',
        description: `${upcomingAppointments} ${upcomingAppointments === 1 ? 'ραντεβού' : 'ραντεβού'} αυτή την εβδομάδα`,
        cta: 'Δες Ραντεβού',
        href: '/professional/dashboard?tab=appointments',
        icon: FaCalendarAlt,
        color: 'bg-white border-slate-200 text-slate-900',
        iconColor: 'text-teal-600',
      };
    }
    
    if (!hasProfile) {
      return {
        title: 'Ολοκλήρωσε το Προφίλ σου',
        description: 'Πρόσθεσε τις πληροφορίες σου για να σε βρουν οι πελάτες',
        cta: 'Ολοκλήρωση Προφίλ',
        href: '/professional/profile',
        icon: FaUser,
        color: 'bg-white border-slate-200 text-slate-900',
        iconColor: 'text-teal-600',
      };
    }
    
    if (!hasAvailability) {
      return {
        title: 'Ρύθμισε τη Διαθεσιμότητά σου',
        description: 'Όρισε τις ώρες που δέχεσαι ραντεβού για να μπορούν οι πελάτες να κλείσουν αυτόματα.',
        cta: 'Διαχείριση',
        href: '/professional/dashboard?tab=appointments',
        icon: FaClock,
        color: 'bg-slate-900 text-white',
        iconColor: 'text-teal-400',
        variant: 'availability',
      };
    }
    
    if (needsPublicProfileExtras) {
      return {
        title: 'Βελτίωσε το δημόσιο προφίλ σου',
        description:
          'Πρόσθεσε βιογραφικό, φωτογραφία ή στοιχεία επικοινωνίας (website / LinkedIn) ώστε να σε βρίσκουν πιο εύκολα οι πελάτες.',
        cta: 'Επεξεργασία δημόσιου προφίλ',
        href: '/professional/dashboard?tab=pricing&section=basic',
        icon: FaUser,
        color: 'bg-white border-slate-200 text-slate-900',
        iconColor: 'text-teal-600',
      };
    }

    if (pendingTasks > 0) {
      return {
        title: 'Έχετε νέες εκκρεμότητες',
        description: `${pendingTasks} ${pendingTasks === 1 ? 'εκκρεμότητα' : 'εκκρεμότητες'} χρειάζονται ενέργεια`,
        cta: 'Δες Εκκρεμότητες',
        href: '/professional/dashboard?tab=tasks',
        icon: FaCheckCircle,
        color: 'bg-white border-slate-200 text-slate-900',
        iconColor: 'text-teal-600',
      };
    }
    
    return {
      title: 'Όλα είναι έτοιμα!',
      description: 'Το προφίλ σου είναι πλήρες και έτοιμο για νέους πελάτες',
      cta: null,
      href: null,
      icon: FaCheckCircle,
      color: 'bg-white border-slate-200 text-slate-900',
      iconColor: 'text-teal-600',
    };
  };

  const action = getNextAction();
  const Icon = action.icon;

  if ((action as any).variant === 'availability') {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-md">
        <div className="flex items-start gap-4">
          <div className="text-teal-400 mt-0.5">
            <FaClock className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Ρύθμισε τη Διαθεσιμότητά σου</h3>
            <p className="text-sm text-slate-300 mt-1">
              Όρισε τις ώρες που δέχεσαι ραντεβού για να μπορούν οι πελάτες να κλείσουν αυτόματα.
            </p>
          </div>
        </div>
        <div>
          <Link
            href="/professional/dashboard?tab=appointments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium text-sm transition-colors"
          >
            Διαχείριση
            <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-6 ${action.color}`}>
      <div className="flex items-start gap-4">
        <div className={`${action.iconColor} flex-shrink-0`}>
          <Icon className="text-xl" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
          <p className="text-sm text-slate-500 mb-4">{action.description}</p>
          {action.cta && action.href && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all font-medium text-sm text-slate-700"
            >
              {action.cta}
              <FaArrowRight className="text-xs" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
