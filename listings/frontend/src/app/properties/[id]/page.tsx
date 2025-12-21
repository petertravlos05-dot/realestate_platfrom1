'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  type: string;
  status: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  user: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface SimilarProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  images: string[];
  user: {
    name: string;
    email: string;
  };
}

export default function PropertyDetails() {
  const { data: session } = useSession();
  const propertyId = (useParams() as any)?.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<SimilarProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Session:', session);
    console.log('User role:', session?.user ? (session.user as any).role : 'No role');
    console.log('Property ID:', propertyId);
    
    const fetchProperty = async () => {
      try {
        const { data } = await apiClient.get(`/properties/${propertyId}`);

        // Το API επιστρέφει { property }, όχι { property, similarProperties }
        setProperty(data.property);
        // Για τώρα, δεν έχουμε similar properties, οπότε αφήνουμε το array κενό
        setSimilarProperties([]);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Σφάλμα κατά την ανάκτηση του ακινήτου');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Σφάλμα</h1>
          <p className="text-gray-600">{error || 'Το ακίνητο δεν βρέθηκε'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Property Images */}
        <div className="relative h-96 mb-8">
          {property.images.length > 0 ? (
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Δεν υπάρχει εικόνα</span>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {property.price.toLocaleString('el-GR')} €
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Τοποθεσία</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {property.location}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Τύπος</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {property.type}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Εμβαδόν</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {property.area} τ.μ.
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Υπνοδωμάτια</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {property.bedrooms}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Μπάνια</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {property.bathrooms}
                </dd>
              </div>
            </dl>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Περιγραφή</h2>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
              {property.description}
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Επικοινωνία</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Επικοινωνήστε με τον ιδιοκτήτη:</p>
              <p className="mt-1">{property.user.name}</p>
              <p>{property.user.email}</p>
              {property.user.phone && <p>{property.user.phone}</p>}
            </div>
            <div className="mt-5 flex space-x-4">
              {!session ? (
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Συνδεθείτε για να επικοινωνήσετε
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => window.location.href = `mailto:${property.user.email}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Στείλτε Email
                  </button>
                  {session?.user && (session.user as any).role === 'AGENT' && (
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/properties/${property.id}/connect/${session.user.id}`;
                        if (navigator.share) {
                          navigator.share({
                            title: property.title,
                            text: `${property.description}\n\nΔείτε αυτό το ακίνητο και επικοινωνήστε μαζί μου για περισσότερες πληροφορίες.`,
                            url: shareUrl,
                          }).catch(console.error);
                        } else {
                          navigator.clipboard.writeText(shareUrl);
                          alert('Το link αντιγράφηκε στο clipboard!');
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Προώθηση Ακινήτου
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Παρόμοια Ακίνητα</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarProperties.map((similar) => (
                <Link
                  key={similar.id}
                  href={`/properties/${similar.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="relative h-48">
                    {similar.images.length > 0 ? (
                      <Image
                        src={similar.images[0]}
                        alt={similar.title}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-t-lg flex items-center justify-center">
                        <span className="text-gray-400">Δεν υπάρχει εικόνα</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{similar.title}</h3>
                    <p className="mt-1 text-blue-600 font-medium">
                      {similar.price.toLocaleString('el-GR')} €
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{similar.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 