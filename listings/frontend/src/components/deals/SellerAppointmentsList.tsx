'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt } from 'react-icons/fa';

export interface Appointment {
  _id: string;
  id: string;
  propertyId: string;
  propertyTitle: string;
  buyerId: string;
  buyer: {
    name: string;
    email: string;
  };
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  submittedByBuyer: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SellerAppointmentsListProps {
  appointments: Appointment[];
  onAppointmentAction: (appointmentId: string, action: 'approve' | 'reject') => void;
  onViewAppointment: (appointment: Appointment) => void;
  propertyFilter?: string; // Filter by property ID
  relatedLeads?: Array<{
    buyerId: string;
    buyerEmail: string;
    stage: string;
  }>; // For blur logic
  className?: string;
}

type SortField = 'property' | 'buyer' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';

export default function SellerAppointmentsList({
  appointments,
  onAppointmentAction,
  onViewAppointment,
  propertyFilter,
  relatedLeads = [],
  className = '',
}: SellerAppointmentsListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [appointmentsSortField, setAppointmentsSortField] = useState<SortField>('date');
  const [appointmentsSortDirection, setAppointmentsSortDirection] = useState<SortDirection>('desc');

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    // Apply property filter from props first, then from local state
    const effectivePropertyFilter = propertyFilter || selectedPropertyFilter;
    if (effectivePropertyFilter && effectivePropertyFilter !== 'all') {
      filtered = filtered.filter(apt => apt.propertyId === effectivePropertyFilter);
    }
    
    return filtered;
  }, [appointments, propertyFilter, selectedPropertyFilter]);

  // Sort appointments
  const sortedAppointments = useMemo(() => {
    const sorted = [...filteredAppointments].sort((a, b) => {
      let comparison = 0;
      
      switch (appointmentsSortField) {
        case 'property':
          comparison = a.propertyTitle.localeCompare(b.propertyTitle);
          break;
        case 'buyer':
          comparison = a.buyer.name.localeCompare(b.buyer.name);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return appointmentsSortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredAppointments, appointmentsSortField, appointmentsSortDirection]);

  const handleAppointmentsSort = (field: SortField) => {
    if (appointmentsSortField === field) {
      setAppointmentsSortDirection(appointmentsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAppointmentsSortField(field);
      setAppointmentsSortDirection('asc');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { label: 'Εκκρεμεί', color: 'bg-yellow-100 text-yellow-800' };
      case 'accepted':
        return { label: 'Εγκρίθηκε', color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: 'Απορρίφθηκε', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const shouldBlurLeadInfo = (stage: string) => {
    const stageOrder = getStageOrder(stage);
    return stageOrder < 3;
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

  const isNewAppointment = (createdAt: string) => {
    const appointmentDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - appointmentDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 ${className}`}>
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <div className="font-bold text-xl">
          Ραντεβού Προβολής
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({sortedAppointments.length} συνολικά)
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Κάντε κλικ στις επικεφαλίδες για να ταξινομήσετε
        </div>
      </div>
      
      {/* Info banner */}
      <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-800 mb-1">
              🔒 Προστασία Πλατφόρμας - Ραντεβού
            </h4>
            <p className="text-sm text-green-700 leading-relaxed">
              Τα ονόματα και emails των ενδιαφερομένων στα ραντεβού εμφανίζονται ως <span className="font-medium">••••••••</span> 
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
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              <span>Φίλτρα</span>
              {selectedPropertyFilter !== 'all' && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">1</span>
              )}
            </button>
            
            {selectedPropertyFilter !== 'all' && (
              <button
                onClick={() => setSelectedPropertyFilter('all')}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                Καθαρισμός
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            Εμφανίζονται {sortedAppointments.length} από {appointments.length} ραντεβού
          </div>
        </div>
        
        {/* Filter dropdown */}
        {showFilters && !propertyFilter && (
          <div className="mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ακίνητο
              </label>
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Όλα τα ακίνητα</option>
                {Array.from(new Set(appointments.map(a => ({ id: a.propertyId, title: a.propertyTitle }))))
                  .map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Table */}
      {sortedAppointments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-green-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleAppointmentsSort('property')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ακίνητο</span>
                    {appointmentsSortField === 'property' && (
                      <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleAppointmentsSort('buyer')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ενδιαφερόμενος</span>
                    {appointmentsSortField === 'buyer' && (
                      <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleAppointmentsSort('date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Ημερομηνία & Ώρα</span>
                    {appointmentsSortField === 'date' && (
                      <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                  onClick={() => handleAppointmentsSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Κατάσταση</span>
                    {appointmentsSortField === 'status' && (
                      <svg className={`w-4 h-4 ${appointmentsSortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {sortedAppointments.map((appointment) => {
                const relatedLead = relatedLeads.find(
                  lead => lead.buyerId === appointment.buyerId || lead.buyerEmail === appointment.buyer.email
                );
                const stage = relatedLead?.stage || 'pending';
                const shouldBlur = shouldBlurLeadInfo(stage);
                const { label, color } = getStatusLabel(appointment.status);
                const isNew = isNewAppointment(appointment.createdAt);
                
                return (
                  <tr
                    key={appointment.id}
                    className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${
                      isNew ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{appointment.propertyTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold text-gray-900 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                        {shouldBlur ? '••••••••' : appointment.buyer.name}
                      </div>
                      <div className={`text-sm text-gray-500 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                        {shouldBlur ? '••••••••••••••••••••••••••••••••' : appointment.buyer.email}
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
                            ΝΕΟ
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {new Date(appointment.date).toLocaleDateString('el-GR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
                        {label}
                      </span>
                      {appointment.status === 'pending' && (
                        <div className="flex space-x-2 mt-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAppointmentAction(appointment.id, 'approve')}
                            className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded transition-colors duration-200"
                          >
                            Έγκριση
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAppointmentAction(appointment.id, 'reject')}
                            className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors duration-200"
                          >
                            Απόρριψη
                          </motion.button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onViewAppointment(appointment)}
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
            <FaCalendarAlt className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν υπάρχουν ραντεβού</h3>
          <p className="text-gray-500">
            {propertyFilter && propertyFilter !== 'all'
              ? 'Δεν υπάρχουν ραντεβού για αυτό το ακίνητο ακόμα.'
              : 'Όταν προγραμματιστούν ραντεβού για τα ακίνητά σας, θα εμφανιστούν εδώ.'}
          </p>
        </div>
      )}
    </div>
  );
}

