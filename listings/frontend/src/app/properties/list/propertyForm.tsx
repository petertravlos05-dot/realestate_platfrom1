'use client';

import { useState } from 'react';

interface PropertyFormData {
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number;
  floor: number;
  features: string[];
  amenities: string[];
  location: {
    address: string;
    city: string;
    postalCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: {
    amount: number;
    currency: string;
    type: 'sale' | 'rent';
    period?: 'monthly' | 'yearly';
  };
  photos: string[];
  description: string;
}

export default function PropertyForm() {
  const [formData, setFormData] = useState<PropertyFormData>({
    type: '',
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    yearBuilt: new Date().getFullYear(),
    floor: 0,
    features: [],
    amenities: [],
    location: {
      address: '',
      city: '',
      postalCode: '',
      coordinates: {
        lat: 0,
        lng: 0
      }
    },
    price: {
      amount: 0,
      currency: 'EUR',
      type: 'sale'
    },
    photos: [],
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      price: {
        ...prev.price,
        [name]: value
      }
    }));
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
  };

  return null; // The actual form UI is in the page component
} 