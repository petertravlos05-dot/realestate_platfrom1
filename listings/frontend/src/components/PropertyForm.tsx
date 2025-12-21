'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { uploadToS3 } from '@/lib/s3';

interface PropertyFormData {
  title: string;
  description: string;
  price: string;
  location: string;
  type: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  features: string[];
  amenities: string[];
  images: string[];
}

const PROPERTY_TYPES = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'STUDIO',
  'MAISONETTE',
  'PENTHOUSE',
];

const PROPERTY_FEATURES = [
  'Parking',
  'Garden',
  'Pool',
  'Elevator',
  'Security',
  'Storage',
  'Balcony',
  'Furnished',
  'Air Conditioning',
  'Central Heating',
];

const PROPERTY_AMENITIES = [
  'WiFi',
  'TV',
  'Washing Machine',
  'Dishwasher',
  'Microwave',
  'Oven',
  'Fridge',
  'Coffee Machine',
  'Iron',
  'Hair Dryer',
];

export default function PropertyForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    price: '',
    location: '',
    type: 'APARTMENT',
    bedrooms: '',
    bathrooms: '',
    area: '',
    features: [],
    amenities: [],
    images: [],
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const imageUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', 'property_image');

          const response = await fetch(`/api/properties/images`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Σφάλμα κατά το ανέβασμα της εικόνας');
          }

          const data = await response.json();
          imageUrls.push(data.fileUrl);
        } catch (uploadError) {
          console.error('Error uploading single image:', uploadError);
          // Δημιουργία προσωρινού URL για την εικόνα
          const tempUrl = URL.createObjectURL(file);
          imageUrls.push(tempUrl);
        }
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageUrls],
      }));
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Σφάλμα κατά το ανέβασμα των εικόνων');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.price || 
          !formData.location || !formData.type || !formData.area) {
        throw new Error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('propertyType', formData.type);
      formDataToSend.append('basicDetails', JSON.stringify({
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
        area: parseFloat(formData.area),
      }));
      formDataToSend.append('features', JSON.stringify(formData.features));
      formDataToSend.append('amenities', JSON.stringify(formData.amenities));
      formDataToSend.append('location', JSON.stringify({
        address: formData.location,
      }));
      formDataToSend.append('pricing', JSON.stringify({
        price: parseFloat(formData.price),
      }));
      formDataToSend.append('description', JSON.stringify({
        title: formData.title,
        shortDescription: formData.description,
        fullDescription: formData.description,
      }));

      // Debug logs
      console.log('Form data being sent:', {
        propertyType: formData.type,
        basicDetails: {
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
          area: parseFloat(formData.area),
        },
        features: formData.features,
        amenities: formData.amenities,
        location: {
          address: formData.location,
        },
        pricing: {
          price: parseFloat(formData.price),
        },
        description: {
          title: formData.title,
          shortDescription: formData.description,
          fullDescription: formData.description,
        }
      });

      // Προσθήκη των εικόνων
      const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
      if (fileInput?.files) {
        Array.from(fileInput.files).forEach((file) => {
          formDataToSend.append('photos', file);
        });
      }

      const { uploadToBackend } = await import('@/lib/api/client');
      const response = await uploadToBackend('/properties', formDataToSend);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Σφάλμα κατά την καταχώριση του ακινήτου');
      }

      router.push('/properties/list');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Κάτι πήγε στραβά');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Τίτλος
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Περιγραφή
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Τιμή (€)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Τοποθεσία
          </label>
          <input
            type="text"
            id="location"
            name="location"
            required
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Τύπος Ακινήτου
          </label>
          <select
            id="type"
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">
            Υπνοδωμάτια
          </label>
          <input
            type="number"
            id="bedrooms"
            name="bedrooms"
            required
            min="0"
            value={formData.bedrooms}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">
            Μπάνια
          </label>
          <input
            type="number"
            id="bathrooms"
            name="bathrooms"
            required
            min="0"
            value={formData.bathrooms}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="area" className="block text-sm font-medium text-gray-700">
            Εμβαδόν (τ.μ.)
          </label>
          <input
            type="number"
            id="area"
            name="area"
            required
            min="0"
            step="0.01"
            value={formData.area}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Χαρακτηριστικά</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {PROPERTY_FEATURES.map((feature) => (
            <label
              key={feature}
              className="relative flex items-start"
            >
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={formData.features.includes(feature)}
                  onChange={() => handleFeatureToggle(feature)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-700">{feature}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Παροχές</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {PROPERTY_AMENITIES.map((amenity) => (
            <label
              key={amenity}
              className="relative flex items-start"
            >
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-700">{amenity}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Φωτογραφίες
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {formData.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative aspect-square">
                <Image
                  src={image}
                  alt={`Property image ${index + 1}`}
                  fill
                  className="object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== index),
                    }))
                  }
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Ακύρωση
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
      </div>
    </form>
  );
} 