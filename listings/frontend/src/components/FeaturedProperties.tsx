"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaBed, FaBath, FaRuler } from 'react-icons/fa';
import { fetchFromBackend } from '@/lib/api/client';

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  squareMeters: number;
  images: string[];
  propertyType: string;
}

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetchFromBackend('/properties?limit=6');
        const data = await response.json();
        setProperties(data);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Διαθέσιμα Ακίνητα</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Ανακαλύψτε μερικά από τα καλύτερα ακίνητα που είναι διαθέσιμα στην πλατφόρμα μας
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <Link href={`/properties/${property.id}`} key={property.id}>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:transform hover:scale-105">
                <div className="relative h-64">
                  <Image
                    src={property.images[0] || '/placeholder.jpg'}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full">
                    {property.propertyType}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{property.title}</h3>
                  <p className="text-gray-600 mb-4">{property.location}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">€{property.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <div className="flex items-center">
                      <FaBed className="mr-2" />
                      <span>{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <FaBath className="mr-2" />
                      <span>{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center">
                      <FaRuler className="mr-2" />
                      <span>{property.squareMeters}m²</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link 
            href="/properties" 
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition-colors"
          >
            Δείτε Όλα τα Ακίνητα
          </Link>
        </div>
      </div>
    </section>
  );
} 