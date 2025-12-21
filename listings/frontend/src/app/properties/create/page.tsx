'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaUpload, FaTrash } from 'react-icons/fa';
import { uploadToBackend } from '@/lib/api/client';

const PROPERTY_TYPES = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'STUDIO',
  'MAISONETTE',
  'PENTHOUSE',
] as const;

const COMMON_FEATURES = [
  'Θέρμανση',
  'Κλιματισμός',
  'Πάρκινγκ',
  'Ανελκυστήρας',
  'Βεράντα',
  'Αποθήκη',
  'Τζάκι',
  'Πισίνα',
  'Κήπος',
  'Ηλιακός θερμοσίφωνας',
  'Επιπλωμένο',
  'Ανακαινισμένο',
];

const COMMON_AMENITIES = [
  'Πλυντήριο ρούχων',
  'Στεγνωτήριο',
  'Πλυντήριο πιάτων',
  'Ψυγείο',
  'Φούρνος',
  'Μικροκύματα',
  'Τηλεόραση',
  'Internet/WiFi',
  'Συναγερμός',
  'Θυροτηλεόραση',
  'Τέντες',
  'Μπάρμπεκιου',
];

export default function CreatePropertyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    type: 'APARTMENT',
    bedrooms: '',
    bathrooms: '',
    area: '',
    features: [] as string[],
    amenities: [] as string[],
    images: [] as string[],
  });

  // Check for client-side rendering
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to login if not authenticated
  if (!isClient) {
    return null;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images') return; // Handle images separately
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });
      
      // Add numeric fields
      if (formData.price) formDataToSend.append('price', String(parseFloat(formData.price)));
      if (formData.bedrooms) formDataToSend.append('bedrooms', String(parseInt(formData.bedrooms)));
      if (formData.bathrooms) formDataToSend.append('bathrooms', String(parseInt(formData.bathrooms)));
      if (formData.area) formDataToSend.append('area', String(parseFloat(formData.area)));
      
      // Add features and amenities as JSON
      if (formData.features.length > 0) {
        formDataToSend.append('features', JSON.stringify(formData.features));
      }
      if (formData.amenities.length > 0) {
        formDataToSend.append('amenities', JSON.stringify(formData.amenities));
      }

      const response = await uploadToBackend('/properties', formDataToSend);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Σφάλμα κατά την καταχώριση του ακινήτου');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/properties');
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
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
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {PROPERTY_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Χαρακτηριστικά</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {COMMON_FEATURES.map(feature => (
            <label key={feature} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.features.includes(feature)}
                onChange={() => handleFeatureToggle(feature)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{feature}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ανέσεις</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {COMMON_AMENITIES.map(amenity => (
            <label key={amenity} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.amenities.includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Τιμή (€)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            required
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            value={formData.area}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
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
            value={formData.bedrooms}
            onChange={handleChange}
            min="0"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            value={formData.bathrooms}
            onChange={handleChange}
            min="0"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Φωτογραφίες
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {formData.images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`Property ${index + 1}`}
                className="h-32 w-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleImageRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ))}
          <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <label className="cursor-pointer flex flex-col items-center">
              <FaUpload className="h-8 w-8 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">Προσθήκη φωτογραφίας</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              Καταχώριση Ακινήτου
            </h1>
            <div className="mt-4">
              <div className="flex items-center justify-center">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {stepNumber}
                    </div>
                    {stepNumber < 3 && (
                      <div
                        className={`w-16 h-1 ${
                          step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                {step === 1 && 'Βασικές Πληροφορίες'}
                {step === 2 && 'Χαρακτηριστικά'}
                {step === 3 && 'Πρόσθετα Στοιχεία'}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              Το ακίνητο καταχωρήθηκε με επιτυχία! Ανακατεύθυνση...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="mt-8 flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Προηγούμενο
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Επόμενο
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Καταχώριση...' : 'Καταχώριση'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}