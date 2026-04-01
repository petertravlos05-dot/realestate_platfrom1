'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FaBuilding, FaUsers, FaSearch, FaSpinner, FaFilter } from 'react-icons/fa';
import { DealRoom } from '@/lib/api/deals';

interface DealsWidgetProps {
  deals: DealRoom[];
  loading?: boolean;
}

export default function DealsWidget({ deals, loading }: DealsWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'DRAFT' | 'CLOSED'>('all');

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = !searchQuery || 
        deal.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.property?.city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-blue-100 text-blue-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      CLOSED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    const labels = {
      ACTIVE: 'Ενεργό',
      DRAFT: 'Σχέδιο',
      CLOSED: 'Ολοκληρωμένο',
      CANCELLED: 'Ακυρωμένο',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Τα Deal Rooms μου</h3>
          <Link
            href="/professional/requests"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Δες Αιτήματα
          </Link>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Αναζήτηση..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Όλα</option>
              <option value="ACTIVE">Ενεργά</option>
              <option value="DRAFT">Σχέδια</option>
              <option value="CLOSED">Ολοκληρωμένα</option>
            </select>
            <FaFilter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaBuilding className="text-4xl mx-auto mb-2 text-gray-300" />
            <p className="mb-4">Δεν έχεις συνδεθεί με καμία συναλλαγή ακόμα</p>
            <Link
              href="/professional/requests"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Δες Αιτήματα
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}?tab=overview`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaBuilding className="text-blue-600" />
                      <h4 className="font-semibold text-gray-900">
                        {deal.property?.title || 'Άγνωστο ακίνητο'}
                      </h4>
                      {getStatusBadge(deal.status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {deal.property && (
                        <p>
                          {deal.property.city}, {deal.property.state}
                        </p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FaUsers className="text-gray-400" />
                          <span>{deal.participants?.length || 0} συμμετέχοντες</span>
                        </div>
                        <span>Τελευταία ενημέρωση: {formatDate(deal.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-blue-600">
                    <span className="text-sm font-medium">Άνοιγμα →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

