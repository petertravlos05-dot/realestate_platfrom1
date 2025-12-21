'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaBuilding, FaIdCard, FaMapMarkerAlt } from 'react-icons/fa';
import { apiClient } from '@/lib/api/client';

export default function AgentRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';

    if (!password || !confirmPassword) {
      setError('Παρακαλώ συμπληρώστε και τα δύο πεδία κωδικού');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      setLoading(false);
      return;
    }

    const data = {
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      password: password,
      confirmPassword: confirmPassword,
      phone: formData.get('phone')?.toString() || '',
      companyName: formData.get('companyName')?.toString() || '',
      licenseNumber: formData.get('licenseNumber')?.toString() || '',
      businessAddress: formData.get('businessAddress')?.toString() || '',
      role: 'AGENT',
    };

    try {
      console.log('Sending registration data:', { ...data, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });
      const { data: result } = await apiClient.post('/auth/register', data);
      console.log('Registration response:', result);

      router.push('/agent/auth/login?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
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
              Εγγραφή Μεσίτη
            </h2>
            <p className="text-gray-600">
              Δημιουργήστε λογαριασμό για να ξεκινήσετε να προωθείτε ακίνητα
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

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Ονοματεπώνυμο
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε το ονοματεπώνυμό σας"
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε τον κωδικό σας"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Επιβεβαίωση Κωδικού
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Επιβεβαιώστε τον κωδικό σας"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Τηλέφωνο
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε το τηλέφωνό σας"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Όνομα Εταιρείας/Μεσιτικού Γραφείου
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaBuilding className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε το όνομα του μεσιτικού γραφείου"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Αριθμός Άδειας Μεσίτη
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaIdCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε τον αριθμό άδειας μεσίτη"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Διεύθυνση Γραφείου
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMapMarkerAlt className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="businessAddress"
                    name="businessAddress"
                    type="text"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:border-transparent
                             bg-white/70 backdrop-blur-sm transition-all duration-200"
                    placeholder="Εισάγετε τη διεύθυνση του γραφείου σας"
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
                {loading ? 'Εγγραφή...' : 'Εγγραφή'}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Έχετε ήδη λογαριασμό;{' '}
                <Link href="/agent/auth/login" className="font-medium text-[#001f3f] hover:text-[#003366]">
                  Συνδεθείτε εδώ
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