import React from 'react';
import { FiX, FiShare2 } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { Property } from '@/lib/api/properties';

interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  onShare?: () => void;
}

export default function PropertyDetailsModal({
  isOpen,
  onClose,
  property,
  onShare,
}: PropertyDetailsModalProps) {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'AGENT';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900">{property.title}</h2>
          <div className="flex items-center space-x-4">
            {isAgent && onShare && (
              <button
                onClick={onShare}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <FiShare2 size={16} />
                <span className="ml-2">Κοινοποίηση</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Images */}
          <div className="mb-8">
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

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Βασικές Πληροφορίες</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Τιμή</dt>
                  <dd className="text-lg font-semibold text-blue-600">{property.price}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Τοποθεσία</dt>
                  <dd className="text-gray-900">{property.location}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Τύπος</dt>
                  <dd className="text-gray-900">{property.type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Εμβαδόν</dt>
                  <dd className="text-gray-900">{property.area} τ.μ.</dd>
                </div>
                {property.bedrooms && (
                  <div>
                    <dt className="text-sm text-gray-500">Υπνοδωμάτια</dt>
                    <dd className="text-gray-900">{property.bedrooms}</dd>
                  </div>
                )}
                {property.bathrooms && (
                  <div>
                    <dt className="text-sm text-gray-500">Μπάνια</dt>
                    <dd className="text-gray-900">{property.bathrooms}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Στατιστικά</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Προβολές</dt>
                  <dd className="text-gray-900">{property.views}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Ερωτήματα</dt>
                  <dd className="text-gray-900">{property.inquiries}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Καταχωρήθηκε από</dt>
                  <dd className="text-gray-900">{property.sellerName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Ημερομηνία καταχώρησης</dt>
                  <dd className="text-gray-900">
                    {new Date(property.createdAt).toLocaleDateString('el-GR')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Περιγραφή</h3>
            <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Χαρακτηριστικά</h3>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 