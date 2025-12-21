'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProperty({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    yearBuilt: '',
    features: [] as string[],
    images: [] as File[],
  });

  useEffect(() => {
    // TODO: Fetch property data from API
    const fetchProperty = async () => {
      try {
        // Mock data - replace with actual API call
        const mockProperty = {
          title: 'Modern Apartment in Athens',
          description: 'Beautiful modern apartment in the heart of Athens...',
          price: '250000',
          location: 'Athens, Greece',
          propertyType: 'apartment',
          bedrooms: '2',
          bathrooms: '1',
          area: '80',
          yearBuilt: '2020',
          features: ['parking', 'elevator', 'security'],
          images: [],
        };
        setFormData(mockProperty);
      } catch (error) {
        console.error('Error fetching property:', error);
        router.push('/dashboard');
      }
    };

    fetchProperty();
  }, [params.id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      features: checked
        ? [...prev.features, value]
        : prev.features.filter(feature => feature !== value)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        images: Array.from(e.target.files || [])
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to update property
    console.log('Form submitted:', formData);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8">Edit Property</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={4}
                      required
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price (€)
                    </label>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      required
                      value={formData.price}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">
                        Property Type
                      </label>
                      <select
                        name="propertyType"
                        id="propertyType"
                        required
                        value={formData.propertyType}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select type</option>
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="land">Land</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        name="bedrooms"
                        id="bedrooms"
                        value={formData.bedrooms}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        name="bathrooms"
                        id="bathrooms"
                        value={formData.bathrooms}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="area" className="block text-sm font-medium text-gray-700">
                        Area (m²)
                      </label>
                      <input
                        type="number"
                        name="area"
                        id="area"
                        required
                        value={formData.area}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="yearBuilt" className="block text-sm font-medium text-gray-700">
                        Year Built
                      </label>
                      <input
                        type="number"
                        name="yearBuilt"
                        id="yearBuilt"
                        value={formData.yearBuilt}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Parking', 'Pool', 'Garden', 'Elevator', 'Security', 'Furnished'].map((feature) => (
                        <div key={feature} className="flex items-center">
                          <input
                            type="checkbox"
                            id={feature.toLowerCase()}
                            value={feature.toLowerCase()}
                            checked={formData.features.includes(feature.toLowerCase())}
                            onChange={handleFeatureChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={feature.toLowerCase()} className="ml-2 block text-sm text-gray-900">
                            {feature}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                      Images
                    </label>
                    <input
                      type="file"
                      name="images"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                    {formData.images.length > 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        {formData.images.length} image(s) selected
                      </p>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Update Property Listing
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 