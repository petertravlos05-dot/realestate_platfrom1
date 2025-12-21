"use client";

import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Property } from '@/types/property';

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick: (propertyId: string) => void;
}

const mapContainerStyle = {
  height: '70vh',
  width: '100%'
};

const center = {
  lat: 37.9838, // Athens, Greece
  lng: 23.7275
};

const PropertyMap: React.FC<PropertyMapProps> = ({ properties, onPropertyClick }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  return (
    <div className="w-full h-full relative">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          options={{
            styles: [
              {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#7c93a3" }]
              },
              {
                featureType: "administrative.country",
                elementType: "geometry",
                stylers: [{ visibility: "on" }]
              },
              {
                featureType: "landscape",
                elementType: "geometry.fill",
                stylers: [{ color: "#f5f5f5" }]
              }
            ],
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true
          }}
        >
          {properties.map((property) => (
            property.coordinates && (
              <Marker
                key={property.id}
                position={property.coordinates}
                onClick={() => setSelectedProperty(property)}
                title={`${property.title} - ${property.price.toLocaleString('el-GR')}€`}
              />
            )
          ))}

          {selectedProperty && (
            <InfoWindow
              position={selectedProperty.coordinates}
              onCloseClick={() => setSelectedProperty(null)}
            >
              <div className="p-2">
                <h3 className="font-semibold text-gray-900">{selectedProperty.title}</h3>
                <p className="text-gray-600">{selectedProperty.location}</p>
                <p className="text-[#001f3f] font-bold mt-1">
                  {selectedProperty.price.toLocaleString('el-GR')}€
                </p>
                <button
                  onClick={() => onPropertyClick(selectedProperty.id)}
                  className="mt-2 text-sm text-[#001f3f] hover:text-[#002b5c]"
                >
                  Δείτε Περισσότερα
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default PropertyMap; 