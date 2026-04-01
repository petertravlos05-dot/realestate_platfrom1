'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaInfoCircle, FaCalendarAlt, FaFileAlt, FaUserTie, FaHandshake, FaCheckCircle } from 'react-icons/fa';
import CardSection from './ui/CardSection';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface SellersDealOverviewProps {
  deal: DealRoom;
}

interface ViewingRequest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SELLER_APPROVAL';
  date: string;
  time: string;
}

/**
 * SellersDealOverview - Shows seller-specific overview of the deal
 */
export default function SellersDealOverview({ deal }: SellersDealOverviewProps) {
  const router = useRouter();
  const [propertyAppointments, setPropertyAppointments] = useState<ViewingRequest[]>([]);

  // Fetch property appointments (viewing requests)
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

  // Get buyer info
  const buyer = deal.participants?.find(p => p.role === 'BUYER');
  const agent = deal.participants?.find(p => p.role === 'AGENT');
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <FaInfoCircle className="text-white text-sm" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Στοιχεία Συναλλαγής</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FaUserTie className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Αγοραστής</span>
            </div>
            <p className="text-base font-bold text-gray-900">{buyer?.user.name || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-1">{buyer?.user.email || ''}</p>
          </div>

          {agent && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <FaHandshake className="text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Μεσίτης</span>
              </div>
              <p className="text-base font-bold text-gray-900">{agent.user.name}</p>
              <p className="text-xs text-gray-600 mt-1">{agent.user.email}</p>
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

      {/* Quick Actions Card - Only show if there are pending actions */}
      {(totalPendingAppointments > 0 || pendingDocumentsFromSeller > 0 || pendingDocumentsFromBuyer > 0 || uploadedDocuments > 0 || totalConfirmedAppointments > 0) && (
        <CardSection>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Γρήγορες Ενέργειες</h2>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Pending Appointments */}
            {totalPendingAppointments > 0 && (
              <button
                onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
                className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 hover:border-yellow-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaCalendarAlt className="text-yellow-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">Εκκρεμή Ραντεβού</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{totalPendingAppointments}</p>
                <p className="text-xs text-gray-600 mt-0.5">Πρέπει να εγκρίνετε</p>
              </button>
            )}

            {/* Confirmed Appointments */}
            {totalConfirmedAppointments > 0 && (
              <button
                onClick={() => router.push(`/deals/${deal.id}?tab=appointments`)}
                className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 hover:border-green-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-green-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">Επιβεβαιωμένα Ραντεβού</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{totalConfirmedAppointments}</p>
                <p className="text-xs text-gray-600 mt-0.5">Προγραμματισμένα</p>
              </button>
            )}

            {/* Documents Requested from Seller */}
            {pendingDocumentsFromSeller > 0 && (
              <button
                onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 hover:border-blue-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaFileAlt className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">Έγγραφα που Ζητήθηκαν</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{pendingDocumentsFromSeller}</p>
                <p className="text-xs text-gray-600 mt-0.5">Πρέπει να ανεβάσετε</p>
              </button>
            )}

            {/* Documents Requested from Buyer (Seller needs to review) */}
            {pendingDocumentsFromBuyer > 0 && (
              <button
                onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border-2 border-purple-300 hover:border-purple-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaFileAlt className="text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">Έγγραφα για Έλεγχο</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{pendingDocumentsFromBuyer}</p>
                <p className="text-xs text-gray-600 mt-0.5">Από τον αγοραστή</p>
              </button>
            )}

            {/* Uploaded Documents */}
            {uploadedDocuments > 0 && (
              <button
                onClick={() => router.push(`/deals/${deal.id}?tab=documents`)}
                className="p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-300 hover:border-teal-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FaFileAlt className="text-teal-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">Ανεβασμένα Έγγραφα</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{uploadedDocuments}</p>
                <p className="text-xs text-gray-600 mt-0.5">Σε αναμονή ελέγχου</p>
              </button>
            )}
          </div>
        </CardSection>
      )}
    </div>
  );
}

