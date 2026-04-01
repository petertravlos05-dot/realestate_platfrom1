'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaInfoCircle, FaCalendarAlt, FaFileAlt, FaUserTie, FaHandshake, FaCheckCircle } from 'react-icons/fa';
import CardSection from './ui/CardSection';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { getBuyerProgressMessage } from '@/lib/utils/buyerProgress';

interface AgentDealOverviewProps {
  deal: DealRoom;
}

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SELLER_APPROVAL';
  date: string;
  time: string;
}

/**
 * AgentDealOverview - Shows agent-specific overview of the deal
 * Similar to seller view but without quick actions and shows buyer progress
 */
export default function AgentDealOverview({ deal }: AgentDealOverviewProps) {
  const [propertyAppointments, setPropertyAppointments] = useState<ViewingRequest[]>([]);

  // Fetch property appointments (viewing requests) for buyer progress calculation
  useEffect(() => {
    if (!deal.propertyId || !deal.buyerId) return;

    const fetchPropertyAppointments = async () => {
      try {
        const response = await apiClient.get(`/seller/appointments`, {
          params: {
            propertyId: deal.propertyId,
            buyerId: deal.buyerId,
          },
        });
        
        if (response.data.appointments) {
          setPropertyAppointments(response.data.appointments);
        }
      } catch (error) {
        console.error('Error fetching property appointments:', error);
      }
    };

    fetchPropertyAppointments();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchPropertyAppointments, 10000);
    
    return () => clearInterval(interval);
  }, [deal.propertyId, deal.buyerId, deal.updatedAt]);

  // Get buyer progress message (same as seller view)
  const buyerProgress = getBuyerProgressMessage(deal, propertyAppointments);

  // Get buyer info
  const buyer = deal.participants?.find(p => p.role === 'BUYER');
  const seller = deal.participants?.find(p => p.role === 'SELLER');
  const lawyer = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'LAWYER');
  const notary = deal.requests?.find(r => r.status === 'ACCEPTED' && r.type === 'NOTARY');

  // Check for pending viewing requests (property appointments)
  const pendingViewingRequests = propertyAppointments?.filter(
    (a) => a.status === 'PENDING' || a.status === 'PENDING_SELLER_APPROVAL'
  ).length || 0;
  
  const pendingAppointments = deal.appointments?.filter(a => a.status === 'REQUESTED').length || 0;
  const totalPendingAppointments = pendingViewingRequests + pendingAppointments;
  
  const confirmedAppointments = deal.appointments?.filter(a => a.status === 'CONFIRMED').length || 0;
  const confirmedViewingRequests = propertyAppointments?.filter(
    (a) => a.status === 'ACCEPTED'
  ).length || 0;
  const totalConfirmedAppointments = confirmedAppointments + confirmedViewingRequests;

  // Documents requested from seller
  const pendingDocumentsFromSeller = deal.documents?.filter(
    d => d.status === 'REQUESTED' && d.requestedFromRole === 'SELLER'
  ).length || 0;
  
  // Documents requested from buyer (seller needs to review)
  const pendingDocumentsFromBuyer = deal.documents?.filter(
    d => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
  ).length || 0;
  
  const uploadedDocuments = deal.documents?.filter(d => d.status === 'UPLOADED' || d.status === 'APPROVED').length || 0;

  return (
    <div className="space-y-6">
      {/* Key Information Card */}
      <CardSection>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <FaInfoCircle className="text-white text-sm" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Στοιχεία Συναλλαγής</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <FaUserTie className="text-indigo-600" />
              <span className="text-sm font-semibold text-gray-700">Αγοραστής</span>
            </div>
            <p className="text-base font-bold text-gray-900">{buyer?.user.name || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-1">{buyer?.user.email || ''}</p>
          </div>

          {seller && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FaUserTie className="text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Πωλητής</span>
              </div>
              <p className="text-base font-bold text-gray-900">{seller.user.name}</p>
              <p className="text-xs text-gray-600 mt-1">{seller.user.email}</p>
            </div>
          )}

          {lawyer && (
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <FaUserTie className="text-orange-600" />
                <span className="text-sm font-semibold text-gray-700">Δικηγόρος</span>
              </div>
              <p className="text-base font-bold text-gray-900">{lawyer.professional?.displayName || 'N/A'}</p>
            </div>
          )}

          {notary && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FaHandshake className="text-green-600" />
                <span className="text-sm font-semibold text-gray-700">Συμβολαιογράφος</span>
              </div>
              <p className="text-base font-bold text-gray-900">{notary.professional?.displayName || 'N/A'}</p>
            </div>
          )}
        </div>
      </CardSection>

      {/* Buyer Progress Card */}
      {buyerProgress && (
        <CardSection>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <FaCheckCircle className="text-white text-sm" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Πρόοδος Αγοραστή</h2>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Βήμα {buyerProgress.step} από 8</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step <= buyerProgress.step
                        ? 'bg-indigo-600'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">{buyerProgress.message}</p>
            <p className="text-sm text-gray-600">{buyerProgress.description}</p>
          </div>
        </CardSection>
      )}

      {/* Status Summary Card */}
      <CardSection>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
            <FaInfoCircle className="text-white text-sm" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Κατάσταση Συναλλαγής</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Appointments */}
          <div className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <FaCalendarAlt className="text-yellow-600" />
              <span className="text-xs font-semibold text-gray-700">Ραντεβού</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {totalConfirmedAppointments} / {totalPendingAppointments + totalConfirmedAppointments}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {totalPendingAppointments > 0 ? `${totalPendingAppointments} εκκρεμή` : 'Όλα επιβεβαιωμένα'}
            </p>
          </div>

          {/* Documents */}
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <FaFileAlt className="text-indigo-600" />
              <span className="text-xs font-semibold text-gray-700">Έγγραφα</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {uploadedDocuments} / {deal.documents?.length || 0}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {pendingDocumentsFromSeller + pendingDocumentsFromBuyer > 0 
                ? `${pendingDocumentsFromSeller + pendingDocumentsFromBuyer} εκκρεμή` 
                : 'Όλα ανεβασμένα'}
            </p>
          </div>
        </div>
      </CardSection>
    </div>
  );
}

