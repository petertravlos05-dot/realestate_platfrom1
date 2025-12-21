'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { FaEnvelope, FaHeart } from 'react-icons/fa';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import PropertyShareModal from '@/components/PropertyShareModal';

interface Property {
  id: string;
  
  // Βασικά στοιχεία
  title: string;
  shortDescription?: string;
  fullDescription: string;
  propertyType: string;
  condition?: string;
  yearBuilt?: number;
  renovationYear?: number;

  // Βασικά χαρακτηριστικά
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  parkingSpaces?: number;
  garden: boolean;
  multipleFloors: boolean;

  // Εμπορικά χαρακτηριστικά
  commercialType?: string;
  rooms?: number;

  // Χαρακτηριστικά οικοπέδου
  plotCategory?: string;
  plotOwnershipType?: string;

  // Χαρακτηριστικά
  heatingType?: string;
  heatingSystem?: string;
  windows?: string;
  windowsType?: string;
  flooring?: string;
  energyClass?: string;

  // Επιπλέον χαρακτηριστικά
  elevator: boolean;
  furnished: boolean;
  securityDoor: boolean;
  alarm: boolean;
  disabledAccess: boolean;
  soundproofing: boolean;
  thermalInsulation: boolean;
  pool?: string;
  balconyArea?: number;
  hasBalcony: boolean;

  // Χαρακτηριστικά οικοπέδου
  plotArea?: number;
  buildingCoefficient?: number;
  coverageRatio?: number;
  facadeLength?: number;
  sides?: number;
  buildableArea?: number;
  buildingPermit: boolean;
  roadAccess?: string;
  terrain?: string;
  shape?: string;
  suitability?: string;

  // Εμπορικά χαρακτηριστικά
  storageType?: string;
  elevatorType?: string;
  fireproofDoor: boolean;

  // Τοποθεσία
  state: string;
  city: string;
  neighborhood?: string;
  street: string;
  number: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };

  // Τιμή
  price: number;
  pricePerSquareMeter?: number;
  negotiable: boolean;
  additionalPriceNotes?: string;

  // Συστημικά πεδία
  status: string;
  isVerified: boolean;
  isReserved: boolean;
  isSold: boolean;
  images: string[];
  keywords: string[];
  createdAt: string;
  updatedAt: string;

  // Σχέσεις
  user: {
    name: string;
    email: string;
  };
}

interface PropertyDetailsProps {
  property: Property;
}

export default function PropertyDetails({ property }: PropertyDetailsProps) {
  const { data: session } = useSession();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  const handleShare = () => {
    if (session?.user?.role === 'AGENT') {
      setIsShareModalOpen(true);
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment':
        return 'Διαμέρισμα';
      case 'house':
        return 'Μονοκατοικία';
      case 'villa':
        return 'Βίλα';
      case 'commercial':
        return 'Επαγγελματικός Χώρος';
      case 'plot':
        return 'Οικόπεδο';
      default:
        return type;
    }
  };

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case 'underConstruction':
        return 'Υπό κατασκευή';
      case 'renovated':
        return 'Ανακαινισμένο';
      case 'needsRenovation':
        return 'Χρήζει ανακαίνισης';
      default:
        return 'Δεν έχει οριστεί';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  }).format(property.price)}
                  {property.negotiable && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (Συζητήσιμη)
                    </span>
                  )}
                </p>
                {property.pricePerSquareMeter && (
                  <p className="text-sm text-gray-500">
                    {new Intl.NumberFormat('el-GR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(property.pricePerSquareMeter)}
                    /τ.μ.
                  </p>
                )}
                <p className="mt-1 text-gray-500">
                  {property.street} {property.number}
                  {property.neighborhood && `, ${property.neighborhood}`}
                  <br />
                  {property.city}, {property.state}
                  {property.postalCode && ` ${property.postalCode}`}
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsDetailsModalOpen(true)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Προβολή Λεπτομερειών
                </button>
                {session?.user?.role === 'AGENT' && (
                  <button
                    onClick={handleShare}
                    className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                  >
                    Κοινοποίηση
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Βασικά Χαρακτηριστικά */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Βασικά Χαρακτηριστικά</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Τύπος</p>
                    <p className="font-medium">{getPropertyTypeLabel(property.propertyType)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Κατάσταση</p>
                    <p className="font-medium">{getConditionLabel(property.condition)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Εμβαδόν</p>
                    <p className="font-medium">{property.area} τ.μ.</p>
                  </div>
                  {property.yearBuilt && (
                    <div>
                      <p className="text-gray-600">Έτος Κατασκευής</p>
                      <p className="font-medium">{property.yearBuilt}</p>
                    </div>
                  )}
                  {property.bedrooms && (
                    <div>
                      <p className="text-gray-600">Υπνοδωμάτια</p>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div>
                      <p className="text-gray-600">Μπάνια</p>
                      <p className="font-medium">{property.bathrooms}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Επιπλέον Χαρακτηριστικά */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Επιπλέον Χαρακτηριστικά</h2>
                <div className="grid grid-cols-2 gap-2">
                  {property.elevator && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Ασανσέρ</span>}
                  {property.furnished && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Επιπλωμένο</span>}
                  {property.securityDoor && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Πόρτα Ασφαλείας</span>}
                  {property.alarm && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Συναγερμός</span>}
                  {property.disabledAccess && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Πρόσβαση ΑΜΕΑ</span>}
                  {property.soundproofing && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Ηχομόνωση</span>}
                  {property.thermalInsulation && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Θερμομόνωση</span>}
                  {property.hasBalcony && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Μπαλκόνι</span>}
                  {property.garden && <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Κήπος</span>}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Περιγραφή</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{property.fullDescription}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <PropertyDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          property={property}
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
    </div>
  );
} 