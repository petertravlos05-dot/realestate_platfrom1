'use client';

import { useEffect } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { FaBuilding, FaUsers, FaFileAlt, FaCalendarAlt, FaChevronRight, FaSpinner, FaExchangeAlt } from 'react-icons/fa';
import Image from 'next/image';

interface DealsTabContentProps {
  deals: DealRoom[];
  loading: boolean;
  onDealClick: (dealId: string) => void;
  onLoadDeals: () => Promise<void>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Σχέδιο',
  ACTIVE: 'Ενεργό',
  CLOSED: 'Ολοκληρωμένο',
  CANCELLED: 'Ακυρωμένο',
};

/**
 * DealsTabContent - Shows list of deals in Buyer Dashboard
 * 
 * Displays deals as cards that open DealRoomModal on click
 */
export default function DealsTabContent({
  deals,
  loading,
  onDealClick,
  onLoadDeals,
}: DealsTabContentProps) {
  useEffect(() => {
    if (deals.length === 0 && !loading) {
      onLoadDeals();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση συναλλαγών...</p>
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaExchangeAlt className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Δεν υπάρχουν συναλλαγές
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <button
          key={deal.id}
          onClick={() => onDealClick(deal.id)}
          className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all p-6"
        >
          <div className="flex items-start gap-6">
            {/* Property Image */}
            {deal.property?.images && deal.property.images.length > 0 && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={deal.property.images[0]}
                  alt={deal.property.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Deal Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1 truncate">
                    {deal.property?.title || 'Ακίνητο'}
                  </h3>
                  {deal.property && (
                    <p className="text-sm text-gray-600 mb-2">
                      {deal.property.street} {deal.property.number}, {deal.property.city}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-4 ${
                    statusColors[deal.status] || statusColors.DRAFT
                  }`}
                >
                  {statusLabels[deal.status] || deal.status}
                </span>
              </div>

              {deal.property && (
                <p className="text-lg font-bold text-gray-900 mb-4">
                  €{deal.property.price.toLocaleString()}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-gray-400" />
                  <span>{deal.participants?.length || 0} συμμετέχοντες</span>
                </div>
                {deal.documents && deal.documents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FaFileAlt className="text-gray-400" />
                    <span>{deal.documents.length} έγγραφα</span>
                  </div>
                )}
                {deal.appointments && deal.appointments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" />
                    <span>
                      {deal.appointments.filter((a) => a.status === 'CONFIRMED').length} ραντεβού
                    </span>
                  </div>
                )}
              </div>
            </div>

            <FaChevronRight className="text-gray-400 text-xl flex-shrink-0 ml-4" />
          </div>
        </button>
      ))}
    </div>
  );
}

