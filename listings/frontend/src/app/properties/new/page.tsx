'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PropertyForm from '@/components/PropertyForm';

export default function NewPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Καταχώριση Ακινήτου</h1>
            <p className="mt-2 text-gray-600">
              Συμπληρώστε τα παρακάτω στοιχεία για να καταχωρίσετε το ακίνητό σας.
            </p>
          </div>
          
          <PropertyForm />
        </div>
      </div>
    </div>
  );
} 