'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaMapMarkerAlt } from 'react-icons/fa';

export interface Lead {
  id: string;
  status: 'pending' | 'contacted' | 'viewing_scheduled' | 'offer_made' | 'completed' | 'rejected' | 'accepted';
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  transaction?: {
    id: string;
    status: string;
    stage: string;
    createdAt: string;
    progress: {
      stage: string;
      updatedAt: string;
    };
  };
  property: {
    id: string;
    title: string;
    location: string;
  };
}

interface SellerLeadsListProps {
  leads: Lead[];
  onLeadClick: (lead: Lead, propertyTitle: string) => void;
  propertyFilter?: string; // Filter by property ID
  showFilters?: boolean;
  className?: string;
}

type SortField = 'property' | 'buyer' | 'stage' | 'date';
type SortDirection = 'asc' | 'desc';

export default function SellerLeadsList({
  leads,
  onLeadClick,
  propertyFilter,
  showFilters: initialShowFilters = false,
  className = '',
}: SellerLeadsListProps) {
  const [showFilters, setShowFilters] = useState(initialShowFilters);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [leadsSortField, setLeadsSortField] = useState<SortField>('date');
  const [leadsSortDirection, setLeadsSortDirection] = useState<SortDirection>('desc');

  // Filter leads by property if propertyFilter is provided
  const filteredLeads = useMemo(() => {
    let filtered = leads;
    
    if (propertyFilter && propertyFilter !== 'all') {
      filtered = filtered.filter(lead => lead.property.id === propertyFilter);
    }
    
    if (selectedStageFilter !== 'all') {
      filtered = filtered.filter(lead => {
        const stage = lead.transaction?.progress?.stage || lead.status || 'pending';
        return stage.toLowerCase() === selectedStageFilter.toLowerCase();
      });
    }
    
    return filtered;
  }, [leads, propertyFilter, selectedStageFilter]);

  // Sort leads
  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads].sort((a, b) => {
      let comparison = 0;
      
      switch (leadsSortField) {
        case 'property':
          comparison = a.property.title.localeCompare(b.property.title);
          break;
        case 'buyer':
          comparison = a.buyer.name.localeCompare(b.buyer.name);
          break;
        case 'stage':
          const stageA = a.transaction?.progress?.stage || a.status || 'pending';
          const stageB = b.transaction?.progress?.stage || b.status || 'pending';
          comparison = stageA.localeCompare(stageB);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return leadsSortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredLeads, leadsSortField, leadsSortDirection]);

  const handleLeadsSort = (field: SortField) => {
    if (leadsSortField === field) {
      setLeadsSortDirection(leadsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLeadsSortField(field);
      setLeadsSortDirection('asc');
    }
  };

  const getStageOrder = (stage: string): number => {
    const stageMap: Record<string, number> = {
      'pending': 0,
      'viewing_scheduled': 1,
      'meeting_scheduled': 1,
      'deposit_paid': 2,
      'offer_made': 3,
      'final_signing': 3,
      'completed': 4,
      'accepted': 4,
      'rejected': 5,
      'cancelled': 5,
    };
    return stageMap[stage?.toLowerCase()] ?? 0;
  };

  const shouldBlurLeadInfo = (stage: string) => {
    const stageOrder = getStageOrder(stage);
    return stageOrder < 3;
  };

  const isNewLead = (createdAt: string) => {
    const leadDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getStageDisplay = (stage: string) => {
    switch (stage?.toUpperCase()) {
      case 'PENDING':
      case 'pending':
        return {
          label: 'Αναμονή για ραντεβού',
          color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800'
        };
      case 'MEETING_SCHEDULED':
      case 'viewing_scheduled':
        return {
          label: 'Έγινε ραντεβού',
          color: 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800'
        };
      case 'DEPOSIT_PAID':
        return {
          label: 'Έγινε προκαταβολή',
          color: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800'
        };
      case 'FINAL_SIGNING':
      case 'offer_made':
        return {
          label: 'Τελική υπογραφή',
          color: 'bg-gradient-to-r from-yellow-100 to-lime-100 text-yellow-800'
        };
      case 'COMPLETED':
      case 'completed':
      case 'accepted':
        return {
          label: 'Ολοκληρώθηκε',
          color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
        };
      case 'CANCELLED':
      case 'rejected':
        return {
          label: 'Ακυρώθηκε',
          color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800'
        };
      default:
        return {
          label: stage || 'Άγνωστο',
          color: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700'
        };
    }
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 ${className}`}>
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <div className="font-bold text-xl">
          Ενδιαφερόμενοι 
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({sortedLeads.length} συνολικά)
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Κάντε κλικ στις επικεφαλίδες για να ταξινομήσετε
        </div>
      </div>
      
      {/* Info banner */}
      <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-800 mb-1">
              🔒 Προστασία Πλατφόρμας
            </h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Τα ονόματα και emails των ενδιαφερομένων εμφανίζονται ως <span className="font-medium">••••••••</span> 
              μέχρι να προχωρήσει η συναλλαγή στο στάδιο <span className="font-semibold">"Έγινε Προκαταβολή"</span>.
            </p>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                showFilters 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              <span>Φίλτρα</span>
              {selectedStageFilter !== 'all' && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">1</span>
              )}
            </button>
            
            {selectedStageFilter !== 'all' && (
              <button
                onClick={() => setSelectedStageFilter('all')}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                Καθαρισμός
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            Εμφανίζονται {sortedLeads.length} από {leads.length} ενδιαφερόμενοι
          </div>
        </div>
        
        {/* Filter dropdown */}
        {showFilters && (
          <div className="mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Στάδιο Συναλλαγής
              </label>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Όλα τα στάδια</option>
                <option value="pending">Αναμονή για ραντεβού</option>
                <option value="meeting_scheduled">Έγινε ραντεβού</option>
                <option value="deposit_paid">Έγινε προκαταβολή</option>
                <option value="final_signing">Τελική υπογραφή</option>
                <option value="completed">Ολοκληρώθηκε</option>
                <option value="cancelled">Ακυρώθηκε</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Table */}
      {sortedLeads.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-green-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleLeadsSort('property')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ακίνητο</span>
                    {leadsSortField === 'property' && (
                      <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleLeadsSort('buyer')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ενδιαφερόμενος</span>
                    {leadsSortField === 'buyer' && (
                      <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleLeadsSort('stage')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Στάδιο Συναλλαγής</span>
                    {leadsSortField === 'stage' && (
                      <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleLeadsSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ημερομηνία</span>
                    {leadsSortField === 'date' && (
                      <svg className={`w-4 h-4 ${leadsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLeads.map((lead) => {
                const stage = lead.transaction?.progress?.stage || lead.status || 'pending';
                const shouldBlur = shouldBlurLeadInfo(stage);
                const stageDisplay = getStageDisplay(stage);
                const isNew = isNewLead(lead.createdAt);
                
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${
                      isNew ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{lead.property.title}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <FaMapMarkerAlt className="w-3 h-3 mr-1 text-green-500" />
                        {lead.property.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold text-gray-900 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                        {shouldBlur ? '••••••••' : lead.buyer.name}
                      </div>
                      <div className={`text-sm text-gray-500 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                        {shouldBlur ? '••••••••••••••••••••••••••••••••' : lead.buyer.email}
                      </div>
                      {shouldBlur && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                            🔒 Κρυφά
                          </span>
                        </div>
                      )}
                      {isNew && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-200 to-amber-200 text-yellow-900">
                            ΝΕΟΣ
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${stageDisplay.color}`}>
                        {stageDisplay.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString('el-GR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onLeadClick(lead, lead.property.title)}
                        className="text-green-600 hover:text-green-800 font-bold transition-colors duration-200"
                      >
                        Προβολή
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUsers className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν υπάρχουν ενδιαφερόμενοι</h3>
          <p className="text-gray-500">
            {propertyFilter && propertyFilter !== 'all' 
              ? 'Δεν υπάρχουν ενδιαφερόμενοι για αυτό το ακίνητο ακόμα.'
              : 'Όταν κάποιος ενδιαφερθεί για τα ακίνητά σας, θα εμφανιστούν εδώ.'}
          </p>
        </div>
      )}
    </div>
  );
}

