'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('BUYER');

  useEffect(() => {
    // Έλεγχος αν ο χρήστης προέρχεται από την agent landing page
    if (searchParams) {
      const role = searchParams.get('role');
      if (role === 'agent') {
        setUserType('AGENT');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      name: formData.get('name'),
      role: userType,
      phone: formData.get('phone'),
      companyName: formData.get('companyName'),
      licenseNumber: formData.get('licenseNumber'),
      businessAddress: formData.get('businessAddress'),
    };

    try {
      const { data: result } = await apiClient.post('/auth/register', data);

      if (result.error) {
        throw new Error(result.error || 'Σφάλμα κατά την εγγραφή');
      }

      router.push('/login');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Δημιουργία λογαριασμού
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ή{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              συνδεθείτε στο λογαριασμό σας
            </Link>
          </p>
        </div>

        <div className="flex justify-center space-x-4 mb-8">
          <button
            type="button"
            onClick={() => setUserType('BUYER')}
            className={`px-4 py-2 rounded-md ${
              userType === 'BUYER'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Αγοραστής
          </button>
          <button
            type="button"
            onClick={() => setUserType('SELLER')}
            className={`px-4 py-2 rounded-md ${
              userType === 'SELLER'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Πωλητής
          </button>
          <button
            type="button"
            onClick={() => setUserType('AGENT')}
            className={`px-4 py-2 rounded-md ${
              userType === 'AGENT'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Μεσίτης
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Ονοματεπώνυμο
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Ονοματεπώνυμο"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Κωδικός
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Κωδικός"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Επιβεβαίωση κωδικού
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Επιβεβαίωση κωδικού"
              />
            </div>
            <div>
              <label htmlFor="phone" className="sr-only">
                Τηλέφωνο
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Τηλέφωνο"
              />
            </div>

            {(userType === 'SELLER' || userType === 'AGENT') && (
              <>
                <div>
                  <label htmlFor="companyName" className="sr-only">
                    Όνομα εταιρείας
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Όνομα εταιρείας"
                  />
                </div>
                <div>
                  <label htmlFor="businessAddress" className="sr-only">
                    Διεύθυνση
                  </label>
                  <input
                    id="businessAddress"
                    name="businessAddress"
                    type="text"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Διεύθυνση"
                  />
                </div>
              </>
            )}

            {userType === 'AGENT' && (
              <div>
                <label htmlFor="licenseNumber" className="sr-only">
                  Αριθμός άδειας
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Αριθμός άδειας"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Εγγραφή...' : 'Εγγραφή'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <RegisterForm />
    </Suspense>
  );
} 