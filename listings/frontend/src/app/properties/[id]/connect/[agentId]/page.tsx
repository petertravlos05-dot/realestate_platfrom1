'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser, FaHandshake, FaEye, FaInfoCircle } from 'react-icons/fa';
import { ConfirmAgentConnectionModal } from '@/components/ConfirmAgentConnectionModal';
import { apiClient, fetchFromBackend } from '@/lib/api/client';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  type: string;
  images: string[];
}

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  businessAddress?: string;
  licenseNumber?: string;
}

interface PageProps {
  params: {
    id: string;
    agentId: string;
  };
}

export default function PropertyConnectionPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingInterest, setExistingInterest] = useState(false);
  const [propertyViewedError, setPropertyViewedError] = useState<any>(null);
  const [interestCancelled, setInterestCancelled] = useState(false);
  const [hasViewedProperty, setHasViewedProperty] = useState(false);

  // Έλεγχος αν ο χρήστης είναι συνδεδεμένος
  useEffect(() => {
    if (status === 'unauthenticated') {
      const currentUrl = window.location.href;
      const callbackUrl = encodeURIComponent(currentUrl);
      router.push(`/api/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (status !== 'authenticated' || !session?.user) {
        return;
      }
      try {
        setLoading(true);
        setError('');

        // Έλεγχος αν το ακίνητο έχει προβληθεί
        try {
          const { data: viewData } = await apiClient.get(`/properties/${params.id}/view`);
          setHasViewedProperty(viewData.hasViewed);
          
          // Αν έχει προβληθεί, εμφανίζουμε το μήνυμα και σταματάμε
          if (viewData.hasViewed) {
            setPropertyViewedError({
              code: 'PROPERTY_ALREADY_VIEWED',
              message: 'Έχετε δει ήδη τις λεπτομερείες αυτού του ακινήτου. Εκδηλώστε ενδιαφέρον μόνος/μόνη σας.'
            });
            setLoading(false);
            return;
          }
        } catch (e) {}

        // Φόρτωση πληροφοριών ακινήτου
        const { data: propertyData } = await apiClient.get(`/properties/${params.id}`);
        if (!propertyData) {
          throw new Error('Δεν βρέθηκαν τα στοιχεία του ακινήτου');
        }
        const finalPropertyData = propertyData.property || propertyData;
        setProperty(finalPropertyData);

        // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
        if (finalPropertyData.userId === session.user.id) {
          setPropertyViewedError({
            code: 'PROPERTY_OWNER',
            message: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς'
          });
          setLoading(false);
          return;
        }

        // Φόρτωση πληροφοριών μεσίτη
        const { data: agentData } = await apiClient.get(`/agent/${params.agentId}`);
        if (!agentData || !agentData.agent) {
          throw new Error('Δεν βρέθηκαν τα στοιχεία του μεσίτη');
        }
        setAgent({
          ...agentData.agent,
          phone: agentData.agent.phone || 'Μη διαθέσιμο'
        });

        // ΝΕΟΣ ΕΛΕΓΧΟΣ: Υπάρχει interestCancelled connection;
        try {
          const { data: cancelledData } = await apiClient.post('/buyer-agent/connections', {
            propertyId: params.id,
            agentId: params.agentId,
            checkCancelled: true
          });
          if (cancelledData.interestCancelled) {
            setInterestCancelled(true);
            setLoading(false);
            return;
          }
        } catch (e) {}

        // Έλεγχος υπάρχουσας σύνδεσης
        const { data: connectionData } = await apiClient.post('/buyer-agent/check', {
          agentId: params.agentId,
          propertyId: params.id,
        });
        if (connectionData.exists) {
          setExistingInterest(true);
          return;
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση των πληροφοριών');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.agentId, session?.user, router, status]);

  // Εμφάνιση loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Φόρτωση...</div>
      </div>
    );
  }

  // Εμφάνιση modal αν υπάρχει propertyViewedError
  if (propertyViewedError) {
    const isOwnerError = propertyViewedError.code === 'PROPERTY_OWNER';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
              isOwnerError ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              {isOwnerError ? (
                <FaInfoCircle className="w-10 h-10 text-red-600" />
              ) : (
                <FaEye className="w-10 h-10 text-orange-600" />
              )}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            {isOwnerError ? 'Αυτό είναι το δικό σας ακίνητο' : 'Έχετε δει ήδη αυτό το ακίνητο'}
          </h2>
          <p className="text-gray-700 mb-6">{propertyViewedError.message}</p>
          <div className="space-y-3">
            {isOwnerError ? (
              <>
                <button
                  onClick={() => router.push('/dashboard/seller')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Πίσω στον Πίνακα Ελέγχου μου
                </button>
                <button
                  onClick={() => router.push('/properties')}
                  className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Αναζήτηση Άλλων Ακινήτων
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push(`/buyer/properties/${params.id}`)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Δείτε ξανά τις λεπτομερείες
                </button>
                <button
                  onClick={() => router.push('/dashboard/buyer')}
                  className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Πίσω στον Πίνακα Ελέγχου μου
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Εμφάνιση σφάλματος
  if (error || (!property && !loading) || (!agent && !loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-xl text-red-600 text-center mb-4">
          {error || 'Δεν ήταν δυνατή η φόρτωση των στοιχείων'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Δοκιμάστε ξανά
        </button>
      </div>
    );
  }

  // Τώρα είμαστε σίγουροι ότι τα property και agent δεν είναι null
  const propertyData = property!;
  const agentData = agent!;

  if (interestCancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <FaHandshake className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Είχατε εκδηλώσει ενδιαφέρον για αυτό το ακίνητο και το αφαιρέσατε
            </h2>
            <p className="text-gray-600">
              Αν θέλετε να ξαναενδιαφερθείτε, επικοινωνήστε με τους admin.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/buyer')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Πίσω στον Πίνακα Ελέγχου μου
          </button>
        </div>
      </div>
    );
  }

  if (existingInterest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <FaHandshake className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Έχετε ήδη εκδηλώσει ενδιαφέρον
            </h2>
            <p className="text-gray-600">
              Έχετε εκδηλώσει ενδιαφέρον για το ακίνητο "{propertyData.title}"
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/buyer')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Πίσω στον Πίνακα Ελέγχου μου
          </button>
        </div>
      </div>
    );
  }

  // Εμφάνιση modal επιβεβαίωσης σύνδεσης αν δεν υπάρχει error/interest
  if (property && agent && !existingInterest && !propertyViewedError) {
    return (
      <ConfirmAgentConnectionModal
        isOpen={true}
        onClose={() => router.push(`/properties/${params.id}`)}
        agentId={agent.id}
        propertyId={property.id}
        agentName={agent.name}
        propertyTitle={property.title}
        propertyImage={property.images?.[0] || ''}
        propertyLocation={property.location}
        propertyPrice={property.price}
        agentEmail={agent.email}
        agentPhone={agent.phone}
        agentCompany={agent.companyName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Property Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="relative h-[300px]">
            <img
              src={propertyData.images?.[0] || '/images/property-placeholder.jpg'}
              alt={propertyData.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h1 className="text-3xl font-bold text-white mb-3">{propertyData.title}</h1>
              <div className="flex items-center text-white/90">
                <FaMapMarkerAlt className="mr-2" />
                <span>{propertyData.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Επικοινωνία με Μεσίτη
            </h2>
            <p className="text-gray-600">
              Συνδεθείτε με τον μεσίτη για να μάθετε περισσότερα για αυτό το ακίνητο
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaUser className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{agentData.name}</h3>
                  <p className="text-gray-500">Επαγγελματίας Μεσίτης</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaBuilding className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Εταιρεία</h3>
                  <p className="text-gray-600">{agentData.companyName || 'Ανεξάρτητος Μεσίτης'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaPhone className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Τηλέφωνο</h3>
                  <p className="text-gray-600">{agentData.phone}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaEnvelope className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Email</h3>
                  <p className="text-gray-600">{agentData.email}</p>
                </div>
              </div>

              {agentData.businessAddress && (
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaMapMarkerAlt className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Διεύθυνση Γραφείου</h3>
                    <p className="text-gray-600">{agentData.businessAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center space-x-2"
            >
              <FaHandshake className="w-6 h-6" />
              <span>Σύνδεση με τον {agentData.name}</span>
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Πατώντας "Σύνδεση" θα μπορείτε να επικοινωνήσετε απευθείας με τον μεσίτη
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Connection Modal */}
      {showConfirmModal && (
        <ConfirmAgentConnectionModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          agentId={agentData.id}
          propertyId={propertyData.id}
          agentName={agentData.name}
          propertyTitle={propertyData.title}
          propertyImage={propertyData.images?.[0] || ''}
          propertyLocation={propertyData.location}
          propertyPrice={propertyData.price}
          agentEmail={agentData.email}
          agentPhone={agentData.phone}
          agentCompany={agentData.companyName}
        />
      )}
    </div>
  );
} 