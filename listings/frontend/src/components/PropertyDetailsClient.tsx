'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import PropertyShareModal from '@/components/PropertyShareModal';

interface Property {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  type: 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL';
  status: 'ACTIVE' | 'PENDING' | 'SOLD' | 'RENTED';
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  features: string[];
  images: string[];
  views: number;
  inquiries: number;
  sellerName: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface PropertyDetailsClientProps {
  property: Property;
}

export default function PropertyDetailsClient({ property }: PropertyDetailsClientProps) {
  const { data: session } = useSession();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = () => {
    if (session?.user?.role === 'AGENT') {
      setIsShareModalOpen(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Property Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        {property.images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`${property.title} - Image ${index + 1}`}
            className="w-full h-64 object-cover rounded-lg"
          />
        ))}
      </div>

      {/* Property Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
            <p className="mt-2 text-xl text-blue-600 font-semibold">
              {new Intl.NumberFormat('el-GR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(Number(property.price))}
            </p>
            <p className="mt-1 text-gray-500">{property.location}</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              View Details
            </button>
            {session?.user?.role === 'AGENT' && (
              <button
                onClick={handleShare}
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
              >
                Share
              </button>
            )}
          </div>
        </div>

        <div className="prose max-w-none">
          <p>{property.description}</p>
        </div>
      </div>

      {/* Modals */}
      <PropertyDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        property={property as any}
        onShare={session?.user?.role === 'AGENT' ? handleShare : undefined}
        isAgent={session?.user?.role === 'AGENT'}
      />

      {session?.user?.role === 'AGENT' && (
        <PropertyShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          propertyId={property.id}
          agentId={session.user.id as string}
          propertyTitle={property.title}
        />
      )}
    </div>
  );
} 