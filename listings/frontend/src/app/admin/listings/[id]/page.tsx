'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCheck, FaTimes, FaComment, FaHistory } from 'react-icons/fa';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

export default function ListingDetails() {
  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');

  // Sample data - will be replaced with actual data from API
  const listing = {
    id: '123',
    title: 'Μοντέρνο Διαμέρισμα στο Κολωνάκι',
    status: 'pending',
    submittedAt: '2024-03-15T10:30:00',
    owner: {
      name: 'Γιώργος Παπαδόπουλος',
      email: 'giorgos@example.com',
      phone: '6901234567'
    },
    property: {
      type: 'apartment',
      area: 120,
      bedrooms: 2,
      bathrooms: 1,
      yearBuilt: 2020,
      floor: 3,
      parking: 1,
      heating: 'autonomous',
      energyClass: 'A+',
      features: ['solarHeater', 'airConditioning', 'furnished'],
      amenities: ['wifi', 'parking', 'elevator'],
      location: {
        address: 'Σόλωνος 45',
        city: 'Αθήνα',
        neighborhood: 'Κολωνάκι',
        coordinates: { lat: 37.9765, lng: 23.7358 }
      },
      price: {
        type: 'sale',
        amount: 250000,
        negotiable: true
      },
      photos: [
        'https://via.placeholder.com/800x600',
        'https://via.placeholder.com/800x600',
        'https://via.placeholder.com/800x600'
      ],
      description: {
        title: 'Μοντέρνο διαμέρισμα στο κέντρο της Αθήνας',
        shortDescription: 'Πλήρως ανακαινισμένο διαμέρισμα με θέα στην Ακρόπολη',
        fullDescription: 'Λεπτομερής περιγραφή του ακινήτου...',
        keywords: ['μοντέρνο', 'ανακαινισμένο', 'κέντρο']
      }
    },
    history: [
      {
        date: '2024-03-15T10:30:00',
        action: 'submitted',
        user: 'Γιώργος Παπαδόπουλος'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="mr-2" />
            Πίσω
          </button>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
              <FaCheck className="mr-2" />
              Έγκριση
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
              <FaTimes className="mr-2" />
              Απόρριψη
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {['details', 'photos', 'history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-6 py-3 text-sm font-medium
                    ${activeTab === tab
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {tab === 'details' && 'Λεπτομέρειες'}
                  {tab === 'photos' && 'Φωτογραφίες'}
                  {tab === 'history' && 'Ιστορικό'}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Βασικές Πληροφορίες</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τίτλος</label>
                      <p className="mt-1 text-gray-900">{listing.property.description.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τύπος Ακινήτου</label>
                      <p className="mt-1 text-gray-900">Διαμέρισμα</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Εμβαδόν</label>
                      <p className="mt-1 text-gray-900">{listing.property.area} τ.μ.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Υπνοδωμάτια</label>
                      <p className="mt-1 text-gray-900">{listing.property.bedrooms}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Μπάνια</label>
                      <p className="mt-1 text-gray-900">{listing.property.bathrooms}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Έτος Κατασκευής</label>
                      <p className="mt-1 text-gray-900">{listing.property.yearBuilt}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Τοποθεσία</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Διεύθυνση</label>
                      <p className="mt-1 text-gray-900">{listing.property.location.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Περιοχή</label>
                      <p className="mt-1 text-gray-900">{listing.property.location.neighborhood}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Πόλη</label>
                      <p className="mt-1 text-gray-900">{listing.property.location.city}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={listing.property.location.coordinates}
                        zoom={15}
                      >
                        <Marker position={listing.property.location.coordinates} />
                      </GoogleMap>
                    </LoadScript>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Τιμή</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τύπος Συναλλαγής</label>
                      <p className="mt-1 text-gray-900">
                        {listing.property.price.type === 'sale' ? 'Πώληση' : 'Ενοικίαση'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τιμή</label>
                      <p className="mt-1 text-gray-900">{listing.property.price.amount} €</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Συζητήσιμη Τιμή</label>
                      <p className="mt-1 text-gray-900">
                        {listing.property.price.negotiable ? 'Ναι' : 'Όχι'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Περιγραφή</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Σύντομη Περιγραφή</label>
                      <p className="mt-1 text-gray-900">{listing.property.description.shortDescription}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Αναλυτική Περιγραφή</label>
                      <p className="mt-1 text-gray-900">{listing.property.description.fullDescription}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Λέξεις-κλειδιά</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {listing.property.description.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features & Amenities */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Χαρακτηριστικά & Παροχές</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Χαρακτηριστικά</h4>
                      <ul className="space-y-2">
                        {listing.property.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-gray-900">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Παροχές</h4>
                      <ul className="space-y-2">
                        {listing.property.amenities.map((amenity, index) => (
                          <li key={index} className="flex items-center text-gray-900">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {amenity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Στοιχεία Ιδιοκτήτη</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ονοματεπώνυμο</label>
                      <p className="mt-1 text-gray-900">{listing.owner.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-gray-900">{listing.owner.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Τηλέφωνο</label>
                      <p className="mt-1 text-gray-900">{listing.owner.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ενέργειες Διαχειριστή</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Σχόλια/Συμβουλές
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Προσθέστε σχόλια ή συμβουλές για βελτίωση..."
                      />
                    </div>
                    <div className="flex justify-end space-x-4">
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        Αποθήκευση Σχολίων
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listing.property.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={photo}
                      alt={`Φωτογραφία ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md">
                        Κύρια Φωτογραφία
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                {listing.history.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <FaHistory className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{event.action}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleString('el-GR')} από {event.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 