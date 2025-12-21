'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaCheckCircle } from 'react-icons/fa';

function AgentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Έλεγχος αν ο χρήστης μόλις ολοκλήρωσε την εγγραφή
    if (searchParams?.get('registered') === 'true') {
      setSuccess('Η εγγραφή σας ολοκληρώθηκε με επιτυχία. Μπορείτε να συνδεθείτε τώρα.');
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
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Λάθος email ή κωδικός');
      } else {
        router.push('/dashboard/agent');
      }
    } catch (error) {
      setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-gradient-to-br from-white to-[#e5eaff]/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#001f3f] mb-2">
              Σύνδεση Μεσίτη
            </h2>
            <p className="text-gray-600">
              Συνδεθείτε για να αποκτήσετε πρόσβαση στο λογαριασμό σας
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative flex items-start"
                role="alert"
              >
                <FaCheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span className="block sm:inline">{success}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε το email σας"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Κωδικός
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε τον κωδικό σας"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg
                         text-white bg-[#001f3f] hover:bg-[#003366] focus:outline-none focus:ring-2
                         focus:ring-offset-2 focus:ring-[#001f3f] font-medium shadow-lg
                         hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? 'Σύνδεση...' : 'Σύνδεση'}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Δεν έχετε λογαριασμό;{' '}
                <Link href="/agent/auth/register" className="font-medium text-[#001f3f] hover:text-[#003366]">
                  Εγγραφείτε εδώ
                </Link>
              </p>
            </div>
          </form>
        </div>

        <div className="text-center mt-8">
          <Link href="/agent" className="text-sm text-gray-600 hover:text-[#001f3f]">
            &larr; Επιστροφή στην αρχική σελίδα
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function AgentLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <AgentLoginForm />
    </Suspense>
  );
} 