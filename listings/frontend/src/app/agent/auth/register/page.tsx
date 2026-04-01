'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaBuilding,
  FaCheckCircle,
  FaChevronDown,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGlobe,
  FaHandshake,
  FaIdCard,
  FaLock,
  FaMapMarkerAlt,
  FaPhone,
  FaShieldAlt,
  FaUser,
} from 'react-icons/fa';
import { apiClient } from '@/lib/api/client';
import { countries } from '@/lib/countries';
import AgentFooter from '@/components/layout/AgentFooter';
import AgentNavbar from '@/components/layout/AgentNavbar';

export default function AgentRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      country: formData.get('country')?.toString() || '',
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
    } catch (error: any) {
      console.error('Registration error:', error);
      // Extract error message from axios response
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check if there are validation details (Zod errors)
        if (errorData.details && Array.isArray(errorData.details.issues)) {
          // Extract the first validation error message
          const firstIssue = errorData.details.issues[0];
          if (firstIssue.path && firstIssue.path.length > 0) {
            const field = firstIssue.path[0];
            const message = firstIssue.message;
            
            // Translate common field names to Greek
            const fieldTranslations: Record<string, string> = {
              'password': 'κωδικός',
              'confirmPassword': 'επιβεβαίωση κωδικού',
              'email': 'email',
              'name': 'όνομα',
            };
            
            const fieldName = fieldTranslations[field] || field;
            
            // Translate common messages to Greek
            if (message.includes('at least 12 characters')) {
              setError(`Ο ${fieldName} πρέπει να έχει τουλάχιστον 12 χαρακτήρες.`);
            } else if (message.includes('do not match')) {
              setError('Οι κωδικοί δεν ταιριάζουν.');
            } else {
              setError(`${fieldName}: ${message}`);
            }
          } else {
            setError(errorData.error || 'Προέκυψε σφάλμα επικύρωσης.');
          }
        } else if (errorData.error) {
          // Use the error message from backend
          setError(errorData.error);
        } else {
          setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FaShieldAlt, title: 'Ασφαλής Εγγραφή', description: 'Τα δεδομένα σας προστατεύονται με κρυπτογράφηση SSL' },
    { icon: FaCheckCircle, title: 'Άμεση Ενεργοποίηση', description: 'Δημιουργήστε λογαριασμό και ξεκινήστε αμέσως' },
    { icon: FaHandshake, title: 'Referral Program', description: 'Παρακολουθήστε deals, συνδέσεις και αμοιβές' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <AgentNavbar />

      <main className="pt-16">
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8 lg:sticky lg:top-24"
              >
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">Δημιουργήστε λογαριασμό Agent</h1>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    Κάντε εγγραφή στο referral πρόγραμμα για να παρακολουθείτε τις συνδέσεις σας και τις συναλλαγές.
                  </p>
                </div>

                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="flex items-start space-x-4"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                        <p className="text-slate-600">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <p className="text-sm text-slate-600">
                    Έχετε ήδη λογαριασμό;{' '}
                    <Link href="/agent/auth/login" className="font-medium text-indigo-700 hover:text-indigo-800">
                      Συνδεθείτε εδώ
                    </Link>
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-md lg:justify-self-end"
              >
                <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Εγγραφή</h2>
                    <p className="text-sm text-slate-600 mt-1">Συμπληρώστε τα στοιχεία σας για να ξεκινήσετε.</p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
                      role="alert"
                    >
                      <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                  )}

                  <div className="space-y-4 max-h-[calc(100vh-22rem)] overflow-auto pr-1">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                        Ονοματεπώνυμο
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε το ονοματεπώνυμό σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε το email σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                        Τηλέφωνο
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaPhone className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε το τηλέφωνό σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
                        Χώρα Καταγωγής
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <FaGlobe className="h-5 w-5 text-slate-400" />
                        </div>
                        <select
                          id="country"
                          name="country"
                          required
                          className="appearance-none block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200 cursor-pointer"
                        >
                          <option value="">Επιλέξτε χώρα...</option>
                          {countries.map((country) => (
                            <option key={country.code} value={country.name}>
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <FaChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-2">
                        Όνομα Εταιρείας/Μεσιτικού Γραφείου
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaBuilding className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="companyName"
                          name="companyName"
                          type="text"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε το όνομα του μεσιτικού γραφείου"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-700 mb-2">
                        Αριθμός Άδειας Μεσίτη
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaIdCard className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="licenseNumber"
                          name="licenseNumber"
                          type="text"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε τον αριθμό άδειας μεσίτη"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="businessAddress" className="block text-sm font-medium text-slate-700 mb-2">
                        Διεύθυνση Γραφείου
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaMapMarkerAlt className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="businessAddress"
                          name="businessAddress"
                          type="text"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε τη διεύθυνση του γραφείου σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                        Κωδικός
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className="appearance-none block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                        Επιβεβαίωση Κωδικού
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className="appearance-none block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Επιβεβαιώστε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showConfirmPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Εγγραφή...' : 'Εγγραφή'}
                  </button>

                  <div className="text-center space-y-4 lg:hidden">
                    <p className="text-sm text-slate-600">
                      Έχετε ήδη λογαριασμό;{' '}
                      <Link href="/agent/auth/login" className="font-medium text-indigo-700 hover:text-indigo-800">
                        Συνδεθείτε εδώ
                      </Link>
                    </p>
                    <Link href="/agent" className="text-sm text-slate-600 hover:text-indigo-700">
                      &larr; Επιστροφή στην αρχική σελίδα
                    </Link>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <AgentFooter />
    </div>
  );
} 