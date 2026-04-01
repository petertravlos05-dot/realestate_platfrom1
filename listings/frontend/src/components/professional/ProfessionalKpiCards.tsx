'use client';

import Link from 'next/link';
import { FaBuilding, FaCheckCircle, FaEnvelope, FaPercent, FaTasks } from 'react-icons/fa';

interface ProfessionalKpiCardsProps {
  stats: {
    activeDeals: number;
    completedDeals: number;
    cancelledDeals: number;
    assignedDeals: number;
    completionRate: number;
    appointmentsToday?: number;
    appointments7Days: number;
    pendingRequests: number;
    documentsPendingReview: number;
    tasksCount: number;
  };
  loading?: boolean;
}

export default function ProfessionalKpiCards({ stats, loading }: ProfessionalKpiCardsProps) {
  const cards = [
    {
      label: 'Ενεργά Deal Rooms',
      value: stats.activeDeals,
      icon: FaBuilding,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/professional/dashboard?tab=deals',
      description: 'Μη ολοκληρωμένα',
    },
    {
      label: 'Ολοκληρωμένα Deal Rooms',
      value: stats.completedDeals,
      icon: FaCheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/professional/dashboard?tab=deals',
      description: 'Με επιτυχές κλείσιμο',
    },
    {
      label: 'Αναληφθέντα Deal Rooms',
      value: stats.assignedDeals,
      icon: FaTasks,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/professional/dashboard?tab=deals',
      description: 'Όσα δεν ακυρώθηκαν',
    },
    {
      label: 'Ποσοστό ολοκλήρωσης',
      value: stats.completionRate,
      icon: FaPercent,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/professional/dashboard?tab=deals',
      description: `${stats.completedDeals} ολοκλ. / ${stats.cancelledDeals} ακυρ.`,
      suffix: '%',
    },
    {
      label: 'Αιτήματα σε αναμονή',
      value: stats.pendingRequests,
      icon: FaEnvelope,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      href: '/professional/dashboard?tab=requests',
      description: 'Από το tab Αιτήματα',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded mb-4"></div>
            <div className="h-10 bg-slate-200 rounded w-1/2 mb-3"></div>
            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const content = (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`${card.color} text-xl`} />
              </div>
              <span className="text-4xl font-bold text-slate-900">
                {card.value}
                {'suffix' in card ? card.suffix : ''}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{card.label}</div>
            {card.description && (
              <div className="text-xs text-slate-500">{card.description}</div>
            )}
          </div>
        );

        return (
          <Link key={idx} href={card.href || '#'} className="block">
            {content}
          </Link>
        );
      })}
    </div>
  );
}
