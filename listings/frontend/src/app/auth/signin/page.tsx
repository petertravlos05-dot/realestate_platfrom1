'use client';

import { useState, Suspense, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaGoogle, FaFacebook, FaEnvelope, FaLock, FaUser, FaPhone, FaGlobe, FaHome, FaShieldAlt, FaCheckCircle, FaHandshake, FaInfoCircle } from 'react-icons/fa';
import { apiClient } from '@/lib/api/client';
import { countries } from '@/lib/countries';

function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return '/deals';
  try {
    const decoded = decodeURIComponent(url);
    return decoded.replace(/localhost:3004/g, 'localhost:3000');
  } catch {
    return '/deals';
  }
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const rawCallback = searchParams?.get('callbackUrl') || '/deals';
  const callbackUrl = sanitizeCallbackUrl(rawCallback);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignIn) {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
          callbackUrl,
        });

        if (result?.error) {
          setError('Λάθος email ή κωδικός πρόσβασης');
        } else if (result?.url) {
          router.push(result.url);
        } else {
          router.push(callbackUrl);
        }
      } else {
        if (password !== confirmPassword) {
          setError('Οι κωδικοί δεν ταιριάζουν');
          setLoading(false);
          return;
        }

        await apiClient.post('/auth/register', {
          name,
          email,
          password,
          confirmPassword,
          phone: phone || undefined,
          country: country || undefined,
          role: 'BUYER',
        });

        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
          callbackUrl,
        });

        if (result?.error) {
          setError('Εγγραφή επιτυχής αλλά σφάλμα σύνδεσης. Παρακαλώ συνδεθείτε.');
        } else {
          router.push(callbackUrl);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.';
      setError(typeof msg === 'string' ? msg : 'Παρουσιάστηκε σφάλμα.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    signIn(provider, { callbackUrl });
  };

  const whyFeatures = [
    {
      icon: FaInfoCircle,
      title: 'Γιατί χρειάζεται σύνδεση;',
      description: 'Προσπαθήσατε να αποκτήσετε πρόσβαση σε προστατευμένο περιεχόμενο. Για να συνεχίσετε, χρειάζεται λογαριασμός.',
    },
    {
      icon: FaShieldAlt,
      title: 'Ασφάλεια & Εμπιστοσύνη',
      description: 'Η σύνδεση εξασφαλίζει ότι μόνο εσείς έχετε πρόσβαση στα προσωπικά σας δεδομένα και τις συναλλαγές σας.',
    },
    {
      icon: FaHandshake,
      title: 'Τι θα κάνετε μετά;',
      description: 'Θα επιστρέψετε αυτόματα στη σελίδα που επιθυμούσατε και θα έχετε πρόσβαση σε deals, αγαπημένα και επικοινωνία με μεσίτες.',
    },
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header - ίδιο με buyer/auth */}
      <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                RealEstate
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href={`/buyer/auth/login${callbackUrl && callbackUrl !== '/deals' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                Σύνδεση Buyer
              </Link>
              <Link
                href={`/buyer/auth/register${callbackUrl && callbackUrl !== '/deals' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
              >
                Εγγραφή
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main - ίδιο layout με buyer/auth */}
      <main className="pt-16">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Αριστερά - Εξήγηση */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                    Συνδεθείτε ή <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">εγγραφείτε</span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    Χρειάζεται λογαριασμός για να συνεχίσετε. Δημιουργήστε έναν δωρεάν ή συνδεθείτε αν έχετε ήδη.
                  </p>
                </div>

                <div className="space-y-6">
                  {whyFeatures.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex items-start space-x-4"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                        <f.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title}</h3>
                        <p className="text-gray-600">{f.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Δεξιά - Φόρμα */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full max-w-md"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isSignIn ? 'Σύνδεση' : 'Εγγραφή'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => { setIsSignIn(!isSignIn); setError(''); }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {isSignIn ? 'Δημιουργία λογαριασμού' : 'Έχετε λογαριασμό; Συνδεθείτε'}
                    </button>
                  </div>

                  <form className="space-y-5" onSubmit={handleSubmit}>
                    {!isSignIn && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaUser className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ονοματεπώνυμο"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaPhone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Τηλέφωνο (προαιρετικό)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Χώρα Καταγωγής</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                              <FaGlobe className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="">Επιλέξτε χώρα (προαιρετικό)</option>
                              {countries.map((c) => (
                                <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Κωδικός</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Κωδικός"
                        />
                      </div>
                    </div>

                    {!isSignIn && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Επιβεβαίωση κωδικού</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaLock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Επιβεβαίωση κωδικού"
                          />
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Παρακαλώ περιμένετε...
                        </span>
                      ) : (
                        isSignIn ? 'Σύνδεση' : 'Εγγραφή'
                      )}
                    </button>
                  </form>

                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Ή συνεχίστε με</span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSocialSignIn('google')}
                        className="flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all"
                      >
                        <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialSignIn('facebook')}
                        className="flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all"
                      >
                        <FaFacebook className="h-5 w-5 text-blue-600 mr-2" />
                        Facebook
                      </button>
                    </div>
                  </div>

                  <p className="mt-6 text-center text-sm text-gray-500">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                      ← Επιστροφή στην αρχική
                    </Link>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
