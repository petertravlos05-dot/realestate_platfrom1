'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaCheckCircle,
  FaEnvelope,
  FaUserPlus,
  FaPhone,
  FaGlobe,
  FaChevronDown,
} from 'react-icons/fa';
import BuyerMarketingHeader from '@/components/layout/BuyerMarketingHeader';
import BuyerMarketingFooter from '@/components/layout/BuyerMarketingFooter';
import { apiClient } from '@/lib/api/client';
import { countries } from '@/lib/countries';

export default function BuyerRegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/deals');
    }
  }, [status, router]);

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
      role: 'BUYER',
      phone: formData.get('phone'),
      country: formData.get('country'),
    };

    try {
      await apiClient.post('/auth/register', data);
      const loginResult = await signIn('credentials', {
        email: data.email as string,
        password: data.password as string,
        role: 'BUYER',
        redirect: false,
      });

      if (loginResult?.error) {
        router.push('/buyer/auth/login');
      } else {
        router.push('/deals');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      if (error.response?.data) {
        const errorData = error.response.data;

        if (errorData.details && Array.isArray((errorData.details as { issues?: unknown[] }).issues)) {
          const issues = (errorData.details as { issues: Array<{ path?: string[]; message?: string }> }).issues;
          const firstIssue = issues[0];
          if (firstIssue.path && firstIssue.path.length > 0) {
            const field = firstIssue.path[0];
            const message = firstIssue.message || '';

            const fieldTranslations: Record<string, string> = {
              password: 'κωδικός',
              confirmPassword: 'επιβεβαίωση κωδικού',
              email: 'email',
              name: 'όνομα',
            };

            const fieldName = fieldTranslations[field] || field;

            if (message.includes('at least 12 characters')) {
              setError(`Ο ${fieldName} πρέπει να έχει τουλάχιστον 12 χαρακτήρες.`);
            } else if (message.includes('do not match')) {
              setError('Οι κωδικοί δεν ταιριάζουν.');
            } else {
              setError(`${fieldName}: ${message}`);
            }
          } else {
            setError((errorData.error as string) || 'Προέκυψε σφάλμα επικύρωσης.');
          }
        } else if (errorData.error) {
          setError(errorData.error as string);
        } else {
          setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: FaUserPlus,
      title: 'Γρήγορη Εγγραφή',
      description: 'Δημιουργήστε τον λογαριασμό σας σε λίγα βήματα',
    },
    {
      icon: FaShieldAlt,
      title: 'Ασφαλές Προφίλ',
      description: 'Τα δεδομένα σας προστατεύονται με κρυπτογράφηση SSL',
    },
    {
      icon: FaCheckCircle,
      title: 'Άμεση Πρόσβαση',
      description: 'Αποκτήστε πρόσβαση σε ακίνητα και συναλλαγές αμέσως μετά την εγγραφή',
    },
  ];

  const inputClass =
    'appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/40 focus:border-blue-800 bg-white transition-all duration-200';

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <BuyerMarketingHeader />

      <main>
        <div className="relative min-h-[min(48vh,400px)] sm:min-h-[42vh] bg-gradient-to-br from-blue-900 via-slate-800 to-blue-900 pt-24 sm:pt-28 pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-2xl"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Δημιουργήστε λογαριασμό στην{' '}
                <span className="text-blue-100">RealEstate</span>
              </h1>
              <p className="text-lg text-blue-100/90 leading-relaxed">
                Γίνετε μέλος της πλατφόρμας και ανακαλύψτε το ιδανικό ακίνητο με διαφάνεια και ψηφιακά εργαλεία.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="bg-[#f5f0e8] -mt-6 rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.12)] relative z-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8 order-2 lg:order-1"
              >
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                      className="flex items-start gap-4"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-800 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{feature.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto order-1 lg:order-2"
              >
                <div className="bg-white rounded-2xl shadow-xl border border-stone-200/80 p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
                        role="alert"
                      >
                        <p className="text-sm font-medium">{error}</p>
                      </motion.div>
                    )}

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
                          className={inputClass}
                          placeholder="Εισάγετε το ονοματεπώνυμό σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                          className={inputClass}
                          placeholder="Εισάγετε το email σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
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
                          className={inputClass}
                          placeholder="Εισάγετε το τηλέφωνό σας"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                        Χώρα καταγωγής <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <FaGlobe className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="country"
                          name="country"
                          required
                          className={`${inputClass} pr-10 appearance-none cursor-pointer`}
                        >
                          <option value="">Επιλέξτε χώρα...</option>
                          {countries.map((country) => (
                            <option key={country.code} value={country.name}>
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <FaChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Κωδικός
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className={`${inputClass} pr-12`}
                          placeholder="Εισάγετε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Επιβεβαίωση κωδικού
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className={`${inputClass} pr-12`}
                          placeholder="Επιβεβαιώστε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          aria-label={showConfirmPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl
                                 text-white bg-gradient-to-r from-blue-800 to-slate-700 hover:from-blue-900 hover:to-slate-800
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 font-medium shadow-md
                                 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                            Εγγραφή...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <FaUserPlus className="mr-2" />
                            Δημιουργία λογαριασμού
                          </div>
                        )}
                      </button>
                    </div>

                    <div className="text-center space-y-4 pt-2">
                      <p className="text-sm text-gray-600">
                        Έχετε ήδη λογαριασμό;{' '}
                        <Link href="/buyer/auth/login" className="font-medium text-blue-800 hover:text-blue-900">
                          Συνδεθείτε εδώ
                        </Link>
                      </p>
                      <Link href="/buyer" className="text-sm text-gray-600 hover:text-blue-800 block">
                        &larr; Επιστροφή στην αρχική σελίδα
                      </Link>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <BuyerMarketingFooter />
    </div>
  );
}
