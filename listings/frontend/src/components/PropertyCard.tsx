'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaBed, FaBath, FaRuler } from 'react-icons/fa';

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    description: string;
    price: number;
    location: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    images: string[];
    user: {
      name: string;
      email: string;
    };
  };
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48">
          <Image
            src={property.images[0] || '/placeholder.jpg'}
            alt={property.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-semibold mb-2 line-clamp-1">{property.title}</h3>
          <p className="text-gray-600 mb-2 line-clamp-1">{property.location}</p>
          <p className="text-2xl font-bold text-blue-600 mb-4">
            {formatPrice(property.price)}
          </p>
          <div className="flex justify-between text-gray-600">
            <div className="flex items-center">
              <FaBed className="mr-1" />
              <span>{property.bedrooms}</span>
            </div>
            <div className="flex items-center">
              <FaBath className="mr-1" />
              <span>{property.bathrooms}</span>
            </div>
            <div className="flex items-center">
              <FaRuler className="mr-1" />
              <span>{property.area} τ.μ.</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
} 