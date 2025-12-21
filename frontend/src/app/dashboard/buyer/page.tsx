import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiHome, FiCalendar, FiUser, FiBell } from 'react-icons/fi';
import { propertiesApi, Property } from '@/lib/api/properties';
import { buyerAgentApi, BuyerAgentRelationship } from '@/lib/api/buyer-agent';
import VerifyOtpModal from '@/components/VerifyOtpModal';

interface Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

export default function BuyerDashboard() {
  const { data: session } = useSession() as { data: Session | null };
  const [activeTab, setActiveTab] = useState<'properties' | 'appointments' | 'profile' | 'notifications'>('properties');
  const [interestedProperties, setInterestedProperties] = useState<Property[]>([]);
  const [relationships, setRelationships] = useState<BuyerAgentRelationship[]>([]);
  const [verifyOtpModalOpen, setVerifyOtpModalOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<BuyerAgentRelationship | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      console.log('[DEBUG] BuyerDashboard - User ID:', session.user.id);
      loadRelationships();
    }
  }, [session?.user?.id]);

  const loadRelationships = async () => {
    try {
      console.log('[DEBUG] BuyerDashboard - loadRelationships - Starting to fetch relationships for buyer:', session?.user?.id);
      const data = await buyerAgentApi.getByBuyerId(session?.user?.id || '');
      console.log('[DEBUG] BuyerDashboard - loadRelationships - Fetched relationships:', data);
      setRelationships(data);
      
      // Φόρτωση των ακινήτων για τις επιβεβαιωμένες σχέσεις
      const confirmedRelationships = data.filter(r => r.status === 'confirmed');
      console.log('[DEBUG] BuyerDashboard - loadRelationships - Confirmed relationships:', confirmedRelationships);
      
      const propertyIds = confirmedRelationships.map(r => r.propertyId);
      console.log('[DEBUG] BuyerDashboard - loadRelationships - Property IDs to fetch:', propertyIds);
      
      const properties = await Promise.all(
        propertyIds.map(async (id) => {
          console.log('[DEBUG] BuyerDashboard - loadRelationships - Fetching property with ID:', id);
          const property = await propertiesApi.getById(id);
          console.log('[DEBUG] BuyerDashboard - loadRelationships - Fetched property:', property);
          return property;
        })
      );
      
      console.log('[DEBUG] BuyerDashboard - loadRelationships - All fetched properties:', properties);
      setInterestedProperties(properties);
    } catch (error) {
      console.error('[DEBUG] BuyerDashboard - loadRelationships - Error loading relationships:', error);
    }
  };

  const handleVerifyOtpSuccess = () => {
    console.log('[DEBUG] BuyerDashboard - handleVerifyOtpSuccess - OTP verification successful, reloading relationships');
    loadRelationships();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard Αγοραστή</h1>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('properties')}
                className={`${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FiHome size={20} />
                Ακίνητα Ενδιαφέροντος
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`${
                  activeTab === 'appointments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FiCalendar size={20} />
                Ραντεβού
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FiUser size={20} />
                Προφίλ
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FiBell size={20} />
                Ειδοποιήσεις
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="mt-6">
            {activeTab === 'properties' && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {interestedProperties.map((property) => (
                  <div key={property.id} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <h3 className="text-lg font-medium text-gray-900">{property.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{property.location}</p>
                      <p className="mt-2 text-xl font-semibold text-blue-600">{property.price}</p>
                      <div className="mt-4">
                        <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                          Δείτε Λεπτομέρειες
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Προγραμματισμένα Ραντεβού</h2>
                <p className="text-gray-500">Δεν έχετε προγραμματισμένα ραντεβού.</p>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Προφίλ Χρήστη</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Όνομα</label>
                    <p className="mt-1 text-sm text-gray-900">{session?.user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Ειδοποιήσεις</h2>
                <p className="text-gray-500">Δεν έχετε νέες ειδοποιήσεις.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRelationship && (
        <VerifyOtpModal
          isOpen={verifyOtpModalOpen}
          onClose={() => {
            setVerifyOtpModalOpen(false);
            setSelectedRelationship(null);
          }}
          relationshipId={selectedRelationship.id}
          onSuccess={handleVerifyOtpSuccess}
        />
      )}
    </div>
  );
} 