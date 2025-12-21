'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHome, FaArrowRight, FaShieldAlt, FaCheckCircle, FaSearch, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUserCircle, FaChevronDown, FaExchangeAlt, FaCog, FaComments, FaSignOutAlt, FaPhone } from 'react-icons/fa';
import Image from 'next/image';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';

function SellerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');

  // Λήψη του callback URL από τα query parameters
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard/seller';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
  };

  const validatePhone = (phone: string) => {
    // Basic phone validation - just check if it's not empty and has reasonable length
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
      role: 'SELLER',
    };

    // Validation
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
        // Ανακατεύθυνση στο callback URL ή στο dashboard
        router.push(callbackUrl);
      }
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

  const features = [
    {
      icon: FaShieldAlt,
      title: 'Ασφαλής Σύνδεση',
      description: 'Τα δεδομένα σας προστατεύονται με κρυπτογράφηση SSL'
    },
    {
      icon: FaCheckCircle,
      title: 'Γρήγορη Πρόσβαση',
      description: 'Συνδεθείτε σε δευτερόλεπτα και διαχειριστείτε τα ακίνητά σας'
    },
    {
      icon: FaHome,
      title: 'Διαχείριση Ακινήτων',
      description: 'Προσθέστε, επεξεργαστείτε και παρακολουθήστε τα ακίνητά σας'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Enhanced Header */}
      <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/seller" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </Link>
              
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  <FaUserCircle className="mr-2" />
                  Seller Mode
                  <FaChevronDown className="ml-2 text-xs" />
                </button>
                {isRoleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Αλλαγή Ρόλου</p>
                    </div>
                    <Link
                      href="/buyer"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Buyer Mode
                    </Link>
                    <Link
                      href="/agent"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Agent Mode
                    </Link>
                    <Link
                      href="/"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Επιλογή Ρόλου
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/seller"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="/add-listing"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaSearch className="mr-2" />
                Προσθήκη Ακινήτου
              </Link>
              <Link
                href="/seller/contact"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/seller/about"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
              <Link
                href="/seller/how-it-works"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              {status === 'authenticated' ? (
                <>
                  <Link
                    href="/dashboard/seller"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    Dashboard
                  </Link>
                  <SellerNotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{session?.user?.name || 'Χρήστης'}</p>
                          <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        <Link
                          href="/dashboard/seller/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaCog className="mr-3 text-green-500" />
                          Ρυθμίσεις
                        </Link>
                        <Link
                          href="/dashboard/seller/messages"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaComments className="mr-3 text-green-500" />
                          Μηνύματα
                        </Link>
                        <Link
                          href="/seller/how-it-works#faq"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaQuestionCircle className="mr-3 text-green-500" />
                          Συχνές Ερωτήσεις
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaExchangeAlt className="mr-3 text-green-500" />
                          Αλλαγή Ρόλων
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Αποσύνδεση
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/seller/auth/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-gray-100"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Features */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                    Καλώς ήρθατε στην <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">RealEstate</span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    Συνδεθείτε στον λογαριασμό σας για να διαχειριστείτε τα ακίνητά σας και να παρακολουθήσετε τους ενδιαφερομένους. Μπορείτε να συνδεθείτε με το προσωπικό σας email, το email της εταιρείας ή το κινητό σας τηλέφωνο.
                  </p>
                </div>

                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="flex items-start space-x-4"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right Column - Login Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-md"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative"
                      role="alert"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Login Type Toggle */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                      <button
                        type="button"
                        onClick={() => setLoginType('email')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                          loginType === 'email'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FaEnvelope className="mr-2" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginType('phone')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                          loginType === 'phone'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FaPhone className="mr-2" />
                        Κινητό
                      </button>
                    </div>
                  </div>

                  {/* Email Field */}
                  {loginType === 'email' && (
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
                          required={loginType === 'email'}
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                   bg-white/70 backdrop-blur-sm transition-all duration-200"
                          placeholder="Email προσωπικό ή εταιρείας"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Μπορείτε να συνδεθείτε με το προσωπικό σας email ή το email της εταιρείας
                      </p>
                    </div>
                  )}

                  {/* Phone Field */}
                  {loginType === 'phone' && (
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Κινητό Τηλέφωνο
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaPhone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          required={loginType === 'phone'}
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                   bg-white/70 backdrop-blur-sm transition-all duration-200"
                          placeholder="π.χ. 6981234567 ή +306981234567"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Μπορείτε να συνδεθείτε με το προσωπικό σας κινητό ή το κινητό της εταιρείας
                      </p>
                    </div>
                  )}

                  {/* Password Field */}
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
                        autoComplete="current-password"
                        required
                        className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                 bg-white/70 backdrop-blur-sm transition-all duration-200"
                        placeholder="Εισάγετε τον κωδικό σας"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl
                               text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium shadow-lg
                               hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Σύνδεση...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <FaLock className="mr-2" />
                          Σύνδεση
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Links */}
                  <div className="text-center space-y-4">
                    <p className="text-sm text-gray-600">
                      Δεν έχετε λογαριασμό;{' '}
                      <Link href="/seller/auth/register" className="font-medium text-green-600 hover:text-green-500">
                        Εγγραφείτε εδώ
                      </Link>
                    </p>
                    <Link href="/seller" className="text-sm text-gray-600 hover:text-green-600">
                      &larr; Επιστροφή στην αρχική σελίδα
                    </Link>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <SellerLoginForm />
    </Suspense>
  );
} 