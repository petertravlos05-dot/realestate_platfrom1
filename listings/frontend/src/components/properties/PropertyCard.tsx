"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBed, FaBath, FaRulerCombined, FaHeart, FaRegHeart } from 'react-icons/fa';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';
import { Property } from '@/types/property';
import PropertyDetailsModal from './PropertyDetailsModal';

interface PropertyCardProps {
  property: Property;
  viewMode: 'grid' | 'list';
  onFavoriteClick: (propertyId: string) => void;
  isAuthenticated: boolean;
  isFavorite?: boolean;
  onPromote?: (propertyId: string) => void;
  userRole: 'buyer' | 'seller' | 'agent';
}

export default function PropertyCard({ property, viewMode, onFavoriteClick, isAuthenticated, isFavorite = false, onPromote, userRole }: PropertyCardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteClick(property.id);
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

  const isSoldOrRented = property.propertySold || property.isSold;
  const isDepositLocked = (property as any).depositLocked;
  const getListingType = () => {
    const a = (property as any).amenities;
    if (a && typeof a === 'object' && (a.listingType || a.transactionType)) {
      const t = (a.listingType || a.transactionType || '').toLowerCase();
      return t === 'rent' ? 'rent' : 'sale';
    }
    return 'sale';
  };

  const getStatusBanner = (): { label: string; className: string } => {
    const isRent = getListingType() === 'rent';
    if (isSoldOrRented) return { label: isRent ? 'Ενοικιάστηκε' : 'Πουλημένο', className: 'bg-slate-700/90 text-white' };
    if (isDepositLocked || property.isReserved || property.status !== 'ACTIVE') return { label: 'Μη διαθεσίμο', className: 'bg-amber-600/90 text-white' };
    return { label: isRent ? 'Ενοικιάζεται' : 'Πωλείται', className: userRole === 'agent' ? 'bg-indigo-600/90 text-white' : 'bg-emerald-600/90 text-white' };
  };

  const isAgent = userRole === 'agent';
  const priceClass = isAgent ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-800 to-slate-700 bg-clip-text text-transparent';
  const iconClass = isAgent ? 'text-indigo-600' : 'text-blue-800';
  const btnClass = isAgent ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800' : 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800';

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
        <div className="relative w-full md:w-56 h-40 md:h-32 flex-shrink-0 overflow-hidden rounded-xl">
          <Image
            src={getPropertyImageUrl(property.images?.[0])}
            alt={property.title}
            fill
            className="object-cover"
          />
          <span className={`absolute top-2 left-2 ${getStatusBanner().className} text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
            {getStatusBanner().label}
          </span>
        </div>
        <div className="flex-grow flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
            <p className="text-gray-500 mb-2 line-clamp-1">{property.location}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-2xl font-bold bg-clip-text text-transparent ${userRole === 'agent' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700' : 'bg-gradient-to-r from-blue-800 to-slate-700'}`}>
                {property.price.toLocaleString('el-GR')} €{getListingType() === 'rent' ? '/μήνα' : ''}
              </span>
              <button
                onClick={handleFavoriteClick}
                className="p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-all duration-200 flex-shrink-0"
                title={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                aria-label={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
              >
                {isFavorite ? <FaHeart className="w-4 h-4 fill-red-500 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-red-500" />}
              </button>
            </div>
            <div className="flex items-center gap-6 text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <FaBed className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
                <span>{property.bedrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <FaBath className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
                <span>{property.bathrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <FaRulerCombined className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
                <span>{property.area} τ.μ.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleViewDetails}
              className={`flex-1 px-4 py-2 text-white rounded-lg shadow-md font-semibold transition-all duration-300 ${userRole === 'agent' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800' : 'bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800'}`}
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
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={getPropertyImageUrl(property.images?.[0])}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className={`absolute top-2 left-2 ${getStatusBanner().className} text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
          {getStatusBanner().label}
        </span>
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/90 shadow-md text-red-500 hover:bg-red-50 hover:scale-110 transition-all duration-200 z-10"
          title={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
          aria-label={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
        >
          {isFavorite ? <FaHeart className="w-4 h-4 fill-red-500 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-red-500" />}
        </button>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
        <p className="text-gray-500 mb-2 line-clamp-1">{property.location}</p>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xl font-bold bg-clip-text text-transparent ${priceClass}`}>
            {property.price.toLocaleString('el-GR')} €{getListingType() === 'rent' ? '/μήνα' : ''}
          </span>
          <button
            onClick={handleFavoriteClick}
            className="p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-all duration-200 flex-shrink-0"
            title={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
            aria-label={isFavorite ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
          >
            {isFavorite ? <FaHeart className="w-4 h-4 fill-red-500 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-red-500" />}
          </button>
        </div>
        <div className="flex justify-between items-center text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <FaBed className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaBath className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaRulerCombined className={userRole === 'agent' ? 'text-indigo-600' : 'text-blue-800'} />
            <span>{property.area} τ.μ.</span>
          </div>
        </div>
        <button
          onClick={handleViewDetails}
          className={`w-full py-2 text-white rounded-lg shadow-md font-semibold transition-all duration-300 ${userRole === 'agent' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800' : 'bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800'}`}
        >
          Προβολή Λεπτομερειών
        </button>
      </div>
    </div>
  );
} 