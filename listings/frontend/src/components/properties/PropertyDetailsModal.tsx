import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaChevronLeft, FaChevronRight, FaShare } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { Property } from '@/types/property';
import dynamic from 'next/dynamic';

// Δυναμική εισαγωγή του χάρτη για καλύτερη απόδοση
const PropertyMap = dynamic(() => import('./PropertyMap'), { ssr: false });

interface PropertyDetailsModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onPromote?: (propertyId: string) => void;
}

const sections = [
  { id: 'overview', label: 'Επισκόπηση' },
  { id: 'details', label: 'Λεπτομέρειες' },
  { id: 'map', label: 'Χάρτης' },
  { id: 'nearby', label: 'Κοντινά' },
];

export default function PropertyDetailsModal({ property, isOpen, onClose, onPromote }: PropertyDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleNextImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const handlePrevImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-6xl mx-auto my-6 rounded-lg shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed right-4 top-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
        >
          <FaTimes className="w-6 h-6 text-gray-600" />
        </button>

        {/* Image Gallery */}
        <div className="relative h-[400px] md:h-[500px]">
          <Image
            src={property.images && property.images.length > 0 
              ? property.images[currentImageIndex]
              : '/placeholder-property.jpg'}
            alt={property.title}
            fill
            className="object-cover"
          />
          {property.images && property.images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <FaChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <FaChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          
          {property.images && property.images.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
              {currentImageIndex + 1} / {property.images.length}
            </div>
          )}
        </div>

        {/* Navigation Bar - Sticky */}
        <div className="sticky top-0 bg-white border-b shadow-sm z-10">
          <div className="flex overflow-x-auto no-scrollbar">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-6 py-4 text-gray-600 hover:text-gray-900 whitespace-nowrap"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Info Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{property.title}</h2>
              <p className="text-xl text-blue-600 font-semibold mt-2">
                €{(property.price ?? 0).toLocaleString()}
              </p>
              <p className="flex items-center text-gray-600 mt-2">
                <FaMapMarkerAlt className="mr-2" />
                {property.location}
              </p>
            </div>
            <div className="flex gap-4">
              {user?.role === 'agent' && (
                <button
                  onClick={() => onPromote?.(property.id)}
                  className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors duration-200 flex items-center"
                >
                  <FaShare className="mr-2" />
                  Προώθηση Ακινήτου
                </button>
              )}
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                Προγραμματισμός Επίσκεψης
              </button>
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <div className="flex items-center text-gray-600">
              <FaBed className="mr-2" />
              {property.bedrooms} Υπνοδωμάτια
            </div>
            <div className="flex items-center text-gray-600">
              <FaBath className="mr-2" />
              {property.bathrooms} Μπάνια
            </div>
            <div className="flex items-center text-gray-600">
              <FaRulerCombined className="mr-2" />
              {property.area}τ.μ.
            </div>
          </div>
        </div>

        {/* Sections Content */}
        <div className="divide-y">
          {/* Overview Section */}
          <section id="overview" className="p-6 scroll-mt-16">
            <h3 className="text-2xl font-bold mb-6">Επισκόπηση</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-2">Περιγραφή</h4>
                <p className="text-gray-600">{property.fullDescription || property.shortDescription || 'Δεν υπάρχει περιγραφή'}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Χαρακτηριστικά</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.features?.map((feature, index) => (
                    <div key={index} className="flex items-center text-gray-600">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Ανέσεις</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities?.map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center text-gray-600">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Details Section */}
          <section id="details" className="p-6 scroll-mt-16">
            <h3 className="text-2xl font-bold mb-6">Λεπτομέρειες</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-4">Βασικές Πληροφορίες</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Τύπος</span>
                    <span className="font-medium">{property.propertyType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Έτος Κατασκευής</span>
                    <span className="font-medium">{property.yearBuilt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Θέρμανση</span>
                    <span className="font-medium">{property.heatingType || property.heatingSystem || 'Δεν καθορίζεται'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Κατάσταση</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      property.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status === 'AVAILABLE' ? 'Διαθέσιμο' : 'Μη Διαθέσιμο'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Ενεργειακά Στοιχεία</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ενεργειακή Κλάση</span>
                    <span className="font-medium">{property.energyClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Κατανάλωση</span>
                    <span className="font-medium">Δεν καθορίζεται</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Map Section */}
          <section id="map" className="p-6 scroll-mt-16">
            <h3 className="text-2xl font-bold mb-6">Χάρτης</h3>
            <div className="h-[400px]">
              <PropertyMap
                properties={[property]}
                onPropertyClick={() => {}}
              />
            </div>
          </section>

          {/* Nearby Section */}
          <section id="nearby" className="p-6 scroll-mt-16">
            <h3 className="text-2xl font-bold mb-6">Κοντινά Ακίνητα</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <p className="text-gray-600 col-span-full">Φόρτωση κοντινών ακινήτων...</p>
            </div>
          </section>
        </div>

        {/* Προσθήκη κουμπιού προβολής λεπτομερειών στο τέλος του modal */}
        <div className="p-6 border-t">
          <div className="flex justify-center">
            <button 
              className="px-6 py-3 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors duration-200 flex items-center"
              onClick={() => window.open(`/properties/${property.id}`, '_blank')}
            >
              Προβολή Πλήρων Λεπτομερειών
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 