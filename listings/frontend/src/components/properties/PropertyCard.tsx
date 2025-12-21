"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBed, FaBath, FaRuler, FaHeart, FaRegHeart, FaRulerCombined, FaTag, FaBolt } from 'react-icons/fa';
import { Property } from '@/types/property';
import PropertyDetailsModal from './PropertyDetailsModal';

interface PropertyCardProps {
  property: Property;
  viewMode: 'grid' | 'list';
  onFavoriteClick: (propertyId: string) => void;
  isAuthenticated: boolean;
  onPromote?: (propertyId: string) => void;
  userRole: 'buyer' | 'seller' | 'agent';
}

export default function PropertyCard({ property, viewMode, onFavoriteClick, isAuthenticated, onPromote, userRole }: PropertyCardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Αν είμαστε στη σελίδα /properties, χρησιμοποιούμε τη διαδρομή /buyer/properties/[id]
    // Αν είμαστε στη σελίδα /buyer, χρησιμοποιούμε τη διαδρομή /buyer/properties/[id]
    if (userRole === 'buyer' && window.location.pathname === '/properties') {
      router.push(`/buyer/properties/${property.id}`);
    } else {
      router.push(`/${userRole}/properties/${property.id}`);
    }
  };

  // Badge logic
  const isNew = property.createdAt && (new Date().getTime() - new Date(property.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const hasOffer = property.features && property.features.includes('Προσφορά');

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
        {property.images && property.images[0] && (
          <div className="relative w-full md:w-56 h-40 md:h-32 flex-shrink-0 overflow-hidden rounded-xl">
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover"
            />
            {isNew && (
              <span className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <FaBolt className="w-3 h-3" /> Νέο
              </span>
            )}
            {hasOffer && (
              <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <FaTag className="w-3 h-3" /> Προσφορά
              </span>
            )}
          </div>
        )}
        <div className="flex-grow flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
            <p className="text-gray-500 mb-2 line-clamp-1">{property.location}</p>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {property.price.toLocaleString('el-GR')} €
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                  property.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {property.status === 'ACTIVE' ? 'Διαθέσιμο' : 'Μη Διαθέσιμο'}
              </span>
            </div>
            <div className="flex items-center gap-6 text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <FaBed className="text-blue-400" />
                <span>{property.bedrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <FaBath className="text-blue-400" />
                <span>{property.bathrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <FaRulerCombined className="text-blue-400" />
                <span>{property.area} τ.μ.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteClick(property.id);
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Αγαπημένο"
            >
              {property.isFavorite ? (
                <FaHeart className="w-5 h-5 text-red-500" />
              ) : (
                <FaRegHeart className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleViewDetails}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 shadow-md font-semibold transition-all duration-300"
            >
              Προβολή
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group">
      {property.images && property.images[0] && (
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isNew && (
            <span className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <FaBolt className="w-3 h-3" /> Νέο
            </span>
          )}
          {hasOffer && (
            <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <FaTag className="w-3 h-3" /> Προσφορά
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick(property.id);
            }}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 transition-colors"
            title="Αγαπημένο"
          >
            {property.isFavorite ? (
              <FaHeart className="w-5 h-5 text-red-500" />
            ) : (
              <FaRegHeart className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      )}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
        <p className="text-gray-500 mb-2 line-clamp-1">{property.location}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {property.price.toLocaleString('el-GR')} €
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
              property.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {property.status === 'ACTIVE' ? 'Διαθέσιμο' : 'Μη Διαθέσιμο'}
          </span>
        </div>
        <div className="flex justify-between items-center text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <FaBed className="text-blue-400" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaBath className="text-blue-400" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaRulerCombined className="text-blue-400" />
            <span>{property.area} τ.μ.</span>
          </div>
        </div>
        <button
          onClick={handleViewDetails}
          className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 shadow-md font-semibold transition-all duration-300"
        >
          Προβολή Λεπτομερειών
        </button>
      </div>
    </div>
  );
} 