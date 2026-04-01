'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaInfoCircle, FaEye, FaHandshake } from 'react-icons/fa';
import { PropertyConnectPremiumCard } from '@/components/PropertyConnectPremiumCard';
import { apiClient } from '@/lib/api/client';

interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  location?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  type?: string;
  images: string[];
}

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
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
  const [propertyViewedError, setPropertyViewedError] = useState<any>(null);
  const [interestCancelled, setInterestCancelled] = useState(false);
  const [existingInterest, setExistingInterest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Φόρτωση ακινήτου (optionalAuth - λειτουργεί και χωρίς σύνδεση)
        const { data: propertyData } = await apiClient.get(`/properties/${params.id}`);
        if (!propertyData) {
          throw new Error('Δεν βρέθηκαν τα στοιχεία του ακινήτου');
        }
        const finalPropertyData = propertyData.property || propertyData;
        setProperty(finalPropertyData);

        // Έλεγχος ιδιοκτήτη μόνο αν συνδεδεμένος
        if (status === 'authenticated' && session?.user && finalPropertyData.userId === session.user.id) {
          setPropertyViewedError({
            code: 'PROPERTY_OWNER',
            message: 'Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς',
          });
          setLoading(false);
          return;
        }

        // Φόρτωση μεσίτη
        const { data: agentData } = await apiClient.get(`/agent/${params.agentId}`);
        if (!agentData || !agentData.agent) {
          throw new Error('Δεν βρέθηκαν τα στοιχεία του μεσίτη');
        }
        setAgent({
          ...agentData.agent,
          phone: agentData.agent.phone || 'Μη διαθέσιμο',
        });

        // Ελέγχους μόνο για συνδεδεμένους
        if (status === 'authenticated' && session?.user) {
          // ΠΡΩΤΑ: έλεγχος ακυρωμένου ενδιαφέροντος για το ακίνητο (ανεξάρτητα από referral agent)
          // Αν υπάρχει, πρέπει να εμφανιστεί το ειδικό μήνυμα και να μπλοκάρει η σύνδεση.
          try {
            const { data: interestStatus } = await apiClient.get(`/buyer/properties/${params.id}/interest-status`);
            if (interestStatus?.interestCancelled) {
              setInterestCancelled(true);
              setLoading(false);
              return;
            }
          } catch {}

          try {
            const { data: viewData } = await apiClient.get(`/properties/${params.id}/view`);
            if (viewData?.hasViewed) {
              setPropertyViewedError({
                code: 'PROPERTY_ALREADY_VIEWED',
                message: 'Έχετε δει ήδη τις λεπτομερείες αυτού του ακινήτου. Εκδηλώστε ενδιαφέρον μόνος/μόνη σας.',
              });
              setLoading(false);
              return;
            }
          } catch {}

          try {
            const { data: cancelledData } = await apiClient.post('/buyer-agent/connections', {
              propertyId: params.id,
              agentId: params.agentId,
              checkCancelled: true,
            });
            if (cancelledData?.interestCancelled) {
              setInterestCancelled(true);
              setLoading(false);
              return;
            }
          } catch {}

          const { data: connectionData } = await apiClient.post('/buyer-agent/check', {
            agentId: params.agentId,
            propertyId: params.id,
          });
          if (connectionData?.exists) {
            setExistingInterest(true);
          }
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση των πληροφοριών');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.agentId, session?.user, status]);

  // Loading
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center">
        <div className="text-xl text-gray-600">Φόρτωση...</div>
      </div>
    );
  }

  // propertyViewedError
  if (propertyViewedError) {
    const isOwnerError = propertyViewedError.code === 'PROPERTY_OWNER';
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl py-12 px-8 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${isOwnerError ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isOwnerError ? (
              <FaInfoCircle className="w-10 h-10 text-red-600" />
            ) : (
              <FaEye className="w-10 h-10 text-amber-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isOwnerError ? 'Αυτό είναι το δικό σας ακίνητο' : 'Έχετε δει ήδη αυτό το ακίνητο'}
          </h2>
          <p className="text-gray-600 mb-8">{propertyViewedError.message}</p>
          <div className="space-y-3">
            {isOwnerError ? (
              <>
                <button
                  onClick={() => router.push('/deals')}
                  className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Πίσω στις Συναλλαγές
                </button>
                <button
                  onClick={() => router.push('/properties')}
                  className="w-full py-3 px-6 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Αναζήτηση Ακινήτων
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push(`/properties/${params.id}`)}
                  className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Δείτε ξανά τις λεπτομερείες
                </button>
                <button
                  onClick={() => router.push('/deals')}
                  className="w-full py-3 px-6 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Πίσω στις Συναλλαγές
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || (!property && !loading) || (!agent && !loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex flex-col items-center justify-center p-4">
        <div className="text-xl text-red-600 text-center mb-4">
          {error || 'Δεν ήταν δυνατή η φόρτωση των στοιχείων'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
        >
          Δοκιμάστε ξανά
        </button>
      </div>
    );
  }

  const propertyData = property!;
  const agentData = agent!;

  // interestCancelled
  if (interestCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl py-12 px-8 text-center">
          <FaInfoCircle className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Έχετε ακυρωμένη συναλλαγή για αυτό το ακίνητο
          </h2>
          <p className="text-gray-600 mb-8">
            Δεν μπορείτε να συνδεθείτε με νέο referral agent για αυτό το ακίνητο.
            Αν θέλετε επαναφορά ενδιαφέροντος, κάντε το από τις Συναλλαγές ή από τη σελίδα λεπτομερειών του ακινήτου.
          </p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-sm text-indigo-800">
              Αν γίνει επαναφορά, η συναλλαγή συνεχίζει με τους ίδιους συμμετέχοντες.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/deals?tab=deals')}
              className="w-full py-3 px-6 rounded-xl font-medium bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800 transition-colors"
            >
              Μετάβαση στις Συναλλαγές
            </button>
            <button
              onClick={() => router.push(`/buyer/properties/${params.id}`)}
              className="w-full py-3 px-6 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Σελίδα λεπτομερειών ακινήτου
            </button>
            <button
              onClick={() => router.push(`/properties/${params.id}`)}
              className="w-full py-3 px-6 rounded-xl font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              Public σελίδα ακινήτου
            </button>
          </div>
        </div>
      </div>
    );
  }

  // existingInterest
  if (existingInterest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl py-12 px-8 text-center">
          <FaHandshake className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Έχετε ήδη εκδηλώσει ενδιαφέρον</h2>
          <p className="text-gray-600 mb-8">
            Έχετε εκδηλώσει ενδιαφέρον για το ακίνητο &quot;{propertyData.title}&quot;
          </p>
          <button
            onClick={() => router.push('/deals')}
            className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Πίσω στις Συναλλαγές
          </button>
        </div>
      </div>
    );
  }

  // Main premium card
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4">
      <PropertyConnectPremiumCard
        agentId={agentData.id}
        propertyId={propertyData.id}
        agentName={agentData.name}
        agentImage={agentData.image}
        propertyTitle={propertyData.title}
        propertyImage={propertyData.images?.[0] || ''}
        propertyLocation={propertyData.location || [propertyData.neighborhood, propertyData.city, propertyData.state].filter(Boolean).join(', ') || '—'}
        propertyPrice={propertyData.price}
        agentEmail={agentData.email}
        agentPhone={agentData.phone}
        agentCompany={agentData.companyName}
        onClose={() => router.push(`/properties/${params.id}`)}
      />
    </div>
  );
}
