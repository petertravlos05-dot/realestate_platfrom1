'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaHome, FaInfoCircle, FaList, FaMapMarkerAlt, FaEuroSign, FaCamera, FaFileAlt, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { BsFillGearFill } from 'react-icons/bs';
import { GiSailboat } from 'react-icons/gi';
import BasicsTab from './components/BasicsTab';
import FeaturesTab from './components/FeaturesTab';
import AmenitiesTab from './components/AmenitiesTab';
import LocationTab from './components/LocationTab';
import PriceTab from './components/PriceTab';
import PhotosTab from './components/PhotosTab';
import DescriptionTab from './components/DescriptionTab';
import { apiClient, uploadToBackend } from '@/lib/api/client';

const tabs = [
  { id: 'basics', label: 'Βασικά', icon: FaHome },
  { id: 'features', label: 'Χαρακτηριστικά', icon: BsFillGearFill },
  { id: 'amenities', label: 'Παροχές', icon: FaList },
  { id: 'location', label: 'Τοποθεσία', icon: FaMapMarkerAlt },
  { id: 'price', label: 'Τιμή', icon: FaEuroSign },
  { id: 'photos', label: 'Φωτογραφίες', icon: FaCamera },
  { id: 'description', label: 'Περιγραφή', icon: FaFileAlt }
];

export default function ListPropertyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basics');
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    manufacturer: '',
    neighborhood: '',
    type: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    price: '',
    yearBuilt: '',
    renovationYear: '',
    floor: '',
    condition: '',
    heatingType: '',
    energyClass: '',
    description: '',

    // Features & Amenities
    features: [] as string[],
    amenities: [] as string[],

    // Location
    address: '',
    city: '',
    postalCode: '',
    locationDetails: '',

    // Price Details
    transactionType: '',
    deposit: '',
    minRentalPeriod: '',
    includesUtilities: false,
    includesMaintenance: false,

    // Photos
    photos: [] as File[],
    photoUrls: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handlePhotosChange = (photos: File[]) => {
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...photos]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.price || 
          !formData.type || !formData.area || !formData.address || !formData.city) {
        throw new Error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      }

      // Prepare the data
      const propertyData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        type: formData.type,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        area: parseFloat(formData.area),
        location: `${formData.address}, ${formData.city}`,
        features: [...formData.features, ...formData.amenities],
        images: formData.photoUrls,
        status: 'ACTIVE',
        userId: session?.user?.id,
      };

      const formDataToSend = new FormData();
      
      // Add all property data to FormData
      Object.entries(propertyData).forEach(([key, value]) => {
        if (key === 'images') {
          // Images are already URLs, skip for now
          return;
        }
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      const response = await uploadToBackend('/properties', formDataToSend);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Σφάλμα κατά την καταχώριση του ακινήτου');
      }

      // Redirect to properties list on success
      router.push('/properties');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Κάτι πήγε στραβά');
      console.error('Error submitting property:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basics':
        return <BasicsTab formData={formData} onChange={handleInputChange} />;
      case 'features':
        return <FeaturesTab formData={formData} onFeatureToggle={handleFeatureToggle} />;
      case 'amenities':
        return <AmenitiesTab formData={formData} onAmenityToggle={handleAmenityToggle} />;
      case 'location':
        return <LocationTab formData={formData} onChange={handleInputChange} />;
      case 'price':
        return <PriceTab formData={formData} onChange={handleInputChange} />;
      case 'photos':
        return <PhotosTab formData={formData} onPhotosChange={handlePhotosChange} />;
      case 'description':
        return <DescriptionTab formData={formData} onChange={handleInputChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Καταχώριση Ακινήτου</h1>
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <FaArrowLeft className="mr-2" />
            <span>Επιστροφή στην αρχική</span>
          </Link>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex overflow-x-auto border-b border-gray-200">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap
                  ${tab.id === activeTab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${tabs.findIndex(t => t.id === activeTab) >= index ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                `}
                disabled={tabs.findIndex(t => t.id === activeTab) < index}
              >
                <div className="flex items-center">
                  <tab.icon className="mr-2 h-5 w-5" />
                  <span>{tab.label}</span>
                </div>
                {tabs.findIndex(t => t.id === activeTab) > index && (
                  <FaCheck className="ml-2 h-4 w-4 text-green-500" />
                )}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-1">
              {renderTabContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between">
              {activeTab !== tabs[0].id && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Πίσω
                </button>
              )}

              {activeTab === tabs[tabs.length - 1].id ? (
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Υποβολή...' : 'Ολοκλήρωση'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Επόμενο
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 