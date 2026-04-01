'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchFromBackend } from '@/lib/api/client';
import ConsentModal from '@/components/modals/ConsentModal';

interface ConsentRequiredError {
  error: 'CONSENT_REQUIRED';
  required: string[];
  versions: {
    terms?: string;
    privacy?: string;
  };
  message: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentRequiredError | null>(null);
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    // Έλεγχος αν ο χρήστης προέρχεται από την agent landing page
    const role = searchParams?.get('role');
    if (role === 'agent') {
      setRedirectPath('/dashboard/agent');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // First, try backend API login to check for consent requirements
      const backendResponse = await fetchFromBackend('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Handle 428 CONSENT_REQUIRED
      if (backendResponse.status === 428) {
        const consentError: ConsentRequiredError = await backendResponse.json();
        setConsentData(consentError);
        setLoginCredentials({ email, password });
        setShowConsentModal(true);
        setLoading(false);
        return;
      }

      // Check if backend login was successful
      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        setError(errorData.error || 'Λάθος email ή κωδικός');
        return;
      }

      // Get user data from backend to check role
      const backendData = await backendResponse.json();
      const userRole = backendData.user?.role || backendData.role;

      // Block professionals from logging in through this page
      if (userRole === 'LAWYER' || userRole === 'NOTARY' || userRole === 'ACCOUNTANT') {
        setError('Οι επαγγελματίες δεν μπορούν να συνδεθούν από αυτή τη σελίδα. Χρησιμοποιήστε τον επαγγελματικό λογαριασμό σας.');
        return;
      }

      // If not 428, proceed with NextAuth login
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Λάθος email ή κωδικός');
      } else {
        router.push(redirectPath);
      }
    } catch (error) {
      setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAccepted = async () => {
    setShowConsentModal(false);
    setLoading(true);
    
    // Retry login after consent acceptance
    if (loginCredentials) {
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email: loginCredentials.email,
          password: loginCredentials.password,
        });

        if (result?.error) {
          setError('Σφάλμα κατά τη σύνδεση. Παρακαλώ δοκιμάστε ξανά.');
        } else {
          router.push(redirectPath);
        }
      } catch (error) {
        setError('Σφάλμα κατά τη σύνδεση. Παρακαλώ δοκιμάστε ξανά.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Σύνδεση στο λογαριασμό σας
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ή{' '}
              <Link
                href={`/register${searchParams?.get('role') ? `?role=${searchParams.get('role')}` : ''}`}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                εγγραφείτε για νέο λογαριασμό
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
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
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Κωδικός"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Σύνδεση...' : 'Σύνδεση'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Consent Modal */}
      {consentData && loginCredentials && (
        <ConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          onAccept={handleConsentAccepted}
          requiredConsents={consentData.required}
          versions={consentData.versions}
          email={loginCredentials.email}
          password={loginCredentials.password}
        />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <LoginForm />
    </Suspense>
  );
} 