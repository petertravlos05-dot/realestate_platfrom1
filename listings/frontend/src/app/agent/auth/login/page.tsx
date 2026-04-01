'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaLock, FaEye, FaEyeSlash, FaEnvelope, FaPhone, FaShieldAlt, FaCheckCircle, FaHandshake } from 'react-icons/fa';
import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';

function AgentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');

  const callbackUrl = searchParams?.get('callbackUrl') || '/deals?from=agent&tab=overview';

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccess('Η εγγραφή σας ολοκληρώθηκε με επιτυχία. Μπορείτε να συνδεθείτε τώρα.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.length >= 8 && cleanPhone.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      email: loginType === 'email' ? formData.get('email') : null,
      phone: loginType === 'phone' ? formData.get('phone') : null,
      password: formData.get('password'),
      role: 'AGENT' as const,
    };

    if (loginType === 'phone' && data.phone && !validatePhone(data.phone.toString())) {
      setError('Παρακαλώ εισάγετε ένα έγκυρο αριθμό τηλεφώνου');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FaShieldAlt, title: 'Ασφαλής Σύνδεση', description: 'Τα δεδομένα σας προστατεύονται με κρυπτογράφηση SSL' },
    { icon: FaCheckCircle, title: 'Γρήγορη Πρόσβαση', description: 'Συνδεθείτε σε δευτερόλεπτα και δείτε την πρόοδο' },
    { icon: FaHandshake, title: 'Referral Program', description: 'Παρακολουθήστε deals, συνδέσεις και αμοιβές' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <AgentNavbar />

      <main className="pt-16">
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">Συνδεθείτε ως Referral Agent</h1>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    Μπείτε στο πρόγραμμα συνεργατών για να παρακολουθείτε τις συνδέσεις σας και τις συναλλαγές.
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-md"
              >
                <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl"
                      role="alert"
                    >
                      <p className="text-sm font-medium">{success}</p>
                    </motion.div>
                  )}

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

                  <div className="flex items-center justify-center">
                    <div className="bg-slate-100 p-1 rounded-xl flex">
                      <button
                        type="button"
                        onClick={() => setLoginType('email')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                          loginType === 'email' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        <FaEnvelope className="mr-2" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginType('phone')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                          loginType === 'phone' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        <FaPhone className="mr-2" />
                        Κινητό
                      </button>
                    </div>
                  </div>

                  {loginType === 'email' ? (
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
                  ) : (
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                        Κινητό
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaPhone className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                          placeholder="Εισάγετε το κινητό σας"
                        />
                      </div>
                    </div>
                  )}

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
                        autoComplete="current-password"
                        required
                        className="appearance-none block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-600 bg-white transition-all duration-200"
                        placeholder="Εισάγετε τον κωδικό σας"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Σύνδεση...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FaLock className="mr-2" />
                        Σύνδεση
                      </div>
                    )}
                  </button>

                  <div className="text-center space-y-4">
                    <p className="text-sm text-slate-600">
                      Δεν έχετε λογαριασμό;{' '}
                      <Link href="/agent/auth/register" className="font-medium text-indigo-700 hover:text-indigo-800">
                        Εγγραφείτε εδώ
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

export default function AgentLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <AgentLoginForm />
    </Suspense>
  );
}
