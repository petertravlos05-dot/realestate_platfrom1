'use client';

import { useState } from 'react';
import Image from 'next/image';
import { uploadToBackend } from '@/lib/api/client';

export default function TestPhotoPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await uploadToBackend('/test-photo', formData);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedImage(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Photo Upload</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Επιλέξτε φωτογραφία
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {loading && (
            <div className="mb-4">
              <p className="text-blue-600">Γίνεται ανέβασμα...</p>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <p className="text-red-600">Σφάλμα: {error}</p>
            </div>
          )}

          {uploadedImage && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ανεβασμένη φωτογραφία:</h3>
              <div className="relative w-64 h-48">
                <Image
                  src={uploadedImage}
                  alt="Uploaded photo"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">URL: {uploadedImage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 