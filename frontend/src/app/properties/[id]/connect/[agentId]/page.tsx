'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Property } from '@/lib/api/properties';
import ConfirmAgentConnectionModal from '@/components/ConfirmAgentConnectionModal';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';

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
  const [agent, setAgent] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Φόρτωση πληροφοριών ακινήτου
        const propertyResponse = await fetch(`/api/properties/${params.id}`);
        if (!propertyResponse.ok) {
          throw new Error('Failed to fetch property');
        }
        const propertyData = await propertyResponse.json();
        setProperty(propertyData);

        // Φόρτωση πληροφοριών μεσίτη
        const agentResponse = await fetch(`/api/agents/${params.agentId}`);
        if (!agentResponse.ok) {
          throw new Error('Failed to fetch agent');
        }
        const agentData = await agentResponse.json();
        setAgent(agentData);

        // Αν ο χρήστης είναι συνδεδεμένος, ελέγχουμε αν υπάρχει ήδη σύνδεση
        if (session?.user) {
          const connectionResponse = await fetch(`/api/buyer-agent/check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId: params.agentId,
              propertyId: params.id,
            }),
          });

          if (connectionResponse.ok) {
            const { exists } = await connectionResponse.json();
            if (exists) {
              router.push('/dashboard/buyer');
              return;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, params.agentId, session?.user, router]);

  // Αν ο χρήστης δεν είναι συνδεδεμένος, τον ανακατευθύνουμε στο login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !property || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          {error || 'Property or agent not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Σύνδεση με Μεσίτη
            </h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-700">
                Ο μεσίτης <strong>{agent.name}</strong> σας προσκάλεσε να δείτε το ακίνητο:
              </p>
              <h2 className="text-xl font-semibold mt-2">{property.title}</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <button
                onClick={() => setShowDetailsModal(true)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
              >
                Προβολή Λεπτομερειών
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Σύνδεση με τον Μεσίτη
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <PropertyDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          property={property}
        />

        <ConfirmAgentConnectionModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          agentId={agent.id}
          propertyId={property.id}
          agentName={agent.name}
          propertyTitle={property.title}
        />
      </div>
    </div>
  );
} 