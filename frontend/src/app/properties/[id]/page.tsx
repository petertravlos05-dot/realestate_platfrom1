'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiShare2, FiMapPin, FiHome, FiDollarSign, FiMaximize2 } from 'react-icons/fi';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import PropertyShareModal from '@/components/PropertyShareModal';
import { Property, propertiesApi } from '@/lib/api/properties';

interface PageProps {
  params: {
    id: string;
  };
}

export default function PropertyPage({ params }: PageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const data = await propertiesApi.getById(params.id);
        setProperty(data);
        // Αύξηση προβολών
        await propertiesApi.incrementViews(params.id);
      } catch (err) {
        setError('Σφάλμα κατά τη φόρτωση του ακινήτου');
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Σφάλμα</h1>
          <p className="text-gray-600">{error || 'Το ακίνητο δεν βρέθηκε'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
            <p className="text-gray-600 mt-1">{property.location}</p>
          </div>
          <div className="flex items-center space-x-4">
            {session?.user?.role === 'AGENT' && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <FiShare2 size={16} />
                <span className="ml-2">Κοινοποίηση</span>
              </button>
            )}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <FiMaximize2 size={16} />
              <span className="ml-2">Λεπτομέρειες</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.images.map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`${property.title} - Image ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <FiDollarSign size={20} />
                  <span className="ml-2">{property.price}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FiHome size={20} />
                  <span className="ml-2">{property.type}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FiMapPin size={20} />
                  <span className="ml-2">{property.area} τ.μ.</span>
                </div>
                {property.bedrooms && (
                  <div className="flex items-center text-gray-600">
                    <FiHome size={20} />
                    <span className="ml-2">{property.bedrooms} Υπνοδωμάτια</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center text-gray-600">
                    <FiHome size={20} />
                    <span className="ml-2">{property.bathrooms} Μπάνια</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Χαρακτηριστικά</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {property.features.map((feature: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Δείτε περισσότερες λεπτομέρειες
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PropertyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        property={property}
        onShare={() => {
          setShowDetailsModal(false);
          setShowShareModal(true);
        }}
      />

      <PropertyShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        property={property}
      />
    </div>
  );
} 