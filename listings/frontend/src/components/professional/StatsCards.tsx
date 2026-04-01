'use client';

import Link from 'next/link';
import { FaBuilding, FaCalendarAlt, FaFileAlt, FaEnvelope, FaTasks, FaSpinner } from 'react-icons/fa';

interface StatsCardsProps {
  stats: {
    activeDeals: number;
    appointments7Days: number;
    pendingRequests: number;
    documentsPendingReview: number;
    messagesToday?: number;
    tasksCount: number;
  };
  loading?: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Ενεργά Deal Rooms',
      value: stats.activeDeals,
      icon: FaBuilding,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/deals',
    },
    {
      label: 'Ραντεβού (7 ημέρες)',
      value: stats.appointments7Days,
      icon: FaCalendarAlt,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/professional/requests',
    },
    {
      label: 'Αιτήματα σε αναμονή',
      value: stats.pendingRequests,
      icon: FaFileAlt,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/professional/requests',
    },
    {
      label: 'Έγγραφα προς έλεγχο',
      value: stats.documentsPendingReview,
      icon: FaFileAlt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/deals',
    },
    ...(stats.messagesToday !== undefined ? [{
      label: 'Μηνύματα σήμερα',
      value: stats.messagesToday,
      icon: FaEnvelope,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      href: '/deals',
    }] : []),
    {
      label: 'Εκκρεμότητες',
      value: stats.tasksCount,
      icon: FaTasks,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '#tasks',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const content = (
          <div className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${card.href !== '#tasks' ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`${card.color} text-xl`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
            <div className="text-sm text-gray-600">{card.label}</div>
          </div>
        );

        if (card.href === '#tasks') {
          return <div key={idx}>{content}</div>;
        }

        return (
          <Link key={idx} href={card.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

