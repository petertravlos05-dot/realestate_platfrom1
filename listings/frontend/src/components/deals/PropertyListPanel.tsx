'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaMapMarkerAlt, FaEye, FaUsers, FaPlus } from 'react-icons/fa';
import Link from 'next/link';

export interface Property {
  id: string;
  _id?: string;
  title: string;
  price: number;
  location: string;
  city: string;
  street: string;
  number: string;
  status: string;
  images: string[];
  stats?: {
    views: number;
    interestedCount: number;
    viewingCount: number;
  };
  leads?: Array<{
    id: string;
    buyer: {
      id: string;
      name: string;
    };
  }>;
  propertySold?: boolean;
}

interface PropertyListPanelProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertySelect: (propertyId: string) => void;
  loading?: boolean;
}

export default function PropertyListPanel({
  properties,
  selectedPropertyId,
  onPropertySelect,
  loading = false,
}: PropertyListPanelProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Τα Ακίνητά μου</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Τα Ακίνητά μου</h2>
        <Link
          href="/add-listing"
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 text-sm font-medium transition-all flex items-center gap-2"
        >
          <FaPlus className="text-xs" />
          <span className="hidden sm:inline">Νέο</span>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaPlus className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν έχετε ακίνητα</h3>
          <p className="text-gray-500 mb-6">Προσθέστε το πρώτο σας ακίνητο για να ξεκινήσετε</p>
          <Link
            href="/add-listing"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:from-green-700 hover:to-emerald-800 font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            <FaPlus className="mr-2" />
            Προσθήκη Ακινήτου
          </Link>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {properties.map((property) => {
            const isSelected = selectedPropertyId === property.id || selectedPropertyId === property._id;
            const interestedCount = property.leads?.length || property.stats?.interestedCount || 0;
            
            return (
              <motion.button
                key={property.id || property._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPropertySelect(property.id || property._id!)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 shadow-lg'
                    : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                }`}
              >
                {property.images && property.images[0] && (
                  <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                    <Image
                      src={property.images[0]}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {property.propertySold && (
                      <span className="absolute top-2 left-2 bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        Πουλημένο
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                )}
                
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
                
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <FaMapMarkerAlt className="w-3 h-3 mr-1 text-green-500" />
                  <span className="truncate">{property.location || `${property.city}, ${property.street} ${property.number}`}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                    {property.price.toLocaleString('el-GR')} €
                  </span>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center">
                      <FaEye className="mr-1" />
                      {property.stats?.views || 0}
                    </div>
                    <div className="flex items-center">
                      <FaUsers className="mr-1" />
                      {interestedCount}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.propertySold
                      ? 'bg-teal-100 text-teal-800'
                      : property.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'unavailable'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {property.propertySold
                      ? 'Πουλημένο'
                      : property.status === 'available' 
                      ? 'Διαθέσιμο' 
                      : property.status === 'unavailable'
                      ? 'Αφαιρέθηκε'
                      : 'Μη Διαθέσιμο'}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

